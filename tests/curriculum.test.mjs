// Run with: npm test
// Every lesson must build into working code that passes its own checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATH_IDS, STAGES, sequence, mapLayout, previousGameLesson } from '../js/curriculum/graph.js';
import { allLessons, buildSolution, checkSummary, getLesson, stripComments, fallbackStarter } from '../js/curriculum/engine.js';

test('there are 36 lessons and all are on the map', () => {
  assert.equal(allLessons().length, 36);
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

test('stripComments ignores commented code but keeps strings', () => {
  assert.equal(stripComments('a // b\nc').trim(), 'a \nc'.trim());
  assert.equal(stripComments('"// keep"'), '"// keep"');
  assert.equal(stripComments('x /* gone */ y'), 'x  y');
});
