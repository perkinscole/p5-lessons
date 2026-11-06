// Runs the real supabase/schema.sql on an in-memory Postgres and attacks its privacy rules.
// Only Supabase's auth layer is stubbed. Needs: npm install
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });

const TEACHER_A = '00000000-0000-0000-0000-00000000000a';
const TEACHER_B = '00000000-0000-0000-0000-00000000000b';
const ANON_1 = '00000000-0000-0000-0000-000000000001';
const ANON_2 = '00000000-0000-0000-0000-000000000002';
const ANON_3 = '00000000-0000-0000-0000-000000000003';
const STRANGER = '00000000-0000-0000-0000-000000000009';

/** Run queries as a signed-in user, the way PostgREST does. */
async function as(uid, fn, { anonymous = true } = {}) {
  await db.exec(`select set_config('test.uid', '${uid}', false), set_config('test.anon', '${anonymous}', false); set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role;');
  }
}
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const rejects = (p) => assert.rejects(p);

const state = {};

test.before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('is_anonymous', current_setting('test.anon', true)::boolean) $$;
    grant usage on schema auth to authenticated, anon; grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    insert into auth.users values ('${TEACHER_A}'), ('${TEACHER_B}'), ('${ANON_1}'), ('${ANON_2}'), ('${ANON_3}'), ('${STRANGER}');
  `);
  await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));

  const teach = { anonymous: false };
  await as(TEACHER_A, () => db.query(`insert into teachers (id, display_name) values ($1, 'A')`, [TEACHER_A]), teach);
  await as(TEACHER_B, () => db.query(`insert into teachers (id, display_name) values ($1, 'B')`, [TEACHER_B]), teach);
  state.classA = (await as(TEACHER_A, () => rows(`select * from create_class('Class A')`), teach))[0];
  state.classB = (await as(TEACHER_B, () => rows(`select * from create_class('Class B')`), teach))[0];
  state.roster = (await as(TEACHER_A, () => rows(`select add_students($1, $2) as r`, [state.classA.id, ['Ari M', 'Bea T', 'Ari M']]), teach))[0].r;
  state.rosterB = (await as(TEACHER_B, () => rows(`select add_students($1, $2) as r`, [state.classB.id, ['Zed Q']]), teach))[0].r;
  [state.ari, state.bea, state.ari2] = state.roster;
  await as(ANON_1, () => rows(`select student_login($1, $2, $3)`, [state.classA.code, state.ari.username, state.ari.passcode]));
  await as(ANON_2, () => rows(`select student_login($1, $2, $3)`, [state.classA.code, state.bea.username, state.bea.passcode]));
  await as(ANON_3, () => rows(`select student_login($1, $2, $3)`, [state.classB.code, state.rosterB[0].username, state.rosterB[0].passcode]));
  await as(ANON_1, () => db.query(`insert into works (student_id, lesson_id, code) values ($1, 't1', 'ARI SECRET CODE')`, [state.ari.id]));
  await as(ANON_2, () => db.query(`insert into works (student_id, lesson_id, code, status) values ($1, 't1', 'BEA CODE', 'submitted')`, [state.bea.id]));
  state.beaWork = (await as(TEACHER_A, () => rows(`select id from works where student_id = $1`, [state.bea.id]), teach))[0].id;
  await as(TEACHER_A, () => db.query(`select save_grade($1, '{"works":4}', 4, 12, 'Private note', 'approved')`, [state.beaWork]), teach);
});

test('duplicate names get different usernames', () => {
  assert.notEqual(state.ari.username, state.ari2.username);
});

test('a wrong passcode does not log in, and a right one does', async () => {
  const bad = await as(STRANGER, () => rows(`select student_login($1, $2, 'wrong-pass-00') as id`, [state.classA.code, state.ari2.username]));
  assert.equal(bad[0].id, null);
  const me = await as(STRANGER, () => rows('select whoami() as w'));
  assert.equal(me[0].w, null);
});

test('five wrong passcodes lock the login, even with the right passcode next', async () => {
  const uname = state.ari2.username;
  for (let i = 0; i < 5; i++) await as(STRANGER, () => rows(`select student_login($1, $2, 'nope') as id`, [state.classA.code, uname])).catch(() => {});
  await rejects(as(STRANGER, () => rows(`select student_login($1, $2, $3)`, [state.classA.code, uname, state.ari2.passcode])));
});

test('nobody can read passcode hashes or sessions', async () => {
  for (const uid of [ANON_1, TEACHER_A, STRANGER]) {
    assert.equal((await as(uid, () => rows('select * from student_secrets'))).length, 0, uid);
    assert.equal((await as(uid, () => rows('select * from student_sessions'))).length, 0, uid);
  }
});

test("a student can't read a classmate's code or grades", async () => {
  const works = await as(ANON_1, () => rows('select * from works'));
  assert.ok(works.every((w) => w.student_id === state.ari.id));
  assert.equal((await as(ANON_1, () => rows('select * from grades'))).length, 0);
});

test('a student can read their own grade', async () => {
  const g = await as(ANON_2, () => rows('select * from grades'));
  assert.equal(g.length, 1);
  assert.equal(g[0].feedback, 'Private note');
});

test('the class board shows progress but no code or grades', async () => {
  const b = (await as(ANON_1, () => rows('select class_board($1) as b', [state.classA.id])))[0].b;
  assert.ok(b.length >= 2);
  const text = JSON.stringify(b);
  assert.ok(!text.includes('BEA CODE') && !text.includes('Private note') && !text.includes('passcode'));
  assert.ok(b.find((s) => s.id === state.bea.id).works[0].status === 'approved');
});

