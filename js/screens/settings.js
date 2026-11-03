// Le Coin des Grands: the word list editor, players, sharing, voice and backups.

import { app } from '../app.js';
import {
  upsertWord, deleteWord, moveWord, encodeWordList, decodeWordList, diffWordList, applyWordList,
  addProfile, removeProfile, resetProgress, exportBackup, parseBackup, mergeDB, defaultDB, migrate,
} from '../store.js';
import { SEED_WORDS, makeWord, parseBulk, categoriesOf, CATEGORY_EMOJI } from '../words.js';
import { genderOf } from '../answer.js';
import { e, setView, openModal, confirmModal, pinModal, hashPin, genderClass, genderTag } from '../ui.js';
import { toast } from '../fx.js';
import { frenchVoices, speak, setAudioSettings, canSpeak } from '../audio.js';
import { ANIMALS } from '../data.js';
import { avatarHtml } from '../art.js';
import { makeFamilyCode, isFamilyCode } from '../sync.js';
import { onSyncStatus, syncStatus } from '../cloud.js';

const TABS = { words: '📝 Words', players: '👪 Players', sync: '☁️ Sync', share: '🔗 Share', voice: '🔊 Sound & voice', backup: '💾 Backup' };

const EMOJI = ('👋 🙏 👍 👎 ✅ ❌ ❤️ 😀 😢 😡 😴 🤔 🥳 🐱 🐶 🐦 🐟 🐴 🐮 🐷 🐭 🐰 🦊 🐻 🐼 🐸 🐵 🦁 🐯 🐘 🦒 🐢 🐍 🦋 🐝 🐌 🐞 ' +
  '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🥕 🥔 🍅 🥖 🥐 🧀 🥚 🥛 ☕ 🍵 🧃 💧 🍰 🍫 🍦 🍕 🍔 🍟 🍝 🥗 🍲 🍽️ ' +
  '👩 👨 👧 👦 👶 👵 👴 🧑 🤝 👪 🏠 🏫 🏥 🏪 ⛪ 🏰 🌳 🌸 🌞 ☀️ 🌙 ⭐ ☁️ 🌧️ ❄️ 🌈 🔥 🌊 ⛰️ 🏖️ ' +
  '🚗 🚌 🚲 ✈️ 🚂 ⛵ 📖 ✏️ 📚 🎒 ⚽ 🎨 🎵 🎮 📱 💻 🕐 📅 🎁 🎂 👕 👖 👗 👟 🧢 👓 ' +
  '🟥 🟦 🟩 🟨 🟧 🟪 ⬛ ⬜ 🟫 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 👀 👂 👃 👄 ✋ 🦶 🧠').split(' ');

let unlocked = false;

export async function render({ params }) {
  const arg = params[1];
  const tab = TABS[arg] ? arg : 'words';
  if (app.db.settings.pin && !unlocked) {
    const pin = await pinModal();
    if (pin === null) { app.go('/'); return; }
    if ((await hashPin(pin)) !== app.db.settings.pin) { toast('Wrong code', { icon: '🔒' }); app.go('/'); return; }
    unlocked = true;
  }
  const root = setView(`
    <div class="topbar"><a class="btn small" href="#/">←</a><b>Grown-ups' corner</b><span class="muted" style="margin-left:auto">(coin des grands)</span></div>
    <h1 class="screen-title">Grown-ups' corner</h1>
    <div class="tabs">${Object.entries(TABS).map(([k, n]) => `<a class="btn small ${k === tab ? 'on' : ''}" href="#/grown-ups/${k}">${n}</a>`).join('')}</div>
    <div id="tab"></div>`);
  const el = root.querySelector('#tab');
  return ({ words: wordsTab, players: playersTab, sync: syncTab, share: shareTab, voice: voiceTab, backup: backupTab })[tab](el);
}

const rerender = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

// ---------------------------------------------------------------- words

