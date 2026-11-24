import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNav } from '../../js/ui/nav.js';

test('visiting pages builds a trail; going back pops it', () => {
  const nav = createNav('#/k/kanji');
  nav.visit('#/u/kanji:k1');
  nav.visit('#/u/word:w1');
  assert.equal(nav.previous(), '#/u/kanji:k1');
  nav.visit('#/u/kanji:k1'); // browser back lands on the previous page
  assert.equal(nav.previous(), '#/k/kanji');
});

test('replace swaps the current page without growing the trail', () => {
  const nav = createNav('#/k/word');
  nav.visit('#/k/word/new');
  nav.replace('#/u/word:w1');
  assert.equal(nav.previous(), '#/k/word');
});

test('nothing to go back to on the first page', () => {
  assert.equal(createNav('#/settings').previous(), undefined);
});

test('lastList remembers the list tab you came from', () => {
  const nav = createNav('#/k/kanji');
  nav.visit('#/settings');
  assert.equal(nav.lastList(), '#/k/kanji');
});
