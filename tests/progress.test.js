import test from 'node:test';
import assert from 'node:assert/strict';
import {
  levelInfo, rankFor, addXp, recordAnswer, updateGoal, checkStreak, displayStreak,
  checkAchievements, achievementContext, buy, canBuy, equip, weekXp, GAME_XP_DAILY_CAP,
} from '../js/progress.js';
import { newProgress } from '../js/store.js';
import { newCard } from '../js/srs.js';
import { dayStartPlus } from '../js/util.js';
import { TOUR, RANKS, projectFrance, FRANCE_OUTLINE } from '../js/data.js';

const T0 = new Date(2026, 10, 3, 16, 0).getTime();
const day = n => dayStartPlus(T0, n) + 6 * 3600e3;

test('levels', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(79).level, 1);
  assert.equal(levelInfo(80).level, 2);
  assert.equal(levelInfo(80 + 120).level, 3);
  assert.equal(rankFor(1).name, 'Touriste');
  assert.equal(rankFor(6).name, 'Baguette Junior');
});

test('addXp reports level-ups and caps game XP', () => {
  const p = newProgress();
  const r = addXp(p, 210, T0);
  assert.deepEqual(r.levelUps, [2, 3]);
  const g = addXp(p, 500, T0, { game: true });
  assert.equal(g.gained, GAME_XP_DAILY_CAP);
  assert.equal(addXp(p, 10, T0, { game: true }).gained, 0);
  assert.equal(addXp(p, 10, day(1), { game: true }).gained, 10);
});

test('recordAnswer counts learned words once', () => {
  const p = newProgress();
  const before = newCard();
  const after = { ...newCard(), state: 'review', ivl: 1 };
  const r = recordAnswer(p, { cardId: 'w-chat:r', before, after, correct: true, combo: 3, now: T0 });
  assert.equal(r.learnedWord, true);
  assert.equal(r.xp, 10 + 3 + 15);
  assert.equal(p.stats.wordsLearned, 1);
  const again = recordAnswer(p, { cardId: 'w-chat:r', before: after, after: { ...after, ivl: 3 }, correct: true, combo: 4, now: T0 });
  assert.equal(again.learnedWord, false);
  assert.equal(p.stats.wordsLearned, 1);
  // Produce cards don't count as new words.
  recordAnswer(p, { cardId: 'w-chat:p', before: newCard(), after: { ...newCard(), state: 'review' }, correct: true, combo: 0, now: T0 });
  assert.equal(p.stats.wordsLearned, 1);
});

test('streak grows on consecutive goal days and resets after a gap', () => {
  const p = newProgress();
  p.prefs.goal = 2;
  const hit = n => { p.days = { ...p.days }; const d = p.days; const now = day(n); recordAnswer(p, { cardId: 'a:r', before: newCard(), after: newCard(), correct: true, combo: 0, now }); recordAnswer(p, { cardId: 'a:r', before: newCard(), after: newCard(), correct: true, combo: 0, now }); return updateGoal(p, now); };
  assert.equal(hit(0).streak, 1);
  assert.equal(updateGoal(p, day(0)).justMet, false); // once per day
  assert.equal(hit(1).streak, 2);
  assert.equal(hit(2).streak, 3);
  assert.equal(displayStreak(p, day(3)), 3); // still alive tomorrow
  assert.deepEqual(checkStreak(p, day(5)), { lost: 3 });
  assert.equal(displayStreak(p, day(5)), 0);
  assert.equal(hit(5).streak, 1);
  assert.equal(p.streak.best, 3);
});

test('streak freezes bridge missed days', () => {
  const p = newProgress();
  p.streak = { count: 4, best: 4, lastDay: '2026-11-03', freezes: 2 };
  assert.deepEqual(checkStreak(p, day(3)), { saved: 2 });
  assert.equal(p.streak.freezes, 0);
  assert.equal(p.streak.lastDay, '2026-11-05');
  assert.ok(p.days['2026-11-04'].frozen);
  p.prefs.goal = 1;
  recordAnswer(p, { cardId: 'a:r', before: newCard(), after: newCard(), correct: true, combo: 0, now: day(3) });
  assert.equal(updateGoal(p, day(3)).streak, 5);
});

test('clearing every due card meets the goal early', () => {
  const p = newProgress();
  for (let i = 0; i < 5; i++) recordAnswer(p, { cardId: 'a:r', before: newCard(), after: newCard(), correct: true, combo: 0, now: T0 });
  assert.equal(updateGoal(p, T0).justMet, false);
  assert.equal(updateGoal(p, T0, { deckCleared: true }).justMet, true);
});

test('a light day (only 2 cards due) still counts once they are done', () => {
  const p = newProgress();
  for (let i = 0; i < 2; i++) recordAnswer(p, { cardId: 'a:r', before: newCard(), after: newCard(), correct: true, combo: 0, now: T0 });
  assert.equal(updateGoal(p, T0, { deckCleared: true }).justMet, false);
  assert.equal(updateGoal(p, T0, { deckCleared: true, minRev: 2 }).justMet, true);
});

