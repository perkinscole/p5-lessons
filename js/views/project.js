// The class display: what a teacher projects during student-led work time.
// Everything here is safe to show the room: no scores, feedback, or emails.
import { h, clear, md, modal, toast, attempt } from '../ui.js';
import { app, go } from '../main.js';
import { readButton } from '../settings.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, STAGES, stageOf, isSideTrail } from '../curriculum/graph.js';
import { alignmentFor, coverage, standardByCode } from '../curriculum/alignment.js';
import { checksFor } from '../curriculum/checks.js';
import { recentAchievements } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { standingOn } from './map.js';

const todayKey = () => new Date().toLocaleDateString('en-CA');
const shortCode = (code) => code.replace('6-8.', '');
const emptyPlan = () => ({ day: todayKey(), question: '', focus: '', standards: [], timer_end: '' });
/** A saved plan only counts on the day it was made. */
const currentPlan = (saved) => (saved && saved.day === todayKey() ? { ...emptyPlan(), ...saved } : emptyPlan());

/** Lessons students are on right now, most common first. */
export function lessonsInUse(board) {
  const counts = new Map();
  for (const s of board) {
    const id = standingOn(s);
    if (!isSideTrail(id)) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
}

function dayNumber() {
  return Math.floor(Date.now() / 86400000);
}

/** A check question from whatever most of the class is working on, stable for the day. */
function suggestedQuestion(lessons) {
  const pool = lessons.slice(0, 3).flatMap(({ id }) => checksFor(id));
  return pool.length ? pool[dayNumber() % pool.length] : null;
}

function autoStandards(lessons) {
  const codes = [];
  for (const { id } of lessons) {
    const a = alignmentFor(id);
    for (const c of [...a.anchor, ...a.support]) if (!codes.includes(c)) codes.push(c);
    if (codes.length >= 3) break;
  }
  return codes.slice(0, 3);
}

// One column per stage of the trail. Beyond the Summit is grouped into one.
const COLUMNS = [
  ...STAGES.filter((st) => !st.beyond).map((st) => ({ key: st.id, name: st.mapName || st.name })),
  { key: 'beyond', name: 'Beyond' },
];
const columnOf = (id) => {
  const st = stageOf(id);
  return st.beyond ? 'beyond' : st.id;
};

function progression(board) {
  const groups = new Map(COLUMNS.map((c) => [c.key, []]));
  for (const s of board) groups.get(columnOf(standingOn(s)))?.push(s);
  // Busier stages get more room, so nobody ends up off the bottom.
  const widths = COLUMNS.map((c) => `minmax(0, ${(1 + groups.get(c.key).length / 2.5).toFixed(2)}fr)`).join(' ');
  return h('div.pj-trail', { style: `grid-template-columns:${widths}` }, COLUMNS.map((c) => h('section.pj-stage',
    h('h3', c.name),
    h('div.pj-people', groups.get(c.key).map((s) => h('div.pj-person', { title: s.display_name, style: s.path ? `--road:${PATHS[s.path].color}` : null },
      h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 3), alt: '' }),
      h('span', s.display_name)))),
  )));
}

/** Use the largest character size at which every student is visible. */
function fitTrail(root) {
  const trail = root.querySelector('.pj-trail');
  if (!trail) return;
  for (const size of ['large', 'medium', 'small', 'tiny']) {
    trail.classList.remove('large', 'medium', 'small', 'tiny');
    trail.classList.add(size);
    if (![...trail.querySelectorAll('.pj-stage')].some((st) => st.scrollHeight > st.clientHeight + 1)) return;
  }
}

