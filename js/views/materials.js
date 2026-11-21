// A teacher's materials for one lesson: slides to project, a worksheet, its answer key and a checklist.
// Everything shown is built by js/curriculum/materials.js from the lesson's own data. This page asks
// the server for nothing and stores nothing: it only draws, presents and prints.
import { h, clear, md } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS } from '../curriculum/graph.js';
import { slidesFor, worksheetFor, answerKeyFor, checklistFor, demoFor, roadLessons } from '../curriculum/materials.js';
import { createPlayer } from '../sandbox.js';
import { snippet } from './lesson.js';

const TABS = [['slides', 'Slides'], ['worksheet', 'Worksheet'], ['key', 'Answer key'], ['checklist', 'Checklist'], ['pack', 'All worksheets']];
const LETTERS = 'ABCDEFGH';
const shortCode = (code) => code.replace('6-8.', '');
const codeBlock = (text) => snippet(text, text.includes('\n'));
/** Where a lesson sits: "Base Camp · The High Road · 40 minutes". */
const whereLine = (m) => h('p.mat-where', m.stage, m.road ? ` · ${m.road}` : '', m.extra ? ' · Extra challenge' : '', ` · ${m.mins} minutes`);
/** A standard, quoted exactly and never translated. */
const standardItem = (s) => h('li', { translate: 'no' }, h('strong', shortCode(s.code)), ' ', s.text);

// ---------------------------------------------------------------- slides

/** A question with its choices. The answer only shows once `revealed`. */
function askedBody(s, revealed) {
  return [
    h('div.slide-q', md(s.q)),
    s.code && codeBlock(s.code),
    h('ol.slide-options', s.options.map((o, i) => h('li', { class: revealed && i === s.answer ? 'right' : revealed ? 'dim' : '' }, h('b', { translate: 'no' }, LETTERS[i]), md(o)))),
    revealed && h('div.slide-why', md(s.why)),
  ];
}

/**
 * One slide. `live` is true in Present mode, where the finished game really runs; `stage` is
 * where its player goes. Everything inside is sized from the slide's own width, so a small
 * preview and the full screen look the same.
 */
function slideEl(s, { revealed = false, live = false, hasDemo = false, stage = null } = {}) {
  const tag = (text) => h('p.slide-tag', text);
  let body;
  if (s.kind === 'title') {
    body = [whereLine(s), h('h2.slide-title', s.title), s.question && h('p.slide-big-q', s.question)];
  } else if (s.kind === 'build') {
    body = h('div.slide-split',
      h('div', tag('You will build'), h('p.slide-build', s.text)),
      hasDemo && h('figure.slide-demo', live ? stage : h('div.slide-demo-wait', { 'aria-hidden': 'true' }, '▶'), h('figcaption', 'A finished one. Yours will look different.', live && h('span', ' Click it to play.'))));
  } else if (s.kind === 'idea') {
    body = [h('p.slide-tag', 'Key idea ', h('span', { translate: 'no' }, `${s.n} / ${s.of}`)), h('p.slide-term', s.term), s.means && h('p.slide-means', s.means)];
  } else if (s.kind === 'predict') {
    body = [tag('Predict'), ...askedBody(s, revealed)];
  } else if (s.kind === 'map') {
    body = [tag("Today's steps"), h('ol.slide-steps', { class: s.steps.length > 4 ? 'two' : '' }, s.steps.map((x) => h('li', h('span', x.title), h('small', { translate: 'no' }, `${x.mins} min`))))];
  } else if (s.kind === 'closing') {
    body = [tag('The same idea, somewhere else'), ...askedBody(s, revealed)];
  } else if (s.kind === 'reflect') {
    body = [tag('Reflect'), h('div.slide-reflect', md(s.text))];
  } else {
    body = [tag(s.assessed ? 'Your work shows this' : 'You practice this'), h(`ul.slide-standards${s.items.length > 2 ? '.many' : ''}`, s.items.map(standardItem))];
  }
  const lines = s.code ? s.code.split('\n').length : 0;
  return h(`section.slide.kind-${s.kind}${lines > 5 ? '.long-code' : ''}`, h('div.slide-in', body));
}

const hasAnswer = (s) => s.kind === 'predict' || s.kind === 'closing';

