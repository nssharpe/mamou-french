import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifiesForTicket, cardsToTickets, kidForPid, pidForKid, reportHub, perTicketFor, hubCode, storeHandoff } from '../js/hubtickets.js';
import { createOutbox } from '../js/hub-client.js';
import { newProgress, migrate } from '../js/store.js';

const CODE = 'hub-abcde-fghjk-mnpqr-stuvw';
const memStore = (init = {}) => {
  const m = { ...init };
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m };
};

test('cardsToTickets keeps the remainder: 3 cards -> 0, then 6 more -> 2 with 1 left', () => {
  const prog = newProgress();
  assert.equal(prog.hubUnits, 0);
  assert.equal(cardsToTickets(prog, 3, 4), 0);
  assert.equal(prog.hubUnits, 3);
  assert.equal(cardsToTickets(prog, 6, 4), 2);
  assert.equal(prog.hubUnits, 1);
});

test('cardsToTickets tolerates a missing counter, junk input and a bad rate', () => {
  const prog = {};
  assert.equal(cardsToTickets(prog, 8, 4), 2);
  assert.equal(prog.hubUnits, 0);
  assert.equal(cardsToTickets(prog, -5, 4), 0);
  assert.equal(cardsToTickets(prog, NaN, 4), 0);
  assert.equal(prog.hubUnits, 0);
  assert.equal(cardsToTickets(prog, 8, 0), 2); // bad rate falls back to 4
  assert.equal(cardsToTickets(prog, 5, 5), 1);
});

test('old saves migrate with hubUnits = 0', () => {
  const db = migrate({ profiles: [{ id: 'p-zyler', name: 'Zyler' }], progress: { 'p-zyler': { xp: 5 } } });
  assert.equal(db.progress['p-zyler'].hubUnits, 0);
});

test('kid id mapping covers only the two hub kids', () => {
  assert.equal(kidForPid('p-zyler'), 'zyler');
  assert.equal(kidForPid('p-kadyn'), 'kadyn');
  assert.equal(kidForPid('p-other'), null);
  assert.equal(pidForKid('zyler'), 'p-zyler');
  assert.equal(pidForKid('kadyn'), 'p-kadyn');
  assert.equal(pidForKid('nobody'), null);
  assert.equal(pidForKid(null), null);
});

test('storeHandoff saves a valid code and ignores everything else', () => {
  const st = memStore();
  assert.equal(storeHandoff(st, '#/p/p-zyler'), null);
  assert.equal(storeHandoff(st, '#hub=nonsense&kid=zyler'), null);
  assert.equal(hubCode(st), null);
  const h = storeHandoff(st, `#hub=${CODE}&kid=zyler`);
  assert.deepEqual(h, { code: CODE, kid: 'zyler', pid: 'p-zyler' });
  assert.equal(hubCode(st), CODE);
  assert.equal(st.m['mamou-fr:hub'], CODE);
  assert.equal(storeHandoff(st, `#hub=${CODE}`).pid, null);
});

test('perTicketFor reads the cached hub settings, honors pending changes, defaults to 4', () => {
  const now = new Date(2026, 10, 10, 12).getTime();
  assert.equal(perTicketFor(memStore(), now), 4);
  const cache = s => memStore({ 'mamou-fr:hub-settings': JSON.stringify(s) });
  assert.equal(perTicketFor(cache({ rates: { frenchCardsPerTicket: 6 } }), now), 6);
  assert.equal(perTicketFor(cache({ rates: { frenchCardsPerTicket: 0 } }), now), 4);
  assert.equal(perTicketFor(cache({ rates: { frenchCardsPerTicket: 6 }, pending: { effectiveFrom: '2026-11-10', settings: { rates: { frenchCardsPerTicket: 8 } } } }), now), 8);
  assert.equal(perTicketFor(cache({ rates: { frenchCardsPerTicket: 6 }, pending: { effectiveFrom: '2026-11-11', settings: { rates: { frenchCardsPerTicket: 8 } } } }), now), 6);
  assert.equal(perTicketFor(memStore({ 'mamou-fr:hub-settings': '{oops' }), now), 4);
});

test('reportHub queues one French event for the hub kid id, and does nothing without a code', () => {
  const prog = newProgress();
  const none = memStore();
  const ob0 = createOutbox(none, 'mamou-fr:hub-outbox');
  assert.equal(reportHub({ storage: none, outbox: ob0, prog, pid: 'p-zyler', cards: 8, now: 1000, flush: false }), null);
  assert.equal(prog.hubUnits, 0);
  assert.equal(ob0.pending().length, 0);

  const st = memStore({ 'mamou-fr:hub': CODE });
  const ob = createOutbox(st, 'mamou-fr:hub-outbox');
  assert.equal(reportHub({ storage: st, outbox: ob, prog, pid: 'p-other', cards: 8, now: 1000, flush: false }), null);
  assert.equal(ob.pending().length, 0);

  assert.equal(reportHub({ storage: st, outbox: ob, prog, pid: 'p-zyler', cards: 3, now: 1000, flush: false }), 0);
  assert.equal(ob.pending().length, 0);
  assert.equal(reportHub({ storage: st, outbox: ob, prog, pid: 'p-zyler', cards: 6, now: 2000, flush: false }), 2);
  assert.deepEqual(ob.pending(), [{ id: 'french:zyler:2000', kid: 'zyler', app: 'french', tickets: 2, ts: 2000, detail: '6 cards' }]);
  assert.equal(prog.hubUnits, 1);

  const kp = newProgress();
  assert.equal(reportHub({ storage: st, outbox: ob, prog: kp, pid: 'p-kadyn', cards: 4, now: 3000, flush: false }), 1);
  assert.equal(ob.pending()[1].id, 'french:kadyn:3000');
});

test('qualifiesForTicket: quiz, correct, first try, no intro check, no hint', () => {
  const ok = { mode: 'quiz', correct: true, recovering: false, fresh: false, hints: 0 };
  assert.equal(qualifiesForTicket(ok), true);
  assert.equal(qualifiesForTicket({ ...ok, hints: undefined }), true); // non-typed cards have no hints
  assert.equal(qualifiesForTicket({ ...ok, mode: 'flip' }), false);
  assert.equal(qualifiesForTicket({ ...ok, correct: false }), false);
  assert.equal(qualifiesForTicket({ ...ok, recovering: true }), false);
  assert.equal(qualifiesForTicket({ ...ok, fresh: true }), false);
  assert.equal(qualifiesForTicket({ ...ok, hints: 1 }), false); // hinted typed answer
  assert.equal(qualifiesForTicket({ ...ok, hints: 3 }), false);
});

test('qualifiesForTicket: a close typo (correct, graded Hard) still qualifies', () => {
  // study.js passes correct=true for 'close' typed answers when no hint was used.
  assert.equal(qualifiesForTicket({ mode: 'quiz', correct: true, recovering: false, fresh: false, hints: 0 }), true);
});
