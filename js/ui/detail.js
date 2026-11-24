import { UNKNOWN, getUnit, makeRef, parseRef, visibleMeanings } from '../model/data.js';
import { deleteUnit, splitMeaning } from '../model/units.js';
import { relationsOf } from '../model/relations.js';
import { calculatedRelations } from '../model/calculated.js';
import { currentRatings } from '../model/ratings.js';
import { KIND_UI, STATE_LABEL } from './kinds.js';
import { h, topBar, link, section, jp, badge, button, errorLine } from './dom.js';
import { RELATION_LABEL, describeTarget, ratingText, refLink, formText } from './describe.js';

const state = (v) => STATE_LABEL[v] ?? v;
const row = (label, value) => value !== undefined && value !== '' && h('div', { class: 'kv' }, h('span', { class: 'muted' }, label), h('span', {}, value));

function meaningsSection(ctx, ref, unit, error) {
  const split = async (m) => {
    const answer = prompt('Split into separate meanings (comma-separated):', m.gloss);
    if (answer === null) return;
    try {
      splitMeaning(unit, m.id, answer.split(/[,;、]/));
      await ctx.save();
      ctx.go(`#/u/${encodeURIComponent(ref)}`, { replace: true });
    } catch (e) {
      error.show(e);
    }
  };
  const meanings = visibleMeanings(unit);
  if (!meanings.length) return section('Meanings', h('p', { class: 'muted' }, 'No meaning yet.'));
  return section('Meanings', h('ol', { class: 'meanings' }, meanings.map((m) => h('li', {},
    m.gloss, m.usage && h('span', { class: 'muted' }, ` — ${m.usage}`),
    m.unsplit && h('span', {}, ' ', badge('unsplit', 'warn'), ' ', button('Split…', () => split(m), 'small'))))));
}

function kanjiParts(data, unit) {
  const byType = {};
  for (const r of unit.readings ?? []) (byType[r.type] ??= []).push(r.kana);
  const types = ['kun', 'on', 'name', UNKNOWN].filter((t) => byType[t]);
  return section('Readings', types.length
    ? types.map((t) => row(t === UNKNOWN ? 'type unknown' : t, jp(byType[t].join('・'))))
    : h('p', { class: 'muted' }, 'No reading yet.'));
}

function wordParts(data, unit) {
  const writings = Array.isArray(unit.writings) ? unit.writings.map((w) => w.text).join('・') : state(unit.writings);
  return [
    section('Word',
      row('writing', writings && jp(writings)),
      row('reading', unit.reading && jp(unit.reading)),
      row('class', unit.wordClass && state(unit.wordClass) + (unit.suru ? ' (する)' : '')),
      row('verb group', unit.verbGroup && state(unit.verbGroup)),
      row('usually written', unit.usuallyWritten),
      unit.wholeWordReading && row('reading', 'belongs to the whole word')),
    unit.kanjiUses?.length > 0 && section('Kanji readings used', unit.kanjiUses.map((u) => {
      const k = data.kanji.find((x) => x.char === u.char);
      return row(k ? refLink(data, makeRef('kanji', k.id)) : jp(u.char), [u.reading && jp(u.reading), u.base && h('span', { class: 'muted' }, ` (from ${u.base})`)]);
    })),
    unit.forms?.length > 0 && section('Example forms', unit.forms.map((f) => row(formText(f.form), jp(`${f.writing ?? ''} ${f.reading ? `（${f.reading}）` : ''}`)))),
  ];
}

const PARTS = {
  kanji: (data, u) => [kanjiParts(data, u)],
  word: wordParts,
  grammar: (data, u) => [section('Grammar', row('pattern', u.pattern && jp(u.pattern)), row('meaning', u.meaning), row('applies to', u.appliesTo), u.formKey && row('form key', u.formKey), u.explanation && h('p', { class: 'pre' }, u.explanation))],
  sentence: (data, u) => [section('Sentence', row('reading', u.reading && jp(u.reading)), row('translation', u.translation)),
    u.uses?.length > 0 && section('Words used', u.uses.map((use) => row(use.wordId ? refLink(data, makeRef('word', use.wordId)) : jp(use.text ?? '?'), use.form?.length ? formText(use.form) : '')))],
  note: (data, u) => [u.refs?.length > 0 && section('About', h('div', { class: 'chips' }, u.refs.map((r) => refLink(data, r))))],
};

