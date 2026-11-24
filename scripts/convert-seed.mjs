// Usage: node scripts/convert-seed.mjs out/japanese-learning-linked-seed.json out/seed-import.json
import { readFileSync, writeFileSync } from 'node:fs';
import { convertSeed } from './seed-convert.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/convert-seed.mjs <seed.json> <out.json>');
  process.exit(1);
}
const data = convertSeed(JSON.parse(readFileSync(input, 'utf8')));
writeFileSync(output, JSON.stringify(data, null, 2));
const count = (k) => data[k].length;
console.log(
  `kanji ${count('kanji')} · words ${count('words')} · sentences ${count('sentences')} · relations ${count('relations')} · ratings ${count('ratings')} · skipped ${data.meta.skipped.length}`,
);
