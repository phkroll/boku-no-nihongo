// Shared constants and helpers of the data model. No DOM, no storage.

export const VERSION = 2;
export const UNKNOWN = 'unknown';
export const NA = 'n/a';

export const KINDS = ['word', 'kanji', 'grammar', 'sentence', 'note'];
export const COLLECTION = {
  word: 'words',
  kanji: 'kanji',
  grammar: 'grammar',
  sentence: 'sentences',
  note: 'notes',
  relation: 'relations',
};

export const WORD_CLASSES = [
  'noun', 'verb', 'i-adjective', 'na-adjective', 'adverb', 'pronoun', 'particle',
  'conjunction', 'counter', 'expression', 'proper-noun', 'other', UNKNOWN,
];
export const VERB_GROUPS = ['ru', 'u', 'irregular', UNKNOWN, NA];
export const READING_TYPES = ['on', 'kun', 'name', UNKNOWN];
export const WRITTEN_AS = ['kanji', 'kana', 'katakana'];
export const RELATION_TYPES = [
  'looks-similar', 'similar-meaning', 'transitivity-pair', 'politeness-variant', 'related', 'confuses',
];
export const RELATION_STATUS = ['proposed', 'confirmed', 'rejected'];
export const RATING_VALUES = ['unknown', 'partly', 'known', 'cleared'];
export const CONFIDENCE = ['sure', 'probably'];
export const FACETS = ['writing', 'reading', 'meaning', 'class', 'kanji-reading', 'form'];
export const FORM_KEYS = [
  ['polite', 'Polite (〜ます)'],
  ['negative', 'Negative (〜ない)'],
  ['past', 'Past (〜た)'],
  ['te', 'Te-form (〜て)'],
  ['potential', 'Potential (〜られる / 〜える)'],
  ['passive', 'Passive (〜られる / 〜れる)'],
  ['causative', 'Causative (〜させる / 〜せる)'],
  ['causative-passive', 'Causative-passive (〜させられる)'],
  ['volitional', 'Volitional (〜よう / 〜おう)'],
  ['imperative', 'Imperative (〜ろ / 〜え)'],
  ['conditional-ba', 'Conditional (〜ば)'],
  ['conditional-tara', 'Conditional (〜たら)'],
  ['desire-tai', 'Desire (〜たい)'],
  ['progressive-teiru', 'Progressive (〜ている)'],
];

export function emptyData() {
  return {
    version: VERSION,
    kanji: [], words: [], grammar: [], sentences: [], notes: [],
    relations: [], ratings: [], tags: [], imports: [],
    meta: {},
  };
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

// For search and matching: width, case, surrounding space, and katakana vs hiragana ignored.
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function makeRef(kind, id) {
  return `${kind}:${id}`;
}

export function parseRef(ref) {
  const i = String(ref).indexOf(':');
  return { kind: ref.slice(0, i), id: ref.slice(i + 1) };
}

export function refOf(kind, unit) {
  return makeRef(kind, unit.id);
}

export function getUnit(data, ref) {
  const { kind, id } = parseRef(ref);
  return data[COLLECTION[kind]]?.find((u) => u.id === id);
}

export function allUnits(data, kind) {
  const kinds = kind ? [kind] : KINDS;
  return kinds.flatMap((k) => data[COLLECTION[k]].map((unit) => ({ kind: k, unit, ref: makeRef(k, unit.id) })));
}

// Text shown for a unit in lists and pickers.
export function unitLabel(data, ref) {
  const { kind } = parseRef(ref);
  const u = getUnit(data, ref);
  if (!u) return '?';
  switch (kind) {
    case 'kanji': return u.char;
    case 'word': return firstWriting(u) || u.reading || '?';
    case 'grammar': return u.title;
    case 'sentence': return u.text;
    case 'note': return u.text;
    case 'relation': return u.type;
    default: return '?';
  }
}

export function firstWriting(word) {
  return Array.isArray(word.writings) ? word.writings[0]?.text ?? '' : '';
}

export function visibleMeanings(unit) {
  return (unit.meanings ?? []).filter((m) => !m.hidden);
}
