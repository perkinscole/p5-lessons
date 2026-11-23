// App shell and router.
import { h, clear, attempt, toast, loading } from './ui.js';
import { createLocalStore } from './data/local.js';
import { createAppsScriptStore } from './data/appsscript.js';
import { avatarURL, defaultAvatar } from './game/avatar.js';
import { statsFor } from './game/rules.js';
import { xpPurse, setPurse } from './celebrate.js';
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
  [/^\/lesson\/(\w+)$/, viewLesson], [/^\/sprites$/, viewSprites], [/^\/sounds$/, viewSounds], [/^\/arcade$/, viewArcade], [/^\/quest$/, viewQuest],
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
  clear(root).append(store.mode === 'local' ? demoBanner() : '', app.session.preview ? previewBanner() : '', topbar(), main);
  try {
    const content = await view(main, ...match.slice(1));
    if (token !== renderToken) return;
    if (content) clear(main).append(content);
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
