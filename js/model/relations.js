// Relations between units (2+ members, or 1 member + UNKNOWN partner), and keeping
// references consistent when units, relations or readings go away.
import { RELATION_TYPES, UNKNOWN, getUnit, makeRef, newId, nowIso, parseRef, unitLabel } from './data.js';

const realMembers = (r) => r.members.filter((m) => m !== UNKNOWN);
const memberKey = (members) => [...members].sort().join('|');
const isValid = (r) => realMembers(r).length >= 2 || (realMembers(r).length === 1 && r.members.includes(UNKNOWN));

export function findRelation(data, type, members) {
  const key = memberKey(members);
  return data.relations.find((r) => r.type === type && memberKey(r.members) === key);
}

export function addRelation(data, { type, members, direction, status, notes, origin = { kind: 'learner' } }, { id = newId(), now = nowIso(), importId } = {}) {
  if (!RELATION_TYPES.includes(type)) throw new Error(`Unknown relation type: ${type}`);
  const unique = [...new Set(members)];
  const relation = { id, type, members: unique, origin, status: status ?? (origin.kind === 'suggested' ? 'proposed' : 'confirmed'), created: now, updated: now };
  if (!isValid(relation)) throw new Error('A relation needs two members (or one and an unknown partner)');
  const existing = findRelation(data, type, unique);
  if (existing) return existing;
  if (direction) relation.direction = direction;
  if (notes?.trim()) relation.notes = notes.trim();
  if (importId) relation.importId = importId;
  data.relations.push(relation);
  return relation;
}

// Changing members also drops a direction or tell-apart ratings that name a removed member.
export function updateRelation(data, id, fields, { now = nowIso() } = {}) {
  const r = data.relations.find((x) => x.id === id);
  if (!r) throw new Error(`Relation not found: ${id}`);
  const next = { ...r, ...fields, id: r.id, updated: now };
  next.members = [...new Set(next.members)];
  if (!isValid(next)) throw new Error('A relation needs two members (or one and an unknown partner)');
  const twin = findRelation(data, next.type, next.members);
  if (twin && twin.id !== r.id) throw new Error('This relation already exists');
  const kept = (m) => next.members.includes(m);
  if (next.direction && !next.direction.every(kept)) delete next.direction;
  const ref = makeRef('relation', r.id);
  data.ratings = data.ratings.filter((x) => x.target.unit !== ref || !x.target.members || x.target.members.every(kept));
  for (const k of Object.keys(r)) if (!(k in next)) delete r[k];
  Object.assign(r, next);
  return r;
}

export function setRelationStatus(data, id, status, opts) {
  return updateRelation(data, id, { status }, opts);
}

export function deleteRelation(data, id) {
  data.relations = data.relations.filter((r) => r.id !== id);
  const ref = makeRef('relation', id);
  data.ratings = data.ratings.filter((r) => r.target.unit !== ref);
}

export function relationsOf(data, ref, { includeRejected = false } = {}) {
  return data.relations.filter((r) => r.members.includes(ref) && (includeRejected || r.status !== 'rejected'));
}

// Called before a unit is removed: nothing may point at it afterwards.
export function removeUnitReferences(data, ref) {
  const { kind, id } = parseRef(ref);
  for (const r of relationsOf(data, ref, { includeRejected: true })) {
    r.members = r.members.filter((m) => m !== ref);
    if (r.direction?.includes(ref)) delete r.direction;
    if (!isValid(r)) deleteRelation(data, r.id);
  }
  data.ratings = data.ratings.filter((r) => r.target.unit !== ref && !(r.target.members ?? []).includes(ref));
  if (kind === 'word') {
    const label = unitLabel(data, ref);
    for (const s of data.sentences) {
      s.uses = (s.uses ?? []).map((u) => (u.wordId === id ? { text: label, ...(u.form ? { form: u.form } : {}) } : u));
    }
  }
  if (kind === 'kanji') for (const r of getUnit(data, ref)?.readings ?? []) clearReadingUses(data, r.id);
  if (kind === 'grammar') for (const s of data.sentences) if (s.grammarIds) s.grammarIds = s.grammarIds.filter((g) => g !== id);
  for (const n of data.notes) if (n.refs) n.refs = n.refs.filter((x) => x !== ref);
}

export function clearReadingUses(data, readingId) {
  for (const w of data.words) for (const use of w.kanjiUses ?? []) if (use.readingId === readingId) delete use.readingId;
}
