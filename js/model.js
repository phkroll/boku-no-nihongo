// Pure data logic. No DOM, no storage: everything here runs in Node tests too.

export const KINDS = ['word', 'kanji', 'sentence', 'grammar'];
export const WORD_TYPES = [
  'noun',
  'verb',
  'i-adjective',
  'na-adjective',
  'adverb',
  'pronoun',
  'particle',
  'expression',
  'other',
];

const TEXT_FIELDS = ['text', 'reading', 'meaning', 'notes', 'wordType'];

export function emptyData() {
  return { version: 1, entries: [], tags: [], links: [] };
}

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

export function normalize(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase().trim();
}

function cleanEntry(entry) {
  for (const f of TEXT_FIELDS) entry[f] = String(entry[f] ?? '').trim();
  if (!KINDS.includes(entry.kind)) throw new Error(`Unknown kind: ${entry.kind}`);
  if (!entry.text) throw new Error('An entry needs a text');
  if (entry.kind !== 'word') entry.wordType = '';
  return entry;
}

function knownTagIds(data, tagIds) {
  const known = new Set(data.tags.map((t) => t.id));
  return [...new Set(tagIds ?? [])].filter((id) => known.has(id));
}

export function addEntry(data, fields, { id = newId(), now = nowIso() } = {}) {
  const entry = cleanEntry({ ...fields, id, created: now, updated: now });
  entry.tagIds = knownTagIds(data, entry.tagIds);
  data.entries.push(entry);
  return entry;
}

export function getEntry(data, id) {
  return data.entries.find((e) => e.id === id);
}

export function updateEntry(data, id, fields, { now = nowIso() } = {}) {
  const current = getEntry(data, id);
  if (!current) throw new Error(`Entry not found: ${id}`);
  const next = cleanEntry({ ...current, ...fields, id, created: current.created, updated: now });
  next.tagIds = knownTagIds(data, next.tagIds);
  Object.assign(current, next);
  return current;
}

export function deleteEntry(data, id) {
  data.entries = data.entries.filter((e) => e.id !== id);
  data.links = data.links.filter((l) => l.from !== id && l.to !== id);
}

export function search(data, { query = '', kind = '', tagId = '' } = {}) {
  const q = normalize(query);
  return data.entries
    .filter((e) => !kind || e.kind === kind)
    .filter((e) => !tagId || e.tagIds.includes(tagId))
    .filter((e) => !q || [e.text, e.reading, e.meaning].some((f) => normalize(f).includes(q)))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

function cleanName(name) {
  const clean = String(name ?? '').trim();
  if (!clean) throw new Error('A tag needs a name');
  return clean;
}

export function addTag(data, name, { id = newId() } = {}) {
  const clean = cleanName(name);
  const existing = data.tags.find((t) => normalize(t.name) === normalize(clean));
  if (existing) return existing;
  const tag = { id, name: clean };
  data.tags.push(tag);
  return tag;
}

export function renameTag(data, id, name) {
  const tag = data.tags.find((t) => t.id === id);
  if (!tag) throw new Error(`Tag not found: ${id}`);
  tag.name = cleanName(name);
  return tag;
}

export function deleteTag(data, id) {
  data.tags = data.tags.filter((t) => t.id !== id);
  for (const e of data.entries) e.tagIds = e.tagIds.filter((t) => t !== id);
}

export function addLink(data, from, to, note = '', { id = newId(), now = nowIso() } = {}) {
  if (from === to) throw new Error('An entry cannot link to itself');
  for (const end of [from, to]) {
    if (!getEntry(data, end)) throw new Error(`Entry not found: ${end}`);
  }
  const existing = data.links.find(
    (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from),
  );
  if (existing) return existing;
  const link = { id, from, to, note: String(note ?? '').trim(), created: now };
  data.links.push(link);
  return link;
}

export function deleteLink(data, id) {
  data.links = data.links.filter((l) => l.id !== id);
}

export function linksOf(data, entryId) {
  return data.links
    .filter((l) => l.from === entryId || l.to === entryId)
    .map((link) => ({ link, other: getEntry(data, link.from === entryId ? link.to : link.from) }))
    .filter(({ other }) => other);
}
