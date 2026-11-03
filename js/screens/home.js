// "Qui joue ?" — pick a player.

import { app } from '../app.js';
import { addProfile } from '../store.js';
import { avatarHtml, mascotHtml, bubbleHtml, skylineSvg, setMascot, flagSvg } from '../art.js';
import { levelInfo, rankFor, displayStreak } from '../progress.js';
import { FUN_FACTS, ANIMALS } from '../data.js';
import { e, openModal, setView, greeting } from '../ui.js';
import { pick } from '../util.js';
import { sfx } from '../audio.js';

export function render() {
  const { db } = app;
  const [hello, helloEn] = greeting();
  const root = setView(`
    <div class="awning"></div>
    <h1 class="logo">Les Cartes <span class="de">de</span> <span class="mamou">Mamou</span></h1>
    <div class="tricolore-bar"><i></i><i></i><i></i></div>
    <p class="tagline">${flagSvg(13)} French flashcards · <i>Qui joue ?</i> (Who's playing?)</p>

    <div class="mascot-row" style="justify-content:center;margin-top:18px">
      ${mascotHtml({ id: 'home-mascot' })}
      ${bubbleHtml(`${hello} ! Qui joue aujourd'hui ?`, `${helloEn}! Who's playing today?`)}
    </div>

    <div class="players">
      ${db.profiles.map(p => {
        const prog = app.prog(p.id);
        const lvl = levelInfo(prog.xp).level;
        const rank = rankFor(lvl);
        const streak = displayStreak(prog, Date.now());
        return `<button class="panel player-card" data-pid="${e(p.id)}">
          ${avatarHtml(p, prog, 'lg')}
          <div class="pname">${e(p.name)}</div>
          <div class="prank">${rank.emoji} ${e(rank.name)}</div>
          <div class="row"><span class="chip blue">⭐ Niv. ${lvl}</span><span class="chip red">🔥 ${streak}</span></div>
        </button>`;
      }).join('')}
      <button class="panel player-card add-player" id="add-player">
        <span class="plus">＋</span><span>Nouveau joueur<br><small>(new player)</small></span>
      </button>
    </div>

    <div class="home-actions">
      ${db.profiles.length >= 2 ? '<a class="btn red big" href="#/duel">⚔️ Le Duel</a>' : ''}
      <a class="btn big" href="#/grown-ups">⚙️ Coin des grands</a>
    </div>

    <div class="panel factbox" style="margin-top:24px"><b>Le saviez-vous ?</b> (Did you know?) ${e(pick(FUN_FACTS))}</div>
    ${skylineSvg()}
    <footer class="foot">Fait avec amour pour Mamou et ses élèves ❤️</footer>
  `);

  root.querySelectorAll('[data-pid]').forEach(b => b.addEventListener('click', () => {
    sfx.tap();
    app.go(`/p/${b.dataset.pid}`);
  }));
  root.querySelector('#add-player').addEventListener('click', () => newPlayer());

  const m = root.querySelector('#home-mascot');
  m.addEventListener('click', () => { sfx.tap(); setMascot(m, 'wink', 'wobble'); });
}

export async function newPlayer() {
  let animal = pick(ANIMALS);
  let name = '';
  const res = await openModal({
    title: 'Nouveau joueur',
    body: `<div class="field"><label for="np-name">Name</label><input class="input" id="np-name" maxlength="20" autocomplete="off" placeholder="Prénom"></div>
      <div class="field"><span class="lbl">Choose your animal</span><div class="animal-grid">${ANIMALS.map(a => `<button type="button" data-a="${a}" class="${a === animal ? 'on' : ''}">${a}</button>`).join('')}</div></div>`,
    actions: [{ label: 'Annuler', cls: 'ghost', value: null }, { label: 'Créer', cls: 'primary', value: 'ok' }],
    onOpen(el, close) {
      el.querySelector('.animal-grid').addEventListener('click', ev => {
        const b = ev.target.closest('[data-a]'); if (!b) return;
        animal = b.dataset.a;
        el.querySelectorAll('.animal-grid button').forEach(x => x.classList.toggle('on', x === b));
      });
      const input = el.querySelector('#np-name');
      input.addEventListener('input', () => { name = input.value; });
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter') close('ok'); });
    },
  });
  if (res !== 'ok') return;
  if (!name.trim()) return;
  const p = addProfile(app.db, name, animal);
  app.prog(p.id).onboarded = true;
  app.save();
  app.go(`/p/${p.id}`);
}
