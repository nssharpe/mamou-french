// Mon Carnet: every word, with mastery stars. Tap a word to hear it.

import { app } from '../app.js';
import { topbar } from './common.js';
import { e, setView, genderClass, genderTag, starsHtml, openModal } from '../ui.js';
import { mastery } from '../srs.js';
import { rId, pId } from '../session.js';
import { categoriesOf, CATEGORY_EMOJI } from '../words.js';
import { speak, canSpeak } from '../audio.js';
import { flagSvg } from '../art.js';

function wordStars(prog, w) {
  const r = mastery(prog.cards[rId(w.id)]);
  const p = mastery(prog.cards[pId(w.id)]);
  return Math.round((r + p) / 2 * 10) / 10;
}

function when(card) {
  if (!card || card.state === 'new') return 'not seen yet';
  const d = Math.ceil((card.due - Date.now()) / 864e5);
  if (card.due <= Date.now()) return 'due now';
  if (card.state !== 'review') return 'later today';
  return d <= 1 ? 'tomorrow' : `in ${d} days`;
}

export function render({ pid }) {
  const prog = app.prog(pid);
  const words = app.words();
  const cats = categoriesOf(words);
  const known = words.filter(w => prog.cards[rId(w.id)] && prog.cards[rId(w.id)].state !== 'new').length;
  const mastered = words.filter(w => wordStars(prog, w) >= 4.5).length;

  const root = setView(`
    ${topbar(pid)}
    <h1 class="screen-title">Mon Carnet <span class="title-en">My words</span></h1>
    <p class="screen-sub">${known} of ${words.length} words met · ${mastered} mastered ⭐⭐⭐⭐⭐</p>
    <div class="legend"><span><b class="g-m">blue</b> = masculine (le, un)</span><span><b class="g-f">red</b> = feminine (la, une)</span><span>⭐ = how well you know it</span></div>
    ${cats.map(cat => `
      <div class="cat-head">${CATEGORY_EMOJI[cat] || '📁'} ${e(cat)}</div>
      <div class="word-grid">
        ${words.filter(w => w.cat === cat).map(w => {
          const met = prog.cards[rId(w.id)] && prog.cards[rId(w.id)].state !== 'new';
          const s = wordStars(prog, w);
          return `<button class="word-card ${met ? '' : 'locked'}" data-w="${e(w.id)}">
            <div class="we">${met ? e(w.emoji || '❔') : '❓'}</div>
            <div class="wf ${met ? genderClass(w) : ''}">${met ? e(w.fr) : '? ? ?'}</div>
            <div class="wen">${met ? e(w.en.split(' / ')[0]) : 'not learned yet'}</div>
            ${starsHtml(Math.round(s))}
          </button>`;
        }).join('')}
      </div>`).join('')}
  `);

  root.addEventListener('click', ev => {
    const b = ev.target.closest('[data-w]'); if (!b) return;
    const w = words.find(x => x.id === b.dataset.w);
    const r = prog.cards[rId(w.id)], p = prog.cards[pId(w.id)];
    if (!r || r.state === 'new') { openModal({ title: 'Not learned yet', body: '<p>You haven\'t met this word yet. Keep doing your daily cards to unlock it!</p>' }); return; }
    speak(w.fr);
    openModal({
      body: `<div class="center">
        <div style="font-size:4rem">${e(w.emoji || '')}</div>
        <div class="fr ${genderClass(w)}" style="font-size:2.2rem;font-weight:700">${e(w.fr)} ${genderTag(w)}</div>
        <div style="font-size:1.3rem">${e(w.en)}</div>
        ${canSpeak() ? '<button class="speak" id="cw-say" style="margin-top:8px">🔊</button>' : ''}
        ${w.note ? `<div class="note" style="margin:12px auto 0;max-width:420px;background:var(--or-light);border:2px dashed #C99A3A;border-radius:12px;padding:8px 12px">💡 ${e(w.note)}</div>` : ''}
      </div>
      <table class="lb-table" style="margin-top:14px">
        <tr><th>Card</th><th>Stars</th><th>Next review</th></tr>
        <tr><td>${flagSvg(12)} → English</td><td>${'⭐'.repeat(mastery(r)) || '–'}</td><td>${when(r)}</td></tr>
        <tr><td>English → ${flagSvg(12)}</td><td>${'⭐'.repeat(mastery(p)) || '–'}</td><td>${p && p.state !== 'new' ? when(p) : 'unlocks after you learn the word'}</td></tr>
      </table>`,
      actions: [{ label: 'Close', cls: 'primary' }],
      onOpen(el) { el.querySelector('#cw-say')?.addEventListener('click', () => speak(w.fr)); },
    });
  });
}
