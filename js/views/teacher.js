// Teacher screens: classes, roster, gradebook, reviewing work, and browsing lessons.
import { h, clear, toast, attempt, modal, confirmBox, download, md } from '../ui.js';
import { app, go, render } from '../main.js';
import { getLesson, rubricFor, checkSummary } from '../curriculum/engine.js';
import { alignmentFor, standardByCode } from '../curriculum/alignment.js';
import { PATHS, PATH_IDS, STAGES, SIDE_TRAILS, sequence, stageOf, isBeyond } from '../curriculum/graph.js';
import { createPlayer } from '../sandbox.js';
import { statsFor, TEACHER_BADGES, isDone } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { buildMap, legend, leaderboard } from './map.js';
import { makeEditor } from './lesson.js';
import { badgeChip } from './student.js';

export async function viewTeacherHome() {
  const classes = await app.store.listClasses();
  const name = h('input', { required: true, maxlength: 80, placeholder: 'Period 3: Game Design', 'aria-label': 'New class name' });
  return h('div.stack',
    h('div', h('h1', 'Your classes')),
    classes.length
      ? h('div.class-grid', classes.map((c) => h('a.card.class-card', { href: `#/class/${c.id}` }, h('h2', c.name), c.code && h('p', 'Class code: ', h('strong.code', c.code)))))
      : h('p.muted', 'No classes yet. Make your first one below.'),
    h('form.card.row.add-class', {
      onsubmit: async (e) => {
        e.preventDefault();
        const c = await attempt(() => app.store.createClass(name.value.trim()));
        if (c) go(`/class/${c.id}`);
      },
    }, name, h('button.btn.primary', { type: 'submit' }, 'Create class')),
    h('section.card.stack',
      h('h2', 'How a class works'),
      h('ol.howto',
        app.store.usesPasscodes
          ? h('li', 'Create a class, then paste in your students\' names. Each one gets a username and passcode.')
          : h('li', 'Create a class, then paste in your students\' names and school emails.'),
        h('li', app.store.usesPasscodes ? 'Students sign in with the class code and start at Base Camp. After five lessons they choose a road.' : 'Share this page\'s link with students. Their school Google account signs them in. They start at Base Camp, and after five lessons they choose a road.'),
        h('li', 'Submitted work lands in your review queue. Run it, read the code, score the rubric, and approve it or send it back.'),
        h('li', 'Classmates see each other on the journey map, with ranks and badges. Scores and feedback stay private.'),
      ),
    ),
  );
}

