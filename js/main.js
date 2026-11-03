// Entry point: load data, handle share links, and route between screens.

import { app } from './app.js';
import { sfx, primeSpeech } from './audio.js';
import { handleImportLink } from './screens/settings.js';

const routes = [
  [/^\/?$/, () => import('./screens/home.js')],
  [/^\/p\/([\w-]+)\/?$/, () => import('./screens/dashboard.js')],
  [/^\/p\/([\w-]+)\/study(?:\/(\w+))?$/, () => import('./screens/study.js')],
  [/^\/p\/([\w-]+)\/games$/, () => import('./screens/games.js')],
  [/^\/p\/([\w-]+)\/game\/(\w+)$/, () => import('./screens/games.js'), 'play'],
  [/^\/p\/([\w-]+)\/carnet$/, () => import('./screens/carnet.js')],
  [/^\/p\/([\w-]+)\/tour$/, () => import('./screens/tour.js')],
  [/^\/p\/([\w-]+)\/shop$/, () => import('./screens/shop.js')],
  [/^\/p\/([\w-]+)\/trophies$/, () => import('./screens/trophies.js')],
  [/^\/p\/([\w-]+)\/classement$/, () => import('./screens/classement.js')],
  [/^\/duel$/, () => import('./screens/duel.js')],
  [/^\/grown-ups(?:\/(\w+))?$/, () => import('./screens/settings.js')],
];

let cleanup = null;
let renderSeq = 0;

async function route() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (hash.startsWith('import=')) {
    await handleImportLink(hash.slice(7));
    return;
  }
  const seq = ++renderSeq;
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  for (const [re, load, entry = 'render'] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    const pid = m[1];
    if (re.source.startsWith('^\\/p\\/') && !app.profile(pid)) { app.go('/'); return; }
    const mod = await load();
    if (seq !== renderSeq) return;
    try {
      cleanup = (await mod[entry]({ pid, arg: m[2], params: m })) || null;
    } catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = `<div class="panel" style="margin-top:30px"><h2>Oups ! Something broke.</h2><p class="muted">${String(e.message || e).replace(/</g, '&lt;')}</p><a class="btn primary" href="#/">Back home</a></div>`;
    }
    return;
  }
  app.go('/');
}

app.init();
window.__mamouStarted = true;
window.addEventListener('hashchange', route);
// Unlock audio on the first touch (iOS needs a user gesture).
window.addEventListener('pointerdown', () => { sfx.unlock(); primeSpeech(); }, { once: true });
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
