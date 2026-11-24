// Writes the offline file list and a build stamp (hash of all app files) into sw.js and js/version.js.
// Any change to an app file changes the stamp, so phones always pick up the new version.
// Usage: node scripts/stamp.mjs        (update)   ·   node scripts/stamp.mjs --check   (fail if stale)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STAMPED = ['sw.js', 'js/version.js']; // carry the stamp, so not part of it

function under(dir, ext) {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith(ext))
    .map((f) => relative(ROOT, join(f.parentPath, f.name)))
    .sort();
}

export function appFiles() {
  return ['index.html', 'app.css', 'manifest.webmanifest', ...under('js', '.js'), ...under('icons', '.png')];
}

export function stampOf() {
  const hash = createHash('sha256');
  for (const f of appFiles().filter((x) => !STAMPED.includes(x))) hash.update(`${f}\n`).update(readFileSync(join(ROOT, f)));
  return hash.digest('hex').slice(0, 12);
}

function stampedSw(sw, build) {
  return sw
    .replace(/const BUILD = '[^']*';/, `const BUILD = '${build}';`)
    .replace(/const FILES = \[[\s\S]*?\];/, `const FILES = [\n  './',\n${appFiles().map((f) => `  '${f}',\n`).join('')}];`);
}

function main() {
  const build = stampOf();
  const swPath = join(ROOT, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const next = stampedSw(sw, build);
  const version = readFileSync(join(ROOT, 'js/version.js'), 'utf8');
  if (process.argv.includes('--check')) {
    if (next !== sw || !version.includes(`'${build}'`)) {
      console.error('App files changed since the last stamp: run `npm run stamp` and commit.');
      process.exit(1);
    }
    return;
  }
  writeFileSync(swPath, next);
  writeFileSync(join(ROOT, 'js/version.js'),
    `// Written by scripts/stamp.mjs — shown in Settings, same build as sw.js.\nexport const BUILD = '${build}';\nexport const BUILT = '${new Date().toISOString().slice(0, 10)}';\n`);
  console.log(`build ${build}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
