# Boku no Nihongo: design (v2, learning units)

## Intent
- Personal Japanese learning app; now: **collect, edit, link learning data, record own knowledge**
- Later: practice with hints, generated questions, evidence, spaced repetition → the model carries it, nothing built for it yet
- v1 prototype replaced; v1 data discarded (decision by user)
- Seed files in `out/` (gitignored) test the model; they don't define it (decision by user)

## Goals / non-goals / anti-goals
| Now | Later (model allows) | Anti-goals |
|---|---|---|
| words, kanji, grammar points, sentences; meanings as separate items | practice, hints, generated exercises | hand-maintained flashcards |
| readings by type; reading used per word | evidence from practice, progress calculation | storing what can be calculated |
| relations of 2+ members, status, origin | conjugation engine | semantic guesses on import |
| ratings with partial targets, confidence, source | spaced repetition, learning algorithm | generic graph architecture |
| import with import record, nothing lost | | a server holding data |

## Constraints
- Home Screen web app, plain JS modules, no dependencies, no build, offline, IndexedDB on the phone, JSON backup, GitHub Pages (approach A, decision by user)
- UI English; Japanese content as typed

## Approaches
| | Approach | Chosen |
|---|---|---|
| A | rebuild inside current web app, model v2 | ✅ user |
| B | + small UI library (Preact) | – breaks no-deps; pays off only with practice UI |
| C | native iOS now | – Xcode + 7-day signing vs. "simple for now" |

## Basic rules
- **Field states:** absent = **missing** (not entered) · `"unknown"` = looked at, not known · `"n/a"` or an intentional empty list = **not applicable**
- **Every record:** `id, tagIds[], notes, origin, importId?, created, updated`
- **`origin`:** `{ kind: 'learner' | 'reference' | 'suggested', detail? }`; suggested = unchecked (e.g. AI); shown marked until confirmed
- **`Import`:** `{ id, file, at }`; set on every record an import created
- **Refs:** `"<kind>:<id>"`; meanings `"<kind>:<id>#<meaningId>"`

## Units
| Unit | Fields | Example |
|---|---|---|
| **Kanji** | `char` (unique), `readings[] { id, kana, type: on\|kun\|name\|unknown }` (kun okurigana `あ.く`), `meanings[]` | 月: つき kun · げつ, がつ on · moon · month |
| **Word** | `reading` (kana as written, katakana for loanwords; required), `writings[] { text, common: bool }` (`"n/a"` = no kanji writing), `usuallyWritten: kanji\|kana\|katakana`, `meanings[]`, `wordClass`, `verbGroup`, `suru: bool`, `wholeWordReading: bool`, `kanjiUses[]`, `irregularForms[] { form, text }` | 寝る · ねる · kanji · sleep · verb · ru |
| **Grammar point** | `title`, `pattern`, `meaning`, `explanation`, `appliesTo`, `formKey?` (when it is a form step) | 〜て · te-form · formKey `te` |
| **Sentence** | `text`, `reading`, `translation`, `uses[] { wordId \| text, form[] }`, `grammarIds[]` | 昨日は早く寝ました → 寝る `[polite, past]` |
| **Tag** | `name` (unique, case-insensitive); priorities like "should know" are tags | |

- **One word = one reading:** 開く(あく) / 開く(ひらく) are two words
- **Meaning:** `{ id, gloss, usage?, unsplit?: true }`; import never splits; "Moon, month" → one meaning `unsplit`, split in the app
- **`wordClass`:** noun, verb, i-adjective, na-adjective, adverb, pronoun, particle, conjunction, counter, expression, proper-noun, other, unknown
- **`verbGroup`:** ru, u, irregular, unknown, n/a (non-verbs); always entered, never guessed (帰る = u)
- **`kanjiUses[]`:** `{ char, readingId?, reading, base? }` per kanji, in order; `base` = before sound change (学校: がっ, base がく); `wholeWordReading` → per-kanji readings n/a (今日 きょう)
- **Forms:** chain of form keys from grammar points: `[potential, negative, past]`; starter set ships with origin `reference`: polite, negative, past, te, potential, passive, causative, causative-passive, volitional, imperative, conditional-ba, conditional-tara, desire-tai, progressive-teiru
- Out of scope: counter sound changes (一本 いっぽん)

