# Boku no Nihongo: short design

## Context
- Japanese-learning app later; for now a simple place to collect entries, label and link them
- Data collected now = base for the real app → keep it structured and exportable
- Personal iPhone only; no App Store, no Xcode, no server holding data

## Approaches
| Option | Trade-off | Chosen |
|---|---|---|
| Home Screen web app | no Xcode, no expiry, testable in sandbox; less native, likely rewrite later | ✅ (decision by user) |
| Native SwiftUI | real app; Mac + Xcode, 7-day signing | – |
| Native + iCloud sync | backup/sync; paid account | – |

## Decisions
- **User:** web app on the Home Screen; kinds word, kanji, sentence, grammar; words get a word type; more later; simple
- **Mine:** plain HTML/CSS/JS modules, no framework, no build step, no runtime dependencies
- **Mine:** data in IndexedDB on the phone; `navigator.storage.persist()`; JSON export/import as backup
- **Mine:** offline via service worker + web manifest (Home Screen icon, full screen)
- **Mine:** hosting on GitHub Pages (free, static, https); code only, no data leaves the phone
- **User:** folder `~/Documents/git/private/boku-no-nihongo` (mounted), own git repo

## Data model (one generic entry, not one table per kind)
- `Entry`: id, kind, text (word / kanji / sentence / pattern), reading (kana), meaning, notes, wordType (words only), tagIds, created, updated
- `wordType`: noun, verb, i-adjective, na-adjective, adverb, pronoun, particle, expression, other
- `Tag`: id, name
- `Link`: id, from, to, optional note; shown on both entries
- kind and wordType are plain strings → new values without migration; export carries a `version` field

## Screens
- List: search (text, reading, meaning), filter by kind and tag, + button
- Add/edit form: fields by kind; tags picked or created inline
- Detail: fields, tags, links (both directions); "Link…" opens a search picker
- Settings: JSON export (share sheet / download) and import

## Steps
1. ✅ Folder created and mounted
2. Me: repo, app, tests for the data logic, README (deploy + install on iPhone)
3. User: create GitHub repo, push, enable Pages; open URL in Safari → Share → Add to Home Screen

## Verification
- Data logic: unit tests with `node --test` (no dependencies)
- UI: no browser in the sandbox → served locally with `node`, checked by the user on the Mac and phone
- On phone: one entry of each kind, tag, link word ↔ kanji ↔ sentence, search/filter, airplane mode still works, export → delete → import, links intact

## Files
- `index.html`, `app.css`, `manifest.webmanifest`, `sw.js`, `icon.svg`/png
- `js/store.js` (IndexedDB load/save), `js/model.js` (pure: create/update/delete, tags, links both ways, search/filter, export/import validation), `js/ui/*.js` (list, form, detail, link picker, settings)
- `test/model.test.js` (`node --test`), `README.md`, `.gitignore`

## Left to builder
- Layout details, icons, sort order, empty states
