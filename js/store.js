// Persistence and the data model. Everything lives in one localStorage key.
// All Pages apps on nssharpe.github.io share an origin, so the key is namespaced.
//
// db = {
//   v, words: [{id, fr, en, emoji, g?, cat, note?, u}], deleted: {wordId: ts},
//   disabledCats: [cat], profiles: [{id, name, animal, u}], progress: {profileId: Progress},
//   settings: {sound, voice, rate, pin}
// }
// Card ids are `${wordId}:r` (recognize: French → English) and `${wordId}:p`
// (produce: English → French).

import { SEED_WORDS } from './words.js';
import { uid } from './util.js';

export const STORAGE_KEY = 'mamou-fr:v1';
export const DB_VERSION = 1;

export const DEFAULT_PREFS = { newPerDay: 5, goal: 20, mode: 'quiz', autoSpeak: true };

export function newProgress() {
  return {
    cards: {},
    xp: 0,
    croissants: 0,
    streak: { count: 0, best: 0, lastDay: null, freezes: 0 },
    days: {},
    ach: {},
    owned: [],
    equip: { hat: null, face: null, bg: null, card: null },
    hubUnits: 0, // qualifying cards not yet turned into family-hub tickets (the remainder under one ticket)
    stats: {
      reviews: 0, correct: 0, bestCombo: 0, perfect: 0, accentOk: 0, wordsLearned: 0,
      memoryBest: null, speedBest: 0, penduWins: 0, duelWins: 0, games: 0, mascotTaps: 0, shopBuys: 0,
    },
    prefs: { ...DEFAULT_PREFS },
    seenLevel: 1,
    onboarded: false,
    epoch: 0, // set when progress is reset, so sync knows the old progress is gone
  };
}

export function newProfile(name, animal = '🐱') {
  return { id: uid('p-'), name: name.trim(), animal, u: Date.now() };
}

export function defaultDB() {
  const now = Date.now();
  // Fixed ids so the same kid on two devices merges cleanly from a backup.
  const profiles = [
    { ...newProfile('Zyler', '🦊'), id: 'p-zyler', u: 0 },
    { ...newProfile('Kadyn', '🐼'), id: 'p-kadyn', u: 0 },
  ];
  const progress = {};
  for (const p of profiles) progress[p.id] = newProgress();
  return {
    v: DB_VERSION,
    words: SEED_WORDS.map(w => ({ ...w, u: 0 })),
    deleted: {},
    disabledCats: [],
    deletedProfiles: {},
    sync: null, // { code, base, last } once family sync is on
    profiles,
    progress,
    settings: { sound: true, voice: null, rate: 0.85, pin: null },
    created: now,
  };
}

// Fill in anything missing from older saves so the rest of the app can assume
// the full shape.
export function migrate(db) {
  const base = defaultDB();
  const out = { ...base, ...db };
  out.v = DB_VERSION;
  out.words = Array.isArray(db.words) ? db.words : base.words;
  // Untouched seed words (u === 0) follow the app's current wording, so corrected text
  // reaches devices that stored the seed list earlier. Edited words (u > 0) are left alone.
  // This intentionally runs on every load (permanent behavior, not a one-time migration),
  // so future seed-text fixes reach existing devices too.
  const seedById = new Map(SEED_WORDS.map(w => [w.id, w]));
  out.words = out.words.map(w => {
    const seed = w && w.u === 0 ? seedById.get(w.id) : null;
    if (!seed) return w;
    const fresh = { ...w, fr: seed.fr, en: seed.en, emoji: seed.emoji };
    if (seed.note === undefined) delete fresh.note; else fresh.note = seed.note;
    return fresh;
  });
  out.deleted = db.deleted || {};
  out.deletedProfiles = db.deletedProfiles || {};
  out.sync = db.sync || null;
  out.disabledCats = db.disabledCats || [];
  out.profiles = Array.isArray(db.profiles) ? db.profiles : base.profiles;
  out.settings = { ...base.settings, ...(db.settings || {}) };
  out.progress = {};
  for (const p of out.profiles) {
    const fresh = newProgress();
    const old = (db.progress || {})[p.id] || {};
    out.progress[p.id] = {
      ...fresh, ...old,
      streak: { ...fresh.streak, ...(old.streak || {}) },
      equip: { ...fresh.equip, ...(old.equip || {}) },
      stats: { ...fresh.stats, ...(old.stats || {}) },
      prefs: { ...fresh.prefs, ...(old.prefs || {}) },
    };
  }
  return out;
}

