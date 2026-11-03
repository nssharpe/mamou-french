import test from 'node:test';
import assert from 'node:assert/strict';
import { todayPlan, buildQueue, Session, rId, pId, today } from '../js/session.js';
import { newProgress } from '../js/store.js';
import { schedule, GOOD, AGAIN, newCard } from '../js/srs.js';
import { SEED_WORDS } from '../js/words.js';
import { MIN, DAY, dayStartPlus } from '../js/util.js';

const T0 = new Date(2026, 10, 3, 16, 0).getTime();
const words = SEED_WORDS.slice(0, 10);
const rng = () => 0.5;

test('a fresh kid gets newPerDay new French→English cards and nothing due', () => {
  const prog = newProgress();
  const plan = todayPlan(prog, words, T0);
  assert.equal(plan.due.length, 0);
  assert.deepEqual(plan.newR, words.slice(0, 5).map(w => rId(w.id)));
  assert.equal(plan.newP.length, 0);
  assert.equal(plan.moreNew, 5);
});

test('new-card allowance counts what was already introduced today, plus extras', () => {
  const prog = newProgress();
  const d = today(prog, T0);
  d.newR = 3;
  assert.equal(todayPlan(prog, words, T0).newR.length, 2);
  d.extra = 5;
  assert.equal(todayPlan(prog, words, T0).newR.length, 7);
});

test('English→French unlocks after graduating, but not the same day', () => {
  const prog = newProgress();
  const id = rId(words[0].id);
  prog.cards[id] = schedule(schedule(newCard(), GOOD, T0, undefined, rng), GOOD, T0 + 10 * MIN, undefined, rng);
  assert.equal(prog.cards[id].state, 'review');
  assert.equal(todayPlan(prog, words, T0 + 11 * MIN).newP.length, 0);
  const tomorrow = dayStartPlus(T0, 1) + 3 * 3600e3;
  const plan = todayPlan(prog, words, tomorrow);
  assert.deepEqual(plan.newP, [pId(words[0].id)]);
  assert.deepEqual(plan.due, [id]);
});

test('learning cards due now come before reviews; later-today learning cards are counted', () => {
  const prog = newProgress();
  prog.cards[rId(words[0].id)] = { ...newCard(), state: 'review', ivl: 3, due: T0 - DAY, last: T0 - 4 * DAY };
  prog.cards[rId(words[1].id)] = { ...newCard(), state: 'learning', step: 1, due: T0 - MIN, last: T0 - 11 * MIN };
  prog.cards[rId(words[2].id)] = { ...newCard(), state: 'learning', step: 1, due: T0 + 60 * MIN, last: T0 };
  const plan = todayPlan(prog, words, T0);
  assert.deepEqual(plan.due, [rId(words[1].id), rId(words[0].id)]);
  assert.deepEqual(plan.later, [rId(words[2].id)]);
});

test('cards of disabled words are simply not in the plan', () => {
  const prog = newProgress();
  const plan = todayPlan(prog, [], T0);
  assert.equal(plan.newR.length + plan.due.length, 0);
});

test('buildQueue keeps every card exactly once', () => {
  const plan = { due: ['a', 'b', 'c', 'd', 'e', 'f'], newR: ['n1', 'n2'], newP: ['p1'] };
  const q = buildQueue(plan, rng);
  assert.equal(q.length, 9);
  assert.deepEqual([...q].sort(), ['a', 'b', 'c', 'd', 'e', 'f', 'n1', 'n2', 'p1']);
});

test('a session brings learning cards back until they graduate', () => {
  const prog = newProgress();
  const ids = [rId('w1'), rId('w2')];
  const s = new Session(ids);
  let now = T0;
  const shown = [];
  for (let guard = 0; guard < 20; guard++) {
    const id = s.next(now);
    if (!id) break;
    shown.push(id);
    const card = schedule(prog.cards[id] || newCard(), GOOD, now, undefined, rng);
    prog.cards[id] = card;
    s.answered(id, card, now);
    now += 15 * 1000;
  }
  // Each new card: first view, then the 10-minute step, then it graduates = 2 views.
  assert.equal(shown.length, 4);
  assert.ok(ids.every(id => prog.cards[id].state === 'review'));
  // Never the same card twice in a row while another is available.
  for (let i = 1; i < shown.length - 1; i++) assert.notEqual(shown[i], shown[i - 1]);
});

test('a lapse in a session is relearned before the session ends', () => {
  const id = rId('w1');
  const s = new Session([id]);
  let card = { ...newCard(), state: 'review', ivl: 5, due: T0 - DAY };
  assert.equal(s.next(T0), id);
  card = schedule(card, AGAIN, T0, undefined, rng);
  s.answered(id, card, T0);
  assert.equal(s.remaining, 1);
  assert.equal(s.next(T0 + 1000), id); // learn-ahead: nothing else to show
  card = schedule(card, GOOD, T0 + 1000, undefined, rng);
  s.answered(id, card, T0 + 1000);
  assert.equal(card.state, 'review');
  assert.equal(s.next(T0 + 2000), null);
});
