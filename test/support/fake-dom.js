// Just enough DOM to render the screens in Node and catch runtime errors. Not a browser.
class FakeNode {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = {};
    this.listeners = {};
    this._text = '';
    this.value = '';
    this.checked = false;
    this.selected = false;
    this.files = [];
  }
  append(...nodes) { for (const n of nodes) this.children.push(typeof n === 'string' ? new FakeText(n) : n); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  fire(type, ev = {}) { for (const fn of this.listeners[type] ?? []) fn({ preventDefault() {}, target: this, key: '', ...ev }); }
  click() { this.fire('click'); }
  set textContent(t) { this.children = []; this._text = String(t); }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  all(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c instanceof FakeNode) c.all(pred, out); return out; }
}
class FakeText { constructor(t) { this.textContent = t; } }

export function installFakeDom() {
  const byId = new Map();
  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement: (t) => new FakeNode(t),
    createTextNode: (t) => new FakeText(t),
    getElementById: (id) => byId.get(id) ?? null,
  };
  globalThis.window = { scrollTo() {}, addEventListener() {} };
  globalThis.prompt = () => null;
  globalThis.confirm = () => true;
  globalThis.alert = () => {};
}

export function fieldInput(root, label) {
  const f = root.all((n) => n.tagName === 'LABEL' && n.attrs.class === 'field' && n.children[0]?.textContent?.startsWith(label))[0];
  return f?.all((n) => n.tagName === 'INPUT' || n.tagName === 'TEXTAREA')[0];
}

export function text(root) {
  return root.textContent;
}
