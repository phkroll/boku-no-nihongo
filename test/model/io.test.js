import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef } from '../../js/model/data.js';
import { addUnit, addMeaning, addReading } from '../../js/model/units.js';
import { addRelation } from '../../js/model/relations.js';
import { addRating } from '../../js/model/ratings.js';
import { exportJson, parseBackup, mergeImport } from '../../js/model/io.js';

const T = '2026-02-01T00:00:00.000Z';

function sampleIncoming() {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '月' }, { id: 'k1' });
  addReading(k, { kana: 'つき', type: 'kun' });
  addMeaning(k, { gloss: 'Moon, month', unsplit: true });
  const w = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる', verbGroup: 'ru' }, { id: 'w1' });
  const k2 = addUnit(d, 'kanji', { char: '寝' }, { id: 'k2' });
  addRelation(d, { type: 'related', members: [makeRef('kanji', k2.id), makeRef('word', w.id)] }, { id: 'r1' });
  addRating(d, { unit: makeRef('word', w.id), from: 'reading', to: 'meaning' }, { value: 'known' }, { now: T });
  d.tags.push({ id: 't9', name: 'JLPT N5' });
  w.tagIds = ['t9'];
  return d;
}

test('round trip via export and parseBackup', () => {
  const d = sampleIncoming();
  const back = parseBackup(exportJson(d, T));
  assert.equal(back.meta.lastExport, T);
  assert.deepEqual(back.words, d.words);
});

test('parseBackup rejects garbage', () => {
  for (const bad of ['{', '[]', '"x"', '{"version":7}']) assert.throws(() => parseBackup(bad), /Boku no Nihongo|newer/, bad);
});

test('merge into empty data adds everything with an import record', () => {
  const d = emptyData();
  const summary = mergeImport(d, sampleIncoming(), { file: 'seed.json', now: T });
  assert.deepEqual(summary, { added: 6, updated: 0, skipped: 0 });
  assert.equal(d.imports.length, 1);
  assert.equal(d.words[0].importId, d.imports[0].id);
  assert.equal(d.tags[0].name, 'JLPT N5');
});

test('merge fills missing fields, never overwrites learner data', () => {
  const d = emptyData();
  addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる', verbGroup: 'u', notes: 'mine' }, { id: 'mine' });
  const inc = sampleIncoming();
  inc.words[0].notes = 'theirs';
  inc.words[0].wordClass = 'verb';
  mergeImport(d, inc, { file: 'x', now: T });
  const w = d.words.find((x) => x.id === 'mine');
  assert.equal(w.verbGroup, 'u');
  assert.equal(w.notes, 'mine');
  assert.equal(w.wordClass, 'verb');
  assert.equal(d.words.length, 1);
});

test('merge combines readings and meanings without duplicates', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '月' });
  addReading(k, { kana: 'つき', type: 'kun' });
  addReading(k, { kana: 'げつ', type: 'on' });
  mergeImport(d, sampleIncoming(), { file: 'x', now: T });
  assert.deepEqual(k.readings.map((r) => r.kana), ['つき', 'げつ']);
  assert.deepEqual(k.meanings.map((m) => m.gloss), ['Moon, month']);
});

test('re-import is idempotent', () => {
  const d = emptyData();
  mergeImport(d, sampleIncoming(), { file: 'x', now: T });
  const counts = () => ['kanji', 'words', 'relations', 'ratings', 'tags'].map((k) => d[k].length);
  const before = counts();
  const second = mergeImport(d, sampleIncoming(), { file: 'x', now: T });
  assert.equal(second.added, 0);
  assert.deepEqual(counts(), before);
});

test('refs remapped to matched ids', () => {
  const d = emptyData();
  const mine = addUnit(d, 'kanji', { char: '寝' }, { id: 'my-k' });
  mergeImport(d, sampleIncoming(), { file: 'x', now: T });
  assert.ok(d.relations[0].members.includes(makeRef('kanji', mine.id)));
  assert.equal(d.kanji.length, 2);
});

test('refs to missing units dropped', () => {
  const inc = emptyData();
  addUnit(inc, 'word', { reading: 'ねる' }, { id: 'w1' });
  inc.relations.push({ id: 'r1', type: 'related', members: ['word:w1', 'kanji:gone'], status: 'confirmed', origin: { kind: 'learner' } });
  inc.ratings.push({ id: 'x', target: { unit: 'kanji:gone' }, value: 'known', confidence: 'sure', source: 'learner', at: T });
  const d = emptyData();
  mergeImport(d, inc, { file: 'x', now: T });
  assert.equal(d.relations.length, 0);
  assert.equal(d.ratings.length, 0);
});

test('unknown fields survive import', () => {
  const inc = sampleIncoming();
  inc.words[0].pitch = 'LHH';
  const d = emptyData();
  mergeImport(d, inc, { file: 'x', now: T });
  assert.equal(d.words[0].pitch, 'LHH');
});
