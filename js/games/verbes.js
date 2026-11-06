// Les Verbes: present tense of regular -er and -ir verbs, typed.
// Level 1 shows the pronoun ("je ___"); level 2 asks for the pronoun too ("___ ___").

import { e, isModalOpen } from '../ui.js';
import { speak, sfx } from '../audio.js';
import { confetti, floatText } from '../fx.js';
import { mascotSvg } from '../art.js';
import { gameOver, resultPanel } from '../screens/games.js';
import { app } from '../app.js';
import { ACCENT_KEYS } from '../answer.js';
import { ENDINGS, makeRound, checkVerb, familyOf, stemOf } from '../verbs.js';

const ROUND = 10;
const FAMILIES = { er: '-er verbs', ir: '-ir verbs', mix: 'Both' };
const LEVELS = { 1: 'Level 1 · je ___', 2: 'Level 2 · ___ ___' };
// Remembered between rounds so "Play again" keeps the same choice.
let choice = { family: 'er', level: 1 };

const PRONOUNS = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];

function endingsTable(fam, verb) {
  const stem = verb ? stemOf(verb) : '…';
  return `<table class="lb-table verb-table"><tr><th colspan="2">-${fam} verbs: ${verb ? `<b>${e(stem)}</b>` : 'stem'} + ending</th></tr>
    ${ENDINGS[fam].map((end, i) => `<tr><td>${PRONOUNS[i]}</td><td>${e(stem)}<b>${end}</b></td></tr>`).join('')}</table>`;
}

