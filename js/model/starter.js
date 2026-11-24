// Grammar points for grammatical forms, shipped with the app (origin: reference).
import { FORM_KEYS, newId, nowIso } from './data.js';

export function ensureStarter(data, now = nowIso()) {
  const have = new Set(data.grammar.map((g) => g.formKey).filter(Boolean));
  for (const [formKey, title] of FORM_KEYS) {
    if (have.has(formKey)) continue;
    data.grammar.push({ id: newId(), title, formKey, origin: { kind: 'reference' }, created: now, updated: now });
  }
  return data;
}
