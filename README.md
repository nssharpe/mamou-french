# Les Cartes de Mamou 🥐

French flashcards for Zyler and Kadyn, who are learning French with Mamou.
Live at **https://nssharpe.github.io/mamou-french/**

Monsieur Croissant (a croissant in a beret) runs the show. Each kid picks their
profile on the home screen. There's no login.

## What's in it

- **Today's cards (daily review).** Spaced repetition works the way Anki does
  (the SM-2 algorithm, with 1-minute and 10-minute learning steps and a 4am day
  boundary). Words you know come back less and less often, and tricky ones come
  back sooner. Every word has two cards: French → English first, then
  English → French once the first one is learned.
- **Quiz mode** (the default) checks answers automatically:
  - A new word gets an introduction, then a multiple-choice check.
  - Words you know well get a "listen and pick" round.
  - English → French starts as multiple choice and moves to typing once the card
    has graduated. It has accent buttons and gentle feedback for a missing
    accent, a missing article, or the wrong gender (le / la).
  - **Flip mode** is classic Anki: you flip the card and grade yourself
    (Again / Hard / Good / Easy), with the next-review time shown on each
    button. A grown-up picks the style for each kid under *Players*.
- **Pronunciation** comes from the device's own French voice (🔊). If the device
  has no French voice, the speaker buttons are hidden. *Grown-ups → Sound &
  voice* explains how to add one.
- **Gamification:**
  - XP and levels with French titles, from Touriste up to Légende de Paris.
  - A daily goal and a 🔥 streak, with 🧊 streak freezes you can buy.
  - Croissants 🥐 to spend in the **Shop**: berets, a chef's toque, a
    mustache, a crown, backgrounds and card styles.
  - **Le Tour de France:** every level unlocks a stop on a map of France, with a
    postcard and a fun fact.
  - 27 **trophies**, 4 of them secret.
  - A weekly **leaderboard**.
  - Combos, confetti, and a little accordion version of *Frère Jacques* on level-up.
- **Games** (extra practice, with game XP capped per day):
  - *Les Paires* (memory)
  - *Course Rapide* (a 60-second speed round)
  - *Sauve l'escargot* (hangman, where a hungry chef stalks a snail)
  - **Duel**: two kids on one screen. On a laptop, A S D F plays against
    H J K L. "Face à face" mode is for a tablet lying flat between them.
- **My words:** every word with ⭐ mastery stars. Masculine words show in blue
  and feminine words in red.

## For Mamou and the grown-ups: changing the words

Open **⚙️ Grown-ups → 📝 Words**.

- **＋ Add a word** adds a word: French (with *le / la / l' / un / une* for
  nouns), English, and an emoji picture. If more than one English answer is
  right, separate them with `/`, like `mother / mom`.
- **📋 Paste a list** adds many words at once, one per line. All of these work:
  ```
  la lune = moon 🌙
  le soleil ; sun ; ☀️
  l'arbre - tree
  manger, to eat
  ```
  You can also paste two or three columns straight from a spreadsheet.
- Words are sorted into **groups**. Type a new group name (for example
  "Semaine 2") to start one. Each group can be switched on or off.
- **Editing a word keeps the kids' progress.** Deleting a word removes it and
  its progress.
- **New words per day** (5 by default), the **daily goal**, and the card style
  are set per kid under **👪 Players**.

### Family sync: the same progress on every device

Open **☁️ Sync** and tap **Turn on family sync**. Then send the join link it
shows to every other device (text or email) and open it there. From then on,
progress, XP, croissants, trophies, shop items and the word list are shared
automatically whenever the app is open. It also works offline and catches up
later.

- The family gets a long secret code. Only devices with the link can see the
  data, so keep it in the family.
- Joining never wipes anything. A device's existing progress is combined with
  the family's.
- Croissants spent on one device stay spent, and XP earned on two devices
  adds up.
- **Stop syncing on this device** keeps everything that's already on it.

### Sending a word list to a device outside the family

With family sync on, word changes travel by themselves. For a device that isn't
in the family, open **🔗 Share**, copy the link, and text or email it. Opening the
link on another device shows what's new or changed and offers to **Add &
update** or **Replace**. Only the word list travels, never the kids' progress.

### Backups

**💾 Backup** downloads all the progress as a file. Loading that file on
another device with **Merge** combines the two, and the newest progress wins for
each card. **🔒 Grown-ups' code** (under Sound & voice) can set an optional 4-digit code for the
grown-ups' corner.

## Development

No build step: plain HTML, CSS and ES modules.

```bash
npm test                           # unit tests (node --test): SRS, answers, storage, game logic
python -m http.server 8777         # then open http://localhost:8777
```

See `CLAUDE.md` for the architecture.
