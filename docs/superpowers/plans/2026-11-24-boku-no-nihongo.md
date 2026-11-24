# Boku no Nihongo v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 prototype with the v2 learning-unit model so the user can collect, connect, rate and investigate Japanese learning data on the phone, starting from the converted seed.

**Architecture:** Pure data logic in `js/model/*.js` (Node-testable, no DOM); persistence in `js/store.js` (one IndexedDB record, unchanged mechanism); generic screens in `js/ui/*.js` driven by per-kind descriptions in `js/ui/kinds.js`; seed converter in `scripts/`.

**Tech Stack:** HTML, CSS, ES modules, IndexedDB, Service Worker; Node 24 `node --test`; no dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-boku-no-nihongo-design.md` (working hypothesis; `docs/grooming.md` collects open points)

## Global Constraints

- No dependencies, no build; Node 24 (`.nvmrc` `24`, `engines.node >=24`)
- Data `version: 2`; collections `kanji, words, grammar, sentences, notes, relations, ratings, tags, imports`; `meta.lastExport`
- Unit kinds and refs: `kanji | word | grammar | sentence | note | relation`, ref `"<kind>:<id>"`
- Field states: absent = missing, `'unknown'`, `'n/a'` (constants `UNKNOWN`, `NA`)
- Unknown fields on records are kept on load, import and update — never stripped
- Never `innerHTML`; DOM via `js/ui/dom.js`; UI text English
- v1 data is discarded (decision by user): a stored `version: 1` record loads as empty v2 data, raw v1 kept under `meta.discardedV1`
- Commit per task on `main`; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Seed files live in gitignored `out/`; tests use small synthetic seed snippets only

## Review Focus

1. Import of a file with unknown fields or an older version keeps every field → test in Task 5
2. Merge import never overwrites learner-entered values; re-import adds nothing twice → Task 5
3. Deleting a unit leaves no dangling refs (relations, ratings, sentence uses, note refs, kanjiUses) → Task 2
4. Search finds katakana with hiragana input and full-width with half-width → Task 1
5. Capturing a word with only kana or only writing works end to end → Task 1 test + Task 7 form

---

### Task 1: Data core, units, meanings, search

**Files:** Create `js/model/data.js`, `js/model/units.js`, `js/model/search.js`, `.nvmrc`; Modify `package.json` (engines); Delete v1 `js/model.js`, `test/model.test.js`, `js/ui/*` v1 screens stay until Task 7; Test `test/model/units.test.js`

**Interfaces (produces):**
- `data.js`: `VERSION=2`, `UNKNOWN`, `NA`, `KINDS`, `COLLECTION` (kind → array name), `WORD_CLASSES`, `VERB_GROUPS`, `READING_TYPES`, `RELATION_TYPES`, `FORM_KEYS`, `emptyData()`, `newId()`, `nowIso()`, `normalize(s)` (NFKC, lowercase, trim, katakana → hiragana), `makeRef(kind,id)`, `parseRef(ref) → {kind,id}`, `getUnit(data, ref)`, `allUnits(data, kind?)`
- `units.js`: `addUnit(data, kind, fields, opts?) → unit` · `updateUnit(data, ref, fields, opts?) → unit` · `deleteUnit(data, ref)` (cascade in Task 2) · `addMeaning(unit, {gloss, usage?})` · `splitMeaning(unit, meaningId, glosses[]) → newMeanings` · `deleteMeaning(data, ref, meaningId)` · `addReading(kanji, {kana, type})` · `deleteReading(data, ref, readingId)`; opts `{ id?, now?, origin?, importId? }`
- `search.js`: `search(data, kind, { query?, tagId?, openOnly? }) → unit[]` newest first; matches writing(s)/char/title/text, reading(s), glosses, note text
- Validation errors: `kanji needs a character` (exactly one char), `word needs a writing or a reading`, `grammar needs a title`, `sentence needs a text`, `note needs a text`; duplicate kanji char → `kanji 月 exists`

- [ ] **Step 1: Failing tests:** `word with only reading` · `word with only writing` · `word with neither throws` · `kanji must be one character, unique` · `unknown fields survive update` (`updateUnit` on unit with `foo: 1` keeps it) · `splitMeaning hides old, keeps id, sets splitInto` · `deleteMeaning removes it` · `search: katakana by hiragana` (ビール via `びーる`) · `search: full-width` · `search by gloss, tag, openOnly for notes` · `origin defaults to learner`
- [ ] **Step 2: Run** `npm test` → FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** `npm test` → PASS
- [ ] **Step 5: Commit** "Model v2: units, meanings, search"

### Task 2: Relations, notes refs, cascade, calculated relations

**Files:** Create `js/model/relations.js`, `js/model/calculated.js`; Modify `units.js`; Test `test/model/relations.test.js`

**Interfaces (produces):**
- `addRelation(data, { type, members[], direction?, status?, notes?, origin? }, opts?) → relation` (members = refs; 2+ or 1 + `UNKNOWN`; status default `confirmed`, `proposed` when origin kind `suggested`; same type + same member set → returns existing)
- `setRelationStatus(data, id, status)` · `deleteRelation(data, id)` · `relationsOf(data, ref, { includeRejected? }) → relation[]`
- `deleteUnit` cascade: member removed (relation deleted when < 2 real members and no `UNKNOWN`), ratings with that unit / relation target removed, sentence `uses` → `{ text }`, note `refs` filtered, `kanjiUses.readingId` cleared on `deleteReading`
- `calculatedRelations(data, ref) → { type, refs[], detail? }[]`; types `kanji-in-word`, `same-writing`, `same-reading`, `shared-gloss`, `in-sentence`, `reading-used`

- [ ] **Step 1: Failing tests:** `group of 6 kanji` · `confuses with unknown partner` · `suggested relation is proposed` · `duplicate relation returns existing` · `reject keeps relation, hidden by default` · `deleteUnit cascades` (relation shrinks/deleted, ratings gone, sentence use becomes text, note ref removed) · calculated: `開 in 開く`, `開く あく / ひらく same writing`, `橋 / 箸 same reading`, `shared gloss only for split meanings`, `sentence uses word`, `kanji reading used via readingId`
- [ ] **Step 2–4:** run FAIL → implement → PASS
- [ ] **Step 5: Commit** "Model v2: relations, cascade, calculated relations"

### Task 3: Ratings

**Files:** Create `js/model/ratings.js`; Test `test/model/ratings.test.js`

**Interfaces (produces):**
- `targetKey(target) → string` (stable over key order; `form` order kept; `members` order kept = direction)
- `addRating(data, target, { value, confidence='sure', source='learner', note? }, opts?) → rating` — value in `unknown | partly | known | cleared`
- `currentRatings(data, unitRef) → { key, target, rating }[]` latest per key, `cleared` dropped; includes ratings targeting a relation the unit belongs to only via the relation's own detail
- `ratingHistory(data, target) → rating[]` oldest first

- [ ] **Step 1: Failing tests:** `latest wins per target` · `cleared means not assessed` · `targetKey ignores key order` · `imprecise target is separate from precise` (`{from: writing}` vs `{from: writing, to: reading}`) · `relation pair target with direction`
- [ ] **Step 2–4:** FAIL → implement → PASS
- [ ] **Step 5: Commit** "Model v2: ratings"

### Task 4: Starter grammar forms and migrations

**Files:** Create `js/model/migrate.js`, `js/model/starter.js`; Modify `js/store.js` (`loadData` runs `migrate` + `ensureStarter`); Test `test/model/migrate.test.js`

**Interfaces (produces):**
- `migrate(raw) → data` — `undefined/null` → `emptyData()`; `version 1` → `emptyData()` with `meta.discardedV1 = raw`; `version 2` → missing collections filled, unknown fields kept; higher version → throws `made by a newer app version`
- `ensureStarter(data, now?)` — adds missing form grammar points by `formKey` from `FORM_KEYS` (origin `reference`), never touches existing

- [ ] **Step 1: Failing tests:** `v1 is discarded but kept raw` · `v2 missing collections filled` · `newer version throws` · `starter forms added once, existing untouched`
- [ ] **Step 2–4:** FAIL → implement → PASS
- [ ] **Step 5: Commit** "Model v2: migrations and starter forms"

### Task 5: Export, restore, merge import

**Files:** Create `js/model/io.js`; Test `test/model/io.test.js`

**Interfaces (produces):**
- `exportJson(data, now?) → string` (sets `meta.lastExport`)
- `parseBackup(text) → data` (JSON + `migrate`; throws `not a Boku no Nihongo file`)
- `mergeImport(data, incoming, { file, now? }) → { added, updated, skipped }` — creates `Import`; match by `id`, else natural key (kanji `char`; word first writing + reading; grammar `formKey` or `title`; sentence `text`; note `text`); on match: missing scalar fields filled only, lists combined without duplicates (readings `kana`+`type`, meanings by gloss, writings by text, tags by name → ids remapped); relations matched by type + member set; ratings by `targetKey` + `at` + `value`; refs remapped to matched ids; refs to missing units dropped

- [ ] **Step 1: Failing tests:** `round trip` · `parseBackup rejects garbage` · `merge fills, never overwrites` · `merge combines readings and meanings` · `re-import is idempotent` (second run: added 0) · `refs remapped to matched ids` · `unknown fields survive import`
- [ ] **Step 2–4:** FAIL → implement → PASS
- [ ] **Step 5: Commit** "Model v2: export, restore, merge import"

### Task 6: Seed converter

**Files:** Create `scripts/seed-convert.mjs` (pure `convertSeed(seed, { now }) → v2 partial data`), `scripts/convert-seed.mjs` (CLI: `node scripts/convert-seed.mjs out/japanese-learning-linked-seed.json out/seed-import.json`); Test `test/scripts/seed-convert.test.js` (synthetic snippet)

Mapping = spec table "Seed `linked-seed-1`"; ids kept from seed (`k:月` → id `k-月` style safe id); `reported_confusion*` → `confuses` confirmed origin learner; `suspected_confusion` → `confuses` proposed origin suggested; `visual_similarity` groups → `looks-similar` proposed suggested; pairwise edges already in a group of same type dropped; `other_item_unknown` → member `UNKNOWN`; duplicates in groups removed; tags `known`, `probably known`, `should know`, `easy to learn` not created (familiarity → ratings); unsplit meaning per gloss text.

- [ ] **Step 1: Failing tests:** `kanji readings with types and unknown` · `word with writing, reading, unsplit meaning, verbGroup` · `familiarity → estimate rating` · `known kanji gloss → imprecise rating with note` · `confusion group with unknown partner` · `candidate group → proposed suggested` · `pair inside group dropped` · `sentence uses with form chain` · `output passes mergeImport into empty data`
- [ ] **Step 2–4:** FAIL → implement → PASS; run CLI on the real seed, print counts
- [ ] **Step 5: Commit** "Seed converter"

### Task 7: UI foundation: shell, lists, detail, edit

**Files:** Replace `js/app.js`, `js/ui/dom.js` (keep `h`, `clear`, `isSubmitEnter`); Create `js/ui/kinds.js` (per kind: label, row, fields), `js/ui/list.js`, `js/ui/detail.js`, `js/ui/edit.js`, `js/ui/fields.js` (field editors: text, select, list of texts, meanings, readings, writings, kanji uses, sentence uses, form chain); Delete v1 `js/ui/form.js`, `js/ui/link-picker.js`; Modify `app.css`, `test/ui.test.js`

**Routes:** `#/k/<kind>` list · `#/k/<kind>/new` · `#/u/<ref>` detail · `#/u/<ref>/edit` · `#/settings`; default `#/k/word`
**Interfaces:** screen contract unchanged: `render(root, ctx, params)`, `ctx = { data, save(), go(hash, {replace}) }`

- [ ] **Step 1: Failing test:** screen list in `test/ui.test.js` → `list, detail, edit, settings, relation, rate, picker`; `kinds.js` describes all 5 kinds (each has `label`, `row`, `fields`)
- [ ] **Step 2: Implement** shell (bottom tabs Words · Kanji · Grammar · Sentences · Notes, top bar with one exit), generic list (search, tag filter, open-only for notes, export reminder), detail (fields, meanings with split, readings, kanji uses, calculated + stored relations, current ratings, notes about it, actions: Edit · Rate · Relate · Note), edit form (core field first; quick capture works with one field)
- [ ] **Step 3: Run** `npm test` → PASS (Task 8 screens stubbed until then); `node --check` all js
- [ ] **Step 4: Commit** "UI v2: shell, lists, detail, edit"

### Task 8: Relations, ratings, notes, settings, offline

**Files:** Create `js/ui/picker.js` (search any unit → ref), `js/ui/relation.js` (new/edit relation: type, members, direction, status, note; confirm / reject), `js/ui/rate.js` (target parts from the unit's facets, meanings, readings, forms, relation members; value, confidence, note; history); Modify `js/ui/settings.js` (export with reminder, restore, add data with summary, tags), `sw.js` FILES + `CACHE = 'bnn-v3'`, `README.md`

- [ ] **Step 1: Failing tests** stay from Task 7 + `sw precaches every app file` + `no HTML injection sinks`
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run** `npm test` → PASS; serve and `curl` each js file 200
- [ ] **Step 4: Commit** "UI v2: relations, ratings, notes, settings"

### Hand-off
- User: `npm run serve` on the Mac → Settings → Add data → `out/seed-import.json`; deploy per README
