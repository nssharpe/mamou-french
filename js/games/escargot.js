// Sauve l'escargot: hangman, French style. Every wrong letter, the hungry chef
// takes a step closer to the snail. Guess the word to let the snail escape.

import { e, isModalOpen } from '../ui.js';
import { pick } from '../util.js';
import { speak, sfx } from '../audio.js';
import { confetti } from '../fx.js';
import { mascotSvg } from '../art.js';
import { enOf } from '../screens/common.js';
import { gameOver, resultPanel } from '../screens/games.js';
import { app } from '../app.js';
import { variants, loose } from '../answer.js';

const MAX_MISSES = 6;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function scene(misses, state) {
  const chefX = 238 - misses * 26;
  const snailX = state === 'won' ? -60 : 18;
  const caught = state === 'lost';
  return `<svg viewBox="0 0 300 130" class="pendu-scene" role="img" aria-label="${MAX_MISSES - misses} tries left">
    <rect x="0" y="100" width="300" height="30" fill="#9BD08A"/>
    <path d="M0 100 h300" stroke="#1D2340" stroke-width="2"/>
    <circle cx="262" cy="22" r="12" fill="#F2B33D" stroke="#1D2340" stroke-width="2"/>
    <g style="transition:transform 1.2s ease" transform="translate(${snailX} 0)">
      <g ${caught ? 'transform="translate(0 4)"' : ''}>
        ${caught ? '' : `<path d="M14 98 q-6 0 -8 -6 l-2 -10 q0 -4 3 -2 l4 8 q8 -4 26 -2 l24 2 q8 1 8 10z" fill="#F7C9A8" stroke="#1D2340" stroke-width="2"/>
        <path d="M8 84 l-3 -12 M12 83 l2 -12" stroke="#1D2340" stroke-width="2" stroke-linecap="round"/>
        <circle cx="5" cy="71" r="2.5" fill="#1D2340"/><circle cx="14" cy="70" r="2.5" fill="#1D2340"/>`}
        <circle cx="40" cy="80" r="18" fill="#D98A2B" stroke="#1D2340" stroke-width="2.4"/>
        <path d="M40 80 m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -10 0 a9 9 0 1 1 18 0 a13 13 0 1 1 -26 1" fill="none" stroke="#7A4512" stroke-width="2"/>
        ${caught ? '<text x="40" y="60" text-anchor="middle" font-size="12">💦</text>' : ''}
      </g>
    </g>
    <g style="transition:transform .5s ease" transform="translate(${caught ? 68 : chefX} 0)">
      <path d="M-14 100 l4 -30 h20 l4 30z" fill="#fff" stroke="#1D2340" stroke-width="2.2"/>
      <circle cx="0" cy="58" r="12" fill="#F7D3B2" stroke="#1D2340" stroke-width="2.2"/>
      <path d="M-10 46 q-8 -6 -2 -14 q4 -6 10 -2 q6 -6 12 0 q6 6 -2 14z" fill="#fff" stroke="#1D2340" stroke-width="2.2"/>
      <path d="M-11 46 h22" stroke="#1D2340" stroke-width="2.2"/>
      <circle cx="-4" cy="56" r="1.8" fill="#1D2340"/><circle cx="4" cy="56" r="1.8" fill="#1D2340"/>
      <path d="M0 62 q-4 -2 -8 1 q4 3 8 0 q4 3 8 -1 q-4 -3 -8 0z" fill="#1D2340"/>
      <path d="M-12 78 l-16 -6" stroke="#1D2340" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M-28 72 l-6 -14 M-31 70 l-3 -12 M-34 71 l-1 -12" stroke="#8A8FA6" stroke-width="2" stroke-linecap="round"/>
      ${misses >= 4 && !caught ? '<text x="14" y="40" font-size="12">😋</text>' : ''}
    </g>
    ${state === 'won' ? '<text x="150" y="60" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="#18774A">Merci ! 🐌💨</text>' : ''}
  </svg>`;
}