export function loadDB(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not read saved data', e);
  }
  return defaultDB();
}

export function saveDB(db, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.warn('Could not save', e);
    return false;
  }
}

export function activeWords(db) {
  return db.words.filter(w => !db.disabledCats.includes(w.cat));
}

export function wordById(db, id) {
  return db.words.find(w => w.id === id);
}

export function addProfile(db, name, animal) {
  const p = newProfile(name, animal);
  db.profiles.push(p);
  db.progress[p.id] = newProgress();
  return p;
}

export function removeProfile(db, id) {
  db.profiles = db.profiles.filter(p => p.id !== id);
  db.deletedProfiles = { ...(db.deletedProfiles || {}), [id]: Date.now() };
  delete db.progress[id];
}

export function resetProgress(db, id) {
  db.progress[id] = { ...newProgress(), epoch: Date.now() };
}

// ---------- word list editing ----------

export function upsertWord(db, word) {
  const now = Date.now();
  const i = db.words.findIndex(w => w.id === word.id);
  const w = { ...word, u: now };
  if (i >= 0) db.words[i] = w; else db.words.push(w);
  delete db.deleted[w.id];
  return w;
}

export function deleteWord(db, id) {
  db.words = db.words.filter(w => w.id !== id);
  db.deleted[id] = Date.now();
  for (const pid of Object.keys(db.progress)) {
    const cards = db.progress[pid].cards;
    delete cards[`${id}:r`];
    delete cards[`${id}:p`];
  }
}

export function moveWord(db, id, delta) {
  const i = db.words.findIndex(w => w.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= db.words.length) return;
  const [w] = db.words.splice(i, 1);
  db.words.splice(j, 0, w);
}

// ---------- sharing a word list by link ----------

function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeWordList(words) {
  const rows = words.map(w => [w.id, w.fr, w.en, w.emoji || '', w.cat || '', w.g || '', w.note || '']);
  return toB64Url(JSON.stringify({ v: 1, w: rows }));
}

export function decodeWordList(s) {
  const data = JSON.parse(fromB64Url(s));
  if (!data || !Array.isArray(data.w)) throw new Error('Not a word list');
  return data.w
    .filter(r => Array.isArray(r) && r[1] && r[2])
    .map(([id, fr, en, emoji, cat, g, note]) => {
      const w = { id: String(id || uid('w-')), fr: String(fr), en: String(en), emoji: String(emoji || ''), cat: String(cat || 'Mes mots') };
      if (g === 'm' || g === 'f') w.g = g;
      if (note) w.note = String(note);
      return w;
    });
}

const sameWord = (a, b) => a.fr.trim().toLowerCase() === b.fr.trim().toLowerCase();
const wordFields = w => JSON.stringify([w.fr, w.en, w.emoji || '', w.cat, w.g || '', w.note || '']);

// Compare an incoming list with ours: what would be added / changed / removed.
export function diffWordList(db, incoming) {
  const added = [], updated = [], same = [];
  const matched = new Set();
  for (const w of incoming) {
    const mine = db.words.find(m => m.id === w.id) || db.words.find(m => !matched.has(m.id) && sameWord(m, w));
    if (!mine) { added.push(w); continue; }
    matched.add(mine.id);
    if (wordFields(mine) !== wordFields(w)) updated.push({ mine, theirs: w }); else same.push(mine);
  }
  const missing = db.words.filter(m => !matched.has(m.id));
  return { added, updated, same, missing };
}

/**
 * Apply an incoming word list. mode 'merge' adds and updates; 'replace' also
 * removes words that aren't in the incoming list (and their progress).
 * Matching is by id first, then by French spelling, so progress is kept.
 * The incoming order becomes the study order for matched words.
 */
