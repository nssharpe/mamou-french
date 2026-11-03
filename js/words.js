// The starter word list and helpers for editing word lists.
// Each word gets a stable id so editing its spelling keeps the kids' progress.

import { uid } from './util.js';
import { genderOf } from './answer.js';

export const SEED_WORDS = [
  { id: 'w-bonjour', fr: 'bonjour', en: 'hello / good morning / hi', emoji: '👋', cat: 'Salutations', note: 'Always say it when you walk into a shop in France — it\'s polite!' },
  { id: 'w-aurevoir', fr: 'au revoir', en: 'goodbye / bye', emoji: '🚶', cat: 'Salutations', note: 'Literally "until we see again".' },
  { id: 'w-merci', fr: 'merci', en: 'thank you / thanks', emoji: '🙏', cat: 'Salutations', note: '"Merci beaucoup" = thanks a lot.' },
  { id: 'w-svp', fr: "s'il vous plaît", en: 'please', emoji: '🥺', cat: 'Salutations', note: 'Polite form. With friends and family say "s\'il te plaît".' },
  { id: 'w-oui', fr: 'oui', en: 'yes', emoji: '👍', cat: 'Salutations' },
  { id: 'w-non', fr: 'non', en: 'no', emoji: '👎', cat: 'Salutations' },

  { id: 'w-chat', fr: 'le chat', en: 'cat', emoji: '🐱', g: 'm', cat: 'Animaux', note: 'The t is silent: "shah".' },
  { id: 'w-chien', fr: 'le chien', en: 'dog', emoji: '🐶', g: 'm', cat: 'Animaux' },
  { id: 'w-oiseau', fr: "l'oiseau", en: 'bird', emoji: '🐦', g: 'm', cat: 'Animaux', note: 'Oiseau has all five vowels: o, i, e, a, u!' },
  { id: 'w-poisson', fr: 'le poisson', en: 'fish', emoji: '🐟', g: 'm', cat: 'Animaux', note: 'Careful: "poison" with one s means poison!' },

  { id: 'w-pain', fr: 'le pain', en: 'bread', emoji: '🥖', g: 'm', cat: 'Nourriture', note: 'A baguette is one kind of pain.' },
  { id: 'w-fromage', fr: 'le fromage', en: 'cheese', emoji: '🧀', g: 'm', cat: 'Nourriture', note: 'France makes more than 1,000 kinds of cheese.' },
  { id: 'w-pomme', fr: 'la pomme', en: 'apple', emoji: '🍎', g: 'f', cat: 'Nourriture', note: 'A potato is a "pomme de terre" — an apple of the earth!' },
  { id: 'w-eau', fr: "l'eau", en: 'water', emoji: '💧', g: 'f', cat: 'Nourriture', note: 'Feminine. The l\' is "la" squished before a vowel.' },

  { id: 'w-mere', fr: 'la mère', en: 'mother / mom / mum', emoji: '👩', g: 'f', cat: 'Famille', note: 'Kids usually say "maman".' },
  { id: 'w-pere', fr: 'le père', en: 'father / dad', emoji: '👨', g: 'm', cat: 'Famille', note: 'Kids usually say "papa".' },
  { id: 'w-frere', fr: 'le frère', en: 'brother', emoji: '👦', g: 'm', cat: 'Famille' },
  { id: 'w-soeur', fr: 'la sœur', en: 'sister', emoji: '👧', g: 'f', cat: 'Famille', note: 'œ is o and e glued together. You can type "oe".' },
  { id: 'w-ami', fr: "l'ami", en: 'friend', emoji: '🤝', g: 'm', cat: 'Famille', note: 'A girl friend is "l\'amie" — sounds the same!' },

  { id: 'w-rouge', fr: 'rouge', en: 'red', emoji: '🟥', cat: 'Couleurs' },
  { id: 'w-bleu', fr: 'bleu', en: 'blue', emoji: '🟦', cat: 'Couleurs' },
  { id: 'w-vert', fr: 'vert', en: 'green', emoji: '🟩', cat: 'Couleurs', note: 'The t is silent: "vair".' },
  { id: 'w-jaune', fr: 'jaune', en: 'yellow', emoji: '🟨', cat: 'Couleurs' },

  { id: 'w-un', fr: 'un', en: 'one / 1', emoji: '1️⃣', cat: 'Nombres', note: 'Also means "a": un chat = a cat.' },
  { id: 'w-deux', fr: 'deux', en: 'two / 2', emoji: '2️⃣', cat: 'Nombres' },
  { id: 'w-trois', fr: 'trois', en: 'three / 3', emoji: '3️⃣', cat: 'Nombres' },

  { id: 'w-maison', fr: 'la maison', en: 'house / home', emoji: '🏠', g: 'f', cat: 'À la maison' },
  { id: 'w-ecole', fr: "l'école", en: 'school', emoji: '🏫', g: 'f', cat: 'À la maison' },
  { id: 'w-livre', fr: 'le livre', en: 'book', emoji: '📖', g: 'm', cat: 'À la maison' },
  { id: 'w-voiture', fr: 'la voiture', en: 'car', emoji: '🚗', g: 'f', cat: 'À la maison' },
];

