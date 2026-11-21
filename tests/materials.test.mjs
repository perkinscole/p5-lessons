// Slides, worksheets, answer keys and checklists are built from lesson data. These tests build all
// of them for every lesson, so a lesson that would print badly or give an answer away fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATH_IDS, sequence } from '../js/curriculum/graph.js';
import { allLessons, getLesson, lesson, briefOf } from '../js/curriculum/engine.js';
import { checksFor } from '../js/curriculum/checks.js';
import { todayFor } from '../js/curriculum/today.js';
import { alignmentFor } from '../js/curriculum/alignment.js';
import { STANDARDS } from '../js/curriculum/standards.js';
import { LIMITS, materialsFor, slidesFor, worksheetFor, answerKeyFor, checklistFor, demoFor, roadLessons, pieces, wordCount, slideWords, sheetWords, checklistWords } from '../js/curriculum/materials.js';

// A lesson on a road is built for that road. A shared one is built for all four.
const roadsOf = (l) => (l.path ? [l.path] : PATH_IDS);
const every = (fn) => { for (const l of allLessons()) for (const p of roadsOf(l)) fn(l, p, materialsFor(l.id, p)); };

test('every lesson produces slides, a worksheet, an answer key and a checklist', () => {
  assert.equal(allLessons().length, 52);
  every((l, p, m) => {
    const kinds = m.slides.map((s) => s.kind);
    for (const k of ['title', 'build', 'idea', 'predict', 'map', 'closing', 'reflect']) assert.ok(kinds.includes(k), `${l.id}: no ${k} slide`);
    assert.equal(kinds[0], 'title', `${l.id}: the title comes first`);
    assert.equal(m.slides[0].title, l.title);
    assert.equal(m.slides[0].mins, l.mins);
    assert.equal(kinds.filter((k) => k === 'idea').length, todayFor(l.id).ideas.length, `${l.id}: one slide for each key idea`);
    assert.deepEqual(m.slides.find((s) => s.kind === 'map').steps.map((s) => s.title), l.steps.map((s) => s.title), `${l.id}: the map lists the lesson's steps`);
    assert.ok(m.worksheet.terms.length >= 2 && m.worksheet.terms.length === m.worksheet.meanings.length, `${l.id}: a matching task`);
    assert.ok(m.worksheet.questions.length >= 2 && m.worksheet.questions.length <= LIMITS.sheetQuestions, `${l.id}: two or three questions to predict, not ${m.worksheet.questions.length}`);
    assert.equal(m.key.questions.length, m.worksheet.questions.length);
    assert.equal(m.checklist.steps.length, l.steps.length);
  });
});

test('slides, worksheets and checklists stay short', () => {
  every((l, p, m) => {
    for (const s of m.slides) assert.ok(slideWords(s) <= LIMITS.slideWords, `${l.id}: a ${s.kind} slide has ${slideWords(s)} words`);
    assert.ok(sheetWords(m.worksheet) <= LIMITS.sheetWords, `${l.id}: the worksheet has ${sheetWords(m.worksheet)} words`);
    assert.ok(checklistWords(m.checklist) <= LIMITS.checklistWords, `${l.id}: the checklist has ${checklistWords(m.checklist)} words`);
    for (const q of [...m.worksheet.questions, ...m.slides.filter((s) => s.code)]) assert.ok(q.code.split('\n').length <= LIMITS.codeLines, `${l.id}: code too long to project or print`);
    assert.ok(m.slides.filter((s) => s.kind === 'predict').length <= LIMITS.slideQuestions);
    assert.ok(m.worksheet.lines >= 3, `${l.id}: room to write a reflection`);
  });
});

test('questions are the lesson\'s own, and the closing one carries the idea outside the lesson', () => {
  every((l, p, m) => {
    const own = checksFor(l.id);
    const mine = (s) => own.find((q) => q.q === s.q && (q.code || '') === s.code);
    for (const s of m.slides.filter((x) => x.kind === 'predict')) assert.ok(mine(s) && s.code, `${l.id}: a predict slide shows one of the lesson's code questions`);
    const closing = mine(m.slides.find((s) => s.kind === 'closing'));
    assert.equal(closing.after, l.steps.length - 1, `${l.id}: the closing question is the one after the last step`);
    assert.ok(!m.slides.some((s) => s.kind === 'predict' && s.q === closing.q), `${l.id}: the closing question is not also a prediction`);
    assert.equal(m.slides.filter((s) => s.kind === 'reflect').map((s) => s.text).join(' '), l.reflect, `${l.id}: the reflection is the lesson's, word for word`);
    assert.equal(m.worksheet.reflect, l.reflect);
    // On paper: the lesson's own code questions first, then, only to reach two, one from an earlier lesson.
    const order = sequence(p);
    const earlier = order.slice(0, Math.max(order.indexOf(l.id), 0) || order.length).flatMap((id) => checksFor(id));
    m.worksheet.questions.forEach((q, i) => {
      assert.ok(q.code, `${l.id}: a worksheet question shows code`);
      if (q.from) {
        assert.ok(i > 0 && earlier.some((e) => e.q === q.q && e.code === q.code), `${l.id}: a look-back question comes from an earlier lesson on the road`);
      } else assert.ok(mine(q), `${l.id}: a worksheet question is not from this lesson`);
    });
  });
});

