import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isSubmitEnter } from '../js/ui/dom.js';
import { guardedSave } from '../js/store.js';

function loadSw({ fetch, match, opened = [] }) {
  const ctx = {
    self: { addEventListener() {}, location: { origin: 'http://x' }, skipWaiting() {} },
    caches: {
      match: async (...a) => match(...a),
      open: async (name) => { const c = { name, added: [], put: async () => {}, addAll: async (reqs) => { c.added.push(...reqs); } }; opened.push(c); return c; },
    },
    Request: class { constructor(url, init) { this.url = url; this.cache = init?.cache; } },
    fetch, setTimeout, clearTimeout, URL, Promise,
  };
  vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), ctx);
  return ctx;
}

test('sw serves the offline copy without waiting for the network', async () => {
  let fetched = 0;
  const sw = loadSw({ fetch: () => { fetched += 1; return new Promise(() => {}); }, match: async () => 'cached' });
  assert.equal(await sw.respond('req'), 'cached');
  assert.equal(fetched, 0);
});

test('sw goes to the network only for files it does not have', async () => {
  const sw = loadSw({ fetch: async () => 'net', match: async () => undefined });
  assert.equal(await sw.respond('req'), 'net');
});

test('sw downloads a new version bypassing the browser cache, all files at once', async () => {
  const opened = [];
  const sw = loadSw({ fetch: async () => 'net', match: async () => undefined, opened });
  await sw.precache();
  const listed = readFileSync(new URL('../sw.js', import.meta.url), 'utf8').match(/const FILES = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g);
  assert.equal(opened[0].added.length, listed.length);
  assert.ok(opened[0].added.every((r) => r.cache === 'reload'));
});

test('sw build stamp matches the app files (run npm run stamp after changing files)', async () => {
  const { stampOf } = await import('../scripts/stamp.mjs');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(sw.match(/const BUILD = '([^']+)'/)[1], stampOf());
});

test('Settings shows the same build as the service worker', async () => {
  const { BUILD } = await import('../js/version.js');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(sw.match(/const BUILD = '([^']+)'/)[1], BUILD);
});

test('Enter that confirms a Japanese conversion is not a submit', () => {
  assert.equal(isSubmitEnter({ key: 'Enter', isComposing: false, keyCode: 13 }), true);
  assert.equal(isSubmitEnter({ key: 'Enter', isComposing: true, keyCode: 13 }), false);
  assert.equal(isSubmitEnter({ key: 'Enter', isComposing: false, keyCode: 229 }), false);
  assert.equal(isSubmitEnter({ key: 'a', isComposing: false, keyCode: 65 }), false);
});

test('guardedSave tells the user and rethrows when saving fails', async () => {
  const messages = [];
  const save = guardedSave(async () => { throw new Error('QuotaExceededError'); }, (m) => messages.push(m));
  await assert.rejects(save(), /Quota/);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /not saved/i);
});
