// Grammar points shipped with the app (origin: reference): the form steps and a few further points.
import { FORM_KEYS, newId, nowIso } from './data.js';
import { CONTENT_VERSION, EXTRA_GRAMMAR, FORM_CONTENT } from './grammar-content.js';

const CONTENT_FIELDS = ['pattern', 'meaning', 'appliesTo', 'explanation'];

// Each starter point is added once; meta.starterAdded remembers it, so a deleted one stays deleted.
// Points added to the app later are still added. Content fills empty fields once per CONTENT_VERSION,
// so the learner's edits and cleared fields stay as they are.
export function ensureStarter(data, now = nowIso()) {
  const haveForm = new Set(data.grammar.map((g) => g.formKey).filter(Boolean));
  const haveKey = new Set(data.grammar.map((g) => g.starterKey).filter(Boolean));
  const added = new Set(data.meta?.starterAdded ?? []);
  const stamp = () => ({ id: newId(), origin: { kind: 'reference' }, created: now, updated: now });
  for (const [formKey, title] of FORM_KEYS) {
    if (added.has(formKey)) continue;
    if (!haveForm.has(formKey)) data.grammar.push({ ...stamp(), title, formKey, ...FORM_CONTENT[formKey] });
    added.add(formKey);
  }
  for (const g of EXTRA_GRAMMAR) {
    if (added.has(g.starterKey)) continue;
    if (!haveKey.has(g.starterKey)) data.grammar.push({ ...stamp(), ...g });
    added.add(g.starterKey);
  }
  if ((data.meta?.starterContent ?? 0) < CONTENT_VERSION) {
    for (const g of data.grammar) {
      if (g.origin?.kind !== 'reference') continue;
      const content = g.formKey ? FORM_CONTENT[g.formKey] : EXTRA_GRAMMAR.find((x) => x.starterKey === g.starterKey);
      if (!content) continue;
      let changed = false;
      for (const f of CONTENT_FIELDS) {
        if (g[f] === undefined && content[f]) {
          g[f] = content[f];
          changed = true;
        }
      }
      if (changed) g.updated = now;
    }
  }
  data.meta = { ...data.meta, starterAdded: [...added], starterContent: CONTENT_VERSION };
  return data;
}
