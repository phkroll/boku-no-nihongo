# Boku no Nihongo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offline Home Screen web app on iPhone to collect Japanese words, kanji, sentences and grammar points, tag them and link them.

**Architecture:** Static files, no build. Pure data logic in `js/model.js` (Node-testable, no DOM), persistence in `js/store.js` (one IndexedDB record), screens in `js/ui/*.js` behind a hash router in `js/app.js`. Service worker + manifest make it installable and offline.

**Tech Stack:** HTML, CSS, ES modules, IndexedDB, Service Worker; Node 24 `node --test` for tests; no dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-boku-no-nihongo-design.md`

## Global Constraints

- No runtime or dev dependencies; `package.json` has none (`"type": "module"`)
- No framework, no build step; files served as-is
- Kinds: `word`, `kanji`, `sentence`, `grammar`
- Word types: `noun`, `verb`, `i-adjective`, `na-adjective`, `adverb`, `pronoun`, `particle`, `expression`, `other`
- kind and wordType are plain strings; data carries `version: 1`
- No data leaves the phone; no network calls besides loading the app's own files
- UI text in English; never `innerHTML` with data — build DOM via `js/ui/dom.js`
- Commit after each task directly on `main`; no remote, no push (user pushes in the end); commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Repo root: this repository (Linux sandbox, Node 24 available, no browser)

## Review Focus

1. Imported or typed text containing `<script>`/HTML shows as plain text → test: no `innerHTML`/`outerHTML`/`insertAdjacentHTML` in `js/` (Task 6)
2. Importing a broken or foreign JSON file leaves current data untouched → `importJson` throws before anything is replaced (Task 3)
3. Search ignores case and full-/half-width differences and surrounding spaces (`ＴＡＢＥ` finds `tabe`) → NFKC + lowercase (Task 1)
4. Deleting an entry or tag leaves no dangling links/tagIds; import drops dangling refs (Tasks 2, 3)
5. Offline after first load: every app file is in the service worker's precache list → test compares list with files on disk (Task 6)

---

### Task 1: Repo, entries and search

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules/`, `.DS_Store`), `js/model.js`
- Test: `test/model.test.js`

**Interfaces:**
- Produces (in `js/model.js`):
  - `KINDS: string[]`, `WORD_TYPES: string[]` (values from Global Constraints)
  - `emptyData(): Data` → `{ version: 1, entries: [], tags: [], links: [] }`
  - `addEntry(data, fields, opts?): Entry` — fields `{ kind, text, reading?, meaning?, notes?, wordType?, tagIds? }`; opts `{ id?, now? }` (defaults `crypto.randomUUID()`, `new Date().toISOString()`); mutates `data`
  - `updateEntry(data, id, fields, opts?): Entry` — merges, sets `updated`
  - `deleteEntry(data, id): void`
  - `getEntry(data, id): Entry | undefined`
  - `search(data, { query?, kind?, tagId? }): Entry[]` — sorted by `updated` desc
  - Entry shape: `{ id, kind, text, reading, meaning, notes, wordType, tagIds, created, updated }` (strings default `''`, `wordType` `''` unless kind `word`, `tagIds` `[]`)

- [ ] **Step 1: `git init`, `package.json`** (`name: boku-no-nihongo`, `private: true`, `type: module`, scripts `test: node --test test/`, `serve: node scripts/serve.mjs`), `.gitignore`

- [ ] **Step 2: Write failing tests** in `test/model.test.js`:
  - `addEntry trims text and fills defaults` — `addEntry(d, {kind:'word', text:'  食べる ', reading:'たべる', wordType:'verb'}, {id:'e1', now:'2026-01-01T00:00:00Z'})` → `text === '食べる'`, `meaning === ''`, `tagIds` deep-equals `[]`, `created === updated === now`
  - `addEntry rejects empty text` — `text:'   '` throws `/text/`
  - `addEntry rejects unknown kind` — `kind:'x'` throws `/kind/`
  - `wordType only kept for words` — kanji with `wordType:'noun'` → `''`
  - `updateEntry changes fields and updated, keeps created`
  - `search matches text, reading, meaning, case- and width-insensitive` — entries `食べる/たべる/to eat` and `本/ほん/book`; `query:'ＥＡＴ '` → only 食べる; `query:'ほん'` → only 本
  - `search filters by kind and tagId, newest first`

