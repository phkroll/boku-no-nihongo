# External Japanese data: investigation (2026-11-24)

Input for domain discovery and enrichment; doesn't change the design. Checked against our 214 kanji / 187 words.

## Summary
- **Our model holds up:** JMdict also keeps 開く あく / ひらく as two entries; KANJIDIC uses our okurigana notation (`あ.く`)
- **Biggest model lesson:** word class belongs to the **meaning**, not the word (JMdict: part of speech per sense) → answers our "one class only" limit
- **Fill our existing fields today:** 191 of 192 untyped kanji readings, kanji uses for 174 words, 7 `suru` flags, example sentences for 174 words
- **Best relation sources:** Kanjium (hand-made lookalikes, phonetic series, antonyms, pitch accent); dictionary vi/vt tags give transitivity-pair candidates
- **New concepts worth grooming:** pitch accent, learning order / frequency, reading ↔ writing ↔ meaning restrictions, writing flags (gikun, ateji, usually kana), kanji components
- **Licence decides where enrichment can live:** almost everything is CC BY-SA → published `data/` would become CC BY-SA + credits; Kaishi: private use only

## Sources at a glance
| Source | What | Covers ours | Licence | Verdict |
|---|---|---|---|---|
| JMdict (jmdict-simplified, JSON, weekly) | words: writings, readings, senses, part of speech, flags, cross-refs | 186/187 words (感謝する = 感謝 + `vs`) | CC BY-SA 4.0 (EDRDG) | ✅ main reference for words |
| KANJIDIC2 + KRADFILE (same release) | kanji: typed readings, grade, frequency, strokes, components | 214/214 | CC BY-SA 4.0 (EDRDG) | ✅ main reference for kanji |
| JmdictFurigana | reading per kanji in a word | 174 words split, 8 as one block | treat as CC BY-SA | ✅ kanji uses |
| KanjiVG | stroke order + component tree (XML) | 214/214 | CC BY-SA 3.0 | later: components, writing practice |
| kanjiapi.dev | JSON API over KANJIDIC/JMdict | – | EDRDG | ❌ same data, API not needed |
| Tatoeba | sentences + English, word index with sense number | 174 words with a checked sentence | CC BY 2.0 FR (no share-alike); audio mostly not reusable | ✅ example sentences |
| Kaishi 1.5k (Anki) | curated beginner list: order, frequency, pitch, sentence, audio | 116/187 | none stated, copyrighted parts | private reference only |
| Kanjium | lookalikes, phonetic components, synonyms, antonyms, homonyms, pitch accent | 77–171 by file | CC BY-SA 4.0 | ✅ relations + pitch |
| kanji-db-data | computed similar kanji, phonetic series | 132/214 | CC BY-SA 4.0 | grooming: noisy (本~車) |
| japanese-language-data | repackaged JMdict/KANJIDIC/Kanjium/JLPT; draft grammar | – | CC BY-SA 4.0 | ❌ take upstreams; grammar unreviewed, likely AI |

## Findings on our data
| Topic | Example | Finding |
|---|---|---|
| Several writings, one word | あく: 開く · 空く · 明く ("esp. 開く") | a meaning can apply to one writing only |
| Meaning tied to a reading | 今日 こんにち only: "these days" | JMdict `appliesToKana`; we can't express it |
| Class per meaning | 毎日 `n adv` · 生 `adj-no n` · 一番 `n adj-no adv` | all 9 unclassified words resolve per meaning |
| Class mismatches | ある `v5r-i` (godan, irregular ない) · 京都/日本 proper-noun vs `n` | our `u` ok, irregularity missing |
| `suru` | お茶, 仕事, 唐揚げ carry `vs` too | check, don't copy blindly |
| Reading flags | 今日 昨日 明日 大人 おいしい `gikun` · 寿司 唐揚げ `ateji` · 分かる `uk` | ≈ our `wholeWordReading` / `usuallyWritten` |
| Kanji uses | 学校 学[がっ]校[こう] · 友達 達[だち] · 時々 々[どき] | sound-changed reading given; base (がく) from KANJIDIC |
| Untyped readings | 191/192 match one KANJIDIC on/kun reading | 気 き listed as both |
| Lookalikes | Kanjium 右↔石, 間→問, 開→関; components: 門 in 間 聞 問 開 閉 簡 | reproduces 門 group, **not** 日目白百 (目 has no parts); 西: nothing |
| Phonetic series | 門 → 聞 間 問; 寺 → 時 持; 乍 → 作 昨 | new kind of relation for us |
| Antonyms | 開↔閉, 東↔西, 右↔左; 好き↔嫌い | 33 pairs among our kanji |
| Transitivity | 閉まる→閉める, 始まる→始める, 止まる→止める, 起きる→起こす | from vi/vt tags; 27/54 verbs get candidates, about half noise (買い物); 開く→開ける missed |
| Pitch accent | 橋 2 · 箸 1 · 雨 1 · 飴 0 · 花 2 · 鼻 0 · 紙 2 · 神 1 | separates all our same-sound pairs |
| Sentences | 寝る前に歯を磨きなさい。 / Brush your teeth before going to bed. | index tags word + sense + inflected form, ≈ our `uses[]` |
| Learning order | Kaishi: 好き #5, 寝る #188, 開ける #421; 72 of ours in first 500 | order ≠ frequency (日本語 #9, freq 5,442) |