function wordsTab(el) {
  const { db } = app;
  const cats = categoriesOf(db.words);
  el.innerHTML = `
    <div class="panel">
      <p style="margin-top:0">These are the words every player studies, in this order. <b>Editing a word keeps the kids' progress.</b> Turn a whole group off to pause it.</p>
      <div class="row">
        <button class="btn primary" id="add">＋ Add a word</button>
        <button class="btn" id="bulk">📋 Paste a list</button>
        <a class="btn" href="#/grown-ups/share">🔗 Share list</a>
      </div>
      <p class="muted" style="margin-bottom:0;font-size:.9rem">${db.words.length} words · ${cats.length} groups · <span class="g-m">blue = masculine</span> · <span class="g-f">red = feminine</span></p>
    </div>
    ${cats.map(cat => {
      const on = !db.disabledCats.includes(cat);
      const ws = db.words.filter(w => w.cat === cat);
      return `<div class="panel cat-block ${on ? '' : 'off'}">
        <div class="row between">
          <h3 style="margin:0">${CATEGORY_EMOJI[cat] || '📁'} ${e(cat)} <span class="muted" style="font-weight:400">(${ws.length})</span></h3>
          <label class="switch"><input type="checkbox" data-cat="${e(cat)}" ${on ? 'checked' : ''}><span class="track"></span>${on ? 'On' : 'Paused'}</label>
        </div>
        ${ws.map(w => `<div class="word-row">
          <span class="we">${e(w.emoji || '·')}</span>
          <div class="wt"><div class="wf ${genderClass(w)}">${e(w.fr)} ${genderTag(w)}</div><div class="wen">${e(w.en)}${w.note ? ' · 💡' : ''}</div></div>
          <div class="wactions">
            <button class="btn small icon" data-up="${e(w.id)}" aria-label="Move up">↑</button>
            <button class="btn small icon" data-down="${e(w.id)}" aria-label="Move down">↓</button>
            <button class="btn small icon" data-edit="${e(w.id)}" aria-label="Edit">✏️</button>
            <button class="btn small icon" data-del="${e(w.id)}" aria-label="Delete">🗑️</button>
          </div>
        </div>`).join('')}
      </div>`;
    }).join('')}
    <div class="panel danger-zone">
      <h3>Start the list over</h3>
      <p class="muted" style="margin-top:0">Put back the 30 starter words (custom words are removed, and so is progress on them).</p>
      <button class="btn red" id="reset-words">Restore the starter words</button>
    </div>`;

  el.querySelector('#add').addEventListener('click', () => wordForm());
  el.querySelector('#bulk').addEventListener('click', () => bulkForm());
  el.querySelector('#reset-words').addEventListener('click', async () => {
    if (!(await confirmModal('Restore the starter words?', 'This replaces the whole list with the 30 starter words. Progress on starter words is kept.', { yes: 'Restore', danger: true }))) return;
    applyWordList(db, SEED_WORDS, 'replace');
    db.disabledCats = [];
    app.save();
    toast('Starter words restored', { icon: '✅' });
    rerender();
  });
  el.addEventListener('change', ev => {
    const c = ev.target.closest('[data-cat]'); if (!c) return;
    const cat = c.dataset.cat;
    db.disabledCats = c.checked ? db.disabledCats.filter(x => x !== cat) : [...db.disabledCats, cat];
    app.save();
    rerender();
  });
  el.addEventListener('click', async ev => {
    const t = ev.target.closest('[data-edit],[data-del],[data-up],[data-down]'); if (!t) return;
    const id = t.dataset.edit || t.dataset.del || t.dataset.up || t.dataset.down;
    const w = db.words.find(x => x.id === id);
    if (t.dataset.edit) wordForm(w);
    else if (t.dataset.del) {
      if (!(await confirmModal(`Delete “${w.fr}”?`, 'The word and everyone\'s progress on it will be removed.', { yes: 'Delete', danger: true }))) return;
      deleteWord(db, id); app.save(); rerender();
    } else {
      // Move within its group: swap with the nearest word of the same group.
      const sameCat = db.words.filter(x => x.cat === w.cat);
      const i = sameCat.indexOf(w);
      const other = sameCat[i + (t.dataset.up ? -1 : 1)];
      if (!other) return;
      const delta = db.words.indexOf(other) - db.words.indexOf(w);
      moveWord(db, id, delta);
      app.save(); rerender();
    }
  });
}

function emojiPalette() {
  return `<div class="emoji-pal">${EMOJI.map(x => `<button type="button" data-emo="${x}">${x}</button>`).join('')}</div>`;
}

