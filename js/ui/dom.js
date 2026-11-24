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
    if (child === null || child === undefined || child === false || child === '') continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// Enter that confirms a Japanese (IME) conversion must not count as "submit".
export function isSubmitEnter(ev) {
  return ev.key === 'Enter' && !ev.isComposing && ev.keyCode !== 229;
}

export function clear(el) {
  el.replaceChildren();
}

// One top bar per screen: one way back on the left, one main action on the right.
export function topBar(title, left, right) {
  return h('header', { class: 'bar' }, h('div', { class: 'bar-side' }, left), h('h1', {}, title), h('div', { class: 'bar-side end' }, right));
}

export function link(href, label, cls = '') {
  return h('a', { href, class: cls }, label);
}

export function button(label, onclick, cls = '') {
  return h('button', { type: 'button', class: cls, onclick }, label);
}

export function section(title, ...body) {
  return h('section', { class: 'section' }, h('h2', {}, title), ...body);
}

export function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', {}, label), input, hint && h('small', { class: 'muted' }, hint));
}

// options: [value, label][]; '' = missing.
export function select(options, value, onchange) {
  return h('select', { onchange: (ev) => onchange(ev.target.value) },
    options.map(([v, label]) => h('option', { value: v, selected: v === (value ?? '') }, label)));
}

export function badge(text, cls = '') {
  return h('span', { class: `badge ${cls}` }, text);
}

export function chips(items, isOn, onToggle) {
  return h('div', { class: 'chips' }, items.map(([v, label]) => h('button', {
    type: 'button', class: `chip${isOn(v) ? ' on' : ''}`, onclick: () => onToggle(v),
  }, label)));
}

export function jp(text, cls = '') {
  return h('span', { lang: 'ja', class: `jp ${cls}` }, text);
}

// Reports errors from model calls on the screen instead of losing them.
export function errorLine() {
  const el = h('p', { class: 'error', role: 'alert' });
  return {
    el,
    show: (e) => { el.textContent = e?.message ?? String(e); },
    clear: () => { el.textContent = ''; },
  };
}
