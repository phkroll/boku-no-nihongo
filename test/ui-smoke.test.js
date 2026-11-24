import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, fieldInput, text } from './support/fake-dom.js';
import { emptyData, makeRef, UNKNOWN } from '../js/model/data.js';
import { addUnit, addMeaning, addReading } from '../js/model/units.js';
import { addRelation } from '../js/model/relations.js';
import { addRating } from '../js/model/ratings.js';
import { ensureStarter } from '../js/model/starter.js';

installFakeDom();
const screens = {
  list: await import('../js/ui/list.js'),
  detail: await import('../js/ui/detail.js'),
  edit: await import('../js/ui/edit.js'),
  relation: await import('../js/ui/relation.js'),
  rate: await import('../js/ui/rate.js'),
  review: await import('../js/ui/review.js'),
  settings: await import('../js/ui/settings.js'),
};

function sampleData() {
  const d = ensureStarter(emptyData());
  const k = addUnit(d, 'kanji', { char: '月' });
  addReading(k, { kana: 'つき', type: 'kun' });
  addReading(k, { kana: 'がつ', type: 'unknown' });
  addMeaning(k, { gloss: 'Moon, month', unsplit: true });
  const k2 = addUnit(d, 'kanji', { char: '寝' });
  const w = addUnit(d, 'word', { writings: [{ text: '寝る' }], reading: 'ねる', wordClass: 'verb', verbGroup: 'ru', kanjiUses: [{ char: '寝', reading: 'ね' }], forms: [{ form: ['past'], writing: '寝た', reading: 'ねた' }] });
  addMeaning(w, { gloss: 'to sleep' });
  addUnit(d, 'word', { reading: 'ビール', writings: 'n/a', usuallyWritten: 'katakana' });
  const s = addUnit(d, 'sentence', { text: '寝ました。', uses: [{ wordId: w.id, form: ['polite', 'past'] }, { text: '早く' }] });
  addUnit(d, 'note', { text: 'Is 西 confused with 酉?', open: true, refs: [makeRef('kanji', k.id)] });
  const rel = addRelation(d, { type: 'confuses', members: [makeRef('kanji', k2.id), UNKNOWN] });
  addRelation(d, { type: 'looks-similar', members: [makeRef('kanji', k.id), makeRef('kanji', k2.id)], origin: { kind: 'suggested' } });
  addRating(d, { unit: makeRef('word', w.id), from: 'writing' }, { value: 'partly', note: 'hard' });
  addRating(d, { unit: makeRef('relation', rel.id) }, { value: 'known' });
  d.tags.push({ id: 't1', name: 'N5' });
  return { d, refs: { k: makeRef('kanji', k.id), w: makeRef('word', w.id), s: makeRef('sentence', s.id), rel } };
}

function makeCtx(d) {
  const ctx = { data: d, saved: 0, went: [], save: async () => { ctx.saved += 1; }, go: (hash) => ctx.went.push(hash) };
  return ctx;
}
const page = () => document.createElement('div');

test('every list renders', () => {
  const { d } = sampleData();
  for (const kind of ['word', 'kanji', 'grammar', 'sentence', 'note']) {
    const root = page();
    screens.list.render(root, makeCtx(d), { kind });
    assert.ok(text(root).length > 0, kind);
  }
});

test('every detail renders, including unknown partner and unsplit meaning', () => {
  const { d, refs } = sampleData();
  for (const ref of [refs.k, refs.w, refs.s, ...d.notes.map((n) => makeRef('note', n.id)), ...d.grammar.slice(0, 1).map((g) => makeRef('grammar', g.id))]) {
    const root = page();
    screens.detail.render(root, makeCtx(d), { ref });
    assert.ok(text(root).length > 0, ref);
  }
  const root = page();
  screens.detail.render(root, makeCtx(d), { ref: refs.k });
  assert.match(text(root), /unsplit/);
  const kanji2 = page();
  screens.detail.render(kanji2, makeCtx(d), { ref: makeRef('kanji', d.kanji[1].id) });
  assert.match(text(kanji2), /unknown/);
});

test('edit forms render for every kind and existing units', () => {
  const { d, refs } = sampleData();
  for (const kind of ['word', 'kanji', 'grammar', 'sentence', 'note']) screens.edit.render(page(), makeCtx(d), { kind });
  for (const ref of [refs.k, refs.w, refs.s]) screens.edit.render(page(), makeCtx(d), { ref });
});

test('quick capture: a word heard, kana only', async () => {
  const { d } = sampleData();
  const ctx = makeCtx(d);
  const root = page();
  screens.edit.render(root, ctx, { kind: 'word' });
  const reading = fieldInput(root, 'Reading');
  reading.fire('input', { target: { value: 'かえる' } });
  root.all((n) => n.tagName === 'FORM')[0].fire('submit');
  await new Promise((r) => setImmediate(r));
  assert.ok(d.words.some((w) => w.reading === 'かえる' && !w.writings));
  assert.equal(ctx.saved, 1);
});

test('relation, rate, review and settings render', () => {
  const { d, refs } = sampleData();
  screens.relation.render(page(), makeCtx(d), { with: refs.k });
  screens.relation.render(page(), makeCtx(d), { id: refs.rel.id });
  for (const ref of [refs.k, refs.w, refs.s, makeRef('relation', refs.rel.id)]) screens.rate.render(page(), makeCtx(d), { ref });
  const review = page();
  screens.review.render(review, makeCtx(d), {});
  assert.match(text(review), /Looks similar/);
  screens.settings.render(page(), makeCtx(d), {});
});

test('confirming a suggested relation', async () => {
  const { d } = sampleData();
  const ctx = makeCtx(d);
  const root = page();
  screens.review.render(root, ctx, {});
  root.all((n) => n.tagName === 'BUTTON' && n.textContent === 'Confirm')[0].click();
  await new Promise((r) => setImmediate(r));
  assert.equal(d.relations.find((r) => r.type === 'looks-similar').status, 'confirmed');
});

test('quick capture: a word seen, writing only, without extra taps', async () => {
  const { d } = sampleData();
  const ctx = makeCtx(d);
  const root = page();
  screens.edit.render(root, ctx, { kind: 'word' });
  const writing = fieldInput(root, 'Writing');
  assert.ok(writing, 'writing input is there from the start');
  writing.fire('input', { target: { value: '帰る' } });
  root.all((n) => n.tagName === 'FORM')[0].fire('submit');
  await new Promise((r) => setImmediate(r));
  assert.ok(d.words.some((w) => w.writings?.[0]?.text === '帰る' && !w.reading));
});

test('Enter in a text field does not save the form; Enter in the tag field adds the tag', () => {
  const { d } = sampleData();
  const root = page();
  screens.edit.render(root, makeCtx(d), { kind: 'kanji' });
  const form = root.all((n) => n.tagName === 'FORM')[0];
  let prevented = false;
  const input = fieldInput(root, 'Kanji');
  form.fire('keydown', { key: 'Enter', target: input, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  const tagInput = root.all((n) => n.tagName === 'INPUT' && n.attrs.placeholder === 'new tag')[0];
  tagInput.value = 'JLPT N4';
  tagInput.fire('keydown', { key: 'Enter', isComposing: false, keyCode: 13 });
  assert.ok(d.tags.some((t) => t.name === 'JLPT N4'));
  tagInput.value = 'にほ';
  tagInput.fire('keydown', { key: 'Enter', isComposing: true, keyCode: 229 });
  assert.ok(!d.tags.some((t) => t.name === 'にほ'));
});
