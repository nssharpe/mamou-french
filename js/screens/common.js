// Pieces shared by the kid screens: the top bar and word-pool helpers.

import { app } from '../app.js';
import { avatarHtml } from '../art.js';
import { levelInfo, displayStreak } from '../progress.js';
import { e } from '../ui.js';
import { rId } from '../session.js';
import { shuffle } from '../util.js';
import { variants } from '../answer.js';

export function topbar(pid, { back = `/p/${pid}`, title = '' } = {}) {
  const p = app.profile(pid), prog = app.prog(pid);
  const lvl = levelInfo(prog.xp).level;
  const streak = displayStreak(prog, Date.now());
  return `<div class="topbar">
    <a class="btn small" href="#${back}" aria-label="Retour">←</a>
    <a class="who" href="#/p/${pid}" style="text-decoration:none;color:inherit">${avatarHtml(p, prog, 'sm')}<span class="name">${e(title || p.name)}</span></a>
    <div class="stats">
      <span class="chip red" title="Série (streak)" id="tb-streak">🔥 ${streak}</span>
      <span class="chip gold" title="Croissants" id="tb-croissants">🥐 ${prog.croissants}</span>
      <span class="chip blue" title="Niveau (level)" id="tb-level">⭐ ${lvl}</span>
    </div>
  </div>`;
}

export function refreshTopbar(pid) {
  const prog = app.prog(pid);
  const c = document.getElementById('tb-croissants');
  if (c) c.textContent = `🥐 ${prog.croissants}`;
  const l = document.getElementById('tb-level');
  if (l) l.textContent = `⭐ ${levelInfo(prog.xp).level}`;
  const s = document.getElementById('tb-streak');
  if (s) s.textContent = `🔥 ${displayStreak(prog, Date.now())}`;
}

// Words this kid has met. If they've met fewer than `min`, top up with the next
// words in the list so games are playable from day one.
export function gamePool(prog, words, min = 6) {
  const seen = words.filter(w => prog.cards[rId(w.id)] && prog.cards[rId(w.id)].state !== 'new');
  if (seen.length >= min) return seen;
  const rest = words.filter(w => !seen.includes(w));
  return [...seen, ...rest.slice(0, min - seen.length)];
}

export const enOf = w => variants(w.en)[0];

// Three wrong answers for a multiple-choice question, preferring the same
// category (harder, so more useful) and never repeating the right answer's text.
export function distractors(word, pool, all, n = 3, key = enOf) {
  const right = key(word).toLowerCase();
  const used = new Set([right]);
  const out = [];
  const candidates = [
    ...shuffle(all.filter(w => w.cat === word.cat)),
    ...shuffle(pool),
    ...shuffle(all),
  ];
  for (const w of candidates) {
    if (out.length >= n) break;
    if (w.id === word.id) continue;
    const k = key(w).toLowerCase();
    if (used.has(k)) continue;
    used.add(k);
    out.push(w);
  }
  return out;
}