test('an answer never appears on the student sheet', () => {
  every((l, p, m) => {
    const sheet = JSON.stringify(m.worksheet);
    assert.ok(!/"(answer|why|letter"\s*:\s*"[A-H]",\s*"term|option)"/.test(sheet), `${l.id}: the worksheet carries an answer field`);
    for (const q of m.worksheet.questions) assert.deepEqual(Object.keys(q).sort(), ['code', 'from', 'options', 'q']);
    for (const q of m.key.questions) assert.ok(!sheet.includes(JSON.stringify(q.why).slice(1, -1)), `${l.id}: an explanation is printed on the worksheet`);
    // The meanings are mixed up, and the key decodes them.
    const ideas = todayFor(l.id).ideas;
    assert.notDeepEqual(m.worksheet.meanings.map((x) => x.means), ideas.map((x) => x.means), `${l.id}: meanings are printed in the order of the ideas`);
    assert.deepEqual(m.worksheet.terms, ideas.map((x) => x.term));
    for (const match of m.key.matches) {
      const idea = ideas.find((x) => x.term === match.term);
      assert.equal(m.worksheet.meanings.find((x) => x.letter === match.letter).means, idea.means, `${l.id}: the key gives the wrong letter for ${match.term}`);
    }
    m.key.questions.forEach((k, i) => {
      const q = m.worksheet.questions[i];
      const source = [l.id, ...sequence(p)].flatMap((id) => checksFor(id)).find((c) => c.q === q.q && c.code === q.code);
      assert.equal(k.option, source.options[source.answer], `${l.id}: the key's answer to question ${i + 1}`);
      assert.equal(q.options['ABCDEFGH'.indexOf(k.letter)], k.option);
    });
    // The same lesson always prints the same sheet, so yesterday's key still fits.
    assert.deepEqual(worksheetFor(l.id, p), m.worksheet);
  });
});

test('standards are quoted exactly, on slides and on the answer key', () => {
  const exact = (item, where) => assert.equal(item.text, STANDARDS.find((s) => s.code === item.code).text, `${where}: ${item.code} is reworded`);
  every((l, p, m) => {
    const a = alignmentFor(l.id);
    const slide = m.slides.find((s) => s.kind === 'standards');
    assert.ok(slide, `${l.id}: a standards slide`);
    assert.deepEqual(slide.items.map((x) => x.code), a.anchor.length ? a.anchor : a.support);
    assert.equal(slide.assessed, a.anchor.length > 0);
    assert.deepEqual(m.key.assessed.map((x) => x.code), a.anchor);
    assert.deepEqual(m.key.practiced.map((x) => x.code), a.support);
    assert.equal(m.key.evidence, a.evidence);
    for (const item of [...slide.items, ...m.key.assessed, ...m.key.practiced]) exact(item, l.id);
  });
});

test('the checklist has a box for each step, the stretch goals, and an "I can" for each key idea', () => {
  for (const l of allLessons()) {
    const c = checklistFor(l.id, l.path);
    c.steps.forEach((s, i) => {
      const step = l.steps[i];
      assert.equal(s.title, step.title);
      // A step with its code hidden states a goal, so the name alone is not enough on paper.
      assert.equal(s.goal, step.reveal ? briefOf(step).brief : '', `${l.id} / ${step.title}`);
      assert.ok(wordCount(s.goal) <= 26, `${l.id} / ${step.title}: the goal is long`);
    });
    assert.deepEqual(c.stretch, l.stretch);
    assert.deepEqual(c.ican.map((x) => x.term), todayFor(l.id).ideas.map((x) => x.term));
    for (const x of c.ican) assert.match(x.lead, /^I can/);
  }
});

test('nothing in the materials names a student or a grade', () => {
  every((l, p, m) => {
    const keys = new Set();
    JSON.stringify(m, (k, v) => { keys.add(k); return v; });
    for (const k of ['grade', 'score', 'student', 'display_name', 'email', 'xp']) assert.ok(!keys.has(k), `${l.id}: materials carry "${k}"`);
  });
});

