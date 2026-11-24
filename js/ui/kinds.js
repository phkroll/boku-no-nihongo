// How each unit kind is shown and edited. Screens are generic and read this.
import { NA, UNKNOWN, VERB_GROUPS, WORD_CLASSES, WRITTEN_AS, firstWriting, visibleMeanings } from '../model/data.js';

const opts = (values, missing = '—') => [['', missing], ...values.map((v) => [v, v])];
const glosses = (u) => visibleMeanings(u).map((m) => m.gloss).join(' · ');

export const KIND_UI = {
  word: {
    label: 'Word',
    plural: 'Words',
    title: (u) => firstWriting(u) || u.reading || '?',
    sub: (u) => [firstWriting(u) && u.reading, glosses(u)].filter(Boolean).join(' · '),
    facets: ['writing', 'reading', 'meaning', 'class', 'kanji-reading', 'form'],
    fields: [
      { key: 'writings', label: 'Writing', type: 'writings', core: true },
      { key: 'reading', label: 'Reading (kana)', type: 'text', ja: true, core: true },
      { key: 'meanings', label: 'Meanings', type: 'meanings' },
      { key: 'wordClass', label: 'Word class', type: 'select', options: opts(WORD_CLASSES) },
      { key: 'verbGroup', label: 'Verb group', type: 'select', options: opts(VERB_GROUPS), when: (d) => d.wordClass === 'verb' },
      { key: 'suru', label: 'する verb (noun + する)', type: 'check', when: (d) => d.wordClass === 'noun' },
      { key: 'usuallyWritten', label: 'Usually written in', type: 'select', options: opts(WRITTEN_AS) },
      { key: 'wholeWordReading', label: 'Reading belongs to the whole word (e.g. 今日 きょう)', type: 'check' },
      { key: 'kanjiUses', label: 'Kanji readings used', type: 'kanjiUses', when: (d) => !d.wholeWordReading },
      { key: 'tagIds', label: 'Tags', type: 'tags' },
      { key: 'source', label: 'Where I met it', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  kanji: {
    label: 'Kanji',
    plural: 'Kanji',
    title: (u) => u.char,
    sub: (u) => [(u.readings ?? []).map((r) => r.kana).join('・'), glosses(u)].filter(Boolean).join(' · '),
    facets: ['writing', 'reading', 'meaning'],
    fields: [
      { key: 'char', label: 'Kanji', type: 'text', ja: true, core: true },
      { key: 'readings', label: 'Readings', type: 'readings' },
      { key: 'meanings', label: 'Meanings', type: 'meanings' },
      { key: 'tagIds', label: 'Tags', type: 'tags' },
      { key: 'source', label: 'Where I met it', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  grammar: {
    label: 'Grammar point',
    plural: 'Grammar',
    title: (u) => u.title,
    sub: (u) => [u.pattern, u.meaning].filter(Boolean).join(' · '),
    facets: ['writing', 'meaning'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', core: true },
      { key: 'pattern', label: 'Pattern', type: 'text', ja: true },
      { key: 'meaning', label: 'Meaning', type: 'text' },
      { key: 'explanation', label: 'Explanation', type: 'textarea' },
      { key: 'appliesTo', label: 'Applies to', type: 'text' },
      { key: 'tagIds', label: 'Tags', type: 'tags' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  sentence: {
    label: 'Sentence',
    plural: 'Sentences',
    title: (u) => u.text,
    sub: (u) => u.translation ?? '',
    facets: ['writing', 'reading', 'meaning'],
    fields: [
      { key: 'text', label: 'Sentence', type: 'textarea', ja: true, core: true },
      { key: 'reading', label: 'Reading', type: 'text', ja: true },
      { key: 'translation', label: 'Translation', type: 'text' },
      { key: 'uses', label: 'Words used', type: 'uses' },
      { key: 'grammarIds', label: 'Grammar used', type: 'grammarIds' },
      { key: 'tagIds', label: 'Tags', type: 'tags' },
      { key: 'source', label: 'Where I met it', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  note: {
    label: 'Note',
    plural: 'Notes',
    title: (u) => u.text,
    sub: (u) => (u.open ? 'open' : ''),
    facets: [],
    fields: [
      { key: 'text', label: 'Note, question or discovery', type: 'textarea', core: true },
      { key: 'open', label: 'Still open', type: 'check' },
      { key: 'refs', label: 'About', type: 'refs' },
      { key: 'tagIds', label: 'Tags', type: 'tags' },
    ],
  },
};

export const TABS = ['word', 'kanji', 'grammar', 'sentence', 'note'];

export const STATE_LABEL = { [UNKNOWN]: 'unknown', [NA]: 'n/a' };
