// Family sync: a three-way merge between the last synced copy (base), this
// device (local) and the cloud (remote). Pure functions, no network.
//
// Why three-way: a plain "take the max" merge lets a kid spend croissants on
// one device and get them back by syncing with another, and it loses XP earned
// on two devices at once. With the base we know what each side *changed*:
//   counters (XP, croissants, review counts…)  remote + (local − base)
//   single values (prefs, names, equipped hat)  whichever side changed (local wins a tie)
//   flashcards                                  the most recent review wins
//   sets (trophies, owned items, deletions)     union
//
// The synced document is everything except per-device settings (sound, voice, speed).

import { newProgress } from './store.js';
import { wordIdOf, dirOf } from './session.js';

export const SYNC_VERSION = 1;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The part of the database that travels between devices.
export function syncDoc(db) {
  return {
    v: SYNC_VERSION,
    words: db.words,
    deleted: db.deleted || {},
    disabledCats: db.disabledCats || [],
    profiles: db.profiles,
    deletedProfiles: db.deletedProfiles || {},
    progress: db.progress,
    pin: db.settings ? db.settings.pin ?? null : null,
  };
}

// Replace an object's contents but keep the object itself: open screens hold
// references to a kid's profile and progress and keep writing to them.
function refill(target, source) {
  for (const k of Object.keys(target)) delete target[k];
  return Object.assign(target, source);
}

// Put a merged document back into the database, keeping device settings.
export function applyDoc(db, doc) {
  db.words = doc.words;
  db.deleted = doc.deleted;
  db.disabledCats = doc.disabledCats;
  db.deletedProfiles = doc.deletedProfiles;
  const oldProfiles = new Map((db.profiles || []).map(p => [p.id, p]));
  db.profiles = doc.profiles.map(p => (oldProfiles.has(p.id) ? refill(oldProfiles.get(p.id), p) : p));
  const oldProgress = db.progress || {};
  const progress = {};
  for (const [id, pr] of Object.entries(doc.progress)) progress[id] = oldProgress[id] ? refill(oldProgress[id], pr) : pr;
  db.progress = progress;
  db.settings = { ...db.settings, pin: doc.pin };
  return db;
}

// One value that either side may have changed. Without a base (first sync on
// a device) the family's copy wins.
function pick(hasBase, b, l, r) {
  if (!hasBase) return r === undefined ? l : r;
  return same(l, b) ? (r === undefined ? l : r) : l;
}

function count(b, l, r) {
  return (r || 0) + ((l || 0) - (b || 0));
}

const COUNTERS = ['reviews', 'correct', 'perfect', 'accentOk', 'penduWins', 'duelWins', 'games', 'shopBuys'];
const MAXES = ['bestCombo', 'speedBest', 'mascotTaps'];

function mergeDays(b = {}, l = {}, r = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
    const bd = b[k] || {}, ld = l[k] || {}, rd = r[k] || {};
    const d = {};
    for (const f of new Set([...Object.keys(ld), ...Object.keys(rd)])) {
      const v = ld[f] ?? rd[f];
      if (typeof v === 'number') d[f] = Math.max(0, count(bd[f], ld[f], rd[f]));
      else if (typeof v === 'boolean') d[f] = !!ld[f] || !!rd[f];
      else d[f] = ld[f] ?? rd[f];
    }
    out[k] = d;
  }
  return out;
}

export function mergeProgress3(base, local, remote) {
  const l = local || newProgress();
  const r = remote || newProgress();
  // A reset starts a new "epoch": the newest reset wins outright.
  if ((l.epoch || 0) !== (r.epoch || 0)) return JSON.parse(JSON.stringify((l.epoch || 0) > (r.epoch || 0) ? l : r));
  const hasBase = !!base && (base.epoch || 0) === (l.epoch || 0);
  const b = hasBase ? base : newProgress();

  const out = newProgress();
  out.epoch = l.epoch || 0;

  // Flashcards: the most recent review wins.
  for (const id of new Set([...Object.keys(l.cards || {}), ...Object.keys(r.cards || {})])) {
    const lc = l.cards[id], rc = r.cards[id];
    out.cards[id] = !rc ? lc : !lc ? rc : ((lc.last || 0) >= (rc.last || 0) ? lc : rc);
  }

  out.xp = Math.max(0, count(b.xp, l.xp, r.xp));
  out.croissants = Math.max(0, count(b.croissants, l.croissants, r.croissants));

  const ls = l.streak || {}, rs = r.streak || {}, bs = b.streak || {};
  const newer = (ls.lastDay || '') > (rs.lastDay || '') ? ls
    : (rs.lastDay || '') > (ls.lastDay || '') ? rs
      : ((ls.count || 0) >= (rs.count || 0) ? ls : rs);
  out.streak = {
    count: newer.count || 0,
    lastDay: newer.lastDay || null,
    best: Math.max(ls.best || 0, rs.best || 0),
    freezes: Math.min(3, Math.max(0, count(bs.freezes, ls.freezes, rs.freezes))),
  };

  out.days = mergeDays(b.days, l.days, r.days);

  out.ach = { ...r.ach };
  for (const [k, t] of Object.entries(l.ach || {})) out.ach[k] = out.ach[k] ? Math.min(out.ach[k], t) : t;
  out.owned = [...new Set([...(r.owned || []), ...(l.owned || [])])];

  for (const slot of Object.keys(out.equip)) out.equip[slot] = pick(hasBase, (b.equip || {})[slot], (l.equip || {})[slot], (r.equip || {})[slot]) ?? null;
  for (const k of Object.keys(out.prefs)) out.prefs[k] = pick(hasBase, (b.prefs || {})[k], (l.prefs || {})[k], (r.prefs || {})[k]) ?? out.prefs[k];

  const bst = b.stats || {}, lst = l.stats || {}, rst = r.stats || {};
  for (const k of COUNTERS) out.stats[k] = Math.max(0, count(bst[k], lst[k], rst[k]));
  for (const k of MAXES) out.stats[k] = Math.max(lst[k] || 0, rst[k] || 0);
  const bests = [lst.memoryBest, rst.memoryBest].filter(x => typeof x === 'number');
  out.stats.memoryBest = bests.length ? Math.min(...bests) : null;
  // Words learned is counted from the cards, so a word learned on two devices counts once.
  out.stats.wordsLearned = Object.entries(out.cards).filter(([id, c]) => dirOf(id) === 'r' && c && c.grad).length;

  out.seenLevel = Math.max(l.seenLevel || 1, r.seenLevel || 1);
  out.onboarded = !!(l.onboarded || r.onboarded);
  return out;
}