- [ ] **Step 3: Run** `npm test` → FAIL (module not found)

- [ ] **Step 4: Implement** `js/model.js`; normalize with `s.normalize('NFKC').toLowerCase().trim()`

- [ ] **Step 5: Run** `npm test` → all pass

- [ ] **Step 6: Commit** `git add -A && git commit` — "Data model: entries and search"

### Task 2: Tags and links

**Files:** Modify `js/model.js`; Test `test/model.test.js`

**Interfaces:**
- Produces:
  - `addTag(data, name, opts?): Tag` — `{ id, name }`; trims; empty throws `/name/`; same name ignoring case returns the existing tag
  - `renameTag(data, id, name): Tag`; `deleteTag(data, id): void` — also removes the id from every entry's `tagIds`
  - `addLink(data, from, to, note?, opts?): Link` — `{ id, from, to, note, created }`; throws `/itself/` for `from === to`, `/not found/` for unknown ids; existing link between the two in either direction is returned
  - `deleteLink(data, id): void`
  - `linksOf(data, entryId): { link, other: Entry }[]` — both directions
  - `deleteEntry` (Task 1) now also removes the entry's links
  - `addEntry`/`updateEntry` (Task 1) drop `tagIds` that don't exist in `data.tags`

- [ ] **Step 1: Failing tests:** `addTag dedupes case-insensitively` (`'JLPT N5'` then `'jlpt n5'` → same id, 1 tag); `deleteTag removes tag from entries`; `addLink both directions` (link e1→e2; `linksOf(d,'e2')[0].other.id === 'e1'`); `addLink returns existing for reverse duplicate`; `addLink rejects self-link`; `deleteEntry removes its links`
- [ ] **Step 2: Run** `npm test` → new tests FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** `npm test` → all pass
- [ ] **Step 5: Commit** — "Data model: tags and links"

### Task 3: Export and import

**Files:** Modify `js/model.js`; Test `test/model.test.js`

**Interfaces:**
- Produces:
  - `exportJson(data): string` — pretty JSON, adds `exportedAt`
  - `importJson(text): Data` — returns a new `Data`; throws `/not a Boku no Nihongo backup/` on invalid JSON, missing/other `version`, or non-array `entries`/`tags`/`links`; drops entries without `text`/`id`, links whose ends are missing, tagIds of missing tags; unknown kind/wordType strings are kept (forward-compatible)

- [ ] **Step 1: Failing tests:** `round trip keeps entries, tags, links` (deep-equal after `importJson(exportJson(d))`, ignoring `exportedAt`); `importJson throws on garbage` (`'{'`, `'[]'`, `'{"version":2,...}'`); `importJson drops dangling refs`; `importJson keeps unknown kind`
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** `npm test` → all pass
- [ ] **Step 5: Commit** — "Data model: JSON export and import"

### Task 4: Store, app shell, list and form

**Files:**
- Create: `index.html`, `app.css`, `js/store.js`, `js/app.js`, `js/ui/dom.js`, `js/ui/list.js`, `js/ui/form.js`, `scripts/serve.mjs`
- Test: `test/ui.test.js`

**Interfaces:**
- Consumes: Task 1–2 model functions
- Produces:
  - `store.js`: `loadData(): Promise<Data>` (empty data if none), `saveData(data): Promise<void>`, `requestPersist(): Promise<boolean>`; DB `boku-no-nihongo`, store `kv`, key `data`
  - `dom.js`: `h(tag, attrs?, ...children): HTMLElement` — strings become text nodes; `on*` attrs become listeners; `clear(el)`
  - Screen contract: each `js/ui/<screen>.js` exports `render(root: HTMLElement, ctx, params): void`; `ctx = { data, save(): Promise<void>, go(hash: string): void }`
  - `app.js` on start: `requestPersist()`, `loadData()`, then route
  - Routes in `app.js`: `#/` list, `#/new`, `#/entry/:id`, `#/entry/:id/edit`, `#/entry/:id/link`, `#/settings`; unknown → list
  - `scripts/serve.mjs`: static server on `127.0.0.1:8080` (port from `PORT`), serves repo root, correct MIME for `.js .css .html .json .webmanifest .png .svg`

