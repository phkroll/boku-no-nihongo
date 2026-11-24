import { search } from '../model/search.js';
import { KIND_UI } from './kinds.js';
import { h, clear, topBar, link, jp, badge } from './dom.js';
import { hrefOf } from './describe.js';
import { COLLECTION, makeRef } from '../model/data.js';

const PAGE = 100;
const BACKUP_DAYS = 14;
const filters = {}; // per kind, kept while navigating

function backupReminder(data) {
  const last = data.meta?.lastExport;
  const days = last ? Math.floor((Date.now() - Date.parse(last)) / 86400000) : null;
  if (days !== null && days < BACKUP_DAYS) return null;
  return h('a', { href: '#/settings', class: 'reminder' }, days === null ? 'No backup yet — export one in Settings' : `Last backup ${days} days ago — export in Settings`);
}

export function render(root, ctx, { kind }) {
  const ui = KIND_UI[kind];
  if (!ui) return ctx.go('#/k/word', { replace: true });
  const f = (filters[kind] ??= { query: '', tagId: '', openOnly: kind === 'note' });
  const results = h('ul', { class: 'list' });
  let shown = PAGE;

  const draw = () => {
    clear(results);
    const units = search(ctx.data, kind, f);
    if (units.length === 0) results.append(h('li', { class: 'empty' }, ctx.data[COLLECTION[kind]].length ? 'Nothing matches.' : `No ${ui.plural.toLowerCase()} yet. Tap + to add one.`));
    for (const u of units.slice(0, shown)) {
      results.append(h('li', {}, h('a', { href: hrefOf(makeRef(kind, u.id)), class: 'row' },
        h('span', { class: 'row-main' }, jp(ui.title(u), kind === 'kanji' ? 'big' : '')),
        h('span', { class: 'row-sub' }, kind === 'note' && u.open && badge('open', 'open'), ui.sub(u)))));
    }
    if (units.length > shown) results.append(h('li', {}, h('button', { type: 'button', class: 'plain more', onclick: () => { shown += PAGE; draw(); } }, `Show more (${units.length - shown})`)));
  };

  const tags = [...ctx.data.tags].sort((a, b) => a.name.localeCompare(b.name));
  if (!tags.some((t) => t.id === f.tagId)) f.tagId = '';
  const proposed = ctx.data.relations.filter((r) => r.status === 'proposed').length;

  root.append(
    topBar(ui.plural, link('#/settings', 'Settings'), link(`#/k/${kind}/new`, '+', 'add')),
    backupReminder(ctx.data),
    kind === 'note' && proposed > 0 && h('a', { href: '#/review', class: 'reminder' }, `${proposed} suggested relations to check`),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: `Search ${ui.plural.toLowerCase()}`, value: f.query, oninput: (ev) => { f.query = ev.target.value; shown = PAGE; draw(); } }),
      tags.length > 0 && h('select', { onchange: (ev) => { f.tagId = ev.target.value; draw(); } },
        h('option', { value: '' }, 'All tags'), tags.map((t) => h('option', { value: t.id, selected: f.tagId === t.id }, t.name))),
      kind === 'note' && h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.openOnly, onchange: (ev) => { f.openOnly = ev.target.checked; draw(); } }), 'Only open'),
    ),
    results,
  );
  draw();
}