/** Present the slides over the whole page. Arrow keys move, and a question shows its answer on the next press. */
function present(slides, demo, from = 0) {
  let at = from;
  let revealed = false;
  let player = null;
  const stage = h('div.slide-demo-frame');
  const holder = h('div.present-slide');
  const count = h('span.present-count', { translate: 'no', 'aria-live': 'polite' });
  const answerBtn = h('button.btn.small', { onclick: () => { revealed = !revealed; draw(); } });
  const stopGame = () => { if (player) player.destroy(); player = null; clear(stage); };
  const draw = () => {
    const s = slides[at];
    stopGame();
    clear(holder).append(slideEl(s, { revealed, live: true, hasDemo: !!demo, stage }));
    if (s.kind === 'build' && demo) {
      // The arrow keys belong to the slides until the game is clicked, so a clicker never gets stuck here.
      player = createPlayer(() => {}, { takeFocus: false });
      stage.append(player.el);
      player.run(demo.code, {}, demo.files);
    }
    count.textContent = `${at + 1} / ${slides.length}`;
    answerBtn.style.display = hasAnswer(s) ? '' : 'none';
    answerBtn.textContent = revealed ? 'Hide answer' : 'Show answer';
  };
  const move = (by) => {
    const s = slides[at];
    if (by > 0 && hasAnswer(s) && !revealed) { revealed = true; draw(); return; }
    const next = Math.max(0, Math.min(slides.length - 1, at + by));
    if (next === at) return;
    at = next;
    revealed = false;
    draw();
  };
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    stopGame();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    box.remove();
    if (app.cleanup === close) app.cleanup = null;
  };
  const onKey = (e) => {
    const k = e.key;
    if (k === 'Escape') close();
    else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') move(1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') move(-1);
    else if (k === 'Home') { at = 0; revealed = false; draw(); } else if (k === 'End') { at = slides.length - 1; revealed = false; draw(); } else return;
    e.preventDefault();
    e.stopPropagation();
  };
  const full = () => {
    // Some pages (and Apps Script's frame) may not allow full screen. The slides still fill the page.
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
    } catch (_) { /* stays as it is */ }
  };
  const box = h('div.present', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Slides', tabindex: '-1' },
    holder,
    h('div.present-bar',
      h('button.btn.small', { onclick: () => move(-1), 'aria-label': 'Previous slide' }, '◀'),
      count,
      h('button.btn.small', { onclick: () => move(1), 'aria-label': 'Next slide' }, '▶'),
      answerBtn,
      h('button.btn.small', { onclick: full }, 'Full screen'),
      h('button.btn.small', { onclick: close }, 'Close')));
  document.body.append(box);
  document.addEventListener('keydown', onKey, true);
  app.cleanup = close;
  draw();
  box.focus();
  full();
}

function slidesTab(id, path) {
  const slides = slidesFor(id, path);
  const demo = demoFor(id, path);
  return h('div.stack',
    h('div.row.mat-tools',
      h('button.btn.primary.big', { onclick: () => present(slides, demo, 0) }, '▶ Present'),
      h('p.muted.small', 'Arrow keys move through the slides. A question shows its answer on the next press. Esc closes.')),
    h('div.slide-grid', slides.map((s, i) => h('button.slide-thumb', { type: 'button', onclick: () => present(slides, demo, i), 'aria-label': `Present from slide ${i + 1}` },
      slideEl(s, { hasDemo: !!demo }), h('span.slide-thumb-n', { translate: 'no' }, String(i + 1))))));
}

// ---------------------------------------------------------------- paper

const blank = (wide = false) => h(`span.blank${wide ? '.wide' : ''}`, { 'aria-hidden': 'true' });
const nameLine = () => h('p.sheet-name', h('span', 'Name'), blank(true), h('span', 'Date'), blank());
const sheetHead = (m, label) => h('header.sheet-head', whereLine(m), h('div', h('h2', m.title), label ? h('p.sheet-label', label) : nameLine()));

function worksheetEl(w) {
  return h('article.sheet.worksheet',
    sheetHead(w),
    w.terms.length > 0 && h('section',
      h('h3', 'Key ideas'),
      h('p.sheet-do', 'Write the letter of the meaning next to each idea.'),
      h('div.match',
        h('ul.match-terms', w.terms.map((t) => h('li', blank(), h('strong', t)))),
        h('ul.match-means', w.meanings.map((m) => h('li', h('b', { translate: 'no' }, m.letter), h('span', m.means)))))),
    w.questions.length > 0 && h('section',
      h('h3', 'Predict'),
      h('p.sheet-do', 'Read the code. Circle what you think happens.'),
      w.questions.map((q) => h('div.sheet-q',
        h('div.sheet-q-ask', q.from && h('span.sheet-from', q.from), md(q.q)),
        codeBlock(q.code),
        h('ul.sheet-options', q.options.map((o, i) => h('li', h('b', { translate: 'no' }, LETTERS[i]), md(o)))),
        h('p.sheet-because', h('span', 'Because'), blank(true))))),
    w.reflect && h('section.sheet-reflect',
      h('h3', 'Reflect'),
      md(w.reflect),
      h('div.sheet-lines', { 'aria-hidden': 'true' }, Array.from({ length: w.lines }, () => h('span')))));
}