function mergeWords(b, l, r, deleted) {
  const byId = new Map();
  for (const w of [...r.words, ...l.words]) {
    const cur = byId.get(w.id);
    if (!cur || (w.u || 0) > (cur.u || 0) || ((w.u || 0) === (cur.u || 0) && l.words.includes(w))) byId.set(w.id, w);
  }
  const alive = w => !(w.id in deleted) || (w.u || 0) > deleted[w.id];
  // Order: if this device reordered since the last sync, keep its order.
  const ids = list => list.map(w => w.id);
  const order = b && !same(ids(l.words), ids(b.words)) ? ids(l.words) : ids(r.words);
  const out = [];
  const seen = new Set();
  for (const id of [...order, ...ids(r.words), ...ids(l.words)]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const w = byId.get(id);
    if (w && alive(w)) out.push(w);
  }
  return out;
}

/**
 * Merge three copies of the synced document. `base` may be null (this device
 * has never synced). Returns a new document.
 */
export function merge3(base, local, remote) {
  if (!remote) return JSON.parse(JSON.stringify(local));
  const hasBase = !!base;
  const b = base || { words: [], deleted: {}, disabledCats: [], profiles: [], deletedProfiles: {}, progress: {}, pin: null };

  const deleted = { ...remote.deleted };
  for (const [id, t] of Object.entries(local.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, t);
  const deletedProfiles = { ...remote.deletedProfiles };
  for (const [id, t] of Object.entries(local.deletedProfiles || {})) deletedProfiles[id] = Math.max(deletedProfiles[id] || 0, t);

  const words = mergeWords(hasBase ? b : null, local, remote, deleted);
  const wordIds = new Set(words.map(w => w.id));

  // Players. A kid created separately on two devices with the same name is one kid.
  const localProfiles = local.profiles.map(p => ({ ...p }));
  const localProgress = { ...local.progress };
  for (const p of localProfiles) {
    if (remote.profiles.some(q => q.id === p.id)) continue;
    const twin = remote.profiles.find(q => q.name.trim().toLowerCase() === p.name.trim().toLowerCase() && !local.profiles.some(x => x.id === q.id));
    if (twin && !b.profiles.some(q => q.id === p.id)) {
      localProgress[twin.id] = localProgress[p.id];
      delete localProgress[p.id];
      p.id = twin.id;
    }
  }
  const profiles = [];
  const progress = {};
  const order = [...remote.profiles.map(p => p.id), ...localProfiles.map(p => p.id)];
  for (const id of new Set(order)) {
    if (id in deletedProfiles) continue;
    const lp = localProfiles.find(p => p.id === id), rp = remote.profiles.find(p => p.id === id), bp = b.profiles.find(p => p.id === id);
    if (!lp || !rp) {
      // Only on one side. If it was in the base, the other side removed it… but
      // removals leave a tombstone, so a missing profile here is simply new.
      profiles.push({ ...(lp || rp) });
      progress[id] = JSON.parse(JSON.stringify((lp ? localProgress : remote.progress)[id] || newProgress()));
      continue;
    }
    const pHas = hasBase && !!bp;
    profiles.push({
      ...rp, ...lp,
      name: pick(pHas, bp && bp.name, lp.name, rp.name),
      animal: pick(pHas, bp && bp.animal, lp.animal, rp.animal),
    });
    progress[id] = mergeProgress3(pHas ? b.progress[id] : null, localProgress[id], remote.progress[id]);
  }

  // Drop progress on words that no longer exist.
  for (const prog of Object.values(progress)) {
    for (const cid of Object.keys(prog.cards || {})) if (!wordIds.has(wordIdOf(cid))) delete prog.cards[cid];
  }

  return {
    v: SYNC_VERSION,
    words,
    deleted,
    disabledCats: pick(hasBase, b.disabledCats, local.disabledCats, remote.disabledCats) || [],
    profiles,
    deletedProfiles,
    progress,
    pin: pick(hasBase, b.pin, local.pin ?? null, remote.pin ?? null) ?? null,
  };
}

// Family codes: long and random, because the code is what keeps the data private.
export function makeFamilyCode(rand = n => crypto.getRandomValues(new Uint8Array(n))) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = rand(20);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `mamou-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

export function isFamilyCode(s) {
  return /^mamou-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}$/.test(String(s || '').trim());
}
