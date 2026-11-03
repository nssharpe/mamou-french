// La Boutique: spend croissants on avatar gear, backgrounds, card styles and streak freezes.

import { app, reward } from '../app.js';
import { topbar, refreshTopbar } from './common.js';
import { e, setView, confirmModal } from '../ui.js';
import { SHOP, SLOT_NAMES } from '../data.js';
import { canBuy, buy, equip } from '../progress.js';
import { avatarHtml, itemArt, mascotSvg } from '../art.js';
import { sfx } from '../audio.js';
import { confetti, toast } from '../fx.js';

let tab = 'hat';

export function render({ pid }) {
  const p = app.profile(pid), prog = app.prog(pid);

  const preview = item => {
    if (item.slot === 'bg') return `<div class="swatch" style="background:${item.bg}"></div>`;
    if (item.slot === 'card') return `<div class="flash ${item.cls}" style="padding:6px 10px;margin:0;box-shadow:none;animation:none;font-size:1rem;font-weight:700">Bonjour</div>`;
    return `<div class="preview">${itemArt(item)}</div>`;
  };

  function draw() {
    const items = SHOP.filter(i => i.slot === tab);
    root.innerHTML = `
      ${topbar(pid)}
      <h1 class="screen-title">La Boutique</h1>
      <div class="panel shop-hero">
        ${avatarHtml(p, prog, 'xl')}
        <div>
          <div style="font-size:1.6rem;font-weight:700">🥐 ${prog.croissants}</div>
          <div class="muted">croissants to spend</div>
          <div class="mascot-row" style="margin-top:6px"><div class="mascot sm">${mascotSvg('wink')}</div><div class="bubble" style="margin-bottom:12px">Bienvenue à la boutique !<span class="en">Welcome to the shop! Tap to try things on.</span></div></div>
        </div>
      </div>
      <div class="tabs">${Object.entries(SLOT_NAMES).map(([k, n]) => `<button class="btn small ${k === tab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="items">
        ${items.map(item => {
          const owned = prog.owned.includes(item.id);
          const on = prog.equip[item.slot] === item.id;
          const c = canBuy(prog, item);
          let btn;
          if (item.slot === 'freeze') btn = `<button class="btn small gold" data-buy="${item.id}" ${c.ok ? '' : 'disabled'}>${c.why === 'Max 2' ? 'Max 2 🧊' : `🥐 ${item.price}`}</button><div class="muted" style="font-size:.8rem">You have ${prog.streak.freezes}/2</div>`;
          else if (on) btn = `<button class="btn small green" data-equip="${item.id}">✓ Porté</button>`;
          else if (owned) btn = `<button class="btn small" data-equip="${item.id}">Porter</button>`;
          else if (c.why && c.why.startsWith('Level')) btn = `<button class="btn small" disabled>🔒 Niveau ${item.min}</button>`;
          else btn = `<button class="btn small gold" data-buy="${item.id}" ${c.ok ? '' : 'disabled'}>🥐 ${item.price}</button>`;
          return `<div class="item ${on ? 'equipped' : ''}">${preview(item)}<div class="iname">${e(item.name)}</div>${item.desc ? `<div class="muted" style="font-size:.8rem">${e(item.desc)}</div>` : ''}${btn}</div>`;
        }).join('')}
      </div>`;
  }

  const root = setView('');
  draw();

  root.addEventListener('click', async ev => {
    const t = ev.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; sfx.tap(); draw(); return; }
    const b = ev.target.closest('[data-buy]');
    if (b) {
      const item = SHOP.find(i => i.id === b.dataset.buy);
      if (!(await confirmModal(`Acheter ${item.name} ?`, `This costs 🥐 ${item.price}. You have 🥐 ${prog.croissants}.`, { yes: 'Acheter !', no: 'Non merci' }))) return;
      if (buy(prog, item.id)) {
        sfx.coin(); confetti({ count: 60, y: 0.3 });
        toast(`${item.name} !`, { sub: 'Nouvel achat (new purchase)', icon: '🛍️' });
        reward(pid, {});
        app.save();
        draw();
        refreshTopbar(pid);
      }
      return;
    }
    const q = ev.target.closest('[data-equip]');
    if (q) { equip(prog, q.dataset.equip); sfx.tap(); app.save(); draw(); }
  });
}