function keyEl(k) {
  const group = (title, list) => list.length > 0 && h('div', h('h4', title), h('ul.key-standards', list.map(standardItem)));
  return h('article.sheet.answer-key',
    sheetHead(k, 'Answer key, for the teacher'),
    k.matches.length > 0 && h('section',
      h('h3', 'Key ideas'),
      h('table.key-table', h('tbody', k.matches.map((m) => h('tr', h('th', m.term), h('td.key-letter', { translate: 'no' }, m.letter), h('td', m.means)))))),
    k.questions.length > 0 && h('section',
      h('h3', 'Predict'),
      h('ol.key-answers', k.questions.map((q) => h('li', h('div.key-q', md(q.q)), h('div.key-a', h('b', { translate: 'no' }, q.letter), md(q.option)), h('div.key-why', md(q.why)))))),
    h('section',
      h('h3', 'Reflect'),
      k.evidence && h('p', h('strong', 'Evidence: '), k.evidence),
      group('Assess here', k.assessed),
      group('Practiced here', k.practiced)));
}

function checklistEl(c) {
  const box = () => h('span.tick', { 'aria-hidden': 'true' });
  return h('article.sheet.checklist',
    sheetHead(c),
    h('div.check-cols',
      h('section',
        h('h3', 'Steps'),
        h('ul.ticks', c.steps.map((s) => h('li', box(), h('div', h('strong', s.title), s.goal && md(s.goal)))))),
      h('div',
        h('section',
          h('h3', 'Stretch goals'),
          h('ul.ticks', c.stretch.map((t) => h('li', box(), md(t))))),
        h('section',
          h('h3', 'I can…'),
          h('ul.ticks', c.ican.map((x) => h('li', box(), h('p', `${x.lead} `, h('strong', x.term), ` ${x.tail}`))))))));
}

const printButton = (label) => h('button.btn.primary', { onclick: () => window.print() }, `🖨 ${label}`);

// ---------------------------------------------------------------- the page

export async function viewMaterials(main, id, pathParam, tabParam) {
  const lesson = getLesson(id);
  if (!lesson) { go('/curriculum'); return null; }
  // A lesson on a road belongs to that road. A shared lesson can be looked at on any of them.
  const path = lesson.path || (PATHS[pathParam] ? pathParam : 'platformer');
  const tab = TABS.some(([t]) => t === tabParam) ? tabParam : TABS.some(([t]) => t === pathParam) ? pathParam : 'slides';
  const link = (t, label) => h('a.tab', { href: `#/materials/${id}/${path}/${t}`, role: 'tab', 'aria-selected': tab === t ? 'true' : 'false' }, label);
  const road = PATHS[path].road;

  let content;
  if (tab === 'slides') content = slidesTab(id, path);
  else if (tab === 'worksheet') content = h('div.stack', h('div.row.mat-tools', printButton('Print worksheet')), worksheetEl(worksheetFor(id, path)));
  else if (tab === 'key') content = h('div.stack', h('div.row.mat-tools', printButton('Print answer key')), keyEl(answerKeyFor(id, path)));
  else if (tab === 'checklist') {
    const c = checklistFor(id, path);
    // Half a page each, so a sheet of paper is two checklists. The second copy only exists on paper.
    content = h('div.stack', h('div.row.mat-tools', printButton('Print checklists'), h('p.muted.small', 'Two to a page. Cut along the line.')),
      h('div.halves', checklistEl(c), h('div.print-only', { 'aria-hidden': 'true' }, checklistEl(c))));
  } else {
    const ids = roadLessons(path);
    content = h('div.stack',
      h('div.row.mat-tools', printButton('Print all worksheets'), h('p.muted.small', h('span', 'One worksheet for each core lesson on this road: '), h('strong', road))),
      ids.map((x) => worksheetEl(worksheetFor(x, path))));
  }

  return h('div.stack.materials',
    h('header.mat-head',
      h('div', h('p.eyebrow', h('a', { href: '#/curriculum' }, 'All lessons'), ' › ', 'Materials'), h('h1', lesson.title)),
      h('div.row',
        !lesson.path && h('select.path-pick', { 'aria-label': 'Road', onchange: (e) => go(`/materials/${id}/${e.target.value}/${tab}`) }, Object.values(PATHS).map((p) => h('option', { value: p.id, selected: p.id === path }, p.road))),
        h('a.btn', { href: `#/lesson/${id}/${path}` }, 'Open the lesson'))),
    h('div.tabs', { role: 'tablist' }, TABS.map(([t, label]) => link(t, label))),
    content);
}
