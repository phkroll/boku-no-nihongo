// Export, restore (replace everything) and merge import (add to what's there).
import { COLLECTION, KINDS, UNKNOWN, getUnit, makeRef, newId, normalize, nowIso, parseRef } from './data.js';
import { migrate } from './migrate.js';
import { findRelation } from './relations.js';
import { targetKey } from './ratings.js';

// The file records its export date; the data only counts as backed up after markExported.
export function exportJson(data, now = nowIso()) {
  return JSON.stringify({ ...data, meta: { ...data.meta, lastExport: now } }, null, 2);
}

export function markExported(data, now = nowIso()) {
  data.meta = { ...data.meta, lastExport: now };
}

export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Not a Boku no Nihongo file');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Not a Boku no Nihongo file');
  return migrate(raw);
}

// Restore replaces everything, so it refuses files that would leave an empty notebook.
export function parseRestore(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Not a Boku no Nihongo file');
  }
  if (raw?.version === 1) throw new Error('This backup is from an older app version and cannot be restored');
  const data = parseBackup(text);
  const own = KINDS.reduce((n, k) => n + data[COLLECTION[k]].filter((u) => u.origin?.kind !== 'reference').length, 0);
  if (own === 0) throw new Error('This file has no entries; nothing restored');
  return data;
}

// ---- Merge import -------------------------------------------------------------------------
// Imported data never overwrites: it fills empty fields and adds missing parts. Contradictions,
// possible duplicates and things to check are reported (and kept with the import record).

const isGenerated = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/.test(String(id));
const writingSet = (w) => new Set((Array.isArray(w.writings) ? w.writings : []).map((x) => normalize(x.text)).filter(Boolean));
const glossKey = (g) => normalize(g).replace(/^to /, '').replace(/[.!?。]$/, '');
const splitGloss = (g) => String(g).split(/[,;、]/).map(glossKey).filter(Boolean);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// How an incoming word relates to a local one: 'strong' (shares a writing, readings don't contradict),
// 'candidate' (same reading, one side has no writing), or 'no'.
function wordFit(local, incoming) {
  const wl = writingSet(local);
  const wi = writingSet(incoming);
  const rl = normalize(local.reading);
  const ri = normalize(incoming.reading);
  const shared = [...wi].some((t) => wl.has(t));
  if (shared && (rl === ri || !rl || !ri)) return 'strong';
  if (ri && rl === ri && (wi.size === 0 || wl.size === 0)) return 'candidate';
  return 'no';
}

const SAME_CONTENT = {
  kanji: (a, b) => a.char === b.char,
  word: (a, b) => wordFit(a, b) !== 'no',
  grammar: (a, b) => (a.formKey && a.formKey === b.formKey) || normalize(a.title) === normalize(b.title),
  sentence: (a, b) => normalize(a.text) === normalize(b.text),
  note: (a, b) => normalize(a.text) === normalize(b.text),
};

// → { match } or { candidates } (several possible matches) or {}.
function findMatch(kind, local, u) {
  const byId = local.find((x) => x.id === u.id);
  if (byId && (SAME_CONTENT[kind](byId, u) || isGenerated(u.id))) return { match: byId };
  if (kind === 'word') {
    const fits = local.filter((x) => wordFit(x, u) !== 'no');
    if (fits.length === 1) return { match: fits[0] };
    return fits.length > 1 ? { candidates: fits } : {};
  }
  const found = local.find((x) => x !== byId && SAME_CONTENT[kind](x, u));
  return found ? { match: found } : {};
}

// Reference lists: taken over only when the existing unit has none; a different list is reported.
const TAKE_IF_MISSING = ['kanjiUses', 'uses', 'grammarIds', 'refs'];
const LISTS = ['readings', 'meanings', 'writings'];
const NOT_COMPARED = new Set(['id', 'created', 'updated', 'origin', 'importId', 'tagIds', ...LISTS, ...TAKE_IF_MISSING]);

const clone = (v) => structuredClone(v);

