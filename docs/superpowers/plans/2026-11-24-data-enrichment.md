# Data enrichment: plan (rough history)

Design: `docs/superpowers/specs/2026-11-24-data-enrichment-design.md`

## Steps
1. `scripts/enrich.mjs`: pure functions, sources passed in parsed; tested with synthetic snippets (`test/scripts/enrich.test.js`)
   - `typeReadings(kanji, kanjidic)`: ours `unknown` → on/kun when exactly one type matches (katakana → hiragana; full form `あく` or stem `ひと` of `ひと.つ`)
   - `kanjiUses(word, furigana, kanji)`: per-kanji reading from JmdictFurigana; `々` = previous kanji; `readingId` when a reading of ours matches, else `base` via sokuon / rendaku back to a reading of ours; one block over several kanji → `wholeWordReading`
   - `lookalikes(kanji, kanjium, relations)`: pairs of our kanji, skip pairs already in a looks-similar relation
   - `transitivity(words, jmdict, relations)`: our verbs, same first kanji, first-sense vi vs vt, skip existing
   - `sentences(words, tatoeba, jmdict)`: shortest checked (`~`) sentence with English per word; uses = all our words in it; reading from furigana transcription; Tatoeba id in origin
   - review list: suru / class mismatches, unmatched and ambiguous words
2. `scripts/run-enrich.mjs` (CLI, loads `out/sources/`) → `out/enrich-import.json` + `out/enrich-review.txt`; `npm run enrich`
3. Merge test: enrich output into a copy of `data/content.json` with `mergeImport` → types upgraded, nothing duplicated
4. Credits: README section, `data/LICENSE`, Settings "Credits"; `npm run stamp`
5. Research doc: Kaishi section
6. User: backup → add data on the phone → confirm suggestions → export → `publish-data`
