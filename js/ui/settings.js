import { exportJson, parseBackup, parseRestore, markExported, mergeImport } from '../model/io.js';
import { ensureStarter } from '../model/starter.js';
import { h, topBar, section, button, errorLine, fill, clear, chips } from './dom.js';
import { backLink } from './nav.js';
import { BUILD, BUILT } from '../version.js';

// Sources of the published data (README "Credits"); [name, licence, link].
const CREDITS = [
  ['JMdict, KANJIDIC2 (EDRDG)', 'CC BY-SA 4.0', 'https://www.edrdg.org/edrdg/licence.html'],
  ['JmdictFurigana', 'JMdict licence', 'https://github.com/Doublevil/JmdictFurigana'],
  ['Kanjium', 'CC BY-SA 4.0', 'https://github.com/mifunetoshiro/kanjium'],
  ['Tatoeba', 'CC BY 2.0 FR', 'https://tatoeba.org'],
];

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

// Published with the app (data/ in the repo). Content first: knowledge refers to its entries.
// data/knowledge.json may be missing (later only content is published) — then it's skipped.
const CONTENT = 'data/content.json';
const KNOWLEDGE = 'data/knowledge.json';
const LOAD_CHOICES = [['content', 'Learning content only'], ['all', 'Content + what I know']];

async function loadPublished(d, files) {
  const total = { added: 0, updated: 0, skipped: 0, conflicts: [], duplicates: [], checks: [] };
  for (const file of files) {
    const res = await fetch(file, { cache: 'no-cache' });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
    const s = mergeImport(d, parseBackup(await res.text()), { file });
    for (const k of ['added', 'updated', 'skipped']) total[k] += s[k];
    for (const k of ['conflicts', 'duplicates', 'checks']) total[k].push(...s[k]);
  }
  return total;
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
  const showResult = (s) => {
    const open = s.conflicts.length + s.duplicates.length + s.checks.length;
    clear(info);
    fill(info, `Added ${s.added}, completed ${s.updated}, already there ${s.skipped}.`,
      open ? h('a', { href: `#/import/${encodeURIComponent(d.imports.at(-1).id)}`, class: 'block' },
        `${s.conflicts.length} contradictions · ${s.duplicates.length} possible duplicates · ${s.checks.length} to check — show report`) : '');
  };
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
      showResult(s);
    } catch (e) {
      error.show(e);
    }
  };

  let loadChoice = 'all';
  const loadPanel = h('div', { class: 'stack card hidden' });
  const drawLoadPanel = () => {
    clear(loadPanel);
    fill(loadPanel,
      h('p', { class: 'muted small' }, 'Learning content: kanji, words, grammar, sentences, relations. What I know: ratings, mix-ups, notes. Already there stays as it is.'),
      chips(LOAD_CHOICES, (v) => loadChoice === v, (v) => { loadChoice = v; drawLoadPanel(); }),
      button('Load', addPublished, 'primary'));
  };
  let loadOpen = false;
  const toggleLoadPanel = () => {
    loadOpen = !loadOpen;
    loadPanel.setAttribute('class', loadOpen ? 'stack card' : 'stack card hidden');
    drawLoadPanel();
  };

  async function addPublished() {
    error.clear();
    try {
      const s = await loadPublished(d, loadChoice === 'all' ? [CONTENT, KNOWLEDGE] : [CONTENT]);
      await ctx.save();
      showResult(s);
    } catch (e) {
      error.show(e);
    }
  }

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

  fill(root, 
    topBar('Settings', backLink(ctx, '‹ Back', ctx.nav?.lastList() ?? '#/k/word'), null),
    h('div', { class: 'detail' },
      h('p', { class: 'muted' }, `${d.words.length} words · ${d.kanji.length} kanji · ${d.grammar.length} grammar · ${d.sentences.length} sentences · ${d.notes.length} notes · ${d.relations.length} relations · ${d.ratings.length} ratings`),
      error.el, info,
      section('Backup',
        h('p', { class: 'muted' }, `Data lives only on this device. Last export: ${d.meta?.lastExport?.slice(0, 10) ?? 'never'}.`),
        h('div', { class: 'stack' },
          button('Export backup', exportNow, 'primary'),
          button('Load published data…', toggleLoadPanel, 'wide'),
          loadPanel,
          fileButton('Add data from file… (merge)', addData),
          fileButton('Restore backup… (replace all)', restore))),
      h('p', { class: 'muted small' }, `Version ${BUILT} · ${BUILD.slice(0, 7)}`),
      section('Imports', d.imports.length === 0 ? h('p', { class: 'muted' }, 'None yet.') : [...d.imports].reverse().map((i) => {
        const n = (i.report?.conflicts.length ?? 0) + (i.report?.duplicates.length ?? 0) + (i.report?.checks.length ?? 0);
        return h('a', { href: `#/import/${encodeURIComponent(i.id)}`, class: 'kv' }, h('span', {}, i.file, n > 0 && h('span', { class: 'badge warn' }, `${n} open`)), h('span', { class: 'muted' }, i.at.slice(0, 10)));
      })),
      section('Tags', d.tags.length === 0 && h('p', { class: 'muted' }, 'No tags yet.'),
        [...d.tags].sort((a, b) => a.name.localeCompare(b.name)).map((t) => h('div', { class: 'kv' }, h('span', {}, t.name),
          h('span', { class: 'inline' }, button('Rename', () => renameTag(t), 'small'), button('Delete', () => deleteTag(t), 'small danger'))))),
      section('Credits',
        h('p', { class: 'muted small' }, 'Published data partly derived from:'),
        CREDITS.map(([name, licence, href]) => h('div', { class: 'kv' },
          h('a', { href, target: '_blank', rel: 'noopener' }, name), h('span', { class: 'muted small' }, licence)))),
    ),
  );
}
