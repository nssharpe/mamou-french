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

const TABS = { words: '📝 Mots', players: '👪 Joueurs', share: '🔗 Partager', voice: '🔊 Son & voix', backup: '💾 Sauvegarde' };

const EMOJI = ('👋 🙏 👍 👎 ✅ ❌ ❤️ 😀 😢 😡 😴 🤔 🥳 🐱 🐶 🐦 🐟 🐴 🐮 🐷 🐭 🐰 🦊 🐻 🐼 🐸 🐵 🦁 🐯 🐘 🦒 🐢 🐍 🦋 🐝 🐌 🐞 ' +
  '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🥕 🥔 🍅 🥖 🥐 🧀 🥚 🥛 ☕ 🍵 🧃 💧 🍰 🍫 🍦 🍕 🍔 🍟 🍝 🥗 🍲 🍽️ ' +
  '👩 👨 👧 👦 👶 👵 👴 🧑 🤝 👪 🏠 🏫 🏥 🏪 ⛪ 🏰 🌳 🌸 🌞 ☀️ 🌙 ⭐ ☁️ 🌧️ ❄️ 🌈 🔥 🌊 ⛰️ 🏖️ ' +
  '🚗 🚌 🚲 ✈️ 🚂 ⛵ 📖 ✏️ 📚 🎒 ⚽ 🎨 🎵 🎮 📱 💻 🕐 📅 🎁 🎂 👕 👖 👗 👟 🧢 👓 ' +
  '🟥 🟦 🟩 🟨 🟧 🟪 ⬛ ⬜ 🟫 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 👀 👂 👃 👄 ✋ 🦶 🧠').split(' ');

let unlocked = false;

