import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef, UNKNOWN } from '../../js/model/data.js';
import { addUnit } from '../../js/model/units.js';
import { addRelation } from '../../js/model/relations.js';
import { addRating } from '../../js/model/ratings.js';
import { ensureStarter } from '../../js/model/starter.js';
import { mergeImport } from '../../js/model/io.js';
import { splitData } from '../../js/model/split.js';

function sample() {
  const d = ensureStarter(emptyData());
  const a = makeRef('kanji', addUnit(d, 'kanji', { char: '聞' }).id);
  const b = makeRef('kanji', addUnit(d, 'kanji', { char: '間' }).id);
  addUnit(d, 'word', { reading: 'ねる', tagIds: ['t1'] });
  addUnit(d, 'grammar', { title: 'から vs ので' });
  addUnit(d, 'sentence', { text: '寝た。' });
  addUnit(d, 'note', { text: 'Is 西 confused with 酉?', open: true, refs: [a] });
  addRelation(d, { type: 'looks-similar', members: [a, b] });
  const mixup = addRelation(d, { type: 'confuses', members: [a, b] });
  addRelation(d, { type: 'confuses', members: [a, UNKNOWN] });
  addRating(d, { unit: a }, { value: 'known' });
  addRating(d, { unit: makeRef('relation', mixup.id), members: [a, b] }, { value: 'unknown' });
  d.tags.push({ id: 't1', name: 'N5' });
  d.imports.push({ id: 'i1', file: 'x', at: 'y' });
  d.meta.lastExport = 'z';
  return d;
}

test('content: units, non-personal relations, tags; no starter grammar, imports or meta', () => {
  const { content } = splitData(sample());
  assert.equal(content.version, 2);
  assert.deepEqual([content.kanji.length, content.words.length, content.sentences.length], [2, 1, 1]);
  assert.deepEqual(content.grammar.map((g) => g.title), ['から vs ので']);
  assert.deepEqual(content.relations.map((r) => r.type), ['looks-similar']);
  assert.equal(content.tags.length, 1);
  assert.deepEqual([content.ratings, content.notes, content.imports], [[], [], []]);
  assert.equal(content.meta.lastExport, undefined);
});

test('knowledge: ratings, mix-ups, notes — nothing else', () => {
  const { knowledge } = splitData(sample());
  assert.equal(knowledge.ratings.length, 2);
  assert.deepEqual(knowledge.relations.map((r) => r.type), ['confuses', 'confuses']);
  assert.equal(knowledge.notes.length, 1);
  assert.deepEqual([knowledge.kanji, knowledge.words, knowledge.tags], [[], [], []]);
});

test('loading content then knowledge rebuilds everything; content alone has no personal data', () => {
  const d = sample();
  const { content, knowledge } = splitData(d);
  const target = ensureStarter(emptyData());
  mergeImport(target, content, { file: 'data/content.json' });
  assert.deepEqual([target.ratings.length, target.notes.length], [0, 0]);
  mergeImport(target, knowledge, { file: 'data/knowledge.json' });
  for (const k of ['kanji', 'words', 'grammar', 'sentences', 'notes', 'relations', 'ratings', 'tags']) {
    assert.equal(target[k].length, d[k].length, k);
  }
  assert.deepEqual(target.notes[0].refs, d.notes[0].refs);
});
