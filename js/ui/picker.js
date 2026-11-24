// Inline search over units; calls onPick(ref).
import { KINDS, makeRef } from '../model/data.js';
import { search } from '../model/search.js';
import { KIND_UI } from './kinds.js';
import { h, clear, jp, badge } from './dom.js';

const LIMIT = 30;

export function picker(ctx, { kinds = KINDS, exclude = [], onPick, placeholder = 'Search to add…' }) {
  const results = h('ul', { class: 'list picker-results' });
  const draw = (query) => {
    clear(results);
    if (!query.trim()) return;
    const hits = kinds
      .flatMap((kind) => search(ctx.data, kind, { query }).map((unit) => ({ kind, unit, ref: makeRef(kind, unit.id) })))
      .filter((x) => !exclude.includes(x.ref))
      .slice(0, LIMIT);
    if (hits.length === 0) results.append(h('li', { class: 'empty' }, 'Nothing found.'));
    for (const { kind, unit, ref } of hits) {
      results.append(h('li', {}, h('button', { type: 'button', class: 'row plain', onclick: () => onPick(ref) },
        h('span', { class: 'row-main' }, jp(KIND_UI[kind].title(unit))),
        h('span', { class: 'row-sub' }, badge(KIND_UI[kind].label, `kind-${kind}`), KIND_UI[kind].sub(unit)))));
    }
  };
  return h('div', { class: 'picker' },
    h('input', { type: 'search', placeholder, autocomplete: 'off', oninput: (ev) => draw(ev.target.value) }),
    results);
}
