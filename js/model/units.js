// Create, change and delete units (kanji, words, grammar points, sentences, notes) and their parts.
import { COLLECTION, getUnit, newId, nowIso, normalize, parseRef } from './data.js';
import { removeUnitReferences, clearReadingUses } from './relations.js';

const trimmed = (v) => (typeof v === 'string' ? v.trim() : v);

const CHECKS = {
  kanji(u, data) {
    if (!u.char || [...u.char].length !== 1) throw new Error('A kanji needs a character (exactly one)');
    if (data.kanji.some((k) => k.char === u.char && k.id !== u.id)) throw new Error(`kanji ${u.char} exists`);
  },
  word(u) {
    const hasWriting = Array.isArray(u.writings) && u.writings.some((w) => w.text?.trim());
    if (!hasWriting && !u.reading) throw new Error('A word needs a writing or a reading');
  },
  grammar(u) {
    if (!u.title) throw new Error('A grammar point needs a title');
  },
  sentence(u) {
    if (!u.text) throw new Error('A sentence needs a text');
  },
  note(u) {
    if (!u.text) throw new Error('A note needs a text');
  },
};

function clean(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    const t = trimmed(v);
    if (t === '' || t === undefined) continue;
    out[k] = t;
  }
  return out;
}

export function addUnit(data, kind, fields, { id = newId(), now = nowIso(), origin, importId } = {}) {
  const unit = {
    ...clean(fields),
    id,
    origin: origin ?? fields.origin ?? { kind: 'learner' },
    created: now,
    updated: now,
  };
  if (importId) unit.importId = importId;
  CHECKS[kind](unit, data);
  data[COLLECTION[kind]].push(unit);
  return unit;
}

// Merges fields; a field set to '' or undefined is removed (back to "missing"). Other fields are kept.
export function updateUnit(data, ref, fields, { now = nowIso() } = {}) {
  const { kind } = parseRef(ref);
  const unit = getUnit(data, ref);
  if (!unit) throw new Error(`Not found: ${ref}`);
  const next = { ...unit };
  for (const [k, v] of Object.entries(fields)) {
    const t = trimmed(v);
    if (t === '' || t === undefined) delete next[k];
    else next[k] = t;
  }
  next.id = unit.id;
  next.created = unit.created;
  next.updated = now;
  CHECKS[kind](next, data);
  for (const k of Object.keys(unit)) if (!(k in next)) delete unit[k];
  Object.assign(unit, next);
  return unit;
}

export function deleteUnit(data, ref) {
  const { kind, id } = parseRef(ref);
  const list = COLLECTION[kind];
  data[list] = data[list].filter((u) => u.id !== id);
  removeUnitReferences(data, ref);
}

export function addMeaning(unit, { gloss, usage, unsplit }) {
  const g = String(gloss ?? '').trim();
  if (!g) throw new Error('A meaning needs a gloss');
  const meaning = { id: newId(), gloss: g };
  if (usage?.trim()) meaning.usage = usage.trim();
  if (unsplit) meaning.unsplit = true;
  (unit.meanings ??= []).push(meaning);
  return meaning;
}

// Keeps the old meaning (hidden) so ratings that point at it stay valid.
export function splitMeaning(unit, meaningId, glosses) {
  const old = unit.meanings?.find((m) => m.id === meaningId);
  if (!old) throw new Error('Meaning not found');
  const parts = glosses.map((g) => String(g).trim()).filter(Boolean).map((gloss) => addMeaning(unit, { gloss }));
  old.hidden = true;
  old.splitInto = parts.map((p) => p.id);
  return parts;
}

export function deleteMeaning(data, ref, meaningId) {
  const unit = getUnit(data, ref);
  unit.meanings = (unit.meanings ?? []).filter((m) => m.id !== meaningId);
  data.ratings = data.ratings.filter((r) => !(r.target.unit === ref && r.target.meaningId === meaningId));
}

export function addReading(kanji, { kana, type }) {
  const k = String(kana ?? '').trim();
  if (!k) throw new Error('A reading needs kana');
  const existing = kanji.readings?.find((r) => r.kana === k && r.type === type);
  if (existing) return existing;
  const reading = { id: newId(), kana: k, type: type || 'unknown' };
  (kanji.readings ??= []).push(reading);
  return reading;
}

export function deleteReading(data, ref, readingId) {
  const kanji = getUnit(data, ref);
  kanji.readings = (kanji.readings ?? []).filter((r) => r.id !== readingId);
  data.ratings = data.ratings.filter((r) => r.target.readingId !== readingId);
  clearReadingUses(data, readingId);
}

export function sameText(a, b) {
  return normalize(a) === normalize(b);
}
