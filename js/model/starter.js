// Grammar points for grammatical forms, shipped with the app (origin: reference).
import { FORM_KEYS, newId, nowIso } from './data.js';

// Each starter form is added once; meta.starterAdded remembers it, so a deleted one stays deleted.
// Forms added to the app later are still added.
export function ensureStarter(data, now = nowIso()) {
  const have = new Set(data.grammar.map((g) => g.formKey).filter(Boolean));
  const added = new Set(data.meta?.starterAdded ?? []);
  for (const [formKey, title] of FORM_KEYS) {
    if (added.has(formKey)) continue;
    if (!have.has(formKey)) data.grammar.push({ id: newId(), title, formKey, origin: { kind: 'reference' }, created: now, updated: now });
    added.add(formKey);
  }
  data.meta = { ...data.meta, starterAdded: [...added] };
  return data;
}
