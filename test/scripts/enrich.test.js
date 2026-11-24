import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../../js/model/data.js';
import { mergeImport } from '../../js/model/io.js';
import {
  enrich, exampleSentences, furiganaReading, kanjidicReadings, kanjiUsesFor, lookalikeRelations, parseToken, typeReadings,
} from '../../scripts/enrich.mjs';

const NOW = '2026-11-24T00:00:00.000Z';
const kd = (literal, on, kun) => ({
  literal,
  readingMeaning: { groups: [{ readings: [...on.map((value) => ({ type: 'ja_on', value })), ...kun.map((value) => ({ type: 'ja_kun', value })), { type: 'pinyin', value: 'x' }] }] },
});
const KD = new Map([
  ['開', kanjidicReadings(kd('開', ['カイ'], ['ひら.く', 'あ.く', 'あ.ける']))],
  ['学', kanjidicReadings(kd('学', ['ガク'], ['まな.ぶ']))],
  ['気', kanjidicReadings(kd('気', ['キ', 'ケ'], ['き']))],
  ['達', kanjidicReadings(kd('達', ['タツ', 'ダ'], ['-たち']))],
  ['時', kanjidicReadings(kd('時', ['ジ'], ['とき']))],
  ['帰', kanjidicReadings(kd('帰', ['キ'], ['かえ.る']))],
]);

const kanji = (char, readings) => ({ id: `k-${char}`, char, readings: readings?.map(([kana, type]) => ({ id: `k-${char}-${type}-${kana}`, kana, type })) });
const working = (list) => new Map(list.map((k) => [k.char, { ...k, readings: [...(k.readings ?? [])], open: !(k.readings ?? []).length, added: [] }]));

test('unknown readings get on or kun when exactly one matches; full form, stem or katakana', () => {
  const { units, unresolved } = typeReadings(
    [kanji('開', [['かい', 'unknown'], ['あく', 'unknown'], ['ひら', 'unknown'], ['あける', 'kun']]), kanji('気', [['き', 'unknown']]), kanji('鬱', [['うつ', 'unknown']])],
    KD,
  );
  assert.deepEqual(units, [{ id: 'k-開', char: '開', readings: [
    { id: 'k-開-unknown-かい', kana: 'かい', type: 'on' },
    { id: 'k-開-unknown-あく', kana: 'あく', type: 'kun' },
    { id: 'k-開-unknown-ひら', kana: 'ひら', type: 'kun' },
  ] }]);
  assert.deepEqual(unresolved, ['気 き: on and kun', '鬱 うつ: not in KANJIDIC']);
});

test('kanji uses: sound change gets a base, 々 repeats the kanji, okurigana matches a full reading', () => {
  const k = working([kanji('学', [['がく', 'on']]), kanji('校', [['こう', 'on']]), kanji('時', [['とき', 'kun']]), kanji('開', [['あく', 'kun']])]);
  const f = (text, reading, furigana) => ({ text, reading, furigana });
  assert.deepEqual(kanjiUsesFor({}, f('学校', 'がっこう', [{ ruby: '学', rt: 'がっ' }, { ruby: '校', rt: 'こう' }]), k).kanjiUses, [
    { char: '学', reading: 'がっ', readingId: 'k-学-on-がく', base: 'がく' },
    { char: '校', reading: 'こう', readingId: 'k-校-on-こう' },
  ]);
  assert.deepEqual(kanjiUsesFor({}, f('時々', 'ときどき', [{ ruby: '時', rt: 'とき' }, { ruby: '々', rt: 'どき' }]), k).kanjiUses[1],
    { char: '時', reading: 'どき', readingId: 'k-時-kun-とき', base: 'とき' });
  assert.deepEqual(kanjiUsesFor({}, f('開く', 'あく', [{ ruby: '開', rt: 'あ' }, { ruby: 'く' }]), k).kanjiUses,
    [{ char: '開', reading: 'あ', readingId: 'k-開-kun-あく' }]);
});

test('kanji uses: one block over the whole word = whole-word reading; mixed blocks skipped', () => {
  const k = working([]);
  assert.deepEqual(kanjiUsesFor({}, { furigana: [{ ruby: '今日', rt: 'きょう' }] }, k), { wholeWordReading: true });
  assert.ok(kanjiUsesFor({}, { furigana: [{ ruby: '日本', rt: 'にほん' }, { ruby: '語', rt: 'ご' }] }, k).skip);
});

test('a kanji without readings gets the reading its word uses, in dictionary form and typed', () => {
  const k = working([kanji('友', [['とも', 'kun']]), kanji('達'), kanji('帰')]);
  const uses = kanjiUsesFor({}, { furigana: [{ ruby: '友', rt: 'とも' }, { ruby: '達', rt: 'だち' }] }, k, KD).kanjiUses;
  assert.deepEqual(uses[1], { char: '達', reading: 'だち', readingId: 'k-達-kun-たち', base: 'たち' });
  assert.deepEqual(k.get('達').added, [{ id: 'k-達-kun-たち', kana: 'たち', type: 'kun' }]);
  kanjiUsesFor({}, { furigana: [{ ruby: '帰', rt: 'かえ' }, { ruby: 'る' }] }, k, KD);
  assert.deepEqual(k.get('帰').added, [{ id: 'k-帰-kun-かえ', kana: 'かえ', type: 'kun' }]);
  assert.deepEqual(k.get('友').added, [], 'kanji with readings get none added');
});

