// Les Jeux: extra practice games. They give XP (capped per day) and croissants,
// and count half a point per right answer toward the daily goal. They don't
// change the flashcard schedule.

import { app, reward, celebrate } from '../app.js';
import { topbar, gamePool } from './common.js';
import { e, setView } from '../ui.js';
import { today } from '../session.js';
import { updateGoal, GAME_XP_DAILY_CAP, capGameCroissants } from '../progress.js';
import { toast, confetti } from '../fx.js';
import { sfx } from '../audio.js';

export const GAMES = {
  memory: { name: 'Les Paires', en: 'Memory', icon: '🃏', color: '#E6F0FF', desc: 'Match each French word with its picture.', load: () => import('../games/memory.js') },
  speed: { name: 'Course Rapide', en: 'Speed round', icon: '⏱️', color: '#FDE6E8', desc: '60 seconds. How many can you get?', load: () => import('../games/speed.js') },
  escargot: { name: 'Sauve l\'escargot', en: 'Save the snail', icon: '🐌', color: '#E5F6EC', desc: 'Guess the word letter by letter before the chef gets the snail!', load: () => import('../games/escargot.js') },
};

export function render({ pid }) {
  const prog = app.prog(pid);
  const d = today(prog, Date.now());
  const capLeft = Math.max(0, GAME_XP_DAILY_CAP - d.gameXp);
  const s = prog.stats;
  const best = {
    memory: s.memoryBest !== null ? `Record : ${s.memoryBest}s` : 'Pas encore de record',
    speed: s.speedBest ? `Record : ${s.speedBest}` : 'Pas encore de record',
    escargot: `${s.penduWins} escargot${s.penduWins === 1 ? '' : 's'} sauvé${s.penduWins === 1 ? '' : 's'}`,
  };
  const root = setView(`
    ${topbar(pid)}
    <h1 class="screen-title">Les Jeux</h1>
    <p class="screen-sub">Games with the words you've met. ${capLeft ? `Up to ${capLeft} more game XP today.` : 'Game XP is maxed for today — play for fun and croissants!'}</p>
    <div class="games">
      ${Object.entries(GAMES).map(([k, g]) => `
        <a class="panel game-card" href="#/p/${pid}/game/${k}" style="text-decoration:none">
          <span class="gi" style="background:${g.color}">${g.icon}</span>
          <span><div class="gn">${e(g.name)}</div><div class="gd">${e(g.en)} · ${e(g.desc)}</div><div class="gb">🏅 ${e(best[k])}</div></span>
        </a>`).join('')}
      ${app.db.profiles.length >= 2 ? `
        <a class="panel game-card" href="#/duel" style="text-decoration:none">
          <span class="gi" style="background:#FFF4C9">⚔️</span>
          <span><div class="gn">Le Duel</div><div class="gd">Two players, one screen. First to 7 wins!</div><div class="gb">🏅 ${s.duelWins} victoire${s.duelWins === 1 ? '' : 's'}</div></span>
        </a>` : ''}
    </div>`);
  void root;
}

export async function play({ pid, arg }) {
  const g = GAMES[arg];
  if (!g) { app.go(`/p/${pid}/games`); return; }
  const mod = await g.load();
  const prog = app.prog(pid);
  const pool = gamePool(prog, app.words(), 8);
  if (pool.length < 4) {
    setView(`${topbar(pid, { back: `/p/${pid}/games` })}<div class="panel" style="margin-top:20px"><h2>Pas assez de mots</h2><p>Add at least 4 words in the grown-ups' corner to play.</p></div>`);
    return;
  }
  const root = setView(`${topbar(pid, { back: `/p/${pid}/games` })}<h1 class="screen-title">${g.icon} ${e(g.name)}</h1><div id="game"></div>`);
  return mod.start(root.querySelector('#game'), {
    pid, prog, pool, words: app.words(),
    finish: result => gameOver(pid, arg, result),
    replay: () => app.go(`/p/${pid}/game/${arg}`),
  });
}

/**
 * Hand out game rewards. result: { xp, croissants, correct, title, lines: [..], win }
 * Returns HTML for the result panel's reward line.
 */
export function gameOver(pid, key, { xp = 0, croissants = 0, correct = 0 }) {
  const prog = app.prog(pid);
  prog.stats.games++;
  const d = today(prog, Date.now());
  d.pts += correct * 0.5;
  const goal = updateGoal(prog, Date.now());
  if (goal.justMet) {
    prog.croissants += 10;
    setTimeout(() => { sfx.fanfare(); confetti(); toast('Objectif du jour atteint !', { sub: `Streak ${goal.streak} 🔥 · +10 🥐`, icon: '🎯', gold: true }); }, 600);
  }
  croissants = capGameCroissants(prog, Date.now(), croissants);
  const gained = reward(pid, { xp, croissants, game: true });
  setTimeout(() => celebrate(pid), 900);
  return `<div class="row" style="justify-content:center;margin:10px 0"><span class="chip blue">+${gained} XP</span><span class="chip gold">+${croissants} 🥐</span></div>`;
}

export function resultPanel(pid, key, { title, lines = [], rewardHtml, mood = 'happy' }, mascotSvg) {
  return `<div class="panel center" style="margin-top:16px">
    <div class="mascot bounce" style="margin:0 auto">${mascotSvg(mood)}</div>
    <h2 style="font-family:var(--font-script);font-weight:400;font-size:2rem;margin:6px 0">${e(title)}</h2>
    ${lines.map(l => `<p style="margin:4px 0">${l}</p>`).join('')}
    ${rewardHtml}
    <div class="row" style="justify-content:center;margin-top:10px">
      <a class="btn" href="#/p/${pid}/games">← Jeux</a>
      <button class="btn primary" data-replay>🔁 Rejouer</button>
    </div>
  </div>`;
}
