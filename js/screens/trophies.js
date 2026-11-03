// Les Trophées: achievements, including a few secret ones.

import { app } from '../app.js';
import { topbar } from './common.js';
import { e, setView } from '../ui.js';
import { ACHIEVEMENTS } from '../data.js';

export function render({ pid }) {
  const prog = app.prog(pid);
  const got = ACHIEVEMENTS.filter(a => prog.ach[a.id]).length;
  const secretsLeft = ACHIEVEMENTS.filter(a => a.secret && !prog.ach[a.id]).length;
  setView(`
    ${topbar(pid)}
    <h1 class="screen-title">Les Trophées</h1>
    <p class="screen-sub">${got} / ${ACHIEVEMENTS.length} earned${secretsLeft ? ` · ${secretsLeft} secret trophies still hidden… 🤫` : ' · all secrets found!'}</p>
    <div class="trophies">
      ${ACHIEVEMENTS.map(a => {
        const has = prog.ach[a.id];
        if (a.secret && !has) return `<div class="trophy locked"><div class="te">❓</div><div class="tn">Secret</div><div class="td">Keep exploring…</div></div>`;
        return `<div class="trophy ${has ? 'got' : 'locked'}">
          <div class="te">${a.emoji}</div><div class="tn">${e(a.name)}</div><div class="td">${e(a.desc)}</div>
          <div class="td">${has ? `✓ ${new Date(has).toLocaleDateString('fr-FR')}` : `+${a.reward} 🥐`}</div></div>`;
      }).join('')}
    </div>`);
}
