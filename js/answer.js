// Answer checking for typed answers. Forgiving where it doesn't matter
// (capitals, curly apostrophes, trailing punctuation) and gently strict where
// it does in French (accents, the article / gender).

const ARTICLES = ['le', 'la', "l'", 'les', 'un', 'une', 'des'];
const ARTICLE_GENDER = { le: 'm', un: 'm', la: 'f', une: 'f' };

// Split a list field like "hello / hi" into its variants.
export function variants(s) {
  return String(s || '').split('/').map(v => v.trim()).filter(Boolean);
}

export function normalize(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe') // nobody can find œ on a keyboard; "soeur" is fine
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[.!?¡¿,;:"«»]/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Accent-blind form: é→e, ç→c, œ→oe, æ→ae.
export function loose(s) {
  return normalize(s)
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function splitArticle(s) {
  const n = normalize(s);
  if (n.startsWith("l'")) return { art: "l'", noun: n.slice(2) };
  const sp = n.indexOf(' ');
  if (sp > 0) {
    const first = n.slice(0, sp);
    if (ARTICLES.includes(first)) return { art: first, noun: n.slice(sp + 1) };
  }
  return { art: '', noun: n };
}

// Gender from the article, or null when it can't be told (l', les, no article).
export function genderOf(fr, explicit) {
  if (explicit === 'm' || explicit === 'f') return explicit;
  const { art } = splitArticle(variants(fr)[0] || '');
  return ARTICLE_GENDER[art] || null;
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Check a typed French answer.
 * Returns { result: 'exact' | 'close' | 'wrong', reason, expected }.
 * reason (for 'close'): 'accents' | 'article' | 'gender' | 'typo'.
 */
export function checkFrench(input, fr) {
  const targets = variants(fr);
  const expected = targets[0] || '';
  const inN = normalize(input);
  if (!inN) return { result: 'wrong', reason: null, expected };

  for (const t of targets) if (normalize(t) === inN) return { result: 'exact', reason: null, expected: t };

  const inL = loose(input);
  const inParts = splitArticle(input);
  for (const t of targets) {
    if (loose(t) === inL) return { result: 'close', reason: 'accents', expected: t };
  }
  for (const t of targets) {
    const tp = splitArticle(t);
    if (!tp.art) continue;
    const nounOk = loose(tp.noun) === loose(inParts.noun);
    if (nounOk && !inParts.art) return { result: 'close', reason: 'article', expected: t };
    if (nounOk && inParts.art && inParts.art !== tp.art) return { result: 'close', reason: 'gender', expected: t };
  }
  for (const t of targets) {
    const tl = loose(t);
    if (tl.length >= 5 && levenshtein(inL, tl) <= 1) return { result: 'close', reason: 'typo', expected: t };
  }
  return { result: 'wrong', reason: null, expected };
}

function stripEnglish(s) {
  return loose(s).replace(/^(the|a|an|to) /, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

// English answers only need to show the meaning was understood, so small typos pass.
export function checkEnglish(input, en) {
  const inS = stripEnglish(input);
  if (!inS) return false;
  return variants(en).some(t => {
    const tS = stripEnglish(t);
    if (tS === inS) return true;
    return tS.length >= 4 && levenshtein(tS, inS) <= 1;
  });
}

// Which accented letters a word uses, for the on-screen accent keys.
export const ACCENT_KEYS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'ë', 'œ'];
