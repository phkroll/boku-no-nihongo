import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef } from '../../js/model/data.js';
import { addUnit, addReading, deleteUnit } from '../../js/model/units.js';
import { addRelation } from '../../js/model/relations.js';
import { exportJson, parseBackup, parseRestore, markExported, mergeImport } from '../../js/model/io.js';

const T = '2026-02-01T00:00:00.000Z';

test('merge re-points copied reference lists to local ids', () => {
  const d = emptyData();
  const mine = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' }, { id: 'local-w' });
  const s = addUnit(d, 'sentence', { text: '寝た。' });
  const inc = emptyData();
  addUnit(inc, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' }, { id: 'W2' });
  addUnit(inc, 'sentence', { text: '寝た。', uses: [{ wordId: 'W2', form: ['past'] }] }, { id: 'S2' });
  addUnit(inc, 'note', { text: 'about 寝る', refs: ['word:W2'] }, { id: 'N2' });
  mergeImport(d, inc, { file: 'x', now: T });
  assert.deepEqual(s.uses, [{ wordId: mine.id, form: ['past'] }]);
  assert.deepEqual(d.notes[0].refs, [makeRef('word', mine.id)]);
});

test('deleting a kanji clears its reading ids in words', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '学' });
  const r = addReading(k, { kana: 'がく', type: 'on' });
  const w = addUnit(d, 'word', { writings: [{ text: '学校' }], kanjiUses: [{ char: '学', readingId: r.id, reading: 'がっ' }] });
  deleteUnit(d, makeRef('kanji', k.id));
  assert.equal(w.kanjiUses[0].readingId, undefined);
  assert.equal(w.kanjiUses[0].reading, 'がっ');
});

test('restore refuses old-version and empty files', () => {
  assert.throws(() => parseRestore(JSON.stringify({ version: 1, entries: [{ id: 'x' }] })), /older app version/);
  assert.throws(() => parseRestore(JSON.stringify(emptyData())), /no entries/);
  const d = emptyData();
  addUnit(d, 'kanji', { char: '月' });
  assert.equal(parseRestore(JSON.stringify(d)).kanji.length, 1);
});

test('export does not mark the data as backed up; markExported does', () => {
  const d = emptyData();
  const text = exportJson(d, T);
  assert.equal(d.meta.lastExport, undefined);
  assert.equal(parseBackup(text).meta.lastExport, T);
  markExported(d, T);
  assert.equal(d.meta.lastExport, T);
});

test('merge matches relations by id before members', () => {
  const d = emptyData();
  const [a, b, c] = ['月', '日', '目'].map((ch) => makeRef('kanji', addUnit(d, 'kanji', { char: ch }, { id: ch }).id));
  addRelation(d, { type: 'looks-similar', members: [a, b, c] }, { id: 'r1' });
  const backup = structuredClone(d);
  d.relations[0].members = [a, b];
  mergeImport(d, backup, { file: 'x', now: T });
  assert.equal(d.relations.length, 1);
  assert.equal(new Set(d.relations.map((r) => r.id)).size, 1);
});
