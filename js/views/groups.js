// Teacher screens for group projects, and for sending grades to Google Classroom.
import { h, clear, toast, attempt, confirmBox } from '../ui.js';
import { app } from '../main.js';
import { allLessons, getLesson } from '../curriculum/engine.js';
import { STAGES, PATHS, PATH_IDS } from '../curriculum/graph.js';

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
      h('p.muted.small', 'Group members share one project and can work at the same time, each in a different file: one person per file. Splitting the game into files, like enemies.js or levels.js, lets everyone build at once. Each student still writes their own reflection and gets their own grade.'),
    ),
    h('section.stack', h('h2', 'Who did what'),
      teams.length ? teams.map((t) => h('section.card.stack.tight',
        h('h3', `${getLesson(t.lesson_id)?.title || t.lesson_id}: ${t.members.map((m) => m.display_name).join(', ')}`),
        contributionTable(t))) : h('p.muted', 'Nothing yet.'),
      teams.length > 0 && h('p.muted.small', 'Lines show who was typing. A partner who is planning or finding bugs won\'t appear here, so read what each student wrote too.')),
  );
}

const todayText = () => new Date().toLocaleDateString('en-CA');

/** Lesson numbers, as in the gradebook. Roads share numbers, so a road number lists each road's lesson. */
export function lessonSlots() {
  const slots = [];
  let n = 0;
  for (const st of STAGES) {
    const shared = st.kind === 'shared';
    const count = shared ? st.lessons.length : st.branches[PATH_IDS[0]].length;
    for (let i = 0; i < count; i++) {
      n++;
      const ids = shared ? [st.lessons[i]] : PATH_IDS.map((p) => st.branches[p][i]);
      slots.push({
        key: `L${n}`, n, ids, beyond: !!st.beyond,
        title: shared ? getLesson(ids[0]).title : `${st.name} ${i + 1}`,
        detail: shared ? '' : [...new Set(ids.map((id) => getLesson(id).title))].join(' · '),
        description: shared ? getLesson(ids[0]).hook
          : `Each road has its own lesson here. ${PATH_IDS.map((p, k) => `${PATHS[p].road}: ${getLesson(ids[k]).title}`).join('. ')}.`,
      });
    }
  }
  return slots;
}

