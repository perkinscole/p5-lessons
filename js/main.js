// App shell and router.
import { getLesson } from './curriculum/engine.js';
import { h, clear, attempt, toast, loading, modal } from './ui.js';
import { createLocalStore } from './data/local.js';
import { createAppsScriptStore } from './data/appsscript.js';
import { avatarURL, defaultAvatar } from './game/avatar.js';
import { statsFor, noticesFrom } from './game/rules.js';
import { xpPurse, setPurse, chime } from './celebrate.js';
import { viewLogin, viewNoAccess } from './views/auth.js';
import { viewHome, viewChooseRoad, viewCharacter, SessionEnded } from './views/student.js';
import { viewMap } from './views/map.js';
import { viewLesson } from './views/lesson.js';
import { viewSprites } from './views/sprites.js';
import { viewSounds } from './views/sounds.js';
import { viewArcade } from './views/arcade.js';
import { viewAllFeedback } from './views/feedback.js';
import { viewTeacherHome, viewClass, viewReview, viewCurriculum } from './views/teacher.js';
import { viewStandards } from './views/standards.js';
import { viewMaterials } from './views/materials.js';
import { viewProject } from './views/project.js';
import { viewQuest } from './views/quest.js';
import { viewCheats } from './views/cheats.js';
import { applySettings, openSettings } from './settings.js';
import { initLanguage } from './translate.js';
import { lessonForStop } from './curriculum/classroom.js';
import { PATH_IDS } from './curriculum/graph.js';
import { openBugReport, noteError } from './views/bugs.js';

// On Apps Script the page has google.script. Anywhere else it runs as a browser-only demo.
// The Apps Script build sets DEMO to false (tools/build-gas.mjs), which lets it leave the demo
// store out of the packed app altogether. Run straight from the files, DEMO does not exist.
// With no demo to fall back on, the packed app says why it cannot start anywhere but Apps Script.
if (typeof DEMO !== 'undefined' && !DEMO && !window.google?.script) throw new Error('This copy of Pixel Trail only runs on Google Apps Script, and google.script is missing from this page.');
const store = (typeof DEMO === 'undefined' || DEMO) && !window.google?.script ? createLocalStore() : createAppsScriptStore();

export const app = { store, session: null, cleanup: null };
export const go = (hash) => { location.hash = hash; };

const STUDENT_ROUTES = [
  [/^\/$/, viewHome], [/^\/road$/, viewChooseRoad], [/^\/map$/, viewMap], [/^\/character$/, viewCharacter], [/^\/standards$/, viewStandards],
  [/^\/lesson\/(\w+)$/, viewLesson], [/^\/sprites$/, viewSprites], [/^\/sounds$/, viewSounds], [/^\/arcade$/, viewArcade], [/^\/quest$/, viewQuest], [/^\/cheats$/, viewCheats],
];
const TEACHER_ROUTES = [
  [/^\/project\/([\w-]+)$/, viewProject],
  [/^\/$/, viewTeacherHome], [/^\/feedback$/, viewAllFeedback], [/^\/class\/([\w-]+)(?:\/(\w+))?$/, viewClass], [/^\/review\/([\w-]+)$/, viewReview],
  [/^\/curriculum$/, viewCurriculum], [/^\/materials\/(\w+)(?:\/(\w+))?(?:\/(\w+))?$/, viewMaterials], [/^\/standards$/, viewStandards], [/^\/lesson\/(\w+)(?:\/(\w+))?$/, viewLesson], [/^\/sprites$/, viewSprites], [/^\/sounds$/, viewSounds],
  [/^\/arcade\/([\w-]+)$/, viewArcade], [/^\/map\/([\w-]+)$/, viewMap],
];

