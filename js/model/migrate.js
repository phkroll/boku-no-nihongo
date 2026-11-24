// Brings stored or imported data to the current version. Fields the app doesn't know are kept.
import { VERSION, emptyData } from './data.js';

export function migrate(raw) {
  if (raw === undefined || raw === null) return emptyData();
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Not a Boku no Nihongo file');
  if (raw.version > VERSION) throw new Error('This data was made by a newer app version');
  if (raw.version === 1) return { ...emptyData(), meta: { discardedV1: raw } }; // v1 dropped (decision by user)
  if (raw.version !== VERSION) throw new Error('Not a Boku no Nihongo file');
  const base = emptyData();
  const out = { ...base, ...raw, meta: { ...base.meta, ...raw.meta } };
  for (const [k, v] of Object.entries(base)) if (Array.isArray(v) && !Array.isArray(out[k])) out[k] = [];
  return out;
}
