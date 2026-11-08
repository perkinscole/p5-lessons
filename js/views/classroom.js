// Google Classroom import, assignments, and the "who needs a check-in" view. Teacher only.
import { h, clear, toast, attempt, modal } from '../ui.js';
import { app } from '../main.js';

const STATE = {
  missing: { label: 'Missing', mark: '!' },
  late: { label: 'Turned in late', mark: 'L' },
  done: { label: 'Turned in', mark: '✓' },
  graded: { label: 'Graded', mark: '' },
  assigned: { label: 'Not due yet', mark: '·' },
};

export function openImport(onDone) {
  modal((close) => {
    const body = h('div.stack', h('p.muted', 'Loading your courses...'));
    (async () => {
      const courses = await attempt(() => app.store.listGoogleCourses());
      clear(body);
      if (!courses) { body.append(h('p', 'Google Classroom could not be reached.')); return; }
      if (!courses.length) { body.append(h('p', 'No active courses found.')); return; }
      const picks = courses.map((c) => ({ c, box: h('input', { type: 'checkbox', checked: !c.linked }) }));
      const results = h('div.stack.tight');
      body.append(
        h('div.stack.tight', picks.map(({ c, box }) => h('label.check', box, h('span', c.name, c.section && h('span.muted', ` ${c.section}`), c.linked && h('span.tag', 'Imported'))))),
        h('p.muted.small', 'Names show as first name and last initial. Importing again adds new students.'),
        results,
        h('div.row.end',
          h('button.btn', { onclick: close }, 'Close'),
          h('button.btn.primary', {
            onclick: async (e) => {
              const ids = picks.filter((p) => p.box.checked).map((p) => p.c.id);
              if (!ids.length) { toast('Choose at least one course.', 'error'); return; }
              e.target.disabled = true;
              e.target.textContent = 'Importing...';
              const out = await attempt(() => app.store.importCourses(ids));
              e.target.disabled = false;
              e.target.textContent = 'Import';
              if (!out) return;
              clear(results).append(...out.map(summaryLine));
              onDone();
            },
          }, 'Import')),
      );
    })();
    return h('div.stack', h('h2', 'Import from Google Classroom'), body);
  });
}

function summaryLine(r) {
  return h('div',
    h('p', h('strong', r.name), ` ${r.added} added, ${r.matched} already here`),
    r.skipped.length > 0 && h('details.hint', h('summary', `${r.skipped.length} not added`), h('ul.small', r.skipped.map((x) => h('li', x)))),
    r.gone > 0 && h('p.warn.small', `${r.gone} on this roster are no longer in Classroom. Remove them on the Roster tab if needed.`));
}

export async function assignmentsTab(cls) {
  const data = await app.store.classroomWork(cls.id);
  if (!data.linked) return h('section.card.stack', h('h2', 'Not linked to Google Classroom'), h('p', 'Import this course from your Classes page to see its assignments.'));
  if (!data.assignments.length) return h('p.muted', 'No published assignments in Classroom yet.');
  const missingFirst = [...data.students].sort((a, b) => b.missing - a.missing || a.display_name.localeCompare(b.display_name));
  return h('div.stack',
    h('div.legend', Object.entries(STATE).map(([k, s]) => h('span', h(`i.key.cr-${k}`), s.label)), h('span.muted', `Synced from ${data.course_name}`)),
    h('div.table-wrap', h('table.gradebook.cr-table',
      h('thead', h('tr',
        h('th.sticky', { scope: 'col' }, 'Student'),
        h('th', { scope: 'col' }, 'Missing'),
        h('th', { scope: 'col' }, 'Pixel Trail'),
        data.assignments.map((a) => h('th.cr-head', { scope: 'col' }, h('a', { href: a.link, target: '_blank', rel: 'noopener noreferrer', title: a.title }, a.title), a.due && h('small', new Date(a.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })))))),
      h('tbody', missingFirst.map((s) => h('tr',
        h('th.sticky', { scope: 'row' }, s.display_name),
        h('td', { class: s.missing ? 'cr-count' : '' }, s.missing),
        h('td', `${s.core_done} of 15`),
        data.assignments.map((a) => {
          const c = s.cells[a.id];
          if (!c) return h('td.cell', '');
          const st = STATE[c.state];
          const text = c.state === 'graded' ? `${c.grade}` : st.mark;
          return h(`td.cell.cr-${c.state}`, { title: `${a.title}: ${st.label}` }, c.link ? h('a', { href: c.link, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${s.display_name}, ${a.title}, ${st.label}` }, text) : text);
        }),
      ))),
    )),
  );
}

export async function keepingUpTab(cls, reload) {
  const [data, pace, digest] = await Promise.all([app.store.classAlerts(cls.id, true), app.store.getPace(cls.id), app.store.getDigest()]);
  const start = h('input', { type: 'date', value: pace?.term_start || '', 'aria-label': 'Term start' });
  const end = h('input', { type: 'date', value: pace?.term_end || '', 'aria-label': 'Term end' });
  const needing = data.students.filter((s) => s.level !== 'ok');
  const card = (s) => h(`article.alert-card.${s.level}`,
    h('h3', s.display_name),
    h('p.alert-level', s.level === 'behind' ? 'Needs help' : 'Check in'),
    h('ul', s.reasons.map((r) => h('li', r))),
    h('p.muted.small', s.expected === null ? `${s.done} of 15 lessons` : `${s.done} done, ${s.expected} expected by now`));

  return h('div.stack',
    data.classroomError && h('p.warn', 'Google Classroom could not be reached, so missing assignments are not included.'),
    needing.length
      ? h('div.alert-grid', needing.map(card))
      : h('section.card', h('p', pace?.term_start ? 'Everyone is keeping up.' : 'Set your term dates below to compare students with the pace.')),
    h('section.card.stack',
      h('h2', 'Pace'),
      h('p.muted.small', 'The 15 core lessons are spread evenly across these dates.'),
      h('div.row',
        h('label.field.small', h('span', 'Term starts'), start),
        h('label.field.small', h('span', 'Term ends'), end),
        h('button.btn.primary', { onclick: async () => {
          const ok = await attempt(async () => { await app.store.savePace(cls.id, { term_start: start.value, term_end: end.value }); return true; });
          if (ok) { toast('Pace saved.'); reload(); }
        } }, 'Save')),
    ),
    digest.can && h('section.card.stack',
      h('h2', 'Email me'),
      h('label.check', h('input', { type: 'checkbox', checked: digest.on, onchange: async (e) => {
        const on = e.target.checked;
        const ok = await attempt(async () => { await app.store.setDigest(on); return true; });
        if (ok) toast(on ? 'You will get an email on school mornings, only when someone needs a check-in.' : 'Daily email turned off.');
        else e.target.checked = !on;
      } }), h('span', 'Send me a summary on school mornings when a student needs a check-in')),
    ),
  );
}
