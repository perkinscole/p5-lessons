// The class display: what a teacher projects during student-led work time.
// Everything here is safe to show the room: no scores, feedback, or emails.
import { h, clear, modal, toast, attempt } from '../ui.js';
import { app, go } from '../main.js';
import { readButton } from '../settings.js';
import { getLesson, allLessons } from '../curriculum/engine.js';
import { PATHS, STAGES, stageOf, isSideTrail, sequence } from '../curriculum/graph.js';
import { alignmentFor, coverage, standardByCode } from '../curriculum/alignment.js';
import { bigQuestionFor } from '../curriculum/big.js';
import { recentAchievements } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { planRace, paintRace } from '../game/raceworld.js';
import { standingOn } from './map.js';
import { helpCard } from './feedback.js';
import { chime } from '../celebrate.js';

// Students with an open "I'm stuck" request, so their character can wave on the display.
let needsHelp = new Set();

const todayKey = () => new Date().toLocaleDateString('en-CA');
const shortCode = (code) => code.replace('6-8.', '');
const emptyPlan = () => ({ day: todayKey(), question: '', focus: '', standards: [], timer_end: '', lesson: '' });
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

/** The big question of the lesson most of the class is on: what today is really about. */
function suggestedQuestion(lessons) {
  for (const { id } of lessons) if (bigQuestionFor(id)) return { q: bigQuestionFor(id), id };
  return null;
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

// What the race is showing right now: its stops, and who stands at each. Kept so the world can be
// laid out again whenever the panel changes size, without asking the server.
let race = null;
// Where each student was standing the last time the race was drawn, so a student who has moved on
// can be shown walking there.
let spots = new Map();
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lay the race out for the panel as it is now: plan the little world, paint the land, and put each
 * character, name and sign where the plan says. With `walk`, a student who has moved to another
 * stop since last time walks there from where they stood.
 */
function settle(root, walk) {
  const el = root.querySelector('.pj-race');
  const canvas = el && el.querySelector('canvas.pj-world');
  if (!canvas || !race) return;
  const W = Math.round(el.clientWidth);
  const H = Math.round(el.clientHeight);
  if (W < 80 || H < 80) return;
  const plan = planRace(race.groups.map((g) => g.map((s) => s.display_name)), W, H, { maxSize: window.innerHeight * 0.16, seed: race.seed });
  const theme = document.documentElement.dataset.theme;
  const night = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== W * ratio || canvas.height !== H * ratio) { canvas.width = W * ratio; canvas.height = H * ratio; }
  const g = canvas.getContext('2d');
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  paintRace(g, plan, { W, H, look: race.stops.map((st) => ({ hue: st.hue, kind: st.kind })), night, plain: theme === 'contrast' });

  // Signs go on the front of each terrace, as wide as the terrace is on screen.
  el.querySelectorAll('.pj-sign').forEach((sign, i) => {
    const t = plan.terraces[i];
    const mid = plan.project(t.sign.x, t.sign.y, t.sign.z);
    const wide = plan.project(t.x1, t.sign.y, t.sign.z).x - plan.project(t.x0, t.sign.y, t.sign.z).x;
    sign.style.left = `${mid.x}px`;
    sign.style.top = `${mid.y}px`;
    sign.style.setProperty('--u', `${mid.s}px`);
    sign.style.maxWidth = `${Math.max(20, wide - 4)}px`;
    // A name cut down to a letter or two says nothing, so a narrow terrace shows its number alone.
    sign.classList.toggle('tight', wide < mid.s * 2.6);
  });
  // Characters stand where the plan says, nearer ones in front of farther ones.
  const now = new Map();
  el.querySelectorAll('.pj-person[data-id]').forEach((chip) => {
    const slot = (plan.slots[Number(chip.dataset.stop)] || [])[Number(chip.dataset.place)];
    if (!slot) return;
    chip.style.left = `${slot.sx}px`;
    chip.style.top = `${slot.sy}px`;
    chip.style.setProperty('--ph', `${slot.h}px`);
    chip.style.setProperty('--wide', `${slot.wide * slot.h}px`);
    chip.style.zIndex = String(2000 - Math.round(slot.far * 40));
    const look = race.stops[Number(chip.dataset.stop)] || {};
    if (look.hue !== null && look.hue !== undefined) chip.style.setProperty('--hue', String(look.hue));
    if (look.kind) chip.dataset.kind = look.kind;
    const here = { x: slot.sx, y: slot.sy, stop: chip.dataset.stop };
    now.set(chip.dataset.id, here);
    const was = spots.get(chip.dataset.id);
    if (!walk || !was || was.stop === here.stop || still()) return;
    const dx = was.x - here.x;
    const dy = was.y - here.y;
    // A pace that makes a short hop quick and a long climb take a few seconds.
    const seconds = Math.max(1.4, Math.min(5, Math.hypot(dx, dy) / 140));
    chip.classList.add('walking');
    chip.style.transition = 'none';
    chip.style.transform = `translate(${dx}px, ${dy}px)`;
    chip.getBoundingClientRect();
    chip.style.transition = `transform ${seconds}s linear`;
    chip.style.transform = '';
    const done = () => { chip.classList.remove('walking'); chip.style.transition = ''; chip.removeEventListener('transitionend', arrived); };
    // Only the chip's own walk ending counts: other transitions inside it bubble up here too.
    const arrived = (e) => { if (e.target === chip && e.propertyName === 'transform') done(); };
    chip.addEventListener('transitionend', arrived);
    setTimeout(done, seconds * 1000 + 300);
  });
  spots = now;
}

