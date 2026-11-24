// Usage: npm run enrich -- <app export.json>   (sources in out/sources/, see README "Enrich data")
// Writes out/enrich-import.json (load on the phone: Settings → add data) and out/enrich-review.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { enrich, kanjidicReadings, parseToken } from './enrich.mjs';
import { migrate } from '../js/model/migrate.js';
import { normalize } from '../js/model/data.js';

const DIR = 'out/sources';
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run enrich -- <app export.json>');
  process.exit(1);
}
const json = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8').replace(/^\uFEFF/, ''));
const lines = (f) => readFileSync(`${DIR}/${f}`, 'utf8').split('\n').filter(Boolean);
const tsv = (f) => lines(f).map((l) => l.split('\t'));

const data = migrate(JSON.parse(readFileSync(input, 'utf8')));

const kanjidic = json('kanjidic2-en.json');
const kanjidicByChar = new Map(kanjidic.characters.map((c) => [c.literal, kanjidicReadings(c)]));

const furiganaByKey = new Map(json('JmdictFurigana.json').map((f) => [`${f.text}|${normalize(f.reading)}`, f]));

const jmdict = json('jmdict-eng.json');
const jmdictByKey = new Map();
const writingsInDictionary = new Map();
for (const e of jmdict.words) {
  for (const k of e.kanji) writingsInDictionary.set(k.text, (writingsInDictionary.get(k.text) ?? 0) + 1);
  const writings = e.kanji.length ? e.kanji.map((k) => k.text) : [];
  for (const r of e.kana) {
    const reading = normalize(r.text);
    const applies = r.appliesToKanji.includes('*') ? writings : r.appliesToKanji;
    for (const w of [...applies, reading]) {
      const key = `${w}|${reading}`;
      jmdictByKey.set(key, [...(jmdictByKey.get(key) ?? []), e]);
    }
  }
}

const index = tsv('jpn_indices.csv').map(([jpn, eng, b]) => ({ jpn, eng, tokens: (b ?? '').split(' ').map(parseToken).filter(Boolean) }));
const needJpn = new Set(index.map((l) => l.jpn));
const needEng = new Set(index.map((l) => l.eng));
const texts = new Map(tsv('jpn_sentences_detailed.tsv').filter((r) => needJpn.has(r[0])).map((r) => [r[0], r[2]]));
const eng = new Map(tsv('eng_sentences.tsv').filter((r) => needEng.has(r[0])).map((r) => [r[0], r[2]]));
const transcriptions = new Map(tsv('jpn_transcriptions.tsv').filter((r) => needJpn.has(r[0])).map((r) => [r[0], r[4]]));

const versions = {
  jmdict: `jmdict-simplified ${jmdict.version} (${jmdict.dictDate})`,
  kanjidic: `kanjidic2 ${kanjidic.version} (${kanjidic.dictDate})`,
  furigana: 'JmdictFurigana', kanjium: 'Kanjium lookalikes', tatoeba: 'Tatoeba exports',
};

const { data: out, review } = enrich(data, {
  kanjidicByChar, furiganaByKey, jmdictByKey, lookalikeLines: lines('kanjium-lookalikes.txt'), versions,
  tatoeba: { index, texts, eng, transcriptions, writingsInDictionary },
});
writeFileSync('out/enrich-import.json', JSON.stringify(out, null, 2));
writeFileSync('out/enrich-review.txt', review.join('\n') + '\n');
const typed = out.kanji.reduce((n, k) => n + k.readings.length, 0);
console.log(`readings typed ${typed} · words with kanji uses ${out.words.length} · relations ${out.relations.length} · sentences ${out.sentences.length}`);
console.log('→ out/enrich-import.json, out/enrich-review.txt');
