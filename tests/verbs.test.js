import test from 'node:test';
import assert from 'node:assert/strict';
import { VERBS, PERSONS, conjugate, question, checkVerb, makeRound, englishOf } from '../js/verbs.js';

const verb = inf => [...VERBS.er, ...VERBS.ir].find(v => v.inf === inf);
const person = fr => PERSONS.find(p => p.fr === fr);

test('regular -er and -ir present tense', () => {
  assert.deepEqual(['je', 'tu', 'il', 'nous', 'vous', 'ils'].map(p => conjugate(verb('chanter'), person(p))),
    ['chante', 'chantes', 'chante', 'chantons', 'chantez', 'chantent']);
  assert.deepEqual(['je', 'tu', 'elle', 'nous', 'vous', 'elles'].map(p => conjugate(verb('finir'), person(p))),
    ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent']);
});

test('je becomes j\' before a vowel or h', () => {
  assert.equal(question(verb('étudier'), person('je')).full, "j'étudie");
  assert.equal(question(verb('habiter'), person('je')).full, "j'habite");
  assert.equal(question(verb('obéir'), person('je')).full, "j'obéis");
  assert.equal(question(verb('chanter'), person('je')).full, 'je chante');
});

test('English prompts', () => {
  assert.equal(englishOf(verb('chanter'), person('je')), 'I sing');
  assert.equal(englishOf(verb('chanter'), person('il')), 'he sings');
  assert.equal(englishOf(verb('étudier'), person('vous')), 'you all study');
});

test('level 1 checks the verb form; the pronoun is optional', () => {
  const q = question(verb('chanter'), person('nous'));
  assert.equal(checkVerb('chantons', q, 1).result, 'exact');
  assert.equal(checkVerb(' Chantons! ', q, 1).result, 'exact');
  assert.equal(checkVerb('nous chantons', q, 1).result, 'exact');
  assert.equal(checkVerb('chantez', q, 1).result, 'wrong');
  assert.equal(checkVerb('etudie', question(verb('étudier'), person('je')), 1).result, 'accents');
});

test('level 2 needs the pronoun, accepts ils/elles for they, and explains j\'', () => {
  const he = question(verb('chanter'), person('il'));
  assert.equal(checkVerb('il chante', he, 2).result, 'exact');
  assert.equal(checkVerb('chante', he, 2).result, 'wrong');
  assert.equal(checkVerb('elle chante', he, 2).result, 'wrong');
  const they = question(verb('finir'), person('ils'));
  assert.equal(checkVerb('elles finissent', they, 2).result, 'exact');
  const je = question(verb('aimer'), person('je'));
  assert.equal(checkVerb("j'aime", je, 2).result, 'exact');
  assert.equal(checkVerb('j’ aime', je, 2).result, 'exact');
  assert.deepEqual(checkVerb('je aime', je, 2), { result: 'wrong', reason: 'elision' });
});

test('a round has no repeated verb + person pair', () => {
  for (const fam of ['er', 'ir', 'mix']) {
    const r = makeRound(fam, 10);
    assert.equal(r.length, 10);
    assert.equal(new Set(r.map(q => `${q.verb.inf}|${q.person.slot}`)).size, 10);
    if (fam !== 'mix') assert.ok(r.every(q => q.verb.inf.endsWith(fam)));
  }
});