// Each step has its own colour, with neighbours far apart, so it is plain from the back of the room which block someone is on.
const STEP_HUES = [205, 28, 275, 140, 340, 52, 178, 310, 95, 232];
const sameDay = (iso) => !!iso && new Date(iso).toLocaleDateString('en-CA') === todayKey();
// A student who asked for help turns red and raises a hand, with a red hand over their head. The
// teacher asked for this to be plain from across the room. What they wrote stays off the projector.
const personChip = (s, stop, place) => {
  const asking = needsHelp.has(s.id);
  return h('div.pj-person', { translate: 'no', 'data-id': s.id, 'data-stop': String(stop), 'data-place': String(place), class: asking ? 'needs-help' : '', title: s.display_name, style: s.path ? `--road:${PATHS[s.path].color}` : null },
    // The size is given up front, so the layout is right before the picture has loaded.
    h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 3, { hand: asking }), width: 72, height: 48, alt: '' }),
    h('span', s.display_name),
    asking && h('b.pj-hand', { 'aria-label': 'asked for help' }, '✋'));
};

/**
 * The lesson most of the class is on, as a race: each step is a stop, and each student stands at
 * the furthest step they have reached. Students who submit it today cross the finish.
 */
function raceWorld(stops, at, busiest, lessonId) {
  // The land is picked from the lesson and the day, so it stays put through a class and is a
  // different walk tomorrow.
  let seed = 7;
  for (const ch of `${lessonId}|${todayKey()}`) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0;
  race = {
    seed: Math.abs(seed) % 100000 + 1,
    stops: stops.map((st) => ({ hue: typeof st.key === 'number' ? STEP_HUES[st.key % STEP_HUES.length] : null, kind: typeof st.key === 'number' ? '' : st.key })),
    groups: stops.map((st) => at.get(st.key)),
  };
  return h('div.pj-race.pj-world3d',
    h('canvas.pj-world', { 'aria-hidden': 'true' }),
    stops.map((st, i) => {
      const here = at.get(st.key);
      const busy = typeof st.key === 'number' && here.length > 0 && here.length === busiest;
      return h('div.pj-sign', { class: `${typeof st.key === 'number' ? '' : st.key} ${busy ? 'busy' : ''}`, style: race.stops[i].hue === null ? null : `--hue:${race.stops[i].hue}`, title: st.label },
        h('b.pj-stop-mark', st.mark), h('span.pj-stop-label', st.label));
    }),
    stops.map((st, i) => at.get(st.key).map((s, k) => personChip(s, i, k))));
}