export function mergeImport(data, incomingRaw, { file = '', now = nowIso() } = {}) {
  if (incomingRaw?.version === 1) throw new Error('This file is from an older app version and cannot be added');
  const incoming = migrate(clone(incomingRaw));
  const record = { id: newId(), file, at: now };
  const report = { added: 0, updated: 0, skipped: 0, conflicts: [], duplicates: [], checks: [] };
  const unitMap = new Map(); // incoming ref → local ref
  const partMap = new Map(); // incoming meaning/reading id → local id
  const tagMap = new Map();
  const fresh = []; // [kind, unit] added from this import
  const lists = []; // [kind, local unit, list name, incoming list, taken over?]

  for (const tag of incoming.tags) {
    const found = data.tags.find((t) => normalize(t.name) === normalize(tag.name));
    if (found) {
      tagMap.set(tag.id, found.id);
      report.skipped += 1;
    } else {
      data.tags.push({ ...tag });
      tagMap.set(tag.id, tag.id);
      report.added += 1;
    }
  }

  for (const kind of KINDS) {
    const local = data[COLLECTION[kind]];
    for (const u of incoming[COLLECTION[kind]]) {
      const { match, candidates } = findMatch(kind, local, u);
      if (!match) {
        const id = local.some((x) => x.id === u.id) ? newId() : u.id;
        const added = { ...u, id, importId: record.id };
        local.push(added);
        fresh.push([kind, added]);
        unitMap.set(makeRef(kind, u.id), makeRef(kind, id));
        if (candidates) report.duplicates.push({ ref: makeRef(kind, id), candidates: candidates.map((c) => makeRef(kind, c.id)) });
        report.added += 1;
        continue;
      }
      const ref = makeRef(kind, match.id);
      unitMap.set(makeRef(kind, u.id), ref);
      const changed = fillMissing(match, u, { ref, partMap, tagMap, report });
      for (const list of TAKE_IF_MISSING) {
        if (!u[list]?.length) continue;
        const take = !match[list]?.length;
        if (take) match[list] = clone(u[list]);
        lists.push([kind, match, list, clone(u[list]), take]);
      }
      report[changed || lists.some((l) => l[1] === match && l[4]) ? 'updated' : 'skipped'] += 1;
    }
  }

  const mapRef = (ref) => (ref === UNKNOWN ? UNKNOWN : unitMap.get(ref) ?? (getUnit(data, ref) ? ref : undefined));
  for (const [kind, u] of fresh) remapUnit(kind, u, { mapRef, partMap, tagMap });
  for (const [kind, u, list, theirs, taken] of lists) {
    const part = remapUnit(kind, { [list]: theirs }, { mapRef, partMap, tagMap });
    if (taken) u[list] = part[list];
    else if (!same(u[list], part[list])) report.conflicts.push({ ref: makeRef(kind, u.id), field: list, mine: u[list], theirs: part[list] });
  }

  const relationMap = new Map();
  for (const r of incoming.relations) {
    const sameId = data.relations.find((x) => x.id === r.id);
    if (sameId) {
      relationMap.set(makeRef('relation', r.id), makeRef('relation', sameId.id));
      report[fillNotes(sameId, r) ? 'updated' : 'skipped'] += 1;
      continue;
    }
    const members = r.members.map(mapRef).filter(Boolean);
    const real = members.filter((m) => m !== UNKNOWN);
    if (real.length < 2 && !(real.length === 1 && members.includes(UNKNOWN))) continue;
    const existing = findRelation(data, r.type, members);
    if (existing) {
      relationMap.set(makeRef('relation', r.id), makeRef('relation', existing.id));
      report[fillNotes(existing, r) ? 'updated' : 'skipped'] += 1;
      continue;
    }
    const overlapping = data.relations.filter((x) => x.type === r.type && x.members.filter((m) => m !== UNKNOWN && real.includes(m)).length >= 2);
    const added = { ...r, members, importId: record.id };
    if (r.direction) added.direction = r.direction.map(mapRef).filter(Boolean);
    data.relations.push(added);
    relationMap.set(makeRef('relation', r.id), makeRef('relation', r.id));
    for (const o of overlapping) report.checks.push({ refs: [makeRef('relation', r.id), makeRef('relation', o.id)], reason: 'groups overlap' });
    report.added += 1;
  }

  const seen = new Set(data.ratings.map((r) => `${targetKey(r.target)}@${r.at}=${r.value}`));
  for (const r of incoming.ratings) {
    const t = { ...r.target };
    t.unit = parseRef(t.unit).kind === 'relation' ? relationMap.get(t.unit) : mapRef(t.unit);
    if (!t.unit) continue;
    if (t.members) t.members = t.members.map(mapRef);
    if (t.members?.some((m) => !m)) continue;
    if (t.meaningId) t.meaningId = partMap.get(t.meaningId) ?? t.meaningId;
    if (t.readingId) t.readingId = partMap.get(t.readingId) ?? t.readingId;
    const key = `${targetKey(t)}@${r.at}=${r.value}`;
    if (seen.has(key)) {
      report.skipped += 1;
      continue;
    }
    seen.add(key);
    data.ratings.push({ ...r, target: t, importId: record.id });
    report.added += 1;
  }

  record.report = { conflicts: report.conflicts, duplicates: report.duplicates, checks: report.checks };
  data.imports.push(record);
  return report;
}