function rosterTab(cls, students, board, reload) {
  const usesPasscodes = app.store.usesPasscodes;
  const names = h('textarea', { rows: 5, placeholder: usesPasscodes ? 'One name per line.\nFirst name and last initial works well:\nAri M\nBea T' : 'One student per line: name, then school email.\nAri M, ari@yourschool.org\nBea T, bea@yourschool.org', 'aria-label': usesPasscodes ? 'Student names' : 'Student names and school emails' });
  const statsById = new Map(board.map((b) => [b.id, statsFor(b)]));

  const showPasscodes = (rows) => {
    modal((close) => h('div.stack',
      h('h2', 'Save these now'),
      h('p', 'Passcodes are stored scrambled, so this is the only time you can see them. Print or copy them for your students. You can always make a new one.'),
      h('div.table-wrap', h('table.board', h('thead', h('tr', h('th', 'Name'), h('th', 'Username'), h('th', 'Passcode'))), h('tbody', rows.map((r) => h('tr', h('td', r.display_name), h('td.mono', r.username), h('td.mono', r.passcode)))))),
      h('p', 'Class code: ', h('strong.code', cls.code)),
      h('div.row.end',
        h('button.btn', { onclick: () => download(`${cls.name}-logins.csv`, `name,username,passcode,class code\n${rows.map((r) => [r.display_name, r.username, r.passcode, cls.code].map(csv).join(',')).join('\n')}`, 'text/csv') }, 'Download CSV'),
        h('button.btn', { onclick: () => printCards(cls, rows) }, 'Print login cards'),
        h('button.btn.primary', { onclick: close }, 'Done'),
      ),
    ));
  };

  return h('div.stack',
    h('form.card.stack', {
      onsubmit: async (e) => {
        e.preventDefault();
        const list = names.value.split('\n').map((x) => x.trim()).filter(Boolean);
        if (!list.length) return;
        const rows = await attempt(() => app.store.addStudents(cls.id, list));
        if (rows) { if (usesPasscodes) showPasscodes(rows); else toast(`Added ${rows.length} student${rows.length === 1 ? '' : 's'}.`); reload(); }
      },
    }, h('h2', 'Add students'), names, h('p.muted.small', usesPasscodes ? 'For privacy, consider first name and last initial. Classmates can see these names.' : 'For privacy, consider first name and last initial. Classmates see names, but never emails. Students sign in with their school Google account.'), h('button.btn.primary', { type: 'submit' }, 'Add students')),
    students.length === 0 ? h('p.muted', 'No students yet.') : h('div.table-wrap', h('table.board',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Student'), h('th', { scope: 'col' }, usesPasscodes ? 'Username' : 'School email'), h('th', { scope: 'col' }, 'Road'), h('th', { scope: 'col' }, 'Game'), h('th.num', { scope: 'col' }, 'Lessons'), h('th', { scope: 'col' }, 'Actions'))),
      h('tbody', students.map((s) => h('tr',
        h('td.person', h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), s.display_name),
        h('td.mono', s.username),
        h('td', h('select', {
          'aria-label': `Road for ${s.display_name}`,
          onchange: async (e) => { await attempt(() => app.store.setStudentPath(s.id, e.target.value || null)); toast(`Road changed for ${s.display_name}. Their saved work stays.`); reload(); },
        }, h('option', { value: '', selected: !s.path }, 'Not chosen'), PATH_IDS.map((p) => h('option', { value: p, selected: s.path === p }, PATHS[p].road)))),
        h('td', s.game_name || ''),
        h('td.num', statsById.get(s.id)?.done.size ?? 0),
        h('td.row.tight-row',
          h('button.btn.small', { onclick: () => awardDialog(s, reload) }, 'Give badge'),
          usesPasscodes && h('button.btn.small', {
            onclick: async () => {
              if (!(await confirmBox('Make a new passcode?', `${s.display_name}'s old passcode will stop working.`, 'Make new passcode'))) return;
              const pass = await attempt(() => app.store.resetPasscode(s.id));
              if (pass) showPasscodes([{ ...s, passcode: pass }]);
            },
          }, 'New passcode'),
          h('button.btn.small', {
            onclick: async () => {
              if (await confirmBox('Remove this student?', `This permanently deletes ${s.display_name}'s account, games, and grades. It cannot be undone.`, 'Delete student', true)) {
                await attempt(() => app.store.removeStudent(s.id));
                reload();
              }
            },
          }, 'Remove'),
        ),
      ))),
    )),
    h('section.stack.danger-zone',
      h('button.btn.small', {
        onclick: async () => {
          if (await confirmBox('Delete this class?', `This permanently deletes "${cls.name}" with all its students, work, and grades.`, 'Delete class', true)) {
            await attempt(() => app.store.deleteClass(cls.id));
            go('/');
          }
        },
      }, 'Delete class'),
    ),
  );
}

function printCards(cls, rows) {
  const w = window.open('', '_blank', 'noopener=no');
  if (!w) { toast('Allow pop-ups to print cards.', 'error'); return; }
  const doc = w.document;
  doc.title = `${cls.name} logins`;
  const style = doc.createElement('style');
  style.textContent = 'body{font:16px system-ui;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}.c{border:2px dashed #666;padding:14px;break-inside:avoid}b{font-size:20px}code{font-size:17px}';
  doc.head.append(style);
  for (const r of rows) {
    const c = doc.createElement('div');
    c.className = 'c';
    const add = (label, value, tag) => {
      const p = doc.createElement('div');
      p.append(label ? `${label} ` : '');
      const v = doc.createElement(tag);
      v.textContent = value;
      p.append(v);
      c.append(p);
    };
    add('', r.display_name, 'b');
    add('Class code:', cls.code, 'code');
    add('Username:', r.username, 'code');
    add('Passcode:', r.passcode, 'code');
    doc.body.append(c);
  }
  w.print();
}