test('the finished game is only offered where it runs with nothing to load', () => {
  assert.ok(demoFor('t1', 'platformer').code.includes('createCanvas'));
  assert.equal(demoFor('c2', 'platformer'), null, 'c2 needs sprites');
  assert.equal(demoFor('zz9', 'platformer'), null);
  for (const l of allLessons()) for (const p of roadsOf(l)) {
    const d = demoFor(l.id, p);
    if (d) assert.ok(!/SPRITES\.|ml5\.|createCapture|loadSound|loadImage/.test(d.code), `${l.id}: the demo needs something loaded`);
  }
});

test('a road\'s pack is its core lessons in order', () => {
  for (const p of PATH_IDS) {
    const ids = roadLessons(p);
    assert.ok(ids.length >= 10 && ids.length <= 15);
    for (const id of ids) assert.ok(getLesson(id));
  }
  assert.deepEqual(roadLessons('nowhere'), roadLessons('platformer'));
});

test('long text is split at sentences, never mid-sentence', () => {
  assert.deepEqual(pieces('One two. Three four? Five six seven eight.', 4), ['One two. Three four?', 'Five six seven eight.']);
  assert.deepEqual(pieces('', 10), []);
  assert.deepEqual(pieces('A sentence that is longer than the limit stays whole.', 3), ['A sentence that is longer than the limit stays whole.']);
});

test('a lesson with little written for it still gets materials, with the missing parts left out', () => {
  lesson({ id: 'zz1', title: 'Bare', mins: 30, concepts: ['one idea'], hook: 'A hook.', starter: '', steps: [{ title: 'Only step', mins: 30, say: 'Do the thing.' }] });
  const m = materialsFor('zz1', 'platformer');
  assert.deepEqual(m.slides.map((s) => s.kind), ['title', 'build', 'idea', 'map']);
  assert.equal(m.slides[1].text, 'A hook.');
  assert.deepEqual(m.worksheet.terms, []);
  assert.deepEqual(m.worksheet.meanings, []);
  assert.deepEqual(m.worksheet.questions, []);
  assert.equal(m.worksheet.reflect, '');
  assert.deepEqual(m.key.matches, []);
  assert.deepEqual(m.checklist.stretch, []);
  assert.equal(m.checklist.ican.length, 1);
  assert.throws(() => slidesFor('zz9'), /Unknown lesson/);
  assert.throws(() => answerKeyFor('zz9'), /Unknown lesson/);
});

// ---- The screen and its styles, read as text: there is no page to load in these tests. ----
import { readFileSync } from 'node:fs';
const VIEW = readFileSync(new URL('../js/views/materials.js', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');

test('the materials page asks the server for nothing, stores nothing, and runs nothing on a timer', () => {
  for (const word of ['store.', 'app.store', 'localStorage', 'sessionStorage', 'setInterval', 'setTimeout', 'fetch(', 'google.script']) {
    assert.ok(!VIEW.includes(word), `js/views/materials.js uses ${word}`);
  }
});

test('paper and slides do not reuse a class another screen already styles', () => {
  const at = CSS.indexOf('/* ---- Materials:');
  assert.ok(at > 0, 'the Materials section of app.css');
  const styled = (text) => new Set([...text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{[^}]*\}/g, '{}').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  const before = styled(CSS.slice(0, at));
  // Every class the page puts on an element it builds, e.g. h('article.sheet.worksheet').
  const used = new Set([...VIEW.matchAll(/h\(\s*[`'"]([\w.\-${}?:' >]+?)[`'"]/g)].flatMap((m) => [...m[1].matchAll(/\.([a-zA-Z][\w-]*)/g)].map((c) => c[1])));
  assert.ok(used.has('sheet') && used.has('slide') && used.has('present'), 'the classes were read from the page');
  // Shared on purpose: the app's own layout, buttons and tabs.
  const shared = new Set(['stack', 'row', 'btn', 'primary', 'big', 'small', 'muted', 'eyebrow', 'tab', 'tabs', 'path-pick']);
  for (const c of used) if (!shared.has(c)) assert.ok(!before.has(c), `.${c} is already styled for another screen (the teacher's review page has a .checklist)`);
});

test('Space and Enter on a Present button press that button instead of moving the slides', () => {
  assert.match(VIEW, /\(k === ' ' \|\| k === 'Enter'\) && e\.target instanceof Element && e\.target\.closest\('button'\)\) return;/);
});