export function applyWordList(db, incoming, mode = 'merge') {
  const d = diffWordList(db, incoming);
  const now = Date.now();
  for (const { mine, theirs } of d.updated) {
    Object.assign(mine, { fr: theirs.fr, en: theirs.en, emoji: theirs.emoji, cat: theirs.cat, u: now });
    if (theirs.g) mine.g = theirs.g; else delete mine.g;
    if (theirs.note) mine.note = theirs.note; else delete mine.note;
  }
  for (const w of d.added) {
    const id = db.words.some(m => m.id === w.id) ? uid('w-') : w.id;
    db.words.push({ ...w, id, u: now });
    delete db.deleted[id];
  }
  if (mode === 'replace') for (const m of d.missing) deleteWord(db, m.id);
  return { added: d.added.length, updated: d.updated.length, removed: mode === 'replace' ? d.missing.length : 0 };
}

// ---------- backup / restore ----------

export function exportBackup(db) {
  return JSON.stringify({ app: 'mamou-french', exported: new Date().toISOString(), db });
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  const db = data && data.app === 'mamou-french' ? data.db : data;
  if (!db || !Array.isArray(db.words) || !Array.isArray(db.profiles)) throw new Error('Not a Mamou backup');
  return migrate(db);
}

function mergeMax(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number') out[k] = Math.max(out[k] ?? -Infinity, v);
    else if (typeof v === 'boolean') out[k] = !!out[k] || v;
    else if (!(k in out)) out[k] = v;
  }
  return out;
}

export function mergeProgress(a, b) {
  const out = { ...a };
  out.cards = { ...a.cards };
  for (const [id, c] of Object.entries(b.cards || {})) {
    const mine = out.cards[id];
    if (!mine || (c.last || 0) > (mine.last || 0)) out.cards[id] = c;
  }
  out.xp = Math.max(a.xp, b.xp || 0);
  out.croissants = Math.max(a.croissants, b.croissants || 0);
  out.days = { ...a.days };
  for (const [k, v] of Object.entries(b.days || {})) out.days[k] = mergeMax(out.days[k], v);
  out.ach = { ...b.ach, ...a.ach };
  for (const [k, t] of Object.entries(b.ach || {})) if (a.ach[k]) out.ach[k] = Math.min(a.ach[k], t);
  out.owned = [...new Set([...(a.owned || []), ...(b.owned || [])])];
  const sa = a.streak, sb = b.streak || {};
  out.streak = (sb.lastDay || '') > (sa.lastDay || '') ? { ...sb } : { ...sa };
  out.streak.best = Math.max(sa.best || 0, sb.best || 0);
  out.stats = mergeMax(a.stats, b.stats || {});
  const bests = [a.stats.memoryBest, b.stats?.memoryBest].filter(x => typeof x === 'number');
  out.stats.memoryBest = bests.length ? Math.min(...bests) : null;
  out.seenLevel = Math.max(a.seenLevel || 1, b.seenLevel || 1);
  out.onboarded = a.onboarded || b.onboarded;
  return out;
}

// Merge another copy of the data (e.g. a backup from another device) into ours.
export function mergeDB(a, b) {
  const out = migrate(JSON.parse(JSON.stringify(a)));
  const other = migrate(b);
  out.deleted = { ...other.deleted, ...out.deleted };
  for (const w of other.words) {
    const i = out.words.findIndex(m => m.id === w.id);
    if (i < 0) {
      if ((out.deleted[w.id] || 0) < (w.u || 0) || !out.deleted[w.id]) out.words.push(w);
    } else if ((w.u || 0) > (out.words[i].u || 0)) out.words[i] = w;
  }
  out.words = out.words.filter(w => !out.deleted[w.id] || (w.u || 0) > out.deleted[w.id]);
  for (const p of other.profiles) {
    const mine = out.profiles.find(m => m.id === p.id);
    if (!mine) {
      // Same kid created separately on two devices? Match by name.
      const byName = out.profiles.find(m => m.name.toLowerCase() === p.name.toLowerCase());
      if (byName) { out.progress[byName.id] = mergeProgress(out.progress[byName.id], other.progress[p.id]); continue; }
      out.profiles.push(p);
      out.progress[p.id] = other.progress[p.id];
    } else {
      if ((p.u || 0) > (mine.u || 0)) Object.assign(mine, p);
      out.progress[p.id] = mergeProgress(out.progress[p.id], other.progress[p.id]);
    }
  }
  return out;
}
