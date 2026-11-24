// Create or edit a stored relation: type, members (2+ or 1 + unknown), optional direction, status, note.
import { RELATION_TYPES, RELATION_STATUS, UNKNOWN, makeRef, unitLabel } from '../model/data.js';
import { addRelation, updateRelation, deleteRelation } from '../model/relations.js';
import { h, clear, topBar, link, field, select, button, errorLine, chips, fill } from './dom.js';
import { RELATION_LABEL, hrefOf, refLink } from './describe.js';
import { picker } from './picker.js';
import { backLink } from './nav.js';

// What each type means, with an example — shown under the type.
const TYPE_HELP = {
  'looks-similar': 'Kanji or words that look alike, e.g. 聞 / 間, 土 / 士. A fact — not whether you mix them up.',
  'similar-meaning': 'Different words with a similar meaning but different use, e.g. 話す / 言う / 喋る. Note how they differ.',
  'transitivity-pair': 'A verb pair: something happens by itself vs. someone does it, e.g. 開く (opens) / 開ける (opens something). Direction: by itself → does it.',
  'politeness-variant': 'The same meaning at another politeness level, e.g. 食べる → 召し上がる.',
  related: 'Any other connection worth remembering; describe it in the note.',
  confuses: 'Personal: I mix these up. Tick “other member unknown” if you can’t remember with what.',
};

export function render(root, ctx, params) {
  const existing = params.id ? ctx.data.relations.find((r) => r.id === params.id) : undefined;
  if (params.id && !existing) return ctx.go('#/k/word', { replace: true });
  const draft = existing
    ? structuredClone(existing)
    : { type: 'related', members: params.with ? [params.with] : [], status: 'confirmed' };
  const back = existing ? hrefOf(existing.members.find((m) => m !== UNKNOWN) ?? 'word:') : params.with ? hrefOf(params.with) : '#/k/word';
  const error = errorLine();
  const body = h('div', { class: 'form' });

  const real = () => draft.members.filter((m) => m !== UNKNOWN);
  const fixed = existing ? undefined : params.with; // the entry this relation was started from

  function draw() {
    clear(body);
    const unknown = draft.members.includes(UNKNOWN);
    fill(body, 
      field('Type', select(RELATION_TYPES.map((t) => [t, RELATION_LABEL[t]]), draft.type, (v) => { draft.type = v; draw(); })),
      h('p', { class: 'muted small' }, TYPE_HELP[draft.type]),
      field('Members', h('div', { class: 'stack' },
        h('div', { class: 'chips' }, real().map((m) => h('span', { class: 'chip on' }, refLink(ctx.data, m, { withKind: true }),
          m === fixed ? h('small', {}, ' (this entry)') : [' ', button('×', () => { draft.members = draft.members.filter((x) => x !== m); draw(); }, 'small')]))),
        h('small', { class: 'muted' }, fixed ? 'Add the other member(s):' : 'Add members:'),
        picker(ctx, { exclude: draft.members, placeholder: 'Search word, kanji, grammar…', onPick: (ref) => { draft.members = [...draft.members, ref]; draw(); } }),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: unknown, onchange: (ev) => {
          draft.members = ev.target.checked ? [...real(), UNKNOWN] : real();
          draw();
        } }), 'Other member unknown (e.g. “I mix this up with something”)'))),
      real().length >= 2 && field('Direction (optional)', select(
        [['', 'both ways / not relevant'], ...real().flatMap((a) => real().filter((b) => b !== a).map((b) => [`${a}|${b}`, `${unitLabel(ctx.data, a)} → ${unitLabel(ctx.data, b)}`]))],
        draft.direction?.join('|'), (v) => { draft.direction = v ? v.split('|') : undefined; })),
      field('Status', chips(RELATION_STATUS.map((s) => [s, s === 'proposed' ? 'suspected / to check' : s]), (s) => draft.status === s, (s) => { draft.status = s; draw(); })),
      field('Note (e.g. how they differ)', h('textarea', { rows: 3, oninput: (ev) => { draft.notes = ev.target.value; } }, draft.notes ?? '')),
      existing && h('p', { class: 'muted small' }, `origin: ${existing.origin?.kind ?? '—'}${existing.origin?.detail ? ` (${existing.origin.detail})` : ''}`),
      error.el,
      button('Save', save, 'primary'),
      existing && link(`#/u/${encodeURIComponent(makeRef('relation', existing.id))}/rate`, 'What I know about this relation', 'button-link'),
      existing && button('Delete relation', remove, 'danger wide'),
    );
  }

  async function save() {
    error.clear();
    try {
      const fields = { type: draft.type, members: draft.members, direction: draft.direction, status: draft.status, notes: draft.notes?.trim() || undefined };
      if (existing) updateRelation(ctx.data, existing.id, fields);
      else addRelation(ctx.data, fields);
      await ctx.save();
      ctx.back(back);
    } catch (e) {
      error.show(e);
    }
  }

  async function remove() {
    if (!confirm('Delete this relation and its ratings?')) return;
    deleteRelation(ctx.data, existing.id);
    await ctx.save();
    ctx.go(back, { replace: true });
  }

  fill(root, topBar(existing ? 'Relation' : 'New relation', backLink(ctx, 'Cancel', back), null), body);
  draw();
}
