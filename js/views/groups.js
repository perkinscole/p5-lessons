// Teacher screens for group projects, and for sending grades to Google Classroom.
import { h, clear, toast, attempt, confirmBox } from '../ui.js';
import { app } from '../main.js';
import { allLessons, getLesson } from '../curriculum/engine.js';

const lessonOptions = (selected) => allLessons().map((l) => h('option', { value: l.id, selected: l.id === selected }, `${l.id}: ${l.title}`));

function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Split students into groups of `size`. Leftovers join an existing group, so nobody works alone. */
function makeGroups(ids, size) {
  const list = shuffled(ids);
  const groups = [];
  while (list.length >= size) groups.push(list.splice(0, size));
  if (list.length && !groups.length) return [];
  list.forEach((id) => {
    const open = groups.find((g) => g.length < 3);
    if (open) open.push(id);
    else groups.push([groups.at(-1).pop(), id]);
  });
  return groups.filter((g) => g.length >= 2);
}

function contributionTable(team) {
  const totalLines = team.members.reduce((sum, m) => sum + m.lines, 0);
  return h('div.table-wrap', h('table.board',
    h('thead', h('tr', h('th', { scope: 'col' }, 'Student'), h('th.num', { scope: 'col' }, 'Lines in final code'), h('th.num', { scope: 'col' }, 'Added'), h('th.num', { scope: 'col' }, 'Removed'), h('th.num', { scope: 'col' }, 'Saves'), h('th', { scope: 'col' }, 'In their words'))),
    h('tbody', team.members.map((m) => h('tr',
      h('td', m.display_name),
      h('td.num', `${m.lines}${totalLines ? ` (${Math.round((m.lines / totalLines) * 100)}%)` : ''}`),
      h('td.num', m.added), h('td.num', m.removed), h('td.num', m.saves),
      h('td', m.note || h('span.muted', 'Not written yet'))))),
  ));
}

export const teamPanel = (team) => h('section.card.stack',
  h('h2', 'Group contributions'),
  contributionTable(team),
  h('p.muted.small', 'Lines show who was typing. A partner who is planning or finding bugs won\'t appear here, so read what each student wrote too.'));

export async function groupsTab(cls, students, reload) {
  const teams = await app.store.listTeams(cls.id);
  let lessonId = 'c6';
  let groups = [];
  const name = (id) => students.find((s) => s.id === id)?.display_name || '';
  const editor = h('div.stack');
  const savedFor = () => teams.filter((t) => t.lesson_id === lessonId).map((t) => t.members.map((m) => m.id));

  function drawEditor() {
    const used = new Set(groups.flat());
    const free = students.filter((s) => !used.has(s.id));
    clear(editor).append(
      groups.length ? h('div.stack.tight', groups.map((group, i) => h('div.row.group-row',
        h('strong', `Group ${i + 1}`),
        group.map((id, slot) => h('select', { 'aria-label': `Group ${i + 1}, student ${slot + 1}`, onchange: (e) => { if (e.target.value) group[slot] = e.target.value; else group.splice(slot, 1); drawEditor(); } },
          h('option', { value: '' }, 'Remove'),
          h('option', { value: id, selected: true }, name(id)),
          free.map((s) => h('option', { value: s.id }, s.display_name)))),
        group.length < 3 && free.length > 0 && h('select', { 'aria-label': `Add to group ${i + 1}`, onchange: (e) => { if (e.target.value) { group.push(e.target.value); drawEditor(); } } },
          h('option', { value: '' }, '+ Add'), free.map((s) => h('option', { value: s.id }, s.display_name))),
        h('button.btn.small', { type: 'button', onclick: () => { groups.splice(i, 1); drawEditor(); } }, 'Delete')))) : h('p.muted', 'No groups for this lesson yet.'),
      free.length > 0 && groups.length > 0 && h('p.muted.small', `Working alone: ${free.map((s) => s.display_name).join(', ')}`),
    );
  }

  const load = () => { groups = savedFor(); drawEditor(); };
  load();

  return h('div.stack',
    h('section.card.stack',
      h('h2', 'Set up groups'),
      h('div.row.mm-controls',
        h('label.field.small', h('span', 'Lesson'), h('select', { onchange: (e) => { lessonId = e.target.value; load(); } }, lessonOptions(lessonId))),
        h('button.btn', { type: 'button', onclick: () => { groups = makeGroups(students.map((s) => s.id), 2); drawEditor(); } }, 'Random pairs'),
        h('button.btn', { type: 'button', onclick: () => { groups = makeGroups(students.map((s) => s.id), 3); drawEditor(); } }, 'Random groups of 3'),
        h('button.btn', { type: 'button', onclick: () => { groups.push([]); const free = students.filter((s) => !groups.flat().includes(s.id)); if (free[0]) groups.at(-1).push(free[0].id); if (free[1]) groups.at(-1).push(free[1].id); drawEditor(); } }, 'Add a group')),
      editor,
      h('div.row.end', h('button.btn.primary', { type: 'button', onclick: async () => {
        if (groups.some((g) => g.length < 2)) { toast('Every group needs 2 or 3 students.', 'error'); return; }
        if (await attempt(async () => { await app.store.saveTeams(cls.id, lessonId, groups); return true; })) { toast('Groups saved.'); reload(); }
      } }, 'Save groups')),
      h('p.muted.small', 'Group members share one project and take turns at the keyboard. Each student still writes their own reflection and gets their own grade.'),
    ),
    h('section.stack', h('h2', 'Who did what'),
      teams.length ? teams.map((t) => h('section.card.stack.tight',
        h('h3', `${getLesson(t.lesson_id)?.title || t.lesson_id}: ${t.members.map((m) => m.display_name).join(', ')}`),
        contributionTable(t))) : h('p.muted', 'Nothing yet.'),
      teams.length > 0 && h('p.muted.small', 'Lines show who was typing. A partner who is planning or finding bugs won\'t appear here, so read what each student wrote too.')),
  );
}

