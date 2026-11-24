import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, UNKNOWN } from '../../js/model/data.js';
import { mergeImport } from '../../js/model/io.js';
import { convertSeed } from '../../scripts/seed-convert.mjs';

const T = '2026-03-01T00:00:00.000Z';
const e = (type, from, to, extra = {}) => ({ id: `e:${type}:${from}>${to}`, type, from, to, ...extra });

// Synthetic snippet in the shape of linked-seed-1.
const SEED = {
  schema_version: 'linked-seed-1',
  nodes: [
    { id: 'k:月', type: 'kanji', character: '月', initial_familiarity: 'known' },
    { id: 'k:聞', type: 'kanji', character: '聞', initial_familiarity: 'probably_known' },
    { id: 'k:間', type: 'kanji', character: '間', initial_familiarity: 'not_assessed' },
    { id: 'k:門', type: 'kanji', character: '門' },
    { id: 'k:西', type: 'kanji', character: '西' },
    { id: 'k:寝', type: 'kanji', character: '寝' },
    { id: 'gloss:Moon, month', type: 'gloss', text: 'Moon, month' },
    { id: 'kana:つき', type: 'kana', text: 'つき' },
    { id: 'kana:げつ', type: 'kana', text: 'げつ' },
    { id: 'kana:がつ', type: 'kana', text: 'がつ' },
    { id: 'v:寝る:ねる', type: 'word', initial_familiarity: 'known' },
    { id: 'writing:寝る', type: 'writing', text: '寝る' },
    { id: 'kana:ねる', type: 'kana', text: 'ねる' },
    { id: 'sense:v:寝る:ねる', type: 'sense', gloss: 'Sleep' },
    { id: 'grammar:ichidan', type: 'grammar_class', label: 'ichidan' },
    { id: 'form:v:寝る:ねる:past:positive:polite', type: 'conjugated_form', tense: 'past', polarity: 'positive', register: 'polite' },
    { id: 'writing:寝ました', type: 'writing', text: '寝ました' },
    { id: 'kana:ねました', type: 'kana', text: 'ねました' },
    { id: 'v:ビール:ビール', type: 'word', initial_familiarity: 'probably_known' },
    { id: 'writing:ビール', type: 'writing', text: 'ビール' },
    { id: 'kana:ビール', type: 'kana', text: 'ビール' },
    { id: 'sense:v:ビール:ビール', type: 'sense', gloss: 'Beer' },
    { id: 'group:1', type: 'relationship_group', relationship_type: 'visual_similarity', source: 'candidate', other_item_unknown: false },
    { id: 'group:2', type: 'relationship_group', relationship_type: 'reported_confusion', source: 'learner_report', other_item_unknown: true },
    { id: 'sentence:1', type: 'sentence' },
    { id: 'writing:寝ました。', type: 'writing', text: '寝ました。' },
    { id: 'kana:ねました。', type: 'kana', text: 'ねました。' },
    { id: 'gloss:I slept.', type: 'gloss', text: 'I slept.' },
  ],
  relationships: [
    e('has_gloss', 'k:月', 'gloss:Moon, month'),
    e('has_kanji_reading', 'k:月', 'kana:つき', { reading_type: 'kun' }),
    e('has_kanji_reading', 'k:月', 'kana:げつ', { reading_type: 'on' }),
    e('has_kanji_reading', 'k:月', 'kana:がつ', { reading_type: 'unclassified' }),
    e('has_writing', 'v:寝る:ねる', 'writing:寝る'),
    e('has_reading', 'v:寝る:ねる', 'kana:ねる'),
    e('has_sense', 'v:寝る:ねる', 'sense:v:寝る:ねる'),
    e('has_grammar_class', 'v:寝る:ねる', 'grammar:ichidan'),
    e('has_form', 'v:寝る:ねる', 'form:v:寝る:ねる:past:positive:polite'),
    e('has_writing', 'form:v:寝る:ねる:past:positive:polite', 'writing:寝ました'),
    e('has_reading', 'form:v:寝る:ねる:past:positive:polite', 'kana:ねました'),
    e('recall:v:寝る:ねる', 'kana:ねる', 'sense:v:寝る:ねる'),
    e('recognition_difficulty', 'writing:寝る', 'v:寝る:ねる', { scope: 'reading_or_meaning' }),
    e('has_writing', 'v:ビール:ビール', 'writing:ビール'),
    e('has_reading', 'v:ビール:ビール', 'kana:ビール'),
    e('has_sense', 'v:ビール:ビール', 'sense:v:ビール:ビール'),
    e('group_member', 'group:1', 'k:門'),
    e('group_member', 'group:1', 'k:聞'),
    e('group_member', 'group:1', 'k:間'),
    e('visual_similarity', 'k:聞', 'k:間', { symmetric: true, source: 'candidate' }),
    e('reported_confusion', 'k:聞', 'k:間', { symmetric: true, source: 'learner_report' }),
    e('suspected_confusion', 'k:西', 'k:門', { symmetric: true, source: 'candidate' }),
    e('group_member', 'group:2', 'k:西'),
    e('group_member', 'group:2', 'k:西'),
    e('possible_confusion_direction', 'k:聞', 'k:間', { evidence: 'illustrative_not_observed' }),
    e('has_writing', 'sentence:1', 'writing:寝ました。'),
    e('has_reading', 'sentence:1', 'kana:ねました。'),
    e('has_gloss', 'sentence:1', 'gloss:I slept.'),
    e('contains_word', 'sentence:1', 'v:寝る:ねる'),
    e('contains_form', 'sentence:1', 'form:v:寝る:ねる:past:positive:polite'),
  ],
  personal_knowledge: [
    { relationship_id: 'e:has_gloss:k:月>gloss:Moon, month', status: 'known', source: 'learner_report', scope: 'familiar sense only' },
    { relationship_id: 'e:recall:v:寝る:ねる:kana:ねる>sense:v:寝る:ねる', status: 'known', source: 'learner_report' },
    { relationship_id: 'e:recognition_difficulty:writing:寝る>v:寝る:ねる', status: 'difficult', source: 'learner_report', scope: 'Exact failing direction not independently assessed.' },
    { relationship_id: 'e:reported_confusion:k:聞>k:間', status: 'confused', direction: 'unspecified', source: 'learner_report' },
  ],
  exercise_attempts: [],
};

