import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFrench, checkEnglish, normalize, loose, genderOf, splitArticle } from '../js/answer.js';
import { parseBulk } from '../js/words.js';

test('exact French answers, ignoring case, spaces and punctuation', () => {
  assert.equal(checkFrench('Le Chat', 'le chat').result, 'exact');
  assert.equal(checkFrench('  bonjour ! ', 'bonjour').result, 'exact');
  assert.equal(checkFrench('s’il vous plaît', "s'il vous plaît").result, 'exact');
  assert.equal(checkFrench("l' eau", "l'eau").result, 'exact');
});

test('missing accents are close, not wrong', () => {
  assert.equal(checkFrench('lecole', "l'école").reason, 'typo'); // just the apostrophe missing
  assert.deepEqual(checkFrench("l'ecole", "l'école"), { result: 'close', reason: 'accents', expected: "l'école" });
  assert.equal(checkFrench('la mere', 'la mère').reason, 'accents');
});

test('œ can be typed as oe and still be exact', () => {
  assert.equal(checkFrench('la soeur', 'la sœur').result, 'exact');
  assert.equal(checkFrench('la sœur', 'la sœur').result, 'exact');
  assert.equal(loose('sœur'), 'soeur');
});

test('article problems', () => {
  assert.deepEqual(checkFrench('chat', 'le chat'), { result: 'close', reason: 'article', expected: 'le chat' });
  assert.equal(checkFrench('la chat', 'le chat').reason, 'gender');
  assert.equal(checkFrench('pomme', 'la pomme').reason, 'article');
  assert.equal(checkFrench('eau', "l'eau").reason, 'article');
});

test('one-letter typos on longer words are close', () => {
  assert.equal(checkFrench('le fromagr', 'le fromage').reason, 'typo');
  assert.equal(checkFrench('non', 'oui').result, 'wrong');
  assert.equal(checkFrench('', 'oui').result, 'wrong');
});

test('alternatives separated by slashes', () => {
  assert.equal(checkFrench('belle', 'beau / belle').result, 'exact');
  assert.ok(checkEnglish('hi', 'hello / good morning / hi'));
  assert.ok(checkEnglish('Good Morning', 'hello / good morning / hi'));
  assert.ok(checkEnglish('the cat', 'cat'));
  assert.ok(checkEnglish('mom', 'mother / mom / mum'));
  assert.ok(checkEnglish('mothr', 'mother'));
  assert.ok(!checkEnglish('dog', 'cat'));
  assert.ok(checkEnglish('2', 'two / 2'));
});

test('gender from the article or explicit field', () => {
  assert.equal(genderOf('le chat'), 'm');
  assert.equal(genderOf('une pomme'), 'f');
  assert.equal(genderOf("l'eau"), null);
  assert.equal(genderOf("l'eau", 'f'), 'f');
  assert.equal(genderOf('rouge'), null);
  assert.deepEqual(splitArticle("L’oiseau"), { art: "l'", noun: 'oiseau' });
  assert.deepEqual(splitArticle('un'), { art: '', noun: 'un' });
});

test('normalize', () => {
  assert.equal(normalize('  Ça   VA ? '), 'ça va');
});

test('bulk paste in several formats', () => {
  const { words, errors } = parseBulk([
    'le chat = cat 🐱',
    'la pomme ; apple ; 🍎 ; Nourriture',
    'le chien\tdog\t🐶',
    'merci - thank you',
    'oui, yes',
    '# comment line',
    'nonsense line',
    '',
  ].join('\n'), 'Semaine 2');
  assert.equal(words.length, 5);
  assert.deepEqual(words[0], { fr: 'le chat', en: 'cat', emoji: '🐱', cat: 'Semaine 2' });
  assert.deepEqual(words[1], { fr: 'la pomme', en: 'apple', emoji: '🍎', cat: 'Nourriture' });
  assert.equal(words[2].emoji, '🐶');
  assert.equal(words[3].en, 'thank you');
  assert.deepEqual(errors, ['nonsense line']);
});
