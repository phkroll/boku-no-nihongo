import { getEntry, linksOf, deleteLink, deleteEntry } from '../model.js';
import { h, topBar, link, kindBadge } from './dom.js';

export function render(root, ctx, params) {
  const entry = getEntry(ctx.data, params.id);
  if (!entry) return ctx.go('#/', { replace: true });

  const tagNames = entry.tagIds
    .map((id) => ctx.data.tags.find((t) => t.id === id)?.name)
    .filter(Boolean);

  const unlink = async (linkId) => {
    deleteLink(ctx.data, linkId);
    await ctx.save();
    ctx.go(`#/entry/${entry.id}`, { replace: true });
  };

  const remove = async () => {
    if (!confirm(`Delete “${entry.text}” and its links?`)) return;
    deleteEntry(ctx.data, entry.id);
    await ctx.save();
    ctx.go('#/', { replace: true });
  };

  const section = (title, ...body) => h('section', { class: 'section' }, h('h2', {}, title), ...body);
  const links = linksOf(ctx.data, entry.id);

  root.append(
    topBar('', link('#/', '‹ All'), link(`#/entry/${entry.id}/edit`, 'Edit')),
    h('article', { class: 'detail' },
      h('div', { class: 'detail-head' },
        h('div', { class: 'detail-text', lang: 'ja' }, entry.text),
        entry.reading && h('div', { class: 'reading', lang: 'ja' }, entry.reading),
        h('div', { class: 'row-sub' }, kindBadge(entry.kind), entry.wordType),
      ),
      entry.meaning && section('Meaning', h('p', {}, entry.meaning)),
      entry.notes && section('Notes', h('p', { class: 'notes' }, entry.notes)),
      tagNames.length > 0 && section('Tags', h('div', { class: 'chips' }, tagNames.map((n) => h('span', { class: 'chip' }, n)))),
      section('Links',
        links.length === 0 && h('p', { class: 'muted' }, 'No links yet.'),
        h('ul', { class: 'list flush' }, links.map(({ link: l, other }) =>
          h('li', { class: 'link-row' },
            h('a', { href: `#/entry/${other.id}`, class: 'row' },
              h('span', { class: 'row-main' }, h('span', { class: 'jp', lang: 'ja' }, other.text), other.reading && h('span', { class: 'reading', lang: 'ja' }, other.reading)),
              h('span', { class: 'row-sub' }, kindBadge(other.kind), l.note || other.meaning),
            ),
            h('button', { type: 'button', class: 'unlink', 'aria-label': 'Remove link', onclick: () => unlink(l.id) }, '×'),
          ))),
        h('a', { href: `#/entry/${entry.id}/link`, class: 'button-link' }, 'Link…'),
      ),
      h('button', { type: 'button', class: 'danger wide', onclick: remove }, 'Delete entry'),
    ),
  );
}