function topbar() {
  const s = app.session;
  const hash = location.hash.slice(1) || '/';
  const link = (href, label) => h('a.nav', { href: `#${href}`, 'aria-current': (href === '/' ? hash === '/' : hash.startsWith(href)) ? 'page' : null }, label);
  // A student's top bar is a few named places. Tools and Arcade open short lists, so the Music Maker
  // and the games are easy to find without a row of nine links. Inside a lesson, a tool opens over
  // the lesson (`app.lessonTools`) so the student stays where they are.
  const menu = (label, items) => {
    const list = items.filter(Boolean);
    const el = h('details.nav-menu');
    el.append(
      h('summary.nav', { 'aria-current': list.some((x) => hash.startsWith(x.href)) ? 'page' : null }, `${label} ▾`),
      h('div.nav-list', list.map((x) => h('a.nav-item', {
        href: `#${x.href}`,
        onclick: (e) => {
          el.open = false;
          const here = x.tool && app.lessonTools && app.lessonTools[x.tool];
          if (here) { e.preventDefault(); here(); }
        },
      }, x.label))));
    return el;
  };
  const links = s.role === 'student'
    ? [link('/', 'Home'), link('/map', 'Journey'),
      menu('Tools', [
        { href: '/sprites', label: '🎨 Sprites', tool: 'sprites' },
        { href: '/sounds', label: '🔊 Sounds', tool: 'sounds' },
        s.class?.music_open && { href: '/sounds', label: '🎵 Music Maker', tool: 'music' },
        { href: '/cheats', label: '📒 Cheat sheet', tool: 'cheats' },
        { href: '/character', label: '🧍 My character' },
        { href: '/standards', label: '📋 Standards' },
      ]),
      menu('Arcade', [
        { href: '/arcade', label: '🕹️ Class Arcade' },
        s.class?.world_mode && { href: '/quest', label: '⚔️ Trail Quest' },
      ])]
    : [link('/', 'Classes'), link('/curriculum', 'Lessons'), link('/standards', 'Standards'), link('/sprites', 'Sprites'), link('/sounds', 'Sounds'),
      store.setPreview && h('button.btn.small', { onclick: () => studentView(true), title: 'Use the app as a student would' }, '👀 Student view')];
  const who = s.role === 'student'
    ? [h('img.mini-av', { src: avatarURL(s.student.avatar || defaultAvatar(s.student.id), 2), alt: '' }), s.student.display_name]
    : [s.teacher.display_name];
  // Students carry their XP in the top bar. It is filled in from the class board, which pages load anyway.
  if (s.role === 'student' && s.class?.id) {
    store.classBoard(s.class.id).then((board) => {
      const row = board.find((x) => x.id === s.student.id);
      if (row && !document.querySelector('.fx-coin')) setPurse(statsFor({ ...row, path: s.student.path }).xp);
    }).catch(() => {});
  }
  return h('header.topbar',
    h('a.brand', { href: '#/', translate: 'no' }, 'Pixel Trail'),
    h('nav.navs', { 'aria-label': 'Main' }, links),
    h('div.who', s.role === 'student' && xpPurse(), h('button.btn.small', { onclick: openSettings }, 'Display'), h('button.btn.small.tb-bug', { onclick: openBugReport, title: 'Report a problem', 'aria-label': 'Report a problem' }, '🐞'), h('span.who-name', { translate: 'no' }, who), store.mode === 'local' && h('button.btn.small.tb-out', { onclick: signOut }, 'Sign out')),
  );
}

/** Teachers can step into a pretend student of their own, and back out. */
async function studentView(on) {
  store.setPreview(on);
  const s = await attempt(() => store.session());
  if (!s) { store.setPreview(false); return; }
  app.session = s;
  if (location.hash.slice(1) && location.hash.slice(1) !== '/') go('/'); else render();
}
function previewBanner() {
  return h('aside.demo-banner.preview-banner', { 'aria-label': 'Student view' },
    h('span', '👀 Student view: this is what a student sees. Nothing here reaches your classes. On Character, everything is unlocked so you can try it.'),
    h('button.btn.small', { onclick: async () => { if (await attempt(() => store.previewReset())) { await studentView(true); toast('Started over as a new student.'); } } }, 'Start over'),
    h('button.btn.small', { onclick: () => studentView(false) }, 'Back to teacher'));
}

async function signOut() {
  await attempt(() => store.signOut());
  app.session = null;
  go('/');
  render();
}

/** The stop named in the page's address (?stop=L7), or ''. Apps Script hides the address, so it has to be asked for. */
function stopFromLink() {
  return new Promise((resolve) => {
    const done = (v) => resolve(/^L\d{1,2}$/.test(String(v || '')) ? String(v) : '');
    try {
      const url = window.google?.script?.url;
      if (url && url.getLocation) {
        // If Google never answers, carry on to Home after a moment instead of waiting.
        const giveUp = setTimeout(() => done(''), 1500);
        url.getLocation((loc) => { clearTimeout(giveUp); done(loc && loc.parameter && loc.parameter.stop); });
        return;
      }
    } catch (_) { /* fall through to the page's own address */ }
    try { done(new URLSearchParams(location.search).get('stop')); } catch (_) { done(''); }
  });
}

