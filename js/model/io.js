// Export, restore (replace everything) and merge import (add to what's there).
import { COLLECTION, KINDS, UNKNOWN, firstWriting, getUnit, makeRef, newId, normalize, nowIso, parseRef } from './data.js';
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

const NATURAL_KEY = {
  kanji: (u) => u.char,
  word: (u) => `${normalize(firstWriting(u))}|${normalize(u.reading)}`,
  grammar: (u) => (u.formKey ? `form:${u.formKey}` : normalize(u.title)),
  sentence: (u) => normalize(u.text),
  note: (u) => normalize(u.text),
};

// Lists combined on a match: list name → key of one item.
const LIST_KEYS = {
  readings: (r) => `${r.kana}|${r.type}`,
  meanings: (m) => normalize(m.gloss),
  writings: (w) => normalize(w.text),
};
// Reference lists: taken over only when the existing unit has none.
const TAKE_IF_MISSING = ['kanjiUses', 'uses', 'grammarIds', 'refs'];
const OWN = new Set(['id', 'created', 'updated', 'origin', 'importId', 'tagIds', ...Object.keys(LIST_KEYS), ...TAKE_IF_MISSING]);

const clone = (v) => structuredClone(v);

export function mergeImport(data, incomingRaw, { file = '', now = nowIso() } = {}) {
  const incoming = migrate(clone(incomingRaw));
  const record = { id: newId(), file, at: now };
  const summary = { added: 0, updated: 0, skipped: 0 };
  const unitMap = new Map(); // incoming ref → local ref
  const partMap = new Map(); // incoming meaning/reading id → local id
  const tagMap = new Map();
  const fresh = []; // [kind, unit] added from this import
  const copiedLists = []; // [kind, local unit, list names] taken over from the file

  for (const tag of incoming.tags) {
    const found = data.tags.find((t) => normalize(t.name) === normalize(tag.name));
    if (found) tagMap.set(tag.id, found.id);
    else {
      data.tags.push({ ...tag });
      tagMap.set(tag.id, tag.id);
      summary.added += 1;
    }
  }

  for (const kind of KINDS) {
    const local = data[COLLECTION[kind]];
    for (const u of incoming[COLLECTION[kind]]) {
      const match = local.find((x) => x.id === u.id) ?? local.find((x) => NATURAL_KEY[kind](x) === NATURAL_KEY[kind](u));
      if (!match) {
        const added = { ...u, importId: record.id };
        local.push(added);
        fresh.push([kind, added]);
        unitMap.set(makeRef(kind, u.id), makeRef(kind, u.id));
        summary.added += 1;
        continue;
      }
      unitMap.set(makeRef(kind, u.id), makeRef(kind, match.id));
      const copied = [];
      summary[fillMissing(match, u, partMap, tagMap, copied) ? 'updated' : 'skipped'] += 1;
      if (copied.length) copiedLists.push([kind, match, copied]);
    }
  }

  const mapRef = (ref) => (ref === UNKNOWN ? UNKNOWN : unitMap.get(ref) ?? (getUnit(data, ref) ? ref : undefined));
  for (const [kind, u] of fresh) remapUnit(kind, u, { mapRef, partMap, tagMap });
  for (const [kind, u, lists] of copiedLists) {
    const part = Object.fromEntries(lists.map((k) => [k, u[k]]));
    remapUnit(kind, part, { mapRef, partMap, tagMap });
    Object.assign(u, part);
  }

  const relationMap = new Map();
  for (const r of incoming.relations) {
    const sameId = data.relations.find((x) => x.id === r.id);
    if (sameId) {
      relationMap.set(makeRef('relation', r.id), makeRef('relation', sameId.id));
      if (!sameId.notes && r.notes) sameId.notes = r.notes;
      continue;
    }
    const members = r.members.map(mapRef).filter(Boolean);
    const real = members.filter((m) => m !== UNKNOWN);
    if (real.length < 2 && !(real.length === 1 && members.includes(UNKNOWN))) continue;
    const existing = findRelation(data, r.type, members);
    if (existing) {
      relationMap.set(makeRef('relation', r.id), makeRef('relation', existing.id));
      if (!existing.notes && r.notes) existing.notes = r.notes;
      continue;
    }
    const added = { ...r, members, importId: record.id };
    if (r.direction) added.direction = r.direction.map(mapRef).filter(Boolean);
    data.relations.push(added);
    relationMap.set(makeRef('relation', r.id), makeRef('relation', r.id));
    summary.added += 1;
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
    if (seen.has(key)) continue;
    seen.add(key);
    data.ratings.push({ ...r, target: t, importId: record.id });
    summary.added += 1;
  }

  data.imports.push(record);
  return summary;
}

// Fills fields the local unit lacks and combines lists. Returns whether anything changed.
function fillMissing(local, incoming, partMap, tagMap, copied) {
  let changed = false;
  for (const [k, v] of Object.entries(incoming)) {
    if (OWN.has(k) || k in local) continue;
    local[k] = clone(v);
    changed = true;
  }
  for (const [list, keyOf] of Object.entries(LIST_KEYS)) {
    if (!Array.isArray(incoming[list])) continue;
    if (!Array.isArray(local[list])) local[list] = [];
    for (const item of incoming[list]) {
      const same = local[list].find((x) => keyOf(x) === keyOf(item));
      if (same) {
        if (item.id && same.id) partMap.set(item.id, same.id);
        continue;
      }
      local[list].push(clone(item));
      changed = true;
    }
  }
  for (const list of TAKE_IF_MISSING) {
    if (incoming[list]?.length && !local[list]?.length) {
      local[list] = clone(incoming[list]);
      copied.push(list);
      changed = true;
    }
  }
  const tags = (incoming.tagIds ?? []).map((t) => tagMap.get(t)).filter(Boolean);
  const merged = [...new Set([...(local.tagIds ?? []), ...tags])];
  if (merged.length !== (local.tagIds ?? []).length) {
    local.tagIds = merged;
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
    u.uses = (u.uses ?? []).map((use) => {
      if (!use.wordId) return use;
      const id = idOf('word', use.wordId);
      return id ? { ...use, wordId: id } : { text: use.text ?? '?', ...(use.form ? { form: use.form } : {}) };
    });
    if (u.grammarIds) u.grammarIds = u.grammarIds.map((g) => idOf('grammar', g)).filter(Boolean);
  }
  if (kind === 'note' && u.refs) u.refs = u.refs.map(mapRef).filter(Boolean);
}
