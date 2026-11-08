// The Standards tab: the overall MA DLCS map, a lesson-by-lesson view, and progress.
// Progress uses lesson status only, never scores, so it follows the class's privacy rule.
import { h, clear, download } from '../ui.js';
import { app } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, STAGES, sequence, currentLesson, SIDE_TRAILS, isBeyond } from '../curriculum/graph.js';
import { ALIGNMENT, coverage, standardByCode } from '../curriculum/alignment.js';
import { loadMe } from './student.js';

export const shortCode = (code) => code.replace('6-8.', '');

const SIDE_IDS = SIDE_TRAILS.map((t) => t.id);
const ALL_LESSONS = [...STAGES.flatMap((st) => (st.kind === 'shared' ? st.lessons : Object.values(st.branches).flat())), ...SIDE_IDS];
const lessonsFor = (path) => (path ? [...sequence(path), ...SIDE_IDS] : ALL_LESSONS);
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

const TURNED_IN = new Set(['submitted', 'returned']);
const STATUS = {
  approved: { label: 'Approved', cls: 'approved' },
  turned: { label: 'Turned in', cls: 'turned' },
  practiced: { label: 'Practiced', cls: 'practiced' },
  ahead: { label: 'Coming up', cls: 'ahead' },
};

/** Where one student stands on one standard, across the lessons on their road. */
function statusFor(c, statusByLesson, ids) {
  const anchors = c.anchor.filter((id) => ids.includes(id));
  const support = c.support.filter((id) => ids.includes(id));
  if (!anchors.length && !support.length) return null;
  const has = (id, test) => test(statusByLesson.get(id));
  if (anchors.some((id) => has(id, (s) => s === 'approved'))) return 'approved';
  if (anchors.some((id) => has(id, (s) => TURNED_IN.has(s)))) return 'turned';
  const finished = (s) => s && s !== 'in_progress';
  if ([...anchors, ...support].some((id) => has(id, finished))) return 'practiced';
  return 'ahead';
}

const statusBadge = (key) => (key ? h(`span.std-status.${STATUS[key].cls}`, STATUS[key].label) : h('span.muted', 'Not in your lessons'));

function classProgress(c, board) {
  let approved = 0;
  let turned = 0;
  let eligible = 0;
  for (const s of board) {
    const ids = lessonsFor(s.path);
    if (!c.anchor.some((id) => ids.includes(id))) continue;
    eligible++;
    const st = statusFor(c, new Map(s.works.map((w) => [w.lesson_id, w.status])), ids);
    if (st === 'approved') approved++;
    else if (st === 'turned') turned++;
  }
  return { approved, turned, eligible };
}

