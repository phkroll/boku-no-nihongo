// Create or edit any unit. Only the core field is required (quick capture).
import { getUnit, parseRef } from '../model/data.js';
import { addUnit, updateUnit, cleanupRemovedParts } from '../model/units.js';
import { KIND_UI } from './kinds.js';
import { h, clear, topBar, link, field, select, errorLine } from './dom.js';
import { hrefOf } from './describe.js';
import * as F from './fields.js';

function emptyDraft(kind, about) {
  const draft = {};
  if (kind === 'word') draft.writings = [{ text: '' }];
  if (kind === 'note') {
    draft.open = true;
    if (about) draft.refs = [about];
  }
  return draft;
}

// Drops empty rows the editors leave behind.
function tidy(draft) {
  const out = { ...draft };
  if (Array.isArray(out.writings)) out.writings = out.writings.filter((w) => w.text?.trim()).map((w) => ({ ...w, text: w.text.trim() }));
  if (out.meanings) out.meanings = out.meanings.filter((m) => m.hidden || m.gloss?.trim());
  if (out.readings) out.readings = out.readings.filter((r) => r.kana?.trim());
  for (const k of ['writings', 'meanings', 'readings', 'kanjiUses', 'uses', 'grammarIds', 'refs', 'tagIds']) {
    if (Array.isArray(out[k]) && out[k].length === 0) out[k] = undefined;
  }
  for (const [k, v] of Object.entries(out)) if (v === false) out[k] = undefined;
  return out;
}

export function render(root, ctx, params) {
  const ref = params.ref;
  const kind = ref ? parseRef(ref).kind : params.kind;
  const ui = KIND_UI[kind];
  const existing = ref ? getUnit(ctx.data, ref) : undefined;
  if (!ui || (ref && !existing)) return ctx.go('#/k/word', { replace: true });

  const before = existing ? structuredClone(existing) : undefined;
  const draft = existing ? structuredClone(existing) : emptyDraft(kind, params.about);
  const error = errorLine();
  // Enter in a single-line field never saves the whole form (tags, IME confirmations); Save does.
  const form = h('form', {
    class: 'form',
    onsubmit: (ev) => { ev.preventDefault(); save(); },
    onkeydown: (ev) => { if (ev.key === 'Enter' && ev.target?.tagName === 'INPUT') ev.preventDefault(); },
  });

  const editor = (f) => {
    const set = (v) => { draft[f.key] = v; };
    switch (f.type) {
      case 'text': return h('input', { value: draft[f.key] ?? '', lang: f.ja ? 'ja' : undefined, autocomplete: 'off', oninput: (ev) => set(ev.target.value) });
      case 'textarea': return h('textarea', { rows: 3, lang: f.ja ? 'ja' : undefined, oninput: (ev) => set(ev.target.value) }, draft[f.key] ?? '');
      case 'select': return select(f.options, draft[f.key], (v) => { set(v || undefined); draw(); });
      case 'check': return h('input', { type: 'checkbox', checked: !!draft[f.key], onchange: (ev) => { set(ev.target.checked); draw(); } });
      case 'writings': return F.writingsEditor(draft, draw);
      case 'meanings': return F.meaningsEditor(draft, draw);
      case 'readings': return F.readingsEditor(draft, draw);
      case 'kanjiUses': return F.kanjiUsesEditor(ctx, draft, draw);
      case 'uses': return F.usesEditor(ctx, draft, draw);
      case 'grammarIds': return F.grammarIdsEditor(ctx, draft, draw);
      case 'refs': return F.refsEditor(ctx, draft, draw);
      case 'tags': return F.tagsEditor(ctx, draft, draw);
      default: return null;
    }
  };

  function draw() {
    clear(form);
    for (const f of ui.fields) {
      if (f.when && !f.when(draft)) continue;
      form.append(f.type === 'check'
        ? h('label', { class: 'check' }, editor(f), f.label)
        : field(f.label + (f.core ? ' *' : ''), editor(f)));
    }
    form.append(error.el, h('button', { type: 'submit', class: 'primary' }, 'Save'));
  }

  async function save() {
    error.clear();
    try {
      const fields = tidy(draft);
      let saved;
      if (existing) {
        saved = updateUnit(ctx.data, ref, fields);
        cleanupRemovedParts(ctx.data, ref, before);
      } else {
        saved = addUnit(ctx.data, kind, fields);
      }
      await ctx.save();
      ctx.go(hrefOf(`${kind}:${saved.id}`), { replace: true });
    } catch (e) {
      error.show(e);
    }
  }

  const back = existing ? hrefOf(ref) : params.about ? hrefOf(params.about) : `#/k/${kind}`;
  root.append(topBar(existing ? `Edit ${ui.label.toLowerCase()}` : `New ${ui.label.toLowerCase()}`, link(back, 'Cancel'), null),
    h('p', { class: 'muted pad' }, '* is enough to save. Fill in the rest when you know it.'),
    form);
  draw();
}