function awardDialog(student, reload) {
  modal((close) => {
    let chosen = TEACHER_BADGES[0].id;
    const list = h('div.badge-pick');
    const note = h('input', { maxlength: 140, placeholder: 'Optional note. Classmates can see this.', 'aria-label': 'Note' });
    const draw = () => clear(list).append(...TEACHER_BADGES.map((b) => h('button.badge', { 'aria-pressed': chosen === b.id ? 'true' : 'false', onclick: () => { chosen = b.id; draw(); } }, h('span.badge-icon', b.icon), h('span', b.name), h('small', b.desc))));
    draw();
    return h('div.stack', h('h2', `Give ${student.display_name} a badge`), list, note, h('div.row.end', h('button.btn', { onclick: close }, 'Cancel'), h('button.btn.primary', {
      onclick: async () => { await attempt(() => app.store.giveAward(student.id, chosen, note.value.trim())); toast('Badge awarded! +25 XP.'); close(); reload(); },
    }, 'Give badge')));
  });
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

function gradebookTab(cls, students, works) {
  const SLOTS = sequence('platformer').length;
  const byKey = new Map(works.map((w) => [`${w.student_id}:${w.lesson_id}`, w]));
  const queue = works.filter((w) => w.status === 'submitted').sort((a, b) => (a.submitted_at || '').localeCompare(b.submitted_at || ''));
  const nameOf = new Map(students.map((s) => [s.id, s.display_name]));
  const cellFor = (s, i) => {
    const seq = sequence(s.path);
    const id = seq[i];
    if (!id) return h('td.cell.empty', '');
    const w = byKey.get(`${s.id}:${id}`);
    const title = getLesson(id).title;
    if (!w || w.status === 'in_progress') return h('td.cell', { title, class: w ? 'working' : 'none' }, w ? '…' : '');
    const label = w.grade ? `${w.grade.total}` : '●';
    return h('td.cell', { class: w.status, title: `${title}: ${w.status}` }, h('a', { href: `#/review/${w.id}`, 'aria-label': `${s.display_name}, ${title}, ${w.status}` }, label));
  };
  const exportCsv = () => {
    const header = ['Student', 'Road', 'Lessons submitted', 'Total score', 'Total possible', ...Array.from({ length: SLOTS }, (_, i) => `L${i + 1}`)];
    const rows = students.map((s) => {
      const seq = sequence(s.path);
      const mine = works.filter((w) => w.student_id === s.id);
      const graded = mine.filter((w) => w.grade);
      return [s.display_name, s.path ? PATHS[s.path].road : '', mine.filter(isDone).length,
        graded.reduce((a, w) => a + w.grade.total, 0), graded.reduce((a, w) => a + w.grade.max_total, 0),
        ...Array.from({ length: SLOTS }, (_, i) => { const w = seq[i] && byKey.get(`${s.id}:${seq[i]}`); return w?.grade ? w.grade.total : ''; })];
    });
    download(`${cls.name}-grades.csv`, [header, ...rows].map((r) => r.map(csv).join(',')).join('\n'), 'text/csv');
  };
  return h('div.stack',
    h('section.card.stack',
      h('div.row.between', h('h2', `Waiting for review (${queue.length})`), queue.length > 0 && h('a.btn.primary', { href: `#/review/${queue[0].id}` }, 'Start reviewing')),
      queue.length ? h('ul.queue', queue.slice(0, 8).map((w) => h('li', h('a', { href: `#/review/${w.id}` }, h('strong', nameOf.get(w.student_id)), ` · ${getLesson(w.lesson_id).title}`, w.auto_ok ? '' : h('span.warn', ` · ${w.checks_passed} of ${w.checks_total} checks`))))) : h('p.muted', 'All caught up.'),
    ),
    h('div.row.between', h('h2', 'Gradebook'), h('button.btn', { onclick: exportCsv }, 'Export CSV')),
    h('div.legend',
      h('span', h('i.key.submitted'), 'Needs review'), h('span', h('i.key.approved'), 'Approved'), h('span', h('i.key.returned'), 'Sent back'), h('span', h('i.key.working'), 'In progress'),
      h('span.muted', 'Columns are lesson numbers. Roads share numbers, so a column covers the same concept for every student. Shaded columns are Beyond the Summit.'),
    ),
    h('div.table-wrap', h('table.gradebook',
      h('thead', h('tr', h('th.sticky', { scope: 'col' }, 'Student'), Array.from({ length: SLOTS }, (_, i) => h('th', { scope: 'col', title: slotLabel(i), class: isBeyond(sequence('platformer')[i]) ? 'beyond-col' : '' }, i + 1)))),
      h('tbody', students.map((s) => h('tr', h('th.sticky.person', { scope: 'row' }, h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), s.display_name), Array.from({ length: SLOTS }, (_, i) => cellFor(s, i))))),
    )),
  );
}

function slotLabel(i) {
  const id = sequence('platformer')[i];
  const st = stageOf(id);
  return `${st.name}: ${st.theme}`;
}

