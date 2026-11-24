import { KINDS, WORD_TYPES, addEntry, updateEntry, getEntry, addTag } from '../model.js';
import { h, clear, topBar, link, KIND_LABELS, isSubmitEnter } from './dom.js';

const TEXT_LABELS = { word: 'Word', kanji: 'Kanji', sentence: 'Sentence', grammar: 'Pattern' };

export function render(root, ctx, params) {
  const existing = params.id ? getEntry(ctx.data, params.id) : undefined;
  if (params.id && !existing) return ctx.go('#/');

  const draft = existing
    ? { ...existing, tagIds: [...existing.tagIds] }
    : { kind: 'word', text: '', reading: '', meaning: '', notes: '', wordType: '', tagIds: [] };

  const form = h('form', { class: 'form', onsubmit: (ev) => { ev.preventDefault(); save(); } });
  const error = h('p', { class: 'error', role: 'alert' });

  const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
  const text = (key, attrs = {}) => h('input', { ...attrs, value: draft[key], oninput: (ev) => { draft[key] = ev.target.value; } });

  const draw = () => {
    clear(form);
    form.append(
      field('Kind', h('select', { onchange: (ev) => { draft.kind = ev.target.value; draw(); } },
        KINDS.map((k) => h('option', { value: k, selected: draft.kind === k }, KIND_LABELS[k])))),
      field(TEXT_LABELS[draft.kind] ?? 'Text', draft.kind === 'sentence'
        ? h('textarea', { lang: 'ja', rows: 2, oninput: (ev) => { draft.text = ev.target.value; } }, draft.text)
        : text('text', { lang: 'ja', autocomplete: 'off' })),
      field('Reading (kana)', text('reading', { lang: 'ja', autocomplete: 'off' })),
      draft.kind === 'word' && field('Word type', h('select', { onchange: (ev) => { draft.wordType = ev.target.value; } },
        h('option', { value: '' }, '—'),
        WORD_TYPES.map((w) => h('option', { value: w, selected: draft.wordType === w }, w)))),
      field('Meaning', text('meaning', { autocomplete: 'off' })),
      field('Notes', h('textarea', { rows: 3, oninput: (ev) => { draft.notes = ev.target.value; } }, draft.notes)),
      tagPicker(),
      error,
      h('button', { type: 'submit', class: 'primary' }, 'Save'),
    );
  };

  const tagPicker = () => {
    const newTag = h('input', { placeholder: 'New tag', autocomplete: 'off' });
    const addNew = () => {
      try {
        const tag = addTag(ctx.data, newTag.value);
        if (!draft.tagIds.includes(tag.id)) draft.tagIds.push(tag.id);
        draw();
      } catch (e) {
        error.textContent = e.message;
      }
    };
    newTag.addEventListener('keydown', (ev) => { if (isSubmitEnter(ev)) { ev.preventDefault(); addNew(); } });
    return h('div', { class: 'field' }, h('span', {}, 'Tags'),
      h('div', { class: 'chips' },
        ctx.data.tags.map((t) => h('button', {
          type: 'button',
          class: `chip${draft.tagIds.includes(t.id) ? ' on' : ''}`,
          onclick: () => {
            draft.tagIds = draft.tagIds.includes(t.id) ? draft.tagIds.filter((id) => id !== t.id) : [...draft.tagIds, t.id];
            draw();
          },
        }, t.name))),
      h('div', { class: 'inline' }, newTag, h('button', { type: 'button', onclick: addNew }, 'Add')),
    );
  };

  const save = async () => {
    try {
      const entry = existing ? updateEntry(ctx.data, existing.id, draft) : addEntry(ctx.data, draft);
      await ctx.save();
      ctx.go(`#/entry/${entry.id}`, { replace: true });
    } catch (e) {
      error.textContent = e.message;
    }
  };

  const cancel = existing ? `#/entry/${existing.id}` : '#/';
  root.append(topBar(existing ? 'Edit' : 'New entry', link(cancel, 'Cancel'), null), form);
  draw();
}
