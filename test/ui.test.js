import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function filesUnder(dir, ext) {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith(ext))
    .map((f) => relative(ROOT, join(f.parentPath, f.name)));
}

const SCREENS = ['list', 'detail', 'edit', 'settings', 'relation', 'rate', 'review'];

test('every screen module exports render', async () => {
  for (const name of SCREENS) {
    const mod = await import(`../js/ui/${name}.js`);
    assert.equal(typeof mod.render, 'function', name);
  }
});

test('kinds describe all five unit kinds', async () => {
  const { KIND_UI } = await import('../js/ui/kinds.js');
  for (const kind of ['word', 'kanji', 'grammar', 'sentence', 'note']) {
    const k = KIND_UI[kind];
    assert.ok(k.label && k.plural && typeof k.title === 'function' && Array.isArray(k.fields), kind);
  }
});

test('picker module exports picker', async () => {
  const mod = await import('../js/ui/picker.js');
  assert.equal(typeof mod.picker, 'function');
});

test('sw precaches every app file', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const listed = JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  const expected = ['./', 'index.html', 'app.css', 'manifest.webmanifest', ...filesUnder('js', '.js'), ...filesUnder('icons', '.png')];
  assert.deepEqual([...listed].sort(), expected.sort());
});

test('no HTML injection sinks', () => {
  for (const file of filesUnder('js', '.js')) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/, file);
  }
});
