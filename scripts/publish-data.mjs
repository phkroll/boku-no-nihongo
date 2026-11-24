// Writes publishable data into data/ from an app JSON file (converted seed or an exported backup).
// Usage: npm run publish-data -- out/boku-no-nihongo-2026-11-30.json
// data/content.json   — learning content (kanji, words, grammar, sentences, relations, tags)
// data/knowledge.json — personal: ratings, mix-ups, notes (delete this file to stop publishing it)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseBackup } from '../js/model/io.js';
import { splitData } from '../js/model/split.js';

const [input] = process.argv.slice(2);
if (!input) {
  console.error('Usage: npm run publish-data -- <app-json-file>');
  process.exit(1);
}
const { content, knowledge } = splitData(parseBackup(readFileSync(input, 'utf8')));
mkdirSync('data', { recursive: true });
writeFileSync('data/content.json', `${JSON.stringify(content, null, 1)}\n`);
writeFileSync('data/knowledge.json', `${JSON.stringify(knowledge, null, 1)}\n`);
const n = (d, k) => d[k].length;
console.log(`content: ${n(content, 'kanji')} kanji · ${n(content, 'words')} words · ${n(content, 'relations')} relations`);
console.log(`knowledge: ${n(knowledge, 'ratings')} ratings · ${n(knowledge, 'relations')} mix-ups · ${n(knowledge, 'notes')} notes`);
