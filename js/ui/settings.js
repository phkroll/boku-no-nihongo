import { exportJson, parseBackup, parseRestore, markExported, mergeImport } from '../model/io.js';
import { ensureStarter } from '../model/starter.js';
import { h, topBar, link, section, button, errorLine } from './dom.js';

function backupName() {
  return `boku-no-nihongo-${new Date().toISOString().slice(0, 10)}.json`;
}

async function share(text) {
  const file = new File([text], backupName(), { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
      throw e;
    }
  }
  const url = URL.createObjectURL(file);
  h('a', { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

const fileButton = (label, onfile) => h('label', { class: 'button-like' }, label,
  h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: async (ev) => {
    const [file] = ev.target.files;
    ev.target.value = '';
    if (file) await onfile(file);
  } }));

export function render(root, ctx) {
  const error = errorLine();
  const info = h('p', { class: 'ok', role: 'status' });
  const d = ctx.data;
  const redraw = () => ctx.go('#/settings', { replace: true });

  const exportNow = async () => {
    try {
      if (!(await share(exportJson(d)))) return;
      markExported(d);
      await ctx.save();
      redraw();
    } catch (e) {
      error.show(e);
    }
  };

  const addData = async (file) => {
    try {
      const incoming = parseBackup(await file.text());
      const s = mergeImport(d, incoming, { file: file.name });
      await ctx.save();
      info.textContent = `Added ${s.added}, completed ${s.updated}, already there ${s.skipped}.`;
    } catch (e) {
      error.show(e);
    }
  };

  const restore = async (file) => {
    try {
      const next = ensureStarter(parseRestore(await file.text()));
      const counts = (x) => `${x.words.length} words, ${x.kanji.length} kanji, ${x.ratings.length} ratings`;
      if (!confirm(`Replace everything you have now (${counts(d)}) with this backup (${counts(next)})? Export first if unsure.`)) return;
      for (const k of Object.keys(d)) delete d[k];
      Object.assign(d, next);
      await ctx.save();
      redraw();
    } catch (e) {
      error.show(e);
    }
  };

  const renameTag = async (t) => {
    const name = prompt('Rename tag', t.name);
    if (!name?.trim()) return;
    t.name = name.trim();
    await ctx.save();
    redraw();
  };
  const deleteTag = async (t) => {
    if (!confirm(`Delete tag “${t.name}”?`)) return;
    d.tags = d.tags.filter((x) => x.id !== t.id);
    for (const k of ['kanji', 'words', 'grammar', 'sentences', 'notes']) for (const u of d[k]) if (u.tagIds) u.tagIds = u.tagIds.filter((x) => x !== t.id);
    await ctx.save();
    redraw();
  };

  root.append(
    topBar('Settings', link('#/k/word', '‹ Back'), null),
    h('div', { class: 'detail' },
      h('p', { class: 'muted' }, `${d.words.length} words · ${d.kanji.length} kanji · ${d.grammar.length} grammar · ${d.sentences.length} sentences · ${d.notes.length} notes · ${d.relations.length} relations · ${d.ratings.length} ratings`),
      error.el, info,
      section('Backup',
        h('p', { class: 'muted' }, `Data lives only on this device. Last export: ${d.meta?.lastExport?.slice(0, 10) ?? 'never'}.`),
        h('div', { class: 'stack' },
          button('Export backup', exportNow, 'primary'),
          fileButton('Add data from file… (merge)', addData),
          fileButton('Restore backup… (replace all)', restore))),
      section('Imports', d.imports.length === 0 ? h('p', { class: 'muted' }, 'None yet.') : d.imports.map((i) => h('div', { class: 'kv' }, h('span', {}, i.file), h('span', { class: 'muted' }, i.at.slice(0, 10))))),
      section('Tags', d.tags.length === 0 && h('p', { class: 'muted' }, 'No tags yet.'),
        [...d.tags].sort((a, b) => a.name.localeCompare(b.name)).map((t) => h('div', { class: 'kv' }, h('span', {}, t.name),
          h('span', { class: 'inline' }, button('Rename', () => renameTag(t), 'small'), button('Delete', () => deleteTag(t), 'small danger'))))),
    ),
  );
}
