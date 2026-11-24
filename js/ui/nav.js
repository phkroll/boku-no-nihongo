import { h } from './dom.js';

// In-app trail of visited pages, so "back" goes one step back (the Home Screen app has no browser back button).
export function createNav(start) {
  const trail = [start];
  let list = start.startsWith('#/k/') && !start.endsWith('/new') ? start : '#/k/word';
  const noteList = (hash) => {
    if (/^#\/k\/\w+$/.test(hash)) list = hash;
  };
  return {
    visit(hash) {
      if (trail.length > 1 && trail[trail.length - 2] === hash) trail.pop();
      else if (trail[trail.length - 1] !== hash) trail.push(hash);
      noteList(hash);
    },
    replace(hash) {
      trail[trail.length - 1] = hash;
      noteList(hash);
    },
    previous() {
      return trail.length > 1 ? trail[trail.length - 2] : undefined;
    },
    lastList() {
      return list;
    },
  };
}

// "Back" that goes one step back when there is a previous page, else to the fallback.
export function backLink(ctx, label, fallback) {
  return h('a', {
    href: fallback,
    onclick: (ev) => {
      if (ctx.nav?.previous()) {
        ev.preventDefault();
        history.back();
      }
    },
  }, label);
}
