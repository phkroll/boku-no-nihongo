// Relations the app works out from the data; never stored.
import { makeRef, normalize, parseRef, getUnit, visibleMeanings } from './data.js';

const writingsOf = (w) => (Array.isArray(w.writings) ? w.writings.map((x) => x.text).filter(Boolean) : []);
const glossKey = (g) => normalize(g).replace(/^to /, '');
const wordRef = (w) => makeRef('word', w.id);

function splitGlosses(unit) {
  return visibleMeanings(unit).filter((m) => !m.unsplit).map((m) => glossKey(m.gloss));
}

function forKanji(data, ref, k) {
  const out = [];
  const readingIds = new Set((k.readings ?? []).map((r) => r.id));
  for (const w of data.words) {
    if (writingsOf(w).some((t) => t.includes(k.char))) out.push({ type: 'kanji-in-word', refs: [ref, wordRef(w)] });
    for (const use of w.kanjiUses ?? []) {
      if (use.readingId && readingIds.has(use.readingId)) out.push({ type: 'reading-used', refs: [ref, wordRef(w)], detail: use.reading });
    }
  }
  return out;
}

function forWord(data, ref, w) {
  const out = [];
  const writings = writingsOf(w);
  const chars = new Set(writings.flatMap((t) => [...t]));
  for (const k of data.kanji) if (chars.has(k.char)) out.push({ type: 'kanji-in-word', refs: [makeRef('kanji', k.id), ref] });
  const glosses = new Set(splitGlosses(w));
  for (const o of data.words) {
    if (o.id === w.id) continue;
    const oRef = wordRef(o);
    if (writingsOf(o).some((t) => writings.includes(t))) out.push({ type: 'same-writing', refs: [ref, oRef] });
    if (w.reading && o.reading && normalize(w.reading) === normalize(o.reading)) out.push({ type: 'same-reading', refs: [ref, oRef] });
    for (const g of splitGlosses(o)) if (glosses.has(g)) out.push({ type: 'shared-gloss', refs: [ref, oRef], detail: g });
  }
  for (const s of data.sentences) {
    if ((s.uses ?? []).some((u) => u.wordId === w.id)) out.push({ type: 'in-sentence', refs: [ref, makeRef('sentence', s.id)] });
  }
  return out;
}

function forGrammar(data, ref, g) {
  return data.sentences
    .filter((s) => (s.grammarIds ?? []).includes(g.id))
    .map((s) => ({ type: 'in-sentence', refs: [ref, makeRef('sentence', s.id)] }));
}

function forSentence(data, ref, s) {
  const words = (s.uses ?? []).filter((u) => u.wordId).map((u) => ({ type: 'in-sentence', refs: [makeRef('word', u.wordId), ref], detail: (u.form ?? []).join(' · ') }));
  const grammar = (s.grammarIds ?? []).map((id) => ({ type: 'in-sentence', refs: [makeRef('grammar', id), ref] }));
  return [...words, ...grammar].filter((r) => getUnit(data, r.refs[0]));
}

const BY_KIND = { kanji: forKanji, word: forWord, grammar: forGrammar, sentence: forSentence };

export function calculatedRelations(data, ref) {
  const unit = getUnit(data, ref);
  const fn = BY_KIND[parseRef(ref).kind];
  return unit && fn ? fn(data, ref, unit) : [];
}
