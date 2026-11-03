// The daily study session: spaced-repetition flashcards.
//
// In quiz mode each card is shown as an exercise that fits how well it's known:
//   new word            → introduce it, then a multiple-choice check
//   French → English    → pick the meaning (or, once known, just listen and pick)
//   English → French    → pick the French word; once graduated, type it
// Quiz answers are graded automatically (wrong → Again, close → Hard, right →
// Good). Flip mode is classic Anki: flip the card and grade yourself.

import { app, reward, celebrate } from '../app.js';
import { todayPlan, buildQueue, Session, wordIdOf, dirOf } from '../session.js';
import { schedule, newCard, previewIntervals, AGAIN, HARD, GOOD, EASY } from '../srs.js';
import { recordAnswer, updateGoal } from '../progress.js';
import { checkFrench, variants, ACCENT_KEYS } from '../answer.js';
import { speak, speakButton, canSpeak, sfx } from '../audio.js';
import { confetti, floatText, toast, croissantRain } from '../fx.js';
import { mascotSvg } from '../art.js';
import { PRAISE, COMFORT, COMBO_WORDS, SHOP } from '../data.js';
import { e, setView, genderClass, genderTag, confirmModal, isModalOpen } from '../ui.js';
import { distractors, enOf } from './common.js';
import { pick, shuffle } from '../util.js';