export function start(el, { pid, prog, replay }) {
  setup();

  function setup() {
    el.innerHTML = `
      <div class="panel center">
        <p style="font-size:1.1rem;margin-top:0">Put the verb in the present tense. ${ROUND} questions.</p>
        <p class="muted" style="margin:4px 0 6px">Which verbs?</p>
        <div class="choice" id="fam">${Object.entries(FAMILIES).map(([k, n]) => `<button class="btn small ${k === choice.family ? 'on' : ''}" data-fam="${k}" aria-pressed="${k === choice.family}">${n}</button>`).join('')}</div>
        <p class="muted" style="margin:14px 0 6px">How hard?</p>
        <div class="choice" id="lvl">${Object.entries(LEVELS).map(([k, n]) => `<button class="btn small ${+k === choice.level ? 'on' : ''}" data-lvl="${k}" aria-pressed="${+k === choice.level}">${n}</button>`).join('')}</div>
        <p class="muted" style="font-size:.9rem;margin:10px 0 0">Level 1: the pronoun is there, you type the verb. Level 2: type both, like “il chante”.</p>
        <button class="btn red big" id="go" style="margin-top:16px">C'est parti ! (Let's go)</button>
      </div>`;
    el.querySelector('#fam').addEventListener('click', ev => { const b = ev.target.closest('[data-fam]'); if (b) { choice.family = b.dataset.fam; setup(); } });
    el.querySelector('#lvl').addEventListener('click', ev => { const b = ev.target.closest('[data-lvl]'); if (b) { choice.level = +b.dataset.lvl; setup(); } });
    el.querySelector('#go').addEventListener('click', play);
  }

  let onKey = null;
  function play() {
    const { family, level } = choice;
    const qs = makeRound(family, ROUND);
    let i = 0, score = 0, answered = false, showEndings = false;

    el.innerHTML = `
      <div class="row between"><span class="chip">${i + 1} / ${ROUND}</span><span class="chip blue">⭐ <span id="score">0</span></span></div>
      <div id="stage"></div>
      <div id="result"></div>`;
    const stage = el.querySelector('#stage');

    function ask() {
      const q = qs[i];
      answered = false;
      el.querySelector('.chip').textContent = `${i + 1} / ${ROUND}`;
      stage.innerHTML = `
        <div class="flash">
          <p class="prompt"><b lang="fr" style="font-size:1.25rem;color:var(--ink)">${e(q.verb.inf)}</b> = to ${e(q.verb.en)}</p>
          <div class="en-big">${e(q.en[0].toUpperCase() + q.en.slice(1))}</div>
          <p class="prompt" style="margin:4px 0 0">→ en français ?</p>
        </div>
        <div class="type-area">
          <div class="verb-line">
            ${level === 1 ? `<span class="verb-pronoun" lang="fr">${e(q.pronoun)}</span>` : ''}
            <input class="type-input" id="ans" lang="fr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
              aria-label="${level === 1 ? 'The verb' : 'Pronoun and verb'} in French" placeholder="${level === 1 ? '' : '___ ___'}">
          </div>
          <div class="accents">${ACCENT_KEYS.map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}<button type="button" data-k="'">'</button></div>
          <div class="feedback" id="fb" aria-live="polite"></div>
          <div class="row">
            <button class="btn" id="ends" aria-expanded="${showEndings}">💡 Endings</button>
            <button class="btn primary grow" id="check">Check ✓</button>
          </div>
          <div id="table" ${showEndings ? '' : 'hidden'}>${endingsTable(familyOf(q.verb), q.verb)}</div>
        </div>`;
      const input = stage.querySelector('#ans');
      setTimeout(() => input.focus(), 50);
      stage.querySelector('.accents').addEventListener('click', ev => {
        const b = ev.target.closest('[data-k]'); if (!b || answered) return;
        const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? s;
        input.value = input.value.slice(0, s) + b.dataset.k + input.value.slice(en);
        input.focus();
        input.setSelectionRange(s + 1, s + 1);
      });
      stage.querySelector('#ends').addEventListener('click', ev => {
        showEndings = !showEndings;
        ev.currentTarget.setAttribute('aria-expanded', String(showEndings));
        stage.querySelector('#table').hidden = !showEndings;
        if (!answered) input.focus();
      });
      stage.querySelector('#check').addEventListener('click', () => (answered ? next() : check()));
    }

    function check() {
      const q = qs[i];
      const input = stage.querySelector('#ans');
      if (!input.value.trim()) { input.focus(); return; }
      answered = true;
      input.readOnly = true;
      const res = checkVerb(input.value, q, level);
      const fb = stage.querySelector('#fb');
      const right = res.result !== 'wrong';
      const rule = `${e(stemOf(q.verb))} + <b>${e(q.form.slice(stemOf(q.verb).length))}</b>`;
      if (right) {
        score++;
        sfx.correct(score);
        floatText('+1', input);
        input.classList.add('ok');
        fb.innerHTML = '<span class="fb-text">' + (res.result === 'accents'
          ? `✅ Right! Watch the accents: <b lang="fr">${e(q.full)}</b>`
          : `✅ Bravo ! <b lang="fr">${e(q.full)}</b>`) + '</span>';
        fb.className = 'feedback good';
      } else {
        sfx.wrong();
        input.classList.add('bad');
        fb.innerHTML = '<span class="fb-text">' + (res.reason === 'elision'
          ? `Almost! Before a vowel, <b>je</b> becomes <b>j'</b>: <b lang="fr">${e(q.full)}</b>`
          : `It's <b lang="fr">${e(q.full)}</b> (${rule})`) + '</span>';
        fb.className = 'feedback bad';
      }
      speak(q.full);
      el.querySelector('#score').textContent = score;
      stage.querySelector('.accents').hidden = true;
      stage.querySelector('#check').textContent = i + 1 < ROUND ? 'Next →' : 'Finish 🏁';
      stage.querySelector('#check').focus();
    }

    function next() {
      i++;
      if (i < ROUND) ask(); else end();
    }

    onKey = ev => {
      if (isModalOpen() || ev.key !== 'Enter' || !stage.isConnected || !stage.querySelector('#check')) return;
      ev.preventDefault();
      stage.querySelector('#check').click();
    };
    document.addEventListener('keydown', onKey);

    function end() {
      document.removeEventListener('keydown', onKey);
      stage.innerHTML = '';
      const s = prog.stats;
      const record = score > (s.verbBest || 0);
      if (record) s.verbBest = score;
      const perfect = score === ROUND;
      if (score >= ROUND / 2) { confetti(); sfx.fanfare(); } else sfx.sad();
      const xp = score * 4 + (perfect ? 10 : 0) + (level === 2 ? score : 0);
      const croissants = Math.floor(score / 2) + (perfect ? 2 : 0);
      const rewardHtml = gameOver(pid, 'verbes', { xp, croissants, correct: score });
      app.save();
      el.querySelector('#result').innerHTML = resultPanel(pid, 'verbes', {
        title: perfect ? 'Parfait !' : score >= 7 ? 'Très bien !' : score >= 4 ? 'Pas mal !' : 'Keep practicing!',
        lines: [`<b>${score}</b> / ${ROUND} · ${e(FAMILIES[family])} · level ${level}`, `Best: ${s.verbBest} / ${ROUND}`],
        rewardHtml, mood: perfect ? 'cool' : score >= 5 ? 'happy' : 'wink',
      }, mascotSvg);
      el.querySelector('[data-replay]').addEventListener('click', replay);
      speak(perfect ? 'Parfait !' : 'Bravo !');
    }

    ask();
  }

  return () => { if (onKey) document.removeEventListener('keydown', onKey); };
}
