// "What I know": pick a question that fits the entry, then rate it. Ratings are never edited:
// a change adds a new rating (history kept); "not assessed" adds a reset.
import { CONFIDENCE, FORM_KEYS, getUnit, parseRef, unitLabel } from '../model/data.js';
import { addRating, ratingHistory, targetKey } from '../model/ratings.js';
import { h, clear, topBar, field, chips, errorLine, badge, fill, link, button } from './dom.js';
import { describeTarget, hrefOf, ratingText } from './describe.js';
import { backLink } from './nav.js';
import { questionsFor, findQuestion, overallRating, detailRatings } from './questions.js';

const VALUES = [['unknown', 'Don’t know'], ['partly', 'Partly'], ['known', 'Know it']];

export function rateHref(ref, key) {
  return `#/u/${encodeURIComponent(ref)}/rate${key ? `?q=${encodeURIComponent(key)}` : ''}`;
}

// No question chosen yet: list what can be rated, with the current state.
function chooser(root, ctx, ref) {
  const current = new Map(detailRatings(ctx.data, ref).map((x) => [x.key, x.rating]));
  const overall = parseRef(ref).kind === 'relation' ? undefined : overallRating(ctx.data, ref);
  const row = (key, label, hint, rating) => h('li', {}, h('a', { href: rateHref(ref, key), class: 'row' },
    h('span', { class: 'row-main' }, label, rating && badge(ratingText(rating), `rating-${rating.value}`)),
    hint && h('span', { class: 'row-sub' }, hint)));
  fill(root,
    topBar(`What I know: ${unitLabel(ctx.data, ref)}`, backLink(ctx, 'Cancel', hrefOf(ref)), null),
    h('ul', { class: 'list' },
      parseRef(ref).kind !== 'relation' && row('overall', 'Overall', 'how well I know it in general', overall),
      questionsFor(ctx.data, ref).map((x) => row(x.key, x.label, x.hint, x.needsForm ? undefined : current.get(targetKey(x.target)))),
    ));
}

export function render(root, ctx, { ref, q }) {
  const unit = getUnit(ctx.data, ref);
  if (!unit) return ctx.go('#/k/word', { replace: true });
  if (!q) return chooser(root, ctx, ref);
  const question = findQuestion(ctx.data, ref, q);
  if (!question) return ctx.go(rateHref(ref), { replace: true });

  const target = { ...question.target };
  const latest = () => ratingHistory(ctx.data, target).at(-1);
  const rating = { value: latest()?.value === 'cleared' ? 'known' : latest()?.value ?? 'known', confidence: latest()?.confidence ?? 'sure', note: '' };
  const error = errorLine();
  const body = h('div', { class: 'form' });

  function draw() {
    clear(body);
    const history = ratingHistory(ctx.data, target);
    const isRated = history.length > 0 && history.at(-1).value !== 'cleared';
    fill(body,
      h('p', {}, h('strong', {}, question.label || describeTarget(ctx.data, target)), question.hint && h('span', { class: 'muted block' }, question.hint)),
      question.needsForm && field('Which form', chips(FORM_KEYS.map(([k]) => [k, k]), (k) => (target.form ?? []).includes(k), (k) => {
        const f = target.form ?? [];
        target.form = f.includes(k) ? f.filter((x) => x !== k) : [...f, k];
        if (!target.form.length) delete target.form;
        draw();
      })),
      field('I…', chips(VALUES, (v) => rating.value === v, (v) => { rating.value = v; draw(); })),
      field('How sure', chips(CONFIDENCE.map((c) => [c, c]), (c) => rating.confidence === c, (c) => { rating.confidence = c; draw(); })),
      field('Note (optional)', h('input', { value: rating.note, oninput: (ev) => { rating.note = ev.target.value; } })),
      error.el,
      button('Save', () => save(rating), 'primary'),
      isRated && button('Set back to not assessed', () => save({ value: 'cleared' }), 'wide'),
      history.length > 0 && h('div', { class: 'section' }, h('h2', {}, 'History'),
        [...history].reverse().map((r) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, r.at.slice(0, 10)),
          h('span', {}, badge(ratingText(r), `rating-${r.value}`), r.note && h('small', { class: 'muted block' }, r.note))))),
    );
  }

  async function save(values) {
    error.clear();
    try {
      if (question.needsForm && !target.form) throw new Error('Pick the form first');
      addRating(ctx.data, target, values);
      await ctx.save();
      ctx.back(hrefOf(ref));
    } catch (e) {
      error.show(e);
    }
  }

  fill(root, topBar(unitLabel(ctx.data, ref), backLink(ctx, 'Cancel', rateHref(ref)), link(rateHref(ref), 'Other')), body);
  draw();
}
