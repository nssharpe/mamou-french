// Le Duel: two kids, one screen. Same question on both sides — first right
// answer wins the point; a wrong answer locks you out for that round.
// On a laptop: player 1 uses A S D F, player 2 uses H J K L.
// "Face à face" mode flips player 1's side for a tablet lying flat between them.

import { app, reward, celebrate } from '../app.js';
import { avatarHtml, mascotSvg } from '../art.js';
import { gamePool, distractors, enOf } from './common.js';
import { capGameCroissants } from '../progress.js';
import { e, setView, genderClass, isModalOpen } from '../ui.js';
import { shuffle, pick } from '../util.js';
import { speak, sfx } from '../audio.js';
import { confetti, croissantRain } from '../fx.js';

const TARGET = 7;
const KEYS = [['a', 's', 'd', 'f'], ['h', 'j', 'k', 'l']];

export function render() {
  const ps = app.db.profiles;
  if (ps.length < 2) { app.go('/'); return; }
  let a = ps[0].id, b = ps[1].id;
  const face = matchMedia('(orientation: portrait) and (min-width: 600px)').matches;
  const root = setView(`
    <div class="topbar"><a class="btn small" href="#/">←</a><b>Le Duel</b></div>
    <h1 class="screen-title center">⚔️ Le Duel ⚔️</h1>
    <p class="screen-sub center">First to ${TARGET} points wins. A wrong answer locks you out for the round!</p>
    <div class="panel">
      <div class="grid2">
        <div class="field"><label for="d1">Joueur 1 <span class="chip blue">bleu</span></label><select class="input" id="d1">${ps.map(p => `<option value="${e(p.id)}" ${p.id === a ? 'selected' : ''}>${e(p.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="d2">Joueur 2 <span class="chip red">rouge</span></label><select class="input" id="d2">${ps.map(p => `<option value="${e(p.id)}" ${p.id === b ? 'selected' : ''}>${e(p.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><span class="lbl">Layout</span>
        <select class="input" id="dl">
          <option value="side" ${face ? '' : 'selected'}>Side by side (laptop: keys A S D F vs H J K L)</option>
          <option value="face" ${face ? 'selected' : ''}>Face à face (tablet flat on the table)</option>
        </select></div>
      <button class="btn red big block" id="go">En garde ! ⚔️</button>
    </div>`);
  root.querySelector('#go').addEventListener('click', () => {
    a = root.querySelector('#d1').value; b = root.querySelector('#d2').value;
    if (a === b) { root.querySelector('#d2').focus(); return; }
    duel(a, b, root.querySelector('#dl').value === 'face');
  });
}

let cleanupDuel = null;

function duel(aId, bId, face) {
  const players = [aId, bId].map(id => ({ id, p: app.profile(id), prog: app.prog(id), score: 0, locked: false }));
  const words = app.words();
  const poolIds = new Set([...gamePool(players[0].prog, words, 8), ...gamePool(players[1].prog, words, 8)].map(w => w.id));
  const pool = words.filter(w => poolIds.has(w.id));
  let q = null, roundOver = false, lastId = null, over = false;

  const root = setView(`
    <div class="topbar"><a class="btn small" href="#/duel">✕</a><b>Le Duel</b><span class="muted" style="margin-left:auto">First to ${TARGET}</span></div>
    <div class="duel ${face ? 'face' : ''}">
      ${players.map((pl, i) => `
        <div class="side p${i + 1}" id="side${i}">
          <div class="dhead">${avatarHtml(pl.p, pl.prog, 'md')}<span>${e(pl.p.name)}</span><span class="score" id="sc${i}">0</span></div>
          <div class="q" id="q${i}"></div>
          <div class="options" id="o${i}"></div>
        </div>`).join('')}
    </div>`, { wide: true });

  function ask() {
    roundOver = false;
    players.forEach((pl, i) => { pl.locked = false; root.querySelector(`#side${i}`).classList.remove('locked', 'won-round'); });
    let w;
    do { w = pick(pool); } while (pool.length > 1 && w.id === lastId);
    lastId = w.id;
    const toFr = Math.random() < 0.4;
    const key = toFr ? (x => x.fr) : enOf;
    const opts = shuffle([w, ...distractors(w, pool, words, 3, key)]);
    q = { w, opts, toFr };
    players.forEach((pl, i) => {
      root.querySelector(`#q${i}`).innerHTML = toFr
        ? `${e(w.emoji || '')} ${e(enOf(w))} <div class="muted" style="font-size:.9rem;font-weight:500">en français ?</div>`
        : `<span class="${genderClass(w)}">${e(w.fr)}</span> <div class="muted" style="font-size:.9rem;font-weight:500">in English?</div>`;
      root.querySelector(`#o${i}`).innerHTML = opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="key">${KEYS[i][k].toUpperCase()}</span>${toFr ? `<span class="${genderClass(o)}">${e(o.fr)}</span>` : `<span class="oe">${e(o.emoji || '')}</span>${e(enOf(o))}`}</button>`).join('');
    });
    if (!toFr) speak(w.fr);
  }

  function choose(i, k) {
    const pl = players[i];
    if (roundOver || pl.locked || over) return;
    const o = q.opts[k];
    const btn = root.querySelectorAll(`#o${i} .opt`)[k];
    if (o.id === q.w.id) {
      roundOver = true;
      pl.score++;
      sfx.correct(pl.score);
      btn.classList.add('right');
      root.querySelector(`#side${i}`).classList.add('won-round');
      root.querySelector(`#sc${i}`).textContent = pl.score;
      // Show the right answer on the other side too.
      const j = 1 - i;
      const right = q.opts.findIndex(x => x.id === q.w.id);
      root.querySelectorAll(`#o${j} .opt`)[right]?.classList.add('right');
      if (q.toFr) speak(q.w.fr);
      if (pl.score >= TARGET) setTimeout(() => finish(i), 700);
      else setTimeout(ask, 1300);
    } else {
      pl.locked = true;
      sfx.wrong();
      btn.classList.add('wrong');
      root.querySelector(`#side${i}`).classList.add('locked');
      if (players.every(p => p.locked)) {
        roundOver = true;
        const right = q.opts.findIndex(x => x.id === q.w.id);
        players.forEach((_, s) => root.querySelectorAll(`#o${s} .opt`)[right]?.classList.add('right'));
        speak(q.w.fr);
        setTimeout(ask, 1600);
      }
    }
  }

  players.forEach((_, i) => root.querySelector(`#o${i}`).addEventListener('click', ev => {
    const b = ev.target.closest('.opt'); if (b) choose(i, +b.dataset.k);
  }));
  const onKey = ev => {
    if (isModalOpen()) return;
    const k = ev.key.toLowerCase();
    KEYS.forEach((ks, i) => { const idx = ks.indexOf(k); if (idx >= 0) choose(i, idx); });
  };
  document.addEventListener('keydown', onKey);
  if (cleanupDuel) cleanupDuel();
  cleanupDuel = () => document.removeEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => { cleanupDuel && cleanupDuel(); cleanupDuel = null; }, { once: true });

  async function finish(winner) {
    over = true;
    cleanupDuel && cleanupDuel();
    const w = players[winner], l = players[1 - winner];
    w.prog.stats.duelWins++;
    sfx.fanfare(); confetti({ count: 240 }); croissantRain();
    const cw = capGameCroissants(w.prog, Date.now(), 6), cl = capGameCroissants(l.prog, Date.now(), 2);
    const gw = reward(w.id, { xp: 15 + w.score * 3, croissants: cw, game: true });
    const gl = reward(l.id, { xp: 5 + l.score * 3, croissants: cl, game: true });
    setView(`
      <div class="summary" style="margin-top:20px">
        <div class="mascot lg bounce" style="margin:0 auto">${mascotSvg('cool')}</div>
        <h1 class="screen-title">Victoire de ${e(w.p.name)} !</h1>
        <p class="muted">${e(w.p.name)} wins ${w.score}–${l.score}. Bien joué, tous les deux ! (Well played, both of you!)</p>
        <div class="podium">
          <div class="spot p2">${avatarHtml(l.p, l.prog, 'lg')}<div><b>${e(l.p.name)}</b></div><div class="block">${l.score}</div><div class="muted">+${gl} XP · +${cl} 🥐</div></div>
          <div class="spot p1">${avatarHtml(w.p, w.prog, 'xl')}<div><b>👑 ${e(w.p.name)}</b></div><div class="block">${w.score}</div><div class="muted">+${gw} XP · +${cw} 🥐</div></div>
        </div>
        <div class="row" style="justify-content:center;margin-top:20px">
          <a class="btn big" href="#/">🏠 Accueil</a>
          <button class="btn red big" id="again">⚔️ Revanche !</button>
        </div>
      </div>`);
    document.getElementById('again').addEventListener('click', () => duel(aId, bId, face));
    await celebrate(w.id);
    await celebrate(l.id);
  }

  ask();
}
