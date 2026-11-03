# Spell Hive (Spelling App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spell Hive is a spelling app for grades 5 to 12. The kid hears a word, then a sentence using it, then the word again, and types it. Missed words come back with spaced repetition, the level adapts by grade, and a short definition appears unobtrusively. It syncs progress and reports tickets to the family hub.

**Architecture:** A buildless GitHub Pages app at `nssharpe/spell-hive`. The back end and structure copy Les Cartes de Mamou (`C:\dev\mamou-french`):
- the module layout, store/migrate, and hash router
- the SM-2 engine (`srs.js`) and the session queue (`session.js`)
- the three-way merge sync (`sync.js`/`cloud.js`, retargeted at the `sharpe-family` project)

Its own look is a honeycomb/bee theme with a bee mascot, not the café look.

**Tech Stack:** Vanilla HTML/CSS/ES modules, `node --test`, the Web Speech API (English voice), Firestore REST.

**Spec:** `C:\dev\mamou-french\docs\superpowers\specs\2026-11-03-family-hub-design.md` (the "Spelling app" and "Tickets" sections). Depends on the hub plan's `hub-client.js` and Firestore rules (`…/plans/2026-11-03-family-hub-tickets.md`, Tasks 1 and 3).

## Global Constraints

- No build step. Relative URLs only. localStorage key `spell-hive:v1`. Service-worker cache prefix `spell-hive-` (deletes only its own caches).
- Light theme only. WCAG AA for every text/background pair, including hover, disabled and the diff highlighting. Compute the ratios.
- `<html translate="no">` and `<meta name="google" content="notranslate">`. The answer input uses `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`.
- **Answers are typed** (not tiles). Matching is case-insensitive and trims spaces. Curly apostrophes and hyphens count as `'` and `-`. Nothing else is forgiven.
- **After a miss:** show the correct spelling with the wrong or missing letters highlighted, then the kid types it correctly once before moving on.
- **Definitions** appear unobtrusively after answering. No meaning quiz.
- **Levels:** grade 5 to 12, with a placement round on first open.
- **Tickets (shared contract):**
  - The event is `{ id: 'spelling:'+kid+':'+ts, kid, app: 'spelling', tickets: int ≥ 1, ts, detail: 'N words' }`.
  - Units are **first-try correct** words only. A word missed earlier today (the same rule as Les Cartes's `miss` day key) earns 0.
  - Tickets = whole multiples of `rates.spellingWordsPerTicket` (3). The remainder is kept.
  - Rates come from the hub settings (cached), defaulting to 3.
- **Handoff:** `#hub=<code>&kid=<kidId>` via `readHandoff`, stored under `spell-hive:hub`. "← Hub" goes to `https://nssharpe.github.io/family-hub/#/kid/<kid>`.
- Word content is written fresh, not copied from published spelling programs.

## Review Focus

1. **A missed word answered correctly on retry** never earns tickets that day, and it counts as a miss for SRS and level stats.
2. **Typing the word in different capitals** ("Necessary") is correct. A trailing space is correct. "neccessary" is wrong, and the diff highlights the extra "c".
3. **A device without an English voice:** the word and sentence appear as text with the word blanked in the sentence ("It's ____ to bring a coat"), so a session still works. Replay is hidden.
4. **A kid at grade 12 who keeps getting everything right** stays at 12 and draws review words once the new words run out. A kid at grade 5 who keeps missing stays at 5.
5. **Grown-up custom words with no sentence or definition:** the app says just the word, and shows no definition line.

---

### Task 1: Scaffold from Les Cartes de Mamou

**Files:**
- Create in `C:\dev\spell-hive\`:
  - `index.html`, `css/app.css`
  - `js/util.js`, `js/srs.js`, `js/ui.js`, `js/fx.js` (copies)
  - `js/session.js` (adapted: one card per word, id `w:<wordId>`)
  - `js/store.js`, `js/app.js`, `js/main.js`
  - `js/sync.js` and `js/cloud.js` (adapted: `PROJECT = 'sharpe-family'`, path `spelling/<hubCode>`)
  - `js/hub-client.js` (a verbatim copy with the "keep identical" header)
  - `package.json`, `tests/store.test.js`, `tests/sync.test.js`, `CLAUDE.md`, `.claude/launch.json`

**Interfaces:**
- Produces:
  - `db = { v, profiles:[{id:'zyler'|'kadyn'|uid, name, avatar}], customWords: [Word], deleted:{}, progress:{ [pid]: Progress }, settings:{ sound, voice, rate }, sync, hub }`
  - `Progress = { cards:{ [cardId]: Card }, grade: 5..12, placementDone, history: [{ wordId, grade, firstTry: bool, ts }] (last 200), ticketUnits, stats:{ attempted, firstTryRight }, days:{} }`
  - `Word = { id, word, sentence?, definition?, grade: 5..12 | 'custom' }`
- Merge rules (follow `mamou-french/js/sync.js`):
  - cards: latest `last` wins
  - `history`: union by `(wordId, ts)`, keeping the last 200
  - `ticketUnits` and `stats`: counters
  - `grade`: the side that changed wins
  - `customWords`: last-writer-wins by `u`, with tombstones in `deleted`

- [ ] **Step 1: Write the failing tests.**
  - The default db has kids `zyler` and `kadyn`, `grade` 5, and the key `spell-hive:v1`.
  - Sync: two devices practise different words, and both cards merge.
  - Sync: `ticketUnits` adds with `remote + (local − base)`.
  - Sync: a custom word deleted on A stays deleted.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git init -b main && git add -A && git commit -m "Scaffold Spell Hive from Les Cartes de Mamou's structure"`

### Task 2: Word bank, grades 5–12

**Files:**
- Create: `data/grade5.js` … `data/grade12.js` (each `export default [Word]`), `js/words.js` (`ALL_WORDS`, `wordsForGrade(g)`, `wordById(id)`), `tests/words.test.js`

**Interfaces:**
- Produces: about 150–200 words per grade, each `{ id: 'g<grade>-<word>', word, sentence, definition, grade }`.
  - Each list leans toward commonly misspelled words for that level: doubled letters, silent letters, -ible/-able, ie/ei, homophones in context, and so on.
  - The sentence is ≤ 16 words, kid-appropriate, and contains the exact word.
  - The definition is ≤ 12 words, plain, and doesn't contain the word.

- [ ] **Step 1: Write the failing tests.**
  - Every grade has 150 to 200 entries.
  - Words are unique across all grades (case-insensitive).
  - Ids are unique.
  - Every `sentence` contains `word` as a whole word (case-insensitive) and has ≤ 16 words.
  - Every `definition` doesn't contain the word and has ≤ 12 words.
  - Words are only letters, apostrophes or hyphens.
  - The grade field matches its file.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Write the eight grade files.** Split the work by grade, one subagent per two grades is fine. Each one double-checks spellings and definitions (no made-up meanings). Grades rise in difficulty: grade 5 has words like *believe*, *library* and *favorite*; grade 12 has words like *conscientious*, *idiosyncrasy* and *onomatopoeia*.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "Word bank: grades 5-12 with sentences and definitions"`

### Task 3: Spelling engine (pure)

**Files:**
- Create: `js/spell.js`, `js/level.js`, `tests/spell.test.js`, `tests/level.test.js`

**Interfaces:**
- Produces:
  - `normalize(s): string`: lowercases, trims, and maps curly apostrophes and hyphen variants.
  - `checkSpelling(input, word): { ok: boolean, diff: Array<{ ch: string, kind: 'same'|'wrong'|'missing'|'extra' }> }`: the diff comes from a Levenshtein backtrace aligning the input to the word, for highlighting.
  - `updateGrade(progress, now): { grade, changed: 'up'|'down'|null }`:
    - **up** when the last 20 first-try attempts at the current grade are ≥ 90% right (and grade < 12)
    - **down** when the last 10 at the current grade are < 50% right (and grade > 5)
    - the history window for that grade resets after a change
  - `placementStart(results: Array<{ grade, ok }>): grade`: 3 words per grade from 5 upward. It stops at the first grade with ≥ 2 misses, and the start is that grade − 1 (minimum 5). With no stop, the start is 12.
  - `recordAttempt(prog, wordId, ok, now): { firstTry: boolean }`: `firstTry` is true only when `ok` and the word wasn't missed earlier the same local day. It appends to `history` and sets `card.miss` on a miss.
  - `buildSpellingQueue(prog, words, now, size=15): cardId[]`: due reviews first, then custom words not yet seen, then new words of `prog.grade`, then (when those run out) the oldest-due reviews of any grade.

- [ ] **Step 1: Write the failing tests.**
  - `checkSpelling(' Necessary ', 'necessary').ok === true`.
  - `checkSpelling('neccessary','necessary')` → `ok:false` with exactly one `extra` entry, for `c`.
  - `checkSpelling('recieve','receive')` marks the transposed letters as `wrong`.
  - `checkSpelling('don’t','don't').ok === true`.
  - `updateGrade`: 20 attempts at grade 6 with 18 right → up to 7. 10 attempts with 4 right → down to 5. At grade 12 with 20/20 → stays 12, `changed null`.
  - `placementStart`:
    - grade 5 all right, grade 6 with 2 misses → 5
    - all right through 12 → 12
    - grade 5 with 2 misses → 5
  - `buildSpellingQueue`: due cards come before new ones, and size is respected.
  - `recordAttempt`: a miss, then a correct answer the same day → the second returns `firstTry: false`. A correct answer the next day → `firstTry: true`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -am "Spelling engine: lenient-where-fair check with diff, grade adaptation, placement, queue"`

### Task 4: Screens, voice, look and tickets

**Files:**
- Create:
  - `js/audio.js`: adapted from Les Cartes. It picks an `en-US` voice, then `en-GB`, then any `en`, and plays `sayWord(word, sentence)`, which speaks "word. sentence. word." at rate 0.9, with `primeSpeech` on the first tap.
  - `js/screens/home.js`, `js/screens/practice.js`, `js/screens/summary.js`, `js/screens/placement.js`
  - `js/screens/grownups.js`: add, edit and delete custom words (word, optional sentence, optional definition); rename kids; set a kid's grade by hand; voice and rate; reset progress. It's gated by the AMC 8 Quest parent password hash `3ea107e103aeecaceda90cd5d28027d44617058c00bd1b27289ec4d341302ff3`.
  - `js/art.js` (the bee mascot and honeycomb SVG), `js/hubtickets.js`, `tests/hubtickets.test.js`

**Interfaces:**
- Consumes: Tasks 1–3, and `hub-client.js` (`readHandoff`, `createOutbox`, `getHub`).
- Produces: `awardTickets(prog, units, perTicket): number`, with the same semantics as the typing app. At the end of a session, if tickets ≥ 1, `outbox.add` + `flush`.

- [ ] **Step 1: Write the failing test.** `awardTickets` with perTicket 3: 2 → 0, then 4 → 2 (0 left). Run `npm test`. Expected: FAIL. Implement. Expected: PASS.
- [ ] **Step 2: Build the practice screen.**
  - Big 🔊 "Hear it" and "Hear the sentence" buttons, which auto-play on show, and the input.
  - Enter checks the answer.
  - **Correct:** a cheerful bee reaction. The definition fades in below, quietly in secondary text, with the word shown.
  - **Miss:** the correct word appears with the diff highlighting (`wrong` and `missing` letters marked, `extra` letters shown struck through in her answer). Then "Type it once more" requires a correct retype before "Next".
  - Without a voice, follow the Review Focus #3 fallback.
- [ ] **Step 3: Build the summary screen:** words right first try, words to practise again, a grade-up or grade-down notice, and "+N tickets sent to the hub" (or the join-the-hub hint).
- [ ] **Step 4: Build the placement screen** on first open per kid: "Let's find your level".
- [ ] **Step 5: Look and feel.** Honeycomb and bee identity: hex tiles, honey-gold accents (never used as text colour on light backgrounds), and a friendly bee mascot with a few moods. Use a display font from Google Fonts. Run a contrast pass (compute every token pair, including the diff colours).
- [ ] **Step 6: Verify in the browser.**
  - Play a session at 375 px and 1280 px. Check a miss and its retype, a capitalized correct answer, and the no-voice fallback (stub `speechSynthesis.getVoices` to return `[]`).
  - With a test hub, 3 first-try words give a 1-ticket spelling event.
  - There's no horizontal overflow and no console errors.
- [ ] **Step 7: Commit, then publish.**
  - `gh repo create nssharpe/spell-hive --public --source . --push`
  - Enable Pages and verify the live URL works with `#hub=…&kid=zyler`.
