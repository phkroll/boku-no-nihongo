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
- Counter sound changes (一本 いっぽん) not modelled
- Calculated "shared gloss" only works on split meanings
- Data lives on one phone; backup = manual export

## Open questions
- How should knowledge of a whole group differ from knowledge of its pairs in practice?
- Which meaning does an imprecise seed rating ("familiar sense only") refer to? Resolve while splitting meanings.
- 西 confused with: 四, 酉 or 酒? (suspected only)
