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
import { viewArcade } from './views/arcade.js';
import { viewTeacherHome, viewClass, viewReview, viewCurriculum } from './views/teacher.js';
import { viewStandards } from './views/standards.js';
import { viewProject } from './views/project.js';
import { applySettings, openSettings } from './settings.js';

// On Apps Script the page has google.script. Anywhere else it runs as a browser-only demo.
const store = window.google?.script ? createAppsScriptStore() : createLocalStore();

export const app = { store, session: null, cleanup: null };
export const go = (hash) => { location.hash = hash; };

const STUDENT_ROUTES = [
  [/^\/$/, viewHome], [/^\/road$/, viewChooseRoad], [/^\/map$/, viewMap], [/^\/character$/, viewCharacter], [/^\/standards$/, viewStandards],
  [/^\/lesson\/(\w+)$/, viewLesson], [/^\/sprites$/, viewSprites], [/^\/arcade$/, viewArcade],
];
const TEACHER_ROUTES = [
  [/^\/project\/([\w-]+)$/, viewProject],
  [/^\/$/, viewTeacherHome], [/^\/class\/([\w-]+)(?:\/(\w+))?$/, viewClass], [/^\/review\/([\w-]+)$/, viewReview],
  [/^\/curriculum$/, viewCurriculum], [/^\/standards$/, viewStandards], [/^\/lesson\/(\w+)(?:\/(\w+))?$/, viewLesson], [/^\/sprites$/, viewSprites],
  [/^\/arcade\/([\w-]+)$/, viewArcade], [/^\/map\/([\w-]+)$/, viewMap],
];

function topbar() {
  const s = app.session;
  const hash = location.hash.slice(1) || '/';
  const link = (href, label) => h('a.nav', { href: `#${href}`, 'aria-current': (href === '/' ? hash === '/' : hash.startsWith(href)) ? 'page' : null }, label);
  const links = s.role === 'student'
    ? [link('/', 'Home'), link('/map', 'Journey'), link('/character', 'Character'), link('/standards', 'Standards'), link('/sprites', 'Sprites'), link('/arcade', 'Arcade')]
    : [link('/', 'Classes'), link('/curriculum', 'Lessons'), link('/standards', 'Standards'), link('/sprites', 'Sprites')];
  const who = s.role === 'student'
    ? [h('img.mini-av', { src: avatarURL(s.student.avatar || defaultAvatar(s.student.id), 2), alt: '' }), s.student.display_name]
    : [s.teacher.display_name];
  return h('header.topbar',
    h('a.brand', { href: '#/' }, 'Pixel Trail'),
    h('nav.navs', { 'aria-label': 'Main' }, links),
    h('div.who', h('button.btn.small', { onclick: openSettings }, 'Display'), who, store.mode === 'local' && h('button.btn.small', { onclick: signOut }, 'Sign out')),
  );
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
  clear(root).append(store.mode === 'local' ? demoBanner() : '', topbar(), main);
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

// Handle in-app links here, so they always stay inside the frame Apps Script serves the app in.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  location.hash = a.getAttribute('href');
});

applySettings();

(async function start() {
  document.getElementById('app').append(h('p.muted.boot', 'Loading Pixel Trail...'));
  app.session = await attempt(() => store.session()) || null;
  render();
})();