## Anki: Kaishi 1.5k
Read from its GitHub release (1,500 notes); AnkiWeb deck list not seen (needs a browser). Private reference only.

| Finding | Example | For us |
|---|---|---|
| curated learning order ≠ frequency | 好き #5, 寝る #188; 日本語 #9 at freq 5,442 | order and frequency are two concepts |
| one note per meaning | 聞く twice: to hear / to ask | = our split meanings |
| a card asks one direction | word → meaning | = our rating facets, without scheduling |
| pitch accent + notes on all words | | same concept as Kanjium |
| sentence with the used form marked | もう**寝よう**。 | ≈ `uses[]` with form chain |
| 116 of our 187 words in it | missing: 電車, 駅, 会社, 天気, 卵 | we collect outside beginner lists |
| ~1,380 words we don't have | | possible private "what next" list |

## Concepts we don't model
| Concept | Source | When |
|---|---|---|
| class per meaning; meaning restricted to a reading or writing | JMdict | grooming |
| writing flags: gikun, ateji, rare / irregular writing, usually kana | JMdict | grooming |
| pitch accent per word (+ "differs by pitch" on homophones) | Kanjium | grooming |
| learning order, frequency, JLPT level | Kaishi, KANJIDIC, Waller | grooming |
| kanji components, phonetic component, formation type | KRADFILE, KanjiVG, Kanjium | grooming |
| antonym, phonetic-series relations | Kanjium | grooming |
| reference id per record (e.g. JMdict 1586270, Tatoeba 145651) to refresh and credit | all | grooming |
| sentence quality (checked, native-reviewed) | Tatoeba | later |
| audio, stroke order, note vs card / scheduling | Tatoeba, KanjiVG, Anki | later |

## Enrichment: now / grooming / later
| When | What | Source | Fits model as |
|---|---|---|---|
| **Now** | type the 191 `unknown` kanji readings | KANJIDIC | existing field |
| **Now** | kanji uses for 174 words (sound change + base) | JmdictFurigana + KANJIDIC | existing `kanjiUses` |
| **Now** | lookalikes as **suggested / proposed** (11 new pairs; transitivity: all real candidates already in the seed) | Kanjium | existing type, confirm in app |
| **Now** | 1 checked example sentence per word, with translation | Tatoeba | sentence, `origin: reference` |
| **Now** | review list: `suru`, ある, proper nouns | JMdict | learner decides, nothing imported |
| Grooming | class per meaning, pitch accent, learning order, antonym + phonetic relations, reference ids | see above | model change |
| Later | audio, stroke order, practice cards, regular refresh from sources | | |

- **Reference vs personal:** imported data = `origin: reference` (or `suggested` for relations); never ratings; personal knowledge stays learner-only
- **How:** one-off scripts like `convert-seed` → app JSON → merge import; no API, no live link to sources

## Licences
| Source | Publish derived data in `data/` |
|---|---|
| JMdict, KANJIDIC2, KRADFILE, JmdictFurigana, Kanjium, KanjiVG, kanji-db-data | credit + licence link under "Credits" in `README.md`; `data/` file under CC BY-SA |
| Tatoeba (text) | credit Tatoeba + sentence id; CC BY, no share-alike |
| Kaishi (and its audio, pictures, Core sentences) | never; private reference only |
| Tatoeba audio | mostly no licence stated → don't use |
