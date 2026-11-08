// Tiny DOM helpers. Text always goes through text nodes, so student-typed names can't inject HTML.

export function h(spec, props, ...kids) {
  const [tagPart, ...classes] = spec.split('.');
  const el = document.createElement(tagPart || 'div');
  if (classes.length) el.className = classes.join(' ');
  applyProps(el, props, kids);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}

function applyProps(el, props, kids) {
  if (props && (props instanceof Node || typeof props !== 'object' || Array.isArray(props))) {
    kids.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += ` ${v}`;
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'readOnly') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
}

function append(el, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

export const clear = (el) => { el.replaceChildren(); return el; };

function inline(text, into) {
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    into.append(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) into.append(h('strong', t.slice(2, -2)));
    else if (t.startsWith('`')) into.append(h('code', t.slice(1, -1)));
    else into.append(h('em', t.slice(1, -1)));
    last = m.index + t.length;
  }
  into.append(text.slice(last));
}

/** Lesson text: paragraphs, bullet lists, **bold**, `code`, *italic*. No raw HTML. */
export function md(text) {
  const box = h('div.md');
  for (const block of String(text).split(/\n{2,}/)) {
    const lines = block.split('\n');
    if (lines.every((l) => l.trim().startsWith('- '))) {
      const ul = h('ul');
      for (const l of lines) {
        const li = h('li');
        inline(l.trim().slice(2), li);
        ul.append(li);
      }
      box.append(ul);
    } else {
      const p = h('p');
      inline(block.replace(/\n/g, ' '), p);
      box.append(p);
    }
  }
  return box;
}

export function toast(message, kind = 'info') {
  const t = h(`div.toast.${kind}`, message);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 6000 : 3000);
}

/** Open a modal. `render(close)` returns its content. Esc or the backdrop closes it. */
export function modal(render, { wide = false, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const lastFocus = document.activeElement;
  let back;
  const close = () => {
    document.removeEventListener('keydown', onKey);
    back.remove();
    if (onClose) onClose();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const box = h(`div.modal${wide ? '.wide' : ''}`, { role: 'dialog', 'aria-modal': 'true', tabindex: '-1' });
  back = h('div.backdrop', { onmousedown: (e) => { if (e.target === back) close(); } }, box);
  box.append(render(close));
  box.setAttribute('aria-label', box.querySelector('h2')?.textContent || 'Dialog');
  root.append(back);
  document.addEventListener('keydown', onKey);
  box.focus();
  return close;
}

export function confirmBox(title, body, yes = 'Yes', danger = false) {
  return new Promise((resolve) => {
    let answered = false;
    modal((close) => h('div.stack',
      h('h2', title),
      h('p', body),
      h('div.row.end',
        h('button.btn', { onclick: close }, 'Cancel'),
        h(`button.btn.${danger ? 'danger' : 'primary'}`, { onclick: () => { answered = true; close(); resolve(true); } }, yes),
      ),
    ), { onClose: () => { if (!answered) resolve(false); } });
  });
}

/** Run an async action, showing any failure to the user instead of failing silently. */
export async function attempt(fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    toast(e.message || 'Something went wrong.', 'error');
    return undefined;
  }
}

export function debounce(fn, ms) {
  let t;
  const wrapped = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function download(filename, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
