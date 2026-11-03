// XP, levels, streaks, daily goal and trophies. Pure functions over a kid's
// progress object (see store.js newProgress) so they can be unit-tested.

import { xpToNext, RANKS, ACHIEVEMENTS, SHOP } from './data.js';
import { today, dirOf } from './session.js';
import { dayKey, addDaysToKey, daysBetweenKeys } from './util.js';

export const GAME_XP_DAILY_CAP = 200;

export function levelInfo(xp) {
  let level = 1, rest = xp;
  while (rest >= xpToNext(level)) { rest -= xpToNext(level); level++; }
  const need = xpToNext(level);
  return { level, into: rest, need, pct: rest / need };
}

export function rankFor(level) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.level) r = x;
  return r;
}

export function nextRank(level) {
  return RANKS.find(x => x.level > level) || null;
}

/**
 * Add XP. Game XP is capped per day so the flashcards stay the main event.
 * Returns { gained, levelUps: [levels reached] }.
 */
export function addXp(prog, amount, now, { game = false } = {}) {
  const d = today(prog, now);
  let gained = Math.max(0, Math.round(amount));
  if (game) {
    gained = Math.min(gained, Math.max(0, GAME_XP_DAILY_CAP - d.gameXp));
    d.gameXp += gained;
  }
  const before = levelInfo(prog.xp).level;
  prog.xp += gained;
  d.xp += gained;
  const after = levelInfo(prog.xp).level;
  const levelUps = [];
  for (let l = before + 1; l <= after; l++) levelUps.push(l);
  return { gained, levelUps };
}

// Wrong answers earn nothing, so guessing never beats knowing (see the
// "random tapping" test in tests/progress.test.js).
export function xpForAnswer(correct, combo) {
  return correct ? 10 + Math.min(10, combo) : 0;
}

/**
 * Record one flashcard answer. `before`/`after` are the card states around
 * scheduling. Returns { xp, learnedWord }.
 */
export function recordAnswer(prog, { cardId, before, after, correct, combo, now, accentWord = false }) {
  const d = today(prog, now);
  const s = prog.stats;
  s.reviews++;
  d.rev++;
  if (correct) { s.correct++; d.ok++; d.pts++; }
  if (combo > s.bestCombo) s.bestCombo = combo;
  if (accentWord && correct) s.accentOk++;
  if (before.state === 'new') {
    if (dirOf(cardId) === 'r') d.newR++; else d.newP++;
  }
  let learnedWord = false;
  if (after.state === 'review' && !before.grad && dirOf(cardId) === 'r') {
    after.grad = true;
    s.wordsLearned++;
    learnedWord = true;
  } else if (before.grad) after.grad = true;
  // A missed card comes back several times the same day; getting it right then
  // is worth a little, not full XP — otherwise missing on purpose would pay.
  const k = dayKey(now);
  const recovering = before.miss === k;
  if (!correct) after.miss = k;
  else if (before.miss) after.miss = before.miss;
  const xp = (recovering && correct ? 2 : xpForAnswer(correct, combo)) + (learnedWord ? 15 : 0);
  return { xp, learnedWord };
}

export function displayStreak(prog, now) {
  const t = dayKey(now);
  const { lastDay, count } = prog.streak;
  if (!lastDay) return 0;
  const gap = daysBetweenKeys(lastDay, t);
  return gap <= 1 ? count : 0;
}

/**
 * Run when a kid opens the app. If days were missed, spend streak freezes to
 * bridge them, or reset the streak. Returns { saved: n } or { lost: n } or {}.
 */
export function checkStreak(prog, now) {
  const t = dayKey(now);
  const st = prog.streak;
  if (!st.lastDay || st.count === 0) return {};
  const gap = daysBetweenKeys(st.lastDay, t);
  if (gap <= 1) return {};
  const missed = gap - 1;
  if (st.freezes >= missed) {
    st.freezes -= missed;
    for (let i = 1; i <= missed; i++) {
      const k = addDaysToKey(st.lastDay, i);
      prog.days[k] = { ...(prog.days[k] || {}), frozen: true };
    }
    st.lastDay = addDaysToKey(t, -1);
    return { saved: missed };
  }
  const lost = st.count;
  st.count = 0;
  return { lost };
}

/**
 * Check whether today's goal is now met (enough points, or every due card
 * cleared). Extends the streak the first time it happens each day.
 * Returns { justMet, streak }.
 */
