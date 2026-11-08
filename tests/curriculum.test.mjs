// Run with: npm test
// Every lesson must build into working code that passes its own checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATH_IDS, STAGES, SIDE_TRAILS, sequence, coreSequence, mapLayout, previousGameLesson } from '../js/curriculum/graph.js';
import { ALIGNMENT } from '../js/curriculum/alignment.js';
import { checksFor } from '../js/curriculum/checks.js';
import { recentAchievements } from '../js/game/rules.js';
import { STANDARDS } from '../js/curriculum/standards.js';
import { allLessons, buildSolution, buildThrough, applySkeleton, stepPasses, checkSummary, getLesson, stripComments, fallbackStarter, briefOf } from '../js/curriculum/engine.js';

test('there are 44 lessons and all are on the map', () => {
  assert.equal(allLessons().length, 44);
  const onMap = new Set(mapLayout().nodes.map((n) => n.id));
  for (const l of allLessons()) assert.ok(onMap.has(l.id), `${l.id} missing from map`);
});

test('each lesson fits 30-40 minutes, and step times add up', () => {
  for (const l of allLessons()) {
    assert.ok(l.mins >= 30 && l.mins <= 40, `${l.id} is ${l.mins} min`);
    const sum = l.steps.reduce((a, s) => a + (s.mins || 0), 0);
    assert.equal(sum, l.mins, `${l.id}: steps add to ${sum}, says ${l.mins}`);
  }
});

test('each lesson has a hook, concept, stretch goals, and a reflection', () => {
  for (const l of allLessons()) {
    assert.ok(l.hook && l.concepts.length && l.stretch.length >= 2 && l.reflect, l.id);
  }
});

test('every lesson builds on every road and passes its own checks', () => {
  for (const path of PATH_IDS) {
    for (const id of sequence(path)) {
      const src = buildSolution(id, path);
      const { results } = checkSummary(getLesson(id), src);
      results.forEach((ok, i) => assert.ok(ok, `${path}/${id} fails check: "${getLesson(id).steps[i].title}"`));
    }
  }
});

test('every solution is syntactically valid JavaScript', () => {
  for (const path of PATH_IDS) {
    for (const id of sequence(path)) {
      assert.doesNotThrow(() => new Function(buildSolution(id, path)), `${path}/${id}`);
    }
  }
});

test('the starter code does not already pass the coding steps', () => {
  for (const path of PATH_IDS) {
    for (const id of sequence(path)) {
      const l = getLesson(id);
      const starter = fallbackStarter(l, previousGameLesson(id, path), path);
      const coded = l.steps.filter((s) => s.check);
      const free = coded.filter((s) => checkSummary({ steps: [s] }, starter).passed === 1);
      assert.ok(free.length < coded.length || coded.length === 0, `${path}/${id}: every check already passes on the starter`);
    }
  }
});

test('roads branch and rejoin at every Crossing', () => {
  const seqs = PATH_IDS.map(sequence);
  for (const st of STAGES.filter((s) => s.kind === 'shared')) {
    for (const id of st.lessons) for (const s of seqs) assert.ok(s.includes(id));
  }
  for (const st of STAGES.filter((s) => s.kind === 'branch')) {
    const lens = Object.values(st.branches).map((b) => b.length);
    assert.equal(new Set(lens).size, 1, `${st.id} roads differ in length`);
  }
});

test('every lesson is aligned, using real standard codes', () => {
  const codes = new Set(STANDARDS.map((s) => s.code));
  assert.equal(codes.size, 67);
  for (const l of allLessons()) {
    const a = ALIGNMENT[l.id];
    assert.ok(a, `${l.id} has no alignment`);
    assert.ok(a.anchor.length + a.support.length > 0, `${l.id} has no standards`);
    assert.ok(a.evidence, `${l.id} has no evidence note`);
    for (const c of [...a.anchor, ...a.support]) assert.ok(codes.has(c), `${l.id}: unknown code ${c}`);
    assert.equal(new Set([...a.anchor, ...a.support]).size, a.anchor.length + a.support.length, `${l.id} lists a code twice`);
  }
  assert.equal(Object.keys(ALIGNMENT).length, allLessons().length);
});

test('try-first steps state a goal instead of pointing at hidden code', () => {
  for (const l of allLessons()) {
    for (const s of l.steps.filter((x) => x.reveal)) {
      assert.ok(!/:\s*$/.test(s.say), `${l.id} / ${s.title} ends by pointing at code students can't see`);
      assert.ok(!/\b(?:with this|add this|this function|this class)\b/i.test(s.say), `${l.id} / ${s.title} refers to hidden code`);
    }
  }
});

test('code support fades: later stages hide more than early road lessons', () => {
  const hidden = (ids) => {
    const steps = ids.flatMap((id) => getLesson(id).steps).filter((s) => s.code !== undefined || s.show !== undefined || s.edits);
    return steps.filter((s) => s.reveal).length / steps.length;
  };
  const f1 = hidden(['p1', 'p2', 'p3', 'a1', 'a2', 'a3', 's1', 's2', 's3', 'm1', 'm2', 'm3']);
  const f2 = hidden(['p4', 'p5', 'p6', 'a4', 'a5', 'a6', 's4', 's5', 's6', 'm4', 'm5', 'm6']);
  const f3 = hidden(['p7', 'p8', 'a7', 'a8', 's7', 's8', 'm7', 'm8']);
  assert.ok(f1 < f2 && f2 < f3, `fork1 ${f1}, fork2 ${f2}, fork3 ${f3}`);
});

