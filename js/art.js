// Hand-drawn SVG: Monsieur Croissant (the mascot), avatar accessories, the
// French flag and the Paris skyline. All inline so nothing has to load.

import { SHOP } from './data.js';
import { escapeHtml } from './util.js';

// mood: happy | wow | sad | wink | cool
export function mascotSvg(mood = 'happy') {
  const eyes = {
    happy: '<ellipse cx="51" cy="54" rx="4.2" ry="5.2" fill="#1D2340"/><ellipse cx="69" cy="54" rx="4.2" ry="5.2" fill="#1D2340"/><circle cx="52.4" cy="52" r="1.6" fill="#fff"/><circle cx="70.4" cy="52" r="1.6" fill="#fff"/>',
    wow: '<circle cx="51" cy="53" r="6" fill="#fff" stroke="#1D2340" stroke-width="2"/><circle cx="69" cy="53" r="6" fill="#fff" stroke="#1D2340" stroke-width="2"/><circle cx="51" cy="54" r="3" fill="#1D2340"/><circle cx="69" cy="54" r="3" fill="#1D2340"/><path d="M44 43 q7-5 13 0 M62 43 q7-5 13 0" stroke="#1D2340" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    sad: '<path d="M46 56 q5-5 10 0 M64 56 q5-5 10 0" stroke="#1D2340" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M45 47 l10 3 M75 47 l-10 3" stroke="#1D2340" stroke-width="2.2" stroke-linecap="round"/>',
    wink: '<ellipse cx="51" cy="54" rx="4.2" ry="5.2" fill="#1D2340"/><circle cx="52.4" cy="52" r="1.6" fill="#fff"/><path d="M64 55 q5-5 10 0" stroke="#1D2340" stroke-width="2.8" fill="none" stroke-linecap="round"/>',
    cool: '<path d="M42 50 h36 v3 q-1 8-8 8 h-4 q-6 0-6-7 h-0 q0 7-6 7 h-4 q-8 0-8-8z" fill="#1D2340"/><path d="M47 52 h6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>',
  }[mood] || '';
  const mouth = {
    happy: '<path d="M53 72 q7 7 14 0" stroke="#1D2340" stroke-width="2.6" fill="#B8232F" stroke-linejoin="round"/>',
    wow: '<ellipse cx="60" cy="74" rx="4.5" ry="5.5" fill="#1D2340"/>',
    sad: '<path d="M53 76 q7-6 14 0" stroke="#1D2340" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    wink: '<path d="M52 72 q8 8 16 -1" stroke="#1D2340" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    cool: '<path d="M54 73 q7 5 13 -1" stroke="#1D2340" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  }[mood] || '';
  return `<svg viewBox="0 0 120 104" class="mascot-svg" role="img" aria-label="Monsieur Croissant">
  <defs>
    <linearGradient id="mcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7C66B"/><stop offset="1" stop-color="#D98A2B"/></linearGradient>
    <linearGradient id="mcG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2B85A"/><stop offset="1" stop-color="#C97A22"/></linearGradient>
  </defs>
  <g stroke="#7A4512" stroke-width="2.4" stroke-linejoin="round">
    <ellipse cx="14" cy="80" rx="10" ry="12" transform="rotate(-38 14 80)" fill="url(#mcG2)"/>
    <ellipse cx="106" cy="80" rx="10" ry="12" transform="rotate(38 106 80)" fill="url(#mcG2)"/>
    <ellipse cx="31" cy="70" rx="16" ry="19" transform="rotate(-28 31 70)" fill="url(#mcG)"/>
    <ellipse cx="89" cy="70" rx="16" ry="19" transform="rotate(28 89 70)" fill="url(#mcG)"/>
    <ellipse cx="60" cy="62" rx="26" ry="30" fill="url(#mcG)"/>
  </g>
  <path d="M24 60 q6 10 3 22 M96 60 q-6 10 -3 22" stroke="#7A4512" stroke-width="1.8" fill="none" opacity=".55"/>
  <circle cx="43" cy="66" r="4.5" fill="#F08A7E" opacity=".6"/><circle cx="77" cy="66" r="4.5" fill="#F08A7E" opacity=".6"/>
  ${eyes}
  <path d="M60 64 q-5 -3 -11 1 q-4 3 -7 0 q3 6 9 4 q6 -2 9 -3 q3 1 9 3 q6 2 9 -4 q-3 3 -7 0 q-6 -4 -11 -1z" fill="#1D2340"/>
  ${mouth}
  <g transform="rotate(-14 62 30)">
    <ellipse cx="62" cy="33" rx="25" ry="9" fill="#B8232F" stroke="#1D2340" stroke-width="2.4"/>
    <path d="M40 34 q22 8 44 0" stroke="#1D2340" stroke-width="2" fill="none" opacity=".35"/>
    <path d="M62 24 q1 -6 4 -7" stroke="#1D2340" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

export function mascotHtml({ mood = 'happy', size = '', idle = true, id = '' } = {}) {
  return `<div class="mascot ${size} ${idle ? 'idle' : ''}" ${id ? `id="${id}"` : ''} data-mascot>${mascotSvg(mood)}</div>`;
}

export function setMascot(el, mood, anim) {
  if (!el) return;
  el.innerHTML = mascotSvg(mood);
  if (anim) {
    el.classList.remove('bounce', 'wobble', 'spin', 'idle');
    void el.offsetWidth;
    el.classList.add(anim);
    setTimeout(() => { el.classList.remove(anim); el.classList.add('idle'); }, 1000);
  }
}

export function bubbleHtml(fr, en = '') {
  return `<div class="bubble">${escapeHtml(fr)}${en ? `<span class="en">${escapeHtml(en)}</span>` : ''}</div>`;
}

// ---------- accessories ----------

const ACC_SVG = {
  beret: color => `<svg viewBox="0 0 60 26"><ellipse cx="30" cy="16" rx="27" ry="9" fill="${color}" stroke="#1D2340" stroke-width="2.4"/><path d="M6 18 q24 8 48 0" stroke="#1D2340" stroke-width="1.6" fill="none" opacity=".35"/><path d="M30 7 q1 -5 4 -6" stroke="#1D2340" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  toque: () => `<svg viewBox="0 0 60 50"><path d="M14 30 q-12 -6 -6 -18 q6 -10 16 -4 q4 -10 14 -6 q10 2 8 12 q12 -2 10 10 q-2 8 -10 6 l-2 14 h-26z" fill="#fff" stroke="#1D2340" stroke-width="2.4" stroke-linejoin="round"/><path d="M18 40 h26" stroke="#1D2340" stroke-width="2"/></svg>`,
  moustache: () => `<svg viewBox="0 0 60 22"><path d="M30 8 q-7 -5 -15 1 q-6 5 -12 0 q3 10 13 8 q9 -2 14 -6 q5 4 14 6 q10 2 13 -8 q-6 5 -12 0 q-8 -6 -15 -1z" fill="#1D2340"/></svg>`,
  bowtie: () => `<svg viewBox="0 0 60 30"><path d="M30 15 L6 3 v24z M30 15 L54 3 v24z" fill="#B8232F" stroke="#1D2340" stroke-width="2.4" stroke-linejoin="round"/><rect x="25" y="9" width="10" height="12" rx="3" fill="#B8232F" stroke="#1D2340" stroke-width="2.4"/></svg>`,
  flag: () => `<svg viewBox="0 0 40 50"><rect x="3" y="2" width="3" height="46" rx="1.5" fill="#7A4512"/><g stroke="#1D2340" stroke-width="1.6"><rect x="6" y="4" width="10" height="20" fill="#1F4FB8"/><rect x="16" y="4" width="10" height="20" fill="#fff"/><rect x="26" y="4" width="10" height="20" fill="#ED2939"/></g></svg>`,
};

export function itemArt(item) {
  if (!item) return '';
  if (item.svg) return ACC_SVG[item.svg](item.color);
  return escapeHtml(item.emoji || '');
}

export function avatarHtml(profile, prog, size = '') {
  const eq = (prog && prog.equip) || {};
  const get = id => SHOP.find(i => i.id === id);
  const bg = get(eq.bg);
  const hat = get(eq.hat), face = get(eq.face), held = get(eq.held);
  const faceLow = face && face.svg === 'bowtie' ? ' low' : face && face.svg === 'moustache' ? ' mid' : '';
  return `<span class="avatar ${size}" ${bg ? `style="background:${bg.bg}"` : ''} aria-hidden="true">
    <span class="animal">${escapeHtml(profile.animal || '🐱')}</span>
    ${hat ? `<span class="acc hat">${itemArt(hat)}</span>` : ''}
    ${face ? `<span class="acc face${faceLow}">${itemArt(face)}</span>` : ''}
    ${held ? `<span class="acc held">${itemArt(held)}</span>` : ''}
  </span>`;
}

// Inline French flag (the 🇫🇷 emoji shows up as "FR" on Windows).
export function flagSvg(h = 16) {
  return `<svg viewBox="0 0 3 2" height="${h}" style="vertical-align:-2px;border:1.5px solid #1D2340;border-radius:2px" aria-label="French flag"><rect width="1" height="2" fill="#1F4FB8"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>`;
}

export function skylineSvg() {
  return `<svg class="skyline" viewBox="0 0 760 120" aria-hidden="true">
  <g fill="#1D2340" opacity=".14">
    <rect x="0" y="92" width="760" height="28"/>
    <rect x="30" y="70" width="60" height="30"/><rect x="40" y="58" width="12" height="14"/>
    <rect x="100" y="78" width="80" height="22"/><path d="M110 78 l15 -14 l15 14z"/>
    <rect x="190" y="62" width="44" height="38"/><path d="M190 62 l22 -16 l22 16z"/>
    <path d="M250 100 v-40 a24 24 0 0 1 48 0 v40z"/><circle cx="274" cy="34" r="6"/>
    <rect x="470" y="70" width="70" height="30"/><path d="M470 70 l35 -20 l35 20z"/>
    <rect x="560" y="76" width="50" height="24"/><rect x="620" y="64" width="40" height="36"/><path d="M620 64 h40 l-6 -10 h-28z"/>
    <rect x="670" y="80" width="80" height="20"/>
  </g>
  <g fill="#1D2340" opacity=".26">
    <path d="M380 4 l3 18 l6 0 l10 40 l-8 0 l12 38 h-12 q-9 -22 -11 -22 q-2 0 -11 22 h-12 l12 -38 l-8 0 l10 -40 l6 0z"/>
    <rect x="362" y="60" width="36" height="5"/>
    <rect x="368" y="22" width="24" height="3"/>
  </g>
</svg>`;
}