function achievements(board) {
  // At most two per student, so the feed celebrates more of the class.
  const shown = new Map();
  const items = recentAchievements(board).filter((a) => {
    shown.set(a.student_id, (shown.get(a.student_id) || 0) + 1);
    return shown.get(a.student_id) <= 2;
  }).slice(0, 6);
  if (!items.length) return h('p.pj-empty', 'New achievements show up here.');
  return h('ul.pj-feed', items.map((a) => h('li',
    h('img', { src: avatarURL(a.avatar || defaultAvatar(a.student_id), 2), alt: '' }),
    h('span.pj-icon', a.icon),
    h('span', h('strong', a.name), ` ${a.text}`))));
}

function openSetup(plan, lessons, onSave) {
  const suggested = suggestedQuestion(lessons);
  const q = h('textarea', { rows: 2, maxlength: 200, value: plan.question, placeholder: suggested ? `Blank uses: ${suggested.q}` : 'Type a question' });
  const focus = h('textarea', { rows: 3, maxlength: 300, value: plan.focus, placeholder: 'One item per line. Blank shows the lessons students are on.' });
  const endValue = plan.timer_end ? new Date(plan.timer_end) : null;
  const pad = (n) => String(n).padStart(2, '0');
  const end = h('input', { type: 'time', value: endValue ? `${pad(endValue.getHours())}:${pad(endValue.getMinutes())}` : '' });
  const setIn = (mins) => { const d = new Date(Date.now() + mins * 60000); end.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const taught = coverage().filter((c) => c.anchor.length || c.support.length);
  const picks = [0, 1, 2].map((i) => h('select', { 'aria-label': `Standard ${i + 1}` },
    h('option', { value: '' }, i === 0 ? 'Automatic' : 'None'),
    taught.map((c) => h('option', { value: c.code, selected: plan.standards[i] === c.code }, `${shortCode(c.code)}: ${c.text.slice(0, 60)}`))));
  modal((close) => h('form.stack', {
    onsubmit: async (e) => {
      e.preventDefault();
      let timer = '';
      if (end.value) {
        const [hh, mm] = end.value.split(':').map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        timer = d.toISOString();
      }
      const next = { day: todayKey(), question: q.value.trim(), focus: focus.value.trim(), standards: picks.map((p) => p.value).filter(Boolean), timer_end: timer };
      close();
      onSave(next);
    },
  },
  h('h2', 'Set up today'),
  h('label.field', h('span', 'Class ends at'), end),
  h('div.row', [30, 45, 60].map((m) => h('button.btn.small', { type: 'button', onclick: () => setIn(m) }, `${m} min from now`))),
  h('label.field', h('span', 'What to work on'), focus),
  h('label.field', h('span', 'Question of the day'), q),
  h('div.field', h('span', 'Standards for today'), picks),
  h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Save'))), { wide: false });
}

export async function viewProject(main, classId) {
  const cls = await app.store.getClass(classId);
  if (!cls) throw new Error('That class was not found.');
  let board = await app.store.classBoard(classId);
  let plan = currentPlan(await app.store.getClassPlan(classId));
  let showAnswer = false;

  const clock = h('div.pj-clock', { 'aria-live': 'off' });
  const panels = h('div.pj-panels');

  const savePlan = async (next) => {
    plan = next;
    draw();
    tick();
    await attempt(() => app.store.saveClassPlan(classId, next));
  };

  function tick() {
    if (!plan.timer_end) {
      clear(clock).append(h('button.pj-set', { onclick: setup }, 'Set timer'));
      clock.className = 'pj-clock';
      return;
    }
    const left = Math.round((new Date(plan.timer_end).getTime() - Date.now()) / 1000);
    const over = left <= 0;
    const m = Math.floor(Math.max(left, 0) / 60);
    const s = String(Math.max(left, 0) % 60).padStart(2, '0');
    clock.className = `pj-clock ${over ? 'over' : left <= 180 ? 'soon' : ''}`;
    clear(clock).append(
      h('div.pj-time', over ? 'Time!' : `${m}:${s}`),
      h('div.pj-time-note', over ? 'Save and submit' : left <= 180 ? 'Save your work' : 'left in class'),
      h('button.pj-plus', { onclick: () => {
        const base = Math.max(new Date(plan.timer_end).getTime(), Date.now());
        savePlan({ ...plan, timer_end: new Date(base + 300000).toISOString() });
      } }, '+5'),
    );
  }

  function setup() {
    openSetup(plan, lessonsInUse(board), savePlan);
  }

  function workPanel(lessons) {
    const custom = plan.focus.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3);
    return h('section.pj-panel.pj-work',
      h('h2', 'Today'),
      custom.length
        ? h('ul.pj-focus', custom.map((x) => h('li', x)))
        : h('ul.pj-focus', lessons.slice(0, 3).map(({ id, n }) => h('li', getLesson(id).title, h('span.pj-count', n)))),
      !custom.length && h('p.pj-sub', 'Open Home and keep going on your next lesson.'),
    );
  }

  function questionPanel(lessons) {
    const bank = plan.question ? null : suggestedQuestion(lessons);
    return h('section.pj-panel.pj-question',
      h('div.read-row', h('h2', 'Question of the day'), readButton(() => (plan.question || (bank ? `${bank.q} ${bank.options.map((o, i) => `Choice ${i + 1}: ${o}.`).join(' ')}` : '')))),
      plan.question
        ? h('p.pj-q', plan.question)
        : bank
          ? [
            h('div.pj-q', md(bank.q)),
            bank.code && h('pre.snippet.pj-code', h('code', bank.code)),
            h('ol.pj-options', { type: 'A' }, bank.options.map((o, i) => h('li', { class: showAnswer && i === bank.answer ? 'right' : '' }, md(o)))),
            h('button.pj-reveal', { onclick: () => { showAnswer = !showAnswer; draw(); } }, showAnswer ? 'Hide answer' : 'Show answer'),
          ]
          : h('p.pj-empty', 'Set a question for today.'),
    );
  }

  function standardsPanel(lessons) {
    const codes = plan.standards.length ? plan.standards : autoStandards(lessons);
    return h('section.pj-panel.pj-standards',
      h('h2', 'MA DLCS standards'),
      h('ul', codes.map((c) => h('li', h('strong', shortCode(c)), ' ', standardByCode(c).text))),
    );
  }

  function draw() {
    const lessons = lessonsInUse(board);
    clear(panels).append(
      workPanel(lessons),
      questionPanel(lessons),
      h('section.pj-panel.pj-progress', h('h2', 'The trail'), progression(board)),
      h('section.pj-panel.pj-feed-panel', h('h2', 'Recent achievements'), achievements(board)),
      standardsPanel(lessons),
    );
    setTimeout(() => fitTrail(panels), 0);
  }

  draw();
  tick();

  const ticker = setInterval(tick, 1000);
  // Light polling: one call a minute keeps the display current without using up the class's quota.
  const poller = setInterval(async () => {
    const fresh = await attempt(() => app.store.classBoard(classId));
    if (fresh) { board = fresh; draw(); }
  }, 60000);

  const onResize = () => fitTrail(panels);
  window.addEventListener('resize', onResize);
  document.body.classList.add('projecting');
  app.cleanup = () => {
    window.removeEventListener('resize', onResize);
    clearInterval(ticker);
    clearInterval(poller);
    document.body.classList.remove('projecting');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const fullScreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => toast('Press F11 for full screen.'));
    if (!document.documentElement.requestFullscreen) toast('Press F11 for full screen.');
  };

  return h('div.pj',
    h('header.pj-head',
      h('div', h('h1', cls.name), h('p', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))),
      h('div.pj-controls',
        h('button.btn.small', { onclick: setup }, 'Set up today'),
        h('button.btn.small', { onclick: fullScreen }, 'Full screen'),
        h('button.btn.small', { onclick: () => go(`/class/${classId}`) }, 'Exit')),
      clock,
    ),
    panels,
  );
}
