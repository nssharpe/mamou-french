// A kid's home: today's cards, goal, streak, level and the doors to everything else.

import { app, celebrate, hasCelebrations } from '../app.js';
import { todayPlan, peekToday, today } from '../session.js';
import { levelInfo, rankFor, nextRank, displayStreak, checkStreak, goalProgress, weekXp } from '../progress.js';
import { mascotHtml, bubbleHtml, setMascot, avatarHtml } from '../art.js';
import { topbar } from './common.js';
import { e, setView, frenchDate, greeting, openModal } from '../ui.js';
import { FUN_FACTS, TOUR, ANIMALS, MASCOT_TAPS, ACHIEVEMENTS } from '../data.js';
import { pick, plural } from '../util.js';
import { toast } from '../fx.js';
import { sfx, setAudioSettings } from '../audio.js';
import { reward } from '../app.js';

export async function render({ pid }) {
  const p = app.profile(pid), prog = app.prog(pid);
  const now = Date.now();

  const st = checkStreak(prog, now);
  if (st.saved) toast(`Gel de série utilisé ×${st.saved}`, { sub: 'A streak freeze saved your streak!', icon: '🧊', gold: true, ms: 5000 });
  if (st.lost) toast(`Série perdue (${st.lost} jours)`, { sub: 'No worries — start a new one today!', icon: '💨', ms: 5000 });
  if (st.saved || st.lost) app.save();

  const words = app.words();
  const plan = todayPlan(prog, words, now);
  const dueCount = plan.due.length;
  const newCount = plan.newR.length + plan.newP.length;
  const total = dueCount + newCount;
  const d = peekToday(prog, now);
  const goal = goalProgress(prog, now);
  const streak = displayStreak(prog, now);
  const lv = levelInfo(prog.xp);
  const rank = rankFor(lv.level);
  const nr = nextRank(lv.level);
  const [hello, helloEn] = greeting(now);
  const stop = TOUR[Math.min(lv.level, TOUR.length) - 1];
  const trophies = Object.keys(prog.ach).length;

  let say, sayEn, mood = 'happy';
  if (!words.length) { say = 'Il n\'y a pas de mots !'; sayEn = 'There are no words yet — ask a grown-up to add some.'; mood = 'sad'; }
  else if (total > 0 && d.rev === 0) { say = `${hello}, ${p.name} ! On révise ?`; sayEn = `${helloEn}, ${p.name}! Shall we practise?`; }
  else if (total > 0) { say = 'Encore quelques cartes !'; sayEn = 'Just a few more cards!'; }
  else if (goal.met) { say = 'Bravo ! Tout est fini pour aujourd\'hui.'; sayEn = 'All done for today! Come back tomorrow.'; mood = 'cool'; }
  else { say = 'Tout est à jour ! On joue ?'; sayEn = 'All caught up! Play a game to hit your goal.'; mood = 'wink'; }

  const later = plan.later.length;
  const root = setView(`
    ${topbar(pid, { back: '/' })}
    <div class="greet row" style="margin-top:6px">
      <div class="grow"><h1>${e(hello)}, ${e(p.name)} !</h1><div class="date">${e(frenchDate(now))}</div></div>
    </div>
    <div class="mascot-row" style="margin-top:8px">${mascotHtml({ mood, id: 'dash-mascot' })}${bubbleHtml(say, sayEn)}</div>

    <div class="panel study-cta">
      ${total > 0 ? `
        <h2>Révision du jour</h2>
        <div class="counts">
          ${dueCount ? `<span class="chip blue">🔁 ${plural(dueCount, 'à revoir', 'à revoir')}</span>` : ''}
          ${newCount ? `<span class="chip green">✨ ${plural(newCount, 'nouveau', 'nouveaux')}</span>` : ''}
        </div>
        <a class="btn primary big" href="#/p/${pid}/study" id="go-study">C'est parti ! →</a>
        <div class="muted" style="margin-top:8px;font-size:.9rem">${dueCount} to review · ${newCount} new${later ? ` · ${later} coming back later today` : ''}</div>
      ` : `
        <h2>${goal.met ? 'Objectif atteint ! 🎉' : 'Tout est à jour ! ✅'}</h2>
        <p class="muted" style="margin:6px 0 12px">${later ? `${plural(later, 'card comes', 'cards come')} back a bit later today.` : 'No cards due right now.'} ${plan.moreNew ? 'Want to learn more words?' : ''}</p>
        <div class="row" style="justify-content:center">
          ${plan.moreNew ? `<button class="btn green big" id="more-new">➕ 5 mots de plus</button>` : ''}
          <a class="btn gold big" href="#/p/${pid}/games">🎲 Jouer</a>
        </div>
      `}
    </div>

    <div class="status-grid">
      <div class="panel">
        <div class="ring" style="--p:${goal.pct}"><span>${goal.met ? '✓' : Math.round(goal.pct * 100) + '%'}</span></div>
        <div><div class="stat-big">${goal.met ? 'Fait !' : `${Math.min(goal.pts, goal.goal)}/${goal.goal}`}</div><div class="stat-label">Objectif du jour<br>(daily goal)</div></div>
      </div>
      <div class="panel">
        <span class="flame ${streak ? 'live' : 'cold'}">🔥</span>
        <div><div class="stat-big">${streak} ${streak === 1 ? 'jour' : 'jours'}</div><div class="stat-label">Série${prog.streak.freezes ? ` · 🧊×${prog.streak.freezes}` : ''}<br>(streak · best ${prog.streak.best})</div></div>
      </div>
    </div>

    <div class="panel levelbar">
      <div class="row between"><b>${rank.emoji} ${e(rank.name)} · Niveau ${lv.level}</b><span class="muted">${lv.into}/${lv.need} XP</span></div>
      <div class="track" style="margin-top:8px"><div class="fill" style="width:${Math.round(lv.pct * 100)}%"></div></div>
      <div class="muted" style="font-size:.88rem;margin-top:6px">${nr ? `Next title at level ${nr.level}: ${nr.emoji} ${e(nr.name)}` : 'Top title reached — legendary!'} · Next stop: ${e((TOUR[lv.level] || TOUR[TOUR.length - 1]).city)}</div>
    </div>

    <div class="tiles">
      <a class="panel tile t1" href="#/p/${pid}/games"><span class="ico">🎲</span>Jeux<span class="sub">Games</span></a>
      <a class="panel tile t2" href="#/p/${pid}/carnet"><span class="ico">📒</span>Mon carnet<span class="sub">My words</span></a>
      <a class="panel tile t3" href="#/p/${pid}/tour"><span class="ico">🚴</span>Tour de France<span class="sub">${e(stop.city)}</span></a>
      <a class="panel tile t4" href="#/p/${pid}/shop"><span class="ico">🛍️</span>Boutique<span class="sub">🥐 ${prog.croissants}</span></a>
      <a class="panel tile t5" href="#/p/${pid}/trophies"><span class="ico">🏆</span>Trophées<span class="sub">${trophies}/${ACHIEVEMENTS.filter(a => !a.secret).length}+</span></a>
      <a class="panel tile t6" href="#/p/${pid}/classement"><span class="ico">🥇</span>Classement<span class="sub">${weekXp(prog, now)} XP this week</span></a>
    </div>

    <div class="panel factbox"><b>Le saviez-vous ?</b> ${e(pick(FUN_FACTS))}</div>
    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn small" id="my-settings">🎛️ Mes réglages</button>
    </div>
  `);

  root.querySelector('#more-new')?.addEventListener('click', () => {
    today(prog, Date.now()).extra += 5;
    app.save();
    app.go(`/p/${pid}/study`);
  });

  const m = root.querySelector('#dash-mascot');
  let taps = 0;
  m.addEventListener('click', () => {
    sfx.tap();
    prog.stats.mascotTaps = Math.max(prog.stats.mascotTaps, ++taps);
    const line = MASCOT_TAPS[Math.min(taps, MASCOT_TAPS.length) - 1];
    setMascot(m, taps >= 7 ? 'cool' : taps % 2 ? 'wow' : 'wink', taps >= 7 ? 'spin' : 'wobble');
    const bubble = root.querySelector('.mascot-row .bubble');
    if (bubble) bubble.textContent = line;
    if (taps >= 7) reward(pid, {});
  });

  root.querySelector('#my-settings').addEventListener('click', () => kidSettings(pid));

  if (!prog.onboarded) await onboard(pid);
  else if (hasCelebrations(pid)) await celebrate(pid);
}