const todayText = () => new Date().toLocaleDateString('en-CA');

export async function sendGradesTab(cls, reload) {
  const data = await app.store.gradeSyncStatus(cls.id);
  if (!data.linked) return h('section.card.stack', h('h2', 'Not linked to Google Classroom'), h('p', 'Import this course from your Classes page first.'));
  const results = new Map();

  const rowFor = (item) => {
    const lesson = getLesson(item.lesson_id);
    const due = h('input', { type: 'date', value: item.due || todayText(), min: item.synced ? null : todayText(), disabled: !!item.synced, 'aria-label': `Due date for ${lesson.title}` });
    const out = h('div');
    const send = h('button.btn.small.primary', { type: 'button', disabled: !item.waiting, onclick: async (e) => {
      const verb = item.synced ? `Update ${item.waiting} grade${item.waiting === 1 ? '' : 's'}` : `Create "${lesson.title}" in Classroom`;
      const sure = await confirmBox(verb, item.synced ? 'Grades in that Classroom assignment will be replaced.' : 'Students in the course will see this new assignment, and Classroom may notify them.', 'Send');
      if (!sure) return;
      e.target.disabled = true;
      e.target.textContent = 'Sending...';
      const r = await attempt(() => app.store.pushGrades(cls.id, item.lesson_id, { title: lesson.title, due: due.value }));
      e.target.textContent = 'Send';
      if (!r) { e.target.disabled = false; return; }
      clear(out).append(h('p.small', `${r.sent} sent.`, r.link && ' ', r.link && h('a', { href: r.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Classroom ↗')),
        ...[...r.skipped, ...r.failed].map((x) => h('p.warn.small', x)));
    } }, 'Send');
    return h('tr',
      h('th', { scope: 'row' }, lesson.title, item.link && h('div', h('a.small', { href: item.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Classroom ↗'))),
      h('td.num', item.approved),
      h('td.num', item.waiting),
      h('td', due),
      h('td', send, out));
  };

  return h('div.stack',
    data.items.length ? h('div.table-wrap', h('table.board',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Lesson'), h('th.num', { scope: 'col' }, 'Approved'), h('th.num', { scope: 'col' }, 'To send'), h('th', { scope: 'col' }, 'Due date'), h('th', { scope: 'col' }, ''))),
      h('tbody', data.items.map(rowFor)),
    )) : h('p.muted', 'Approve some work in Grades, and it will show up here.'),
    h('section.card.stack',
      h('h2', 'Getting grades into PowerSchool'),
      h('ol.steps',
        h('li', 'Send grades from this page. Pick a due date inside your PowerSchool grading period.'),
        h('li', 'In Classroom, open the assignment and choose a grade category that matches PowerSchool. (Only needed once per assignment.)'),
        h('li', 'Select your students and press Return. PowerSchool only takes returned grades.'),
        h('li', 'Use Classroom\'s export to send them to PowerSchool.')),
      h('p.muted.small', 'Google doesn\'t let apps set the category or return unsubmitted work, so those two steps stay in Classroom.')),
  );
}
