// Les Paires: classic memory. Six pairs — each French word with its picture + English.

import { e, genderClass } from '../ui.js';
import { shuffle } from '../util.js';
import { speak, sfx } from '../audio.js';
import { confetti, floatText } from '../fx.js';
import { mascotSvg } from '../art.js';
import { enOf } from '../screens/common.js';
import { gameOver, resultPanel } from '../screens/games.js';
import { app } from '../app.js';
import { variants } from '../answer.js';

export function start(el, { pid, prog, pool, replay }) {
  const pairs = shuffle(pool).slice(0, 6);
  const tiles = shuffle(pairs.flatMap(w => [{ w, side: 'fr' }, { w, side: 'en' }]));
  let open = [], matched = 0, moves = 0, t0 = null, timer = null, busy = false;

  el.innerHTML = `
    <div class="row between"><span class="muted">Find the pairs! Tap two cards.</span>
      <span><span class="chip">🔁 <span id="moves">0</span></span> <span class="chip">⏱️ <span id="time">0</span>s</span></span></div>
    <div class="memory">${tiles.map((t, i) => `
      <button class="mem" data-i="${i}" aria-label="carte ${i + 1}"><div class="in">
        <div class="f"><span>🥐</span></div>
        <div class="b">${t.side === 'fr'
          ? `<span class="${genderClass(t.w)}">${e(variants(t.w.fr)[0])}</span>`
          : `<span class="me">${e(t.w.emoji || '❔')}</span><span style="font-weight:500;font-size:.85em">${e(enOf(t.w))}</span>`}</div>
      </div></button>`).join('')}</div>
    <div id="result"></div>`;

  const btns = [...el.querySelectorAll('.mem')];
  const secs = () => (t0 ? Math.round((Date.now() - t0) / 1000) : 0);

  el.querySelector('.memory').addEventListener('click', ev => {
    const b = ev.target.closest('.mem'); if (!b || busy) return;
    const i = +b.dataset.i;
    if (b.classList.contains('up') || b.classList.contains('done')) return;
    if (!t0) { t0 = Date.now(); timer = setInterval(() => { el.querySelector('#time').textContent = secs(); }, 500); }
    sfx.flip();
    b.classList.add('up');
    open.push(i);
    if (tiles[i].side === 'fr') speak(tiles[i].w.fr);
    if (open.length < 2) return;
    moves++;
    el.querySelector('#moves').textContent = moves;
    const [a, c] = open;
    open = [];
    if (tiles[a].w.id === tiles[c].w.id) {
      matched++;
      setTimeout(() => {
        [a, c].forEach(k => { btns[k].classList.remove('up'); btns[k].classList.add('done'); });
        sfx.correct(matched);
        floatText('Bravo !', btns[c]);
        if (tiles[a].side !== 'fr') speak(tiles[a].w.fr);
        if (matched === pairs.length) win();
      }, 350);
    } else {
      busy = true;
      setTimeout(() => {
        btns[a].classList.remove('up'); btns[c].classList.remove('up');
        busy = false;
      }, 950);
    }
  });

  function win() {
    clearInterval(timer);
    const time = secs();
    const s = prog.stats;
    const record = s.memoryBest === null || time < s.memoryBest;
    if (record) s.memoryBest = time;
    confetti();
    sfx.fanfare();
    const xp = 30 + Math.max(0, 60 - time) + Math.max(0, 20 - (moves - 6) * 2);
    const croissants = 3 + (time < 45 ? 2 : 0) + (record ? 2 : 0);
    const rewardHtml = gameOver(pid, 'memory', { xp, croissants, correct: pairs.length });
    app.save();
    el.querySelector('#result').innerHTML = resultPanel(pid, 'memory', {
      title: record ? 'Nouveau record !' : 'Toutes les paires !',
      lines: [`⏱️ <b>${time}s</b> · 🔁 <b>${moves}</b> coups (moves)`, s.memoryBest !== null ? `Record : ${s.memoryBest}s` : ''],
      rewardHtml, mood: record ? 'cool' : 'happy',
    }, mascotSvg);
    el.querySelector('[data-replay]').addEventListener('click', replay);
    el.querySelector('#result').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return () => clearInterval(timer);
}
