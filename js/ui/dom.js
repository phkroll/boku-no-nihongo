// Builds DOM nodes. Text always goes in as text nodes, never as HTML.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'value' || key === 'checked' || key === 'selected') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(el) {
  el.replaceChildren();
}

export function topBar(title, left, right) {
  return h('header', { class: 'bar' }, h('div', { class: 'bar-side' }, left), h('h1', {}, title), h('div', { class: 'bar-side end' }, right));
}

export function link(href, label, cls = '') {
  return h('a', { href, class: cls }, label);
}

export const KIND_LABELS = { word: 'Word', kanji: 'Kanji', sentence: 'Sentence', grammar: 'Grammar' };

export function kindBadge(kind) {
  return h('span', { class: `badge kind-${kind}` }, KIND_LABELS[kind] ?? kind);
}