test('game croissants are capped per day', async () => {
  const { capGameCroissants, GAME_CROISSANT_DAILY_CAP } = await import('../js/progress.js');
  const p = newProgress();
  let total = 0;
  for (let i = 0; i < 20; i++) total += capGameCroissants(p, T0, 7);
  assert.equal(total, GAME_CROISSANT_DAILY_CAP);
  assert.equal(capGameCroissants(p, day(1), 7), 7);
});

test('achievements award once, with croissants', () => {
  const p = newProgress();
  p.stats.reviews = 1;
  const got = checkAchievements(p, achievementContext(p, T0));
  assert.deepEqual(got.map(a => a.id), ['premier']);
  assert.equal(p.croissants, 5);
  assert.equal(checkAchievements(p, achievementContext(p, T0)).length, 0);
  const bastille = new Date(2027, 6, 14, 10).getTime();
  assert.ok(checkAchievements(p, achievementContext(p, bastille, { studied: true })).some(a => a.id === 'bastille'));
});

test('shop: buy, level locks, freezes, equip toggles', () => {
  const p = newProgress();
  p.croissants = 100;
  assert.equal(canBuy(p, { id: 'couronne', price: 300, min: 10, slot: 'hat' }).ok, false);
  assert.ok(buy(p, 'beret-rouge'));
  assert.equal(p.croissants, 60);
  assert.equal(p.equip.hat, 'beret-rouge');
  assert.ok(!buy(p, 'beret-rouge'));
  equip(p, 'beret-rouge');
  assert.equal(p.equip.hat, null);
  assert.ok(buy(p, 'gel'));
  assert.equal(p.streak.freezes, 1);
  assert.ok(!buy(p, 'gel')); // only 10 croissants left
});

test('week XP sums Monday to today', () => {
  const p = newProgress();
  p.days['2026-11-02'] = { xp: 50 }; // Monday
  p.days['2026-11-03'] = { xp: 20 };
  p.days['2026-11-01'] = { xp: 999 }; // previous Sunday
  assert.equal(weekXp(p, T0), 70);
});

test('content sanity: 25 tour stops, ranks ascend, map projects on-screen', () => {
  assert.equal(TOUR.length, 25);
  for (let i = 1; i < RANKS.length; i++) assert.ok(RANKS[i].level > RANKS[i - 1].level);
  for (const [lat, lon] of [...FRANCE_OUTLINE, ...TOUR.map(t => [t.lat, t.lon])]) {
    const [x, y] = projectFrance(lat, lon);
    assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${lat},${lon} -> ${x},${y}`);
  }
});

test('random tapping never out-earns knowing the words', async () => {
  const { Session, rId } = await import('../js/session.js');
  const { schedule, newCard, GOOD, AGAIN } = await import('../js/srs.js');
  const { SEED_WORDS } = await import('../js/words.js');
  const ids = SEED_WORDS.slice(0, 5).map(w => rId(w.id));
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function run(accuracy) {
    const p = newProgress();
    const s = new Session(ids);
    let now = T0, combo = 0, xp = 0, firstTry = 0;
    for (let i = 0; i < 500; i++) {
      const id = s.next(now);
      if (!id) break;
      const correct = rand() < accuracy;
      combo = correct ? combo + 1 : 0;
      const before = p.cards[id] || newCard();
      const after = schedule(before, correct ? GOOD : AGAIN, now, undefined, () => 0.5);
      p.cards[id] = after;
      const rec = recordAnswer(p, { cardId: id, before, after, correct, combo, now });
      xp += rec.xp;
      if (correct && !rec.recovering) firstTry++;
      s.answered(id, after, now);
      now += 8000;
    }
    return { xp, pts: Object.values(p.days)[0].pts, croissants: Math.ceil(firstTry / 2) };
  }
  const perfect = run(1);
  for (const acc of [0.25, 0.5, 0.75]) {
    const guess = run(acc);
    assert.ok(perfect.xp > guess.xp, `perfect ${perfect.xp} should beat ${acc * 100}% accuracy ${guess.xp}`);
    assert.ok(perfect.croissants > guess.croissants, `croissants: perfect ${perfect.croissants} vs ${guess.croissants}`);
    assert.ok(perfect.pts >= guess.pts || guess.pts < 10, `goal points: perfect ${perfect.pts} vs ${guess.pts}`);
  }
});

test('daily chest: only after the goal, once a day', async () => {
  const { openChest, chestReady } = await import('../js/progress.js');
  const p = newProgress();
  assert.equal(openChest(p, T0), null);
  p.prefs.goal = 1;
  recordAnswer(p, { cardId: 'a:r', before: newCard(), after: newCard(), correct: true, combo: 0, now: T0 });
  updateGoal(p, T0);
  assert.ok(chestReady(p, T0));
  const prize = openChest(p, T0, () => 0); // first prize
  assert.equal(prize.croissants, 5);
  assert.equal(p.croissants, 5);
  assert.equal(openChest(p, T0), null);
  p.streak.freezes = 2;
  p.days['2026-11-04'] = { goal: true };
  const pz = openChest(p, day(1), () => 0.85); // would be a freeze, but already holding 2
  assert.equal(p.streak.freezes, 2);
  assert.ok(pz.croissants >= 5);
});
