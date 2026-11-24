import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef } from '../../js/model/data.js';
import { addUnit, addMeaning, addReading } from '../../js/model/units.js';
import { addRelation } from '../../js/model/relations.js';
import { mergeImport } from '../../js/model/io.js';

const T = '2026-03-01T00:00:00.000Z';
const set = (build) => {
  const d = emptyData();
  build(d);
  return d;
};
const merge = (d, inc) => mergeImport(d, inc, { file: 'set.json', now: T });

test('#1 same short id for a different word: imported as a new entry, nothing garbled', () => {
  const d = emptyData();
  addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' }, { id: 'w1' });
  const report = merge(d, set((x) => addUnit(x, 'word', { reading: 'ビール' }, { id: 'w1' })));
  assert.equal(d.words.length, 2);
  assert.equal(d.words.find((w) => w.reading === 'ねる').writings[0].text, '寝る');
  assert.notEqual(d.words[1].id, 'w1');
  assert.equal(report.added, 1);
});

test('#1 own backup: same generated id with edited text still matches', () => {
  const d = emptyData();
  const id = '3f1c2b9e-0d4a-4c1e-9a77-2b6f0e1d5c88';
  addUnit(d, 'sentence', { text: '昨日は早く寝ました。' }, { id });
  merge(d, set((x) => addUnit(x, 'sentence', { text: '昨日は早く寝た。' }, { id })));
  assert.equal(d.sentences.length, 1);
});

test('#2 kana-only word joins the one word with that reading', () => {
  const d = emptyData();
  addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' });
  const inc = set((x) => addMeaning(addUnit(x, 'word', { reading: 'ねる' }), { gloss: 'to go to bed' }));
  merge(d, inc);
  assert.equal(d.words.length, 1);
  assert.deepEqual(d.words[0].meanings.map((m) => m.gloss), ['to go to bed']);
});

test('#2 writing-only word joins the word with that writing', () => {
  const d = emptyData();
  addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' });
  merge(d, set((x) => addUnit(x, 'word', { writings: [{ text: '寝る' }] })));
  assert.equal(d.words.length, 1);
});

test('#2 ambiguous (はし: 橋 and 箸; 開く: あく and ひらく): added and flagged as possible duplicate', () => {
  const d = emptyData();
  const a = addUnit(d, 'word', { writings: [{ text: '橋' }], reading: 'はし' });
  const b = addUnit(d, 'word', { writings: [{ text: '箸' }], reading: 'はし' });
  addUnit(d, 'word', { writings: [{ text: '開く' }], reading: 'あく' });
  addUnit(d, 'word', { writings: [{ text: '開く' }], reading: 'ひらく' });
  const report = merge(d, set((x) => {
    addUnit(x, 'word', { reading: 'はし' });
    addUnit(x, 'word', { writings: [{ text: '開く' }] });
  }));
  assert.equal(d.words.length, 6);
  assert.equal(report.duplicates.length, 2);
  assert.deepEqual(report.duplicates[0].candidates.sort(), [makeRef('word', a.id), makeRef('word', b.id)].sort());
});

test('#3 reading with unknown type merges with the known one; known type kept', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '月' });
  addReading(k, { kana: 'がつ', type: 'unknown' });
  addReading(k, { kana: 'げつ', type: 'on' });
  merge(d, set((x) => {
    const m = addUnit(x, 'kanji', { char: '月' });
    addReading(m, { kana: 'がつ', type: 'on' });
    addReading(m, { kana: 'げつ', type: 'unknown' });
  }));
  assert.deepEqual(k.readings.map((r) => [r.kana, r.type]), [['がつ', 'on'], ['げつ', 'on']]);
});

test('#4 contradiction: mine stays, reported with both values', () => {
  const d = emptyData();
  const w = addUnit(d, 'word', { writings: [{ text: '帰る' }], reading: 'かえる', verbGroup: 'u' });
  const report = merge(d, set((x) => addUnit(x, 'word', { writings: [{ text: '帰る' }], reading: 'かえる', verbGroup: 'ru' })));
  assert.equal(w.verbGroup, 'u');
  assert.deepEqual(report.conflicts, [{ ref: makeRef('word', w.id), field: 'verbGroup', mine: 'u', theirs: 'ru' }]);
});

test('#5 different reference list: mine stays, reported', () => {
  const d = emptyData();
  const w1 = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' });
  const s = addUnit(d, 'sentence', { text: '寝た。', uses: [{ wordId: w1.id }] });
  const report = merge(d, set((x) => {
    const w = addUnit(x, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' });
    addUnit(x, 'sentence', { text: '寝た。', uses: [{ wordId: w.id, form: ['past'] }] });
  }));
  assert.deepEqual(s.uses, [{ wordId: w1.id }]);
  assert.deepEqual(report.conflicts.map((c) => c.field), ['uses']);
});

test('same values are not contradictions; re-import reports nothing', () => {
  const d = emptyData();
  const inc = set((x) => addUnit(x, 'word', { writings: [{ text: '帰る' }], reading: 'かえる', verbGroup: 'u' }));
  merge(d, inc);
  const again = merge(d, inc);
  assert.deepEqual([again.added, again.conflicts.length, again.duplicates.length, again.checks.length], [0, 0, 0, 0]);
});

test('#6 overlapping group: added, flagged to check', () => {
  const d = emptyData();
  const ref = (c) => makeRef('kanji', addUnit(d, 'kanji', { char: c }, { id: c }).id);
  const [a, b, c] = [ref('門'), ref('聞'), ref('間')];
  addRelation(d, { type: 'looks-similar', members: [a, b, c] });
  const report = merge(d, set((x) => {
    for (const ch of ['門', '聞', '間', '問']) addUnit(x, 'kanji', { char: ch }, { id: ch });
    addRelation(x, { type: 'looks-similar', members: ['kanji:門', 'kanji:聞', 'kanji:間', 'kanji:問'] });
  }));
  assert.equal(d.relations.length, 2);
  assert.equal(report.checks.length, 1);
  assert.match(report.checks[0].reason, /overlap/);
});

test('#7 near-duplicate meaning: added, flagged to check', () => {
  const d = emptyData();
  const w = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' });
  addMeaning(w, { gloss: 'to sleep' });
  const report = merge(d, set((x) => addMeaning(addUnit(x, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' }), { gloss: 'sleep' })));
  assert.equal(w.meanings.length, 2);
  assert.equal(report.checks.length, 1);
  assert.match(report.checks[0].reason, /meaning/);
});

test('report is kept with the import record', () => {
  const d = emptyData();
  addUnit(d, 'word', { writings: [{ text: '帰る' }], reading: 'かえる', verbGroup: 'u' });
  merge(d, set((x) => addUnit(x, 'word', { writings: [{ text: '帰る' }], reading: 'かえる', verbGroup: 'ru' })));
  assert.equal(d.imports.at(-1).report.conflicts.length, 1);
});

test('a second import counts everything as already there, not only entries', async () => {
  const { addRating } = await import('../../js/model/ratings.js');
  const inc = set((x) => {
    const a = makeRef('kanji', addUnit(x, 'kanji', { char: '聞' }).id);
    const b = makeRef('kanji', addUnit(x, 'kanji', { char: '間' }).id);
    addRelation(x, { type: 'looks-similar', members: [a, b] });
    addRating(x, { unit: a }, { value: 'known' }, { now: T });
    x.tags.push({ id: 't1', name: 'N5' });
  });
  const d = emptyData();
  const first = merge(d, inc);
  const second = merge(d, inc);
  assert.equal(first.added, 5);
  assert.deepEqual([second.added, second.updated, second.skipped], [0, 0, 5]);
});