// What kind of user opened the app here last, and their class. No names: only enough to ask early for the right things.
const BOOT_KEY = 'pixeltrail.boot';
function bootHint() { try { return JSON.parse(localStorage.getItem(BOOT_KEY) || 'null'); } catch (_) { return null; } }
function rememberBoot(session) {
  try {
    if (session && session.role && !session.preview) localStorage.setItem(BOOT_KEY, JSON.stringify({ role: session.role, class: session.class ? session.class.id : '' }));
    else if (!session) localStorage.removeItem(BOOT_KEY);
  } catch (_) { /* Then the first page just takes one more trip. */ }
}

// Telling a student about their teacher's feedback -------------------------------------------------
// Play pages close while a lesson is sent back. The teacher asked for this after students stayed in
// the Arcade without ever seeing that work had come back.
const PLAY = /^\/(arcade|quest)$/;
let noticeTimer = null;
const rung = new Set();
const seenKey = () => `pixeltrail.feedback.${app.session?.student?.id || ''}`;
function readSeenFeedback() { try { return JSON.parse(localStorage.getItem(seenKey()) || 'null'); } catch (_) { return null; } }
function saveSeenFeedback(stamp) { try { localStorage.setItem(seenKey(), JSON.stringify(stamp)); } catch (_) { /* Then it is announced again next visit. */ } }
const ringOnce = (key) => { if (!rung.has(key)) { rung.add(key); chime('doorbell'); } };

/** Shows what is new, and sends a student out of a play page if a lesson was sent back. Returns 'left' if it did. */
function tellStudent(works, path, main) {
  const seen = readSeenFeedback();
  const { returned, fresh, stamp } = noticesFrom(works, seen);
  if (!seen) saveSeenFeedback(stamp);
  const title = (w) => (getLesson(w.lesson_id) || { title: 'a lesson' }).title;
  if (returned.length && PLAY.test(path)) {
    const w = returned[0];
    ringOnce(`back:${w.id}:${w.grade?.graded_at || ''}`);
    go('/');
    modal((close) => h('div.stack.sent-back',
      h('p.eyebrow', 'From your teacher'),
      h('h2', `✋ Your teacher sent back ${title(w)}`),
      w.grade?.feedback && h('blockquote', { translate: 'no' }, w.grade.feedback),
      h('p', 'Fix it and submit it again. The Arcade and Trail Quest open again after that.'),
      h('div.row.end', h('a.btn.primary.big', { href: `#/lesson/${w.lesson_id}`, onclick: close }, 'Open the lesson'))));
    return 'left';
  }
  main.querySelectorAll('.notice').forEach((x) => x.remove());
  const bars = [];
  // Home already has a card for lessons sent back, so the bar is for every other page.
  if (returned.length && path !== '/') {
    const w = returned[0];
    ringOnce(`back:${w.id}:${w.grade?.graded_at || ''}`);
    bars.push(h('div.notice.sent-back', { role: 'status' }, h('span', '✋ Your teacher sent back ', h('strong', title(w)), '. Read the feedback and fix it.'),
      h('a.btn.small.primary', { href: `#/lesson/${w.lesson_id}` }, 'Open it')));
  }
  if (fresh.length) {
    const w = fresh[0];
    ringOnce(`new:${w.id}:${w.grade.graded_at}`);
    const bar = h('div.notice', { role: 'status' },
      h('span', '💬 New feedback from your teacher on ', h('strong', title(w)), fresh.length > 1 ? ` and ${fresh.length - 1} more` : '', w.grade.feedback ? ': ' : '.',
        w.grade.feedback && h('em', { translate: 'no' }, w.grade.feedback.length > 160 ? `${w.grade.feedback.slice(0, 160)}…` : w.grade.feedback)),
      h('a.btn.small', { href: `#/lesson/${w.lesson_id}`, onclick: () => saveSeenFeedback(stamp) }, 'Open the lesson'),
      h('button.btn.small', { type: 'button', onclick: () => { saveSeenFeedback(stamp); bar.remove(); } }, 'Got it'));
    bars.push(bar);
  }
  if (bars.length) main.prepend(...bars);
  return '';
}

let renderToken = 0;

