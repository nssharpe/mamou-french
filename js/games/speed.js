// Course Rapide: 60 seconds of quick multiple choice. Wrong answers cost 3 seconds.

import { e, genderClass, isModalOpen } from '../ui.js';
import { shuffle, pick } from '../util.js';
import { speak, sfx } from '../audio.js';
import { confetti, floatText } from '../fx.js';
import { mascotSvg } from '../art.js';
import { enOf, distractors } from '../screens/common.js';
import { gameOver, resultPanel } from '../screens/games.js';
import { app } from '../app.js';
import { variants } from '../answer.js';

const DURATION = 60;

export function start(el, { pid, prog, pool, words, replay }) {
  let score = 0, combo = 0, best = 0, ends = 0, timer = null, q = null, running = false, lastId = null;

  el.innerHTML = `
    <div class="panel center" id="intro">
      <p style="font-size:1.1rem">Answer as many as you can in <b>${DURATION} seconds</b>.<br>Wrong answers cost <b>3 seconds</b>. Combos look cool. 🔥</p>
      <p class="muted">Keys 1–4 work too.</p>
      <button class="btn red big" id="go">Prêts ? Partez ! (Ready? Go!)</button>
    </div>
    <div id="play" hidden>
      <div class="row between"><span class="timer-big" id="t">${DURATION}</span><span class="chip blue" style="font-size:1.1rem">⭐ <span id="score">0</span></span><span class="combo" id="combo"></span></div>
      <div class="progress" style="margin:8px 0"><div id="tbar" style="width:100%;background:var(--rouge)"></div></div>
      <div class="flash" id="q" style="padding:18px"></div>
      <div class="options" id="opts"></div>
    </div>
    <div id="result"></div>`;

  el.querySelector('#go').addEventListener('click', () => {
    el.querySelector('#intro').hidden = true;
    el.querySelector('#play').hidden = false;
    running = true;
    ends = Date.now() + DURATION * 1000;
    timer = setInterval(tick, 100);
    ask();
  });

  function tick() {
    const left = Math.max(0, (ends - Date.now()) / 1000);
    const t = el.querySelector('#t');
    t.textContent = Math.ceil(left);
    t.classList.toggle('low', left <= 10);
    el.querySelector('#tbar').style.width = `${(left / DURATION) * 100}%`;
    if (left <= 0) end();
  }

  function ask() {
    let w;
    do { w = pick(pool); } while (pool.length > 1 && w.id === lastId);
    lastId = w.id;
    const toFr = Math.random() < 0.5;
    const key = toFr ? (x => variants(x.fr)[0]) : enOf;
    const opts = shuffle([w, ...distractors(w, pool, words, 3, key)]);
    q = { w, opts };
    el.querySelector('#q').innerHTML = toFr
      ? `<div class="emoji" style="font-size:3.4rem">${e(w.emoji || '')}</div><div class="en-big">${e(enOf(w))}</div><div class="muted">→ en français ?</div>`
      : `<div class="fr" style="font-size:2.4rem"><span class="${genderClass(w)}">${e(w.fr)}</span></div><div class="muted">→ in English?</div>`;
    el.querySelector('#opts').innerHTML = opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="key">${i + 1}</span>${toFr ? `<span class="${genderClass(o)}">${e(variants(o.fr)[0])}</span>` : `<span class="oe">${e(o.emoji || '')}</span>${e(enOf(o))}`}</button>`).join('');
  }

  el.querySelector('#opts').addEventListener('click', ev => {
    const b = ev.target.closest('.opt'); if (!b || !running) return;
    const o = q.opts[+b.dataset.i];
    if (o.id === q.w.id) {
      score++; combo++; best = Math.max(best, combo);
      sfx.correct(combo);
      b.classList.add('right');
      floatText(combo >= 3 ? `+1 🔥${combo}` : '+1', b);
    } else {
      combo = 0;
      ends -= 3000;
      sfx.wrong();
      b.classList.add('wrong');
      floatText('-3s', b);
      [...el.querySelectorAll('.opt')].find((x, i) => q.opts[i].id === q.w.id)?.classList.add('right');
    }
    el.querySelector('#score').textContent = score;
    const c = el.querySelector('#combo');
    c.textContent = combo >= 2 ? `🔥 ×${combo}` : '';
    c.classList.toggle('hot', combo >= 5);
    running = false;
    setTimeout(() => { if (Date.now() < ends) { running = true; ask(); } }, o.id === q.w.id ? 250 : 700);
  });

  const onKey = ev => {
    if (isModalOpen() || !running || !/^[1-4]$/.test(ev.key)) return;
    el.querySelectorAll('.opt')[+ev.key - 1]?.click();
  };
  document.addEventListener('keydown', onKey);

  function end() {
    clearInterval(timer);
    running = false;
    el.querySelector('#play').hidden = true;
    const s = prog.stats;
    const record = score > s.speedBest;
    if (record) s.speedBest = score;
    if (best > s.bestCombo) s.bestCombo = best;
    if (score) { confetti(); sfx.fanfare(); } else sfx.sad();
    const xp = score * 4 + (record ? 15 : 0);
    const croissants = Math.floor(score / 3) + (record ? 3 : 0);
    const rewardHtml = gameOver(pid, 'speed', { xp, croissants, correct: score });
    app.save();
    el.querySelector('#result').innerHTML = resultPanel(pid, 'speed', {
      title: record ? 'Nouveau record !' : score >= 10 ? 'Rapide comme l\'éclair !' : 'Temps écoulé !',
      lines: [`Score : <b>${score}</b> · meilleur combo 🔥${best}`, `Record : ${s.speedBest}`],
      rewardHtml, mood: record ? 'cool' : score ? 'happy' : 'wink',
    }, mascotSvg);
    el.querySelector('[data-replay]').addEventListener('click', replay);
    speak('Bravo !');
  }

  return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
}
