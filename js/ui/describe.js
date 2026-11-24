// Readable text for refs, relations and rating targets.
import { FORM_KEYS, UNKNOWN, getUnit, parseRef, unitLabel } from '../model/data.js';
import { KIND_UI } from './kinds.js';
import { h, jp } from './dom.js';

export const RELATION_LABEL = {
  'looks-similar': 'Looks similar',
  'similar-meaning': 'Similar meaning',
  'transitivity-pair': 'Intransitive / transitive',
  'politeness-variant': 'Politeness variant',
  related: 'Related',
  confuses: 'I mix these up',
  'kanji-in-word': 'Kanji in word',
  'same-writing': 'Same writing',
  'same-reading': 'Same reading',
  'shared-gloss': 'Shared meaning',
  'in-sentence': 'In sentence',
  'reading-used': 'Reading used',
};

export const FORM_LABEL = Object.fromEntries(FORM_KEYS);
export const FACET_LABEL = { writing: 'writing', reading: 'reading', meaning: 'meaning', class: 'word class', 'kanji-reading': 'kanji reading', form: 'form' };

export function hrefOf(ref) {
  return parseRef(ref).kind === 'relation' ? `#/relation/${encodeURIComponent(parseRef(ref).id)}` : `#/u/${encodeURIComponent(ref)}`;
}

export function refLink(data, ref) {
  if (ref === UNKNOWN) return h('span', { class: 'muted' }, '? (unknown)');
  if (!getUnit(data, ref)) return h('span', { class: 'muted' }, '(deleted)');
  return h('a', { href: hrefOf(ref), class: 'ref' }, jp(unitLabel(data, ref)));
}

export function kindLabel(ref) {
  return KIND_UI[parseRef(ref).kind]?.label ?? 'Relation';
}

export function formText(form = []) {
  return form.length ? form.map((f) => f).join(' + ') : 'dictionary form';
}

export function describeTarget(data, target) {
  const unit = getUnit(data, target.unit);
  const parts = [];
  if (target.from || target.to) parts.push(`${FACET_LABEL[target.from] ?? '?'} → ${FACET_LABEL[target.to] ?? '?'}`);
  if (target.meaningId) parts.push(`meaning “${unit?.meanings?.find((m) => m.id === target.meaningId)?.gloss ?? '?'}”`);
  if (target.readingId) parts.push(`reading ${unit?.readings?.find((r) => r.id === target.readingId)?.kana ?? '?'}`);
  if (target.form) parts.push(`form ${formText(target.form)}`);
  if (target.members) parts.push(`tell apart ${target.members.map((m) => unitLabel(data, m)).join(' → ')}`);
  return parts.length ? parts.join(' · ') : parseRef(target.unit).kind === 'relation' ? 'knows they belong together' : 'overall';
}

export function ratingText(r) {
  return [r.value, r.confidence === 'probably' ? 'probably' : '', r.source !== 'learner' ? `(${r.source})` : ''].filter(Boolean).join(' ');
}
