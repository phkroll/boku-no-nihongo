import { COLLECTION, normalize, visibleMeanings } from './data.js';

function texts(kind, u) {
  const out = [u.notes];
  if (kind === 'kanji') out.push(u.char, ...(u.readings ?? []).map((r) => r.kana));
  if (kind === 'word') out.push(u.reading, ...(Array.isArray(u.writings) ? u.writings.map((w) => w.text) : []));
  if (kind === 'grammar') out.push(u.title, u.pattern, u.meaning);
  if (kind === 'sentence') out.push(u.text, u.reading, u.translation);
  if (kind === 'note') out.push(u.text);
  out.push(...visibleMeanings(u).map((m) => m.gloss));
  return out;
}

export function search(data, kind, { query = '', tagId = '', openOnly = false } = {}) {
  const q = normalize(query);
  return data[COLLECTION[kind]]
    .filter((u) => !tagId || (u.tagIds ?? []).includes(tagId))
    .filter((u) => !openOnly || u.open === true)
    .filter((u) => !q || texts(kind, u).some((t) => t && normalize(t).includes(q)))
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}