test('lookalikes: pairs of our kanji only, once, not when already in a looks-similar relation', () => {
  const ks = [kanji('右'), kanji('石'), kanji('今'), kanji('会')];
  const existing = [{ type: 'looks-similar', members: ['kanji:k-右', 'kanji:k-石'] }];
  const out = lookalikeRelations(ks, ['右\t石,有', '今\t令,会', '会\t今,合'], existing, NOW);
  assert.deepEqual(out.map((r) => r.members), [['kanji:k-今', 'kanji:k-会']]);
  assert.equal(out[0].status, 'proposed');
  assert.deepEqual(out[0].origin, { kind: 'suggested', detail: 'Kanjium lookalikes' });
});

test('Tatoeba tokens and furigana', () => {
  assert.deepEqual(parseToken('開く(あく)[01]{開いた}~'), { head: '開く', reading: 'あく', form: '開いた', checked: true });
  assert.deepEqual(parseToken('前(#1392580)'), { head: '前', reading: undefined, form: undefined, checked: false });
  assert.equal(furiganaReading('[窓|まど]を[閉|し]めて。'), 'まどをしめて。');
  assert.equal(furiganaReading('[場所|ば|しょ]'), 'ばしょ');
});

test('example sentence: shortest checked one; ambiguous writing needs the reading; uses all our words', () => {
  const words = [
    { id: 'w-寝る', reading: 'ねる', writings: [{ text: '寝る' }] },
    { id: 'w-あく', reading: 'あく', writings: [{ text: '開く' }] },
    { id: 'w-ひらく', reading: 'ひらく', writings: [{ text: '開く' }] },
    { id: 'w-前', reading: 'まえ', writings: [{ text: '前' }] },
  ];
  const line = (jpn, b) => ({ jpn, eng: `e${jpn}`, tokens: b.split(' ').map(parseToken) });
  const tatoeba = {
    index: [
      line('1', '寝る[02]~ 前(#1) に 歯を磨く{歯を磨き}'),
      line('2', '彼 は 寝る{寝た}~'),
      line('3', 'ドア は 開く{開いた}~'),
      line('4', 'ドア は 開く(あく){開いた}~'),
      line('5', '寝る~'),
    ],
    texts: new Map([['1', '寝る前に歯を磨きなさい。'], ['2', '彼は寝た。'], ['3', 'ドアは開いた。'], ['4', 'ドアが開いた。'], ['5', '寝る。']]),
    eng: new Map([['e1', 'Brush your teeth before bed.'], ['e2', 'He went to bed.'], ['e3', 'x'], ['e4', 'The door opened.']]),
    transcriptions: new Map([['2', '[彼|かれ]は[寝|ね]た。']]),
    writingsInDictionary: new Map([['寝る', 1], ['開く', 2], ['前', 1]]),
  };
  const { sentences, without } = exampleSentences(words, tatoeba, NOW);
  const byId = Object.fromEntries(sentences.map((s) => [s.id, s]));
  assert.deepEqual(Object.keys(byId).sort(), ['tatoeba-2', 'tatoeba-4'], '5 has no English; 3 has no reading for 開く');
  assert.deepEqual(byId['tatoeba-2'], {
    id: 'tatoeba-2', text: '彼は寝た。', translation: 'He went to bed.', uses: [{ wordId: 'w-寝る' }], reading: 'かれはねた。',
    origin: { kind: 'reference', detail: 'Tatoeba #2' }, created: NOW, updated: NOW, notes: 'Forms in this sentence: 寝る → 寝た',
  });
  assert.deepEqual(byId['tatoeba-4'].uses, [{ wordId: 'w-あく' }]);
  assert.deepEqual(without, ['開く ひらく', '前 まえ'], '前 only appears unchecked');
});

test('merged into app data: types upgraded, nothing overwritten, second import adds nothing', () => {
  const data = emptyData();
  data.kanji.push(
    { id: 'k-学', char: '学', readings: [{ id: 'k-学-unknown-がく', kana: 'がく', type: 'unknown' }] },
    { id: 'k-校', char: '校', readings: [{ id: 'k-校-on-こう', kana: 'こう', type: 'on' }] },
  );
  data.words.push({ id: 'w-学校', reading: 'がっこう', writings: [{ text: '学校' }], notes: 'mine' });
  const src = {
    kanjidicByChar: KD,
    furiganaByKey: new Map([['学校|がっこう', { furigana: [{ ruby: '学', rt: 'がっ' }, { ruby: '校', rt: 'こう' }] }]]),
    jmdictByKey: new Map(),
    lookalikeLines: [],
    tatoeba: { index: [], texts: new Map(), eng: new Map(), transcriptions: new Map(), writingsInDictionary: new Map() },
  };
  const { data: out } = enrich(data, src, { now: NOW });
  mergeImport(data, out, { now: NOW });
  assert.equal(data.kanji[0].readings.length, 1);
  assert.equal(data.kanji[0].readings[0].type, 'on');
  assert.equal(data.words[0].notes, 'mine');
  assert.deepEqual(data.words[0].kanjiUses[0], { char: '学', reading: 'がっ', readingId: 'k-学-unknown-がく', base: 'がく' });
  const again = mergeImport(data, enrich(data, src, { now: NOW }).data, { now: NOW });
  assert.equal(again.added + again.updated, 0);
});
