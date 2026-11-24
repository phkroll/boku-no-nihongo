import { test } from 'node:test';
import assert from 'node:assert/strict';

const SCREENS = ['list', 'form', 'detail', 'link-picker'];

test('every screen module exports render', async () => {
  for (const name of SCREENS) {
    const mod = await import(`../js/ui/${name}.js`);
    assert.equal(typeof mod.render, 'function', name);
  }
});
