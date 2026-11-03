# Turbo Keys (Typing App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turbo Keys is a typing app in the style of TypingClub for Zyler and Kadyn. It uses stop-on-error lessons scored on the speed of finished correct text, with stars and a placement test. It syncs progress and reports tickets to the family hub.

**Architecture:** A buildless GitHub Pages app at `nssharpe/turbo-keys`. The back end and structure copy Les Cartes de Mamou (`C:\dev\mamou-french`): its module layout, store/migrate, three-way merge sync (`sync.js`/`cloud.js`, retargeted at the `sharpe-family` project), and hash router. The look is its own: a bright racing/arcade theme (checkered flags, speed stripes, a racing mascot), not the café look.

**Tech Stack:** Vanilla HTML/CSS/ES modules, `node --test`, Firestore REST (the `sharpe-family` project from the hub plan).

**Spec:** `C:\dev\mamou-french\docs\superpowers\specs\2026-11-03-family-hub-design.md` (the "Typing app" and "Tickets" sections). Depends on the hub plan's `hub-client.js` and Firestore rules (`C:\dev\mamou-french\docs\superpowers\plans\2026-11-03-family-hub-tickets.md`, Tasks 1 and 3).

## Global Constraints

- No build step. Relative URLs only. localStorage key `turbo-keys:v1`. Service-worker cache prefix `turbo-keys-` (deletes only its own caches).
- Light theme only. WCAG AA for every text/background pair, including hover, disabled, the key highlight and finger colours. Compute the ratios before finishing any UI task.
- **Stop on error (spec):** a wrong key doesn't advance the cursor. The score is **correct characters per minute, shown as WPM** (`(text.length / 5) / minutes`). Accuracy (`correct presses / all presses`) is shown but isn't part of the score.
- Lessons last 1–3 minutes. 1–3 stars against the stage's target WPM. 1 star is needed to move on.
- **Tickets (shared contract):**
  - The event is `{ id: 'typing:'+kid+':'+ts, kid, app: 'typing', tickets: int ≥ 1, ts, detail: 'Lesson 12 · 24 wpm' }`, sent with the copied `hub-client.js` outbox.
  - Units are the correct characters of lessons that earned ≥ 1 star, × `rates.typingMasteredFactor` (0.5) when the lesson already had 3 stars before this play.
  - Tickets = whole multiples of `rates.typingCharsPerTicket` (100). The remainder is kept in progress.
  - Rates come from the hub settings (cached), defaulting to the values above.
- **Handoff:** read `#hub=<code>&kid=<kidId>` with `readHandoff`, store it under `turbo-keys:hub`, and preselect the kid. Kid ids are `zyler` and `kadyn`. A "← Hub" link goes to `https://nssharpe.github.io/family-hub/#/kid/<kid>`.
- Text inputs must not autocorrect: `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`. Capture keystrokes on a focused element and ignore auto-repeat (`e.repeat`).
- Lesson text is written fresh. Nothing is copied from TypingClub.

## Review Focus

1. **Holding a key down, or auto-repeat:** it counts as one press, not many wrong presses.
2. **Modifier keys** (Shift, Caps Lock, Alt) and dead keys aren't counted as presses. Capitals typed with Shift match, and Caps Lock being on shows a "Caps Lock is on" hint.
3. **The tab loses focus mid-lesson** (switching windows): the clock pauses, and the WPM excludes the time away.
4. **Replaying a 3-star lesson** pays half, and replaying a never-starred lesson that's still under 1 star pays 0.
5. **An offline lesson finish** keeps the ticket event in the outbox and sends it on the next load, without a duplicate.

---

### Task 1: Scaffold from Les Cartes de Mamou

