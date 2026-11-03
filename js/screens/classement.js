// Le Classement: this week's XP for everyone on this device.

import { app } from '../app.js';
import { topbar } from './common.js';
import { e, setView } from '../ui.js';
import { weekXp, levelInfo, displayStreak } from '../progress.js';
import { avatarHtml } from '../art.js';

export function render({ pid }) {
  const now = Date.now();
  const rows = app.db.profiles.map(p => {
    const prog = app.prog(p.id);
    return { p, prog, week: weekXp(prog, now), level: levelInfo(prog.xp).level, streak: displayStreak(prog, now), words: prog.stats.wordsLearned, xp: prog.xp };
  }).sort((a, b) => b.week - a.week || b.xp - a.xp);
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  setView(`
    ${topbar(pid)}
    <h1 class="screen-title">Le Classement</h1>
    <p class="screen-sub">XP earned this week (Monday to Sunday). Everyone starts fresh on Monday!</p>
    <div class="podium">
      ${order.map(r => {
        const place = rows.indexOf(r) + 1;
        return `<div class="spot p${place}">${avatarHtml(r.p, r.prog, place === 1 ? 'xl' : 'lg')}<div><b>${place === 1 ? '👑 ' : ''}${e(r.p.name)}</b></div><div class="muted">${r.week} XP</div><div class="block">${place}</div></div>`;
      }).join('')}
    </div>
    <div class="panel" style="margin-top:0;border-radius:0 0 var(--radius) var(--radius)">
      <table class="lb-table">
        <tr><th>#</th><th>Joueur</th><th class="num">Semaine</th><th class="num">Niveau</th><th class="num">🔥</th><th class="num">Mots</th></tr>
        ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${e(r.p.name)}</td><td class="num">${r.week}</td><td class="num">${r.level}</td><td class="num">${r.streak}</td><td class="num">${r.words}</td></tr>`).join('')}
      </table>
    </div>`);
}