export async function sendGradesTab(cls, reload) {
  const slots = lessonSlots();
  const data = await app.store.gradeSyncStatus(cls.id, slots.map(({ key, ids }) => ({ key, ids })));
  if (!data.linked) return h('section.card.stack', h('h2', 'Not linked to Google Classroom'), h('p', 'Import this course from your Classes page first.'));
  const status = new Map(data.items.map((i) => [i.key, i]));
  const picks = [];

  const points = h('input', { type: 'number', min: 1, max: 1000, value: 100, 'aria-label': 'Points for each assignment', style: 'width:6em' });
  const due = h('input', { type: 'date', min: todayText(), 'aria-label': 'Due date' });
  const publish = h('input', { type: 'checkbox' });
  const create = h('button.btn.primary', { type: 'button' }, 'Create assignments');
  const createOut = h('div.stack.tight');
  const chosen = () => picks.filter((p) => p.box.checked);
  const drawCreate = () => {
    const n = chosen().length;
    create.disabled = n === 0;
    create.textContent = n ? `Create ${n} assignment${n === 1 ? '' : 's'}` : 'Create assignments';
  };

  const row = (slot) => {
    const st = status.get(slot.key);
    const lessonLine = h('div.small.muted', `Lesson ${slot.n}${slot.detail ? `: ${slot.detail}` : ''}`);
    if (st.synced) {
      return h('tr',
        h('td', { 'aria-label': 'In Classroom' }, '✓'),
        h('th', { scope: 'row' }, h('div', st.title), lessonLine),
        h('td.num', st.points),
        h('td', st.due || '—'),
        h('td.num', st.waiting ? h('strong', `${st.waiting} to send`) : st.approved ? 'All sent' : ''),
        h('td', st.link && h('a.small', { href: st.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open ↗')));
    }
    const box = h('input', { type: 'checkbox', onchange: drawCreate, 'aria-label': `Choose lesson ${slot.n}` });
    const name = h('input', { value: `Pixel Trail: ${slot.title}`, maxlength: 150, 'aria-label': `Assignment name for lesson ${slot.n}`, style: 'width:100%', oninput: () => { box.checked = true; drawCreate(); } });
    picks.push({ slot, box, name });
    return h('tr',
      h('td', box),
      h('th', { scope: 'row' }, name, lessonLine),
      h('td.num', ''), h('td', ''),
      h('td.num', st.approved ? `${st.approved} approved` : ''),
      h('td', ''));
  };
  const table = (list) => h('div.table-wrap', h('table.board',
    h('thead', h('tr', h('th', { scope: 'col' }, ''), h('th', { scope: 'col' }, 'Assignment name'), h('th.num', { scope: 'col' }, 'Points'), h('th', { scope: 'col' }, 'Due'), h('th.num', { scope: 'col' }, 'Grades'), h('th', { scope: 'col' }, ''))),
    h('tbody', list.map(row))));
  const coreTable = table(slots.filter((x) => !x.beyond));
  const beyondTable = table(slots.filter((x) => x.beyond));
  const pick = (test) => { picks.forEach((p) => { p.box.checked = test(p.slot); }); drawCreate(); };

  create.onclick = async () => {
    const list = chosen();
    if (!list.length) return;
    if (list.some((p) => !p.name.value.trim())) { toast('Every chosen assignment needs a name.', 'error'); return; }
    const sure = await confirmBox(`Create ${list.length} assignment${list.length === 1 ? '' : 's'} in Classroom?`,
      publish.checked ? 'Students will see them right away, and Classroom may notify them.' : 'They are saved as drafts. Students see nothing until you post them in Classroom.', 'Create');
    if (!sure) return;
    create.disabled = true;
    create.textContent = 'Creating...';
    const r = await attempt(() => app.store.createAssignments(cls.id, list.map((p) => ({
      key: p.slot.key, ids: p.slot.ids, title: p.name.value.trim(), points: Number(points.value), due: due.value, description: p.slot.description,
    })), { publish: publish.checked }));
    if (!r) { drawCreate(); return; }
    toast(`Created ${r.created} assignment${r.created === 1 ? '' : 's'} in Classroom.`);
    if (r.skipped.length || r.failed.length) clear(createOut).append(...[...r.skipped, ...r.failed].map((x) => h('p.warn.small', x)));
    else reload();
  };
  drawCreate();

  const waiting = data.items.filter((i) => i.synced).reduce((a, i) => a + i.waiting, 0);
  const unmade = data.items.filter((i) => !i.synced && i.approved).length;
  const sendOut = h('div.stack.tight');
  const send = h('button.btn.primary', { type: 'button', disabled: !waiting, onclick: async () => {
    send.disabled = true;
    send.textContent = 'Sending...';
    const r = await attempt(() => app.store.pushGrades(cls.id, slots.filter((x) => status.get(x.key).synced).map(({ key, ids }) => ({ key, ids }))));
    send.textContent = 'Send grades';
    if (!r) { send.disabled = false; return; }
    toast(`Sent ${r.sent} grade${r.sent === 1 ? '' : 's'} to ${r.assignments} assignment${r.assignments === 1 ? '' : 's'}.`);
    clear(sendOut).append(...[...r.skipped, ...r.failed].map((x) => h('p.warn.small', x)));
    if (!r.skipped.length && !r.failed.length) reload();
  } }, waiting ? `Send ${waiting} grade${waiting === 1 ? '' : 's'}` : 'Send grades');

  return h('div.stack',
    h('section.card.stack',
      h('h2', 'Send grades to Classroom'),
      h('p', waiting ? `${waiting} approved grade${waiting === 1 ? '' : 's'} not in Classroom yet.` : 'Everything approved is already in Classroom.'),
      unmade > 0 && h('p.muted.small', `${unmade} lesson${unmade === 1 ? ' has' : 's have'} approved work but no assignment yet. Create ${unmade === 1 ? 'it' : 'them'} below first.`),
      h('div.row', send), sendOut,
      h('p.muted.small', 'Only approved work is sent. Rubric scores are scaled to each assignment\'s points, so 9 of 12 on a 100-point assignment sends 75.')),
    h('section.card.stack',
      h('h2', 'Classroom assignments'),
      h('p.muted.small', 'Each assignment matches a lesson number in the gradebook. Road lessons share a number, so one assignment covers all four roads.'),
      h('div.row',
        h('button.btn.small', { type: 'button', onclick: () => pick((x) => !x.beyond) }, 'Select core lessons'),
        h('button.btn.small', { type: 'button', onclick: () => pick(() => false) }, 'Clear')),
      coreTable,
      h('details', h('summary', 'Beyond the Summit lessons'), beyondTable),
      h('div.row',
        h('label.field.small', h('span', 'Points each'), points),
        h('label.field.small', h('span', 'Due date (optional)'), due),
        h('label.check', publish, h('span', 'Post now (otherwise saved as drafts in Classroom)'))),
      h('div.row', create), createOut),
    h('section.card.stack',
      h('h2', 'Getting grades into PowerSchool'),
      h('ol.steps',
        h('li', 'Create assignments here, with due dates inside your PowerSchool grading period.'),
        h('li', 'If you saved them as drafts, post them in Classroom. Grades can only go to posted assignments.'),
        h('li', 'In Classroom, give each assignment a grade category that matches PowerSchool.'),
        h('li', 'After sending grades, select your students in Classroom and press Return. PowerSchool only takes returned grades.')),
      h('p.muted.small', 'Google doesn\'t let apps set the category or return work, so those steps stay in Classroom.')),
  );
}