**Files:**
- Create in `C:\dev\turbo-keys\`:
  - `index.html`, `css/app.css`
  - `js/util.js` (copy), `js/ui.js` (copy, then restyled), `js/fx.js` (copy)
  - `js/store.js`, `js/app.js`, `js/main.js`
  - `js/sync.js` and `js/cloud.js` (copies adapted: `PROJECT = 'sharpe-family'`, `URL_BASE = …/documents/typing/`, keyed by the hub code; the `syncDoc`/`applyDoc`/`merge3` fields match this app's model)
  - `js/hub-client.js` (a verbatim copy with the "keep identical" header)
  - `package.json`, `tests/store.test.js`, `tests/sync.test.js`, `CLAUDE.md`, `.claude/launch.json`

**Interfaces:**
- Produces:
  - `db = { v, profiles: [{id:'zyler'|'kadyn'|uid, name, avatar}], progress: { [pid]: Progress }, settings: { sound }, sync: null|{code, base, last}, hub: null|code }`
  - `Progress = { lessons: { [lessonId]: { stars, bestWpm, bestAcc, plays, lastTs } }, placementDone: bool, stageUnlocked: int, ticketUnits: number, stats: { charsTyped, lessonsDone, minutesTyped } }`
  - `newProgress()`, `migrate(db)`, `loadDB/saveDB`
  - the `app` singleton (same API as Les Cartes: `init, save, go, profile, prog, sync`)
- Merge rules (follow `mamou-french/js/sync.js`):
  - lessons: per id, `stars` max, `bestWpm` max, `bestAcc` max, `plays` counter, `lastTs` max
  - `ticketUnits` and `stats`: counters
  - `stageUnlocked`: max
  - `placementDone`: OR

- [ ] **Step 1: Write the failing tests.**
  - `store.test.js`: the default db has kids `zyler` and `kadyn`, and the key is `turbo-keys:v1`.
  - `sync.test.js`, two devices each finishing a different lesson: both lessons are present, and `plays` adds up.
  - `sync.test.js`, the same lesson with 2 stars on A and 3 on B: 3 stars.
  - `sync.test.js`: `ticketUnits` counters add with `remote + (local − base)`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git init -b main && git add -A && git commit -m "Scaffold Turbo Keys from Les Cartes de Mamou's structure"`

### Task 2: Typing engine (pure)

**Files:**
- Create: `js/engine.js`, `tests/engine.test.js`

**Interfaces:**
- Produces:
  - `createRun(text: string, now: number): Run`
  - `press(run, key: string, now, opts?: { repeat?: boolean }): 'ok'|'wrong'|'done'|'ignored'`: mutates the run. A wrong key leaves `pos` unchanged. Modifier names (`Shift`, `CapsLock`, `Alt`, `Control`, `Meta`, `Dead`) and `opts.repeat` return `'ignored'`.
  - `pause(run, now)` and `resume(run, now)`
  - `runStats(run): { wpm: number, accuracy: number, ms: number, correctChars: number }`
  - `starsFor(wpm, target): 0|1|2|3`: 3 when wpm ≥ target, 2 when ≥ 0.8 target, 1 when ≥ 0.6 target, else 0.
  - `ticketUnitsFor(correctChars, starsBefore, starsNow, masteredFactor): number`: 0 when `starsNow === 0`, × factor when `starsBefore === 3`.

- [ ] **Step 1: Write the failing tests.**
  - `"cat"` typed `c,x,a,t` → presses `ok, wrong, ok, done`, accuracy 0.75.
  - A 50-character text finished in 30 s → wpm 20.
  - Pause 10 s mid-run → `ms` excludes the 10 s.
  - `starsFor(18,20) === 2`, `starsFor(11,20) === 0`.
  - `ticketUnitsFor(300,3,3,0.5) === 150`, `ticketUnitsFor(300,0,0,0.5) === 0`.
  - Ignored modifiers don't change the accuracy.
  - `press(run,'x',now,{repeat:true})` → `'ignored'`, and the accuracy is unchanged.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -am "Typing engine: stop-on-error runs, WPM, accuracy, stars, ticket units"`

### Task 3: Curriculum and lesson text

**Files:**
- Create: `js/curriculum.js`, `js/texts.js` (authored words, sentences and paragraphs), `js/keyboard.js` (US QWERTY layout and finger map), `tests/curriculum.test.js`

**Interfaces:**
- Produces:
  - `STAGES: [{ id, name, targetWpm, keys: string, lessons: Lesson[] }]`, in this order and with these targets:

    | Stage | targetWpm |
    |---|---|
    | Home row | 12 |
    | Top row | 15 |
    | Bottom row | 15 |
    | Capitals and punctuation | 18 |
    | Numbers | 15 |
    | Real words | 20 |
    | Sentences | 22 |
    | Short paragraphs | 25 |

    Each stage has 6–10 lessons.
  - `Lesson = { id: 'S2L3', title, text }`. Drill lessons are generated from the cumulative key set with `seededDrill(keys, length, seed)`: deterministic, no repeats of the same 3-letter group in a row, lengths 60–180 chars. The word, sentence and paragraph lessons use `texts.js`.
  - `FINGER: { [char]: 'L-pinky'|'L-ring'|'L-middle'|'L-index'|'R-index'|'R-middle'|'R-ring'|'R-pinky'|'thumb' }`
  - `lessonById(id)`, `nextLesson(progress)`

- [ ] **Step 1: Write the failing tests.**
  - Every lesson's text uses only its stage's cumulative keys (plus space).
  - Lesson ids are unique.
  - `seededDrill` gives the same output for the same seed.
  - Every char in every text has a `FINGER` entry.
  - Every lesson fits 1–3 minutes at the stage target: `targetWpm*5 ≤ text.length ≤ targetWpm*5*3`.
- [ ] **Step 2: Write `texts.js`**, original and kid-appropriate: about 120 common words for the "Real words" stage, 24 sentences, and 10 short paragraphs (each 3–4 sentences, light topics like animals, space and sports).
- [ ] **Step 3: Run** `npm test`. Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -am "Curriculum: 8 stages, generated drills, authored words/sentences/paragraphs, finger map"`