function racePanel(board, lessons, focus, picked) {
  const main = lessons[0];
  if (!main) return h('section.pj-panel.pj-race-panel', h('h2', 'Today'), h('p.pj-sub', 'Nobody has started yet. Open Home to begin.'));
  const lesson = getLesson(main.id);
  const last = lesson.steps.length - 1;
  const stops = [
    { key: 'start', mark: '▶', label: 'Not started' },
    ...lesson.steps.map((st, i) => ({ key: i, mark: String(i + 1), label: st.title })),
    { key: 'finish', mark: '🏁', label: 'Submitted' },
  ];
  const at = new Map(stops.map((st) => [st.key, []]));
  const others = [];
  for (const s of board) {
    const w = s.works.find((x) => x.lesson_id === main.id);
    const handedIn = w && (w.status === 'submitted' || w.status === 'approved');
    if (picked && w) at.get(handedIn ? 'finish' : Math.min(Number(w.step_at) || 0, last)).push(s);
    else if (standingOn(s) === main.id) {
      if (!w) at.get('start').push(s);
      else if (handedIn) at.get('finish').push(s);
      else at.get(Math.min(Number(w.step_at) || 0, last)).push(s);
    } else if (handedIn && sameDay(w.submitted_at)) at.get('finish').push(s);
    else others.push(s);
  }
  const working = lesson.steps.reduce((a, _, i) => a + at.get(i).length, 0);
  const busiest = Math.max(...lesson.steps.map((_, i) => at.get(i).length));
  const where = (s) => {
    const id = standingOn(s);
    const n = sequence(s.path).indexOf(id) + 1;
    return n ? `Lesson ${n}` : getLesson(id).title;
  };
  return h('section.pj-panel.pj-race-panel',
    h('div.pj-race-head',
      h('h2', `Today: ${lesson.title}`),
      h('span.pj-sub', `${working} working · ${at.get('finish').length} submitted · ${at.get('start').length} not started`)),
    focus.length > 0 && h('ul.pj-race-focus', focus.map((x) => h('li', x))),
    // The race is a little block world seen at an angle: a staircase of terraces, one for each step,
    // with the finish at the top. The land is painted on the canvas, and the signs and characters
    // are placed over it by settle().
    raceWorld(stops, at, busiest, main.id),
    others.length > 0 && h('div.pj-others', h('strong', 'On other lessons:'),
      others.map((s) => h('span.pj-other', { class: needsHelp.has(s.id) ? 'needs-help' : '' }, h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), `${s.display_name} · ${where(s)}`))),
  );
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
  const focus = h('textarea', { rows: 3, maxlength: 300, value: plan.focus, placeholder: 'Optional. One item per line, shown above the race.' });
  const endValue = plan.timer_end ? new Date(plan.timer_end) : null;
  const pad = (n) => String(n).padStart(2, '0');
  // Which lesson the race shows. Left on automatic, it is the one most students are on.
  const inUse = new Set(lessons.map((l) => l.id));
  const lessonPick = h('select', { translate: 'no' },
    h('option', { value: '' }, 'Automatic: the lesson most students are on'),
    h('optgroup', { label: 'Students are on' }, lessons.map((l) => h('option', { value: l.id, selected: plan.lesson === l.id }, `${getLesson(l.id).title} · ${l.n}`))),
    h('optgroup', { label: 'Every lesson' }, allLessons().filter((l) => !inUse.has(l.id) && !isSideTrail(l.id)).map((l) => h('option', { value: l.id, selected: plan.lesson === l.id }, l.title))));
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
      const next = { day: todayKey(), question: q.value.trim(), focus: focus.value.trim(), standards: picks.map((p) => p.value).filter(Boolean), timer_end: timer, lesson: lessonPick.value };
      close();
      onSave(next);
    },
  },
  h('h2', 'Set up today'),
  h('label.field', h('span', 'Class ends at'), end),
  h('div.row', [30, 45, 60].map((m) => h('button.btn.small', { type: 'button', onclick: () => setIn(m) }, `${m} min from now`))),
  h('label.field', h('span', 'Lesson to show'), lessonPick),
  h('label.field', h('span', 'What to work on'), focus),
  h('label.field', h('span', 'Question of the day'), q),
  h('div.field', h('span', 'Standards for today'), picks),
  h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Save'))), { wide: false });
}

