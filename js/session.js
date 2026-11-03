// Which cards to study today, and the order to show them in a session.

import { newCard } from './srs.js';
import { MIN, dayKey, dayStart, dayStartPlus, shuffle } from './util.js';

// Like Anki's "learn ahead limit": with nothing else left, a learning card due
// within this window is shown early instead of ending the session.
export const MIN_LEARN_AHEAD = 20 * MIN;

export const rId = wordId => `${wordId}:r`;
export const pId = wordId => `${wordId}:p`;
export const wordIdOf = cardId => cardId.slice(0, cardId.lastIndexOf(':'));
export const dirOf = cardId => cardId.slice(cardId.lastIndexOf(':') + 1);

export function today(prog, now) {
  const k = dayKey(now);
  if (!prog.days[k]) prog.days[k] = { rev: 0, ok: 0, xp: 0, gameXp: 0, newR: 0, newP: 0, extra: 0, pts: 0, goal: false };
  return prog.days[k];
}

export function peekToday(prog, now) {
  return prog.days[dayKey(now)] || { rev: 0, ok: 0, xp: 0, gameXp: 0, newR: 0, newP: 0, extra: 0, pts: 0, goal: false };
}

/**
 * Snapshot of today's study state for one kid.
 *   due:      ids of cards to review now (learning first, then reviews by due date)
 *   later:    learning cards that come back later today
 *   newR/newP: ids of new cards allowed today (recognize / produce)
 *   moreNew:  how many more brand-new words exist beyond today's allowance
 */
export function todayPlan(prog, words, now) {
  const d = peekToday(prog, now);
  const limit = (prog.prefs.newPerDay || 0) + (d.extra || 0);
  const start = dayStart(now);
  const learning = [], reviews = [], later = [];
  const newR = [], newP = [];
  let moreNew = 0;

  for (const w of words) {
    for (const id of [rId(w.id), pId(w.id)]) {
      const c = prog.cards[id];
      if (!c || c.state === 'new') continue;
      if (c.due <= now) (c.state === 'review' ? reviews : learning).push(id);
      else if (c.state !== 'review' && c.due < dayStartPlus(now, 1)) later.push(id);
    }
    const r = prog.cards[rId(w.id)];
    if (!r || r.state === 'new') {
      if (newR.length < limit - d.newR) newR.push(rId(w.id)); else moreNew++;
    } else if (r.state === 'review' && r.last < start) {
      // English → French unlocks once the word has graduated, and never on the
      // same day the French → English card was studied (Anki "sibling burying").
      const p = prog.cards[pId(w.id)];
      if ((!p || p.state === 'new') && newP.length < limit - d.newP) newP.push(pId(w.id));
    }
  }
  const byDue = (a, b) => prog.cards[a].due - prog.cards[b].due;
  learning.sort(byDue);
  reviews.sort(byDue);
  return { due: [...learning, ...reviews], later, newR, newP, moreNew, limit };
}

// Interleave new cards among reviews (roughly one new card every 3 reviews) so a
// session doesn't start with a wall of unknown words.
export function buildQueue(plan, rng = Math.random) {
  const due = plan.due.slice();
  const fresh = [...plan.newP, ...plan.newR];
  const out = [];
  const gap = fresh.length ? Math.max(1, Math.floor(due.length / (fresh.length + 1))) : 0;
  let i = 0;
  while (due.length || fresh.length) {
    if (fresh.length && (i % (gap + 1) === gap || !due.length)) out.push(fresh.shift());
    else out.push(due.shift());
    i++;
  }
  // Light shuffle inside windows of 4 keeps order mostly by priority but not predictable.
  const res = [];
  for (let k = 0; k < out.length; k += 4) res.push(...shuffle(out.slice(k, k + 4), rng));
  return res;
}

/**
 * Runs one study session. Cards still in learning steps (due within the
 * learn-ahead window) come back in the same session, like Anki.
 */
export class Session {
  constructor(queue) {
    this.pending = queue.slice();
    this.learning = new Map(); // id -> due
    this.lastId = null;
    this.total = queue.length;
    this.seen = new Set();
  }

  next(now) {
    const avoid = id => id === this.lastId && (this.pending.length + this.learning.size) > 1;
    const ready = [...this.learning].filter(([id, due]) => due <= now && !avoid(id)).sort((a, b) => a[1] - b[1]);
    let id = null;
    if (ready.length) id = ready[0][0];
    else if (this.pending.length) {
      const k = this.pending.findIndex(x => !avoid(x));
      id = this.pending.splice(k < 0 ? 0 : k, 1)[0];
    } else if (this.learning.size) {
      const ahead = [...this.learning].filter(([x, due]) => due <= now + MIN_LEARN_AHEAD).sort((a, b) => {
        if (avoid(a[0]) !== avoid(b[0])) return avoid(a[0]) ? 1 : -1;
        return a[1] - b[1];
      });
      if (ahead.length) id = ahead[0][0];
    }
    if (id) { this.learning.delete(id); this.lastId = id; this.seen.add(id); }
    return id;
  }

  // Call after grading with the card's new state.
  answered(id, card, now) {
    if ((card.state === 'learning' || card.state === 'relearning') && card.due <= now + MIN_LEARN_AHEAD) {
      this.learning.set(id, card.due);
    }
  }

  get remaining() {
    return this.pending.length + this.learning.size;
  }
}

export { newCard };