const out = () => convertSeed(SEED, { now: T });
const kanji = (d, c) => d.kanji.find((k) => k.char === c);
const word = (d, r) => d.words.find((w) => w.reading === r);

test('kanji readings with types and unknown; gloss kept unsplit', () => {
  const k = kanji(out(), '月');
  assert.deepEqual(k.readings.map((r) => [r.kana, r.type]), [['つき', 'kun'], ['げつ', 'on'], ['がつ', UNKNOWN]]);
  assert.deepEqual(k.meanings.map((m) => [m.gloss, m.unsplit]), [['Moon, month', true]]);
  assert.equal(kanji(out(), '門').meanings, undefined);
});

test('word with writing, reading, meaning, verbGroup, example form', () => {
  const w = word(out(), 'ねる');
  assert.deepEqual(w.writings, [{ text: '寝る' }]);
  assert.deepEqual(w.meanings.map((m) => [m.gloss, m.unsplit]), [['Sleep', undefined]]);
  assert.equal(w.verbGroup, 'ru');
  assert.deepEqual(w.forms, [{ form: ['polite', 'past'], writing: '寝ました', reading: 'ねました' }]);
});

test('kana-only word: no kanji writing, usually written in katakana', () => {
  const w = word(out(), 'ビール');
  assert.equal(w.writings, undefined);
  assert.equal(w.usuallyWritten, 'katakana');
});

test('familiarity becomes an estimate rating on the whole unit', () => {
  const d = out();
  const r = (ref) => d.ratings.filter((x) => x.target.unit === ref && Object.keys(x.target).length === 1);
  assert.deepEqual(r(`kanji:${kanji(d, '月').id}`).map((x) => [x.value, x.confidence, x.source]), [['known', 'sure', 'estimate']]);
  assert.deepEqual(r(`kanji:${kanji(d, '聞').id}`).map((x) => [x.value, x.confidence]), [['known', 'probably']]);
  assert.deepEqual(r(`kanji:${kanji(d, '間').id}`), []);
});

test('personal knowledge: imprecise ratings with seed scope as note', () => {
  const d = out();
  const tsuki = d.ratings.find((x) => x.target.unit === `kanji:${kanji(d, '月').id}` && x.target.to === 'meaning');
  assert.deepEqual([tsuki.value, tsuki.source, tsuki.note, tsuki.target.meaningId], ['known', 'learner', 'familiar sense only', undefined]);
  const neru = `word:${word(d, 'ねる').id}`;
  assert.ok(d.ratings.some((x) => x.target.unit === neru && x.target.from === 'reading' && x.target.to === 'meaning' && x.value === 'known'));
  const hard = d.ratings.find((x) => x.target.unit === neru && x.target.from === 'writing' && !x.target.to);
  assert.equal(hard.value, 'partly');
});

test('relations: candidate group proposed, pair inside group dropped, confusions', () => {
  const d = out();
  const ref = (c) => `kanji:${kanji(d, c).id}`;
  const similar = d.relations.filter((r) => r.type === 'looks-similar');
  assert.equal(similar.length, 1);
  assert.deepEqual([similar[0].status, similar[0].origin.kind, similar[0].members.length], ['proposed', 'suggested', 3]);
  const confuses = d.relations.filter((r) => r.type === 'confuses');
  const reported = confuses.find((r) => r.members.includes(ref('聞')));
  assert.deepEqual([reported.status, reported.origin.kind], ['confirmed', 'learner']);
  const nishi = confuses.filter((r) => r.members.includes(ref('西')));
  assert.deepEqual(nishi.map((r) => [r.status, r.members.includes(UNKNOWN)]).sort(), [['confirmed', true], ['proposed', false]]);
  assert.equal(d.relations.filter((r) => r.notes?.includes('illustrative')).length, 0);
});

test('sentence uses word with form chain', () => {
  const d = out();
  const s = d.sentences[0];
  assert.deepEqual([s.text, s.reading, s.translation], ['寝ました。', 'ねました。', 'I slept.']);
  assert.deepEqual(s.uses, [{ wordId: word(d, 'ねる').id, form: ['polite', 'past'] }]);
});

test('every record has origin and the output merges into empty data', () => {
  const d = out();
  for (const k of ['kanji', 'words', 'sentences']) for (const u of d[k]) assert.ok(u.origin, k);
  const target = emptyData();
  const summary = mergeImport(target, d, { file: 'seed', now: T });
  assert.equal(summary.skipped, 0);
  assert.equal(target.words.length, 2);
  assert.equal(mergeImport(target, d, { file: 'seed', now: T }).added, 0);
});
