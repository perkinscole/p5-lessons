// App shell and router.
import { h, clear, attempt, toast } from './ui.js';
import { createLocalStore } from './data/local.js';
import { createAppsScriptStore } from './data/appsscript.js';
import { avatarURL, defaultAvatar } from './game/avatar.js';
import { viewLogin, viewNoAccess } from './views/auth.js';
import { viewHome, viewChooseRoad, viewCharacter, SessionEnded } from './views/student.js';
import { viewMap } from './views/map.js';
import { viewLesson } from './views/lesson.js';
import { viewSprites } from './views/sprites.js';
import { viewSounds } from './views/sounds.js';
import { viewArcade } from './views/arcade.js';
import { viewTeacherHome, viewClass, viewReview, viewCurriculum } from './views/teacher.js';
import { viewStandards } from './views/standards.js';
import { viewProject } from './views/project.js';
import { viewQuest } from './views/quest.js';
import { applySettings, openSettings } from './settings.js';
import { initLanguage } from './translate.js';
import { openBugReport, noteError } from './views/bugs.js';

// On Apps Script the page has google.script. Anywhere else it runs as a browser-only demo.
const store = window.google?.script ? createAppsScriptStore() : createLocalStore();

export const app = { store, session: null, cleanup: null };
export const go = (hash) => { location.hash = hash; };

const STUDENT_ROUTES = [
  [/^\/$/, viewHome], [/^\/road$/, viewChooseRoad], [/^\/map$/, viewMap], [/^\/character$/, viewCharacter], [/^\/standards$/, viewStandards],
  [/^\/lesson\/(\w+)$/, viewLesson], [/^\/sprites$/, viewSprites], [/^\/sounds$/, viewSounds], [/^\/arcade$/, viewArcade], [/^\/quest$/, viewQuest],
];
const TEACHER_ROUTES = [
  [/^\/project\/([\w-]+)$/, viewProject],
  [/^\/$/, viewTeacherHome], [/^\/class\/([\w-]+)(?:\/(\w+))?$/, viewClass], [/^\/review\/([\w-]+)$/, viewReview],
  [/^\/curriculum$/, viewCurriculum], [/^\/standards$/, viewStandards], [/^\/lesson\/(\w+)(?:\/(\w+))?$/, viewLesson], [/^\/sprites$/, viewSprites], [/^\/sounds$/, viewSounds],
  [/^\/arcade\/([\w-]+)$/, viewArcade], [/^\/map\/([\w-]+)$/, viewMap],
];

function topbar() {
  const s = app.session;
  const hash = location.hash.slice(1) || '/';
  const link = (href, label) => h('a.nav', { href: `#${href}`, 'aria-current': (href === '/' ? hash === '/' : hash.startsWith(href)) ? 'page' : null }, label);
  const links = s.role === 'student'
    ? [link('/', 'Home'), link('/map', 'Journey'), link('/character', 'Character'), link('/standards', 'Standards'), link('/sprites', 'Sprites'), link('/sounds', 'Sounds'), link('/arcade', 'Arcade'), s.class?.world_mode && link('/quest', 'Quest')]
    : [link('/', 'Classes'), link('/curriculum', 'Lessons'), link('/standards', 'Standards'), link('/sprites', 'Sprites'), link('/sounds', 'Sounds'),
      store.setPreview && h('button.btn.small', { onclick: () => studentView(true), title: 'Use the app as a student would' }, '👀 Student view')];
  const who = s.role === 'student'
    ? [h('img.mini-av', { src: avatarURL(s.student.avatar || defaultAvatar(s.student.id), 2), alt: '' }), s.student.display_name]
    : [s.teacher.display_name];
  return h('header.topbar',
    h('a.brand', { href: '#/', translate: 'no' }, 'Pixel Trail'),
    h('nav.navs', { 'aria-label': 'Main' }, links),
    h('div.who', h('button.btn.small', { onclick: openSettings }, 'Display'), h('button.btn.small', { onclick: openBugReport, title: 'Report a problem', 'aria-label': 'Report a problem' }, '🐞'), h('span.who-name', { translate: 'no' }, who), store.mode === 'local' && h('button.btn.small', { onclick: signOut }, 'Sign out')),
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

  const main = h('main.page', h('p.muted', 'Loading...'));
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
  document.getElementById('app').append(h('p.muted.boot', 'Loading Pixel Trail...'));
  app.session = await attempt(() => store.session()) || null;
  await render();
  window.__ptStarted = true;
})();