function relationsSection(ctx, ref) {
  const stored = relationsOf(ctx.data, ref);
  const calculated = calculatedRelations(ctx.data, ref);
  const others = (members) => members.filter((m) => m !== ref);
  return section('Relations',
    stored.map((r) => h('div', { class: 'rel' },
      h('a', { href: `#/relation/${encodeURIComponent(r.id)}`, class: 'rel-type' }, RELATION_LABEL[r.type] ?? r.type),
      r.status !== 'confirmed' && badge(r.status === 'proposed' && r.type === 'confuses' ? 'suspected' : r.status, 'warn'),
      r.origin?.kind === 'suggested' && badge('suggested', 'muted-badge'),
      r.direction && h('span', { class: 'muted' }, r.direction[0] === ref ? ' →' : ' ←'),
      h('span', { class: 'rel-members' }, others(r.members).map((m) => refLink(ctx.data, m))))),
    calculated.map((c) => h('div', { class: 'rel calc' },
      h('span', { class: 'rel-type' }, RELATION_LABEL[c.type] ?? c.type), badge('auto', 'muted-badge'),
      h('span', { class: 'rel-members' }, others(c.refs).map((m) => refLink(ctx.data, m)), c.detail && h('span', { class: 'muted' }, ` ${c.detail}`)))),
    !stored.length && !calculated.length && h('p', { class: 'muted' }, 'No relations yet.'),
    link(`#/relation/new?with=${encodeURIComponent(ref)}`, '+ Add relation', 'button-link'));
}

function ratingsSection(ctx, ref) {
  const current = currentRatings(ctx.data, ref);
  return section('What I know',
    current.length === 0 && h('p', { class: 'muted' }, 'Not assessed yet.'),
    current.map(({ target, rating }) => h('div', { class: 'kv' },
      h('span', {}, describeTarget(ctx.data, target)),
      h('span', {}, badge(ratingText(rating), `rating-${rating.value}`), rating.note && h('small', { class: 'muted block' }, rating.note)))),
    link(`#/u/${encodeURIComponent(ref)}/rate`, '+ Rate what I know', 'button-link'));
}

function notesSection(ctx, ref) {
  const notes = ctx.data.notes.filter((n) => (n.refs ?? []).includes(ref));
  return section('Notes & questions',
    notes.map((n) => h('div', { class: 'kv' }, refLink(ctx.data, makeRef('note', n.id)), n.open && badge('open', 'open'))),
    link(`#/k/note/new?about=${encodeURIComponent(ref)}`, '+ Add note or question', 'button-link'));
}

export function render(root, ctx, { ref }) {
  const { kind } = parseRef(ref);
  const unit = getUnit(ctx.data, ref);
  if (!unit || !KIND_UI[kind]) return ctx.go('#/k/word', { replace: true });
  const ui = KIND_UI[kind];
  const error = errorLine();

  const remove = async () => {
    const rel = relationsOf(ctx.data, ref, { includeRejected: true }).length;
    const rat = ctx.data.ratings.filter((r) => r.target.unit === ref).length;
    if (!confirm(`Delete this ${ui.label.toLowerCase()}? Also affects ${rel} relations and ${rat} ratings.`)) return;
    deleteUnit(ctx.data, ref);
    await ctx.save();
    ctx.go(`#/k/${kind}`, { replace: true });
  };

  const toggleOpen = async () => {
    unit.open = !unit.open;
    await ctx.save();
    ctx.go(`#/u/${encodeURIComponent(ref)}`, { replace: true });
  };

  root.append(
    topBar(ui.label, link(`#/k/${kind}`, `‹ ${ui.plural}`), link(`#/u/${encodeURIComponent(ref)}/edit`, 'Edit')),
    h('article', { class: 'detail' },
      h('div', { class: 'detail-head' },
        jp(ui.title(unit), kind === 'note' || kind === 'sentence' ? 'detail-text small' : 'detail-text'),
        kind === 'word' && unit.writings && unit.reading && h('div', { class: 'reading' }, jp(unit.reading)),
        h('div', { class: 'row-sub' },
          unit.origin?.kind && unit.origin.kind !== 'learner' && badge(unit.origin.kind, 'muted-badge'),
          (unit.tagIds ?? []).map((t) => badge(ctx.data.tags.find((x) => x.id === t)?.name ?? '?', 'tag')))),
      error.el,
      kind === 'note' && button(unit.open ? 'Mark as resolved' : 'Reopen', toggleOpen, 'wide'),
      (kind === 'kanji' || kind === 'word') && meaningsSection(ctx, ref, unit, error),
      PARTS[kind](ctx.data, unit),
      unit.notes && section('Notes', h('p', { class: 'pre' }, unit.notes)),
      kind !== 'note' && ratingsSection(ctx, ref),
      relationsSection(ctx, ref),
      kind !== 'note' && notesSection(ctx, ref),
      h('p', { class: 'muted small' }, `Source: ${unit.source ?? '—'} · origin: ${unit.origin?.kind ?? '—'}${unit.origin?.detail ? ` (${unit.origin.detail})` : ''}`),
      button(`Delete ${ui.label.toLowerCase()}`, remove, 'danger wide'),
    ),
  );
}