function fillNotes(local, incoming) {
  if (local.notes || !incoming.notes) return false;
  local.notes = incoming.notes;
  return true;
}

// Fills fields the local unit lacks, combines readings / meanings / writings, reports contradictions.
function fillMissing(local, incoming, { ref, partMap, tagMap, report }) {
  let changed = false;
  for (const [k, v] of Object.entries(incoming)) {
    if (NOT_COMPARED.has(k)) continue;
    if (!(k in local)) {
      local[k] = clone(v);
      changed = true;
    } else if (!same(local[k], v)) {
      report.conflicts.push({ ref, field: k, mine: local[k], theirs: v });
    }
  }
  changed = mergeReadings(local, incoming, partMap) || changed;
  changed = mergeMeanings(local, incoming, { ref, partMap, report }) || changed;
  changed = mergeWritings(local, incoming, { ref, report }) || changed;
  const tags = (incoming.tagIds ?? []).map((t) => tagMap.get(t)).filter(Boolean);
  const merged = [...new Set([...(local.tagIds ?? []), ...tags])];
  if (merged.length !== (local.tagIds ?? []).length) {
    local.tagIds = merged;
    changed = true;
  }
  return changed;
}

// Same kana with one type "unknown" is the same reading; the known type wins.
function mergeReadings(local, incoming, partMap) {
  if (!Array.isArray(incoming.readings)) return false;
  let changed = false;
  local.readings ??= [];
  for (const r of incoming.readings) {
    const same = local.readings.find((x) => x.kana === r.kana && (x.type === r.type || x.type === UNKNOWN || r.type === UNKNOWN));
    if (same) {
      if (same.type === UNKNOWN && r.type !== UNKNOWN) {
        same.type = r.type;
        changed = true;
      }
      if (r.id && same.id) partMap.set(r.id, same.id);
      continue;
    }
    local.readings.push(clone(r));
    changed = true;
  }
  return changed;
}

// Identical glosses are the same meaning; similar ones ("to sleep" / "sleep", "Moon, month" / "moon") are added and reported.
function mergeMeanings(local, incoming, { ref, partMap, report }) {
  if (!Array.isArray(incoming.meanings)) return false;
  let changed = false;
  local.meanings ??= [];
  for (const m of incoming.meanings) {
    const same = local.meanings.find((x) => normalize(x.gloss) === normalize(m.gloss));
    if (same) {
      if (m.id && same.id) partMap.set(m.id, same.id);
      continue;
    }
    const similar = local.meanings.find((x) => !x.hidden && (glossKey(x.gloss) === glossKey(m.gloss)
      || splitGloss(x.gloss).includes(glossKey(m.gloss)) || splitGloss(m.gloss).includes(glossKey(x.gloss))));
    local.meanings.push(clone(m));
    if (similar) report.checks.push({ refs: [ref], reason: `similar meanings “${similar.gloss}” and “${m.gloss}”` });
    changed = true;
  }
  return changed;
}

function mergeWritings(local, incoming, { ref, report }) {
  if (incoming.writings === undefined) return false;
  if (!Array.isArray(local.writings) || !Array.isArray(incoming.writings)) {
    if (local.writings === undefined) {
      local.writings = clone(incoming.writings);
      return true;
    }
    if (!same(local.writings, incoming.writings)) report.conflicts.push({ ref, field: 'writings', mine: local.writings, theirs: incoming.writings });
    return false;
  }
  let changed = false;
  for (const w of incoming.writings) {
    if (local.writings.some((x) => normalize(x.text) === normalize(w.text))) continue;
    local.writings.push(clone(w));
    changed = true;
  }
  return changed;
}

function remapUnit(kind, u, { mapRef, partMap, tagMap }) {
  if (u.tagIds) u.tagIds = u.tagIds.map((t) => tagMap.get(t)).filter(Boolean);
  const idOf = (k, id) => {
    const ref = mapRef(makeRef(k, id));
    return ref ? parseRef(ref).id : undefined;
  };
  if (kind === 'word') {
    for (const use of u.kanjiUses ?? []) if (use.readingId) use.readingId = partMap.get(use.readingId) ?? use.readingId;
  }
  if (kind === 'sentence') {
    if (u.uses) {
      u.uses = u.uses.map((use) => {
        if (!use.wordId) return use;
        const id = idOf('word', use.wordId);
        return id ? { ...use, wordId: id } : { text: use.text ?? '?', ...(use.form ? { form: use.form } : {}) };
      });
    }
    if (u.grammarIds) u.grammarIds = u.grammarIds.map((g) => idOf('grammar', g)).filter(Boolean);
  }
  if (kind === 'note' && u.refs) u.refs = u.refs.map(mapRef).filter(Boolean);
  return u;
}
