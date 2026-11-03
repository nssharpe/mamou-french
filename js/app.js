// Shared app state: the database, saving, navigation, and the reward pipeline
// (XP → level-ups → postcards → trophies) every screen goes through.

import { loadDB, saveDB, activeWords } from './store.js';
import { setAudioSettings, sfx } from './audio.js';
import { addXp, checkAchievements, achievementContext, levelInfo, rankFor } from './progress.js';
import { TOUR } from './data.js';
import { toast, confetti, croissantRain } from './fx.js';
import { openModal } from './ui.js';
import { mascotSvg } from './art.js';
import { escapeHtml } from './util.js';
import { syncNow } from './cloud.js';

export const app = {
  db: null,
  storage: null,

  init() {
    try { this.storage = window.localStorage; this.storage.getItem('x'); }
    catch { this.storage = memoryStorage(); }
    this.db = loadDB(this.storage);
    setAudioSettings(this.db.settings);
  },

  save() {
    if (!saveDB(this.db, this.storage)) toast('Could not save!', { sub: 'Storage is full or blocked.', icon: '⚠️' });
    if (this.db.sync) scheduleSync();
  },

  // Sync with the family's cloud copy now. Re-renders calm screens when
  // something arrived from another device (never mid-session or mid-game).
  async sync() {
    if (!this.db.sync) return { ok: false };
    clearTimeout(syncTimer);
    const res = await syncNow(() => this.db, this.storage);
    if (res.ok && res.changed && !/\/(study|game\/)|^#\/duel/.test(location.hash) && !document.querySelector('#modal-root .modal-back')) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    return res;
  },

  go(path) {
    const h = '#' + path;
    if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash = h;
  },

  profile(pid) { return this.db.profiles.find(p => p.id === pid); },
  prog(pid) { return this.db.progress[pid]; },
  words() { return activeWords(this.db); },
};

// Saving schedules a sync a few seconds later, so a burst of answers is one upload.
let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => app.sync(), 4000);
}

export function startSyncLoop() {
  if (app.db.sync) setTimeout(() => app.sync(), 300);
  setInterval(() => { if (app.db.sync && document.visibilityState === 'visible') app.sync(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (app.db.sync) app.sync(); });
  window.addEventListener('online', () => { if (app.db.sync) app.sync(); });
}

function memoryStorage() {
  const m = new Map();
  toast('Private mode: progress won\'t be saved', { icon: '⚠️', ms: 6000 });
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

/**
 * Give XP (and optionally croissants) and run the celebrations. Level-ups and
 * new trophies queue up; call `celebrate(pid)` at a calm moment (e.g. the end
 * of a session) to show the big modals. Returns gained XP.
 */
const pendingCelebrations = new Map();

export function reward(pid, { xp = 0, croissants = 0, game = false, quiet = false, studied = false } = {}) {
  const prog = app.prog(pid);
  const now = Date.now();
  const res = addXp(prog, xp, now, { game });
  if (croissants) prog.croissants += croissants;
  const queue = pendingCelebrations.get(pid) || [];
  for (const level of res.levelUps) { queue.push({ type: 'level', level }); prog.croissants += 20; }
  const ach = checkAchievements(prog, achievementContext(prog, now, { studied }));
  for (const a of ach) queue.push({ type: 'ach', a });
  pendingCelebrations.set(pid, queue);
  app.save();
  if (!quiet) {
    for (const l of res.levelUps) { sfx.levelUp(); confetti(); toast(`Level ${l}!`, { sub: `Niveau ${l} !`, icon: '⭐', gold: true }); }
    for (const a of ach) { sfx.coin(); toast(`Trophy: ${a.name}`, { sub: `${a.desc} · +${a.reward} 🥐`, icon: a.emoji, gold: true, ms: 4200 }); }
  }
  return res.gained;
}

export function hasCelebrations(pid) {
  return (pendingCelebrations.get(pid) || []).length > 0;
}

// Show queued level-up modals one after another (postcard included).
export async function celebrate(pid) {
  const queue = pendingCelebrations.get(pid) || [];
  pendingCelebrations.set(pid, []);
  const levels = queue.filter(q => q.type === 'level');
  for (const { level } of levels) {
    const stop = TOUR[Math.min(level, TOUR.length) - 1];
    const rank = rankFor(level);
    const newRank = rank.level === level;
    sfx.levelUp();
    confetti({ count: 200 });
    if (level % 5 === 0) croissantRain();
    await openModal({
      body: `<div class="celebrate">
        <div style="width:120px;margin:0 auto" class="mascot bounce">${mascotSvg('wow')}</div>
        <h2>Level ${level}!</h2>
        ${newRank ? `<p><b>New title:</b> ${rank.emoji} ${escapeHtml(rank.name)}</p>` : ''}
        ${level <= TOUR.length ? `<div class="postcard postcard-big" style="margin-top:12px">
          <div class="pc-head"><span class="pc-emoji">${stop.emoji}</span><div><div class="muted">New postcard!</div><div class="pc-city">${escapeHtml(stop.city)}</div></div></div>
          <p>${escapeHtml(stop.fact)}</p></div>` : ''}
        <p class="muted">+20 🥐 bonus</p>
      </div>`,
      actions: [{ label: 'Awesome!', cls: 'primary big' }],
    });
    app.prog(pid).seenLevel = Math.max(app.prog(pid).seenLevel, level);
    app.save();
  }
}

export function currentLevel(pid) {
  return levelInfo(app.prog(pid).xp).level;
}
