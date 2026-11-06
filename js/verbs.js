// Present-tense practice with regular -er and -ir verbs. Pure: no DOM.

import { normalize, loose } from './answer.js';

// en: "I ___" form, en3: "he ___" form.
export const VERBS = {
  er: [
    { inf: 'regarder', en: 'watch', en3: 'watches' },
    { inf: 'chanter', en: 'sing', en3: 'sings' },
    { inf: 'étudier', en: 'study', en3: 'studies' },
    { inf: 'parler', en: 'speak', en3: 'speaks' },
    { inf: 'danser', en: 'dance', en3: 'dances' },
    { inf: 'jouer', en: 'play', en3: 'plays' },
    { inf: 'aimer', en: 'like', en3: 'likes' },
    { inf: 'écouter', en: 'listen', en3: 'listens' },
    { inf: 'marcher', en: 'walk', en3: 'walks' },
    { inf: 'travailler', en: 'work', en3: 'works' },
    { inf: 'dessiner', en: 'draw', en3: 'draws' },
    { inf: 'cuisiner', en: 'cook', en3: 'cooks' },
    { inf: 'habiter', en: 'live', en3: 'lives' },
    { inf: 'arriver', en: 'arrive', en3: 'arrives' },
    { inf: 'donner', en: 'give', en3: 'gives' },
    { inf: 'sauter', en: 'jump', en3: 'jumps' },
  ],
  ir: [
    { inf: 'finir', en: 'finish', en3: 'finishes' },
    { inf: 'choisir', en: 'choose', en3: 'chooses' },
    { inf: 'grandir', en: 'grow', en3: 'grows' },
    { inf: 'rougir', en: 'blush', en3: 'blushes' },
    { inf: 'remplir', en: 'fill', en3: 'fills' },
    { inf: 'obéir', en: 'obey', en3: 'obeys' },
    { inf: 'réussir', en: 'succeed', en3: 'succeeds' },
    { inf: 'réfléchir', en: 'think', en3: 'thinks' },
    { inf: 'applaudir', en: 'clap', en3: 'claps' },
    { inf: 'bâtir', en: 'build', en3: 'builds' },
    { inf: 'punir', en: 'punish', en3: 'punishes' },
    { inf: 'nourrir', en: 'feed', en3: 'feeds' },
  ],
};

export const ENDINGS = {
  er: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  ir: ['is', 'is', 'it', 'issons', 'issez', 'issent'],
};

// slot: index into ENDINGS. alt: other pronouns that are also right when the
// English can't tell them apart ("they" = ils or elles).
export const PERSONS = [
  { fr: 'je', en: 'I', slot: 0 },
  { fr: 'tu', en: 'you', slot: 1 },
  { fr: 'il', en: 'he', slot: 2 },
  { fr: 'elle', en: 'she', slot: 2 },
  { fr: 'nous', en: 'we', slot: 3 },
  { fr: 'vous', en: 'you all', slot: 4 },
  { fr: 'ils', en: 'they', slot: 5, alt: ['elles'] },
  { fr: 'elles', en: 'they', slot: 5, alt: ['ils'] },
];

export const familyOf = verb => (verb.inf.endsWith('er') ? 'er' : 'ir');
export const stemOf = verb => verb.inf.slice(0, -2);
const startsWithVowel = s => /^[aeiouyhàâéèêëîïôûù]/i.test(s);

export function conjugate(verb, person) {
  return stemOf(verb) + ENDINGS[familyOf(verb)][person.slot];
}

// "je" becomes "j'" before a vowel or a silent h.
export function pronounFor(person, form) {
  return person.fr === 'je' && startsWithVowel(form) ? "j'" : person.fr;
}

export function withPronoun(person, form) {
  const p = pronounFor(person, form);
  return p.endsWith("'") ? p + form : `${p} ${form}`;
}

export function englishOf(verb, person) {
  return `${person.en} ${person.slot === 2 ? verb.en3 : verb.en}`;
}

export function question(verb, person) {
  const form = conjugate(verb, person);
  return { verb, person, form, pronoun: pronounFor(person, form), full: withPronoun(person, form), en: englishOf(verb, person) };
}

/**
 * Check a typed answer. level 1: the verb only (the pronoun is shown).
 * level 2: pronoun + verb. Returns { result: 'exact' | 'accents' | 'wrong', reason? }.
 * An answer that is only missing accents counts as right, with a reminder.
 */
export function checkVerb(input, q, level) {
  const typed = normalize(input).replace(/^j' /, "j'");
  const forms = level === 1
    ? [q.form, q.full] // typing the pronoun too is fine
    : [q.person.fr, ...(q.person.alt || [])].map(fr => withPronoun({ ...q.person, fr }, q.form));
  if (forms.some(f => normalize(f) === typed)) return { result: 'exact' };
  if (forms.some(f => loose(f) === loose(typed))) return { result: 'accents' };
  let reason = null;
  if (level === 2 && q.pronoun === "j'" && loose(typed) === loose(`je ${q.form}`)) reason = 'elision';
  return { result: 'wrong', reason };
}

/** A round of n questions with no (verb, person) pair repeated. family: 'er' | 'ir' | 'mix'. */
export function makeRound(family, n = 10, rng = Math.random) {
  const verbs = family === 'mix' ? [...VERBS.er, ...VERBS.ir] : VERBS[family];
  const used = new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 1000) {
    const verb = verbs[Math.floor(rng() * verbs.length)];
    const person = PERSONS[Math.floor(rng() * PERSONS.length)];
    const key = `${verb.inf}|${person.slot}`;
    if (used.has(key)) continue;
    // Don't ask the same verb twice in a row.
    if (out.length && out[out.length - 1].verb === verb && verbs.length > 1) continue;
    used.add(key);
    out.push(question(verb, person));
  }
  return out;
}
