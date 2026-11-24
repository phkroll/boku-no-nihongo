# Boku no Nihongo: design (v2, learning units)

## Intent
- Personal Japanese learning app; today: **collect, edit, link learning data, record own knowledge**
- Later: practice with multi-stage hints, generated questions, evidence, spaced repetition → model must carry that, nothing built for it yet
- v1 prototype (one generic entry, untyped links) replaced; v1 data discarded, no migration (decision by user)

## Goals / non-goals / anti-goals
| Goals now | Not now (model must allow) | Anti-goals |
|---|---|---|
| words, kanji, grammar points, sentences as separate unit types | flashcards, hints, generated exercises | hand-maintained flashcards |
| on/kun readings; which kanji reading a word uses | practice evidence, progress assessment | storing anything that can be calculated |
| typed relations, objective vs personal | learning algorithm, spaced repetition | speculative abstractions |
| self-rated knowledge per direction, history kept | conjugation engine | a server holding data |
| import of base data (merge) | bundled dictionaries | |

## Constraints
- Stays a Home Screen web app: plain HTML/CSS/JS modules, no dependencies, no build, offline, data in IndexedDB on the phone, JSON backup, GitHub Pages (approach A, decision by user)
- UI text English; Japanese content as typed
- Phone-first forms; no practice screens

## Approaches
| | Approach | Chosen |
|---|---|---|
| A | rebuild inside current web app, model v2 | ✅ user |
| B | same + small UI library (Preact) | – breaks no-deps, pays off only with practice UI |
| C | native iOS now | – Xcode + 7-day signing vs. "simple for now" |

## Domain model (data `version: 2`)

Units are referenced as `"<kind>:<id>"` (`word:…`, `kanji:…`, `grammar:…`, `sentence:…`). All units: `id, tagIds[], notes, source, created, updated`.

| Unit | Own fields | Rules |
|---|---|---|
| **Word** | `writing` (may be empty), `altWritings[]`, `reading` (kana, required), `usuallyKana` bool, `senses[]` = `{ glosses: string[], usage }` (≥1 gloss), `wordClass`, `verbGroup`, `kanjiUses[]`, `specialReading` bool | **one word = one reading**: 開く(あく) and 開く(ひらく) are two words (decision in discussion) |
| **Kanji** | `char` (one character, unique), `readings[]` = `{ kana, type: 'on'\|'kun' }`, `meanings: string[]` | kun okurigana with dot: `あ.く` |
| **Grammar point** | `title`, `pattern`, `meaning`, `explanation`, `appliesTo` (free text) | e.g. 〜た · casual past · all verbs |
| **Sentence** | `text`, `reading`, `translation`, `uses[]` = `{ wordId, form }`, `grammarIds[]` | form free text (e.g. "casual past") |

- `wordClass`: noun, verb, i-adjective, na-adjective, adverb, pronoun, particle, conjunction, counter, expression, other
- `verbGroup` (only when verb): `ru`, `u`, `irregular`; always entered, never guessed (帰る is `u`)
- `kanjiUses[]` = `{ char, reading, base }` per kanji in `writing`, in order; `reading` = kana as used; `base` = the kanji's reading before a sound change, empty if none (学校: reading がっ, base がく) (my call); `specialReading` = whole-word reading, no per-kanji split (今日 きょう) → `kanjiUses` readings empty
- Irregular forms (行く→行った): `notes` for now; conjugation comes later
- **Tag**: `id, name` (unique case-insensitive)

### Relations
`Relation { id, type, a: ref, b: ref, note, created }`; personal types are directed (a → b), others undirected.

| Type | Kind | Between | Example |
|---|---|---|---|
| `looks-similar` | objective | kanji ↔ kanji | 聞 ⇄ 間, 門 ⇄ 開 |
| `similar-meaning` | objective, note = usage difference | word ↔ word, grammar ↔ grammar | 友達 / 友人 |
| `transitivity-pair` | objective | word ↔ word | 開く / 開ける |
| `politeness-variant` | objective | word ↔ word | 食べる → 召し上がる |
| `related` | objective, free | any ↔ any | |
| `confuses` | **personal, directed** | any → same kind | 聞 → 間, ので → から |

Calculated, never stored (shown as "automatic"):
| Relation | Rule |
|---|---|
| kanji in word | char of a Kanji appears in word `writing` / `altWritings` |
| same writing | equal `writing` (or alt writing), different word |
| same reading | equal `reading` (hiragana/katakana treated equal) |
| shared gloss | a normalized gloss equal (NFKC, lowercase, trim, leading "to " ignored) |
| word/grammar in sentence | from sentence `uses` / `grammarIds` |
| kanji reading used | from `kanjiUses`: word ↔ kanji + reading (`base` if set, else `reading`; on/kun looked up from the kanji when it exists) |

### Knowledge (personal)
`Rating { id, target, value, at }`; **append-only history**, current state = latest rating per target; no rating = **not assessed** (never stored as unknown).
- `target`: `{ ref, direction }` or `{ pair: { type, a, b }, aspect }` — pair key works for entered **and** automatic relations (橋/箸 same reading is ratable) (my call)
- `value`: `unknown`, `unsure`, `known`, `none` (= reset to not assessed)
- Later practice answers become evidence next to ratings; ratings stay as "self-assessed"

| Unit | `direction` / `aspect` |
|---|---|
| Word | `writing>reading`, `writing>meaning`, `reading>meaning`, `meaning>reading`, `meaning>writing`, `reading>class` (writing directions hidden when `writing` empty or `usuallyKana`) |
| Kanji | `kanji>meaning`, `kanji>on`, `kanji>kun`, `meaning>kanji` |
| Grammar | `pattern>meaning`, `use` |
| Sentence | `text>reading`, `text>meaning`, `meaning>text` (my call) |
| Relation (entered or automatic) | `aware` (knows they're related), `distinguish` (can tell them apart) |

## Deleting (my call)
- Deleting a unit (after confirm showing counts) also deletes its relations and ratings and removes it from sentence `uses`/`grammarIds`
- Deleting an entered relation deletes the ratings of its pair key only if no automatic relation of that pair remains
- Append-only means ratings are never edited, not that they outlive their unit

## Screens
- Bottom tabs: Words · Kanji · Grammar · Sentences; Settings from the top bar
- List per tab: search (writing, reading, glosses/meanings; kana-insensitive), tag filter, `+`
- Detail: fields, knowledge grid (tap cycles not assessed → unknown → unsure → known), relations (entered + automatic, tappable), "Add relation" (type → picker over all units)
- Word form: `kanjiUses` prefilled from `writing` chars, readings suggested from existing Kanji, editable
- Sentence form: pick words (+ form) and grammar points from existing units
- Settings: export backup · restore backup (replace all) · **add data (merge import)** · tags

## Import (merge)
- Same JSON format as backup; may be partial (any unit arrays only)
- Match: same `id`, else natural key (kanji `char`; word `writing`+`reading`; grammar `title`; sentence `text`); no match → added
- On match (my call): text fields → incoming non-empty overwrites; list fields **combined**, duplicates skipped: kanji `readings` by `kana`+`type`, `meanings`/`altWritings` by normalized text, `senses` appended unless all its glosses already exist, `tagIds` union, `kanjiUses`/`uses`/`grammarIds` → incoming non-empty replaces
- Relations, ratings, tags appended, duplicates skipped; refs to missing units dropped
- User's own sources → converted to this format by Claude in chat; no per-source import UI

## Left to the builder
- Layout, icons, wording, empty states, sort order
- Storage layout (single record still fine at this size)
- How the relation picker searches and groups units