function journeyTab(board, cls) {
  return h('div.stack',
    h('p.row', h('a.btn', { href: `#/arcade/${cls.id}` }, 'Open class Arcade')),
    legend(),
    h('div.map-scroll', { tabindex: 0, 'aria-label': 'Journey map, scrollable' }, buildMap({ board, onNode: { can: () => true, go: (id) => go(`/lesson/${id}`) } })),
    h('h2', 'Everyone on the trail'),
    leaderboard(board, null),
  );
}

export async function viewClass(main, classId, tabParam) {
  const tab = tabParam || 'journey';
  const cls = await app.store.getClass(classId);
  if (!cls) throw new Error('That class was not found.');
  const [students, board, works] = await Promise.all([app.store.listStudents(classId), app.store.classBoard(classId), app.store.classWork(classId)]);
  const waiting = works.filter((w) => w.status === 'submitted').length;
  const link = (id, label) => h('a.tab', { href: `#/class/${classId}/${id}`, role: 'tab', 'aria-selected': tab === id ? 'true' : 'false' }, label);
  const content = tab === 'roster' ? rosterTab(cls, students, board, render)
    : tab === 'grades' ? gradebookTab(cls, students, works)
      : journeyTab(board, cls);
  return h('div.stack',
    h('div.row.between', h('div', h('p.eyebrow', h('a', { href: '#/' }, 'Classes')), h('h1', cls.name)), cls.code && h('p.class-code', 'Class code ', h('strong.code', cls.code))),
    h('div.tabs', { role: 'tablist' }, link('journey', 'Journey'), link('grades', waiting ? `Grades (${waiting})` : 'Grades'), link('roster', `Roster (${students.length})`)),
    content,
  );
}

export async function viewReview(main, workId) {
  const w = await app.store.getWorkFull(workId);
  if (!w) throw new Error('That work was not found.');
  const lesson = getLesson(w.lesson_id);
  const rubric = rubricFor(lesson);
  const scores = { ...(w.grade?.scores || {}) };
  const feedback = h('textarea', { rows: 4, value: w.grade?.feedback || '', 'aria-label': 'Feedback', placeholder: 'Name one thing that works well, and one thing to try next.' });
  const consoleBox = h('div.console');
  const player = createPlayer((ev) => {
    if (ev.type === 'error') consoleBox.append(h('div.err', ev.line ? `Line ${ev.line}: ` : '', ev.message));
    if (ev.type === 'log') consoleBox.append(h('div.log', ev.message));
  }, { askCamera: true });
  const host = h('div.editor-host.review-code');
  const live = checkSummary(lesson, w.code);

  const works = await app.store.classWork(w.student.class_id);
  const queue = works.filter((x) => x.status === 'submitted' && x.id !== w.id);
  const nextHref = queue[0] ? `#/review/${queue[0].id}` : `#/class/${w.student.class_id}/grades`;

  const total = () => rubric.reduce((a, r) => a + (scores[r.id] || 0), 0);
  const totalEl = h('strong');
  const rubricRows = rubric.map((r) => {
    const row = h('div.levels', { role: 'radiogroup', 'aria-label': r.label });
    const draw = () => clear(row).append(...r.levels.map((label, i) => h('button.level', {
      type: 'button', role: 'radio', 'aria-checked': scores[r.id] === i + 1 ? 'true' : 'false',
      onclick: () => { scores[r.id] = i + 1; draw(); totalEl.textContent = `${total()} of ${rubric.length * 4}`; },
    }, h('b', i + 1), h('span', label))));
    draw();
    return h('div.stack.tight', h('h3', r.label), row);
  });
  totalEl.textContent = `${total()} of ${rubric.length * 4}`;

  const finish = async (status) => {
    if (status === 'approved' && rubric.some((r) => !scores[r.id])) { toast('Score each row of the rubric first.', 'error'); return; }
    const ok = await attempt(async () => { await app.store.saveGrade(w.id, { scores, total: total(), max_total: rubric.length * 4, feedback: feedback.value.trim(), status }); return true; });
    if (ok) { toast(status === 'approved' ? 'Approved. +50 XP for the student.' : 'Sent back with your feedback.'); location.hash = nextHref; }
  };

  const page = h('div.review',
    h('div.row.between',
      h('div', h('p.eyebrow', h('a', { href: `#/class/${w.student.class_id}/grades` }, 'Gradebook')), h('h1', `${w.student.display_name}: ${lesson.title}`),
        h('p.muted', w.student.path ? `${PATHS[w.student.path].road}` : 'Base Camp', w.student.game_name ? ` · ${w.student.game_name}` : '', ` · Status: ${w.status}`)),
      h('p', h('a.btn', { href: nextHref }, queue[0] ? `Skip to next (${queue.length} left)` : 'Back to gradebook')),
    ),
    h('div.review-grid',
      h('section.stack', h('div.row.between', h('h2', 'Game'), h('button.btn.run', { onclick: () => { clear(consoleBox); player.run(w.code, w.assets || {}); } }, '▶ Restart')), h('div.game-frame', player.el), consoleBox,
        h('div.stack.tight', h('h3', 'Automatic checks'), h('ul.checklist', lesson.steps.filter((s) => s.check).map((s) => { const ok = live.results[lesson.steps.indexOf(s)]; return h('li', { class: ok ? 'ok' : 'warn' }, `${ok ? '✓' : '✗'} ${s.title}`); }))),
        h('div.stack.tight', h('h3', `Reflection: "${lesson.reflect}"`), w.reflection ? h('blockquote', w.reflection) : h('p.muted', 'No reflection written.')),
        h('p.small', `Stretch goals claimed: ${w.stretch_done}`),
        w.quiz_total > 0 && h('p.small', `Quick checks right on the first try: ${w.quiz_right} of ${w.quiz_total}`),
      ),
      h('section.stack', h('h2', 'Code'), host),
      h('section.card.stack.rubric', h('h2', 'Rubric'), standardsBlock(w.lesson_id), rubricRows, h('p', 'Total: ', totalEl), h('label.field', h('span', 'Feedback for the student (private)'), feedback),
        h('div.row', h('button.btn.primary', { onclick: () => finish('approved') }, 'Approve'), h('button.btn', { onclick: () => finish('returned') }, 'Send back for changes')),
      ),
    ),
  );
  clear(main).append(page);
  const cm = makeEditor(host, w.code, { cm: { readOnly: true } });
  cm.refresh();
  player.run(w.code, w.assets || {});
  app.cleanup = () => player.destroy();
  return null;
}

