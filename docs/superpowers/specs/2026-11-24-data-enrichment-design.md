# Data enrichment from external sources: design

Findings: `docs/research/2026-11-24-external-data.md`. Small change: one script, existing fields only, no model change.

## Intent
- Less typing: fill fields the model already has from reference data
- Suggestions stay suggestions; personal knowledge stays the learner's
- External data is input, not the domain: no model change, no API, no import framework

## Decisions (by user)
- Enriched data is **published** in `data/content.json` under CC BY-SA 4.0
- Credits in 4 places: README "Credits" · `origin.detail` per sentence/relation · `data/LICENSE` · small "Credits" section in Settings
- Kaishi (Anki) = private reference only; nothing from it in the repo
- Model changes found (class per meaning, pitch accent, order, antonyms, …) → `docs/grooming.md`, not here

## Approaches
| | Approach | Chosen |
|---|---|---|
| A | script → import file → merge on phone → export → `publish-data` | ✅ phone stays source of truth; uses existing merge |
| B | script edits `data/content.json` directly | – bypasses phone data, risks overwriting learner edits |
| C | enrichment inside the app | – sources are 100+ MB; no-deps, offline app |

## Scope
| Enrichment | Source | Rule |
|---|---|---|
| kanji reading type for `unknown` readings | KANJIDIC2 | existing readings only; spelling normalized (katakana on, `あ.く` dots) before matching |
| `kanjiUses` | JmdictFurigana + KANJIDIC2 | only where empty; `base` only when the dictionary reading differs (学 がっ → がく); unmatched → reading text only |
| readings for kanji with none (90 kanji) | the words' own readings, typed by KANJIDIC2 | only readings our words use; kanji with readings get none added (built-time call) |
| looks-similar relations | Kanjium lookalikes, both kanji ours | `origin: suggested, detail: 'Kanjium lookalikes'`, status proposed |
| ~~transitivity pairs~~ | – | dropped: all real candidates already in the seed |
| example sentence, 1 per word | Tatoeba, checked (`~`) with English | `origin: reference, detail: 'Tatoeba #<id>'`; `uses` = the word with its inflected form noted in notes, no form chain guessed |
| review list (text, not imported) | JMdict | `suru` differences, ある, proper nouns, ambiguous kana-only words, skipped matches |

- Kana-only words with several dictionary matches (いる, うち, は) → skipped, listed
- Never: ratings, new units other than sentences, overwriting learner data

## Flow
1. Sources downloaded by hand into `out/sources/` (gitignored); versions listed in the README
2. `npm run enrich -- <app export>` → `out/enrich-import.json` + `out/enrich-review.txt`
3. Phone: backup export → Settings → add data → confirm/reject suggestions → export
4. `npm run publish-data -- <export>`; README Credits, `data/LICENSE`, Settings credits in the same commit
5. Research doc gets a Kaishi section (findings only)

## Credits text
- JMdict, KANJIDIC2, KRADFILE – EDRDG, CC BY-SA 4.0
- JmdictFurigana – Doublevil, JMdict licence
- Kanjium – Uros O., CC BY-SA 4.0
- Tatoeba – CC BY 2.0 FR, sentence ids in the data
- Settings: same list, one line each with link

## Left to the builder
- Script structure, normalization details, sentence choice among checked ones (shortest / most common), review-list format, Settings layout
