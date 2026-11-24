import { exportJson, importJson, renameTag, deleteTag } from '../model.js';
import { h, topBar, link } from './dom.js';

function backupName() {
  return `boku-no-nihongo-${new Date().toISOString().slice(0, 10)}.json`;
}

async function exportBackup(data) {
  const file = new File([exportJson(data)], backupName(), { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
    }
    return;
  }
  const url = URL.createObjectURL(file);
  h('a', { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function render(root, ctx) {
  const message = h('p', { class: 'error', role: 'alert' });
  const fail = (e) => { message.textContent = e.message; };
  const redraw = () => ctx.go('#/settings', { replace: true });

  const importFile = async (ev) => {
    const [file] = ev.target.files;
    ev.target.value = '';
    if (!file) return;
    try {
      const next = importJson(await file.text());
      const question = `Replace all ${ctx.data.entries.length} entries with the ${next.entries.length} entries from this backup?`;
      if (!confirm(question)) return;
      Object.assign(ctx.data, next);
      await ctx.save();
      redraw();
    } catch (e) {
      fail(e);
    }
  };

  const rename = async (tag) => {
    const name = prompt('Rename tag', tag.name);
    if (name === null) return;
    try {
      renameTag(ctx.data, tag.id, name);
      await ctx.save();
      redraw();
    } catch (e) {
      fail(e);
    }
  };

  const removeTag = async (tag) => {
    if (!confirm(`Delete tag “${tag.name}”? Entries keep everything else.`)) return;
    deleteTag(ctx.data, tag.id);
    await ctx.save();
    redraw();
  };

  const tags = [...ctx.data.tags].sort((a, b) => a.name.localeCompare(b.name));
  const { entries, links } = ctx.data;

  root.append(
    topBar('Settings', link('#/', '‹ All'), null),
    h('div', { class: 'detail' },
      h('p', { class: 'muted' }, `${entries.length} entries · ${tags.length} tags · ${links.length} links`),
      message,
      h('section', { class: 'section' },
        h('h2', {}, 'Backup'),
        h('p', { class: 'muted' }, 'Your notebook lives only on this phone. Export a backup now and then, e.g. to Files or iCloud Drive.'),
        h('div', { class: 'stack' },
          h('button', { type: 'button', class: 'primary', onclick: () => exportBackup(ctx.data).catch(fail) }, 'Export backup'),
          h('label', { class: 'button-like' }, 'Import backup…',
            h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: importFile })),
        ),
      ),
      h('section', { class: 'section' },
        h('h2', {}, 'Tags'),
        tags.length === 0 && h('p', { class: 'muted' }, 'No tags yet. Add them while editing an entry.'),
        h('ul', { class: 'list flush' }, tags.map((t) =>
          h('li', { class: 'link-row' },
            h('span', { class: 'row grow' }, t.name),
            h('button', { type: 'button', onclick: () => rename(t) }, 'Rename'),
            h('button', { type: 'button', class: 'danger', onclick: () => removeTag(t) }, 'Delete'),
          ))),
      ),
    ),
  );
}