export async function render() {
  const token = ++renderToken;
  if (app.cleanup) { await attempt(app.cleanup); app.cleanup = null; }
  const root = document.getElementById('app');
  const path = location.hash.slice(1) || '/';

  if (!app.session) {
    clear(root).append(store.mode === 'local' ? viewLogin() : viewNoAccess());
    return;
  }

  const routes = app.session.role === 'student' ? STUDENT_ROUTES : TEACHER_ROUTES;
  let match = null;
  let view = null;
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) { match = m; view = fn; break; }
  }
  if (!view) { go('/'); return; }

  const main = h('main.page', loading());
  // A student's page also asks whether the teacher has sent anything back. It is asked for here,
  // before the page asks for its own things, so both travel in the same trip. The lesson page is
  // left alone: it shows its own feedback.
  clearInterval(noticeTimer);
  const isStudent = app.session.role === 'student';
  const asked = isStudent && !/^\/lesson\//.test(path) ? store.myWorks([]).catch(() => null) : null;
  clear(root).append(store.mode === 'local' ? demoBanner() : '', app.session.preview ? previewBanner() : '', topbar(), main);
  try {
    const content = await view(main, ...match.slice(1));
    if (token !== renderToken) return;
    if (content) clear(main).append(content);
    if (asked) {
      const works = await asked;
      if (token !== renderToken) return;
      if (works && tellStudent(works, path, main) === 'left') return;
      // While a student is playing, look again now and then, so being sent back reaches them there.
      if (PLAY.test(path)) {
        noticeTimer = setInterval(async () => {
          if (document.hidden) return;
          const again = await store.myWorks([]).catch(() => null);
          if (again && token === renderToken) tellStudent(again, path, main);
        }, 60000);
      }
    }
  } catch (e) {
    if (e instanceof SessionEnded) {
      app.session = null;
      go('/');
      render();
      toast('Please sign in again.');
      return;
    }
    console.error(e);
    if (token === renderToken) clear(main).append(h('div.card.stack', h('h2', 'That page could not load.'), h('p', e.message), h('p', h('a', { href: '#/' }, 'Go back home'))));
  }
}

function demoBanner() {
  return h('aside.demo-banner', { 'aria-label': 'Demo notice' }, 'Demo mode: data stays in this browser. See the README to put this on Apps Script for real classes.');
}

/** Refresh the signed-in user's cached details after a profile change. */
export async function refreshSession() {
  app.session = await store.session();
}

window.addEventListener('hashchange', render);
// Remembered for a moment, so a problem report can say what the page saw go wrong.
window.addEventListener('error', (e) => noteError(`${e.message} (${String(e.filename || '').split('/').pop()}:${e.lineno || 0})`));
window.addEventListener('unhandledrejection', (e) => noteError(`Promise: ${e.reason?.message || e.reason}`));
initLanguage(store);

// While the server is busy and requests are being retried, say so quietly instead of showing an error.
let busyNote = null;
window.addEventListener('app-busy', (e) => {
  if (e.detail && !busyNote) {
    busyNote = h('div.toast.busy-note', 'Busy… saving your work. Keep going.');
    document.getElementById('toasts').append(busyNote);
  } else if (!e.detail && busyNote) {
    busyNote.remove();
    busyNote = null;
  }
});

// A menu closes when something outside it is pressed.
document.addEventListener('click', (e) => {
  document.querySelectorAll('details.nav-menu[open], details.more-menu[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
});

// Handle in-app links here, so they always stay inside the frame Apps Script serves the app in.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  location.hash = a.getAttribute('href');
});

applySettings();

(async function start() {
  window.__ptBooted = true; // Index.html's startup check reads these two.
  // Index.html already shows the loading screen. Ask for who is signed in, and in the same trip
  // for what Home will need, guessed from last time on this device. A wrong guess costs nothing:
  // the answers are just not used.
  const first = attempt(() => store.session());
  const hint = bootHint();
  if (hint && hint.role === 'student' && store.mode === 'appsscript' && !/^#\/lesson\//.test(location.hash)) {
    store.myWorks([]).catch(() => {});
    if (hint.class) store.classBoard(hint.class).catch(() => {});
  }
  app.session = await first || null;
  rememberBoot(app.session);
  // A link from a Classroom assignment opens that stop: the lesson on this student's own road.
  if (app.session && !location.hash.slice(1)) {
    const stop = await stopFromLink();
    if (stop) {
      const student = app.session.role === 'student';
      const id = lessonForStop(stop, student ? app.session.student.path : PATH_IDS[0]);
      if (id) location.hash = `#/lesson/${id}`;
      else if (student) toast('Choose your road first, then open the assignment again.');
    }
  }
  await render();
  window.__ptStarted = true;
})();