async function wordForm(word = null) {
  const { db } = app;
  const cats = categoriesOf(db.words);
  const v = word ? { ...word } : { fr: '', en: '', emoji: '', cat: cats[cats.length - 1] || 'Mes mots', g: '', note: '' };
  const ok = await openModal({
    title: word ? 'Edit word' : 'Add a word',
    body: `
      <div class="field"><label for="wf-fr">French (with le / la / l' / un / une for nouns)</label><input class="input" id="wf-fr" lang="fr" value="${e(v.fr)}" placeholder="le chat"></div>
      <div class="field"><label for="wf-en">English</label><input class="input" id="wf-en" value="${e(v.en)}" placeholder="cat"><span class="hint">Several right answers? Separate them with “/”: mother / mom</span></div>
      <div class="grid2">
        <div class="field"><label for="wf-emo">Picture (emoji)</label><input class="input" id="wf-emo" value="${e(v.emoji || '')}" placeholder="🐱" style="font-size:1.4rem"></div>
        <div class="field"><label for="wf-g">Gender</label><select class="input" id="wf-g">
          <option value="">Auto / none</option><option value="m" ${v.g === 'm' ? 'selected' : ''}>Masculine (blue)</option><option value="f" ${v.g === 'f' ? 'selected' : ''}>Feminine (red)</option>
        </select><span class="hint" id="wf-ghint"></span></div>
      </div>
      ${emojiPalette()}
      <div class="field" style="margin-top:12px"><label for="wf-cat">Group</label><input class="input" id="wf-cat" list="wf-cats" value="${e(v.cat)}"><datalist id="wf-cats">${cats.map(c => `<option value="${e(c)}">`).join('')}</datalist><span class="hint">Type a new name to start a new group (e.g. “Semaine 2”).</span></div>
      <div class="field"><label for="wf-note">Tip (optional)</label><input class="input" id="wf-note" value="${e(v.note || '')}" placeholder="The t is silent!"></div>
      ${canSpeak() ? '<button type="button" class="btn small" id="wf-say">🔊 Listen</button>' : ''}`,
    actions: [{ label: 'Cancel', cls: 'ghost', value: false }, { label: word ? 'Save' : 'Add', cls: 'primary', value: true }],
    onOpen(m) {
      const fr = m.querySelector('#wf-fr'), g = m.querySelector('#wf-g'), hint = m.querySelector('#wf-ghint');
      const upd = () => {
        const auto = genderOf(fr.value, null);
        hint.textContent = auto ? `Detected: ${auto === 'm' ? 'masculine' : 'feminine'}` : /^l['’]/i.test(fr.value.trim()) ? "l' hides the gender: pick it!" : '';
      };
      fr.addEventListener('input', upd); upd();
      m.querySelector('.emoji-pal').addEventListener('click', ev => { const b = ev.target.closest('[data-emo]'); if (b) m.querySelector('#wf-emo').value = b.dataset.emo; });
      m.querySelector('#wf-say')?.addEventListener('click', () => speak(fr.value));
      m.addEventListener('input', () => {
        v.fr = fr.value; v.en = m.querySelector('#wf-en').value; v.emoji = m.querySelector('#wf-emo').value;
        v.cat = m.querySelector('#wf-cat').value; v.note = m.querySelector('#wf-note').value;
      });
      m.addEventListener('change', () => { v.g = g.value; v.emoji = m.querySelector('#wf-emo').value; });
      m.querySelector('.emoji-pal').addEventListener('click', () => { v.emoji = m.querySelector('#wf-emo').value; });
    },
  });
  if (!ok) return;
  if (!v.fr.trim() || !v.en.trim()) { toast('French and English are both needed', { icon: '⚠️' }); return; }
  if (word) {
    const w = { ...word, fr: v.fr.trim(), en: v.en.trim(), emoji: v.emoji.trim(), cat: v.cat.trim() || word.cat };
    const g = genderOf(w.fr, v.g || null);
    if (g) w.g = g; else delete w.g;
    if (v.note && v.note.trim()) w.note = v.note.trim(); else delete w.note;
    upsertWord(db, w);
    toast('Word saved', { sub: w.fr, icon: '✏️' });
  } else {
    const w = makeWord({ fr: v.fr, en: v.en, emoji: v.emoji, g: v.g || null, cat: v.cat, note: v.note });
    if (db.words.some(x => x.fr.trim().toLowerCase() === w.fr.toLowerCase())) { toast('This word is already in the list', { icon: '⚠️' }); return; }
    upsertWord(db, w);
    toast('Word added!', { sub: w.fr, icon: '✨' });
  }
  app.save();
  rerender();
}

async function bulkForm() {
  const { db } = app;
  let text = '', cat = 'Semaine ' + (categoriesOf(db.words).filter(c => /^Semaine/.test(c)).length + 2);
  const ok = await openModal({
    title: 'Paste a list',
    body: `<p style="margin-top:0">One word per line. Any of these work:</p>
      <pre class="share-box" style="white-space:pre-wrap;margin:0 0 10px">la lune = moon 🌙
le soleil ; sun ; ☀️
l'arbre - tree
manger, to eat</pre>
      <div class="field"><label for="bk-text">Words</label><textarea class="input" id="bk-text" lang="fr" placeholder="la lune = moon 🌙"></textarea></div>
      <div class="field"><label for="bk-cat">Group for these words</label><input class="input" id="bk-cat" value="${e(cat)}"></div>
      <p id="bk-prev" class="muted"></p>
      <p class="muted" style="font-size:.85rem">Tip: for l' words the gender can't be guessed — edit them afterwards to pick masculine or feminine.</p>`,
    actions: [{ label: 'Cancel', cls: 'ghost', value: false }, { label: 'Add', cls: 'primary', value: true }],
    onOpen(m) {
      const ta = m.querySelector('#bk-text'), ci = m.querySelector('#bk-cat'), pv = m.querySelector('#bk-prev');
      const upd = () => {
        text = ta.value; cat = ci.value;
        const { words, errors } = parseBulk(text, cat);
        pv.innerHTML = `${words.length} word${words.length === 1 ? '' : 's'} ready${errors.length ? ` · <span style="color:var(--rouge)">${errors.length} line(s) not understood: ${e(errors.slice(0, 3).join(' | '))}</span>` : ''}`;
      };
      ta.addEventListener('input', upd); ci.addEventListener('input', upd);
    },
  });
  if (!ok) return;
  const { words } = parseBulk(text, cat.trim() || 'Mes mots');
  let added = 0, skipped = 0;
  for (const d of words) {
    if (db.words.some(x => x.fr.trim().toLowerCase() === d.fr.trim().toLowerCase())) { skipped++; continue; }
    upsertWord(db, makeWord(d));
    added++;
  }
  app.save();
  toast(`${added} word${added === 1 ? '' : 's'} added`, { sub: skipped ? `${skipped} already in the list` : '', icon: '✨' });
  rerender();
}

// ---------------------------------------------------------------- players

function playersTab(el) {
  const { db } = app;
  el.innerHTML = db.profiles.map(p => {
    const pr = app.prog(p.id).prefs;
    return `<div class="panel" data-pid="${e(p.id)}">
      <div class="row">${avatarHtml(p, app.prog(p.id), 'md')}<h3 style="margin:0" class="grow">${e(p.name)}</h3>
        <button class="btn small" data-act="rename">✏️ Rename</button></div>
      <div class="grid2" style="margin-top:12px">
        <div class="field"><label>New words per day</label><select class="input" data-pref="newPerDay">${[0, 2, 3, 4, 5, 6, 8, 10, 15].map(n => `<option ${n === pr.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="hint">5 is a good pace. 0 = only review.</span></div>
        <div class="field"><label>Daily goal (points)</label><select class="input" data-pref="goal">${[10, 15, 20, 30, 40].map(n => `<option ${n === pr.goal ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="hint">1 point per right answer (½ in games). Clearing all due cards also counts.</span></div>
        <div class="field"><label>Card style</label><select class="input" data-pref="mode"><option value="quiz" ${pr.mode === 'quiz' ? 'selected' : ''}>Quiz (auto-checked)</option><option value="flip" ${pr.mode === 'flip' ? 'selected' : ''}>Flip cards (self-graded)</option></select><span class="hint">Quiz checks answers for them. Flip cards are on the honor system.</span></div>
      </div>
      <div class="row">
        <button class="btn small" data-act="reset">↺ Reset progress</button>
        <button class="btn small red" data-act="delete">🗑️ Remove player</button>
      </div>
    </div>`;
  }).join('') + `<div class="panel"><button class="btn primary" id="add-p">＋ Add a player</button></div>`;

  el.addEventListener('change', ev => {
    const s = ev.target.closest('[data-pref]'); if (!s) return;
    const pid = s.closest('[data-pid]').dataset.pid;
    const k = s.dataset.pref;
    app.prog(pid).prefs[k] = k === 'mode' ? s.value : +s.value;
    app.save();
    toast('Saved', { icon: '✅', ms: 1500 });
  });
  el.addEventListener('click', async ev => {
    if (ev.target.closest('#add-p')) {
      const { newPlayer } = await import('./home.js');
      newPlayer();
      return;
    }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const pid = b.closest('[data-pid]').dataset.pid;
    const p = app.profile(pid);
    if (b.dataset.act === 'rename') {
      let name = p.name;
      const ok = await openModal({
        title: 'Rename', body: `<input class="input" id="rn" value="${e(p.name)}" maxlength="20">`,
        actions: [{ label: 'Cancel', cls: 'ghost', value: false }, { label: 'OK', cls: 'primary', value: true }],
        onOpen(m) { m.querySelector('#rn').addEventListener('input', ev2 => { name = ev2.target.value; }); },
      });
      if (ok && name.trim()) { p.name = name.trim(); p.u = Date.now(); app.save(); rerender(); }
    } else if (b.dataset.act === 'reset') {
      if (await confirmModal(`Reset ${p.name}?`, 'All their progress, XP, croissants, trophies and items will be wiped. This can\'t be undone (unless you have a backup).', { yes: 'Reset', danger: true })) {
        resetProgress(app.db, pid); app.save(); rerender();
      }
    } else if (b.dataset.act === 'delete') {
      if (await confirmModal(`Remove ${p.name}?`, 'The player and all their progress will be deleted from this device.', { yes: 'Remove', danger: true })) {
        removeProfile(app.db, pid); app.save(); rerender();
      }
    }
  });
}

// ---------------------------------------------------------------- family sync

export function syncStatusText(s, db = app.db) {
  if (!db.sync) return '☁️ Sync is off';
  if (s.status === 'syncing') return '⏳ Syncing…';
  if (s.status === 'offline') return '📴 Offline — will sync when back online';
  if (s.status === 'error') return `⚠️ Sync problem: ${s.error || 'unknown'} — will retry`;
  const last = db.sync.last;
  if (!last) return '☁️ Not synced yet';
  const mins = Math.round((Date.now() - last) / 60000);
  return `✅ Synced ${mins < 1 ? 'just now' : `${mins} min ago`}`;
}

function joinUrl(code) {
  return `${location.origin}${location.pathname}#join=${code}`;
}

function syncTab(el) {
  const s = app.db.sync;
  if (!s) {
    el.innerHTML = `
      <div class="panel">
        <h3>☁️ Family sync</h3>
        <p style="margin-top:0">Turn this on to share <b>everything</b> — the kids' progress, XP, croissants, trophies and Mamou's word list — between all your devices (iPad, phone, laptop…). It updates by itself whenever the app is open.</p>
        <p class="muted" style="font-size:.9rem">Your family gets a secret code. Only devices that know the code can see the data. Nothing is ever lost: this device keeps its own copy too.</p>
        <button class="btn primary big" id="create">☁️ Turn on family sync</button>
      </div>
      <div class="panel">
        <h3>Already on another device?</h3>
        <p style="margin-top:0" class="muted">Open the join link from the other device here — or paste the family code:</p>
        <input class="input" id="code" placeholder="mamou-xxxxx-xxxxx-xxxxx-xxxxx" autocapitalize="off" autocomplete="off" spellcheck="false">
        <button class="btn" id="join" style="margin-top:10px">Join</button>
      </div>`;
    el.querySelector('#create').addEventListener('click', async () => {
      app.db.sync = { code: makeFamilyCode(), base: null, last: null };
      app.save();
      const r = await app.sync();
      if (r.ok) toast('Family sync is on!', { sub: 'Now open the join link on your other devices', icon: '☁️', gold: true });
      else toast('Could not reach the cloud yet', { sub: 'It will keep trying', icon: '⚠️' });
      rerender();
    });
    el.querySelector('#join').addEventListener('click', () => {
      const v = el.querySelector('#code').value.trim();
      handleJoinLink(v.includes('join=') ? v.split('join=')[1] : v, { stay: true });
    });
    return;
  }

  const url = joinUrl(s.code);
  el.innerHTML = `
    <div class="panel">
      <h3>☁️ Family sync</h3>
      <p id="sync-status" style="font-weight:600;margin-top:0"></p>
      <button class="btn primary" id="now">🔄 Sync now</button>
    </div>
    <div class="panel">
      <h3>Add another device</h3>
      <p style="margin-top:0">Open this link on the other device (text or email it to yourself). Keep it in the family — anyone with it can see and change the kids' progress.</p>
      <div class="share-box" id="url">${e(url)}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" id="copy">📋 Copy link</button>
        ${navigator.share ? '<button class="btn" id="native">📤 Share…</button>' : ''}
      </div>
      <p class="muted" style="font-size:.85rem">Family code: <code>${e(s.code)}</code></p>
    </div>
    <div class="panel danger-zone">
      <h3>Stop syncing on this device</h3>
      <p style="margin-top:0" class="muted">This device keeps everything it has now but stops sharing. Other devices carry on.</p>
      <button class="btn red" id="leave">Stop syncing here</button>
    </div>`;
  const off = onSyncStatus(st => { const p = el.querySelector('#sync-status'); if (p) p.textContent = syncStatusText(st); });
  const tick = setInterval(() => { const p = el.querySelector('#sync-status'); if (p) p.textContent = syncStatusText(syncStatus()); }, 30000);
  el.querySelector('#now').addEventListener('click', async () => {
    const r = await app.sync();
    toast(r.ok ? (r.changed ? 'Synced — new changes arrived' : 'Synced — already up to date') : 'Sync failed — will retry', { icon: r.ok ? '✅' : '⚠️' });
  });
  el.querySelector('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied!', { icon: '📋' }); }
    catch { toast('Select the link and copy it', { icon: '📋' }); }
  });
  el.querySelector('#native')?.addEventListener('click', () => navigator.share({ title: 'Les Cartes de Mamou — family sync', url }).catch(() => {}));
  el.querySelector('#leave').addEventListener('click', async () => {
    if (!(await confirmModal('Stop syncing on this device?', 'This device stops sharing progress. You can join again later with the link.', { yes: 'Stop syncing', danger: true }))) return;
    app.db.sync = null; app.save(); rerender();
  });
  return () => { off(); clearInterval(tick); };
}

/** Called by the router for #join=<code> links (and the paste box). */
export async function handleJoinLink(code, { stay = false } = {}) {
  code = decodeURIComponent(String(code || '')).trim();
  if (!stay) history.replaceState(null, '', location.pathname + '#/');
  if (!isFamilyCode(code)) {
    toast('That family code doesn\'t look right', { icon: '⚠️' });
    if (!stay) app.go('/');
    return;
  }
  if (app.db.sync && app.db.sync.code === code) {
    toast('This device is already in the family', { icon: '☁️' });
    if (!stay) app.go('/'); else rerender();
    return;
  }
  const ok = await confirmModal('☁️ Join the family?', 'This device will share progress, trophies and words with your other devices. Anything already on this device is combined with the family\'s — nothing is lost.', { yes: 'Join', no: 'Cancel' });
  if (!ok) { if (!stay) app.go('/'); return; }
  app.db.sync = { code, base: null, last: null };
  app.save();
  const r = await app.sync();
  toast(r.ok ? 'Joined the family!' : 'Joined — waiting for the connection', { sub: r.ok ? 'Progress is now shared' : 'It will sync when online', icon: '☁️', gold: r.ok });
  if (!stay) app.go('/'); else rerender();
}

// ---------------------------------------------------------------- sharing

function shareUrl() {
  const base = location.origin + location.pathname;
  return `${base}#import=${encodeWordList(app.db.words)}`;
}

function shareTab(el) {
  const url = shareUrl();
  el.innerHTML = `
    <div class="panel">
      ${app.db.sync ? '<p style="margin-top:0;background:var(--vert-light);border:2px solid var(--line);border-radius:12px;padding:8px 12px">☁️ Family sync is on, so word changes reach your other devices by themselves. Use this link only for devices outside the family.</p>' : ''}
      <h3>Send this word list to another device</h3>
      <p style="margin-top:0">Edit the words on one device (say, Mamou's phone), then send this link to the kids by text or email. Opening it offers to import the words. <b>Progress stays on each device</b> — only the word list travels.</p>
      <div class="share-box" id="url">${e(url)}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" id="copy">📋 Copy link</button>
        ${navigator.share ? '<button class="btn" id="native">📤 Share…</button>' : ''}
      </div>
      <p class="muted" style="font-size:.85rem">${app.db.words.length} words · ${url.length} characters</p>
    </div>
    <div class="panel">
      <h3>Received a link or code?</h3>
      <p style="margin-top:0" class="muted">Just open the link on this device. Or paste it here:</p>
      <textarea class="input" id="paste" placeholder="https://…#import=…" style="min-height:80px"></textarea>
      <button class="btn primary" id="do-import" style="margin-top:10px">Import</button>
    </div>`;
  el.querySelector('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied!', { icon: '📋' }); }
    catch {
      const r = document.createRange(); r.selectNodeContents(el.querySelector('#url'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      toast('Select the text and copy it', { icon: '📋' });
    }
  });
  el.querySelector('#native')?.addEventListener('click', () => {
    navigator.share({ title: 'Les Cartes de Mamou — word list', text: 'New French words from Mamou!', url }).catch(() => {});
  });
  el.querySelector('#do-import').addEventListener('click', () => {
    const v = el.querySelector('#paste').value.trim();
    const code = v.includes('import=') ? v.split('import=')[1] : v;
    if (code) handleImportLink(code, { stay: true });
  });
}

