// The questions "What I know" offers per entry. Each maps to a rating target of the model;
// nothing here is stored. No DOM, so it runs in Node tests.
import { UNKNOWN, firstWriting, getUnit, makeRef, parseRef, unitLabel, visibleMeanings } from '../model/data.js';
import { relationsOf } from '../model/relations.js';
import { currentRatings, targetKey } from '../model/ratings.js';

const q = (key, label, hint, target) => ({ key, label, hint, target });

function wordQuestions(ref, w) {
  const writing = Array.isArray(w.writings) && w.writings.length > 0 ? firstWriting(w) : '';
  const said = w.reading || 'reading';
  const meanings = visibleMeanings(w);
  return [
    writing && q('read', 'Read it', `${writing} → ${said}`, { unit: ref, from: 'writing', to: 'reading' }),
    writing && q('understand-written', 'Understand it written', `${writing} → meaning`, { unit: ref, from: 'writing', to: 'meaning' }),
    q('understand-heard', 'Understand it heard', `${said} → meaning`, { unit: ref, from: 'reading', to: 'meaning' }),
    q('say', 'Say it', `meaning → ${said}`, { unit: ref, from: 'meaning', to: 'reading' }),
    writing && q('write', 'Write it in kanji', `meaning → ${writing}`, { unit: ref, from: 'meaning', to: 'writing' }),
    q('class', 'Know its word class', 'e.g. that it is a ru-verb or na-adjective (the class itself is set on the entry)', { unit: ref, to: 'class' }),
    writing && q('recognise', 'Recognise it written', 'unclear whether reading or meaning', { unit: ref, from: 'writing' }),
    ...(meanings.length > 1 ? meanings.map((m) => q(`meaning:${m.id}`, `Meaning “${m.gloss}”`, '', { unit: ref, to: 'meaning', meaningId: m.id })) : []),
    { ...q('form', 'A form', 'e.g. casual past', { unit: ref }), needsForm: true },
  ];
}

function kanjiQuestions(ref, k) {
  const meanings = visibleMeanings(k);
  const readings = k.readings ?? [];
  return [
    q('meaning', 'Meaning', `${k.char} → meaning`, { unit: ref, to: 'meaning' }),
    q('readings', 'Readings', `${k.char} → readings`, { unit: ref, to: 'reading' }),
    q('recognise-from-meaning', 'Recognise from its meaning', `meaning → ${k.char}`, { unit: ref, from: 'meaning', to: 'writing' }),
    ...(meanings.length > 1 ? meanings.map((m) => q(`meaning:${m.id}`, `Meaning “${m.gloss}”`, '', { unit: ref, to: 'meaning', meaningId: m.id })) : []),
    ...(readings.length > 1 ? readings.map((r) => q(`reading:${r.id}`, `Reading ${r.kana}`, r.type, { unit: ref, to: 'reading', readingId: r.id })) : []),
  ];
}

const OWN = {
  word: wordQuestions,
  kanji: kanjiQuestions,
  grammar: (ref, g) => [
    q('understand', 'Understand the pattern', `${g.pattern || g.title} → meaning`, { unit: ref, from: 'writing', to: 'meaning' }),
    q('use', 'Use it', 'form it / apply it correctly', { unit: ref, to: 'use' }),
  ],
  sentence: (ref) => [
    q('read', 'Read it', 'sentence → reading', { unit: ref, from: 'writing', to: 'reading' }),
    q('understand', 'Understand it', 'sentence → meaning', { unit: ref, from: 'writing', to: 'meaning' }),
    q('say', 'Say it in Japanese', 'meaning → sentence', { unit: ref, from: 'meaning', to: 'writing' }),
  ],
};

const realMembers = (r) => r.members.filter((m) => m !== UNKNOWN);

// Questions about relations this entry belongs to: tell it apart from each other member; know a group.
function relationQuestions(data, ref) {
  const out = [];
  for (const r of relationsOf(data, ref)) {
    const relRef = makeRef('relation', r.id);
    const others = realMembers(r).filter((m) => m !== ref);
    if (realMembers(r).length > 2) out.push(q(`group:${r.id}`, 'Know the group', realMembers(r).map((m) => unitLabel(data, m)).join(' '), { unit: relRef }));
    for (const m of others) out.push(q(`apart:${r.id}:${m}`, `Tell apart from ${unitLabel(data, m)}`, r.type, { unit: relRef, members: [ref, m] }));
  }
  return out;
}

// Rating a relation directly (from its own page).
function questionsForRelation(data, relRef, r) {
  const members = realMembers(r);
  const out = [q('belong', 'Know they belong together', members.map((m) => unitLabel(data, m)).join(' '), { unit: relRef })];
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      out.push(q(`apart:${r.id}:${members[i]}:${members[j]}`, `Tell ${unitLabel(data, members[i])} and ${unitLabel(data, members[j])} apart`, '', { unit: relRef, members: [members[i], members[j]] }));
    }
  }
  return out;
}

export function questionsFor(data, ref) {
  const { kind } = parseRef(ref);
  const unit = getUnit(data, ref);
  if (!unit) return [];
  if (kind === 'relation') return questionsForRelation(data, ref, unit);
  return [...(OWN[kind]?.(ref, unit) ?? []), ...relationQuestions(data, ref)].filter(Boolean);
}

export function overallRating(data, ref) {
  const key = targetKey({ unit: ref });
  return currentRatings(data, ref).find((r) => r.key === key)?.rating;
}

// Current detailed ratings about an entry, including those on relations it belongs to.
export function detailRatings(data, ref) {
  const questions = new Map(questionsFor(data, ref).map((x) => [targetKey(x.target), x]));
  const overall = targetKey({ unit: ref });
  const own = parseRef(ref).kind === 'relation' ? [] : relationsOf(data, ref)
    .flatMap((r) => currentRatings(data, makeRef('relation', r.id)))
    .filter((x) => !x.target.members || x.target.members.includes(ref));
  return [...currentRatings(data, ref).filter((x) => x.key !== overall || parseRef(ref).kind === 'relation'), ...own]
    .map((x) => ({ ...x, question: questions.get(x.key) }));
}

export function findQuestion(data, ref, key) {
  if (key === 'overall') return q('overall', 'Overall', 'how well I know it in general', { unit: ref });
  if (key?.startsWith('t:')) {
    const found = detailRatings(data, ref).find((x) => x.key === key.slice(2));
    return found ? { key, label: '', hint: '', target: found.target } : undefined;
  }
  return questionsFor(data, ref).find((x) => x.key === key);
}
