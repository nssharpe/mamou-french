// Le Tour de France: every level is a new stop on a map of France, with a
// postcard and a fun fact.

import { app } from '../app.js';
import { topbar } from './common.js';
import { e, setView, openModal } from '../ui.js';
import { TOUR, FRANCE_OUTLINE, projectFrance } from '../data.js';
import { levelInfo } from '../progress.js';
import { avatarHtml } from '../art.js';
import { speak } from '../audio.js';

function postcardModal(stop, i) {
  speak(stop.city);
  return openModal({
    body: `<div class="postcard postcard-big" style="transform:none;box-shadow:none;border:0;padding:0">
      <div class="pc-head"><span class="pc-emoji">${stop.emoji}</span><div><div class="muted">Stop ${i + 1} · Level ${i + 1}</div><div class="pc-city">${e(stop.city)}</div></div></div>
      <p style="font-size:1.08rem">${e(stop.fact)}</p>
      <p class="muted" style="font-size:.9rem">Bons baisers de ${e(stop.city)} ! (Greetings from ${e(stop.city)}!)</p></div>`,
    actions: [{ label: 'Close', cls: 'primary' }],
  });
}

export function render({ pid }) {
  const p = app.profile(pid), prog = app.prog(pid);
  const lv = levelInfo(prog.xp);
  const at = Math.min(lv.level, TOUR.length) - 1;
  const outline = FRANCE_OUTLINE.map(([la, lo]) => projectFrance(la, lo).join(',')).join(' ');
  const pts = TOUR.map(s => projectFrance(s.lat, s.lon));
  const done = pts.slice(0, at + 1).map(xy => xy.join(',')).join(' ');
  const all = pts.map(xy => xy.join(',')).join(' ');
  const [hx, hy] = pts[at];
  const heightVb = 96;
  const corsica = projectFrance(42.15, 9.1);

  const root = setView(`
    ${topbar(pid)}
    <h1 class="screen-title">Le Tour de France</h1>
    <p class="screen-sub">Each level takes you to a new place. ${lv.level >= TOUR.length ? 'You finished the whole Tour — champion! 🏆' : `You're in <b>${e(TOUR[at].city)}</b>. Next stop: <b>${e(TOUR[at + 1].city)}</b> at level ${at + 2} (${lv.need - lv.into} XP to go).`}</p>
    <div class="panel map-wrap" style="padding:10px">
      <svg class="map-svg" viewBox="-4 -2 108 ${heightVb}" role="img" aria-label="Map of France">
        <polygon class="land" points="${outline}"/>
        <ellipse class="land" cx="${corsica[0]}" cy="${corsica[1]}" rx="2" ry="4.2"/>
        <polyline class="route" points="${all}"/>
        <polyline class="route-done" points="${done}"/>
        ${pts.map(([x, y], i) => `<g class="stop ${i === at ? 'here' : i < at ? 'on' : 'off'}" data-i="${i}">
          <circle cx="${x}" cy="${y}" r="${i === at ? 1.9 : 1.3}"/>
          <title>${i <= at ? e(TOUR[i].city) : `Level ${i + 1}`}</title>
          ${i === at || i === at + 1 ? `<text x="${x + 2}" y="${y + 0.8}">${e(TOUR[i].city)}</text>` : ''}
        </g>`).join('')}
        <foreignObject x="${hx - 4.5}" y="${hy - 11}" width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml" style="transform:scale(.08);transform-origin:0 0;width:110px;height:110px;padding:7px">${avatarHtml(p, prog, 'lg')}</div></foreignObject>
      </svg>
    </div>
    <h2 style="margin-top:22px">My postcards (${at + 1}/${TOUR.length})</h2>
    <div class="postcards">
      ${TOUR.map((s, i) => i <= at ? `
        <button class="postcard" data-i="${i}"><span class="stamp">${s.emoji}</span><div class="pc-city">${e(s.city)}</div><div class="pc-level">Level ${i + 1}</div><p style="margin:6px 0 0;font-size:.9rem">${e(s.fact.slice(0, 70))}…</p></button>` : `
        <div class="postcard locked"><span class="stamp">🔒</span><div class="pc-city">???</div><div class="pc-level">Level ${i + 1}</div></div>`).join('')}
    </div>`);

  root.addEventListener('click', ev => {
    const b = ev.target.closest('[data-i]'); if (!b) return;
    const i = +b.dataset.i;
    if (i <= at) postcardModal(TOUR[i], i);
  });
}