export async function render({ arg }) {
  const tab = TABS[arg] ? arg : 'words';
  if (app.db.settings.pin && !unlocked) {
    const pin = await pinModal();
    if (pin === null) { app.go('/'); return; }
    if ((await hashPin(pin)) !== app.db.settings.pin) { toast('Mauvais code', { sub: 'Wrong code', icon: '🔒' }); app.go('/'); return; }
    unlocked = true;
  }
  const root = setView(`
    <div class="topbar"><a class="btn small" href="#/">←</a><b>Coin des grands</b><span class="muted" style="margin-left:auto">(grown-ups' corner)</span></div>
    <h1 class="screen-title">Coin des grands</h1>
    <div class="tabs">${Object.entries(TABS).map(([k, n]) => `<a class="btn small ${k === tab ? 'on' : ''}" href="#/grown-ups/${k}">${n}</a>`).join('')}</div>
    <div id="tab"></div>`);
  const el = root.querySelector('#tab');
  ({ words: wordsTab, players: playersTab, share: shareTab, voice: voiceTab, backup: backupTab })[tab](el);
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
        <button class="btn primary" id="add">＋ Ajouter un mot</button>
        <button class="btn" id="bulk">📋 Coller une liste (paste many)</button>
        <a class="btn" href="#/grown-ups/share">🔗 Partager</a>
      </div>
      <p class="muted" style="margin-bottom:0;font-size:.9rem">${db.words.length} words · ${cats.length} groups · <span class="g-m">bleu = masculin</span> · <span class="g-f">rouge = féminin</span></p>
    </div>
    ${cats.map(cat => {
      const on = !db.disabledCats.includes(cat);
      const ws = db.words.filter(w => w.cat === cat);
      return `<div class="panel cat-block ${on ? '' : 'off'}">
        <div class="row between">
          <h3 style="margin:0">${CATEGORY_EMOJI[cat] || '📁'} ${e(cat)} <span class="muted" style="font-weight:400">(${ws.length})</span></h3>
          <label class="switch"><input type="checkbox" data-cat="${e(cat)}" ${on ? 'checked' : ''}><span class="track"></span>${on ? 'Actif' : 'En pause'}</label>
        </div>
        ${ws.map(w => `<div class="word-row">
          <span class="we">${e(w.emoji || '·')}</span>
          <div class="wt"><div class="wf ${genderClass(w)}">${e(w.fr)} ${genderTag(w)}</div><div class="wen">${e(w.en)}${w.note ? ' · 💡' : ''}</div></div>
          <button class="btn small icon" data-up="${e(w.id)}" aria-label="Monter">↑</button>
          <button class="btn small icon" data-down="${e(w.id)}" aria-label="Descendre">↓</button>
          <button class="btn small icon" data-edit="${e(w.id)}" aria-label="Modifier">✏️</button>
          <button class="btn small icon" data-del="${e(w.id)}" aria-label="Supprimer">🗑️</button>
        </div>`).join('')}
      </div>`;
    }).join('')}
    <div class="panel danger-zone">
      <h3>Recommencer la liste</h3>
      <p class="muted" style="margin-top:0">Put back the 30 starter words (custom words are removed, and so is progress on them).</p>
      <button class="btn red" id="reset-words">Remettre les mots de départ</button>
    </div>`;

  el.querySelector('#add').addEventListener('click', () => wordForm());
  el.querySelector('#bulk').addEventListener('click', () => bulkForm());
  el.querySelector('#reset-words').addEventListener('click', async () => {
    if (!(await confirmModal('Remettre les mots de départ ?', 'This replaces the whole list with the 30 starter words. Progress on starter words is kept.', { yes: 'Remettre', danger: true }))) return;
    applyWordList(db, SEED_WORDS, 'replace');
    db.disabledCats = [];
    app.save();
    toast('Liste remise à zéro', { icon: '✅' });
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
      if (!(await confirmModal(`Supprimer « ${w.fr} » ?`, 'The word and everyone\'s progress on it will be removed.', { yes: 'Supprimer', danger: true }))) return;
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
    title: word ? 'Modifier le mot' : 'Ajouter un mot',
    body: `
      <div class="field"><label for="wf-fr">Français (with le / la / l' / un / une for nouns)</label><input class="input" id="wf-fr" lang="fr" value="${e(v.fr)}" placeholder="le chat"></div>
      <div class="field"><label for="wf-en">English</label><input class="input" id="wf-en" value="${e(v.en)}" placeholder="cat"><span class="hint">Several right answers? Separate them with “/”: mother / mom</span></div>
      <div class="grid2">
        <div class="field"><label for="wf-emo">Picture (emoji)</label><input class="input" id="wf-emo" value="${e(v.emoji || '')}" placeholder="🐱" style="font-size:1.4rem"></div>
        <div class="field"><label for="wf-g">Gender</label><select class="input" id="wf-g">
          <option value="">Auto / none</option><option value="m" ${v.g === 'm' ? 'selected' : ''}>Masculin (blue)</option><option value="f" ${v.g === 'f' ? 'selected' : ''}>Féminin (red)</option>
        </select><span class="hint" id="wf-ghint"></span></div>
      </div>
      ${emojiPalette()}
      <div class="field" style="margin-top:12px"><label for="wf-cat">Group</label><input class="input" id="wf-cat" list="wf-cats" value="${e(v.cat)}"><datalist id="wf-cats">${cats.map(c => `<option value="${e(c)}">`).join('')}</datalist><span class="hint">Type a new name to start a new group (e.g. “Semaine 2”).</span></div>
      <div class="field"><label for="wf-note">Tip (optional)</label><input class="input" id="wf-note" value="${e(v.note || '')}" placeholder="The t is silent!"></div>
      ${canSpeak() ? '<button type="button" class="btn small" id="wf-say">🔊 Écouter</button>' : ''}`,
    actions: [{ label: 'Annuler', cls: 'ghost', value: false }, { label: word ? 'Enregistrer' : 'Ajouter', cls: 'primary', value: true }],
    onOpen(m) {
      const fr = m.querySelector('#wf-fr'), g = m.querySelector('#wf-g'), hint = m.querySelector('#wf-ghint');
      const upd = () => {
        const auto = genderOf(fr.value, null);
        hint.textContent = auto ? `Detected: ${auto === 'm' ? 'masculin' : 'féminin'}` : /^l['’]/i.test(fr.value.trim()) ? "l' hides the gender: pick it!" : '';
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
    toast('Mot modifié', { sub: w.fr, icon: '✏️' });
  } else {
    const w = makeWord({ fr: v.fr, en: v.en, emoji: v.emoji, g: v.g || null, cat: v.cat, note: v.note });
    if (db.words.some(x => x.fr.trim().toLowerCase() === w.fr.toLowerCase())) { toast('This word is already in the list', { icon: '⚠️' }); return; }
    upsertWord(db, w);
    toast('Mot ajouté !', { sub: w.fr, icon: '✨' });
  }
  app.save();
  rerender();
}

async function bulkForm() {
  const { db } = app;
  let text = '', cat = 'Semaine ' + (categoriesOf(db.words).filter(c => /^Semaine/.test(c)).length + 2);
  const ok = await openModal({
    title: 'Coller une liste',
    body: `<p style="margin-top:0">One word per line. Any of these work:</p>
      <pre class="share-box" style="white-space:pre-wrap;margin:0 0 10px">la lune = moon 🌙
le soleil ; sun ; ☀️
l'arbre - tree
manger, to eat</pre>
      <div class="field"><label for="bk-text">Words</label><textarea class="input" id="bk-text" lang="fr" placeholder="la lune = moon 🌙"></textarea></div>
      <div class="field"><label for="bk-cat">Group for these words</label><input class="input" id="bk-cat" value="${e(cat)}"></div>
      <p id="bk-prev" class="muted"></p>
      <p class="muted" style="font-size:.85rem">Tip: for l' words the gender can't be guessed — edit them afterwards to pick masculin/féminin.</p>`,
    actions: [{ label: 'Annuler', cls: 'ghost', value: false }, { label: 'Ajouter', cls: 'primary', value: true }],
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
  toast(`${added} mot${added === 1 ? '' : 's'} ajouté${added === 1 ? '' : 's'}`, { sub: skipped ? `${skipped} already in the list` : 'Words added', icon: '✨' });
  rerender();
}

// ---------------------------------------------------------------- players

function playersTab(el) {
  const { db } = app;
  el.innerHTML = db.profiles.map(p => {
    const pr = app.prog(p.id).prefs;
    return `<div class="panel" data-pid="${e(p.id)}">
      <div class="row">${avatarHtml(p, app.prog(p.id), 'md')}<h3 style="margin:0" class="grow">${e(p.name)}</h3>
        <button class="btn small" data-act="rename">✏️ Renommer</button></div>
      <div class="grid2" style="margin-top:12px">
        <div class="field"><label>New words per day</label><select class="input" data-pref="newPerDay">${[0, 2, 3, 4, 5, 6, 8, 10, 15].map(n => `<option ${n === pr.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="hint">5 is a good pace. 0 = only review.</span></div>
        <div class="field"><label>Daily goal (points)</label><select class="input" data-pref="goal">${[10, 15, 20, 30, 40].map(n => `<option ${n === pr.goal ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="hint">1 point per card, ½ per game answer. Clearing all due cards also counts.</span></div>
        <div class="field"><label>Card style</label><select class="input" data-pref="mode"><option value="quiz" ${pr.mode === 'quiz' ? 'selected' : ''}>Quiz (auto-checked)</option><option value="flip" ${pr.mode === 'flip' ? 'selected' : ''}>Flip cards (self-graded)</option></select></div>
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
    toast('Enregistré', { icon: '✅', ms: 1500 });
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
        title: 'Renommer', body: `<input class="input" id="rn" value="${e(p.name)}" maxlength="20">`,
        actions: [{ label: 'Annuler', cls: 'ghost', value: false }, { label: 'OK', cls: 'primary', value: true }],
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

// ---------------------------------------------------------------- sharing

function shareUrl() {
  const base = location.href.split('#')[0];
  return `${base}#import=${encodeWordList(app.db.words)}`;
}

function shareTab(el) {
  const url = shareUrl();
  el.innerHTML = `
    <div class="panel">
      <h3>Send this word list to another device</h3>
      <p style="margin-top:0">Edit the words on one device (say, Mamou's phone), then send this link to the kids by text or email. Opening it offers to import the words. <b>Progress stays on each device</b> — only the word list travels.</p>
      <div class="share-box" id="url">${e(url)}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" id="copy">📋 Copier le lien</button>
        ${navigator.share ? '<button class="btn" id="native">📤 Partager…</button>' : ''}
      </div>
      <p class="muted" style="font-size:.85rem">${app.db.words.length} words · ${url.length} characters</p>
    </div>
    <div class="panel">
      <h3>Received a link or code?</h3>
      <p style="margin-top:0" class="muted">Just open the link on this device. Or paste it here:</p>
      <textarea class="input" id="paste" placeholder="https://…#import=…" style="min-height:80px"></textarea>
      <button class="btn primary" id="do-import" style="margin-top:10px">Importer</button>
    </div>`;
  el.querySelector('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Lien copié !', { icon: '📋' }); }
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
    title: '📬 Nouveaux mots !',
    body: `<p>This link has <b>${incoming.length} words</b>.</p>
      <ul style="padding-left:20px">
        <li><b>${d.added.length}</b> new${d.added.length ? `: ${list(d.added, w => `${e(w.emoji || '')} ${e(w.fr)}`)}` : ''}</li>
        <li><b>${d.updated.length}</b> changed${d.updated.length ? `: ${list(d.updated, u => e(u.theirs.fr))}` : ''}</li>
        <li><b>${d.same.length}</b> already the same</li>
        ${d.missing.length ? `<li><b>${d.missing.length}</b> words here aren't in the link</li>` : ''}
      </ul>
      <p class="muted" style="font-size:.9rem"><b>Add &amp; update</b> keeps everything you have. <b>Replace</b> makes this device's list exactly match the link (and drops progress on the removed words).</p>`,
    actions: [
      { label: 'Annuler', cls: 'ghost', value: null },
      ...(d.missing.length ? [{ label: 'Replace', cls: 'red', value: 'replace' }] : []),
      { label: 'Add & update', cls: 'primary', value: 'merge' },
    ],
  });
  if (choice) {
    const r = applyWordList(app.db, incoming, choice);
    app.save();
    toast('Mots importés !', { sub: `${r.added} added · ${r.updated} updated${r.removed ? ` · ${r.removed} removed` : ''}`, icon: '📬', gold: true });
  }
  if (stay) rerender(); else app.go('/');
}

// ---------------------------------------------------------------- voice & sound & PIN

function voiceTab(el) {
  const s = app.db.settings;
  const voices = frenchVoices();
  el.innerHTML = `
    <div class="panel">
      <h3>Voix française (French voice)</h3>
      ${voices.length ? `
        <div class="field"><label for="vc">Voice</label><select class="input" id="vc">${voices.map(v => `<option value="${e(v.voiceURI)}" ${v.voiceURI === s.voice ? 'selected' : ''}>${e(v.name)} (${e(v.lang)})</option>`).join('')}</select></div>
        <div class="field"><label for="rt">Speed: <span id="rtv">${s.rate}</span></label><input type="range" id="rt" min="0.5" max="1.2" step="0.05" value="${s.rate}"></div>
        <button class="btn" id="test">🔊 Test : « Bonjour, je m'appelle Monsieur Croissant ! »</button>`
      : `<p>No French voice was found on this device, so the 🔊 buttons are hidden. On iPhone/iPad: Settings → Accessibility → Spoken Content → Voices → French. On Windows: Settings → Time & language → Speech → Add voices → Français. Then reload.</p>`}
    </div>
    <div class="panel">
      <h3>Sons</h3>
      <label class="switch"><input type="checkbox" id="snd" ${s.sound ? 'checked' : ''}><span class="track"></span>Sound effects</label>
    </div>
    <div class="panel">
      <h3>🔒 Code des grands (optional)</h3>
      <p class="muted" style="margin-top:0">A 4-digit code to keep curious fingers out of this corner. ${s.pin ? '<b>A code is set.</b>' : 'No code set.'}</p>
      <div class="row"><button class="btn" id="setpin">${s.pin ? 'Change code' : 'Set a code'}</button>${s.pin ? '<button class="btn red" id="clearpin">Remove code</button>' : ''}</div>
    </div>`;
  const save = () => { setAudioSettings(s); app.save(); };
  el.querySelector('#vc')?.addEventListener('change', ev => { s.voice = ev.target.value; save(); speak('Bonjour !'); });
  el.querySelector('#rt')?.addEventListener('input', ev => { s.rate = +ev.target.value; el.querySelector('#rtv').textContent = s.rate; save(); });
  el.querySelector('#test')?.addEventListener('click', () => speak("Bonjour, je m'appelle Monsieur Croissant !"));
  el.querySelector('#snd').addEventListener('change', ev => { s.sound = ev.target.checked; save(); });
  el.querySelector('#setpin').addEventListener('click', async () => {
    const a = await pinModal('Nouveau code');
    if (!a) return;
    const b = await pinModal('Encore une fois (again)');
    if (a !== b) { toast('Codes didn\'t match', { icon: '⚠️' }); return; }
    s.pin = await hashPin(a); unlocked = true; app.save();
    toast('Code enregistré', { icon: '🔒' }); rerender();
  });
  el.querySelector('#clearpin')?.addEventListener('click', () => { s.pin = null; app.save(); toast('Code supprimé', { icon: '🔓' }); rerender(); });
}

// ---------------------------------------------------------------- backup

function backupTab(el) {
  el.innerHTML = `
    <div class="panel">
      <h3>Sauvegarder</h3>
      <p style="margin-top:0">Progress lives in this browser on this device. Download a backup now and then — or use it to move progress to another device.</p>
      <button class="btn primary" id="dl">💾 Download backup</button>
    </div>
    <div class="panel">
      <h3>Restaurer</h3>
      <p style="margin-top:0">Load a backup file. <b>Merge</b> combines it with what's here (newest progress wins for each card). <b>Replace</b> throws away what's here.</p>
      <input type="file" id="file" accept=".json,application/json" class="input">
    </div>
    <div class="panel danger-zone">
      <h3>Tout effacer</h3>
      <p style="margin-top:0" class="muted">Delete everything on this device and start over with the starter words.</p>
      <button class="btn red" id="wipe">Tout effacer</button>
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
      title: 'Restaurer la sauvegarde',
      body: `<p>Backup has ${other.profiles.length} player(s) (${other.profiles.map(p => e(p.name)).join(', ')}) and ${other.words.length} words.</p>`,
      actions: [{ label: 'Annuler', cls: 'ghost', value: null }, { label: 'Replace', cls: 'red', value: 'replace' }, { label: 'Merge', cls: 'primary', value: 'merge' }],
    });
    if (!choice) return;
    app.db = choice === 'merge' ? mergeDB(app.db, other) : migrate(other);
    setAudioSettings(app.db.settings);
    app.save();
    toast('Sauvegarde restaurée !', { icon: '💾', gold: true });
    rerender();
  });
  el.querySelector('#wipe').addEventListener('click', async () => {
    if (!(await confirmModal('Tout effacer ?', 'Every player, all progress and the word list will be deleted from this device.', { yes: 'Tout effacer', danger: true }))) return;
    app.db = defaultDB();
    app.save();
    app.go('/');
  });
}
