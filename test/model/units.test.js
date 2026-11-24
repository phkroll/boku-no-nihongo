import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef, getUnit, UNKNOWN } from '../../js/model/data.js';
import { addUnit, updateUnit, splitMeaning, deleteMeaning, addMeaning, addReading } from '../../js/model/units.js';
import { search } from '../../js/model/search.js';

const T0 = '2026-01-01T00:00:00.000Z';

test('word with only reading', () => {
  const d = emptyData();
  const w = addUnit(d, 'word', { reading: 'ねる' });
  assert.equal(w.reading, 'ねる');
  assert.equal(w.writings, undefined);
  assert.equal(getUnit(d, makeRef('word', w.id)), w);
});

test('word with only writing', () => {
  const w = addUnit(emptyData(), 'word', { writings: [{ text: '寝る' }] });
  assert.equal(w.writings[0].text, '寝る');
  assert.equal(w.reading, undefined);
});

test('word with neither throws', () => {
  assert.throws(() => addUnit(emptyData(), 'word', { reading: '  ' }), /writing or a reading/);
});

test('kanji must be one character, unique', () => {
  const d = emptyData();
  assert.throws(() => addUnit(d, 'kanji', { char: '月日' }), /character/);
  addUnit(d, 'kanji', { char: '月' });
  assert.throws(() => addUnit(d, 'kanji', { char: '月' }), /月 exists/);
});

test('other kinds need their core field', () => {
  const d = emptyData();
  assert.throws(() => addUnit(d, 'grammar', {}), /title/);
  assert.throws(() => addUnit(d, 'sentence', {}), /text/);
  assert.throws(() => addUnit(d, 'note', { text: ' ' }), /text/);
});

test('origin defaults to learner, created/updated set', () => {
  const u = addUnit(emptyData(), 'note', { text: 'Is 西 confused with 酉?' }, { now: T0 });
  assert.deepEqual(u.origin, { kind: 'learner' });
  assert.equal(u.created, T0);
  assert.equal(u.updated, T0);
});

test('unknown fields survive update', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '寝', foo: 1 });
  updateUnit(d, makeRef('kanji', k.id), { notes: 'sleep' });
  assert.equal(k.foo, 1);
  assert.equal(k.notes, 'sleep');
});

test('verbGroup unknown is kept as a value', () => {
  const w = addUnit(emptyData(), 'word', { reading: 'かえる', verbGroup: UNKNOWN });
  assert.equal(w.verbGroup, UNKNOWN);
});

test('splitMeaning hides old, keeps id, sets splitInto', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '月' });
  const m = addMeaning(k, { gloss: 'Moon, month', unsplit: true });
  const parts = splitMeaning(k, m.id, ['moon', 'month']);
  assert.deepEqual(parts.map((p) => p.gloss), ['moon', 'month']);
  const old = k.meanings.find((x) => x.id === m.id);
  assert.equal(old.hidden, true);
  assert.deepEqual(old.splitInto, parts.map((p) => p.id));
});

test('deleteMeaning removes it', () => {
  const d = emptyData();
  const w = addUnit(d, 'word', { reading: 'きく' });
  const m = addMeaning(w, { gloss: 'listen' });
  deleteMeaning(d, makeRef('word', w.id), m.id);
  assert.deepEqual(w.meanings, []);
});

test('addReading with type', () => {
  const k = addUnit(emptyData(), 'kanji', { char: '月' });
  const r = addReading(k, { kana: 'げつ', type: 'on' });
  assert.equal(k.readings[0], r);
  assert.ok(r.id);
});

test('search: katakana by hiragana and full-width', () => {
  const d = emptyData();
  addUnit(d, 'word', { reading: 'ビール' });
  addUnit(d, 'word', { writings: [{ text: 'ＡＢＣ' }] });
  assert.equal(search(d, 'word', { query: 'びーる' }).length, 1);
  assert.equal(search(d, 'word', { query: 'abc ' }).length, 1);
});

test('search by gloss, char, tag; openOnly for notes', () => {
  const d = emptyData();
  d.tags.push({ id: 't1', name: 'N5' });
  const w = addUnit(d, 'word', { reading: 'ねる', tagIds: ['t1'] });
  addMeaning(w, { gloss: 'to sleep' });
  addUnit(d, 'kanji', { char: '寝' });
  addUnit(d, 'note', { text: 'done', open: false });
  addUnit(d, 'note', { text: 'open question', open: true });
  assert.equal(search(d, 'word', { query: 'sleep' }).length, 1);
  assert.equal(search(d, 'word', { tagId: 't1' }).length, 1);
  assert.equal(search(d, 'kanji', { query: '寝' }).length, 1);
  assert.deepEqual(search(d, 'note', { openOnly: true }).map((n) => n.text), ['open question']);
});
