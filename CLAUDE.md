# Les Cartes de Mamou — CLAUDE.md

French vocab flashcards for Nate's kids (Zyler and Kadyn, ~12), who learn French
with Mamou. Hosted on GitHub Pages: https://nssharpe.github.io/mamou-french/
Repo: https://github.com/nssharpe/mamou-french (deploys from `main`, root).

## Ground rules

- **No build step.** Plain ES modules loaded by `index.html`. Use relative URLs only, with no leading `/`, because the site lives under `/mamou-french/`.
- **Shared origin.** Every Pages app on `nssharpe.github.io` (amc8-quest, space-runner, …) shares localStorage and the Cache API.
  - All data lives under the single key `mamou-fr:v1` (`js/store.js`).
  - The service worker touches only caches that start with `mamou-fr-`.
- **Light theme only** (`color-scheme: light`). Text/background pairs must pass WCAG AA. The tokens at the top of `css/app.css` list their contrast ratios. Gold (`--or`) and flag red (`--rouge-flag`) are never used as text colors.
- **Pure logic stays pure.** `srs.js`, `answer.js`, `session.js`, `progress.js`, `store.js`, `words.js`, `data.js` and `util.js` must not touch the DOM at import time, because `npm test` imports them in node.
- **New JS files** must be added to the `SHELL` list in `sw.js` so they work offline.
- **Changing cached files:** bump `CACHE` in `sw.js` (`mamou-fr-vN`) when changing them in a way that needs a clean cache. Network-first means it's rarely needed.

## Files

| File | What it does |
|---|---|
| `js/srs.js` | Anki SM-2: states new/learning/review/relearning, steps 1m/10m, relearn 10m, graduate 1d, easy 4d, ease 2.5 (min 1.3), fuzz. Review cards are due at a 4am day start. |
| `js/session.js` | `todayPlan` (due cards, new cards within the daily limit, English→French unlock + sibling burying), `buildQueue`, `Session` (learning cards come back in-session with a 20-minute learn-ahead). |
| `js/answer.js` | Typed-answer checking: normalisation, accent-blind compare, article/gender detection, typo tolerance, `/`-separated alternatives. |
| `js/progress.js` | XP/levels, streak + freezes, daily goal, trophies, shop buy/equip, weekly XP. |
| `js/store.js` | Data model, load/save/migrate, word edits, share-link encode/decode/diff/apply, backup merge. |
| `js/words.js` | The 30 seed words, plus the bulk-paste parser. |
| `js/data.js` | Ranks, 25 Tour de France stops with facts, France outline, shop items, trophies, phrases. |
| `js/app.js` | Singleton `app` (db, save, go), plus `reward()` (XP → level-ups → trophies) and `celebrate()` (level-up modals). |
| `js/art.js` | Inline SVG: mascot (moods: happy/wow/sad/wink/cool), avatar accessories, flag, skyline. |
| `js/audio.js` | speechSynthesis French voice picking, and WebAudio sound effects. |
| `js/ui.js`, `js/fx.js` | Modals, PIN pad, helpers; confetti, toasts, floaters. |
| `js/main.js` | Hash router. `#import=<code>` opens the word-list import and `#join=<family code>` joins family sync. |
| `js/sync.js` | Pure three-way merge (base / local / remote) for family sync, plus `syncDoc`/`applyDoc` and family codes. |
| `js/cloud.js` | Firestore REST: pull → `merge3` → conditional PATCH (`currentDocument.updateTime`), retried on conflict. Folds in changes made while the sync was in flight. |
| `js/screens/*` | One module per screen, exporting `render({pid, arg, params})`. It may return a cleanup function. |
| `js/games/*` | Games started from `screens/games.js` via `start(el, ctx)`. |

## Data model (`mamou-fr:v1`)

```
{ v, words:[{id, fr, en, emoji, g?, cat, note?, u}], deleted:{id:ts}, disabledCats:[],
  profiles:[{id, name, animal, u}], deletedProfiles:{id:ts}, progress:{[pid]: Progress},
  settings:{sound, voice, rate, pin}, sync: null | {code, base, last} }
```

- Card ids are `${wordId}:r` (French → English) and `${wordId}:p` (English → French).
- Seed profile ids are fixed (`p-zyler`, `p-kadyn`) so backups merge across devices.
- Word ids are stable, so edits keep progress.

## Testing

`npm test` runs node's built-in test runner over `tests/*.test.js`. For the UI, serve the folder (`python -m http.server 8777`) and click through. The browser caches ES modules aggressively; serve with `Cache-Control: no-store` (or hard-reload) while developing.

## Family sync (Firebase)

- **Project:** `mamou-french` on `nssharpe@gmail.com`, Spark (free) plan, Firestore `(default)` in `nam5`. There's no SDK and no sign-in; the app calls the REST API directly.
- **Storage:** one document per family, `families/{familyCode}`, with `data` (the JSON from `syncDoc`), `v` and `updated`. The family code is the secret. `firestore.rules` allows `get`/`create`/`update` on ids of 20+ characters, and never `list` or `delete`.
- **Deploying rules:** the firebase CLI here is logged into UCG accounts, so deploy with gcloud. Get a token with `gcloud auth print-access-token --account nssharpe@gmail.com`, POST the ruleset to `firebaserules.googleapis.com/v1/projects/mamou-french/rulesets`, then PATCH `releases/cloud.firestore`.
- **Merge rules (`js/sync.js`):**
  - Counters (XP, croissants, freezes, stats, per-day numbers) use remote + (local − base). This is why spending can't be undone and XP from two devices adds up.
  - Cards: the latest `last` wins.
  - Single values (prefs, equip, names, disabled groups, PIN): the side that changed wins, and local wins a tie.
  - Sets (trophies, owned items, tombstones) merge as a union.
  - A progress reset bumps `epoch`, and the newest epoch wins outright.
  - Removed players leave a tombstone in `deletedProfiles`.
  - `db.sync.base` is the last synced document. Without a base (first join), the family's single values win and counters add.
- **Applying a sync:** `applyDoc` refills profile and progress objects in place, because open screens hold references to them. Don't replace them with new objects.
- **When it syncs:** a sync runs 4 s after any `app.save()`, every 60 s while visible, and on visibility change or coming back online. Calm screens re-render when changes arrive. Study, games and the duel don't.

## Ideas not done yet

- Recorded audio in Mamou's own voice, instead of the device's text-to-speech voice.