export function start(el, { pid, prog, pool, replay }) {
  const w = pick(pool);
  const target = variants(w.fr)[0];
  const chars = [...target];
  // Letters a character needs guessed: é → e, and œ → o + e.
  const keysOf = ch => [...loose(ch)].filter(c => /[a-z]/.test(c));
  const isLetter = ch => keysOf(ch).length > 0;
  const known = ch => keysOf(ch).every(k => guessed.has(k));
  const guessed = new Set();
  let misses = 0, state = 'play';

  el.innerHTML = `
    <div id="scene"></div>
    <div class="panel center" style="margin-top:12px;padding:12px">
      <div style="font-size:2.6rem;line-height:1.1">${e(w.emoji || '❔')}</div>
      <div class="muted">Clue: <b style="color:var(--ink)">${e(enOf(w))}</b> · <span id="left"></span></div>
      <div class="word-slots" id="slots"></div>
    </div>
    <div class="keyboard" id="kb">${LETTERS.map(l => `<button data-l="${l}">${l}</button>`).join('')}</div>
    <p class="center muted" style="font-size:.88rem;margin-top:8px">Accents are free: guessing <b>e</b> also finds é, è and ê.</p>
    <div id="result"></div>`;

  function draw() {
    el.querySelector('#scene').innerHTML = scene(misses, state);
    el.querySelector('#left').textContent = state === 'play' ? `${MAX_MISSES - misses} tries left` : '';
    // One group per word so a word never breaks across lines.
    el.querySelector('#slots').innerHTML = target.split(' ').map(word => `<span class="wgroup">${[...word].map(ch => {
      const show = !isLetter(ch) || known(ch) || state !== 'play';
      return `<span class="slot ${show && isLetter(ch) ? 'revealed' : ''}">${show ? e(ch) : '&nbsp;'}</span>`;
    }).join('')}</span>`).join('');
  }

  function guess(l) {
    if (state !== 'play' || guessed.has(l)) return;
    guessed.add(l);
    const btn = el.querySelector(`[data-l="${l}"]`);
    const hit = chars.some(ch => keysOf(ch).includes(l));
    btn.classList.add(hit ? 'hit' : 'miss');
    btn.disabled = true;
    if (hit) sfx.correct(); else { misses++; sfx.wrong(); }
    const solved = chars.every(ch => !isLetter(ch) || known(ch));
    if (solved) state = 'won';
    else if (misses >= MAX_MISSES) state = 'lost';
    draw();
    if (state !== 'play') end();
  }

  el.querySelector('#kb').addEventListener('click', ev => {
    const b = ev.target.closest('[data-l]'); if (b) guess(b.dataset.l);
  });
  const onKey = ev => { if (isModalOpen()) return; const k = loose(ev.key || ''); if (/^[a-z]$/.test(k) && !ev.ctrlKey && !ev.metaKey) guess(k); };
  document.addEventListener('keydown', onKey);

  function end() {
    document.removeEventListener('keydown', onKey);
    speak(w.fr);
    const won = state === 'won';
    if (won) { prog.stats.penduWins++; confetti(); sfx.fanfare(); } else sfx.sad();
    const xp = won ? 20 + (MAX_MISSES - misses) * 3 : 5;
    const croissants = won ? 2 + (misses === 0 ? 2 : 0) : 0;
    const rewardHtml = gameOver(pid, 'escargot', { xp, croissants, correct: won ? 2 : 0 });
    app.save();
    el.querySelector('#result').innerHTML = resultPanel(pid, 'escargot', {
      title: won ? (misses === 0 ? 'Perfect! The snail is free!' : 'You saved the snail!') : 'Oh no! The chef won…',
      lines: [won ? 'Merci ! 🐌💨' : 'The chef caught the snail… this time!', `The word: <b>${e(w.fr)}</b> = ${e(enOf(w))}`],
      rewardHtml, mood: won ? 'happy' : 'sad',
    }, mascotSvg);
    el.querySelector('[data-replay]').addEventListener('click', replay);
    el.querySelector('#kb').hidden = true;
  }

  draw();
  return () => document.removeEventListener('keydown', onKey);
}
