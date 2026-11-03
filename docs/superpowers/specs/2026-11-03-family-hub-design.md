# Family hub, tickets, typing and spelling — design

Date: 2026-11-03 · Owner: Nate · Status: awaiting approval

## Intent

TV time on the kids' laptops is earned today only by AMC 8 Quest problems,
through the Streaming Lock Chrome extension. Julia's idea is to let the other
learning apps earn TV time too: Les Cartes de Mamou (French), plus two new
apps, **typing** and **spelling**.

The danger is that each kid finds the easiest app and only ever does that. The
point of the balance rules is **steering effort toward what each kid most
needs**. Right now that means spelling and typing for Zyler. Fairness between
apps isn't the goal. App levels can't judge "need" because AMC has a long head
start, so the grown-ups set the mix by hand and adjust it over time.

A **family hub** becomes the kids' front door. Each kid picks their name, sees
the TV time they've earned and this week's mix, and opens any app from there.

Kids: Zyler (she/her) and Kadyn, both in 6th grade, homeschooled (Alpha
Anywhere plus Nate and Julia). They used TypingClub two years ago and liked it.

## Goals

1. One currency, **tickets**, earned in all four apps (AMC, French, Typing,
   Spelling) only for verified work, never for time spent in an app. Leaving a
   problem open for 20 minutes earns nothing.
2. A per-kid, per-app **min and max share** of tickets over a **rolling 7 days**,
   which grown-ups can edit any time. Setting min and max to 0 switches an app
   off for that kid. Every kid has all four apps available (spelling is on for
   Kadyn too, even if it ends up set to 0).
3. The Streaming Lock extension spends tickets instead of AMC answers. The
   daily ladder (each unlock costs more for less time) and the play-time-only
   minutes bank keep working as they do now.
4. A family hub for the kids: pick your name, see your tickets, TV bank and
   weekly mix, and open apps. It also holds the grown-ups' settings.
5. A typing app and a spelling app that feel like their own products.
6. Readable everywhere: WCAG AA contrast is a hard requirement (Nate's global
   rule), including hover, disabled and every theme.

## Non-goals

- Changing how AMC 8 Quest itself works or how it stores answers (Google Form
  → Sheet stays). It only gains a link back to the hub.
- Moving French progress out of its own sync. French keeps its existing
  Firestore family sync and only additionally reports tickets.
- Meaning quizzes in spelling.
- Devices other than the kids' Chrome laptops for the TV lock (same scope as
  the extension today).
- Defending against a determined attacker (forged Firestore writes, clock
  changes). Same "keep honest kids honest" stance as the extension design.

## Anti-goals (failure even if it "works")

- Forcing a strict rotation on every unlock. Kids may do the same app several
  times in a row while they're inside its range.
- Any way to earn tickets by idling, guessing, or replaying something already
  mastered for full value.
- Locking a kid out after they legitimately earned time (sync lag with no
  feedback, a bug that loses tickets).
- The typing or spelling app looking like a reskin of Les Cartes de Mamou.
- Unreadable text (see Goal 6).

## Tickets

- One ticket is meant to be roughly **one minute of genuine effort**, but it is
  never computed from time on the clock.
- Each app awards tickets only for verified work. The default rates are my
  calls; all are editable by grown-ups:

| App | What earns tickets | Default rate |
|---|---|---|
| AMC 8 Quest | Correct answers, counted with the extension's existing rules (`countedAnswers`): voids and resets respected, practice-test problems credited once per year and problem | Problem *n*: `round(1 + 0.2n)` tickets (#1 = 1, #10 = 3, #25 = 6). AMC 10 problems × 1.5. Wrong answers earn 0. |
| French (Les Cartes de Mamou) | First-try correct answers in **Quiz mode** only (typed and multiple-choice), excluding the check right after a new word's introduction (the answer was just on screen). **Flip cards (self-graded) earn 0 tickets**, because they're the honour system and the goal is verified work only (my call). Recovered misses earn 0, matching the app's anti-guessing XP rule. Games don't earn tickets. | 1 ticket per 4 qualifying cards |
| Typing | Correct characters in a passed lesson (at least 1 star) | 1 ticket per 100 correct characters. Replaying a lesson already at 3 stars pays half. |
| Spelling | First-try correct words. A miss, even once fixed, earns 0. | 1 ticket per 3 first-try correct words |

