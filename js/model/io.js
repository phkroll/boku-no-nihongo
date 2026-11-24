// Export, restore (replace everything) and merge import (add to what's there).
import { COLLECTION, KINDS, UNKNOWN, firstWriting, getUnit, makeRef, newId, normalize, nowIso, parseRef } from './data.js';
import { migrate } from './migrate.js';
import { findRelation } from './relations.js';
import { targetKey } from './ratings.js';

export function exportJson(data, now = nowIso()) {
  data.meta = { ...data.meta, lastExport: now };
  return JSON.stringify(data, null, 2);
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
      summary[fillMissing(match, u, partMap, tagMap) ? 'updated' : 'skipped'] += 1;
    }
  }

  const mapRef = (ref) => (ref === UNKNOWN ? UNKNOWN : unitMap.get(ref) ?? (getUnit(data, ref) ? ref : undefined));
  for (const [kind, u] of fresh) remapUnit(kind, u, { mapRef, partMap, tagMap });

  const relationMap = new Map();
  for (const r of incoming.relations) {
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
function fillMissing(local, incoming, partMap, tagMap) {
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
