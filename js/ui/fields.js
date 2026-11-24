// Editors for the structured fields of a unit. Each takes the draft and a redraw callback.
import { FORM_KEYS, NA, READING_TYPES, makeRef, newId, normalize } from '../model/data.js';
import { h, button, chips, jp, select } from './dom.js';
import { refLink } from './describe.js';
import { picker } from './picker.js';

const input = (value, oninput, attrs = {}) => h('input', { value: value ?? '', autocomplete: 'off', oninput: (ev) => oninput(ev.target.value), ...attrs });
const remove = (list, item) => list.filter((x) => x !== item);

export function writingsEditor(draft, redraw) {
  const na = draft.writings === NA;
  const list = Array.isArray(draft.writings) ? draft.writings : [];
  return h('div', { class: 'stack' },
    !na && list.map((w) => h('div', { class: 'inline' }, input(w.text, (v) => { w.text = v; }, { lang: 'ja', placeholder: 'e.g. 寝る' }),
      button('×', () => { draft.writings = remove(list, w); redraw(); }, 'small'))),
    !na && button('+ writing', () => { draft.writings = [...list, { text: '' }]; redraw(); }, 'small'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: na, onchange: (ev) => { draft.writings = ev.target.checked ? NA : []; redraw(); } }), 'No kanji writing (kana only)'));
}

export function meaningsEditor(draft, redraw) {
  const visible = (draft.meanings ?? []).filter((m) => !m.hidden);
  return h('div', { class: 'stack' },
    visible.map((m) => h('div', { class: 'stack card' },
      h('div', { class: 'inline' }, input(m.gloss, (v) => { m.gloss = v; }, { placeholder: 'meaning, e.g. to sleep' }),
        button('×', () => { draft.meanings = remove(draft.meanings, m); redraw(); }, 'small')),
      input(m.usage, (v) => { m.usage = v; }, { placeholder: 'usage / nuance (optional)' }),
      m.unsplit && h('small', { class: 'muted' }, 'Imported as one text; may contain several meanings.'))),
    button('+ meaning', () => { draft.meanings = [...(draft.meanings ?? []), { id: newId(), gloss: '' }]; redraw(); }, 'small'));
}

export function readingsEditor(draft, redraw) {
  const list = draft.readings ?? [];
  return h('div', { class: 'stack' },
    list.map((r) => h('div', { class: 'inline' },
      input(r.kana, (v) => { r.kana = v; }, { lang: 'ja', placeholder: 'kana, kun as あ.く' }),
      select(READING_TYPES.map((t) => [t, t]), r.type, (v) => { r.type = v; }),
      button('×', () => { draft.readings = remove(list, r); redraw(); }, 'small'))),
    button('+ reading', () => { draft.readings = [...list, { id: newId(), kana: '', type: 'unknown' }]; redraw(); }, 'small'));
}

export function kanjiUsesEditor(ctx, draft, redraw) {
  const list = draft.kanjiUses ?? [];
  const fill = () => {
    const writing = Array.isArray(draft.writings) ? draft.writings[0]?.text ?? '' : '';
    const kanji = [...writing].filter((c) => /[一-鿿㐀-䶿]/.test(c));
    draft.kanjiUses = kanji.map((c) => list.find((u) => u.char === c) ?? { char: c, reading: '' });
    redraw();
  };
  return h('div', { class: 'stack' },
    list.map((u) => {
      const k = ctx.data.kanji.find((x) => x.char === u.char);
      return h('div', { class: 'inline' }, jp(u.char, 'big'),
        k?.readings?.length > 0 && select([['', 'reading…'], ...k.readings.map((r) => [r.id, `${r.kana} (${r.type})`])], u.readingId, (v) => {
          const r = k.readings.find((x) => x.id === v);
          if (r) Object.assign(u, { readingId: r.id, reading: u.reading || r.kana.replace(/\..*$/, '') });
          else delete u.readingId;
          redraw();
        }),
        input(u.reading, (v) => { u.reading = v; }, { lang: 'ja', placeholder: 'as read here' }),
        input(u.base, (v) => { u.base = v; }, { lang: 'ja', placeholder: 'before sound change' }));
    }),
    button(list.length ? 'Refill from writing' : 'Fill from writing', fill, 'small'));
}

export function usesEditor(ctx, draft, redraw) {
  const list = draft.uses ?? [];
  return h('div', { class: 'stack' },
    list.map((use) => h('div', { class: 'stack card' },
      h('div', { class: 'inline' }, use.wordId ? refLink(ctx.data, makeRef('word', use.wordId)) : jp(use.text ?? '?'),
        button('×', () => { draft.uses = remove(list, use); redraw(); }, 'small')),
      chips(FORM_KEYS.map(([k]) => [k, k]), (k) => (use.form ?? []).includes(k), (k) => {
        use.form = (use.form ?? []).includes(k) ? use.form.filter((x) => x !== k) : [...(use.form ?? []), k];
        redraw();
      }))),
    picker(ctx, { kinds: ['word'], placeholder: 'Add a word from the app…', onPick: (ref) => { draft.uses = [...list, { wordId: ref.split(':')[1] }]; redraw(); } }),
    h('div', { class: 'inline' }, h('input', { placeholder: 'or a word not in the app yet', lang: 'ja', id: 'free-word' }),
      button('Add', () => {
        const el = document.getElementById('free-word');
        if (el.value.trim()) { draft.uses = [...list, { text: el.value.trim() }]; redraw(); }
      }, 'small')));
}

export function grammarIdsEditor(ctx, draft, redraw) {
  const ids = draft.grammarIds ?? [];
  return h('div', { class: 'stack' },
    h('div', { class: 'chips' }, ids.map((id) => h('span', { class: 'chip on' }, refLink(ctx.data, makeRef('grammar', id)), ' ',
      button('×', () => { draft.grammarIds = ids.filter((x) => x !== id); redraw(); }, 'small')))),
    picker(ctx, { kinds: ['grammar'], placeholder: 'Add grammar point…', exclude: ids.map((id) => makeRef('grammar', id)), onPick: (ref) => { draft.grammarIds = [...ids, ref.split(':')[1]]; redraw(); } }));
}

export function refsEditor(ctx, draft, redraw) {
  const refs = draft.refs ?? [];
  return h('div', { class: 'stack' },
    h('div', { class: 'chips' }, refs.map((r) => h('span', { class: 'chip on' }, refLink(ctx.data, r), ' ',
      button('×', () => { draft.refs = refs.filter((x) => x !== r); redraw(); }, 'small')))),
    picker(ctx, { exclude: refs, placeholder: 'Link to word, kanji, …', onPick: (ref) => { draft.refs = [...refs, ref]; redraw(); } }));
}

export function tagsEditor(ctx, draft, redraw) {
  const ids = draft.tagIds ?? [];
  const add = (name) => {
    const clean = name.trim();
    if (!clean) return;
    let tag = ctx.data.tags.find((t) => normalize(t.name) === normalize(clean));
    if (!tag) {
      tag = { id: newId(), name: clean };
      ctx.data.tags.push(tag);
    }
    if (!ids.includes(tag.id)) draft.tagIds = [...ids, tag.id];
    redraw();
  };
  const newTag = h('input', { placeholder: 'new tag', autocomplete: 'off' });
  return h('div', { class: 'stack' },
    chips(ctx.data.tags.map((t) => [t.id, t.name]), (id) => ids.includes(id), (id) => {
      draft.tagIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      redraw();
    }),
    h('div', { class: 'inline' }, newTag, button('Add', () => add(newTag.value), 'small')));
}
