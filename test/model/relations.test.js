import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef, UNKNOWN } from '../../js/model/data.js';
import { addUnit, addMeaning, addReading, deleteUnit, deleteReading } from '../../js/model/units.js';
import { addRelation, setRelationStatus, relationsOf, deleteRelation } from '../../js/model/relations.js';
import { calculatedRelations } from '../../js/model/calculated.js';

function kanji(d, ...chars) {
  return chars.map((c) => makeRef('kanji', addUnit(d, 'kanji', { char: c }).id));
}
function word(d, writing, reading, glosses = []) {
  const w = addUnit(d, 'word', { writings: writing ? [{ text: writing }] : undefined, reading });
  for (const g of glosses) addMeaning(w, { gloss: g });
  return makeRef('word', w.id);
}

test('group of 6 kanji', () => {
  const d = emptyData();
  const refs = kanji(d, '門', '聞', '間', '問', '開', '閉');
  const r = addRelation(d, { type: 'looks-similar', members: refs });
  assert.equal(r.members.length, 6);
  assert.equal(r.status, 'confirmed');
  assert.deepEqual(relationsOf(d, refs[2]).map((x) => x.id), [r.id]);
});

test('confuses with unknown partner', () => {
  const d = emptyData();
  const [nishi] = kanji(d, '西');
  const r = addRelation(d, { type: 'confuses', members: [nishi, UNKNOWN] });
  assert.deepEqual(r.members, [nishi, UNKNOWN]);
});

test('relation needs two members or one plus unknown', () => {
  const d = emptyData();
  const [a] = kanji(d, '右');
  assert.throws(() => addRelation(d, { type: 'related', members: [a] }), /two members/);
  assert.throws(() => addRelation(d, { type: 'nope', members: [a, UNKNOWN] }), /type/);
});

test('suggested relation is proposed', () => {
  const d = emptyData();
  const refs = kanji(d, '右', '石');
  const r = addRelation(d, { type: 'confuses', members: refs, origin: { kind: 'suggested' } });
  assert.equal(r.status, 'proposed');
});

test('duplicate relation returns existing regardless of member order', () => {
  const d = emptyData();
  const [a, b] = kanji(d, '聞', '間');
  const r1 = addRelation(d, { type: 'confuses', members: [a, b] });
  const r2 = addRelation(d, { type: 'confuses', members: [b, a] });
  assert.equal(r1, r2);
  assert.equal(d.relations.length, 1);
});

test('reject keeps relation, hidden by default', () => {
  const d = emptyData();
  const [a, b] = kanji(d, '土', '士');
  const r = addRelation(d, { type: 'looks-similar', members: [a, b], origin: { kind: 'suggested' } });
  setRelationStatus(d, r.id, 'rejected');
  assert.equal(d.relations.length, 1);
  assert.deepEqual(relationsOf(d, a), []);
  assert.equal(relationsOf(d, a, { includeRejected: true }).length, 1);
  deleteRelation(d, r.id);
  assert.equal(d.relations.length, 0);
});

test('deleteUnit cascades', () => {
  const d = emptyData();
  const [a, b, c] = kanji(d, '時', '持', '待');
  const pair = addRelation(d, { type: 'confuses', members: [a, b] });
  const group = addRelation(d, { type: 'looks-similar', members: [a, b, c] });
  const w = word(d, '寝る', 'ねる');
  const s = addUnit(d, 'sentence', { text: '昨日は早く寝ました。', uses: [{ wordId: w.split(':')[1], form: ['polite', 'past'] }] });
  const n = addUnit(d, 'note', { text: 'check', refs: [a, w] });
  d.ratings.push({ id: 'r1', target: { unit: a }, value: 'known' });
  d.ratings.push({ id: 'r2', target: { unit: makeRef('relation', pair.id) }, value: 'known' });

  deleteUnit(d, a);
  assert.deepEqual(d.relations.map((r) => r.id), [group.id]);
  assert.deepEqual(group.members, [b, c]);
  assert.deepEqual(d.ratings, []);
  assert.deepEqual(n.refs, [w]);

  deleteUnit(d, w);
  assert.deepEqual(s.uses, [{ text: '寝る', form: ['polite', 'past'] }]);
});

test('deleteReading clears kanjiUses readingId, keeps text', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '学' });
  const r = addReading(k, { kana: 'がく', type: 'on' });
  const w = addUnit(d, 'word', { writings: [{ text: '学校' }], reading: 'がっこう', kanjiUses: [{ char: '学', readingId: r.id, reading: 'がっ', base: 'がく' }] });
  deleteReading(d, makeRef('kanji', k.id), r.id);
  assert.deepEqual(w.kanjiUses[0], { char: '学', reading: 'がっ', base: 'がく' });
});

test('calculated: kanji in word, both directions', () => {
  const d = emptyData();
  const [hira] = kanji(d, '開');
  const aku = word(d, '開く', 'あく');
  const fromKanji = calculatedRelations(d, hira);
  assert.deepEqual(fromKanji.filter((r) => r.type === 'kanji-in-word').map((r) => r.refs), [[hira, aku]]);
  assert.equal(calculatedRelations(d, aku).filter((r) => r.type === 'kanji-in-word').length, 1);
});

test('calculated: same writing, same reading (katakana = hiragana)', () => {
  const d = emptyData();
  const aku = word(d, '開く', 'あく');
  const hiraku = word(d, '開く', 'ひらく');
  const hashi1 = word(d, '橋', 'はし');
  const hashi2 = word(d, '箸', 'ハシ');
  assert.deepEqual(calculatedRelations(d, aku).filter((r) => r.type === 'same-writing').map((r) => r.refs), [[aku, hiraku]]);
  assert.deepEqual(calculatedRelations(d, hashi1).filter((r) => r.type === 'same-reading').map((r) => r.refs), [[hashi1, hashi2]]);
});

test('calculated: shared gloss only for split meanings', () => {
  const d = emptyData();
  const a = word(d, '開く', 'あく', ['to open']);
  const b = word(d, '開ける', 'あける', ['open']);
  const w = addUnit(d, 'word', { reading: 'ひらく' });
  addMeaning(w, { gloss: 'open, unfold', unsplit: true });
  const shared = calculatedRelations(d, a).filter((r) => r.type === 'shared-gloss');
  assert.deepEqual(shared.map((r) => [r.refs, r.detail]), [[[a, b], 'open']]);
});

test('calculated: sentence uses word and grammar; reading used', () => {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '寝' });
  const r = addReading(k, { kana: 'ね', type: 'kun' });
  const w = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる', kanjiUses: [{ char: '寝', readingId: r.id, reading: 'ね' }] });
  const g = addUnit(d, 'grammar', { title: 'Past', formKey: 'past' });
  const s = addUnit(d, 'sentence', { text: '寝た。', uses: [{ wordId: w.id, form: ['past'] }], grammarIds: [g.id] });
  const sRef = makeRef('sentence', s.id);
  const inSentence = calculatedRelations(d, sRef).filter((x) => x.type === 'in-sentence').map((x) => x.refs[0]);
  assert.deepEqual(inSentence, [makeRef('word', w.id), makeRef('grammar', g.id)]);
  const used = calculatedRelations(d, makeRef('kanji', k.id)).filter((x) => x.type === 'reading-used');
  assert.deepEqual(used.map((x) => [x.refs[1], x.detail]), [[makeRef('word', w.id), 'ね']]);
});