### Task 4: Screens, the look and tickets

**Files:**
- Create: `js/screens/home.js` (kid picker; the handoff skips it), `js/screens/path.js` (the lesson path map with stars and locks), `js/screens/lesson.js` (the typing screen), `js/screens/results.js`, `js/screens/placement.js`, `js/screens/grownups.js` (rename kids; reset progress; sound), `js/art.js` (the mascot and racing SVG), `js/hubtickets.js`, `tests/hubtickets.test.js`

**Interfaces:**
- Consumes: Tasks 1–3, `hub-client.js` (`readHandoff`, `createOutbox`, `getHub`).
- Produces:
  - `awardTickets(prog, units, perTicket): number`: adds to `prog.ticketUnits`, returns whole tickets, keeps the remainder.
  - Lesson finish: if stars ≥ 1, `awardTickets`, then `outbox.add(event)` + `flush(hubCode)`.

- [ ] **Step 1: Write the failing test.** `awardTickets` with perTicket 100: 150 → 1 (60 left after a second call of 10). Run `npm test`. Expected: FAIL. Implement. Expected: PASS.
- [ ] **Step 2: Build the lesson screen.**
  - The text shows with typed chars dimmed but legible (the ratio still meets AA), the current char underlined and highlighted, and a wrong press flashing the current char red with a soft sound.
  - The on-screen keyboard highlights the next key, and a hand diagram shows the finger (`FINGER`).
  - Live WPM and a progress bar.
  - The clock pauses on `blur`/`visibilitychange` (`pause`/`resume`) and shows "Paused — click to keep going".
- [ ] **Step 3: Build the results screen:** stars with an animation, WPM, accuracy, "+N tickets sent to the hub" (when there's no hub code: "Join the family hub to earn TV tickets"), and "Next lesson" / "Try again". Whether tickets count toward TV under the weekly caps is shown by the hub, not here.
- [ ] **Step 4: Build the placement test,** shown on first open per kid.
  - A 60-second run on a "Sentences"-stage text.
  - It unlocks stages by WPM: `<10 → stage 1`, `10–14 → stage 2`, `15–19 → stage 4`, `20–24 → stage 6`, `≥25 → stage 7`.
  - Unlocked earlier lessons are marked passed with 1 star, so tickets for them still need real plays.
- [ ] **Step 5: Look and feel.** Racing/arcade identity: a checkered accent, speed-stripe headers, and a mascot (a small race car or a cheetah in goggles; the implementer chooses). Use a display font from Google Fonts. Light theme. Run a contrast pass (compute every token pair).
- [ ] **Step 6: Verify in the browser.**
  - Run a full lesson at 375 px and 1280 px. Check that holding a key, Shift capitals and Caps Lock behave per the Review Focus.
  - With a test hub code, finishing a lesson writes a typing ticket event.
  - There's no horizontal overflow and no console errors.
- [ ] **Step 7: Commit, then publish.**
  - `gh repo create nssharpe/turbo-keys --public --source . --push`
  - Enable Pages and verify the live URL works with `#hub=…&kid=zyler`.