export const CATEGORY_EMOJI = {
  'Salutations': '👋', 'Animaux': '🐾', 'Nourriture': '🥐', 'Famille': '👪',
  'Couleurs': '🎨', 'Nombres': '🔢', 'À la maison': '🏡',
};

const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9]️?⃣/u;

export function hasEmoji(s) {
  return EMOJI_RE.test(s);
}

export function makeWord({ fr, en, emoji = '', g = null, cat = 'Mes mots', note = '' }) {
  const w = { id: uid('w-'), fr: fr.trim(), en: en.trim(), emoji: emoji.trim(), cat: cat.trim() || 'Mes mots' };
  const gender = genderOf(w.fr, g);
  if (gender) w.g = gender;
  if (note && note.trim()) w.note = note.trim();
  return w;
}

/**
 * Parse pasted lines into word drafts. Accepts any of:
 *   le chat = cat 🐱
 *   le chat ; cat ; 🐱 ; Animaux
 *   le chat<TAB>cat<TAB>🐱      (pasted from a spreadsheet)
 *   le chat - cat
 *   le chat, cat
 * Returns { words: [...drafts], errors: [lineText] }.
 */
export function parseBulk(text, defaultCat = 'Mes mots') {
  const words = [];
  const errors = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let parts;
    if (line.includes('\t')) parts = line.split('\t');
    else if (line.includes('=')) parts = line.split('=');
    else if (line.includes(';')) parts = line.split(';');
    else if (line.includes(' - ')) parts = line.split(' - ');
    else if (line.includes(',')) parts = line.split(',');
    else { errors.push(line); continue; }
    parts = parts.map(p => p.trim());

    // Pull an emoji out of wherever it is (often stuck on the end of the English).
    let emoji = '';
    const rest = [];
    for (const p of parts) {
      if (!p) continue;
      if (!emoji && hasEmoji(p) && [...p.replace(/\s/g, '')].length <= 4 && !/[a-z]/i.test(p)) { emoji = p; continue; }
      const m = !emoji && p.match(/^(.*?)\s*((?:\p{Extended_Pictographic}|\p{Regional_Indicator})[️‍\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}]*)$/u);
      if (m && m[1]) { emoji = m[2]; rest.push(m[1].trim()); continue; }
      rest.push(p);
    }
    const [fr, en, cat] = rest;
    if (!fr || !en) { errors.push(line); continue; }
    words.push({ fr, en, emoji, cat: cat || defaultCat });
  }
  return { words, errors };
}

export function categoriesOf(words) {
  const seen = [];
  for (const w of words) if (!seen.includes(w.cat)) seen.push(w.cat);
  return seen;
}