export function updateGoal(prog, now, { deckCleared = false } = {}) {
  const d = today(prog, now);
  if (d.goal) return { justMet: false, streak: prog.streak.count };
  const goal = prog.prefs.goal || 20;
  if (!(d.pts >= goal || (deckCleared && d.rev >= 5))) return { justMet: false, streak: prog.streak.count };
  d.goal = true;
  const t = dayKey(now);
  const st = prog.streak;
  const gap = st.lastDay ? daysBetweenKeys(st.lastDay, t) : null;
  if (gap === 1 && st.count > 0) st.count++;
  else if (gap !== 0) st.count = 1;
  st.lastDay = t;
  st.best = Math.max(st.best, st.count);
  return { justMet: true, streak: st.count };
}

export function goalProgress(prog, now) {
  const d = prog.days[dayKey(now)];
  const goal = prog.prefs.goal || 20;
  if (!d) return { pts: 0, goal, met: false, pct: 0 };
  return { pts: d.pts, goal, met: !!d.goal, pct: d.goal ? 1 : Math.min(1, d.pts / goal) };
}

export function masteredCount(prog) {
  return Object.values(prog.cards).filter(c => c.state === 'review' && c.ivl >= 21).length;
}

export function achievementContext(prog, now, extra = {}) {
  const d = new Date(now);
  return {
    level: levelInfo(prog.xp).level,
    mastered: masteredCount(prog),
    hour: d.getHours(), minute: d.getMinutes(), month: d.getMonth() + 1, day: d.getDate(),
    studied: false,
    ...extra,
  };
}

// Award any trophies newly earned. Returns the list of new ones.
export function checkAchievements(prog, ctx) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (prog.ach[a.id]) continue;
    let ok = false;
    try { ok = a.test(prog, ctx); } catch { ok = false; }
    if (ok) {
      prog.ach[a.id] = Date.now();
      prog.croissants += a.reward;
      got.push(a);
    }
  }
  return got;
}

// Monday-to-Sunday XP for the leaderboard.
export function weekXp(prog, now) {
  const t = dayKey(now);
  const [y, m, d] = t.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = Monday
  let sum = 0;
  for (let i = 0; i <= dow; i++) sum += (prog.days[addDaysToKey(t, -i)] || {}).xp || 0;
  return sum;
}

// ---------- shop ----------

export function canBuy(prog, item) {
  const level = levelInfo(prog.xp).level;
  if (item.min && level < item.min) return { ok: false, why: `Level ${item.min}` };
  if (item.slot === 'freeze') {
    if (prog.streak.freezes >= 2) return { ok: false, why: 'Max 2' };
  } else if (prog.owned.includes(item.id)) return { ok: false, why: 'owned' };
  if (prog.croissants < item.price) return { ok: false, why: 'price' };
  return { ok: true };
}

export function buy(prog, itemId) {
  const item = SHOP.find(i => i.id === itemId);
  if (!item || !canBuy(prog, item).ok) return false;
  prog.croissants -= item.price;
  prog.stats.shopBuys++;
  if (item.slot === 'freeze') prog.streak.freezes++;
  else { prog.owned.push(item.id); prog.equip[item.slot] = item.id; }
  return true;
}

export function equip(prog, itemId) {
  const item = SHOP.find(i => i.id === itemId);
  if (!item || !prog.owned.includes(itemId)) return;
  prog.equip[item.slot] = prog.equip[item.slot] === itemId ? null : itemId;
}

// ---------- daily surprise chest (unlocked by meeting the daily goal) ----------

export const CHEST_PRIZES = [
  { weight: 40, croissants: 5, label: '5 croissants' },
  { weight: 28, croissants: 10, label: '10 croissants' },
  { weight: 16, croissants: 20, label: '20 croissants !' },
  { weight: 8, freeze: true, croissants: 5, label: 'Un gel de série 🧊 + 5 croissants' },
  { weight: 6, xp: 50, croissants: 5, label: '50 XP bonus + 5 croissants' },
  { weight: 2, croissants: 75, label: 'LE JACKPOT : 75 croissants !!!' },
];

export function chestReady(prog, now) {
  const d = prog.days[dayKey(now)];
  return !!(d && d.goal && !d.chest);
}

// Opens today's chest. Returns the prize (croissants/freeze applied; XP is for the caller to award).
export function openChest(prog, now, rng = Math.random) {
  if (!chestReady(prog, now)) return null;
  const total = CHEST_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  let prize = CHEST_PRIZES[0];
  for (const p of CHEST_PRIZES) { if ((r -= p.weight) < 0) { prize = p; break; } }
  if (prize.freeze && prog.streak.freezes >= 2) prize = CHEST_PRIZES[2];
  prog.days[dayKey(now)].chest = true;
  prog.croissants += prize.croissants || 0;
  if (prize.freeze) prog.streak.freezes++;
  return prize;
}
