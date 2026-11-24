import { loadData, saveData, requestPersist } from './store.js';
import { clear } from './ui/dom.js';
import * as list from './ui/list.js';
import * as form from './ui/form.js';
import * as detail from './ui/detail.js';
import * as linkPicker from './ui/link-picker.js';

const ROUTES = [
  [/^#\/new$/, form, () => ({})],
  [/^#\/entry\/([^/]+)\/edit$/, form, (m) => ({ id: m[1] })],
  [/^#\/entry\/([^/]+)\/link$/, linkPicker, (m) => ({ id: m[1] })],
  [/^#\/entry\/([^/]+)$/, detail, (m) => ({ id: m[1] })],
];

const root = document.getElementById('app');

const ctx = {
  data: null,
  save: () => saveData(ctx.data),
  go(hash, { replace = false } = {}) {
    if (replace) {
      history.replaceState(null, '', hash);
      show();
    } else {
      location.hash = hash;
    }
  },
};

function show() {
  const hash = location.hash || '#/';
  for (const [pattern, screen, params] of ROUTES) {
    const m = hash.match(pattern);
    if (m) return draw(screen, params(m));
  }
  draw(list, {});
}

function draw(screen, params) {
  clear(root);
  screen.render(root, ctx, params);
  window.scrollTo(0, 0);
}

async function start() {
  requestPersist();
  ctx.data = await loadData();
  window.addEventListener('hashchange', show);
  show();
}

start().catch((e) => {
  root.textContent = `Could not open the notebook: ${e.message}`;
});
