import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isSubmitEnter } from '../js/ui/dom.js';
import { guardedSave } from '../js/store.js';

function loadSw({ fetch, match }) {
  const ctx = {
    self: { addEventListener() {}, location: { origin: 'http://x' } },
    caches: { match: async (...a) => match(...a), open: async () => ({ put: async () => {} }) },
    fetch, setTimeout, clearTimeout, URL, Promise,
  };
  vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), ctx);
  return ctx;
}

test('sw falls back to cache when the network hangs', async () => {
  const sw = loadSw({ fetch: () => new Promise(() => {}), match: async () => 'cached' });
  assert.equal(await sw.respond('req', 20), 'cached');
});

test('sw always revalidates with the server instead of using the browser cache', async () => {
  const calls = [];
  const sw = loadSw({ fetch: (...args) => { calls.push(args); return Promise.resolve({ ok: true, clone() { return this; } }); }, match: async () => undefined });
  await sw.respond('req', 20);
  assert.equal(calls[0][1]?.cache, 'no-cache');
});

test('sw cache name matches the app version shown in Settings', async () => {
  const { APP_VERSION } = await import('../js/version.js');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(sw.match(/const CACHE = '([^']+)'/)[1], `bnn-${APP_VERSION}`);
});

test('sw waits for the network when nothing is cached', async () => {
  const sw = loadSw({ fetch: () => new Promise((r) => setTimeout(() => r({ ok: true, clone() { return this; }, v: 'net' }), 50)), match: async () => undefined });
  assert.equal((await sw.respond('req', 20)).v, 'net');
});

test('sw uses the cache when the network fails', async () => {
  const sw = loadSw({ fetch: () => Promise.reject(new Error('offline')), match: async () => 'cached' });
  const started = Date.now();
  assert.equal(await sw.respond('req', 1000), 'cached');
  assert.ok(Date.now() - started < 500, 'offline must not wait for the timeout');
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
