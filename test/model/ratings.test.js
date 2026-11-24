import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../../js/model/data.js';
import { addRating, currentRatings, ratingHistory, targetKey } from '../../js/model/ratings.js';

const W = 'word:w1';
const at = (n) => `2026-01-0${n}T00:00:00.000Z`;

test('latest wins per target', () => {
  const d = emptyData();
  addRating(d, { unit: W, from: 'writing', to: 'reading' }, { value: 'unknown' }, { now: at(1) });
  addRating(d, { unit: W, to: 'reading', from: 'writing' }, { value: 'known', confidence: 'probably' }, { now: at(2) });
  const cur = currentRatings(d, W);
  assert.equal(cur.length, 1);
  assert.equal(cur[0].rating.value, 'known');
  assert.equal(cur[0].rating.confidence, 'probably');
  assert.equal(cur[0].rating.source, 'learner');
  assert.equal(ratingHistory(d, { unit: W, from: 'writing', to: 'reading' }).length, 2);
});

test('cleared means not assessed', () => {
  const d = emptyData();
  addRating(d, { unit: W }, { value: 'known' }, { now: at(1) });
  addRating(d, { unit: W }, { value: 'cleared' }, { now: at(2) });
  assert.deepEqual(currentRatings(d, W), []);
});

test('targetKey ignores key order and empty parts', () => {
  assert.equal(targetKey({ unit: W, to: 'reading', from: 'writing' }), targetKey({ from: 'writing', unit: W, to: 'reading', meaningId: undefined }));
});

test('imprecise target is separate from precise', () => {
  const d = emptyData();
  addRating(d, { unit: W, from: 'writing' }, { value: 'partly' }, { now: at(1) });
  addRating(d, { unit: W, from: 'writing', to: 'reading' }, { value: 'known' }, { now: at(2) });
  assert.equal(currentRatings(d, W).length, 2);
});

test('relation pair target keeps direction (member order)', () => {
  assert.notEqual(
    targetKey({ unit: 'relation:r1', members: ['kanji:a', 'kanji:b'] }),
    targetKey({ unit: 'relation:r1', members: ['kanji:b', 'kanji:a'] }),
  );
});

test('rejects unknown values and missing unit', () => {
  const d = emptyData();
  assert.throws(() => addRating(d, { unit: W }, { value: 'great' }), /value/);
  assert.throws(() => addRating(d, {}, { value: 'known' }), /unit/);
});
