// Reporting a problem with the app itself, and the teacher's list of what was reported.
import { h, clear, toast, attempt, modal, download } from '../ui.js';
import { app } from '../main.js';
import { getSettings } from '../settings.js';
import { buildBugReport } from '../curriculum/report.js';

const errors = [];
/** Keep the last few errors the page saw. They go along with a report, never on their own. */
export function noteError(message) {
  errors.push(`${new Date().toISOString().slice(11, 19)} ${String(message).slice(0, 280)}`);
  if (errors.length > 5) errors.shift();
}

function pageDetails() {
  const page = location.hash.slice(1) || '/';
  const lesson = (page.match(/^\/lesson\/(\w+)/) || [])[1] || '';
  const at = (document.querySelector('.step-dots [aria-current="step"]')?.getAttribute('aria-label') || '').match(/^Step (\d+)/);
  const step = at ? String(Number(at[1]) - 1) : '';
  const s = getSettings();
  return {
    page, lesson, step,
    browser: (navigator.userAgent.match(/(CrOS|Windows|Mac OS X|Android|iPhone|iPad|Linux)[^;)]*/) || [''])[0] + ' ' + (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/) || [''])[0],
    screen: `${window.innerWidth}x${window.innerHeight}`,
    language: s.lang, theme: s.theme,
    errors: errors.slice(),
  };
}

export function openBugReport() {
  const details = pageDetails();
  const note = h('textarea', { rows: 4, maxlength: 1500, placeholder: 'What happened? What did you expect instead?', 'aria-label': 'What went wrong' });
  modal((close) => h('form.stack', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (!note.value.trim()) { toast('Say what went wrong first.', 'error'); return; }
      if (await attempt(() => app.store.reportBug(note.value, details))) { toast('Thank you! Your teacher will see it.'); close(); }
    },
  },
    h('h2', '🐞 Report a problem'),
    h('p', 'Something in Pixel Trail not working? Tell us here. For help with your own code, use "I\'m stuck" in the lesson.'),
    note,
    h('details', h('summary', 'What gets sent with it'),
      h('p.muted', `The page you are on (${details.page}), your screen size and browser, and any errors the page just had. Not your code.`)),
    h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Send')),
  ));
  note.focus();
}

/** The teacher's list of open reports. Returns nothing when there are none. */
export function bugsCard(first) {
  if (!first || !first.length) return null;
  const body = h('div.stack');
  const card = h('details.card.data-card', h('summary', h('strong', `Problem reports (${first.length})`)), body);
  const draw = (bugs) => {
    card.querySelector('summary strong').textContent = `Problem reports (${bugs.length})`;
    const text = () => buildBugReport(bugs, { date: new Date().toLocaleDateString() });
    clear(body).append(
      h('div.row',
        h('button.btn.small', { onclick: async () => { try { await navigator.clipboard.writeText(text()); toast('Copied.'); } catch (_) { download('pixel-trail-problems.md', text(), 'text/markdown'); } } }, 'Copy all as a report'),
        h('button.btn.small', { onclick: () => download('pixel-trail-problems.md', text(), 'text/markdown') }, 'Download')),
      ...(bugs.length ? bugs.map((b) => h('div.bug',
        h('p', h('strong', { translate: 'no' }, b.name), h('span.muted', { translate: 'no' }, ` · ${b.class_name || b.role} · ${new Date(b.at).toLocaleString()} · `), h('code', b.page)),
        h('p', { translate: 'no' }, b.note),
        (b.details?.errors || []).length > 0 && h('pre.bug-errors', b.details.errors.join('\n')),
        h('button.btn.small', { onclick: async () => { const next = await attempt(() => app.store.closeBug(b.id)); if (next) draw(next); } }, '✓ Done'))) : [h('p.muted', 'All clear.')]));
  };
  draw(first);
  return card;
}
