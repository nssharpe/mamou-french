// French text-to-speech (the browser's own voices) and little synthesized
// sound effects (WebAudio, no files to download).

import { variants } from './answer.js';

let settings = { sound: true, voice: null, rate: 0.85 };
export function setAudioSettings(s) { settings = { ...settings, ...s }; }

// ---------- speech ----------

let voices = [];
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices().filter(v => /^fr(-|_|$)/i.test(v.lang));
  // Best first: France French, then local voices (they work offline), then the rest.
  voices.sort((a, b) => score(b) - score(a));
}
function score(v) {
  let s = 0;
  if (/fr[-_]FR/i.test(v.lang)) s += 4;
  if (v.localService) s += 1;
  if (/google|enhanced|premium|natural|amélie|thomas|audrey|marie/i.test(v.name)) s += 2;
  return s;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export function frenchVoices() { return voices; }
export function canSpeak() { return 'speechSynthesis' in window && voices.length > 0; }

function pickVoice() {
  return voices.find(v => v.voiceURI === settings.voice) || voices[0] || null;
}

export function speak(text, { rate, onend } = {}) {
  if (!('speechSynthesis' in window)) { onend && onend(); return false; }
  const say = variants(text)[0] || text;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(say);
    const v = pickVoice();
    if (v) try { u.voice = v; } catch { /* not a real SpeechSynthesisVoice */ }
    u.lang = v ? v.lang : 'fr-FR';
    u.rate = rate || settings.rate || 0.85;
    u.pitch = 1;
    if (onend) { u.onend = onend; u.onerror = onend; }
    speechSynthesis.speak(u);
    return true;
  } catch {
    onend && onend();
    return false;
  }
}

// iOS only lets speech start from a user gesture; a silent utterance during
// the first tap unlocks it for later automatic speech.
export function primeSpeech() {
  if (!('speechSynthesis' in window)) return;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* ignore */ }
}

// Wire a speaker button: plays, and pulses while talking.
export function speakButton(btn, text) {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    btn.classList.add('playing');
    speak(text, { onend: () => btn.classList.remove('playing') });
    setTimeout(() => btn.classList.remove('playing'), 2500);
  });
}

// ---------- sound effects ----------

let ctx = null;
function ac() {
  if (!settings.sound) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slide = 0, vibrato = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  if (vibrato) {
    const lfo = c.createOscillator(); const lg = c.createGain();
    lfo.frequency.value = 6; lg.gain.value = vibrato;
    lfo.connect(lg).connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
  }
  let out = g;
  if (type === 'sawtooth' || type === 'square') {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    g.connect(f); out = f;
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g);
  out.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5 };

export const sfx = {
  unlock() { ac(); },
  tap() { tone(900, 0, 0.05, { type: 'triangle', vol: 0.07 }); },
  flip() { tone(500, 0, 0.12, { type: 'triangle', vol: 0.08, slide: 400 }); },
  correct(combo = 0) {
    const lift = Math.min(combo, 10) * 30;
    tone(N.C6 + lift, 0, 0.12, { vol: 0.16 });
    tone(N.E6 + lift, 0.08, 0.22, { vol: 0.16 });
  },
  close() { tone(N.E5, 0, 0.12, { vol: 0.14 }); tone(N.C5, 0.1, 0.2, { vol: 0.12 }); },
  wrong() { tone(220, 0, 0.18, { type: 'triangle', vol: 0.18, slide: -90 }); tone(160, 0.14, 0.28, { type: 'triangle', vol: 0.16, slide: -60 }); },
  coin() { tone(1567, 0, 0.07, { type: 'square', vol: 0.06 }); tone(2093, 0.06, 0.16, { type: 'square', vol: 0.06 }); },
  whoosh() { tone(300, 0, 0.25, { type: 'sawtooth', vol: 0.05, slide: 900 }); },
  // Level up: the opening of "Frère Jacques" on a little accordion.
  levelUp() {
    const acc = { type: 'sawtooth', vol: 0.09, vibrato: 4 };
    [N.C5, N.D5, N.E5, N.C5, N.C5, N.D5, N.E5, N.C5].forEach((f, i) => tone(f, i * 0.16, 0.18, acc));
    [N.E5, N.F5, N.G5].forEach((f, i) => tone(f, 1.32 + i * 0.18, i === 2 ? 0.5 : 0.2, acc));
  },
  fanfare() {
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.1, 0.3, { type: 'triangle', vol: 0.14 }));
    tone(N.C6, 0.45, 0.6, { type: 'triangle', vol: 0.12 });
  },
  sad() { [N.G4, N.F4, N.E4, N.D4].forEach((f, i) => tone(f, i * 0.18, 0.25, { type: 'triangle', vol: 0.12 })); },
  tick() { tone(1200, 0, 0.03, { type: 'square', vol: 0.03 }); },
};