test('every skeleton inserts cleanly, stays valid code, and still leaves work to do', () => {
  let count = 0;
  for (const path of PATH_IDS) {
    for (const id of sequence(path)) {
      const l = getLesson(id);
      l.steps.forEach((s, i) => {
        if (!s.skeleton) return;
        count++;
        const before = buildThrough(id, path, i);
        const withSkeleton = applySkeleton(before, s);
        assert.doesNotThrow(() => new Function(withSkeleton), `${id} / ${s.title} is not valid code`);
        assert.ok(/TODO/.test(s.skeleton.map((e) => e.code).join('')), `${id} / ${s.title} has no TODO`);
        assert.ok(!stepPasses(s, withSkeleton), `${id} / ${s.title} passes without finishing the TODOs`);
        assert.ok(s.reveal, `${id} / ${s.title} shows the answer outright`);
      });
    }
  }
  assert.ok(count >= 7, `only ${count} skeletons`);
});

test('a try-first step is not already passing before the student does it', () => {
  for (const path of PATH_IDS) {
    for (const id of sequence(path)) {
      getLesson(id).steps.forEach((s, i) => {
        if (s.reveal && s.check) assert.ok(!stepPasses(s, buildThrough(id, path, i)), `${path}/${id} / ${s.title} is already green`);
      });
    }
  }
});

test('the core fits a term: 10 to 15 lessons on every road, and every road can go further', () => {
  for (const path of PATH_IDS) {
    const core = coreSequence(path);
    assert.ok(core.length >= 10 && core.length <= 15, `${path} core is ${core.length}`);
    assert.ok(sequence(path).length > core.length, `${path} has nothing beyond the core`);
    assert.ok(core.includes('c6'), `${path} core does not reach the Summit`);
  }
});

test('the side trail stands alone and builds', () => {
  for (const t of SIDE_TRAILS) {
    assert.equal(previousGameLesson(t.id, 'platformer'), null);
    assert.ok(checkSummary(getLesson(t.id), buildSolution(t.id)).results.every(Boolean));
  }
});

test('AI lessons use ml5 only where they say so', () => {
  assert.ok(/ml5\./.test(buildSolution('m3', 'mind')));
  assert.ok(!/ml5\./.test(buildSolution('p5', 'platformer')), 'other roads should not load ml5');
});

test('each lesson has well-formed checks for learning, in the walkthrough', () => {
  let total = 0;
  for (const l of allLessons()) {
    const qs = checksFor(l.id);
    assert.ok(qs.length >= 2, `${l.id} has ${qs.length} checks`);
    for (const q of qs) {
      total++;
      assert.ok(q.after >= 0 && q.after < l.steps.length, `${l.id}: check placed after step ${q.after}`);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, `${l.id}: bad answer index`);
      assert.ok(q.options.length >= 2 && q.why, `${l.id}: incomplete check`);
      assert.ok(q.q.split(/\s+/).length <= 18, `${l.id}: question too long: ${q.q}`);
    }
  }
  const answers = allLessons().flatMap((l) => checksFor(l.id).map((q) => q.answer));
  for (const i of [0, 1, 2]) assert.ok(answers.filter((a) => a === i).length > total / 5, 'answers lean toward one position');
});

test('each step opens with one short instruction', () => {
  for (const l of allLessons()) {
    for (const s of l.steps) {
      const { brief } = briefOf(s);
      assert.ok(brief.length > 0, `${l.id} / ${s.title} has no instruction`);
      assert.ok(brief.split(/\s+/).length <= 26, `${l.id} / ${s.title}: ${brief.split(/\s+/).length} words`);
    }
  }
});

test('recent achievements come from real records, newest first, and never scores', () => {
  const at = (mins) => new Date(Date.now() - mins * 60000).toISOString();
  const board = [{
    id: 's1', display_name: 'Ari M', path: 'mind', avatar: null,
    works: [
      { lesson_id: 't1', status: 'approved', stretch_done: 0, auto_ok: true, shared: false, submitted_at: at(120) },
      { lesson_id: 't3', status: 'submitted', stretch_done: 0, auto_ok: true, shared: false, submitted_at: at(30) },
      { lesson_id: 't4', status: 'in_progress', stretch_done: 0, auto_ok: true, shared: false, submitted_at: null },
    ],
    awards: [{ badge_id: 'helper', note: '', created_at: at(5) }],
  }];
  const feed = recentAchievements(board);
  assert.equal(feed[0].text, 'earned Helping Hand');
  assert.ok(feed.some((e) => e.text === 'earned Total Recall'));
  assert.ok(feed.some((e) => e.text === 'earned First Canvas'));
  assert.ok(!feed.some((e) => e.text === 'earned Trailblazer'), 'no road lesson yet');
  assert.deepEqual(feed.map((e) => e.time), [...feed.map((e) => e.time)].sort((x, y) => y - x));
  const old = [{ ...board[0], works: [{ ...board[0].works[0], submitted_at: at(60 * 24 * 30) }], awards: [] }];
  assert.equal(recentAchievements(old).length, 0);
});

test('stripComments ignores commented code but keeps strings', () => {
  assert.equal(stripComments('a // b\nc').trim(), 'a \nc'.trim());
  assert.equal(stripComments('"// keep"'), '"// keep"');
  assert.equal(stripComments('x /* gone */ y'), 'x  y');
});
