// Shows the whole app in another language (Brazilian Portuguese for now).
//
// Screens are written in English. This watches the page, and swaps each piece of text for its
// translation. The server translates a sentence once (translate_ in Code.gs) and keeps it for the
// whole class, and each device keeps what it has seen, so a lesson costs a request only the first
// time anyone opens it. Code is never translated: it has to stay exactly as typed.
import { getSettings, setSpeechTranslator } from './settings.js';

// Never translated: code, things people type into, drawings, and anything marked translate="no".
const SKIP = 'pre, code, kbd, script, style, textarea, select, option, svg, canvas, iframe, .CodeMirror, [translate="no"], .notranslate, [contenteditable]';
// Marks that can sit inside a sentence. A sentence is translated whole, so word order can change.
const INLINE = new Set(['STRONG', 'EM', 'B', 'I', 'CODE', 'KBD', 'BR']);
const HAS_WORDS = /\p{L}{2,}/u;
const MAX_TEXT = 1500;

const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A short, stable name for a piece of text, so the device's saved copy stays small. */
export function hashText(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** True when an element is one sentence: words, with nothing inside but bold, italics, and code. */
function isSentence(el) {
  let words = false;
  for (const kid of el.childNodes) {
    if (kid.nodeType === 3) { if (HAS_WORDS.test(kid.nodeValue)) words = true; continue; }
    if (kid.nodeType !== 1 || !INLINE.has(kid.tagName)) return false;
    if (kid.tagName !== 'BR' && [...kid.childNodes].some((n) => n.nodeType !== 3)) return false;
  }
  return words && el.children.length > 0;
}

/** A sentence as text the translator can read: each mark is numbered so it can be put back. */
function sentenceSource(el) {
  let n = 0;
  let out = '';
  for (const kid of el.childNodes) {
    if (kid.nodeType === 3) out += escapeHtml(kid.nodeValue);
    else if (kid.tagName === 'BR') out += '<br>';
    else if (kid.tagName === 'CODE' || kid.tagName === 'KBD') out += `<span id="m${n++}" class="notranslate" translate="no">${escapeHtml(kid.textContent)}</span>`;
    else out += `<b id="m${n++}">${escapeHtml(kid.textContent)}</b>`;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Rebuild a sentence from its translation. Only text and the page's own marks are ever put on the
 * page: the translated text is read in a document that never runs, and nothing is copied from it but words.
 */
function sentenceNodes(el, translated) {
  const marks = [...el.children].filter((k) => k.tagName !== 'BR');
  const doc = new DOMParser().parseFromString(`<body>${translated}</body>`, 'text/html');
  const used = new Set();
  const out = [];
  for (const node of doc.body.childNodes) {
    if (node.nodeType === 3) { out.push(document.createTextNode(node.nodeValue)); continue; }
    if (node.nodeType !== 1) continue;
    if (node.tagName === 'BR') { out.push(document.createElement('br')); continue; }
    const at = Number((node.id || '').slice(1));
    const mark = /^m\d+$/.test(node.id || '') && !used.has(at) ? marks[at] : null;
    if (!mark) { out.push(document.createTextNode(node.textContent)); continue; }
    used.add(at);
    const copy = mark.cloneNode(true);
    // Code keeps its own text. Bold and italics take the translated words.
    if (mark.tagName !== 'CODE' && mark.tagName !== 'KBD') copy.textContent = node.textContent;
    out.push(copy);
  }
  // If the translator dropped a mark (most often a piece of code), keep the English rather than lose it.
  return used.size === marks.length ? out : null;
}

const plainOf = (translated) => new DOMParser().parseFromString(`<body>${translated}</body>`, 'text/html').body.textContent;

/** Start translating the page. `fetchBatch(texts)` resolves to translations in order, null for any not ready. */
export function startTranslating(lang, fetchBatch) {
  const KEY = `pixeltrail.tr.${lang}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { saved = {}; }
  const done = new WeakMap(); // node or element -> what we last put there
  const waiting = new Map(); // source -> tries so far
  const gaveUp = new Set();
  let saveTimer = null;
  let askTimer = null;
  let walkQueued = false;
  let asking = false;
  // Text that changes all the time (clocks, counts) would never stop needing translation. Cap each visit.
  let budget = 600;

  const lookup = (src) => saved[hashText(src)];
  const want = (src) => { if (budget > 0 && src.length <= MAX_TEXT && !gaveUp.has(src) && !waiting.has(src)) { budget--; waiting.set(src, 0); if (!askTimer) askTimer = setTimeout(ask, 200); } };

  async function ask() {
    askTimer = null;
    if (asking || !waiting.size) return;
    asking = true;
    const batch = [];
    let size = 0;
    for (const src of waiting.keys()) {
      if (batch.length >= 30 || size + src.length > 6000) break;
      batch.push(src);
      size += src.length;
    }
    let answers = [];
    try { answers = await fetchBatch(batch); } catch (_) { answers = []; }
    let got = 0;
    batch.forEach((src, i) => {
      const text = answers && answers[i];
      if (typeof text === 'string' && text) { saved[hashText(src)] = text; waiting.delete(src); got++; return; }
      const tries = waiting.get(src) + 1;
      // The server stops after a few seconds and lets the page ask again. Twice is enough.
      if (tries >= 3) { waiting.delete(src); gaveUp.add(src); } else waiting.set(src, tries);
    });
    asking = false;
    if (got) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { /* full or private: it still works for this visit */ } }, 1500);
      queueWalk();
    }
    if (waiting.size) askTimer = setTimeout(ask, got ? 300 : 4000);
  }

  function textNode(node) {
    const now = node.nodeValue;
    if (done.get(node) === now || !HAS_WORDS.test(now)) return;
    const src = now.trim().replace(/\s+/g, ' ');
    const hit = lookup(escapeHtml(src));
    if (!hit) { want(escapeHtml(src)); return; }
    const out = now.replace(/^(\s*)[\s\S]*?(\s*)$/, (_, a, b) => a + plainOf(hit) + b);
    done.set(node, out);
    node.nodeValue = out;
  }

  function attribute(el, name) {
    const now = el.getAttribute(name);
    const key = `${name}:${now}`;
    if (!now || el.dataset.trDone === key || !HAS_WORDS.test(now)) return;
    const hit = lookup(escapeHtml(now));
    if (!hit) { want(escapeHtml(now)); return; }
    const out = plainOf(hit);
    el.dataset.trDone = `${name}:${out}`;
    el.setAttribute(name, out);
  }

  function walk(el) {
    if (el.nodeType !== 1 || el.matches(SKIP)) return;
    if (el.hasAttribute('placeholder')) attribute(el, 'placeholder');
    if (isSentence(el)) {
      if (done.get(el) === el.innerHTML) return;
      const src = sentenceSource(el);
      const hit = lookup(src);
      if (!hit) { want(src); return; }
      const nodes = sentenceNodes(el, hit);
      if (!nodes) { done.set(el, el.innerHTML); return; }
      el.replaceChildren(...nodes);
      done.set(el, el.innerHTML);
      return;
    }
    for (const kid of [...el.childNodes]) {
      if (kid.nodeType === 3) textNode(kid);
      else walk(kid);
    }
  }

  function queueWalk() {
    if (walkQueued) return;
    walkQueued = true;
    requestAnimationFrame(() => { walkQueued = false; walk(document.body); });
  }

  new MutationObserver(queueWalk).observe(document.body, { childList: true, subtree: true, characterData: true });
  queueWalk();

  // Read aloud asks for plain sentences in the same language.
  setSpeechTranslator(async (text) => {
    const src = escapeHtml(text);
    if (!lookup(src) && src.length <= MAX_TEXT) {
      const [answer] = await fetchBatch([src]);
      if (answer) saved[hashText(src)] = answer;
    }
    return lookup(src) ? plainOf(lookup(src)) : text;
  });
}

/** Called once when the app starts. English needs nothing. */
export function initLanguage(store) {
  const { lang } = getSettings();
  if (lang === 'en' || !store.translate) return;
  startTranslating(lang, (texts) => store.translate(lang, texts));
}
