// Suggested relations (e.g. from the seed) waiting for confirm / reject.
import { UNKNOWN } from '../model/data.js';
import { setRelationStatus } from '../model/relations.js';
import { h, topBar, link, button, fill } from './dom.js';
import { RELATION_LABEL, refLink } from './describe.js';
import { backLink } from './nav.js';

export function render(root, ctx) {
  const proposed = ctx.data.relations.filter((r) => r.status === 'proposed');
  const decide = async (r, status) => {
    setRelationStatus(ctx.data, r.id, status);
    await ctx.save();
    ctx.go('#/review', { replace: true });
  };
  fill(root, 
    topBar('To check', backLink(ctx, '‹ Back', '#/k/note'), null),
    h('ul', { class: 'list' },
      proposed.length === 0 && h('li', { class: 'empty' }, 'Nothing to check.'),
      proposed.map((r) => h('li', { class: 'review-row' },
        h('div', {}, h('strong', {}, RELATION_LABEL[r.type]), r.origin?.detail && h('span', { class: 'muted' }, ` · ${r.origin.detail}`)),
        h('div', { class: 'rel-members' }, r.members.map((m) => (m === UNKNOWN ? h('span', { class: 'muted' }, '? unknown') : refLink(ctx.data, m, { withKind: true })))),
        r.notes && h('p', { class: 'muted small' }, r.notes),
        h('div', { class: 'inline' },
          button('Confirm', () => decide(r, 'confirmed'), 'small'),
          button('Reject', () => decide(r, 'rejected'), 'small danger'),
          link(`#/relation/${encodeURIComponent(r.id)}`, 'Details / edit', 'small-link'))))),
  );
}