/** Called by the router for #import=... links (and by the paste box). */
export async function handleImportLink(code, { stay = false } = {}) {
  let incoming;
  try { incoming = decodeWordList(decodeURIComponent(code.trim())); }
  catch {
    toast('This link doesn\'t look right', { sub: 'Could not read the word list', icon: '⚠️' });
    if (!stay) { history.replaceState(null, '', location.pathname + '#/'); app.go('/'); }
    return;
  }
  if (!stay) history.replaceState(null, '', location.pathname + '#/');
  const d = diffWordList(app.db, incoming);
  const list = (arr, f) => arr.slice(0, 12).map(f).join(', ') + (arr.length > 12 ? '…' : '');
  const choice = await openModal({
    title: '📬 New words!',
    body: `<p>This link has <b>${incoming.length} words</b>.</p>
      <ul style="padding-left:20px">
        <li><b>${d.added.length}</b> new${d.added.length ? `: ${list(d.added, w => `${e(w.emoji || '')} ${e(w.fr)}`)}` : ''}</li>
        <li><b>${d.updated.length}</b> changed${d.updated.length ? `: ${list(d.updated, u => e(u.theirs.fr))}` : ''}</li>
        <li><b>${d.same.length}</b> already the same</li>
        ${d.missing.length ? `<li><b>${d.missing.length}</b> words here aren't in the link</li>` : ''}
      </ul>
      <p class="muted" style="font-size:.9rem"><b>Add &amp; update</b> keeps everything you have. <b>Replace</b> makes this device's list exactly match the link (and drops progress on the removed words).</p>`,
    actions: [
      { label: 'Cancel', cls: 'ghost', value: null },
      ...(d.missing.length ? [{ label: 'Replace', cls: 'red', value: 'replace' }] : []),
      { label: 'Add & update', cls: 'primary', value: 'merge' },
    ],
  });
  if (choice) {
    const r = applyWordList(app.db, incoming, choice);
    app.save();
    toast('Words imported!', { sub: `${r.added} added · ${r.updated} updated${r.removed ? ` · ${r.removed} removed` : ''}`, icon: '📬', gold: true });
  }
  if (stay) rerender(); else app.go('/');
}