const shortCode = (code) => code.replace('6-8.', '');

/** Standard codes for a lesson card. Anchor codes are solid; supporting codes are outlined. */
function standardCodes(id) {
  const a = alignmentFor(id);
  return h('p.std-codes', a.anchor.map((c) => h('span.std.anchor', { title: standardByCode(c).text }, shortCode(c))), a.support.map((c) => h('span.std', { title: standardByCode(c).text }, shortCode(c))));
}

/** What this lesson is evidence for, shown to the teacher while grading. */
export function standardsBlock(id) {
  const a = alignmentFor(id);
  const row = (c) => h('li', h('strong', shortCode(c)), ' ', standardByCode(c).text);
  return h('details.std-block', { open: a.anchor.length > 0 },
    h('summary', 'MA DLCS standards'),
    a.anchor.length > 0 && h('div', h('h3', 'Assess here'), h('ul.std-list', a.anchor.map(row))),
    a.support.length > 0 && h('div', h('h3', 'Practiced here'), h('ul.std-list', a.support.map(row))),
    a.evidence && h('p.small', h('strong', 'Evidence: '), a.evidence),
  );
}

export async function viewCurriculum() {
  return h('div.stack',
    h('div', h('h1', 'All lessons'), h('p.muted', 'Each lesson is 30 to 40 minutes. The core is 15 lessons per student, sized for a term: 10 shared and 5 on their road. Students who finish early continue Beyond the Summit. Open any lesson to try it and see its answer key. Nothing is saved.')),
    h('section.stack', h('h2', 'Side trail'), h('p.muted', 'Optional, and it never holds anyone back.'), lessonList(SIDE_TRAILS.map((t) => t.id))),
    STAGES.map((st) => h('section.stack',
      h('h2', st.name), h('p.muted', st.beyond ? `Extra challenge: ${st.theme}` : st.theme),
      st.kind === 'shared'
        ? lessonList(st.lessons)
        : h('div.road-columns', PATH_IDS.map((p) => h('div.stack', { style: `--road:${PATHS[p].color}` }, h('h3.road-title', PATHS[p].road), lessonList(st.branches[p])))),
    )),
  );
}

function lessonList(ids) {
  return h('div.lesson-list', ids.map((id) => {
    const l = getLesson(id);
    return h('a.card.lesson-row', { href: `#/lesson/${id}` }, h('strong', l.title), h('span.muted.small', `${l.mins} min · ${l.concepts.join(', ')}`), md(l.hook), standardCodes(id));
  }));
}

export { badgeChip };