async function onboard(pid) {
  const p = app.profile(pid), prog = app.prog(pid);
  let animal = p.animal;
  await openModal({
    title: `Bienvenue, ${p.name} !`,
    body: `<p>I'm <b>Monsieur Croissant</b> 🥐 and I'll help you learn French with Mamou's words.</p>
      <ul style="padding-left:20px;margin:8px 0">
        <li><b>Révision du jour</b>: a few cards every day. Words you know come back less often; tricky ones come back sooner.</li>
        <li>Earn <b>XP</b> to level up and travel the <b>Tour de France</b>.</li>
        <li>Earn <b>croissants 🥐</b> to buy hats and gear in the <b>Boutique</b>.</li>
        <li>Practise every day to grow your <b>streak 🔥</b>.</li>
      </ul>
      <div class="field"><span class="lbl">First, pick your animal:</span><div class="animal-grid">${ANIMALS.map(a => `<button type="button" data-a="${a}" class="${a === animal ? 'on' : ''}">${a}</button>`).join('')}</div></div>`,
    actions: [{ label: 'Allons-y ! (Let\'s go!)', cls: 'primary big' }],
    dismissable: false,
    onOpen(el) {
      el.querySelector('.animal-grid').addEventListener('click', ev => {
        const b = ev.target.closest('[data-a]'); if (!b) return;
        sfx.tap();
        animal = b.dataset.a;
        el.querySelectorAll('.animal-grid button').forEach(x => x.classList.toggle('on', x === b));
      });
    },
  });
  p.animal = animal;
  p.u = Date.now();
  prog.onboarded = true;
  app.save();
  app.go(`/p/${pid}`);
}