// ---------------------------------------------------------------- voice & sound & PIN

function voiceTab(el) {
  const s = app.db.settings;
  const voices = frenchVoices();
  el.innerHTML = `
    <div class="panel">
      <h3>French voice</h3>
      ${voices.length ? `
        <div class="field"><label for="vc">Voice</label><select class="input" id="vc">${voices.map(v => `<option value="${e(v.voiceURI)}" ${v.voiceURI === s.voice ? 'selected' : ''}>${e(v.name)} (${e(v.lang)})</option>`).join('')}</select></div>
        <div class="field"><label for="rt">Speed: <span id="rtv">${s.rate}</span></label><input type="range" id="rt" min="0.5" max="1.2" step="0.05" value="${s.rate}"></div>
        <button class="btn" id="test">🔊 Test the voice</button>`
      : `<p>No French voice was found on this device, so the 🔊 buttons are hidden. On iPhone/iPad: Settings → Accessibility → Spoken Content → Voices → French. On Windows: Settings → Time & language → Speech → Add voices → Français. Then reload.</p>`}
    </div>
    <div class="panel">
      <h3>Sounds</h3>
      <label class="switch"><input type="checkbox" id="snd" ${s.sound ? 'checked' : ''}><span class="track"></span>Sound effects</label>
    </div>
    <div class="panel">
      <h3>🔒 Grown-ups' code (optional)</h3>
      <p class="muted" style="margin-top:0">A 4-digit code to keep curious fingers out of this corner. ${s.pin ? '<b>A code is set.</b>' : 'No code set.'}</p>
      <div class="row"><button class="btn" id="setpin">${s.pin ? 'Change code' : 'Set a code'}</button>${s.pin ? '<button class="btn red" id="clearpin">Remove code</button>' : ''}</div>
    </div>`;
  const save = () => { setAudioSettings(s); app.save(); };
  el.querySelector('#vc')?.addEventListener('change', ev => { s.voice = ev.target.value; save(); speak('Bonjour !'); });
  el.querySelector('#rt')?.addEventListener('input', ev => { s.rate = +ev.target.value; el.querySelector('#rtv').textContent = s.rate; save(); });
  el.querySelector('#test')?.addEventListener('click', () => speak("Bonjour, je m'appelle Monsieur Croissant !"));
  el.querySelector('#snd').addEventListener('change', ev => { s.sound = ev.target.checked; save(); });
  el.querySelector('#setpin').addEventListener('click', async () => {
    const a = await pinModal('New code');
    if (!a) return;
    const b = await pinModal('Enter it again');
    if (a !== b) { toast('Codes didn\'t match', { icon: '⚠️' }); return; }
    s.pin = await hashPin(a); unlocked = true; app.save();
    toast('Code saved', { icon: '🔒' }); rerender();
  });
  el.querySelector('#clearpin')?.addEventListener('click', () => { s.pin = null; app.save(); toast('Code removed', { icon: '🔓' }); rerender(); });
}

