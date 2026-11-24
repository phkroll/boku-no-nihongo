# Boku no Nihongo (僕の日本語)

Personal Japanese notebook for the iPhone: collect words, kanji, sentences and grammar points, tag them, link them.
Web app installed on the Home Screen; works offline; data stays on the phone.

## Use

- **List:** search by word, reading or meaning; filter by kind and tag; `+` adds an entry
- **Entry:** Edit, Delete, `Link…` to connect it with another entry (links show on both sides)
- **Settings:** export/import a JSON backup, rename or delete tags

**Backups:** the data lives only in this app on this phone. Deleting the app from the Home Screen deletes it too.
Export a backup now and then (Settings → Export backup → save to Files / iCloud Drive).

## Develop

Needs Node 24, no dependencies.

```sh
npm test          # data logic and structure checks
npm run serve     # http://localhost:8765 (or the next free port it prints)
```

After adding a file under `js/` or `icons/`, add it to `FILES` in `sw.js` (a test checks this).
Icons: `node scripts/make-icons.mjs`.

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