export async function viewProject(main, classId) {
  const [cls, firstBoard, savedPlan] = await Promise.all([app.store.getClass(classId), app.store.classBoard(classId), app.store.getClassPlan(classId)]);
  if (!cls) throw new Error('That class was not found.');
  let board = firstBoard;
  let plan = currentPlan(savedPlan);

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

  function questionPanel(lessons) {
    const bank = plan.question ? null : suggestedQuestion(lessons);
    return h('section.pj-panel.pj-question',
      h('div.read-row', h('h2', 'Question of the day'), readButton(() => plan.question || (bank ? bank.q : ''))),
      plan.question
        ? h('p.pj-q', plan.question)
        : bank
          ? [h('p.pj-q', bank.q), h('p.pj-from', getLesson(bank.id).title)]
          : h('p.pj-empty', 'Set a question for today.'),
    );
  }

  function standardsPanel(lessons) {
    const codes = plan.standards.length ? plan.standards : autoStandards(lessons);
    return h('section.pj-panel.pj-standards',
      h('h2', 'MA DLCS standards'),
      h('ul', codes.map((c) => h('li', { translate: 'no' }, h('strong', shortCode(c)), ' ', standardByCode(c).text))),
    );
  }

  function draw() {
    const found = lessonsInUse(board);
    // The teacher's choice goes first, so the race, the question, and the standards all follow it.
    const picked = !!plan.lesson && !!getLesson(plan.lesson);
    const lessons = picked ? [found.find((l) => l.id === plan.lesson) || { id: plan.lesson, n: 0 }, ...found.filter((l) => l.id !== plan.lesson)] : found;
    const custom = plan.focus.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3);
    clear(panels).append(
      racePanel(board, lessons, custom, picked),
      questionPanel(lessons),
      h('section.pj-panel.pj-feed-panel', h('h2', 'Recent achievements'), achievements(board)),
      standardsPanel(lessons),
    );
    setTimeout(() => settle(panels, true), 0);
  }

  draw();
  tick();

  const ticker = setInterval(tick, 1000);
  // Light polling: one call a minute keeps the display current without using up the class's quota.
  const poller = setInterval(async () => {
    if (document.hidden) return;
    const fresh = await attempt(() => app.store.classBoard(classId));
    if (fresh) { board = fresh; draw(); }
  }, 60000);

  // Help requests are checked every few seconds, apart from the slower refresh above.
  needsHelp = new Set();
  const helpButton = h('button.btn.small.pj-help-btn', { hidden: true, title: 'See who asked for help', onclick: () => modal((close) => h('div.stack', help.el, h('div.row.end', h('button.btn.primary', { onclick: close }, 'Done')))) });
  const help = helpCard(classId, { onUpdate: (list) => {
    helpButton.hidden = list.length === 0;
    helpButton.textContent = `✋ ${list.length} need${list.length === 1 ? 's' : ''} help`;
    helpButton.setAttribute('aria-label', `${list.length} asked for help. Open the list.`);
    const next = new Set(list.map((r) => r.student_id));
    if (next.size !== needsHelp.size || [...next].some((x) => !needsHelp.has(x))) { needsHelp = next; draw(); }
  } });

  // The size is worked out again whenever the panel itself changes size, not only the window: the
  // header growing or the fonts arriving also move things. Positions are forgotten then, so a
  // resize is not mistaken for students walking.
  let settling = 0;
  const onResize = () => { cancelAnimationFrame(settling); settling = requestAnimationFrame(() => { spots = new Map(); settle(panels, true); }); };
  window.addEventListener('resize', onResize);
  const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  if (watcher) watcher.observe(panels);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  spots = new Map();
  document.body.classList.add('projecting');
  app.cleanup = () => {
    help.stop();
    window.removeEventListener('resize', onResize);
    if (watcher) watcher.disconnect();
    cancelAnimationFrame(settling);
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
      // The red hand sits by itself, at full strength, so it is seen from anywhere in the room.
      helpButton,
      h('div.pj-controls',
        h('button.btn.small', { onclick: setup }, 'Set up today'),
        h('button.btn.small', { title: 'Play the help doorbell, to test the sound on this computer', 'aria-label': 'Test the help doorbell', onclick: () => chime('doorbell') }, '🔔'),
        h('button.btn.small', { onclick: fullScreen }, 'Full screen'),
        h('button.btn.small', { onclick: () => go(`/class/${classId}`) }, 'Exit')),
      clock,
    ),
    panels,
  );
}
