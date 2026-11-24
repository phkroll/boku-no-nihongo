import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, addEntry, updateEntry, getEntry, deleteEntry, search } from '../js/model.js';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';

function sample() {
  const d = emptyData();
  addEntry(d, { kind: 'word', text: '食べる', reading: 'たべる', meaning: 'to eat', wordType: 'verb' }, { id: 'e1', now: T0 });
  addEntry(d, { kind: 'word', text: '本', reading: 'ほん', meaning: 'book', wordType: 'noun' }, { id: 'e2', now: T1 });
  return d;
}

test('addEntry trims text and fills defaults', () => {
  const d = emptyData();
  const e = addEntry(d, { kind: 'word', text: '  食べる ', reading: 'たべる', wordType: 'verb' }, { id: 'e1', now: T0 });
  assert.equal(e.text, '食べる');
  assert.equal(e.meaning, '');
  assert.deepEqual(e.tagIds, []);
  assert.equal(e.created, T0);
  assert.equal(e.updated, T0);
  assert.equal(getEntry(d, 'e1'), e);
});

test('addEntry rejects empty text', () => {
  assert.throws(() => addEntry(emptyData(), { kind: 'word', text: '   ' }), /text/);
});

test('addEntry rejects unknown kind', () => {
  assert.throws(() => addEntry(emptyData(), { kind: 'x', text: 'a' }), /kind/);
});

test('wordType only kept for words', () => {
  const e = addEntry(emptyData(), { kind: 'kanji', text: '食', wordType: 'noun' });
  assert.equal(e.wordType, '');
});

test('updateEntry changes fields and updated, keeps created', () => {
  const d = sample();
  const e = updateEntry(d, 'e1', { meaning: 'to eat (food)' }, { now: T1 });
  assert.equal(e.meaning, 'to eat (food)');
  assert.equal(e.text, '食べる');
  assert.equal(e.created, T0);
  assert.equal(e.updated, T1);
});

test('deleteEntry removes the entry', () => {
  const d = sample();
  deleteEntry(d, 'e1');
  assert.equal(getEntry(d, 'e1'), undefined);
  assert.equal(d.entries.length, 1);
});

test('search matches text, reading, meaning, case- and width-insensitive', () => {
  const d = sample();
  assert.deepEqual(search(d, { query: 'ＥＡＴ ' }).map((e) => e.id), ['e1']);
  assert.deepEqual(search(d, { query: 'ほん' }).map((e) => e.id), ['e2']);
  assert.deepEqual(search(d, { query: '食' }).map((e) => e.id), ['e1']);
});

test('search filters by kind and tagId, newest first', () => {
  const d = sample();
  d.tags.push({ id: 't1', name: 'N5' });
  addEntry(d, { kind: 'kanji', text: '食', tagIds: ['t1'] }, { id: 'e3', now: '2026-01-03T00:00:00.000Z' });
  assert.deepEqual(search(d, {}).map((e) => e.id), ['e3', 'e2', 'e1']);
  assert.deepEqual(search(d, { kind: 'word' }).map((e) => e.id), ['e2', 'e1']);
  assert.deepEqual(search(d, { tagId: 't1' }).map((e) => e.id), ['e3']);
});
