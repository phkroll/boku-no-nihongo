import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOKS = fileURLToPath(new URL('../../.githooks', import.meta.url));

// A throwaway repo with the hook active and a bare "remote" to push to.
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'prepush-'));
  const repo = join(dir, 'repo');
  const remote = join(dir, 'remote.git');
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  execFileSync('git', ['init', '-q', '--bare', remote]);
  mkdirSync(repo);
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test Author');
  git('config', 'user.email', 'author@example.org');
  git('config', 'core.hooksPath', HOOKS);
  git('remote', 'add', 'origin', remote);
  writeFileSync(join(repo, '.git', 'info', 'publish-blocklist'), '# words that must not be published\nAcme Corp\n');
  const commit = (file, content, message = 'change') => {
    mkdirSync(join(repo, file, '..'), { recursive: true });
    writeFileSync(join(repo, file), content);
    git('add', '-f', file);
    git('commit', '-q', '-m', message);
  };
  const push = () => spawnSync('git', ['push', '-q', 'origin', 'main'], { cwd: repo, encoding: 'utf8' });
  return { dir, commit, push, git };
}

test('clean push passes', () => {
  const t = setup();
  t.commit('a.txt', 'hello\n', 'first\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
  const r = t.push();
  assert.equal(r.status, 0, r.stderr);
  rmSync(t.dir, { recursive: true });
});

test('blocks a machine path, also in older commits of a first push', () => {
  const t = setup();
  t.commit('a.txt', `see ${['', 'Users', 'someone', 'notes'].join('/')}\n`); // built at runtime so this file passes the hook
  t.commit('a.txt', 'clean again\n');
  const r = t.push();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /machine path/);
  rmSync(t.dir, { recursive: true });
});

test('blocks files from out/, backups and env files', () => {
  for (const file of ['out/seed.json', 'history.bundle', '.env']) {
    const t = setup();
    t.commit(file, 'x\n');
    const r = t.push();
    assert.notEqual(r.status, 0, file);
    assert.match(r.stderr, /file must not be published/, file);
    rmSync(t.dir, { recursive: true });
  }
});

test('blocks other email addresses', () => {
  const t = setup();
  t.commit('a.txt', `contact: ${['someone.else', 'private-mail.ch'].join('@')}\n`);
  const r = t.push();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /email/);
  rmSync(t.dir, { recursive: true });
});

test('blocks words from the local blocklist, in content and messages', () => {
  const t = setup();
  t.commit('a.txt', 'built for acme corp\n');
  assert.match(t.push().stderr, /blocked word/);
  rmSync(t.dir, { recursive: true });
  const u = setup();
  u.commit('b.txt', 'fine\n', 'Thanks Acme Corp');
  assert.match(u.push().stderr, /blocked word/);
  rmSync(u.dir, { recursive: true });
});

test('only new commits are checked on later pushes', () => {
  const t = setup();
  t.commit('a.txt', 'fine\n');
  assert.equal(t.push().status, 0);
  t.commit('a.txt', 'still fine\n');
  assert.equal(t.push().status, 0);
  rmSync(t.dir, { recursive: true });
});

test('an @file include line is not an email address', () => {
  const t = setup();
  t.commit('CLAUDE.md', '@AGENTS.md\n');
  const r = t.push();
  assert.equal(r.status, 0, r.stderr);
  rmSync(t.dir, { recursive: true });
});
