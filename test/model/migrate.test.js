import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORM_KEYS } from '../../js/model/data.js';
import { migrate } from '../../js/model/migrate.js';
import { ensureStarter } from '../../js/model/starter.js';

test('nothing stored gives empty data', () => {
  assert.equal(migrate(undefined).version, 2);
});

test('v1 is discarded but kept raw', () => {
  const v1 = { version: 1, entries: [{ id: 'e1', text: '寝る' }], tags: [], links: [] };
  const d = migrate(v1);
  assert.deepEqual(d.words, []);
  assert.deepEqual(d.meta.discardedV1, v1);
});

test('v2 missing collections filled, unknown fields kept', () => {
  const d = migrate({ version: 2, words: [{ id: 'w1', reading: 'ねる', extra: 'x' }], future: { a: 1 } });
  assert.deepEqual(d.kanji, []);
  assert.deepEqual(d.ratings, []);
  assert.equal(d.words[0].extra, 'x');
  assert.deepEqual(d.future, { a: 1 });
});

test('newer version throws', () => {
  assert.throws(() => migrate({ version: 3 }), /newer app version/);
});

test('starter forms added once, existing untouched', () => {
  const d = migrate(undefined);
  d.grammar.push({ id: 'g1', title: 'My past', formKey: 'past', notes: 'mine' });
  ensureStarter(d);
  ensureStarter(d);
  assert.equal(d.grammar.length, FORM_KEYS.length);
  assert.equal(d.grammar.find((g) => g.formKey === 'past').notes, 'mine');
  assert.deepEqual(d.grammar.find((g) => g.formKey === 'te').origin, { kind: 'reference' });
});
