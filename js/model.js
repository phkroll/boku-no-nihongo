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
  entry.tagIds = [...new Set(entry.tagIds ?? [])];
  return entry;
}

export function addEntry(data, fields, { id = newId(), now = nowIso() } = {}) {
  const entry = cleanEntry({ ...fields, id, created: now, updated: now });
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
  Object.assign(current, next);
  return current;
}

export function deleteEntry(data, id) {
  data.entries = data.entries.filter((e) => e.id !== id);
}

export function search(data, { query = '', kind = '', tagId = '' } = {}) {
  const q = normalize(query);
  return data.entries
    .filter((e) => !kind || e.kind === kind)
    .filter((e) => !tagId || e.tagIds.includes(tagId))
    .filter((e) => !q || [e.text, e.reading, e.meaning].some((f) => normalize(f).includes(q)))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}
