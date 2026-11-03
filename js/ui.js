// UI helpers: modals, confirm, PIN pad, the kid top bar, and small bits of markup.

import { escapeHtml } from './util.js';

export const e = escapeHtml;

/**
 * Open a modal. actions: [{ label, cls, value }]. Resolves with the clicked
 * action's value (or null when dismissed). `onOpen(el, close)` lets callers wire
 * up custom content; call close(value) to resolve.
 */
export function openModal({ title = '', body = '', actions = [{ label: 'OK', cls: 'primary', value: true }], onOpen, dismissable = true } = {}) {
  return new Promise(resolve => {
    const root = document.getElementById('modal-root');
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${title ? 'aria-label="' + e(title) + '"' : ''}>
      ${title ? `<h2>${e(title)}</h2>` : ''}
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="actions">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${e(a.label)}</button>`).join('')}</div>` : ''}
    </div>`;
    let done = false;
    const prevFocus = document.activeElement;
    const close = value => {
      if (done) return;
      done = true;
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch { /* gone */ }
      resolve(value === undefined ? null : value);
    };
    const onKey = ev => {
      if (ev.key === 'Escape' && dismissable) { ev.stopPropagation(); close(null); }
    };
    back.addEventListener('click', ev => {
      if (ev.target === back && dismissable) close(null);
      const b = ev.target.closest('[data-i]');
      if (b && b.parentElement.classList.contains('actions')) {
        const a = actions[+b.dataset.i];
        close(a.value === undefined ? true : a.value);
      }
    });
    document.addEventListener('keydown', onKey, true);
    root.appendChild(back);
    const first = back.querySelector('input, textarea, select') || back.querySelector('.actions .btn:last-child');
    if (first) setTimeout(() => first.focus(), 30);
    if (onOpen) onOpen(back.querySelector('.modal'), close);
  });
}

// Screen-level keyboard shortcuts should stand down while a modal is up.
export function isModalOpen() {
  return !!document.querySelector('#modal-root .modal-back');
}

export function confirmModal(title, body, { yes = 'Oui', no = 'Annuler', danger = false } = {}) {
  return openModal({
    title, body: `<p>${body}</p>`,
    actions: [{ label: no, cls: 'ghost', value: false }, { label: yes, cls: danger ? 'red' : 'primary', value: true }],
  }).then(v => v === true);
}

// Simple 4-digit PIN pad. Resolves with the digits or null.
export function pinModal(title = 'Code des grands') {
  return openModal({
    title,
    body: `<p class="center muted">Enter the grown-ups' code</p><div class="pin-dots">${'<i></i>'.repeat(4)}</div>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div>`,
    actions: [{ label: 'Annuler', cls: 'ghost', value: null }],
    onOpen(el, close) {
      let pin = '';
      const dots = [...el.querySelectorAll('.pin-dots i')];
      const show = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
      const press = k => {
        if (k === '⌫') pin = pin.slice(0, -1);
        else if (pin.length < 4) pin += k;
        show();
        if (pin.length === 4) setTimeout(() => close(pin), 150);
      };
      el.addEventListener('click', ev => { const b = ev.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      el.addEventListener('keydown', ev => {
        if (/^\d$/.test(ev.key)) press(ev.key);
        if (ev.key === 'Backspace') press('⌫');
      });
      el.tabIndex = -1; el.focus();
    },
  });
}

export async function hashPin(pin) {
  const data = new TextEncoder().encode('mamou:' + pin);
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'plain:' + pin; // very old browsers / insecure context
}

export function genderClass(word) {
  return word.g === 'm' ? 'g-m' : word.g === 'f' ? 'g-f' : '';
}

export function genderTag(word) {
  if (word.g === 'm') return '<span class="g-tag g-m" title="masculin">m</span>';
  if (word.g === 'f') return '<span class="g-tag g-f" title="féminin">f</span>';
  return '';
}

export function starsHtml(n) {
  return `<div class="stars" aria-label="${n} sur 5">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= n ? '' : 'off'}">⭐</span>`).join('')}</div>`;
}

export function frenchDate(ts = Date.now()) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(ts);
  } catch { return ''; }
}

export function greeting(ts = Date.now()) {
  const h = new Date(ts).getHours();
  if (h < 5) return ['Bonne nuit', 'Good night'];
  if (h < 12) return ['Bonjour', 'Good morning'];
  if (h < 18) return ['Bon après-midi', 'Good afternoon'];
  return ['Bonsoir', 'Good evening'];
}

export function setView(html, { wide = false } = {}) {
  const root = document.getElementById('app');
  root.className = wide ? 'wide' : '';
  root.innerHTML = html;
  window.scrollTo(0, 0);
  return root;
}
