// Suggested relations (e.g. from the seed) waiting for confirm / reject.
import { UNKNOWN } from '../model/data.js';
import { setRelationStatus } from '../model/relations.js';
import { h, topBar, link, button } from './dom.js';
import { RELATION_LABEL, refLink } from './describe.js';

export function render(root, ctx) {
  const proposed = ctx.data.relations.filter((r) => r.status === 'proposed');
  const decide = async (r, status) => {
    setRelationStatus(ctx.data, r.id, status);
    await ctx.save();
    ctx.go('#/review', { replace: true });
  };
  root.append(
    topBar('To check', link('#/k/note', '‹ Notes'), null),
    h('ul', { class: 'list' },
      proposed.length === 0 && h('li', { class: 'empty' }, 'Nothing to check.'),
      proposed.map((r) => h('li', { class: 'review-row' },
        h('div', {}, h('a', { href: `#/relation/${encodeURIComponent(r.id)}` }, RELATION_LABEL[r.type]), ' ',
          r.members.map((m) => (m === UNKNOWN ? '?' : refLink(ctx.data, m)))),
        h('div', { class: 'inline' }, button('Confirm', () => decide(r, 'confirmed'), 'small'), button('Reject', () => decide(r, 'rejected'), 'small danger'))))),
  );
}