- [ ] **Step 1: Failing test** `test/ui.test.js`: `every screen module exports render` — dynamic import of `js/ui/list.js`, `js/ui/form.js` (Tasks 5–6 add theirs) → `typeof render === 'function'`
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement** store, dom, router, list (search box, kind chips, tag select, rows showing text · reading · meaning · kind badge, + button, settings link), form (kind select; reading/meaning/notes; word type select only for `word`; tag chips toggle + "new tag" input; Save → `ctx.save()` → detail; Cancel). Mobile-first CSS, safe-area insets, dark mode via `prefers-color-scheme`, `lang="ja"` on Japanese text fields' display
- [ ] **Step 4: Run** `npm test` → pass; `npm run serve` then `curl -s localhost:8080/ | grep -q '<script type="module"'` and `curl -sI localhost:8080/js/app.js | grep -i 'javascript'`
- [ ] **Step 5: Commit** — "App shell, list and entry form"

### Task 5: Detail and link picker

**Files:** Create `js/ui/detail.js`, `js/ui/link-picker.js`; Modify `js/app.js`, `test/ui.test.js`

**Interfaces:**
- Consumes: `getEntry`, `linksOf`, `addLink`, `deleteLink`, `deleteEntry`, `search`; screen contract from Task 4
- Produces: detail (all fields, tags, linked entries tappable to their detail, unlink button, Edit, Delete with `confirm()`, "Link…" → `#/entry/:id/link`); link picker (search box, results excluding the entry itself and already-linked ones, optional note, tap → `addLink` → save → back to detail)

- [ ] **Step 1: Extend test** — add `detail.js`, `link-picker.js` to the module list → FAIL
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run** `npm test` → pass
- [ ] **Step 4: Commit** — "Entry detail and linking"

### Task 6: Settings, offline, install, README

**Files:**
- Create: `js/ui/settings.js`, `manifest.webmanifest`, `sw.js`, `scripts/make-icons.mjs`, `icons/icon-180.png`, `icons/icon-512.png`, `README.md`
- Modify: `index.html` (manifest, `apple-touch-icon`, `apple-mobile-web-app-capable`, theme-color, SW registration in `app.js`), `test/ui.test.js`

**Interfaces:**
- Consumes: `exportJson`, `importJson`, `saveData`, tag functions
- Produces:
  - settings: entry/tag counts; Export → `navigator.share({ files: [File] })` when `navigator.canShare` allows, else download link; file name `boku-no-nihongo-YYYY-MM-DD.json`; Import via `<input type=file accept=application/json>` → `importJson` → `confirm('Replace all N entries…')` → replace `ctx.data` contents → save; error shown on throw, data untouched; tag rename/delete list
  - `sw.js`: `const CACHE = 'bnn-v1'`, `const FILES = [...]` precache on install; fetch = network-first, cache fallback; old caches deleted on activate
  - `make-icons.mjs`: writes PNGs with `node:zlib` only (white background, red circle, rounded-corner safe)
  - README: what it is, `npm test`, `npm run serve`, deploy to GitHub Pages (new repo, `git remote add`, push, Settings → Pages → main/root), install (Safari → Share → Add to Home Screen), backup habit (export regularly)

- [ ] **Step 1: Failing tests** in `test/ui.test.js`:
  - add `settings.js` to the module list
  - `sw precaches every app file` — parse `FILES` from `sw.js`; set equals `./`, `index.html`, `app.css`, `manifest.webmanifest`, all `js/**/*.js`, all `icons/*.png` found on disk
  - `no HTML injection sinks` — no file under `js/` contains `innerHTML`, `outerHTML` or `insertAdjacentHTML`
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement**; run `node scripts/make-icons.mjs`
- [ ] **Step 4: Run** `npm test` → all pass; `file icons/*.png` → PNG 180x180 / 512x512
- [ ] **Step 5: Commit** — "Settings, offline support, icons, README"

### Hand-off to the user (not a task)
- Mac: `npm run serve`, open `http://localhost:8080`, click through
- Phone: checklist from the spec's Verification section after deploying