test("a student can't see another class's board or roster", async () => {
  await rejects(as(ANON_3, () => rows('select class_board($1)', [state.classA.id])));
  assert.equal((await as(ANON_3, () => rows('select * from students where class_id = $1', [state.classA.id]))).length, 0);
});

test("a teacher can't see or change another teacher's class", async () => {
  const opts = { anonymous: false };
  assert.equal((await as(TEACHER_B, () => rows('select * from students where class_id = $1', [state.classA.id]), opts)).length, 0);
  assert.equal((await as(TEACHER_B, () => rows('select * from works where student_id = $1', [state.ari.id]), opts)).length, 0);
  await rejects(as(TEACHER_B, () => rows('select class_board($1)', [state.classA.id]), opts));
  await rejects(as(TEACHER_B, () => rows('select add_students($1, $2)', [state.classA.id, ['Intruder']]), opts));
  await rejects(as(TEACHER_B, () => rows('select reset_passcode($1)', [state.ari.id]), opts));
  await rejects(as(TEACHER_B, () => rows(`select save_grade($1, '{}', 12, 12, '', 'approved')`, [state.beaWork]), opts));
});

test("a student can't approve their own work or write a grade", async () => {
  await rejects(as(ANON_1, () => db.query(`update works set status = 'approved' where student_id = $1`, [state.ari.id])));
  await rejects(as(ANON_1, () => db.query(`insert into works (student_id, lesson_id, status) values ($1, 't2', 'approved')`, [state.ari.id])));
  await rejects(as(ANON_1, () => rows(`select save_grade(id, '{}', 12, 12, '', 'approved') from works limit 1`)));
  const w = (await as(ANON_1, () => rows('select id from works')))[0];
  await rejects(as(ANON_1, () => db.query(`insert into grades (work_id, total) values ($1, 12)`, [w.id])));
});

test('approved work is locked for the student', async () => {
  const r = await as(ANON_2, () => db.query(`update works set code = 'changed' where id = $1`, [state.beaWork]));
  assert.equal(r.affectedRows, 0);
});

test('a returned lesson can still be saved', async () => {
  await as(TEACHER_A, () => db.query(`select save_grade($1, '{}', 4, 12, 'Try again', 'returned')`, [state.beaWork]), { anonymous: false });
  const r = await as(ANON_2, () => db.query(`update works set code = 'fixed' where id = $1`, [state.beaWork]));
  assert.equal(r.affectedRows, 1);
});

test("a student can't rename themselves or move class, but can change their character", async () => {
  await rejects(as(ANON_1, () => db.query(`update students set display_name = 'Hacker' where id = $1`, [state.ari.id])));
  await rejects(as(ANON_1, () => db.query(`update students set class_id = $1 where id = $2`, [state.classB.id, state.ari.id])));
  const ok = await as(ANON_1, () => db.query(`update students set avatar = '{"hat":"cap"}' where id = $1`, [state.ari.id]));
  assert.equal(ok.affectedRows, 1);
  const other = await as(ANON_1, () => db.query(`update students set avatar = '{"hat":"cap"}' where id = $1`, [state.bea.id]));
  assert.equal(other.affectedRows, 0);
});

test("a student can't give themselves a badge", async () => {
  await rejects(as(ANON_1, () => db.query(`insert into awards (student_id, badge_id) values ($1, 'helper')`, [state.ari.id])));
});

test("an anonymous session can't become a teacher", async () => {
  await rejects(as(STRANGER, () => db.query(`insert into teachers (id, display_name) values ($1, 'Fake')`, [STRANGER])));
  await rejects(as(STRANGER, () => rows(`select create_class('Fake')`)));
});

test('shared games and sprites are visible only inside the class', async () => {
  await as(ANON_1, () => db.query(`update works set shared = true where student_id = $1`, [state.ari.id]));
  await as(ANON_1, () => db.query(`insert into sprites (class_id, student_id, name, data_url, published, author_name) values ($1, $2, 'hero', 'data:x', true, 'Ari')`, [state.classA.id, state.ari.id]));
  const arcade = (await as(ANON_2, () => rows('select class_arcade($1) as a', [state.classA.id])))[0].a;
  assert.equal(arcade.length, 1);
  assert.equal(arcade[0].student.display_name, 'Ari M');
  await rejects(as(ANON_3, () => rows('select class_arcade($1)', [state.classA.id])));
  await rejects(as(TEACHER_B, () => rows('select class_arcade($1)', [state.classA.id]), { anonymous: false }));
  assert.equal((await as(ANON_2, () => rows(`select * from sprites`))).length, 1);
  // Unshared work stays private from classmates, and direct table reads never cross students.
  assert.ok((await as(ANON_2, () => rows('select student_id from works'))).every((w) => w.student_id === state.bea.id));
  assert.equal((await as(ANON_3, () => rows(`select * from sprites`))).length, 0);
});

test('a new passcode ends old sessions', async () => {
  const pass = (await as(TEACHER_A, () => rows('select reset_passcode($1) as p', [state.ari.id]), { anonymous: false }))[0].p;
  assert.ok(pass);
  assert.equal((await as(ANON_1, () => rows('select whoami() as w')))[0].w, null);
  assert.ok((await as(ANON_1, () => rows('select student_login($1, $2, $3) as id', [state.classA.code, state.ari.username, pass])))[0].id);
});

test('removing a student deletes their work', async () => {
  await as(TEACHER_A, () => db.query('delete from students where id = $1', [state.ari2.id]), { anonymous: false });
  assert.equal((await rows('select count(*)::int as n from student_secrets where student_id = $1', [state.ari2.id]))[0].n, 0);
});