async function kidSettings(pid) {
  const p = app.profile(pid), prog = app.prog(pid);
  const pr = { ...prog.prefs };
  let animal = p.animal;
  const ok = await openModal({
    title: 'Mes réglages',
    body: `
      <div class="field"><span class="lbl">Card style</span>
        <select class="input" id="ks-mode">
          <option value="quiz" ${pr.mode === 'quiz' ? 'selected' : ''}>Quiz — pick or type the answer (checked for you)</option>
          <option value="flip" ${pr.mode === 'flip' ? 'selected' : ''}>Classic flip cards — you grade yourself</option>
        </select></div>
      <label class="switch" style="margin-bottom:14px"><input type="checkbox" id="ks-speak" ${pr.autoSpeak ? 'checked' : ''}><span class="track"></span>Say French words out loud automatically</label>
      <label class="switch" style="margin-bottom:14px"><input type="checkbox" id="ks-sound" ${app.db.settings.sound ? 'checked' : ''}><span class="track"></span>Sound effects</label>
      <div class="field"><span class="lbl">My animal</span><div class="animal-grid">${ANIMALS.map(a => `<button type="button" data-a="${a}" class="${a === animal ? 'on' : ''}">${a}</button>`).join('')}</div></div>
      <p class="muted" style="font-size:.88rem">Words per day and the daily goal are in the grown-ups' corner.</p>`,
    actions: [{ label: 'Annuler', cls: 'ghost', value: false }, { label: 'Enregistrer', cls: 'primary', value: true }],
    onOpen(el) {
      el.querySelector('.animal-grid').addEventListener('click', ev => {
        const b = ev.target.closest('[data-a]'); if (!b) return;
        animal = b.dataset.a;
        el.querySelectorAll('.animal-grid button').forEach(x => x.classList.toggle('on', x === b));
      });
      el.querySelector('#ks-mode').addEventListener('change', ev => { pr.mode = ev.target.value; });
      el.querySelector('#ks-speak').addEventListener('change', ev => { pr.autoSpeak = ev.target.checked; });
      el.querySelector('#ks-sound').addEventListener('change', ev => { pr.sound = ev.target.checked; });
    },
  });
  if (!ok) return;
  if ('sound' in pr) { app.db.settings.sound = pr.sound; delete pr.sound; setAudioSettings(app.db.settings); }
  prog.prefs = { ...prog.prefs, ...pr };
  if (animal !== p.animal) { p.animal = animal; p.u = Date.now(); }
  app.save();
  app.go(`/p/${pid}`);
}
