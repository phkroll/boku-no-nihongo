import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef, FORM_KEYS } from '../../js/model/data.js';
import { addUnit } from '../../js/model/units.js';
import { addRelation, updateRelation } from '../../js/model/relations.js';
import { addRating } from '../../js/model/ratings.js';
import { ensureStarter } from '../../js/model/starter.js';
import { EXTRA_GRAMMAR } from '../../js/model/grammar-content.js';

const STARTER = FORM_KEYS.length + EXTRA_GRAMMAR.length;
import { mergeImport } from '../../js/model/io.js';

function kanji(d, ...chars) {
  return chars.map((c) => makeRef('kanji', addUnit(d, 'kanji', { char: c }).id));
}

test('editing members drops a direction that names a removed member', () => {
  const d = emptyData();
  const [a, b, c] = kanji(d, '開', '閉', '問');
  const r = addRelation(d, { type: 'related', members: [a, b, c], direction: [a, b] });
  updateRelation(d, r.id, { members: [a, c] });
  assert.equal(r.direction, undefined);
});

test('editing members drops tell-apart ratings for a removed member, keeps the rest', () => {
  const d = emptyData();
  const [a, b, c] = kanji(d, '時', '持', '待');
  const r = addRelation(d, { type: 'looks-similar', members: [a, b, c] });
  const rel = makeRef('relation', r.id);
  addRating(d, { unit: rel, members: [a, b] }, { value: 'unknown' });
  addRating(d, { unit: rel, members: [a, c] }, { value: 'known' });
  addRating(d, { unit: rel }, { value: 'known' });
  updateRelation(d, r.id, { members: [a, c] });
  assert.deepEqual(d.ratings.map((x) => x.target.members ?? []), [[a, c], []]);
});

test('editing members into a copy of another relation is refused', () => {
  const d = emptyData();
  const [a, b, c] = kanji(d, '聞', '間', '問');
  addRelation(d, { type: 'confuses', members: [a, b] });
  const r = addRelation(d, { type: 'confuses', members: [a, c] });
  assert.throws(() => updateRelation(d, r.id, { members: [b, a] }), /already exists/);
  assert.deepEqual(r.members, [a, c]);
});

test('a deleted starter grammar point stays deleted', () => {
  const d = ensureStarter(emptyData());
  d.grammar = d.grammar.filter((g) => g.formKey !== 'imperative');
  ensureStarter(d);
  assert.equal(d.grammar.length, STARTER - 1);
  assert.ok(!d.grammar.some((g) => g.formKey === 'imperative'));
});

test('existing data without a starter record: missing forms added once, then deletions stick', () => {
  const d = emptyData();
  d.grammar.push({ id: 'g1', title: 'Past', formKey: 'past' });
  ensureStarter(d);
  assert.equal(d.grammar.length, STARTER);
  d.grammar = d.grammar.filter((g) => g.formKey !== 'te');
  ensureStarter(d);
  assert.equal(d.grammar.length, STARTER - 1);
});

test('merging a v1 file is refused and records no import', () => {
  const d = emptyData();
  assert.throws(() => mergeImport(d, { version: 1, entries: [{ id: 'e1', text: 'x' }] }), /older app version/);
  assert.equal(d.imports.length, 0);
});