export function render({ pid }) {
  const prog = app.prog(pid);
  const words = app.words();
  const byId = new Map(words.map(w => [w.id, w]));
  const plan = todayPlan(prog, words, Date.now());
  const queue = buildQueue(plan);
  if (!queue.length) { app.go(`/p/${pid}`); return; }

  const session = new Session(queue);
  const S = { answered: 0, correct: 0, wrong: 0, xp: 0, combo: 0, bestCombo: 0, learned: [], start: Date.now(), goalMet: false };
  const flipMode = prog.prefs.mode === 'flip';
  const autoSpeak = prog.prefs.autoSpeak !== false;
  const theme = (SHOP.find(i => i.id === prog.equip.card) || {}).cls || '';
  let cur = null;       // { id, word, dir, card, kind, shownAt, hints }
  let locked = false;   // an answer is being shown
  let advanceTimer = null;
  let keyHandler = null;
  let done = false;

  const root = setView(`
    <div class="study-top">
      <button class="btn small" id="quit" aria-label="Quitter">✕</button>
      <div class="progress" aria-label="progress"><div id="pfill" style="width:0%"></div></div>
      <div class="combo" id="combo"></div>
    </div>
    <div class="stage" id="stage"></div>`);
  const stage = root.querySelector('#stage');

  root.querySelector('#quit').addEventListener('click', async () => {
    if (S.answered && !(await confirmModal('Quitter ?', 'Your answers so far are saved. Leave the session?', { yes: 'Quitter', no: 'Continuer' }))) return;
    finish(true);
  });

  function setProgress() {
    const total = S.answered + session.remaining + (cur && !locked ? 1 : 0);
    const pct = total ? (S.answered / total) * 100 : 100;
    root.querySelector('#pfill').style.width = `${Math.min(100, pct)}%`;
    const c = root.querySelector('#combo');
    c.textContent = S.combo >= 2 ? `🔥 ×${S.combo}` : '';
    c.classList.toggle('hot', S.combo >= 5);
  }

  function next() {
    clearTimeout(advanceTimer);
    locked = false;
    const id = session.next(Date.now());
    if (!id) return finish(false);
    const word = byId.get(wordIdOf(id));
    if (!word) return next();
    const dir = dirOf(id);
    const card = prog.cards[id] || newCard();
    let kind;
    if (flipMode) kind = 'flip';
    else if (dir === 'r') {
      if (card.state === 'new') kind = 'intro';
      else if (card.state === 'review' && card.ivl >= 3 && canSpeak() && Math.random() < 0.4) kind = 'listen';
      else kind = 'mc-r';
    } else {
      kind = (card.state === 'review' || (card.state !== 'new' && card.reps >= 2)) ? 'type' : 'mc-p';
    }
    cur = { id, word, dir, card, kind, shownAt: Date.now(), hints: 0 };
    show();
    setProgress();
  }

  // ---------- exercises ----------

  const frHtml = w => `<span class="${genderClass(w)}">${e(variants(w.fr)[0])}</span>`;
  const frAll = w => `<span class="${genderClass(w)}">${e(w.fr)}</span>`;
  const speakBtn = (cls = '') => canSpeak() ? `<button class="speak ${cls}" data-say aria-label="Écouter">🔊</button>` : '';

  function wireSpeak(text) {
    stage.querySelectorAll('[data-say]').forEach(b => speakButton(b, text));
  }

  function show() {
    const { word: w, kind, dir, card } = cur;
    if (kind === 'intro') {
      stage.innerHTML = `
        <div class="flash ${theme}">
          <span class="chip green badge">✨ Nouveau mot ! (new word)</span>
          <span class="emoji">${e(w.emoji || '❔')}</span>
          <div class="fr">${frAll(w)} ${genderTag(w)}</div>
          ${speakBtn()}
          <div class="en-big">${e(w.en)}</div>
          ${w.note ? `<div class="note">💡 ${e(w.note)}</div>` : ''}
        </div>
        <button class="btn primary big block" style="margin-top:18px" id="got">J'ai compris ! → <small>(got it)</small></button>`;
      wireSpeak(w.fr);
      if (autoSpeak) speak(w.fr);
      stage.querySelector('#got').addEventListener('click', () => { sfx.tap(); cur.kind = 'mc-r'; cur.fresh = true; show(); });
      keyHandler = k => { if (k === 'Enter' || k === ' ') stage.querySelector('#got').click(); };
      return;
    }

    if (kind === 'mc-r' || kind === 'listen') {
      const opts = shuffle([w, ...distractors(w, words, words, 3, enOf)]);
      cur.opts = opts;
      const listen = kind === 'listen';
      stage.innerHTML = `
        <div class="flash ${theme}">
          ${cur.fresh ? '<span class="chip blue badge">Vérifions ! (let\'s check)</span>' : card.state === 'new' ? '' : ''}
          <p class="prompt">${listen ? 'Écoute ! Qu\'est-ce que ça veut dire ? (Listen! What does it mean?)' : 'Que veut dire… ? (What does this mean?)'}</p>
          ${listen ? speakBtn('big') : `<div class="fr">${frAll(w)}</div>${speakBtn()}`}
          <div class="reveal" hidden></div>
        </div>
        <div class="options">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="key">${i + 1}</span><span class="oe">${e(o.emoji || '')}</span>${e(enOf(o))}</button>`).join('')}</div>`;
      wireSpeak(w.fr);
      if (autoSpeak || listen) speak(w.fr);
      wireOptions(o => o.id === w.id);
      return;
    }

    if (kind === 'mc-p') {
      const opts = shuffle([w, ...distractors(w, words, words, 3, x => variants(x.fr)[0])]);
      cur.opts = opts;
      stage.innerHTML = `
        <div class="flash ${theme}">
          ${card.state === 'new' ? '<span class="chip red badge">🎯 Nouveau défi : en français !</span>' : ''}
          <p class="prompt">Comment dit-on… en français ? (How do you say it in French?)</p>
          <span class="emoji">${e(w.emoji || '')}</span>
          <div class="en-big">${e(enOf(w))}</div>
          <div class="reveal" hidden></div>
        </div>
        <div class="options">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="key">${i + 1}</span>${frHtml(o)}</button>`).join('')}</div>`;
      wireOptions(o => o.id === w.id);
      return;
    }

    if (kind === 'type') {
      stage.innerHTML = `
        <div class="flash ${theme}">
          <p class="prompt">Écris-le en français ! (Type it in French)</p>
          <span class="emoji">${e(w.emoji || '')}</span>
          <div class="en-big">${e(enOf(w))}</div>
          <div class="hint-line muted" style="min-height:1.4em;font-size:1.1rem;letter-spacing:1px"></div>
        </div>
        <div class="type-area">
          <input class="type-input" id="ans" lang="fr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="Your answer in French">
          <div class="accents">${ACCENT_KEYS.map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}<button type="button" data-k="'">'</button></div>
          <div class="row">
            <button class="btn ghost" id="idk">🤷 Je ne sais pas</button>
            <button class="btn" id="hint">💡 Indice</button>
            <button class="btn primary grow" id="check">Vérifier ✓</button>
          </div>
        </div>`;
      const input = stage.querySelector('#ans');
      setTimeout(() => input.focus(), 50);
      stage.querySelector('.accents').addEventListener('click', ev => {
        const b = ev.target.closest('[data-k]'); if (!b) return;
        const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? s;
        input.value = input.value.slice(0, s) + b.dataset.k + input.value.slice(en);
        input.focus();
        input.setSelectionRange(s + 1, s + 1);
      });
      stage.querySelector('#hint').addEventListener('click', () => {
        const target = variants(w.fr)[0];
        cur.hints = Math.min(target.length, cur.hints + 1 + Math.floor(target.length / 5));
        stage.querySelector('.hint-line').textContent = [...target].map((ch, i) => i < cur.hints || ch === ' ' || ch === "'" ? ch : '_').join(' ');
        sfx.tap();
        input.focus();
      });
      stage.querySelector('#idk').addEventListener('click', () => gradeTyped(''));
      stage.querySelector('#check').addEventListener('click', () => gradeTyped(input.value));
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); gradeTyped(input.value); } });
      keyHandler = null;
      return;
    }

    if (kind === 'flip') {
      const front = dir === 'r'
        ? `<p class="prompt">Que veut dire… ?</p><div class="fr">${frAll(w)}</div>${speakBtn()}`
        : `<p class="prompt">En français ?</p><span class="emoji">${e(w.emoji || '')}</span><div class="en-big">${e(w.en)}</div>`;
      const back = `<span class="emoji">${e(w.emoji || '')}</span><div class="fr">${frAll(w)} ${genderTag(w)}</div>${speakBtn()}<div class="en-big">${e(w.en)}</div>${w.note ? `<div class="note">💡 ${e(w.note)}</div>` : ''}`;
      const iv = previewIntervals(card, Date.now());
      stage.innerHTML = `
        <div class="flip-wrap"><div class="flipper" id="flipper">
          <div class="flash face front ${theme}">${card.state === 'new' ? '<span class="chip green badge">✨ Nouveau !</span>' : ''}${front}<div class="tap-hint">Tape pour retourner (tap to flip) · espace</div></div>
          <div class="flash face back ${theme}">${back}</div>
        </div></div>
        <div class="grades" id="grades" style="visibility:hidden">
          <button class="btn red" data-g="1">😬 Encore<small>${iv[AGAIN]}</small></button>
          <button class="btn" data-g="2">😅 Difficile<small>${iv[HARD]}</small></button>
          <button class="btn primary" data-g="3">🙂 Bien<small>${iv[GOOD]}</small></button>
          <button class="btn green" data-g="4">😎 Facile<small>${iv[EASY]}</small></button>
        </div>`;
      const flipper = stage.querySelector('#flipper');
      const flash = stage.querySelectorAll('.flash.face');
      // The flipper needs a height: use the taller face.
      requestAnimationFrame(() => { flipper.style.minHeight = Math.max(...[...flash].map(f => f.scrollHeight), 300) + 'px'; });
      wireSpeak(w.fr);
      if (dir === 'r' && autoSpeak) speak(w.fr);
      const flip = () => {
        if (flipper.classList.contains('flipped')) return;
        sfx.flip();
        flipper.classList.add('flipped');
        stage.querySelector('#grades').style.visibility = 'visible';
        if (autoSpeak || dir === 'p') speak(w.fr);
      };
      flipper.addEventListener('click', ev => { if (!ev.target.closest('[data-say]')) flip(); });
      stage.querySelector('#grades').addEventListener('click', ev => {
        const b = ev.target.closest('[data-g]'); if (!b || locked) return;
        const g = +b.dataset.g;
        answer(g, { correct: g >= HARD, el: b, quick: true });
      });
      keyHandler = k => {
        if (k === ' ' || k === 'Enter') { if (!flipper.classList.contains('flipped')) flip(); else if (k === 'Enter') stage.querySelector('[data-g="3"]').click(); }
        if (/^[1-4]$/.test(k) && flipper.classList.contains('flipped')) stage.querySelector(`[data-g="${k}"]`).click();
      };
    }
  }

  function wireOptions(isRight) {
    const buttons = [...stage.querySelectorAll('.opt')];
    stage.querySelector('.options').addEventListener('click', ev => {
      const b = ev.target.closest('.opt'); if (!b || locked) return;
      const o = cur.opts[+b.dataset.i];
      const ok = isRight(o);
      buttons.forEach((x, i) => {
        x.disabled = true;
        if (isRight(cur.opts[i])) x.classList.add('right');
        else if (x === b) x.classList.add('wrong');
        else x.classList.add('dim');
      });
      const reveal = stage.querySelector('.reveal');
      if (reveal && cur.kind === 'listen') { reveal.hidden = false; reveal.innerHTML = `<div class="fr">${frAll(cur.word)}</div>`; }
      answer(ok ? GOOD : AGAIN, { correct: ok, el: b });
    });
    keyHandler = k => { if (/^[1-4]$/.test(k)) buttons[+k - 1]?.click(); };
  }

  function gradeTyped(text) {
    if (locked) return;
    const w = cur.word;
    const res = checkFrench(text, w.fr);
    const input = stage.querySelector('#ans');
    input.disabled = true;
    stage.querySelectorAll('.type-area button').forEach(b => { b.disabled = true; });
    let grade, correct, close = false;
    if (res.result === 'exact') { grade = cur.hints ? HARD : GOOD; correct = true; }
    else if (res.result === 'close') { grade = HARD; correct = true; close = true; }
    else { grade = AGAIN; correct = false; }
    const hasAccent = /[^\x00-\x7f]/.test(variants(w.fr)[0].replace(/œ/g, ''));
    answer(grade, { correct, close, reason: res.reason, expected: res.expected, typed: text, el: input, accentWord: hasAccent && res.result === 'exact' });
  }

  // ---------- grading ----------

  function answer(grade, { correct, close = false, reason = null, expected = '', typed = '', el = null, quick = false, accentWord = false }) {
    if (locked) return;
    locked = true;
    const now = Date.now();
    const { id, word: w, card: before } = cur;
    const after = schedule(before, grade, now);
    prog.cards[id] = after;

    S.answered++;
    if (correct) { S.correct++; S.combo++; } else { S.wrong++; S.combo = 0; }
    S.bestCombo = Math.max(S.bestCombo, S.combo);
    const rec = recordAnswer(prog, { cardId: id, before, after, correct, combo: S.combo, now, accentWord });
    if (rec.learnedWord) S.learned.push(w);
    session.answered(id, after, now);
    const gained = reward(pid, { xp: rec.xp, studied: true });
    S.xp += gained;
    if (gained) floatText(`+${gained} XP`, el);

    const goal = updateGoal(prog, now);
    if (goal.justMet) {
      S.goalMet = true;
      prog.croissants += 10;
      app.save();
      setTimeout(() => {
        sfx.fanfare(); confetti({ count: 160 });
        toast('Objectif du jour atteint !', { sub: `Daily goal done · streak ${goal.streak} 🔥 · +10 🥐`, icon: '🎯', gold: true, ms: 4200 });
      }, 400);
    }

    if (correct && !close) sfx.correct(S.combo);
    else if (close) sfx.close();
    else sfx.wrong();
    const milestone = COMBO_WORDS.slice().reverse().find(([n]) => n === S.combo);
    if (milestone) toast(`${milestone[1]} ×${S.combo}`, { sub: milestone[2], icon: '🔥', ms: 2000 });
    if (rec.learnedWord) setTimeout(() => toast(`Mot appris : ${w.fr}`, { sub: 'New word learned! +15 XP', icon: w.emoji || '🌱', ms: 2400 }), 250);

    setProgress();

    if (quick) {
      // Flip mode: the answer is already on screen.
      advanceTimer = setTimeout(next, correct ? 350 : 700);
      keyHandler = null;
      return;
    }

    // Feedback panel
    const [fr, en] = correct && !close ? pick(PRAISE) : close ? ['Presque !', 'Almost!'] : pick(COMFORT);
    const reasonText = {
      accents: `Watch the accents: <b>${e(expected)}</b>`,
      article: `Don't forget the article: <b>${e(expected)}</b>`,
      gender: `Careful with the gender: it's <b>${e(expected)}</b> (${w.g === 'f' ? 'féminin' : 'masculin'})`,
      typo: `Tiny typo! It's <b>${e(expected)}</b>`,
    }[reason];
    let detail;
    if (correct && !close) detail = `<b>${frAll(w)}</b> = ${e(enOf(w))} ${e(w.emoji || '')}`;
    else if (close) detail = reasonText;
    else detail = `${typed ? `You wrote “${e(typed)}”. ` : ''}The answer: <b>${frAll(w)}</b> = ${e(enOf(w))} ${e(w.emoji || '')}`;
    const mood = correct && !close ? (S.combo >= 5 ? 'cool' : 'happy') : close ? 'wink' : 'sad';
    const fb = document.createElement('div');
    fb.className = `feedback ${correct && !close ? 'good' : close ? 'close' : 'bad'}`;
    fb.innerHTML = `<div class="mascot sm ${correct ? 'bounce' : 'wobble'}">${mascotSvg(mood)}</div>
      <div class="fb-text"><div class="fb-title">${e(fr)} <span class="fb-en">(${e(en)})</span></div><div>${detail}</div></div>
      <button class="btn ${correct ? 'green' : 'primary'}" id="next">Suivant →</button>`;
    stage.querySelectorAll('.accents, .type-area .row').forEach(x => { x.hidden = true; });
    stage.appendChild(fb);
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    fb.querySelector('#next').addEventListener('click', next);
    speak(w.fr);
    keyHandler = k => { if (k === 'Enter' || k === ' ') next(); };
    if (correct && !close) advanceTimer = setTimeout(next, 1700);
    else setTimeout(() => fb.querySelector('#next')?.focus(), 50);
  }

  // ---------- end of session ----------

  async function finish(quit) {
    if (done) return;
    done = true;
    clearTimeout(advanceTimer);
    keyHandler = null;
    if (!S.answered) { app.go(`/p/${pid}`); return; }
    const now = Date.now();
    const left = todayPlan(prog, words, now);
    const cleared = !quit && left.due.length === 0 && left.newR.length === 0 && left.newP.length === 0;
    if (cleared) {
      const g = updateGoal(prog, now, { deckCleared: true });
      if (g.justMet) { S.goalMet = true; prog.croissants += 10; }
    }
    const perfect = S.answered >= 10 && S.wrong === 0;
    if (perfect) prog.stats.perfect++;
    let croissants = Math.ceil(S.correct / 2) + (quit ? 0 : 5) + (perfect ? 10 : 0);
    const bonusXp = quit ? 0 : 20;
    S.xp += reward(pid, { xp: bonusXp, croissants, studied: true, quiet: true });
    const acc = Math.round((S.correct / S.answered) * 100);
    const mins = Math.max(1, Math.round((now - S.start) / 60000));
    sfx.fanfare();
    confetti({ count: perfect ? 260 : 150 });
    if (perfect) croissantRain();

    const root2 = setView(`
      <div class="summary" style="margin-top:20px">
        <div class="mascot lg bounce" style="margin:0 auto">${mascotSvg(acc >= 80 ? 'cool' : acc >= 50 ? 'happy' : 'wink')}</div>
        <h1 class="screen-title">${quit ? 'À bientôt !' : perfect ? 'Sans faute !' : 'Session terminée !'}</h1>
        <p class="muted">${quit ? 'See you soon!' : perfect ? 'Perfect — not a single mistake!' : 'Session complete!'}</p>
        <div class="summary-grid">
          <div class="panel"><div class="big-num">${S.answered}</div><div class="muted">cartes</div></div>
          <div class="panel"><div class="big-num">${acc}%</div><div class="muted">réussite</div></div>
          <div class="panel"><div class="big-num">+${S.xp}</div><div class="muted">XP</div></div>
          <div class="panel"><div class="big-num">+${croissants}</div><div class="muted">🥐 croissants</div></div>
          <div class="panel"><div class="big-num">🔥${S.bestCombo}</div><div class="muted">meilleur combo</div></div>
          <div class="panel"><div class="big-num">${mins}</div><div class="muted">minute${mins > 1 ? 's' : ''}</div></div>
        </div>
        ${S.goalMet ? '<div class="panel" style="background:var(--vert-light)"><b>🎯 Objectif du jour atteint !</b> Your streak is safe today.</div>' : ''}
        ${S.learned.length ? `<div class="panel" style="margin-top:14px"><b>Nouveaux mots appris :</b><div class="learned-list">${S.learned.map(w => `<span class="chip">${e(w.emoji || '')} ${e(w.fr)}</span>`).join('')}</div></div>` : ''}
        <div class="row" style="justify-content:center;margin-top:20px">
          <a class="btn big" href="#/p/${pid}">🏠 Accueil</a>
          <a class="btn gold big" href="#/p/${pid}/games">🎲 Jouer</a>
        </div>
      </div>`);
    void root2;
    await celebrate(pid);
  }

  const onKey = ev => {
    if (isModalOpen() || !keyHandler) return;
    if (ev.target && ev.target.tagName === 'INPUT') return;
    if (ev.key === ' ' || ev.key === 'Enter' || /^[1-4]$/.test(ev.key)) {
      ev.preventDefault();
      keyHandler(ev.key);
    }
  };
  document.addEventListener('keydown', onKey);
  next();

  return () => {
    clearTimeout(advanceTimer);
    document.removeEventListener('keydown', onKey);
    try { speechSynthesis.cancel(); } catch { /* none */ }
  };
}