- **Daily use (carried over from today's extension behaviour):** tickets earned
  today fund today's unlocks. Unspent tickets and leftover minutes don't carry
  over to tomorrow.
- **Weekly use:** the rolling 7-day ticket totals drive the balance rules.

### Daily ladder (in tickets)

The ladder is the same shape as today's, with tickets replacing "correct
answers" and **the "problem number at least…" rule retired** (decided).
Harder AMC problems simply pay more tickets.

| Unlock # today | Tickets needed | Minutes |
|---|---|---|
| 1 | 15 | 30 |
| 2 | 20 | 25 |
| 3 | 25 | 20 |
| 4 | 30 | 15 |
| 5 | 35 | 10 |
| 6+ | 40 | 5 |

The default numbers are my call. Note that unlock 1 now costs more AMC work
than today's "3 correct answers"; the grown-ups can tune this. Tickets are
spent in the order they were earned, and unlocks happen by themselves as they
do now. The bank drains only while a show is playing, warns at 5 minutes, and
pauses at 0, exactly as the extension does today.

## Balance rules (decided)

- Per kid, per app: a **min share** and a **max share** of that kid's tickets
  over the trailing 7 days. Both are editable in the hub's grown-ups' corner.
  0–0 switches the app off for that kid: it can still be practised, but it never
  pays.
- **Over max:** while an app is at its max share, further work there still
  works in the app but **awards no counting tickets** until the other apps'
  shares catch up. The hub tile says so plainly ("Practice only, no TV time
  until the others catch up").
- **Under min:** a strong nudge only, with no penalty (decided). The hub
  highlights the app as the "best pick right now". Minimums are enforced
  indirectly by the other apps' maxes.
- **Guaranteed share (my call):** the settings page shows each app's
  guaranteed share, which is `100% − sum of the other apps' maxes` (never below
  0%). When that's below the app's min, it warns in plain words, e.g.
  "Spelling could still end up at 0%. The other apps' maxes add up to 110% —
  bring them down to 75% or less to guarantee 25%." *(Corrected while
  planning: an earlier example said lowering Typing to 45% was enough, which
  was wrong.)*
- **Cold start (my call):** caps are measured against whichever is larger: the
  kid's actual trailing-7-day ticket total, or a **baseline week** (default 150
  tickets, editable). So on a fresh week Zyler can earn up to 30% × 150 = 45 AMC
  tickets before AMC's cap kicks in.
- The cap decision must be a **deterministic function of the ticket log**, so
  the hub and the extension always agree on which tickets count. One pure,
  unit-tested module shared by both (copied into the extension, since it has
  no shared code path) is my call. Process events in time order; a ticket
  counts if, at that moment, the app's counted tickets in the trailing 7 days
  stay within `max% × max(counted total, baseline)`. The builder picks the
  exact formula, as long as it's deterministic, tested, and matches the
  behaviour above.

- **Settings changes (my call):** edits to ranges, rates, the baseline or the
  ladder take effect at the **next local midnight**. The hub stores them with an
  `effectiveFrom` date. That way a mid-day change can never shrink TV time the
  kid has already earned today (the lockout anti-goal), and the balance module
  only needs the settings that apply to "today". From that midnight on, the
  whole trailing window is judged with the new settings. Tickets already spent
  on earlier days aren't affected, because daily tickets expire anyway. The
  hub's settings page says "Takes effect tomorrow". Parent +time / end-now
  stays instant.

### Example ranges (Nate's starting point for Zyler)

| App | Min | Max |
|---|---|---|
| Spelling | 25% | 50% |
| Typing | 25% | 50% |
| French | 10% | 30% |
| AMC | 0% | 30% |

## The family hub

- **Where (my call):** a new GitHub Pages repo, `nssharpe/family-hub` →
  https://nssharpe.github.io/family-hub/. Plain HTML/CSS/ES modules with no
  build step, like the other apps. The repo is public, so no secrets go in it.
