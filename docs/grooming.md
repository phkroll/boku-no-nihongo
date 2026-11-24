# Grooming input

Open questions, assumptions and limitations found while building and using the app. Input for the next requirements review; add while using.

## Assumptions (made to start, cheap to change)
| Assumption | Revisit when |
|---|---|
| One word = one reading (開く あく / ひらく are two words) | a case where two readings share all meanings |
| Meanings split by hand; import keeps gloss text unsplit | splitting gets tedious |
| Forms = chain of grammar points; no conjugation engine | practice needs generated forms |
| Ratings are self-reported; "resolved" mix-up = calculated from ratings | practice evidence arrives |
| Confirmed relation types: looks-similar, similar-meaning, transitivity-pair, politeness-variant, related, confuses | a relation fits none (record it as a note) |

## Limitations (known, accepted for now)
- Relations the app works out itself (same reading 橋/箸, kanji in word, …) can't be rated; create them as a relation first
- "What I know" offers a fixed list of questions per entry type; a missing question = note it here
- Seed's regular forms of 寝る kept as `word.forms` (example forms) although forms are meant to be derived — drop or keep once conjugation exists
- Seed kanji readings/glosses are common examples, not verified; 192 readings have unknown type
- A word has one class only; words with two (毎日 noun + adverb, 少し adverb + noun, 生 noun used like an adjective) stay unclassified for now
- Word classes of the seed words filled by Claude (unmarked, user's choice); 9 two-class words left unclassified
- Counter sound changes (一本 いっぽん) not modelled
- Calculated "shared gloss" only works on split meanings
- Data lives on one phone; backup = manual export
- Imports never delete (by design): a link or entry removed in a newer set stays; merging an older own backup brings back what was deleted since
- Import only reports contradictions, possible duplicates, overlapping groups, similar meanings (by design); resolving them is manual

## Known small issues (deferred)
- To check on the phone: file picker, prompt/confirm in the Home Screen app, tab bar with keyboard open, share sheet

## Open questions
- How should knowledge of a whole group differ from knowledge of its pairs in practice?
- Which meaning does an imprecise seed rating ("familiar sense only") refer to? Resolve while splitting meanings.
- 西 confused with: 四, 酉 or 酒? (suspected only)
