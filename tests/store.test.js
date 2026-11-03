import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDB, migrate, loadDB, saveDB, upsertWord, deleteWord, encodeWordList, decodeWordList,
  applyWordList, diffWordList, mergeDB, exportBackup, parseBackup, activeWords, STORAGE_KEY,
} from '../js/store.js';
import { newCard } from '../js/srs.js';

function memStorage() {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), _m: m };
}

test('default data has two kids, the seed words, and a namespaced key', () => {
  const db = defaultDB();
  assert.deepEqual(db.profiles.map(p => p.name), ['Zyler', 'Kadyn']);
  assert.equal(db.words.length, 30);
  assert.ok(STORAGE_KEY.startsWith('mamou-fr:'));
  assert.equal(new Set(db.words.map(w => w.id)).size, 30);
});

test('save and load round-trip; garbage falls back to defaults', () => {
  const s = memStorage();
  const db = defaultDB();
  db.progress['p-zyler'].xp = 123;
  saveDB(db, s);
  assert.equal(loadDB(s).progress['p-zyler'].xp, 123);
  s.setItem(STORAGE_KEY, '{not json');
  assert.equal(loadDB(s).words.length, 30);
});

test('migrate fills in fields missing from older saves', () => {
  const db = migrate({ words: [], profiles: [{ id: 'p1', name: 'A' }], progress: { p1: { xp: 5, stats: { reviews: 2 } } } });
  assert.equal(db.progress.p1.xp, 5);
  assert.equal(db.progress.p1.stats.reviews, 2);
  assert.equal(db.progress.p1.stats.duelWins, 0);
  assert.equal(db.progress.p1.prefs.newPerDay, 5);
});

test('editing a word keeps its progress; deleting removes its cards', () => {
  const db = defaultDB();
  const w = db.words.find(x => x.id === 'w-chat');
  db.progress['p-zyler'].cards['w-chat:r'] = { ...newCard(), state: 'review', ivl: 4 };
  upsertWord(db, { ...w, fr: 'le chaton', en: 'kitten' });
  assert.equal(db.words.find(x => x.id === 'w-chat').fr, 'le chaton');
  assert.equal(db.progress['p-zyler'].cards['w-chat:r'].ivl, 4);
  deleteWord(db, 'w-chat');
  assert.equal(db.words.find(x => x.id === 'w-chat'), undefined);
  assert.equal(db.progress['p-zyler'].cards['w-chat:r'], undefined);
  assert.ok(db.deleted['w-chat']);
});

test('disabled categories are hidden from study', () => {
  const db = defaultDB();
  db.disabledCats = ['Couleurs'];
  assert.equal(activeWords(db).length, 26);
});

test('word list share links round-trip, including accents and emoji', () => {
  const db = defaultDB();
  const code = encodeWordList(db.words);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  const back = decodeWordList(code);
  assert.equal(back.length, 30);
  assert.equal(back.find(w => w.id === 'w-soeur').fr, 'la sœur');
  assert.equal(back.find(w => w.id === 'w-chat').emoji, '🐱');
  assert.equal(back.find(w => w.id === 'w-eau').g, 'f');
  assert.throws(() => decodeWordList('bm90IGEgbGlzdA'));
});

test('importing a shared list merges by id, then by spelling', () => {
  const db = defaultDB();
  db.progress['p-kadyn'].cards['w-pain:r'] = { ...newCard(), state: 'review', ivl: 9 };
  const incoming = [
    { id: 'w-pain', fr: 'le pain', en: 'bread / loaf', emoji: '🍞', cat: 'Nourriture' }, // updated by id
    { id: 'other-id', fr: 'le chat', en: 'cat', emoji: '🐱', cat: 'Animaux', g: 'm', note: 'The t is silent: "shah".' }, // same spelling
    { id: 'w-new1', fr: 'la lune', en: 'moon', emoji: '🌙', cat: 'Semaine 2' },
  ];
  const d = diffWordList(db, incoming);
  assert.equal(d.added.length, 1);
  assert.equal(d.updated.length, 1);
  assert.equal(d.same.length, 1);
  assert.equal(d.missing.length, 28);
  const res = applyWordList(db, incoming, 'merge');
  assert.deepEqual(res, { added: 1, updated: 1, removed: 0 });
  assert.equal(db.words.length, 31);
  assert.equal(db.words.find(w => w.id === 'w-pain').en, 'bread / loaf');
  assert.equal(db.progress['p-kadyn'].cards['w-pain:r'].ivl, 9);

  const res2 = applyWordList(db, incoming, 'replace');
  assert.equal(res2.removed, 28);
  assert.equal(db.words.length, 3);
  assert.equal(db.progress['p-kadyn'].cards['w-pain:r'].ivl, 9);
});

test('backups merge: newer card reviews win, nothing is lost', () => {
  const a = defaultDB();
  const b = defaultDB();
  a.progress['p-zyler'].cards['w-chat:r'] = { ...newCard(), state: 'review', ivl: 2, last: 100 };
  b.progress['p-zyler'].cards['w-chat:r'] = { ...newCard(), state: 'review', ivl: 6, last: 200 };
  b.progress['p-zyler'].cards['w-chien:r'] = { ...newCard(), state: 'learning', last: 50 };
  a.progress['p-zyler'].xp = 300; b.progress['p-zyler'].xp = 250;
  b.progress['p-zyler'].ach = { premier: 10 };
  b.progress['p-zyler'].owned = ['beret-rouge'];
  b.words.push({ id: 'w-x', fr: 'le x', en: 'x', cat: 'Z', u: 5 });
  const m = mergeDB(a, parseBackup(exportBackup(b)));
  const p = m.progress['p-zyler'];
  assert.equal(p.cards['w-chat:r'].ivl, 6);
  assert.equal(p.cards['w-chien:r'].state, 'learning');
  assert.equal(p.xp, 300);
  assert.ok(p.ach.premier);
  assert.deepEqual(p.owned, ['beret-rouge']);
  assert.ok(m.words.find(w => w.id === 'w-x'));
  assert.equal(m.profiles.length, 2);
});

test('a word deleted here stays deleted when merging an older backup', () => {
  const a = defaultDB();
  const old = JSON.parse(JSON.stringify(a));
  deleteWord(a, 'w-chat');
  const m = mergeDB(a, old);
  assert.equal(m.words.find(w => w.id === 'w-chat'), undefined);
});

test('kids with different ids but the same name merge', () => {
  const a = defaultDB();
  const b = defaultDB();
  b.profiles[0].id = 'p-other';
  b.progress['p-other'] = b.progress['p-zyler'];
  delete b.progress['p-zyler'];
  b.progress['p-other'].xp = 999;
  const m = mergeDB(a, b);
  assert.equal(m.profiles.length, 2);
  assert.equal(m.progress['p-zyler'].xp, 999);
});