// ---------------------------------------------------------------- backup

function backupTab(el) {
  el.innerHTML = `
    <div class="panel">
      <h3>Back up</h3>
      <p style="margin-top:0">Progress lives in this browser on this device. Download a backup now and then — or use it to move progress to another device.</p>
      <button class="btn primary" id="dl">💾 Download backup</button>
    </div>
    <div class="panel">
      <h3>Restore</h3>
      <p style="margin-top:0">Load a backup file. <b>Merge</b> combines it with what's here (newest progress wins for each card). <b>Replace</b> throws away what's here.</p>
      <input type="file" id="file" accept=".json,application/json" class="input">
    </div>
    <div class="panel danger-zone">
      <h3>Erase everything</h3>
      <p style="margin-top:0" class="muted">Delete everything on this device and start over with the starter words.</p>
      <button class="btn red" id="wipe">Erase everything</button>
    </div>`;
  el.querySelector('#dl').addEventListener('click', () => {
    const blob = new Blob([exportBackup(app.db)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cartes-de-mamou-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  el.querySelector('#file').addEventListener('change', async ev => {
    const f = ev.target.files[0]; if (!f) return;
    let other;
    try { other = parseBackup(await f.text()); }
    catch { toast('Not a backup file', { icon: '⚠️' }); return; }
    const choice = await openModal({
      title: 'Restore backup',
      body: `<p>Backup has ${other.profiles.length} player(s) (${other.profiles.map(p => e(p.name)).join(', ')}) and ${other.words.length} words.</p>`,
      actions: [{ label: 'Cancel', cls: 'ghost', value: null }, { label: 'Replace', cls: 'red', value: 'replace' }, { label: 'Merge', cls: 'primary', value: 'merge' }],
    });
    if (!choice) return;
    app.db = choice === 'merge' ? mergeDB(app.db, other) : migrate(other);
    setAudioSettings(app.db.settings);
    app.save();
    toast('Backup restored!', { icon: '💾', gold: true });
    rerender();
  });
  el.querySelector('#wipe').addEventListener('click', async () => {
    if (!(await confirmModal('Erase everything?', 'Every player, all progress and the word list will be deleted from this device.', { yes: 'Erase everything', danger: true }))) return;
    app.db = defaultDB();
    app.save();
    app.go('/');
  });
}
