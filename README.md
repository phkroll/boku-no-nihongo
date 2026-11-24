# Boku no Nihongo (僕の日本語)

Personal Japanese notebook for the iPhone: collect words, kanji, sentences and grammar points, tag them, link them.
Web app installed on the Home Screen; works offline; data stays on the phone.

## Use

A tool for collecting and investigating learning data while the real learning app is still being discovered.

- **Tabs:** Words · Kanji · Grammar · Sentences · Notes; search and tag filter on each list
- **Quick capture:** `+` saves with only the starred field (e.g. a word you only heard in kana)
- **Entry page:** meanings (split imported ones), readings, relations (yours + automatic), what I know, notes & questions
- **Relations:** groups or pairs, optional direction, status suspected / confirmed / rejected; "I mix these up" can have an unknown partner
- **What I know:** rate only the parts you're sure about; empty parts mean "unclear which"
- **Notes tab:** open questions and discoveries; suggested relations to check (from imports)
- **Settings:** export backup, add data (merge), restore (replace), tags

Open questions and limitations for the next review: `docs/grooming.md`.

**Backups:** the data lives only in this app on this device. Export regularly (reminder after 14 days).
Safari and the Home Screen app keep separate data — use the installed app.

## Load the seed (once)

```sh
node scripts/convert-seed.mjs out/japanese-learning-linked-seed.json out/seed-import.json
```
Then in the app: Settings → **Add data from file…** → `out/seed-import.json` (AirDrop/iCloud Drive to the phone). Importing twice adds nothing.

## Develop

Needs Node 24, no dependencies.

```sh
npm test          # data logic and structure checks
npm run serve     # http://localhost:8765 (or the next free port it prints)
npm run convert-seed  # out/japanese-learning-linked-seed.json → out/seed-import.json
```

After adding a file under `js/` or `icons/`, add it to `FILES` in `sw.js` (a test checks this).
Icons: `node scripts/make-icons.mjs`.

## Before the first push (once per clone)

```sh
git config core.hooksPath .githooks   # turns on the pre-push check
```
Put words that must never be published (employer, customers, …) into `.git/info/publish-blocklist`, one per line. That file stays local. See "Publishing rules" in `AGENTS.md`.

## Put it on the iPhone (once)

The phone needs an https address to install the app. GitHub Pages serves the files for free; your entries never go there.

1. Create an empty repository on GitHub, e.g. `boku-no-nihongo`
   (a public repo is free for Pages; it only contains this code)
2. Push:
   ```sh
   git remote add origin git@github.com:<you>/boku-no-nihongo.git
   git push -u origin main
   ```
3. On GitHub: Settings → Pages → Source "Deploy from a branch" → `main` / `/ (root)` → Save
4. After a minute, open `https://<you>.github.io/boku-no-nihongo/` in **Safari** on the iPhone
5. Share → **Add to Home Screen**, then open it from the icon from now on

## Update

Push to `main`. The app loads the newest files when online (open it twice to be sure); offline it uses the last copy.
