import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, makeRef } from '../../js/model/data.js';
import { addUnit, addMeaning, addReading } from '../../js/model/units.js';
import { addRelation } from '../../js/model/relations.js';
import { addRating, targetKey } from '../../js/model/ratings.js';
import { questionsFor, detailRatings, overallRating, findQuestion } from '../../js/ui/questions.js';

function data() {
  const d = emptyData();
  const k = addUnit(d, 'kanji', { char: '聞' });
  addReading(k, { kana: 'き', type: 'kun' });
  addReading(k, { kana: 'ぶん', type: 'on' });
  addMeaning(k, { gloss: 'hear' });
  addMeaning(k, { gloss: 'ask' });
  const k2 = addUnit(d, 'kanji', { char: '間' });
  const w = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる' });
  addMeaning(w, { gloss: 'to sleep' });
  const beer = addUnit(d, 'word', { reading: 'ビール', writings: 'n/a' });
  const rel = addRelation(d, { type: 'confuses', members: [makeRef('kanji', k.id), makeRef('kanji', k2.id)] });
  return { d, kRef: makeRef('kanji', k.id), k2Ref: makeRef('kanji', k2.id), wRef: makeRef('word', w.id), beerRef: makeRef('word', beer.id), rel };
}
const keys = (qs) => qs.map((q) => q.key);

test('word with writing gets read / understand / say / write / class / recognise / form', () => {
  const { d, wRef } = data();
  assert.deepEqual(keys(questionsFor(d, wRef)), ['read', 'understand-written', 'understand-heard', 'say', 'write', 'class', 'recognise', 'form']);
});

test('kana-only word gets no writing questions', () => {
  const { d, beerRef } = data();
  assert.deepEqual(keys(questionsFor(d, beerRef)), ['understand-heard', 'say', 'class', 'form']);
});

test('kanji: meaning and readings, each one on its own, recognise, tell apart', () => {
  const { d, kRef, k2Ref, rel } = data();
  const qs = questionsFor(d, kRef);
  assert.deepEqual(keys(qs).slice(0, 3), ['meaning', 'readings', 'recognise-from-meaning']);
  assert.equal(qs.filter((q) => q.target.meaningId).length, 2);
  assert.equal(qs.filter((q) => q.target.readingId).length, 2);
  const apart = qs.find((q) => q.key.startsWith('apart:'));
  assert.deepEqual(apart.target, { unit: makeRef('relation', rel.id), members: [kRef, k2Ref] });
  assert.match(apart.label, /間/);
});

test('never offers a question from a part to the same part', () => {
  const { d, kRef, wRef } = data();
  for (const q of [...questionsFor(d, kRef), ...questionsFor(d, wRef)]) assert.ok(!q.target.from || q.target.from !== q.target.to, q.key);
});

test('seed-shaped ratings land on questions; overall is separate', () => {
  const { d, kRef, wRef } = data();
  addRating(d, { unit: kRef }, { value: 'known', source: 'estimate', confidence: 'probably' });
  addRating(d, { unit: kRef, to: 'meaning' }, { value: 'known' });
  addRating(d, { unit: wRef, from: 'reading', to: 'meaning' }, { value: 'known' });
  addRating(d, { unit: wRef, from: 'writing' }, { value: 'partly' });
  assert.equal(overallRating(d, kRef).value, 'known');
  assert.deepEqual(detailRatings(d, kRef).map((r) => r.question?.key), ['meaning']);
  assert.deepEqual(detailRatings(d, wRef).map((r) => r.question?.key).sort(), ['recognise', 'understand-heard']);
});

test('tell-apart rating shows on both kanji', () => {
  const { d, kRef, k2Ref, rel } = data();
  addRating(d, { unit: makeRef('relation', rel.id), members: [kRef, k2Ref] }, { value: 'unknown' });
  assert.equal(detailRatings(d, kRef).length, 1);
  assert.equal(detailRatings(d, k2Ref).length, 1);
});

test('findQuestion resolves a key, also for a rating that matches no question', () => {
  const { d, wRef } = data();
  assert.equal(findQuestion(d, wRef, 'read').target.from, 'writing');
  const odd = { unit: wRef, from: 'class', to: 'form' };
  addRating(d, odd, { value: 'known' });
  assert.deepEqual(findQuestion(d, wRef, `t:${targetKey(odd)}`).target, odd);
});
