# Family Hub, Tickets and Streaming Lock v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kids earn TV time with **tickets** from any of four apps, inside per-kid weekly share ranges. A new family hub shows it all, and the Streaming Lock extension spends tickets instead of AMC answers.

**Architecture:**
- A new buildless GitHub Pages app, `family-hub`, owns the settings and the ticket log in a new Firestore project, `sharpe-family`. Access is REST only, and the family code is the secret.
- One pure module, `balance.js`, turns the ticket log and settings into counted tickets, the weekly mix and ladder status. It's copied verbatim into the extension so the hub and the lock always agree.
- AMC tickets are derived from the existing Google Sheet. French posts ticket events through a small client, `hub-client.js`. Typing and spelling, built in separate plans, use the same client.

**Tech Stack:** Vanilla HTML/CSS/ES modules, `node --test`, Firestore REST v1, Chrome MV3 extension (existing), gcloud for project setup.

**Spec:** `docs/superpowers/specs/2026-11-03-family-hub-design.md` (in `C:\dev\mamou-french`)

## Global Constraints

- No build step. Relative URLs only. All `nssharpe.github.io` apps share one origin, so localStorage keys are namespaced (`family-hub:v1`, …). Service-worker caches (if any) are prefixed and delete only their own.
- Light theme only. Every text/background pair is WCAG AA (≥ 4.5:1 body, ≥ 3:1 large/UI), including hover and disabled states. Resolve the tokens and check the numbers before finishing a UI task.
- Kid-facing copy is English-first.
- No personal info in any request. Family codes never go in a repo.
- **Ticket event (shared contract, used verbatim by the typing and spelling plans):** `{ id: string, kid: 'zyler'|'kadyn', app: 'amc'|'french'|'typing'|'spelling', tickets: integer ≥ 1, ts: ms epoch, detail: string ≤ 80 chars }`. `id` is globally unique and is the Firestore doc id. Creating the same id twice is a no-op.
- **Firestore (`sharpe-family`):**
  - `hubs/{code}` has fields `data` (string: JSON of `HubSettings`), `v` (int), `updated` (int).
  - `hubs/{code}/tickets/{id}` has fields `kid`, `app`, `tickets` (int), `ts` (int), `detail`.
  - The code is `hub-xxxxx-xxxxx-xxxxx-xxxxx`, using the same alphabet as `mamou-french/js/sync.js` `makeFamilyCode`.
- **Hub handoff:** the hub opens apps with `#hub=<code>&kid=<kidId>` appended to the app URL. Each app stores the code under `<app-namespace>:hub` and preselects the kid. Kid ids: hub `zyler`/`kadyn` = AMC `zyler`/`kadyn` = French `p-zyler`/`p-kadyn`.
- **Defaults (spec):**
  - Rates:
    - AMC problem *n* pays `round(1 + 0.2n)`, and AMC 10 problems (`y` starting `"10:"`) pay that × 1.5, rounded.
    - French pays 1 per 4 qualifying cards.
    - Typing pays 1 per 100 correct chars, ×0.5 when replaying a 3-star lesson.
    - Spelling pays 1 per 3 first-try correct words.
  - Ladder: `[[15,30],[20,25],[25,20],[30,15],[35,10],[40,5]]` as `[tickets, minutes]`, with the last row repeating.
  - Baseline week: 150. Rolling window: 7 × 24 h.
- Settings edits are stored as `pending: { effectiveFrom: 'YYYY-MM-DD', settings }` and apply from the next local midnight. Parent +time / end-now stays instant.
- Tickets earned today fund today's unlocks, and nothing carries to tomorrow. The minutes bank drains only while a show plays (unchanged extension behaviour).

## Review Focus

1. **A ticket event reported twice** (retry after a timeout, or two tabs flushing the same queue) counts once. The hub and the lock show the same totals.
2. **An app at its max mid-event:** an event that crosses the cap counts only the part under it. The rest shows as practice-only in recent tickets.
3. **The first day of a fresh week, or a kid with no events:** caps use the 150 baseline, so the first app used isn't instantly "at max". The mix bars show 0% without dividing by zero.
4. **Offline laptop or Firestore down:** the extension falls back to its last cached settings and tickets plus the Sheet, and the lock says tickets may still be arriving. It never shows fewer minutes than already granted today.
5. **An app with min = max = 0:** it awards 0 counted tickets, its tile reads "Practice only", and its guaranteed share is 0% with no warning.