export async function viewStandards() {
  const isStudent = app.session.role === 'student';
  const me = isStudent ? await loadMe() : null;
  const classes = isStudent ? [] : await app.store.listClasses();
  let classId = classes[0]?.id || null;
  let board = classId ? await app.store.classBoard(classId) : [];

  const path = me?.student.path || null;
  const myIds = isStudent ? lessonsFor(path) : ALL_LESSONS;
  const statusByLesson = new Map((me?.works || []).map((w) => [w.lesson_id, w.status]));
  const current = me ? currentLesson(path, me.done) : null;
  const all = coverage().map((c) => ({
    ...c,
    anchor: c.anchor.filter((id) => myIds.includes(id)),
    support: c.support.filter((id) => myIds.includes(id)),
  }));
  const isTaught = (c) => c.anchor.length > 0 || c.support.length > 0;

  let tab = 'standard';
  let show = isStudent ? 'taught' : 'all';
  const body = h('div.stack');
  const tabs = h('div.tabs', { role: 'tablist' });

  const canOpen = (id) => !isStudent || me.done.has(id) || id === current || (SIDE_IDS.includes(id) && me.done.has(SIDE_TRAILS.find((t) => t.id === id).after));
  const lessonRef = (id) => (canOpen(id)
    ? h('a.std-lesson', { href: `#/lesson/${id}`, title: getLesson(id).title }, id)
    : h('span.std-lesson.locked', { title: `${getLesson(id).title} (not open yet)` }, id));
  const refs = (ids) => (ids.length ? ids.map(lessonRef) : h('span.muted', 'None'));

  const summary = () => {
    const taught = all.filter(isTaught);
    if (isStudent) {
      const assessed = all.filter((c) => c.anchor.length);
      const count = (key) => assessed.filter((c) => statusFor(c, statusByLesson, myIds) === key).length;
      return h('div.std-summary',
        h('div', h('strong', count('approved')), h('span', 'approved by your teacher')),
        h('div', h('strong', count('turned')), h('span', 'turned in, waiting on review')),
        h('div', h('strong', assessed.length), h('span', 'standards you will be assessed on')),
      );
    }
    return h('div.std-summary',
      h('div', h('strong', `${taught.length} of ${all.length}`), h('span', 'standards addressed')),
      h('div', h('strong', all.filter((c) => c.anchor.some((id) => !isBeyond(id))).length), h('span', 'assessed in the core')),
      h('div', h('strong', all.filter((c) => c.anchor.length).length), h('span', 'assessed with Beyond included')),
      h('div', h('strong', taught.filter((c) => !c.anchor.length).length), h('span', 'practiced, not yet assessed')),
    );
  };

  const standardRow = (c) => {
    let progress;
    if (isStudent) progress = statusBadge(statusFor(c, statusByLesson, myIds));
    else if (classId && c.anchor.length) {
      const p = classProgress(c, board);
      progress = h('span.small', `${p.approved} approved, ${p.turned} turned in, of ${p.eligible}`);
    } else progress = h('span.muted', isTaught(c) ? 'Practice only' : 'Not taught here');
    return h('tr', { class: isTaught(c) ? '' : 'std-none' },
      h('td.mono', shortCode(c.code)), h('td', c.text), h('td', refs(c.anchor)), h('td', refs(c.support)), h('td', progress));
  };

  const byStandard = () => {
    const rows = show === 'taught' ? all.filter(isTaught) : all;
    return [...new Set(rows.map((c) => c.strand))].map((strand) => {
      const inStrand = rows.filter((c) => c.strand === strand);
      const total = all.filter((c) => c.strand === strand);
      return h('section.stack.tight',
        h('h2', `${strand} (${total.filter(isTaught).length} of ${total.length})`),
        h('div.table-wrap', h('table.board.std-table',
          h('thead', h('tr', h('th', { scope: 'col' }, 'Standard'), h('th', { scope: 'col' }, 'Text'), h('th', { scope: 'col' }, isStudent ? 'Assessed in' : 'Anchor'), h('th', { scope: 'col' }, isStudent ? 'Practiced in' : 'Supporting'), h('th', { scope: 'col' }, isStudent ? 'Your progress' : 'Class progress'))),
          h('tbody', inStrand.map(standardRow)),
        )));
    });
  };

  const byLesson = () => {
    const chipList = (codes, cls) => (codes.length
      ? codes.map((code) => h(`span.std${cls}`, { title: standardByCode(code).text }, shortCode(code)))
      : h('span.muted', 'None'));
    return h('div.table-wrap', h('table.board.std-table',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Lesson'), h('th', { scope: 'col' }, 'Title'), h('th', { scope: 'col' }, 'Road'), h('th', { scope: 'col' }, isStudent ? 'Assessed' : 'Anchor'), h('th', { scope: 'col' }, isStudent ? 'Practiced' : 'Supporting'), !isStudent && h('th', { scope: 'col' }, 'Evidence to look at'))),
      h('tbody', myIds.map((id) => {
        const a = ALIGNMENT[id];
        const l = getLesson(id);
        return h('tr',
          h('td', lessonRef(id)), h('td', l.title, isBeyond(id) && h('span.tag.beyond-tag', 'Beyond'), SIDE_IDS.includes(id) && h('span.tag.beyond-tag', 'Side trail')), h('td', l.path ? PATHS[l.path].road : 'Everyone'),
          h('td', h('div.std-codes', chipList(a.anchor, '.anchor'))), h('td', h('div.std-codes', chipList(a.support, ''))),
          !isStudent && h('td.small', a.evidence));
      })),
    ));
  };

  const exportCsv = () => {
    const header = ['Standard', 'Strand', 'Topic', 'Text', 'Anchor lessons', 'Supporting lessons'];
    const rows = all.map((c) => [c.code, c.strand, c.topic, c.text, c.anchor.join(' '), c.support.join(' ')]);
    download('dlcs-standards-map.csv', [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  };

  const draw = () => {
    clear(tabs).append(...[['standard', 'By standard'], ['lesson', 'By lesson']].map(([id, label]) =>
      h('button.tab', { role: 'tab', 'aria-selected': tab === id ? 'true' : 'false', onclick: () => { tab = id; draw(); } }, label)));
    const controls = h('div.row',
      tab === 'standard' && h('label.field.small', h('span', 'Show'), h('select', { onchange: (e) => { show = e.target.value; draw(); } },
        h('option', { value: 'taught', selected: show === 'taught' }, isStudent ? 'Standards in my lessons' : 'Taught in this course'),
        h('option', { value: 'all', selected: show === 'all' }, 'All 67 standards'))),
      !isStudent && classes.length > 0 && tab === 'standard' && h('label.field.small', h('span', 'Class progress for'), h('select', {
        onchange: async (e) => { classId = e.target.value; board = await app.store.classBoard(classId); draw(); },
      }, classes.map((c) => h('option', { value: c.id, selected: c.id === classId }, c.name)))),
    );
    clear(body).append(summary(), controls, ...[tab === 'standard' ? byStandard() : byLesson()].flat());
  };
  draw();

  return h('div.stack',
    h('div.row.between',
      h('div',
        h('h1', 'Massachusetts DLCS standards'),
        h('p.muted', isStudent ? 'The skills your lessons are building, in the words Massachusetts uses for Grades 6 to 8.' : 'Grades 6 to 8 Digital Literacy and Computer Science standards, mapped to every lesson.')),
      !isStudent && h('button.btn', { onclick: exportCsv }, 'Export CSV')),
    h('p.small', isStudent
      ? [h('strong', 'Assessed'), ' lessons are where your work shows the skill. ', h('strong', 'Practiced'), ' lessons help you build it. Approved means your teacher has approved a lesson where the skill is assessed.']
      : [h('strong', 'Anchor'), ' lessons produce work you can assess against the standard. ', h('strong', 'Supporting'), ' lessons practice the idea, but are not evidence on their own. Progress counts lesson status, not scores. Lesson codes: t Base Camp, p High Road, a Wild Road, s Star Road, m Mind Road, c shared.']),
    tabs,
    body,
  );
}