## Relations
`Relation { type, members[] (2+, or 1 + partner "unknown"), direction?: [from, to], status, origin }`
- **status:** suspected · confirmed · rejected (meaningful for `confuses`; others default confirmed)
- A group doesn't claim every pair is equally similar

| Type | Kind | Example |
|---|---|---|
| `looks-similar` | objective | 門 聞 間 問 開 閉 |
| `similar-meaning` | objective, usage in `notes` | 話す 言う 喋る · 友達 友人 |
| `transitivity-pair` | objective, direction intransitive → transitive | 開く → 開ける |
| `politeness-variant` | objective | 食べる → 召し上がる |
| `related` | objective, free | |
| `confuses` | **personal**, direction optional | 聞 ⇄ 間 confirmed · 右 石 suspected · 西 + unknown |

**Calculated, never stored:** kanji in word · same writing · same reading (hiragana = katakana) · shared gloss (split meanings only) · word/grammar in sentence · kanji reading used

## Ratings (personal knowledge)
`Rating { target, value, confidence, source, note?, at }`; **append-only**, current = latest per target; no rating = **not assessed**
- **value:** unknown · partly · known · `cleared` (back to not assessed)
- **confidence:** sure · probably
- **source:** learner · estimate · practice (later)
- **target:** `{ unit, from?, to?, meaningId?, readingId?, form?, members? }`; omitted part = unspecified (imprecise knowledge without extra directions)
- **facets** for `from`/`to`: writing · reading · meaning · class · kanji-reading · form

| Scenario | target | value / confidence / source |
|---|---|---|
| seed: 開 probably known | `{ kanji:開 }` | known / probably / estimate |
| 寝る writing hard, unclear what | `{ word:寝る, from: writing }` | partly / sure / learner |
| 本: book yes, origin no | `{ kanji:本, to: meaning, meaningId: book }` · `…origin` | known · unknown |
| 生 in 先生 read せい | `{ word:先生, to: kanji-reading, readingId: せい }` | known |
| 寝る casual past | `{ word:寝る, form: [past] }` | known |
| te-form in general | `{ grammar:te }` | known |
| 門 family | `{ relation:門-group }` | known |
| tell 聞 from 間 | `{ relation:門-group, members: [聞, 間] }` (order = direction) | unknown |

- Confusion **status** (suspected/confirmed) and **progress** (ratings on telling apart) are independent; "resolved" = calculated from ratings, history kept

## Deleting
- A unit (after confirm showing counts) → also its relation memberships (relation removed when < 2 members), its ratings, its sentence `uses` (become text)
- Ratings are never edited; they go only with their target

## Screens
- Bottom tabs: Words · Kanji · Grammar · Sentences; Settings in the top bar
- List: search (writing, reading, glosses; kana-insensitive), tag filter, `+`
- Detail: fields, meanings, ratings (simple panel: pick target parts, value, confidence), relations (stored + calculated), "Add relation"
- Forms: plain fields; kanji uses prefilled from writing with reading suggestions; "split meaning"
- Settings: export backup · restore (replace all) · add data (merge import) · tags
- Suggested relations shown marked with "confirm / reject"

## Import (merge)
- App JSON format; partial files allowed; every import creates an `Import` record
- Match: same `id`, else natural key (kanji `char`; word first writing + `reading`; grammar `title`; sentence `text`); else added
- On match: scalar fields → incoming fills missing only, never overwrites learner data; lists combined without duplicates (readings by `kana`+`type`, meanings by gloss, tags by name)
- Ratings appended (no duplicates); relations combined by type + members
- Seed `linked-seed-1` → converted once by a tested script into this format; seed groups → relations; `candidate` → origin suggested; `initial_familiarity` → rating on whole unit, source estimate; gloss text → unsplit meaning; calculated relations skipped

## Left to the builder
- Layout, wording, empty states, sort order, storage layout, how the rating panel and relation picker work in detail
