import test from 'node:test';
import assert from 'node:assert/strict';
import { merge3, syncDoc, applyDoc, makeFamilyCode, isFamilyCode } from '../js/sync.js';
import { defaultDB, deleteWord, upsertWord, removeProfile, resetProgress, addProfile } from '../js/store.js';
import { buy } from '../js/progress.js';
import { newCard } from '../js/srs.js';

const clone = x => JSON.parse(JSON.stringify(x));

// Two devices that have synced once: both start from the same base.
function twoDevices() {
  const base = syncDoc(defaultDB());
  return { base: clone(base), a: clone(base), b: clone(base) };
}

test('first sync with an empty cloud uploads this device as-is', () => {
  const local = syncDoc(defaultDB());
  assert.deepEqual(merge3(null, local, null), local);
});

test('XP and croissants earned on two devices add up', () => {
  const { base, a, b } = twoDevices();
  a.progress['p-zyler'].xp += 100; a.progress['p-zyler'].croissants += 10;
  b.progress['p-zyler'].xp += 40; b.progress['p-zyler'].croissants += 4;
  const m = merge3(base, a, b);
  assert.equal(m.progress['p-zyler'].xp, 140);
  assert.equal(m.progress['p-zyler'].croissants, 14);
});

test('spending croissants on one device is not undone by the other', () => {
  const { base } = twoDevices();
  base.progress['p-kadyn'].croissants = 100;
  const a = clone(base), b = clone(base);
  assert.ok(buy(a.progress['p-kadyn'], 'beret-rouge')); // 100 → 60
  const m = merge3(base, a, b);
  assert.equal(m.progress['p-kadyn'].croissants, 60);
  assert.deepEqual(m.progress['p-kadyn'].owned, ['beret-rouge']);
  assert.equal(m.progress['p-kadyn'].equip.hat, 'beret-rouge');
  const again = merge3(m, clone(m), clone(m));
  assert.equal(again.progress['p-kadyn'].croissants, 60);
});

test('the most recent review of a card wins', () => {
  const { base, a, b } = twoDevices();
  a.progress['p-zyler'].cards['w-chat:r'] = { ...newCard(), state: 'review', ivl: 3, last: 200 };
  b.progress['p-zyler'].cards['w-chat:r'] = { ...newCard(), state: 'learning', last: 100 };
  b.progress['p-zyler'].cards['w-chien:r'] = { ...newCard(), state: 'review', ivl: 1, last: 150, grad: true };
  const m = merge3(base, b, a);
  assert.equal(m.progress['p-zyler'].cards['w-chat:r'].ivl, 3);
  assert.equal(m.progress['p-zyler'].cards['w-chien:r'].ivl, 1);
  assert.equal(m.progress['p-zyler'].stats.wordsLearned, 1);
});

test('day stats add up, flags combine', () => {
  const { base, a, b } = twoDevices();
  a.progress['p-zyler'].days['2026-11-03'] = { rev: 10, pts: 8, goal: false };
  b.progress['p-zyler'].days['2026-11-03'] = { rev: 6, pts: 6, goal: true };
  const m = merge3(base, a, b);
  assert.deepEqual(m.progress['p-zyler'].days['2026-11-03'], { rev: 16, pts: 14, goal: true });
});

test('word edits and deletions travel; new words appear', () => {
  const { base, a, b } = twoDevices();
  const dbA = applyDoc(defaultDB(), a);
  upsertWord(dbA, { ...dbA.words.find(w => w.id === 'w-chat'), en: 'cat / kitty' });
  deleteWord(dbA, 'w-chien');
  const dbB = applyDoc(defaultDB(), b);
  dbB.progress['p-zyler'].cards['w-chien:r'] = { ...newCard(), state: 'review', last: Date.now() };
  upsertWord(dbB, { id: 'w-lune', fr: 'la lune', en: 'moon', emoji: '🌙', cat: 'Semaine 2' });
  const m = merge3(base, syncDoc(dbA), syncDoc(dbB));
  assert.equal(m.words.find(w => w.id === 'w-chat').en, 'cat / kitty');
  assert.equal(m.words.find(w => w.id === 'w-chien'), undefined);
  assert.equal(m.progress['p-zyler'].cards['w-chien:r'], undefined);
  assert.ok(m.words.find(w => w.id === 'w-lune'));
  assert.equal(m.words.length, 30);
});

