import { getEntry, linksOf, search, addLink } from '../model.js';
import { h, clear, topBar, link, kindBadge } from './dom.js';

export function render(root, ctx, params) {
  const entry = getEntry(ctx.data, params.id);
  if (!entry) return ctx.go('#/', { replace: true });

  const linked = new Set(linksOf(ctx.data, entry.id).map(({ other }) => other.id));
  const back = `#/entry/${entry.id}`;
  let query = '';

  const note = h('input', { placeholder: 'Note (optional), e.g. “uses this kanji”', autocomplete: 'off' });
  const results = h('ul', { class: 'list' });

  const choose = async (otherId) => {
    addLink(ctx.data, entry.id, otherId, note.value);
    await ctx.save();
    ctx.go(back, { replace: true });
  };

  const showResults = () => {
    clear(results);
    const candidates = search(ctx.data, { query }).filter((e) => e.id !== entry.id && !linked.has(e.id));
    if (candidates.length === 0) results.append(h('li', { class: 'empty' }, 'Nothing to link.'));
    for (const e of candidates) {
      results.append(h('li', {}, h('button', { type: 'button', class: 'row plain', onclick: () => choose(e.id) },
        h('span', { class: 'row-main' }, h('span', { class: 'jp', lang: 'ja' }, e.text), e.reading && h('span', { class: 'reading', lang: 'ja' }, e.reading)),
        h('span', { class: 'row-sub' }, kindBadge(e.kind), e.meaning),
      )));
    }
  };

  root.append(
    topBar(h('span', { lang: 'ja' }, `Link ${entry.text}`), link(back, 'Cancel'), null),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Search entry to link', oninput: (ev) => { query = ev.target.value; showResults(); } }),
      note,
    ),
    results,
  );
  showResults();
}