---

### Task 1: Firestore project `sharpe-family` and rules

**Files:**
- Create: `C:\dev\family-hub\firestore.rules`
- Create: `C:\dev\family-hub\tools\rules-smoke.sh`
- Create: `C:\dev\family-hub\CLAUDE.md` (project notes, including how to redeploy the rules)

**Interfaces:**
- Produces: REST base `https://firestore.googleapis.com/v1/projects/sharpe-family/databases/(default)/documents/`, the rules below.

- [ ] **Step 1: Create the repo folder and project.** `mkdir C:\dev\family-hub && git init -b main`. Then:
  - `gcloud projects create sharpe-family --account <Nate's personal Google account>`
  - enable `firebase.googleapis.com firestore.googleapis.com firebaserules.googleapis.com`
  - `POST firebase.googleapis.com/v1beta1/projects/sharpe-family:addFirebase` (retry after a minute if you get 403 USER_PROJECT_DENIED)
  - `gcloud firestore databases create --location=nam5`

  Follow the exact steps in `C:\dev\mamou-french\CLAUDE.md` → "Family sync (Firebase)".
- [ ] **Step 2: Write `firestore.rules`.**
  - `hubs/{code}`: get, create and update only if `code.size() >= 24 && code.matches('hub-.*')`, the keys are exactly `data`, `v` and `updated`, and `data is string && data.size() < 200000`. List and delete are false.
  - `typing/{code}` and `spelling/{code}` (the typing and spelling apps' progress sync docs): the same rule as `hubs/{code}`, but with `data.size() < 900000`.
  - `hubs/{code}/tickets/{id}`: get and list only if the code passes the same check. Create only if the keys are exactly `kid,app,tickets,ts,detail`, `kid in ['zyler','kadyn']`, `app in ['amc','french','typing','spelling']`, `tickets is int && tickets >= 1 && tickets <= 200`, `ts is int`, and `detail is string && detail.size() <= 80`. Update and delete are false.
- [ ] **Step 3: Deploy the rules** with the ruleset and release REST calls (as in the mamou-french CLAUDE.md).
- [ ] **Step 4: Write `tools/rules-smoke.sh`.** It uses curl with no auth against a random `hub-test-…` code and asserts:
  - creating the hub doc works
  - getting it works
  - a ticket create works
  - creating the same ticket id again fails with `ALREADY_EXISTS` when using `currentDocument.exists=false`
  - listing tickets under the code works
  - a ticket with `tickets: 0` is denied
  - listing `hubs` is denied
  - updating a ticket is denied

  At the end, delete the test docs with the gcloud admin token.
- [ ] **Step 5: Run it.** `bash tools/rules-smoke.sh`. Expected: every line says `OK`, and it exits with 0.
- [ ] **Step 6: Commit.** `git add -A && git commit -m "Firestore project sharpe-family: rules and smoke test"`

### Task 2: `balance.js`, the pure ticket and balance engine

**Files:**
- Create: `C:\dev\family-hub\js\balance.js`, `C:\dev\family-hub\tests\balance.test.js`, `C:\dev\family-hub\package.json` (`"type":"module"`, `"test": "node --test tests/*.test.js"`)

**Interfaces:**
- Produces:
  - `DEFAULT_SETTINGS: HubSettings`, which is `{ v:1, kids:{ zyler:{name:'Zyler', ranges:{amc:[0,30],french:[10,30],typing:[25,50],spelling:[25,50]}}, kadyn:{name:'Kadyn', ranges:{amc:[0,100],french:[0,100],typing:[0,100],spelling:[0,100]}} }, rates:{ amcBase:1, amcPerNum:0.2, amc10Mult:1.5, frenchCardsPerTicket:4, typingCharsPerTicket:100, typingMasteredFactor:0.5, spellingWordsPerTicket:3 }, baseline:150, ladder:[[15,30],[20,25],[25,20],[30,15],[35,10],[40,5]], pending:null }`. Ranges are `[minPct, maxPct]`.
  - `effectiveSettings(doc: HubSettings, now: number): HubSettings`: returns the pending settings once `effectiveFrom <= localDayKey(now)`.
  - `withPendingChange(doc, newSettings, now): HubSettings`: sets `pending` with `effectiveFrom` = tomorrow's local day key.
  - `validateSettings(s): string|null`: returns an error message or null.
  - `amcTickets(answer: {y, n, ok, ts}, rates): number`
  - `amcTicketEvents(answers, kid, rates): TicketEvent[]`: uses id `amc:${y}:${n}:${ts}`, and only answers with `ok` produce events.
  - `countTickets(events: TicketEvent[], ranges, baseline, now): CountedEvent[]`: `CountedEvent = TicketEvent & { counted: number }`, sorted by `(ts, id)`, covering `[now − 14d, now]`.
  - `weeklyMix(counted: CountedEvent[], ranges, now): { [app]: { counted, share, min, max, status: 'needs'|'ok'|'max'|'off' } }`, over the trailing 7 days.
  - `guaranteedShares(ranges): { [app]: { guaranteed: number, warning: string|null } }`
  - `ladderStatus(ladder, counted: CountedEvent[], now): { unlocks, earnedMinutes, nextIndex, needed, done, ticketsToday }`, where `done` = counted tickets toward the next rung.
  - `localDayKey(ts): 'YYYY-MM-DD'`: the local day starts at midnight, matching the extension's `todayKey`.

- [ ] **Step 1: Write the failing tests** in `tests/balance.test.js`:
  - `amcTickets`: `n=1 → 1`, `n=10 → 3`, `n=25 → 6`, AMC 10 `n=25 → 9`, `ok:false → 0`.
  - `countTickets`, uncapped app: one event `{app:'french', tickets:5}` with french range `[0,100]` → `counted 5`.
  - `countTickets`, cold start: zyler ranges, 50 AMC tickets at Monday 9:00 with no other events → counted sum 45, which is 30% × baseline 150. The 46th–50th tickets count 0.
  - `countTickets`, partial: AMC already at 44 of a 45 cap, then a 3-ticket event → `counted 1`.
  - `countTickets`, catch-up: after 300 typing tickets, AMC's cap is 30% × 345 cumulative, so new AMC counts again until it reaches that share.
  - `countTickets`, off: `[0,0]` → every event `counted 0`.
  - `countTickets`, window: an event 8 days old doesn't count toward today's caps.
  - `countTickets`, duplicates: the same id twice is counted once.
  - `weeklyMix`, with no events: every share is 0 and statuses are `'needs'` (min > 0), `'ok'`, or `'off'` (max 0).
  - `guaranteedShares(zyler)`:
    - spelling → `{ guaranteed: 0, warning: "Spelling could still end up at 0%. The other apps' maxes add up to 110% — bring them down to 75% or less to guarantee 25%." }`
    - with ranges `{amc:[0,20], french:[0,20], typing:[25,35], spelling:[25,50]}` → spelling `{ guaranteed: 25, warning: null }`
    - an app with min 0 never warns
  - `ladderStatus`:
    - counted 0 today → `{unlocks:0, nextIndex:0, needed:15, done:0, earnedMinutes:0}`
    - counted 40 → `{unlocks:2, earnedMinutes:55, nextIndex:2, needed:25, done:5}`
    - counted 400 → the last rung repeats
    - yesterday's tickets don't count
  - `effectiveSettings`: a pending change made at 15:00 isn't active until 00:00 the next local day.
  - `validateSettings`: rejects min > max, values outside 0–100, a ladder row ≤ 0, and baseline < 1.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement `balance.js`.**

  The cap rule for `countTickets` is deterministic: process events in `(ts, id)` order. Keep the counted events of the trailing 7 days *as of each event's ts*. Then:

  ```js
  const total = sumCountedInWindow(ts);            // all apps
  const mine  = sumCountedInWindow(ts, app);
  const cap   = (max / 100) * Math.max(baseline, total + e.tickets);
  e.counted   = Math.max(0, Math.min(e.tickets, Math.floor(cap - mine)));
  ```

  For `guaranteedShares`, the guaranteed share is `clamp(100 − Σ other apps' maxes, 0, 100)`. When it's below `min`, the warning uses the exact text pattern from the test, with `100 − min` as the target.
- [ ] **Step 4: Run** `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit.** `git commit -am "balance.js: tickets, weekly caps, mix, guaranteed shares, ladder"`

### Task 3: `hub-client.js`, the Firestore REST client and ticket outbox

**Files:**
- Create: `C:\dev\family-hub\js\hub-client.js`, `C:\dev\family-hub\tests\hub-client.test.js`

**Interfaces:**
- Consumes: the rules from Task 1, and `effectiveSettings` from Task 2.
- Produces (self-contained, no imports, so apps copy the file verbatim):
  - `HUB_API: string`
  - `makeHubCode(rand?): string` and `isHubCode(s): boolean`
  - `getHub(code): Promise<{ settings: HubSettings, updateTime } | null>`
  - `putHub(code, settings, updateTime|null): Promise<updateTime>`: throws `HubConflict` on `FAILED_PRECONDITION`/`ALREADY_EXISTS`.
  - `listTickets(code, sinceTs): Promise<TicketEvent[]>`: uses a `:runQuery` structuredQuery on `tickets` where `ts >= sinceTs` (no orderBy, so no composite index), and the client sorts.
  - `createOutbox(storage, key)`, which returns:
    - `.add(event)`
    - `.flush(code): Promise<{ sent, failed }>`: PATCH `tickets/{id}?currentDocument.exists=false`, treating `ALREADY_EXISTS` as sent.
    - `.pending(): TicketEvent[]`
  - `readHandoff(hash): { code, kid } | null`: parses `#hub=…&kid=…`.

- [ ] **Step 1: Write the failing tests.**
  - Use a stubbed `globalThis.fetch` that records requests.
  - Test the outbox's duplicate safety: `flush` twice with the stub returning 409 `ALREADY_EXISTS` the second time → both report `sent`, and `pending()` is empty.
  - Test persistence: add 2 events, then make fetch throw → `failed 2`, and they stay pending (persisted in the storage stub under `key`).
  - `readHandoff('#hub=hub-abcde-fghij-kmnop-qrstu&kid=zyler')` → `{code:'hub-abcde-fghij-kmnop-qrstu', kid:'zyler'}`, and a bad code → `null`.
  - `listTickets` sends a runQuery body with the `ts` `GREATER_THAN_OR_EQUAL` filter and maps Firestore `integerValue` strings back to numbers.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement**, following `mamou-french/js/cloud.js`'s pull/push pattern for `getHub`/`putHub`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS. Then run `bash tools/rules-smoke.sh` again.
- [ ] **Step 5: Commit.** `git commit -am "hub-client.js: REST client, idempotent ticket outbox, handoff parsing"`

### Task 4: Hub kid view

**Files:**
- Create: `C:\dev\family-hub\index.html`, `css\hub.css`, `js\main.js` (hash router), `js\app.js` (state: hub code from `family-hub:v1`, settings cache, last tickets cache), `js\amc-sheet.js`, `js\screens\pick.js`, `js\screens\kid.js`, `tests\amc-sheet.test.js`

**Interfaces:**
- Consumes: Task 2 (`countTickets`, `weeklyMix`, `ladderStatus`, `amcTicketEvents`, `effectiveSettings`) and Task 3 (`getHub`, `listTickets`, `readHandoff`, `isHubCode`).
- Produces:
  - routes `#/`, `#/kid/<id>`, `#/grown-ups`, and `#join=<code>`
  - `loadKidData(kid): Promise<{ counted, mix, ladder, recent, stale: boolean }>`
  - `amcAnswers(kid): Promise<Answer[]>`: a gviz JSONP read of sheet `1psoHNlkBsdd8Z2QMehLn-iaPsFBmzduSubO3i1BjNo0` using `select * where B='<kid>'`. Copy `parseGviz` and `countedAnswers` verbatim from `amc8-quest/extension/src/lib/ladder.js`, with a header comment naming the source.

- [ ] **Step 1: Write a failing test** in `tests/amc-sheet.test.js`: `countedAnswers` on the fixture rows copied from `amc8-quest/extension/test/ladder.test.js`, plus one practice-test `exam` row with `right:[3,7]`. Expected: 3 counted answers, and the exam ones are credited once.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. Then implement `amc-sheet.js`. Run again. Expected: PASS.
- [ ] **Step 3: Build the screens** to match the approved mockup:
  - `#/` is the kid picker.
  - `#/kid/<id>` shows:
    - "Hi Zyler" and the local date
    - **TV minutes earned today** (`ladder.earnedMinutes`) and "N more tickets for the next unlock"
    - "Where your TV time comes from this week": one bar per app with the range band and a current-share mark, plus a status chip: *Needs more* / *On track* / *At max* / *Off*
    - app tiles linking with handoff to:
      - `https://nssharpe.github.io/amc8-quest/`
      - `https://nssharpe.github.io/mamou-french/`
      - `https://nssharpe.github.io/turbo-keys/`
      - `https://nssharpe.github.io/spell-hive/`

      The app most under its min gets "Best pick right now". An app at max reads "Practice only — no TV time until others catch up". An off app reads "Practice only".
    - the last 10 events as "+3 Spelling · 4:12pm", with "(practice only)" when `counted < tickets`
  - With no hub code yet, `#/` shows a "Grown-ups: set up the hub" button that leads to `#/grown-ups`.
  - Refresh on load, every 60 s while visible, and on `visibilitychange`.
  - When the last fetch failed, show "Tickets may still be arriving — showing what we had at 4:10pm".
- [ ] **Step 4: Verify in the browser.**
  - Serve with no caching (`python <scratchpad>/nocache_server.py 8790 C:/dev/family-hub`).
  - Seed a test hub with `tools/seed-test-hub.mjs`, which writes `DEFAULT_SETTINGS` and 20 mixed events under a `hub-test-…` code.
  - Check the views at 375 px and 1024 px. Check there's no horizontal overflow (`document.documentElement.scrollWidth === innerWidth`), there are no console errors, and the contrast ratios of the chip colors (compute them).
  - Delete the test hub afterwards.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "Hub kid view: picker, TV minutes, weekly mix, app tiles, recent tickets"`

### Task 5: Hub grown-ups' corner and hub creation

**Files:**
- Create: `C:\dev\family-hub\js\screens\grownups.js`, `tests\settings-ui.test.js` (the pure helpers only)
- Modify: `js\main.js` (route `#join=`)

**Interfaces:**
- Consumes: `putHub`, `getHub`, `makeHubCode` (Task 3); `withPendingChange`, `validateSettings`, `guaranteedShares` (Task 2).
- Produces: a hub doc written with `pending`, and the join link `https://nssharpe.github.io/family-hub/#join=<code>`.

- [ ] **Step 1: Password gate.** SHA-256 of the input compared to `3ea107e103aeecaceda90cd5d28027d44617058c00bd1b27289ec4d341302ff3` (AMC 8 Quest `PARENT_HASH`). It stays unlocked for the browser session only.
- [ ] **Step 2: Create or join.**
  - "Create the family hub" generates a code, `putHub(code, DEFAULT_SETTINGS, null)`, stores it, and shows the join link.
  - `#join=<code>` asks "Join this family hub?", then stores the code.
  - The join link is also what the extension's options page accepts (Task 9).
- [ ] **Step 3: Settings form, per kid:**
  - min/max inputs per app (step 5)
  - the guaranteed share shown beside each min, with the `guaranteedShares` warnings shown verbatim
  - the rates, the baseline, and the ladder table (add/remove rows)
  - Save runs `validateSettings` and then `withPendingChange`, then `putHub` with the `updateTime` precondition. On `HubConflict` it re-reads and asks to retry.
  - A banner shows "Changes take effect tomorrow (Wed 4 Nov)" while `pending` exists, and the effective vs pending values are visible.
  - Today's unlock history and the +15 / +30 / end-now controls stay in the extension's options page. The hub can't see laptop usage (decided: the hub shows minutes earned, not minutes left).
- [ ] **Step 4: Write a test** in `tests/settings-ui.test.js` for the pure form helper `formToSettings(formValues, current) → HubSettings`: percent strings become numbers, and blank becomes 0. Run `npm test`. Expected: PASS.
- [ ] **Step 5: Verify in the browser.** Create a test hub. Set Zyler's typing max to 45 and check the warning disappears. Save, and check the "takes effect tomorrow" banner and that a reload keeps it. Delete the test hub.
- [ ] **Step 6: Commit and publish.**
  - `git commit -am "Hub grown-ups corner: password gate, create/join, ranges with guaranteed shares, rates, ladder"`
  - `gh repo create nssharpe/family-hub --public --source . --push`
  - Enable Pages (`gh api -X POST repos/nssharpe/family-hub/pages -f source[branch]=main -f source[path]=/`), wait until it's `built`, and smoke-test the live URL.

### Task 6: French app reports tickets and accepts the handoff

**Files:**
- Create: `C:\dev\mamou-french\js\hub-client.js` (a verbatim copy of Task 3's file, with a first-line comment `// Copied from nssharpe/family-hub js/hub-client.js — keep identical.`)
- Modify: `js\main.js` (the handoff route before `join=`/`import=`), `js\screens\study.js` (count qualifying cards), `js\store.js` (`newProgress().hubUnits = 0`, migrated), `js\screens\dashboard.js` ("← Hub" link when a hub code is known), `sw.js` (add `js/hub-client.js` to `SHELL`)
- Test: `tests\hubtickets.test.js`

**Interfaces:**
- Consumes: `readHandoff`, `createOutbox`, and `getHub` (for `rates.frenchCardsPerTicket`, cached in `mamou-fr:hub-settings`).
- Produces: `cardsToTickets(prog, qualifyingCards, perTicket): number` in a new `js/hubtickets.js`. It adds to `prog.hubUnits`, returns whole tickets, and keeps the remainder. Also French ticket events `{ id: 'french:'+kid+':'+ts, app:'french', detail:'N cards' }`.

- [ ] **Step 1: Write the failing test.** `cardsToTickets` with perTicket 4: 3 cards → 0 tickets (hubUnits 3); then 6 more → 2 tickets (hubUnits 1).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. Implement `js/hubtickets.js`. Run again. Expected: PASS.
- [ ] **Step 3: Count qualifying cards in `study.js`.** A card qualifies when `prog.prefs.mode === 'quiz' && correct && !rec.recovering && !cur.fresh`, which excludes the check right after an introduction.
  - At `finish()`, and every 3 min during a session, convert to tickets and `outbox.add()` an event per conversion, then `flush(code)`.
  - With no hub code, do nothing, and `hubUnits` stays at 0.
- [ ] **Step 4: Handle the handoff** in `main.js`: `readHandoff(location.hash)` → store the code in `mamou-fr:hub`, map `zyler`→`p-zyler`, and `app.go('/p/p-zyler')`.
- [ ] **Step 5: Verify in the browser.** With a test hub, open `http://localhost:8777/#hub=<code>&kid=zyler`. Answer 8 quiz cards correctly first try, then finish. Check `listTickets` shows a 2-ticket French event. Flip mode earns nothing. Delete the test hub.
- [ ] **Step 6: Commit and push.** `git commit -am "French reports tickets to the family hub (quiz mode, first-try, not intro checks)"` and push. Wait for Pages.

### Task 7: AMC 8 Quest handoff and hub link

**Files:**
- Modify: `C:\dev\amc8-quest\index.html` (on load: if `location.hash` matches `#hub=…&kid=…`, store `amc8:hub`, select that kid as if tapped, and clear the hash; add a "← Hub" link in the kid header when `amc8:hub` exists)

**Interfaces:**
- Consumes: the handoff format from the Global Constraints. There's no ticket writing, because AMC tickets come from the Sheet.

- [ ] **Step 1: Implement**, inline in `index.html`'s existing style. The kid ids are the keys of `KIDS`.
- [ ] **Step 2: Verify in the browser.** Open `index.html#hub=hub-abcde-fghij-kmnop-qrstu&kid=zyler`: Zyler's screen opens without the picker, and "← Hub" goes to `https://nssharpe.github.io/family-hub/#/kid/zyler`.
- [ ] **Step 3: Commit and push.** `git commit -am "Open from the family hub with the kid preselected; link back to the hub"`

### Task 8: Extension, ticket-based status

**Files:**
- Create: `C:\dev\amc8-quest\extension\src\lib\balance.js` (a verbatim copy of Task 2's file with the "keep identical" header) and `test\balance-copy.test.js`
- Modify: `src\background.js`, `src\lib\ladder.js` (keep `parseGviz`, `countedAnswers`, `todayKey`, `localDayStart`; delete `earnedUnlocks`, `rungFor`, `DEFAULT_LADDER`, `validateLadder`, and the old `computeStatus`), `test\ladder.test.js` (drop the tests of the removed functions), `src\manifest.json` (`version: "2.0.0"`, add `https://firestore.googleapis.com/*` to `host_permissions`, description "Netflix and Disney+ unlock with tickets earned in the family learning apps. Minutes only count down while a show is playing."), `package.json` (`test` runs `test/*.test.js` except e2e)

**Interfaces:**
- Consumes: `countTickets`, `ladderStatus`, `amcTicketEvents`, `effectiveSettings`, `DEFAULT_SETTINGS` (copied `balance.js`).
- Produces: `computeStatus({ kid, settings, tickets, answers, usage, now })`, which returns the existing status fields plus the new ones. The `lock.js` fields are `configured, active, remainingMs, earnedMinutes, nextIndex, needed, done, minutes`, where `needed`/`done` are now tickets and `minNum` is removed.

- [ ] **Step 1: Write the failing tests.**
  - `test/balance-copy.test.js` asserts the copy's bytes after line 1 equal `../../../family-hub/js/balance.js` when that path exists. If it doesn't, it skips with a message.
  - A new `computeStatus` test:
    - AMC answers worth 12 tickets plus a French event of 4 → `{active:true, earnedMinutes:30, remainingMs:30*60000}`.
    - Adding usage `usedMs: 10 min` → `remainingMs: 20 min`.
    - Settings with AMC at `[0,0]` → `earnedMinutes:0` from AMC alone.
    - Never-shrink: with `grantedToday: { date: today, minutes: 30 }` and tickets that now only count for 25 minutes (a cap recalculation) → `earnedMinutes: 30`.
    - Offline: the fetch throws and `hubCache` holds 15 tickets from today → `earnedMinutes: 30`, and the status carries `stale: true` so the lock can say tickets may still be arriving.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** in `background.js`:
  - Read `hub` (code) from `chrome.storage.local`.
  - Fetch the hub settings and the last 14 days of tickets with the same REST calls as `hub-client.js`. Inline them in `background.js`, because the extension can't import from another repo; reuse the shapes.
  - Cache both in `chrome.storage.local` (`hubCache: { settings, tickets, at }`) and use the cache when a fetch fails.
  - Combine `amcTicketEvents(countedAnswers(sheetRows))` with the hub tickets, then call `computeStatus`.
  - **Never show fewer minutes than already granted today:** persist `grantedToday: { date, minutes }` and take the max. That way a late cap recalculation can't take time back.
  - With no hub joined, use `DEFAULT_SETTINGS` and AMC tickets only, so the laptop still works the day it updates.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "Streaming Lock 2.0: spend tickets from all apps with weekly caps"`

### Task 9: Extension UI, release package and docs

**Files:**
- Modify: `src\options.html`, `src\options.js` (a "Family hub" section with a paste box for the join link or code, validated with the same regex as `isHubCode`, saved as `hub`; the ladder editor is replaced by a read-only view of the hub ladder with "Edit in the family hub ↗"; the kid choice and the +15/+30/end-now controls stay), `src\lock.js` (the requirement line becomes "Earn N tickets in your learning apps", the dots become "D of N tickets", and the button opens `https://nssharpe.github.io/family-hub/#/kid/<kid>`), `test\e2e.test.js` (a `devHubUrl` override like `devSheetUrl`, used only in unpacked builds, serving fixture settings and tickets), `README.md` (the ticket ladder replaces the problem ladder; joining the hub becomes setup step 5b), `PUBLISHING.md` (the new host permission and its justification: "reads the family's learning tickets")

**Interfaces:**
- Consumes: Task 8's status fields and stored `hub` key.

- [ ] **Step 1: Update the e2e test.** Joining a hub in options stores `hub`. A fixture with 15 tickets unlocks 30 minutes, and the lock shows "15 of 15 tickets" before it auto-unlocks.
- [ ] **Step 2: Run** `npm run test:e2e`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3: Verify contrast** for the new lock and options text (compute the pairs from the extension CSS tokens).
- [ ] **Step 4: Build the store zip.** `npm run zip`. Expected: a `dist/…-2.0.0.zip` is created.
- [ ] **Step 5: Commit and push.** `git commit -am "Streaming Lock 2.0 UI: join hub, ticket lock screen, docs"`
- [ ] **Step 6: Hand the release to Nate.** Uploading to the Chrome Web Store needs his developer account. Give him the zip path and the PUBLISHING.md steps. Until Google approves, the laptops keep running 1.2.1.

## Release checklist (after all tasks)

- The hub is live. Nate creates the real family hub in the grown-ups' corner. Each laptop's extension joins it after 2.0.0 installs.
- Run `bash tools/rules-smoke.sh`. Confirm no `hub-test-` docs remain (an admin list).