- **Kid view** (mockup approved in conversation):
  - "Hi Zyler", **TV minutes earned today** (decided: earned, not minutes
    left), and tickets needed for the next unlock. The hub computes this from
    the ticket log, the Sheet and the ladder. The extension never writes to
    Firestore, and minutes left stay on the laptop's lock screen and countdown.
  - "Where your TV time comes from this week": per app, a bar showing the
    allowed range as a green band and the current share as a mark, with a
    status of *Needs more*, *On track* or *At max*.
  - App tiles that open each app for that kid. The app most under its minimum
    is marked "Best pick right now". An app at max shows "Practice only, no TV
    time until others catch up".
  - Recent tickets ("+3 Spelling, 4:12pm").
- **Grown-ups' corner**, gated by the AMC 8 Quest parent password (compare
  SHA-256 against `PARENT_HASH` in amc8-quest `index.html`):
  - per-kid min/max per app, with the guaranteed-share display and warnings
  - the ticket rates and the baseline week
  - the daily ladder
  - the family sync code and join link
  - today's unlock history, and the +15 / +30 / end-now controls (moved from
    the extension options, or mirrored there; builder's call)
- **Opening apps:** the hub opens each app with the kid preselected, so the app
  skips its own picker. It also passes the hub family code so apps know where
  to report tickets. The mechanism (URL hash parameter, stored locally once) is
  the builder's call. Each app gets a small "← Hub" link.
- **Look:** a neutral family look, distinct from the three apps, light theme,
  WCAG AA.

## Data and sync (my calls)

- **Firebase project:** a new project `sharpe-family` on `nssharpe@gmail.com`,
  Spark (free) plan, Firestore. It follows the pattern already proven on
  `mamou-french`: REST API with no SDK and no sign-in, a long random family code
  as the secret, and rules that only allow access to paths under a code you
  already know. Create the project and deploy rules with gcloud as
  `nssharpe@gmail.com` (the firebase CLI here is logged into UCG accounts). See
  `mamou-french/CLAUDE.md` → "Family sync (Firebase)" for the exact steps.
- **Hub document:** `hubs/{familyCode}` holds the settings: kids, ranges,
  rates, baseline and ladder.
- **Ticket log:** append-only events at `hubs/{familyCode}/tickets/{eventId}`,
  each with `{ id, kid, app, tickets, ts, detail }`. Create-only, never edited
  or deleted by clients, and queryable by `ts` for the trailing 7 days. Rules
  allow listing only under a known family code.
- **AMC tickets aren't written to Firestore.** The hub and the extension both
  derive them from the existing Google Sheet. The extension already reads it,
  and the hub can read it via gviz JSONP the way AMC 8 Quest does. AMC 8 Quest
  needs no data changes.
- **Typing and spelling progress** sync through the same project, keyed by the
  hub family code, so joining the hub once covers them. Their sync and merge
  should reuse Les Cartes de Mamou's three-way merge (`js/sync.js`,
  `js/cloud.js`) and its idea of in-place object refills.
- **French** keeps its own family sync in the `mamou-french` project. It also
  posts ticket events to the hub log when a hub family code is known. Batch them
  (end of session, plus every few minutes) and make them idempotent by event id
  so retries never double-count.
- **Kid identity:** canonical hub ids `zyler` and `kadyn`, mapped to each app's
  own ids: AMC Sheet names, French `p-zyler`/`p-kadyn`, and the same ids for
  typing and spelling.
- **Offline:** apps queue ticket events locally and send them later. The hub
  and lock screen say plainly when tickets may still be arriving, like today's
  "Check again" note for Sheet lag.

## Streaming Lock extension changes

- **Source:** reads tickets from the hub log plus AMC tickets derived from the
  Sheet. Applies the weekly balance rules, then the daily ticket ladder.
- **Options page:** adds a "join hub" step (paste the family code or join link)
  next to choosing the kid. Ladder editing moves to the hub, read from the hub
  document. A cached copy is kept so the lock still works offline.
- **Lock screen:** shows tickets toward the next unlock and links to the hub
  instead of straight to AMC 8 Quest.
- **Unchanged:** the bank drains only while playing, the 5-minute warning,
  pause at zero, the parent +time / end-now controls, the lockdown scripts.
- **Permissions:** a new host permission for `firestore.googleapis.com`.
  Force-installed extensions get it without a prompt.
