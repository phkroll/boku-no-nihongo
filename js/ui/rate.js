// Record what I know about a unit or relation. Leave parts empty when unsure which part is meant.
import { CONFIDENCE, FORM_KEYS, UNKNOWN, getUnit, parseRef, unitLabel, visibleMeanings } from '../model/data.js';
import { addRating, currentRatings, ratingHistory } from '../model/ratings.js';
import { KIND_UI } from './kinds.js';
import { h, clear, topBar, field, select, chips, errorLine, badge, fill } from './dom.js';
import { FACET_LABEL, describeTarget, hrefOf, ratingText } from './describe.js';
import { backLink } from './nav.js';

const VALUES = [['unknown', 'Don’t know'], ['partly', 'Partly'], ['known', 'Know it'], ['cleared', 'Not assessed']];

export function render(root, ctx, { ref }) {
  const { kind } = parseRef(ref);
  const unit = getUnit(ctx.data, ref);
  if (!unit) return ctx.go('#/k/word', { replace: true });
  const isRelation = kind === 'relation';
  const facets = KIND_UI[kind]?.facets ?? [];
  const target = { unit: ref };
  const rating = { value: 'known', confidence: 'sure', note: '' };
  const error = errorLine();
  const body = h('div', { class: 'form' });
  const back = hrefOf(ref);

  const facetSelect = (key) => select([['', '— (unspecified)'], ...facets.map((f) => [f, FACET_LABEL[f]])], target[key], (v) => { target[key] = v || undefined; draw(); });

  function draw() {
    clear(body);
    const members = isRelation ? unit.members.filter((m) => m !== UNKNOWN) : [];
    const history = ratingHistory(ctx.data, target);
    fill(body, 
      h('p', { class: 'muted' }, 'Fill in only what you know. Empty parts mean “not sure which part”.'),
      facets.length > 0 && h('div', { class: 'inline' }, field('From', facetSelect('from')), field('To', facetSelect('to'))),
      visibleMeanings(unit).length > 0 && field('Meaning', select([['', '— (any / unclear)'], ...visibleMeanings(unit).map((m) => [m.id, m.gloss])], target.meaningId, (v) => { target.meaningId = v || undefined; draw(); })),
      kind === 'kanji' && unit.readings?.length > 0 && field('Reading', select([['', '— (any / unclear)'], ...unit.readings.map((r) => [r.id, `${r.kana} (${r.type})`])], target.readingId, (v) => { target.readingId = v || undefined; draw(); })),
      (kind === 'word' || kind === 'sentence') && field('Form', chips(FORM_KEYS.map(([k]) => [k, k]), (k) => (target.form ?? []).includes(k), (k) => {
        const f = target.form ?? [];
        target.form = f.includes(k) ? f.filter((x) => x !== k) : [...f, k];
        if (!target.form.length) target.form = undefined;
        draw();
      })),
      isRelation && field(unit.members.length > 2 ? 'Tell apart (pick two, in order; empty = the whole group)' : 'Tell apart (order = direction; empty = just knowing they belong together)',
        h('div', { class: 'inline' }, ...[0, 1].map((i) => select([['', '—'], ...members.map((m) => [m, unitLabel(ctx.data, m)])], target.members?.[i], (v) => {
          const pair = [...(target.members ?? [])];
          pair[i] = v || undefined;
          target.members = pair.filter(Boolean).length ? pair : undefined;
          draw();
        })))),
      h('p', {}, h('strong', {}, describeTarget(ctx.data, { ...target, members: target.members?.filter(Boolean) }))),
      field('I…', chips(VALUES, (v) => rating.value === v, (v) => { rating.value = v; draw(); })),
      field('How sure', chips(CONFIDENCE.map((c) => [c, c]), (c) => rating.confidence === c, (c) => { rating.confidence = c; draw(); })),
      field('Note (optional)', h('input', { value: rating.note, oninput: (ev) => { rating.note = ev.target.value; } })),
      error.el,
      h('button', { type: 'button', class: 'primary', onclick: save }, 'Save rating'),
      history.length > 0 && h('div', { class: 'section' }, h('h2', {}, 'History for this'),
        history.map((r) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, r.at.slice(0, 10)), badge(ratingText(r), `rating-${r.value}`)))),
      h('div', { class: 'section' }, h('h2', {}, 'Current'),
        currentRatings(ctx.data, ref).map(({ target: t, rating: r }) => h('div', { class: 'kv' }, h('span', {}, describeTarget(ctx.data, t)), badge(ratingText(r), `rating-${r.value}`)))),
    );
  }

  async function save() {
    error.clear();
    try {
      const t = { ...target, members: target.members?.filter(Boolean) };
      if (t.members && t.members.length !== 2) throw new Error('Pick two members to rate telling them apart');
      addRating(ctx.data, t, rating);
      await ctx.save();
      ctx.back(back);
    } catch (e) {
      error.show(e);
    }
  }

  fill(root, topBar(`Rate ${isRelation ? 'relation' : unitLabel(ctx.data, ref)}`, backLink(ctx, 'Cancel', back), null), body);
  draw();
}
