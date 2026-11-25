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

## Load data

**Published data** (in this repo, `data/`): Settings → **Load published data**. Importing twice adds nothing.
After a push, wait until GitHub Pages has published (1–2 min, green in the Actions tab); loading earlier gets the old files.
- `data/content.json`: kanji, words, grammar, sentences, relations
- `data/knowledge.json`: what I know, mix-ups, notes (personal; delete the file to stop publishing it)

Update the published data from the phone: Settings → Export backup → copy the file to the Mac (e.g. `out/`) →
`npm run publish-data -- out/<backup>.json` → commit and push.

The original seed: `npm run convert-seed` → `out/seed-import.json`, then `npm run publish-data -- out/seed-import.json`.

**Enrich from reference data** (fills reading types, kanji uses, example sentences; suggests lookalikes; never overwrites):
1. Put the sources into `out/sources/` (used: jmdict-simplified 3.6.2 of 2026-11-23, JmdictFurigana 2.3.1, Kanjium master, Tatoeba exports of 2026-11):
   `jmdict-eng.json`, `kanjidic2-en.json` ([jmdict-simplified releases](https://github.com/scriptin/jmdict-simplified/releases)) ·
   `JmdictFurigana.json` ([releases](https://github.com/Doublevil/JmdictFurigana/releases)) ·
   `kanjium-lookalikes.txt` (Kanjium `data/source_files/lookalikes.txt`) ·
   `jpn_indices.csv`, `jpn_sentences_detailed.tsv`, `jpn_transcriptions.tsv`, `eng_sentences.tsv` ([Tatoeba downloads](https://tatoeba.org/en/downloads), unpacked)
2. Phone: Export backup → copy to `out/` (no new entries on the phone? use the published data instead: merge `data/content.json` + `data/knowledge.json`, publish, phone → Load published data)
3. `npm run enrich -- out/<backup>.json` → `out/enrich-import.json` + `out/enrich-review.txt` (things to check by hand)
4. Phone: Settings → Add data from file → `enrich-import.json`; confirm or reject the suggested lookalikes under Notes
5. Export again → `npm run publish-data -- out/<backup>.json` → commit and push

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

Push to `main`. When the app opens online it downloads the complete new version in the background and reloads once; offline or on a server error it keeps running the version it has. Settings shows the running version.
After changing app files: `npm run stamp` (writes the build stamp and the offline file list). `npm test` and the pre-push check fail when it was forgotten.

## Credits

`data/content.json` is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (see `data/LICENSE`) and is partly derived from:
- **JMdict, KANJIDIC2** – Electronic Dictionary Research and Development Group, CC BY-SA 4.0 ([licence](https://www.edrdg.org/edrdg/licence.html)); via [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
- **JmdictFurigana** – Doublevil, under the JMdict licence ([repo](https://github.com/Doublevil/JmdictFurigana))
- **Kanjium** – Uros O., CC BY-SA 4.0 ([repo](https://github.com/mifunetoshiro/kanjium)); lookalike kanji
- **Tatoeba** – example sentences and translations, CC BY 2.0 FR ([tatoeba.org](https://tatoeba.org)); each sentence keeps its Tatoeba id (`origin.detail`)
