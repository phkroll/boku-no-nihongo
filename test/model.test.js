import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyData, addEntry, updateEntry, getEntry, deleteEntry, search,
  addTag, renameTag, deleteTag, addLink, deleteLink, linksOf,
  exportJson, importJson,
} from '../js/model.js';

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

test('addTag dedupes case-insensitively', () => {
  const d = emptyData();
  const a = addTag(d, ' JLPT N5 ');
  const b = addTag(d, 'jlpt n5');
  assert.equal(a.name, 'JLPT N5');
  assert.equal(a.id, b.id);
  assert.equal(d.tags.length, 1);
});

test('addTag rejects empty name', () => {
  assert.throws(() => addTag(emptyData(), '  '), /name/);
});

test('renameTag changes the name', () => {
  const d = emptyData();
  const t = addTag(d, 'food');
  assert.equal(renameTag(d, t.id, 'Food ').name, 'Food');
});

test('deleteTag removes tag from entries', () => {
  const d = emptyData();
  const t = addTag(d, 'food');
  addEntry(d, { kind: 'word', text: '食べる', tagIds: [t.id] }, { id: 'e1' });
  deleteTag(d, t.id);
  assert.equal(d.tags.length, 0);
  assert.deepEqual(getEntry(d, 'e1').tagIds, []);
});

test('addEntry and updateEntry drop unknown tagIds', () => {
  const d = emptyData();
  const t = addTag(d, 'food');
  const e = addEntry(d, { kind: 'word', text: 'a', tagIds: [t.id, 'nope'] });
  assert.deepEqual(e.tagIds, [t.id]);
  assert.deepEqual(updateEntry(d, e.id, { tagIds: ['nope'] }).tagIds, []);
});

test('addLink both directions', () => {
  const d = sample();
  const l = addLink(d, 'e1', 'e2', ' see also ');
  assert.equal(l.note, 'see also');
  assert.equal(linksOf(d, 'e2')[0].other.id, 'e1');
  assert.equal(linksOf(d, 'e1')[0].other.id, 'e2');
});

test('addLink returns existing for reverse duplicate', () => {
  const d = sample();
  const a = addLink(d, 'e1', 'e2');
  const b = addLink(d, 'e2', 'e1');
  assert.equal(a.id, b.id);
  assert.equal(d.links.length, 1);
});

test('addLink rejects self-link and unknown entries', () => {
  const d = sample();
  assert.throws(() => addLink(d, 'e1', 'e1'), /itself/);
  assert.throws(() => addLink(d, 'e1', 'nope'), /not found/);
});

test('deleteLink removes the link', () => {
  const d = sample();
  const l = addLink(d, 'e1', 'e2');
  deleteLink(d, l.id);
  assert.deepEqual(linksOf(d, 'e1'), []);
});

test('deleteEntry removes its links', () => {
  const d = sample();
  addLink(d, 'e1', 'e2');
  deleteEntry(d, 'e1');
  assert.equal(d.links.length, 0);
});

function withoutExportedAt(text) {
  const { exportedAt, ...rest } = JSON.parse(text);
  return rest;
}

test('round trip keeps entries, tags, links', () => {
  const d = sample();
  const t = addTag(d, 'food');
  updateEntry(d, 'e1', { tagIds: [t.id] });
  addLink(d, 'e1', 'e2', 'note');
  const text = exportJson(d);
  assert.ok(JSON.parse(text).exportedAt);
  assert.deepEqual(importJson(text), withoutExportedAt(text));
  assert.deepEqual(importJson(text), JSON.parse(JSON.stringify(d)));
});

test('importJson throws on garbage', () => {
  for (const bad of ['{', '[]', 'null', '{"version":2,"entries":[],"tags":[],"links":[]}', '{"version":1,"entries":{},"tags":[],"links":[]}']) {
    assert.throws(() => importJson(bad), /not a Boku no Nihongo backup/, bad);
  }
});

test('importJson drops dangling refs', () => {
  const text = JSON.stringify({
    version: 1,
    tags: [{ id: 't1', name: 'food' }],
    entries: [
      { id: 'e1', kind: 'word', text: 'a', tagIds: ['t1', 'gone'] },
      { id: 'e2', kind: 'word', text: '' },
      { kind: 'word', text: 'no id' },
    ],
    links: [{ id: 'l1', from: 'e1', to: 'e2' }],
  });
  const d = importJson(text);
  assert.deepEqual(d.entries.map((e) => e.id), ['e1']);
  assert.deepEqual(d.entries[0].tagIds, ['t1']);
  assert.deepEqual(d.links, []);
});

test('importJson keeps unknown kind', () => {
  const text = JSON.stringify({
    version: 1, tags: [], links: [],
    entries: [{ id: 'e1', kind: 'counter', text: '本', created: 'x', updated: 'x' }],
  });
  assert.equal(importJson(text).entries[0].kind, 'counter');
});