test('a removed player stays removed; a new player appears everywhere', () => {
  const { base, a, b } = twoDevices();
  const dbA = applyDoc(defaultDB(), a);
  removeProfile(dbA, 'p-kadyn');
  const dbB = applyDoc(defaultDB(), b);
  const p = addProfile(dbB, 'Mamou', '🦉');
  dbB.progress[p.id].xp = 30;
  const m = merge3(base, syncDoc(dbA), syncDoc(dbB));
  assert.deepEqual(m.profiles.map(x => x.name), ['Zyler', 'Mamou']);
  assert.equal(m.progress[p.id].xp, 30);
  assert.equal(m.progress['p-kadyn'], undefined);
});

test('a progress reset on one device wins over old progress elsewhere', () => {
  const { base, a, b } = twoDevices();
  b.progress['p-zyler'].xp = 500;
  const dbA = applyDoc(defaultDB(), a);
  resetProgress(dbA, 'p-zyler');
  const m = merge3(base, syncDoc(dbA), b);
  assert.equal(m.progress['p-zyler'].xp, 0);
  assert.ok(m.progress['p-zyler'].epoch > 0);
  const m2 = clone(m); m2.progress['p-zyler'].xp = 20;
  assert.equal(merge3(m, m2, clone(m)).progress['p-zyler'].xp, 20);
});

test('settings: whichever side changed wins; the family wins on first join', () => {
  const { base, a, b } = twoDevices();
  a.progress['p-zyler'].prefs.newPerDay = 8;
  b.disabledCats = ['Nombres'];
  b.pin = 'abc';
  const m = merge3(base, a, b);
  assert.equal(m.progress['p-zyler'].prefs.newPerDay, 8);
  assert.deepEqual(m.disabledCats, ['Nombres']);
  assert.equal(m.pin, 'abc');
  const j = merge3(null, syncDoc(defaultDB()), m);
  assert.equal(j.progress['p-zyler'].prefs.newPerDay, 8);
  assert.deepEqual(j.disabledCats, ['Nombres']);
});

test('a fresh device joining takes the family progress without doubling it', () => {
  const fam = syncDoc(defaultDB());
  fam.progress['p-zyler'].xp = 900;
  fam.progress['p-zyler'].croissants = 77;
  fam.progress['p-zyler'].stats.reviews = 300;
  const j = merge3(null, syncDoc(defaultDB()), fam);
  assert.equal(j.progress['p-zyler'].xp, 900);
  assert.equal(j.progress['p-zyler'].croissants, 77);
  assert.equal(j.progress['p-zyler'].stats.reviews, 300);
});

test('same-name kids created on two devices become one', () => {
  const dbA = defaultDB(); const pa = addProfile(dbA, 'Léa', '🐸'); dbA.progress[pa.id].xp = 10;
  const dbB = defaultDB(); const pb = addProfile(dbB, 'léa', '🐸'); dbB.progress[pb.id].xp = 5;
  const m = merge3(null, syncDoc(dbA), syncDoc(dbB));
  assert.equal(m.profiles.filter(p => p.name.toLowerCase() === 'léa').length, 1);
  assert.equal(m.progress[pb.id].xp, 15);
});

test('syncing is idempotent', () => {
  const { base, a, b } = twoDevices();
  a.progress['p-zyler'].xp = 50; b.progress['p-kadyn'].xp = 70;
  const m = merge3(base, a, b);
  assert.deepEqual(merge3(m, clone(m), clone(m)), m);
});

test('family codes are long and recognisable', () => {
  const c = makeFamilyCode();
  assert.ok(isFamilyCode(c), c);
  assert.ok(c.length >= 26);
  assert.notEqual(makeFamilyCode(), c);
  assert.ok(!isFamilyCode('mamou-abc'));
});

test('applying a sync keeps the same progress objects screens are holding', () => {
  const db = defaultDB();
  const held = db.progress['p-zyler'];
  const heldProfile = db.profiles[0];
  const doc = syncDoc(defaultDB());
  doc.progress['p-zyler'].xp = 321;
  doc.profiles[0].animal = '🦄';
  applyDoc(db, JSON.parse(JSON.stringify(doc)));
  assert.equal(db.progress['p-zyler'], held);
  assert.equal(held.xp, 321);
  assert.equal(db.profiles[0], heldProfile);
  assert.equal(heldProfile.animal, '🦄');
  held.xp += 1; // a screen writing after the sync
  assert.equal(db.progress['p-zyler'].xp, 322);
});
