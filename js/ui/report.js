// What an import did not decide on its own: contradictions (my value kept), possible duplicates, things to check.
import { getUnit, makeRef, unitLabel } from '../model/data.js';
import { h, topBar, section, fill } from './dom.js';
import { refLink } from './describe.js';
import { backLink } from './nav.js';

const FIELD = { verbGroup: 'verb group', wordClass: 'word class', usuallyWritten: 'usually written', kanjiUses: 'kanji readings used', uses: 'words used', grammarIds: 'grammar used', refs: 'about' };

// Short readable text for a stored value (strings, lists of uses, writings, ids).
function valueText(data, v) {
  if (v === undefined || v === null) return '—';
  if (!Array.isArray(v)) return typeof v === 'object' ? JSON.stringify(v) : String(v);
  return v.map((x) => {
    if (typeof x === 'string') return getUnit(data, x) ? unitLabel(data, x) : x;
    if (x.wordId) return `${getUnit(data, makeRef('word', x.wordId)) ? unitLabel(data, makeRef('word', x.wordId)) : '?'}${x.form?.length ? ` (${x.form.join('+')})` : ''}`;
    return x.text ?? x.gloss ?? x.kana ?? x.char ?? JSON.stringify(x);
  }).join(', ') || '—';
}

export function render(root, ctx, { id }) {
  const rec = ctx.data.imports.find((i) => i.id === id);
  if (!rec) return ctx.go('#/settings', { replace: true });
  const r = rec.report ?? { conflicts: [], duplicates: [], checks: [] };
  const nothing = !r.conflicts.length && !r.duplicates.length && !r.checks.length;

  fill(root,
    topBar('Import report', backLink(ctx, '‹ Back', '#/settings'), null),
    h('div', { class: 'detail' },
      h('p', { class: 'muted' }, `${rec.file} · ${rec.at.slice(0, 10)}`),
      nothing && h('p', {}, 'Nothing to decide: everything fitted.'),
      r.conflicts.length > 0 && section(`Contradictions (${r.conflicts.length}) — yours was kept`,
        r.conflicts.map((c) => h('div', { class: 'report-item' },
          refLink(ctx.data, c.ref, { withKind: true }), h('span', { class: 'muted' }, ` ${FIELD[c.field] ?? c.field}`),
          h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'yours'), h('span', {}, valueText(ctx.data, c.mine))),
          h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'file'), h('span', {}, valueText(ctx.data, c.theirs)))))),
      r.duplicates.length > 0 && section(`Possible duplicates (${r.duplicates.length}) — added as new`,
        r.duplicates.map((d) => h('div', { class: 'report-item' },
          refLink(ctx.data, d.ref, { withKind: true }), h('span', { class: 'muted' }, ' might be '),
          h('span', { class: 'rel-members' }, d.candidates.map((c) => refLink(ctx.data, c, { withKind: true })))))),
      r.checks.length > 0 && section(`To check (${r.checks.length})`,
        r.checks.map((c) => h('div', { class: 'report-item' },
          h('span', { class: 'rel-members' }, c.refs.map((x) => refLink(ctx.data, x, { withKind: true }))),
          h('div', { class: 'muted small' }, c.reason)))),
    ));
}
