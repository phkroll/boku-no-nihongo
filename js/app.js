import { loadData, saveData, requestPersist, guardedSave } from './store.js';
import { h, clear, fill } from './ui/dom.js';
import { KIND_UI, TABS } from './ui/kinds.js';
import * as list from './ui/list.js';
import * as detail from './ui/detail.js';
import * as edit from './ui/edit.js';
import * as relation from './ui/relation.js';
import * as rate from './ui/rate.js';
import * as review from './ui/review.js';
import * as settings from './ui/settings.js';
import { createNav } from './ui/nav.js';

const ROUTES = [
  [/^#\/settings$/, settings, () => ({})],
  [/^#\/review$/, review, () => ({ tab: 'note' })],
  [/^#\/k\/(\w+)\/new$/, edit, (m, q) => ({ kind: m[1], tab: m[1], about: q.get('about') })],
  [/^#\/k\/(\w+)$/, list, (m) => ({ kind: m[1], tab: m[1] })],
  [/^#\/u\/([^/]+)\/edit$/, edit, (m) => ({ ref: decodeURIComponent(m[1]) })],
  [/^#\/u\/([^/]+)\/rate$/, rate, (m, q) => ({ ref: decodeURIComponent(m[1]), q: q.get('q') })],
  [/^#\/u\/([^/]+)$/, detail, (m) => ({ ref: decodeURIComponent(m[1]) })],
  [/^#\/relation\/new$/, relation, (m, q) => ({ with: q.get('with') })],
  [/^#\/relation\/([^/]+)$/, relation, (m) => ({ id: decodeURIComponent(m[1]) })],
];

const root = document.getElementById('app');

const ctx = {
  data: null,
  nav: createNav(location.hash || '#/k/word'),
  save: guardedSave(() => saveData(ctx.data), (message) => alert(message)),
  go(hash, { replace = false } = {}) {
    if (replace || location.hash === hash) {
      history.replaceState(null, '', hash);
      ctx.nav.replace(hash);
      show();
    } else {
      location.hash = hash;
    }
  },
  // One step back after saving or cancelling; fallback when this is the first page.
  back(fallback) {
    if (ctx.nav.previous()) history.back();
    else ctx.go(fallback, { replace: true });
  },
};

function show() {
  const [path, query = ''] = (location.hash || '#/k/word').split('?');
  const q = new URLSearchParams(query);
  for (const [pattern, screen, params] of ROUTES) {
    const m = path.match(pattern);
    if (m) return draw(screen, params(m, q));
  }
  draw(list, { kind: 'word', tab: 'word' });
}

function tabBar(active) {
  return h('nav', { class: 'tabs' }, TABS.map((kind) => h('a', { href: `#/k/${kind}`, class: kind === active ? 'on' : '' }, KIND_UI[kind].plural)));
}

function draw(screen, params) {
  clear(root);
  const page = h('div', { class: 'page' });
  fill(root, page);
  try {
    screen.render(page, ctx, params);
  } catch (e) {
    fill(page, h('p', { class: 'error' }, `Something went wrong: ${e.message}`));
  }
  const tab = params.tab ?? (params.ref ? params.ref.split(':')[0] : undefined);
  fill(root, tabBar(tab));
  window.scrollTo(0, 0);
}

async function start() {
  navigator.serviceWorker?.register('sw.js');
  requestPersist();
  ctx.data = await loadData();
  window.addEventListener('hashchange', () => {
    ctx.nav.visit(location.hash);
    show();
  });
  show();
}

start().catch((e) => {
  root.textContent = `Could not open the notebook: ${e.message}`;
});