- **Release:** a new unlisted Chrome Web Store version, reviewed by Google
  (usually a few days). Follow `amc8-quest/extension/PUBLISHING.md`. Until it
  ships, the kids' laptops keep the current AMC-only behaviour.

## Typing app

- **Its own look and feel** (decided): not the café style. The back end and
  structure match Les Cartes de Mamou (profiles, family sync, rewards
  pipeline). The visual identity is the builder's call within the contrast rules.
- **Scoring (decided):** every mistake must be fixed before moving on ("stop on
  error"). The score is **correct characters per minute, shown as WPM**, so slow
  and clean is judged the same as fast with fixes in the same time. Accuracy is
  shown alongside but not double-counted.
- **Lesson path in the style of TypingClub:** home row → top row → bottom row →
  capitals and punctuation → numbers → real words → sentences → short
  paragraphs. Lessons last 1–3 minutes. The lesson text is written fresh, not
  copied from TypingClub.
- **Stars:** each lesson earns 1–3 stars against a speed target for that stage.
  One star is needed to move on, and lessons can be replayed.
- **On-screen keyboard:** highlights the next key and the finger to use, to
  encourage typing without looking.
- **Placement:** a short placement test at the start, so neither kid begins at
  "asdf" if they're past it.
- **Rewards:** its own in-app rewards (the builder decides what fits its
  style). It reports tickets to the hub as above.

## Spelling app

- **Its own look and feel** (decided), with its own mascot and voice character
  rather than Monsieur Croissant. The back end matches Les Cartes de Mamou.
- **Typed answers** (decided), not letter tiles.
- **Each word:** an English voice says the word, a sentence using it, then the
  word again. Replay is available. She types the word and checks it.
- **Wrong answers:** the correct spelling appears with the wrong letters
  highlighted, and she types it correctly once before moving on.
- **Definitions (decided):** a short definition appears unobtrusively, for
  example after answering. There is no meaning quiz.
- **Levels:** grade 5 to grade 12 (both kids are in 6th grade). A short
  placement round picks the start. Moving up happens when a grade's words are
  spelled reliably, and moving down a little when it's too hard.
- **Spaced repetition:** missed words come back using Les Cartes de Mamou's
  SM-2 engine (`js/srs.js`).
- **Word lists:** written fresh, about 150–200 words per grade, leaning toward
  commonly misspelled words, each with an example sentence and a short
  definition. Grown-ups can add their own words, the same way Mamou edits French
  words.
- **Tickets:** reported to the hub as above.

## Constraints

- GitHub Pages hosting, no build step, ES modules, relative URLs. Every app on
  `nssharpe.github.io` shares one origin, so localStorage keys and cache names
  must be namespaced per app.
- Light theme only, WCAG AA everywhere. Verify text and background pairs,
  including hover and disabled states.
- Kid-facing controls are English-first (Nate doesn't speak French). The French
  app keeps French as flavour.
- Pure logic (ticket rates, balance caps, ladder spending, merges) is unit-
  tested with `node --test`, like Les Cartes de Mamou.
- No personal info in requests. Family codes are the only secret, and they
  never go in the repos.
- Les Cartes de Mamou's French vocabulary must not be auto-translated (it
  already sets `translate="no"`). Apply the same to spelling, where
  auto-translate or autocorrect would also spoil answers. Spelling inputs need
  `spellcheck=false`, `autocorrect=off` and `autocapitalize=off`.

## Build order (decided: three builds, in parallel where possible)

1. **Hub + tickets + extension.** Hub page and settings, Firestore project and
   rules, ticket log, the balance/ladder module with tests, French ticket
   reporting, AMC ticket derivation, extension update and republish.
2. **Typing app**, which reports tickets once the hub's ticket API exists.
3. **Spelling app**, same.

Builds 2 and 3 can start right away against a stubbed ticket reporter, and
plug into the hub's ticket log once build 1 defines it. The **ticket event
format and the hub family code handoff** should be agreed first, because all
three depend on them.

## Left to the builder

- Exact cap formula (within the rules above), ticket batching intervals, polling
  frequencies.
- The typing and spelling apps' names, mascots and visual identities.
- The hub's visual style.
- Whether the parent +time controls live in the hub, the extension options, or
  both.
- Data shapes beyond the ticket event fields listed.
