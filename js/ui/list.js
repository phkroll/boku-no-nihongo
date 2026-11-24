import { KINDS, search } from '../model.js';
import { h, clear, topBar, link, kindBadge, KIND_LABELS } from './dom.js';

// Kept across navigation so going back keeps the filter.
const filter = { query: '', kind: '', tagId: '' };

export function render(root, ctx) {
  const results = h('ul', { class: 'list' });

  const showResults = () => {
    clear(results);
    const entries = search(ctx.data, filter);
    if (entries.length === 0) {
      results.append(h('li', { class: 'empty' }, ctx.data.entries.length ? 'Nothing matches.' : 'No entries yet. Tap + to add one.'));
    }
    for (const e of entries) {
      results.append(
        h('li', {}, h('a', { href: `#/entry/${e.id}`, class: 'row' },
          h('span', { class: 'row-main' }, h('span', { class: 'jp', lang: 'ja' }, e.text), e.reading && h('span', { class: 'reading', lang: 'ja' }, e.reading)),
          h('span', { class: 'row-sub' }, kindBadge(e.kind), e.meaning),
        )),
      );
    }
  };

  const kindChips = h('div', { class: 'chips' });
  const showChips = () => {
    clear(kindChips);
    for (const kind of ['', ...KINDS]) {
      kindChips.append(
        h('button', {
          type: 'button',
          class: `chip${filter.kind === kind ? ' on' : ''}`,
          onclick: () => { filter.kind = kind; showChips(); showResults(); },
        }, kind ? KIND_LABELS[kind] : 'All'),
      );
    }
  };

  const tagSelect = h('select', { onchange: (ev) => { filter.tagId = ev.target.value; showResults(); } },
    h('option', { value: '' }, 'All tags'),
    [...ctx.data.tags].sort((a, b) => a.name.localeCompare(b.name)).map((t) => h('option', { value: t.id, selected: filter.tagId === t.id }, t.name)),
  );
  if (!ctx.data.tags.some((t) => t.id === filter.tagId)) filter.tagId = '';

  root.append(
    topBar('僕の日本語', link('#/settings', 'Settings'), link('#/new', '+', 'add')),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Search word, reading, meaning', value: filter.query, oninput: (ev) => { filter.query = ev.target.value; showResults(); } }),
      kindChips,
      ctx.data.tags.length > 0 && tagSelect,
    ),
    results,
  );
  showChips();
  showResults();
}
