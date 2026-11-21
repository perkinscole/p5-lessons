// Run with: npm test
// Every lesson must build into working code that passes its own checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATHS, PATH_IDS, STAGES, SIDE_TRAILS, sequence, coreSequence, mapLayout, previousGameLesson } from '../js/curriculum/graph.js';
import { ALIGNMENT } from '../js/curriculum/alignment.js';
import { checksFor } from '../js/curriculum/checks.js';
import { recentAchievements } from '../js/game/rules.js';
import { paceAlerts_, isCoreLesson_, weekdaysBetween_ } from '../js/game/pace.js';
import { STANDARDS } from '../js/curriculum/standards.js';
import { attribute_, lineShares_, matchLines_ } from '../js/game/blame.js';
import { installSynth, cleanSong, songCode } from '../js/game/synth.js';
import { reviewFor } from '../js/curriculum/review.js';
import { buildWorld, place, isSolid, BOX } from '../js/game/world.js';
import { allLessons, buildSolution, buildThrough, applySkeleton, stepPasses, checkSummary, getLesson, stripComments, fallbackStarter, briefOf, filesThrough, shownCode } from '../js/curriculum/engine.js';

const allCode = (id, path, count = Infinity) => [buildThrough(id, path, count), ...Object.values(filesThrough(id, path, count))].join('\n');

test('there are 52 lessons and all are on the map', () => {
  assert.equal(allLessons().length, 52);
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
      const src = allCode(id, path);
      const { results } = checkSummary(getLesson(id), src);
      results.forEach((ok, i) => assert.ok(ok, `${path}/${id} fails check: "${getLesson(id).steps[i].title}"`));
    }
  }
});

test('every solution is syntactically valid JavaScript', () => {
  for (const path of PATH_IDS) {
    for (const id of sequence(path)) {
      assert.doesNotThrow(() => new Function(allCode(id, path)), `${path}/${id}`);
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
        if (s.reveal && s.check) assert.ok(!stepPasses(s, allCode(id, path, i)), `${path}/${id} / ${s.title} is already green`);
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
  assert.ok(/ml5\./.test(allCode('m3', 'mind')));
  assert.ok(!/ml5\./.test(allCode('p5', 'platformer')), 'other roads should not load ml5');
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

test('core lessons do not ask students to write what they have not been taught', () => {
  const inStudentCode = (l) => l.steps.map((s) => [s.code, s.show, ...(s.edits || []).map((e) => e.code), ...(s.skeleton || []).map((e) => e.code)].filter(Boolean).join('\n')).join('\n');
  const c6 = inStudentCode(getLesson('c6'));
  for (const re of [/\bclass\s+\w/, /\bnew\s+[A-Z]/, /\bthis\./, /\.splice\(/]) assert.ok(!re.test(c6), `capstone uses ${re}`);
  const m3 = inStudentCode(getLesson('m3'));
  for (const re of [/\bfunction\s+\w/, /results\[0\]/, /imageClassifier/]) assert.ok(!re.test(m3), `m3 uses ${re}`);
});

test('helper files carry forward to later lessons', () => {
  assert.ok(filesThrough('c6', 'mind')['model.js'], 'model.js should still be there at the Summit');
  assert.ok(filesThrough('c6', 'mind')['sparks.js']);
  assert.equal(filesThrough('m2', 'mind')['model.js'], undefined);
  assert.ok(filesThrough('p8', 'platformer')['sparks.js'], 'Beyond lessons follow the Summit');
  assert.deepEqual(filesThrough('t3', 'platformer'), {});
});

test('pace rules agree with the real trail about what counts as core', () => {
  for (const path of PATH_IDS) {
    const core = new Set(coreSequence(path));
    assert.equal(core.size, 15);
    for (const id of sequence(path)) assert.equal(isCoreLesson_(id), core.has(id), id);
  }
  assert.equal(isCoreLesson_('t2'), false);
});

test('keeping up: pace, inactivity, and sent-back work are flagged correctly', () => {
  const now = new Date('2026-03-18T12:00:00');
  const pace = { term_start: '2026-01-05', term_end: '2026-05-29' };
  const done = (n, when) => ['t1', 't3', 't4', 't5', 't6', 'p1', 'p2', 'p3', 'c1', 'c2', 'p4', 'p5', 'c4', 'c5', 'c6'].slice(0, n).map((lesson_id) => ({ lesson_id, status: 'approved', updated_at: when }));
  const recent = '2026-03-17T12:00:00Z';
  const old = '2026-02-20T12:00:00Z';
  const list = paceAlerts_([
    { id: 'a', display_name: 'On Track', works: done(8, recent) },
    { id: 'b', display_name: 'Two Behind', works: done(5, recent) },
    { id: 'c', display_name: 'Far Behind', works: done(3, recent) },
    { id: 'd', display_name: 'Went Quiet', works: done(8, old) },
    { id: 'e', display_name: 'Never Started', works: [] },
    { id: 'f', display_name: 'Beyond Only', works: [...done(8, recent), { lesson_id: 'p6', status: 'approved', updated_at: recent }] },
  ], pace, now);
  const by = Object.fromEntries(list.map((x) => [x.id, x]));
  assert.equal(by.a.expected, 7);
  assert.equal(by.a.level, 'ok');
  assert.equal(by.b.level, 'watch');
  assert.equal(by.c.level, 'behind');
  assert.equal(by.d.level, 'behind');
  assert.ok(by.d.reasons.some((r) => r.includes('school days')));
  assert.equal(by.e.level, 'behind');
  assert.ok(by.e.reasons.includes('Has not started'));
  assert.equal(by.f.done, 8);
  assert.equal(list.at(-1).level, 'ok');
  assert.equal(list[0].level, 'behind');
});

test('keeping up: with no term dates, only real inactivity is flagged', () => {
  const now = new Date('2026-03-18T12:00:00');
  const [s] = paceAlerts_([{ id: 'a', display_name: 'A', works: [] }], null, now);
  assert.equal(s.level, 'ok');
  assert.equal(s.expected, null);
});

test('school days skip weekends', () => {
  assert.equal(weekdaysBetween_(new Date('2026-03-13T12:00:00'), new Date('2026-03-16T12:00:00')), 1);
  assert.equal(weekdaysBetween_(new Date('2026-03-09T12:00:00'), new Date('2026-03-16T12:00:00')), 5);
});

test('every step tells the student what to do', () => {
  for (const l of allLessons()) {
    for (const s of l.steps) {
      const { brief } = briefOf(s);
      assert.ok(brief.trim().split(/\s+/).length >= 3 || /^(Press|Run)\b/.test(brief), `${l.id} / ${s.title}: "${brief}"`);
    }
  }
});

/** Plays Catch and Dodge with the lesson's real numbers. A careful player looks half a second ahead. */
function playChase(seed, careful) {
  const src = allCode('m2', 'mind');
  const speed = Number(src.match(/let speed = ([\d.]+)/)[1]);
  const walk = Number(src.match(/let botSpeed = ([\d.]+)/)[1]);
  const sprint = Number(src.match(/botSpeed = ([\d.]+);\s*\} else/)[1]);
  const close = Number(src.match(/dist\(botX, botY, playerX, playerY\) < (\d+)/)[1]);
  const clamp = (v) => Math.min(370, Math.max(0, v));
  const gap = (g) => Math.hypot(g.px - g.bx, g.py - g.by);
  const moveAll = (g, dx, dy) => {
    g.px = clamp(g.px + dx * speed); g.py = clamp(g.py + dy * speed);
    const b = gap(g) < close ? sprint : walk;
    if (g.bx < g.px) g.bx += b;
    if (g.bx > g.px) g.bx -= b;
    if (g.by < g.py) g.by += b;
    if (g.by > g.py) g.by -= b;
  };
  let r = seed;
  const rand = (lo, hi) => { r = (r * 16807) % 2147483647; return lo + (r / 2147483647) * (hi - lo); };
  const game = { px: 60, py: 60, bx: 340, by: 340 };
  let score = 0; let cx = 200; let cy = 120;
  const toCoin = (g) => Math.hypot(g.px + 15 - cx, g.py + 15 - cy);
  const planMove = () => {
    if (!careful) return [Math.sign(cx - 15 - game.px), Math.sign(cy - 15 - game.py)];
    let best = -Infinity; let move = [0, 0];
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      const g = { ...game }; let nearest = Infinity; let reached = false; let dead = false;
      for (let i = 0; i < 30 && !dead; i++) {
        moveAll(g, dx, dy);
        nearest = Math.min(nearest, gap(g));
        dead = nearest < 34;
        reached = reached || toCoin(g) < 25;
      }
      const value = (reached ? 300 : 0) - toCoin(g) + Math.min(nearest, 70) * 2;
      if (!dead && value > best) { best = value; move = [dx, dy]; }
    }
    return move;
  };
  for (let frame = 0; frame < 7200; frame++) {
    moveAll(game, ...planMove());
    if (toCoin(game) < 25) { score += 10; cx = rand(30, 370); cy = rand(30, 370); }
    if (gap(game) < 28) return 'caught';
    if (score >= 100) return 'won';
  }
  return 'time';
}

test('the Mind Road bot catches careless players, and careful ones can still win', () => {
  const games = Array.from({ length: 60 }, (_, i) => (i + 1) * 7919);
  const caught = games.filter((s) => playChase(s, false) === 'caught').length;
  const won = games.filter((s) => playChase(s, true) === 'won').length;
  assert.ok(caught >= 48, `a player who ignores the bot was caught only ${caught} of 60 times`);
  assert.ok(won >= 30, `a careful player won only ${won} of 60 games`);
});

test('the trained model can steer in every direction the game needs', () => {
  const src = allCode('m3', 'mind');
  for (const dir of ['left', 'right', 'up', 'down']) assert.ok(src.includes(`label === "${dir}"`), dir);
});

test('the locked door really locks: no way to the treasure without the key', () => {
  for (const id of ['a3', 'a6']) assert.match(allCode(id, 'adventure'), /if \(hasKey &&[^\n]*treasureX/, id);
  const src = allCode('a5', 'adventure');
  const walls = [...src.matchAll(/\{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}/g)].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
  assert.ok(walls.length >= 4);
  const door = { x: 300, y: 60, w: 40, h: 80 };
  const size = 30;
  const startX = Number(src.match(/let playerX = (\d+)/)[1]);
  const startY = Number(src.match(/let playerY = (\d+)/)[1]);
  const canReach = (blocks, goalX, goalY, radius) => {
    const hit = (x, y) => x < 0 || y < 0 || x + size > 400 || y + size > 400 || blocks.some((w) => x < w.x + w.w && x + size > w.x && y < w.y + w.h && y + size > w.y);
    const queue = [[startX, startY]];
    const seen = new Set([`${startX},${startY}`]);
    while (queue.length) {
      const [x, y] = queue.shift();
      if (Math.hypot(x + 15 - goalX, y + 15 - goalY) < radius) return true;
      for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
        const k = `${x + dx},${y + dy}`;
        if (!seen.has(k) && !hit(x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); }
      }
    }
    return false;
  };
  assert.ok(canReach([...walls, door], 60, 340, 25), 'the key must be reachable');
  assert.ok(!canReach([...walls, door], 350, 40, 30), 'the treasure is reachable with the door closed');
  assert.ok(canReach(walls, 350, 40, 30), 'the treasure must be reachable once the door opens');
});

test('every stop on the journey map stands on solid ground with room around it', () => {
  const { tiles, nodes } = buildWorld();
  const TILE = 12;
  for (const n of nodes) {
    const { x, y } = place(n);
    const left = Math.floor((x - BOX) / TILE);
    const right = Math.ceil((x + BOX) / TILE) - 1;
    const top = (y - BOX) / TILE;
    const floor = (y + BOX) / TILE;
    assert.ok(Number.isInteger(floor), `${n.id} is not on a row of blocks`);
    for (let c = left; c <= right; c++) {
      assert.ok(isSolid(tiles[c][floor]), `${n.id} has no ground at column ${c}`);
      for (let r = top; r < floor; r++) assert.ok(!isSolid(tiles[c][r]), `${n.id} is buried at column ${c}, row ${r}`);
    }
  }
});

test('the synth reads notes and songs, and classmates\' songs cannot carry code', () => {
  const { synthInfo } = installSynth({}, {});
  assert.equal(Math.round(synthInfo.noteFreq('A4')), 440);
  assert.equal(Math.round(synthInfo.noteFreq('A5')), 880);
  assert.equal(synthInfo.noteFreq('nope'), null);
  const parsed = synthInfo.parseSong({ tempo: 120, lead: 'C5 . E5', drums: 'k . s .' });
  assert.equal(parsed.steps, 4);
  assert.equal(parsed.lead[1], null);
  assert.ok(synthInfo.sounds.length >= 15);
  const evil = cleanSong({ tempo: '9;alert(1)', lead: 'C5 ";alert(1);// E5', bass: '', drums: '' });
  assert.equal(evil.lead, 'C5 E5');
  assert.equal(new Function(`${songCode(evil, 'theme')}return theme.lead;`)(), 'C5 E5');
});

test('line credit follows the person who typed each line', () => {
  const first = attribute_({}, {}, { 'sketch.js': 'a\nb' }, 0);
  const second = attribute_({ 'sketch.js': 'a\nb' }, first.blame, { 'sketch.js': 'a\n  new\nb' }, 1);
  assert.deepEqual(lineShares_(second.blame), { 0: 2, 1: 1 });
  assert.equal(second.added, 1);
  // Changing only the spaces around a line doesn't take credit for it.
  const third = attribute_({ 'sketch.js': 'a\n  new\nb' }, second.blame, { 'sketch.js': '    a\nnew\nb' }, 2);
  assert.deepEqual(lineShares_(third.blame), { 0: 2, 1: 1 });
  assert.equal(third.added, 0);
  const removed = attribute_({ 'sketch.js': 'a\nb' }, first.blame, {}, 1);
  assert.equal(removed.removed, 2);
  assert.deepEqual(matchLines_(['x', 'y', 'z'], ['x', 'q', 'z']), [0, -1, 2]);
});

test('every lesson asks students to read code, and every question fits its lesson', () => {
  for (const l of allLessons()) {
    const qs = checksFor(l.id);
    assert.ok(qs.some((q) => q.code), `${l.id} has no read-the-code question`);
    for (const q of qs) assert.ok(q.after >= 0 && q.after < l.steps.length, `${l.id}: question after step ${q.after}`);
  }
});

test('warm-ups come from an earlier lesson, never the one just before', () => {
  for (const path of PATH_IDS) {
    const order = sequence(path);
    order.forEach((id, i) => {
      const q = reviewFor(id, path);
      if (i < 2) { assert.equal(q, null, id); return; }
      assert.ok(q, `${path}/${id} has no warm-up`);
      const from = order.slice(0, i - 1).flatMap(checksFor).map((x) => x.q);
      assert.ok(from.includes(q.q), `${path}/${id}: warm-up is not from an earlier lesson`);
    });
  }
});

test('students write code themselves at the first fork, and hunt bugs in the core', () => {
  const coding = (ids) => ids.flatMap((id) => getLesson(id).steps).filter((s) => s.code !== undefined || s.edits || s.show !== undefined);
  for (const road of ['p', 'a', 's', 'm']) {
    const steps = coding([1, 2, 3].map((n) => `${road}${n}`));
    assert.ok(steps.filter((s) => s.reveal).length / steps.length >= 0.3, `${road}: too few try-first steps`);
  }
  const core = coreSequence('platformer');
  const hunts = core.filter((id) => getLesson(id).steps.some((s) => s.title === 'Bug hunt'));
  assert.ok(hunts.length >= 4, `only ${hunts.length} bug hunts`);
  assert.ok(core.some((id) => getLesson(id).steps.some((s) => /console\.log/.test(s.say || ''))), 'console.log is never taught');
});

test('the capstone asks for a plan and has no walkthrough for the new feature', () => {
  const titles = getLesson('c6').steps;
  const plan = titles.find((s) => s.title === 'Make a plan card');
  const build = titles.find((s) => s.title === 'Build your feature');
  assert.ok(plan && plan.skeleton);
  assert.ok(build && build.code === undefined && !build.edits && build.mins >= 15);
  assert.ok(titles.indexOf(plan) < titles.indexOf(build));
});

test('stripComments ignores commented code but keeps strings', () => {
  assert.equal(stripComments('a // b\nc').trim(), 'a \nc'.trim());
  assert.equal(stripComments('"// keep"'), '"// keep"');
  assert.equal(stripComments('x /* gone */ y'), 'x  y');
});

test('every lesson has a short big question for the class display', async () => {
  const { BIG_QUESTIONS } = await import('../js/curriculum/big.js');
  for (const l of allLessons()) {
    const q = BIG_QUESTIONS[l.id];
    assert.ok(q, `${l.id} needs a big question in big.js`);
    assert.match(q, /\?$/, `${l.id}: a big question ends with a question mark`);
    assert.ok(q.split(/\s+/).length <= 18, `${l.id}: big question is over 18 words`);
  }
});

test('placeFor finds where a step goes in the student\'s own code', async () => {
  const { placeFor } = await import('../js/curriculum/engine.js');
  const src = 'function setup() {\n  createCanvas(400, 400);\n}\n\nfunction draw() {\n    background(135,206,235);\n  ellipse(1, 2, 3, 4);\n}\n';
  assert.deepEqual(placeFor(src, { after: 'background(135, 206, 235);' }), { line: 6, how: 'after' });
  assert.deepEqual(placeFor(src, { before: 'ellipse(1, 2, 3, 4);' }), { line: 7, how: 'before' });
  assert.deepEqual(placeFor(src, { endOf: 'function draw() {' }), { line: 8, how: 'before' });
  assert.deepEqual(placeFor(src, { replace: 'createCanvas(400, 400);' }), { line: 2, how: 'replace' });
  assert.deepEqual(placeFor(src, { end: true }), { line: 8, how: 'end' });
  assert.equal(placeFor(src, { after: 'nothing like this' }), null);
  // Every step with an anchor can be placed in the code the student has just before it.
  let missing = [];
  for (const l of allLessons()) {
    for (const path of l.path ? [l.path] : ['platformer', 'adventure', 'arcade', 'mind']) {
      l.steps.forEach((step, i) => {
        const at = step.at || step.edits?.[0]?.at;
        if (!at) return;
        let before;
        try { before = buildThrough(l.id, path, i); } catch (_) { return; }
        if (!placeFor(before, at)) missing.push(`${l.id}/${path} step ${i + 1}`);
      });
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('no step hides its first action under "Why?"', () => {
  // The short instruction is picked from the end of a step's text. If the step has an earlier
  // action ("Delete the ), then read the message"), only the later part would show. Such steps
  // need their instruction written by hand in briefs.js.
  const ACTION = /^(Add|Replace|Write|Change|Make|Create|Press|Run|Use|Put|Click|Open|Try|Move|Draw|Show|Call|Give|Play|Pick|Set|Have|Cut|Delete|Comment|Keep|Read|Wrap|Build|Start|Swap|Choose|Look|Place)\b/;
  const hidden = [];
  for (const l of allLessons()) {
    for (const s of l.steps) {
      if (s.brief) continue;
      const { brief } = briefOf(s);
      const sentences = (s.say || '').split(/(?<=[.!?:])\s+(?=[A-Z`*])/).map((x) => x.trim()).filter(Boolean);
      if (sentences.some((x) => ACTION.test(x.replace(/^\*+/, '')) && !brief.includes(x))) hidden.push(`${l.id}/${s.title}`);
    }
  }
  assert.deepEqual(hidden, []);
});

test('instructions say what "it" is', () => {
  const vague = [];
  for (const l of allLessons()) for (const s of l.steps) {
    const { brief } = briefOf(s);
    if (/^(Add|Put|Use|Call|Wrap|Make|Have) (it|them)\b/.test(brief) || brief.split(/\s+/).length < 4) vague.push(`${l.id}/${s.title}: ${brief}`);
  }
  assert.deepEqual(vague, []);
});

test('the feedback report names files and steps the way students see them, with no ids', async () => {
  const { buildReport, troubleSteps, quizRows, sourceFile } = await import('../js/curriculum/report.js');
  const entry = {
    lesson_id: 't1', started: 3, finished: 1, count: 3, average: 4, stars: [0, 0, 1, 1, 1], confusing: {}, steps: {}, comments: [],
    hardest: ['making the sun'], better: ['more pictures'],
    flags: { 'step:3': { count: 2, reasons: { unclear: 2 }, notes: ['where does the | sun line go'] }, 'quiz:1': { count: 1, reasons: { hard: 1 }, notes: [] } },
    help: { 3: 1, 6: 1 }, quiz: { 0: { tries: 3, missed: 2 } },
  };
  assert.equal(sourceFile('m6'), 'js/curriculum/mind.js');
  assert.deepEqual(troubleSteps(entry).map((s) => [s.index, s.flags, s.help]), [[3, 2, 1], [6, 0, 1]]);
  assert.equal(quizRows(entry)[0].rate, 2 / 3);
  const text = buildReport([entry, { ...entry, lesson_id: 'zz' }], { className: 'Period 3', students: 3, date: '2026-11-18' });
  assert.match(text, /File: `js\/curriculum\/trunk\.js`/);
  assert.match(text, /\| 4 \| Add a sun \| 2 \| the instructions were unclear 2 \| 1 \|/);
  assert.match(text, /- Step 4: "where does the \| sun line go"/);
  assert.match(text, /67% \(2\/3\)/);
  assert.match(text, /### "What would make this lesson better\?"\n\n- more pictures/);
  assert.match(text, /student names removed/);
  assert.equal(buildReport([entry], { className: 'P', students: 1, date: 'd' }, 't3').includes('Hello, Canvas'), false);
});

test('problem reports read well as Markdown', async () => {
  const { buildBugReport } = await import('../js/curriculum/report.js');
  const text = buildBugReport([{ role: 'student', class_name: 'Period 1', at: '2026-11-18T14:00:00Z', page: '/lesson/t3', note: 'Run did nothing\nI pressed it twice', details: { lesson: 't3', step: '2', browser: 'CrOS Chrome/130', screen: '1366x768', errors: ['boom (App:1)'] } }], { date: '11/18/2026' });
  assert.match(text, /## 1\. Run did nothing/);
  assert.match(text, /lesson t3, step 3, source `js\/curriculum\/trunk\.js`/);
  assert.match(text, /> Run did nothing\n> I pressed it twice/);
  assert.match(text, /boom \(App:1\)/);
  assert.doesNotMatch(text, /undefined/);
});

test('the stalled list finds students who were working and stopped', async () => {
  const { stalledList } = await import('../js/curriculum/report.js');
  const now = Date.parse('2026-11-19T15:00:00Z');
  const ago = (m) => new Date(now - m * 60000).toISOString();
  const works = [
    { student_id: 'a', lesson_id: 't1', status: 'in_progress', step_at: 2, updated_at: ago(8) },
    { student_id: 'b', lesson_id: 't1', status: 'in_progress', step_at: 4, updated_at: ago(1) }, // still typing
    { student_id: 'c', lesson_id: 't1', status: 'submitted', step_at: 7, updated_at: ago(9) }, // finished
    { student_id: 'd', lesson_id: 't2', status: 'in_progress', step_at: 1, updated_at: ago(300) }, // not here today
    { student_id: 'e', lesson_id: 't1', status: 'in_progress', step_at: 3, updated_at: ago(40) }, // an old lesson...
    { student_id: 'e', lesson_id: 't2', status: 'in_progress', step_at: 0, updated_at: ago(2) }, // ...but busy on a new one
    { student_id: 'f', lesson_id: 't3', status: 'in_progress', step_at: 5, updated_at: ago(21) },
    { student_id: 'g', lesson_id: 't3', status: 'in_progress', updated_at: '' },
  ];
  assert.deepEqual(stalledList(works, now), [{ student_id: 'f', lesson_id: 't3', step_at: 5, minutes: 21 }, { student_id: 'a', lesson_id: 't1', step_at: 2, minutes: 8 }]);
  assert.deepEqual(stalledList([], now), []);
});

test('finished steps earn XP as a student works, and never from a grade', async () => {
  const { statsFor, XP } = await import('../js/game/rules.js');
  assert.equal(statsFor({ works: [{ lesson_id: 't1', status: 'in_progress', checks_passed: 3 }] }).xp, 3 * XP.step);
  assert.equal(statsFor({ works: [{ lesson_id: 't1', status: 'in_progress', checks_passed: 999 }] }).xp, 12 * XP.step, 'held to a sensible number of steps');
  const base = { lesson_id: 't1', status: 'approved', auto_ok: true, checks_passed: 4 };
  assert.equal(statsFor({ works: [{ ...base, grade: { total: 0 } }] }).xp, statsFor({ works: [{ ...base, grade: { total: 100 } }] }).xp);
  assert.equal(statsFor({ works: [base] }).xp, 4 * XP.step + XP.submit + XP.approved);
});

test('the map\'s scenery never sits under a stop, a label, or a trail', async () => {
  const { planOverworld, landFor } = await import('../js/game/overworld.js');
  const stops = [{ x: 72, y: 282 }, { x: 180, y: 282 }, { x: 612, y: 102 }, { x: 612, y: 462 }, { x: 936, y: 282 }];
  const trails = [[...Array(41)].map((_, i) => ({ x: 72 + i * 2.7, y: 282 })), [...Array(41)].map((_, i) => ({ x: 180 + i * 10.8, y: 282 - i * 4.5 }))];
  const stages = [{ x0: 0, x1: 500 }, { x0: 500, x1: 900 }, { x0: 900, x1: 1200 }];
  // A raised mesa round the top stop, and a sunken canyon round the bottom one.
  const terraces = [{ level: 2, x0: 562, x1: 662, y0: 56, y1: 146 }, { level: -2, x0: 562, x1: 662, y0: 400, y1: 508 }];
  const plan = planOverworld({ width: 1200, height: 540, stops, trails, stages, terraces });
  assert.deepEqual(plan.terraces.map((t) => [t.level, t.wall1 - t.wall0]), [[2, 8], [-2, 8]], 'two levels of height is two tiers of cliff');
  assert.ok(plan.terraces[0].wall0 === plan.terraces[0].y1, 'a mesa shows its cliff along the bottom');
  assert.ok(plan.terraces[1].wall1 === plan.terraces[1].y0, 'a canyon shows its wall along the top');
  for (const t of plan.things) for (const c of plan.terraces) assert.ok(!(t.x >= c.x0 && t.x <= c.x1 && t.y >= c.wall0 && t.y <= c.wall1), `${t.kind} is growing on a cliff face`);
  assert.ok(plan.things.length > 80, `only ${plan.things.length} things were placed`);
  assert.ok(new Set(plan.things.map((t) => t.kind)).size >= 6, 'a mix of things');
  for (const t of plan.things) {
    assert.ok(t.x >= 0 && t.x < plan.w && t.y >= 0 && t.y < plan.h, `${t.kind} is off the map`);
    for (const s of stops) {
      const onTile = Math.abs(t.x * 3 - s.x) < 22 && Math.abs(t.y * 3 - s.y) < 22;
      assert.ok(!onTile, `${t.kind} is on a stop`);
      // Anything with height stays out of the space above a stop, where characters stand.
      if (!plan.loose.has(t.kind)) assert.ok(!(Math.abs(t.x * 3 - s.x) < 40 && t.y * 3 > s.y - 70 && t.y * 3 < s.y + 30), `${t.kind} is where characters stand`);
    }
    for (const line of trails) for (const pt of line) assert.ok(Math.hypot(t.x * 3 - pt.x, t.y * 3 - pt.y) > 8, `${t.kind} is on a trail`);
    assert.ok(t.y * 3 > 46, `${t.kind} is under the stage signs`);
  }
  assert.deepEqual(planOverworld({ width: 1200, height: 540, stops, trails, stages, terraces }).things, plan.things, 'the same picture every time');
  assert.equal(landFor(0), 'camp');
  assert.equal(landFor(6), 'snow');
  assert.equal(landFor(12), landFor(0), 'extra stages go round again');
  assert.equal(plan.things.filter((t) => t.kind === 'tent').length, 2, 'the camp at the start');
});

test('the 3D map\'s land: roads climb ramps onto mesas, and never have to jump a cliff', async () => {
  const { buildHeights, cliffAt } = await import('../js/game/terrain.js');
  const w = 200;
  const h = 120;
  const mesa = { x0: 80, x1: 140, y0: 20, y1: 50, height: 150, ramp: 26 };
  const pit = { x0: 80, x1: 140, y0: 80, y1: 110, height: -60, ramp: 26 };
  const H = buildHeights({ w, h, terraces: [mesa, pit], bumps: [{ kind: 'peak', x: 20, y: 60 }, { kind: 'pyramid', x: 180, y: 60 }] });
  const at = (x, y) => H[y * w + x];
  assert.ok(at(110, 35) > 140, 'the mesa is up');
  assert.ok(at(110, 95) < -45, 'the canyon is down');
  assert.ok(Math.abs(at(30, 20)) < 12 && Math.abs(at(110, 65)) < 12, 'ordinary ground is near level');
  // Walking along the lane onto the mesa is a steady climb with no step bigger than a stride.
  let last = at(50, 35);
  for (let x = 51; x <= 85; x++) { const now = at(x, 35); assert.ok(now >= last - 0.5 && now - last < 14, `a step of ${(now - last).toFixed(1)} at x ${x}`); last = now; }
  // Once the road is on top, the front of the mesa is a cliff facing the viewer.
  assert.ok(Math.max(...[48, 49, 50, 51, 52].map((y) => cliffAt(H, w, h, 110, y))) > 30, 'a cliff along the front');
  // Half way up the ramp, the side is a slope, not a wall.
  assert.ok(Math.max(...Array.from({ length: 40 }, (_, k) => Math.abs(cliffAt(H, w, h, 67, 15 + k)))) < 16, 'no wall beside the ramp');
  assert.ok(at(20, 60) > 130 && at(20, 60) > at(26, 60) && at(26, 60) > at(33, 60), 'a mountain rises to a point');
  assert.ok(at(180, 60) > 75 && Math.abs(at(174, 60) - at(180, 54)) < 0.01, 'a pyramid has flat, matching faces');
  // Rolling hills stay off the trail: calm ground is level, and the open land is not.
  const calm = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) calm[60 * w + x] = 1;
  const hilly = buildHeights({ w, h, calm, hills: 40 });
  const plain = buildHeights({ w, h });
  let onTrail = 0;
  let offTrail = 0;
  for (let x = 0; x < w; x++) { onTrail = Math.max(onTrail, Math.abs(hilly[60 * w + x] - plain[60 * w + x]), Math.abs(hilly[63 * w + x] - plain[63 * w + x])); offTrail = Math.max(offTrail, hilly[10 * w + x] - plain[10 * w + x]); }
  assert.ok(onTrail < 0.01, `the trail moved by ${onTrail}`);
  assert.ok(offTrail > 18, `the hills are only ${offTrail.toFixed(1)} tall`);
  assert.deepEqual([...buildHeights({ w, h, calm, hills: 40 })], [...hilly], 'the same hills every time');
  // Built from blocks: every block is one height, a whole number of steps.
  const blocky = buildHeights({ w, h, terraces: [mesa], calm, hills: 40, step: 12, block: 4 });
  for (let i = 0; i < blocky.length; i += 37) assert.ok(blocky[i] % 12 === 0);
  assert.equal(blocky[32 * w + 108], blocky[35 * w + 111], 'one block, one height');
  assert.ok(blocky[35 * w + 110] >= 144, 'the mesa is still up');
  // A castle is laid block by block: corner towers, a gate in the front wall, and the keep tallest.
  const { CASTLE } = await import('../js/game/terrain.js');
  const fort = buildHeights({ w, h, bumps: [{ kind: 'castle', x: 40, y: 40 }, { kind: 'tower', x: 120, y: 60 }], step: 12, block: 4 });
  const blockAt = (i, j) => fort[(40 + j * 4 + 1) * w + 40 + i * 4 + 1] / 12;
  assert.equal(blockAt(0, 0), 9);
  assert.equal(blockAt(CASTLE - 1, CASTLE - 1), 9);
  assert.equal(blockAt(3, 3), 12, 'the keep');
  assert.equal(blockAt(3, CASTLE - 1), 1, 'the gate');
  assert.ok(blockAt(1, 0) >= 4 && blockAt(1, 0) <= 5 && blockAt(1, 0) !== blockAt(2, 0), 'battlements go up and down');
  assert.equal(fort[61 * w + 121] / 12, 8, 'a watchtower');
  // A lookout a trail walks straight up: its near edge is a slope.
  const soft = buildHeights({ w, h, terraces: [{ ...mesa, soft: true }] });
  assert.ok(Math.max(...Array.from({ length: 60 }, (_, k) => soft[(30 + k) * w + 110] - soft[(31 + k) * w + 110])) < 12, 'a soft edge has no cliff');
});

test('every lesson stop on the 3D map gets a building that suits its road and land', async () => {
  // stops.js draws with a canvas, so only its choosing rule is checked here.
  const src = (await import('node:fs')).readFileSync(new URL('../js/game/stops.js', import.meta.url), 'utf8');
  const { stopKind } = await import('../js/game/stops.js');
  const drawn = new Set([...src.matchAll(/^  (\w+): \(p\) =>/gm)].map((m) => m[1]));
  const lands = ['camp', 'forest', 'lake', 'autumn', 'highland', 'snow', 'alpine', 'grove', 'crystal', 'dusk', 'desert', 'somewhere new'];
  for (const land of lands) for (const lane of [-1.5, -0.5, 0, 0.5, 1.5]) for (let k = 0; k < 6; k++) {
    assert.ok(drawn.has(stopKind({ lane, land, k })), `${land} lane ${lane} stop ${k} has no drawing`);
  }
  assert.equal(stopKind({ lane: 1.5, land: 'forest', k: 0 }), 'cave', 'the lowest road is caves');
  assert.ok(['castle', 'tower'].includes(stopKind({ lane: -1.5, land: 'forest', k: 0 })), 'the highest road is castles and towers');
  assert.notEqual(stopKind({ lane: -1.5, land: 'forest', k: 0 }), stopKind({ lane: -1.5, land: 'forest', k: 1 }), 'neighbours differ');
  assert.equal(stopKind({ lane: 0, land: 'camp', k: 0 }), 'tent');
  assert.equal(stopKind({ lane: 0, land: 'snow', k: 1, summit: true }), 'shrine', 'the Summit is special');
});

test('every Classroom assignment describes its stop on the trail and quotes its standards exactly', async () => {
  const { lessonSlots, slotStandards, lessonForStop, DESCRIPTION_MAX } = await import('../js/curriculum/classroom.js');
  const slots = lessonSlots();
  const core = slots.filter((s) => !s.beyond).length;
  assert.ok(core >= 10 && core <= 15);
  assert.deepEqual(slots.map((s) => s.key), slots.map((_, i) => `L${i + 1}`));
  for (const slot of slots) {
    const text = slot.description;
    const where = `${slot.key} (${slot.title})`;
    assert.ok(text.length > 300 && text.length < DESCRIPTION_MAX, `${where}: ${text.length} characters`);
    assert.ok(!/undefined|null|NaN|\[object/.test(text), `${where}: something was left blank`);
    assert.ok(!/[<>]/.test(text), `${where}: the server would strip this`);
    assert.ok(text.startsWith(`Pixel Trail · ${slot.stage} · Lesson ${slot.n}`), `${where}: says where it is on the trail`);
    assert.equal(text.includes(`of ${core}`), !slot.beyond, `${where}: core lessons count toward the ${core}`);
    assert.ok(text.includes('Press "Submit lesson"'), `${where}: says how to hand it in`);
    // Every lesson at the stop is named, with its own hook.
    for (const id of slot.ids) { const l = getLesson(id); assert.ok(text.includes(l.title) && text.includes(l.hook), `${where}: ${id} is described`); }
    assert.equal(text.includes('Do the one on your road.'), slot.ids.length > 1, where);
    // Every standard any lesson here addresses is listed, word for word, and no others.
    const want = new Set(slot.ids.flatMap((id) => [...(ALIGNMENT[id]?.anchor || []), ...(ALIGNMENT[id]?.support || [])]));
    const listed = slotStandards(slot);
    assert.deepEqual(new Set(listed.map((s) => s.code)), want, `${where}: its standards`);
    for (const s of listed) {
      const official = STANDARDS.find((x) => x.code === s.code).text;
      assert.ok(text.includes(`${s.code}`) && text.includes(official), `${where}: ${s.code} is quoted exactly`);
      assert.equal(s.assessed, slot.ids.some((id) => (ALIGNMENT[id]?.anchor || []).includes(s.code)), `${where}: ${s.code} assessed or practiced`);
      // At a fork, each road is named under what it really does with the standard: never both, never neither.
      if (slot.ids.length > 1) slot.ids.forEach((id, k) => {
        const road = PATHS[PATH_IDS[k]].road;
        const anchors = (ALIGNMENT[id]?.anchor || []).includes(s.code);
        const supports = (ALIGNMENT[id]?.support || []).includes(s.code);
        assert.equal(s.roads.includes(road), anchors, `${where}: ${s.code} assessed on ${road}`);
        assert.equal(s.practiced.includes(road), supports && !anchors, `${where}: ${s.code} practiced on ${road}`);
      });
      else assert.deepEqual([s.roads, s.practiced], [[], []]);
    }
    assert.equal(text.includes('Massachusetts Digital Literacy and Computer Science standards'), want.size > 0, where);
  }
  // A link opens the lesson on the student's own road, or nothing if they have no road yet.
  const fork = slots.find((s) => s.ids.length > 1);
  PATH_IDS.forEach((p, k) => assert.equal(lessonForStop(fork.key, p), fork.ids[k]));
  assert.equal(lessonForStop(fork.key, null), null);
  assert.equal(lessonForStop('L1', null), 't1');
  assert.equal(lessonForStop('L999', 'arcade'), null);
  assert.equal(lessonForStop('<script>', 'arcade'), null);
});

test('no two animations in the stylesheet share a name', async () => {
  const { readFileSync } = await import('node:fs');
  // A later one silently replaces an earlier one. That once sent the character on the character page sliding off its stage.
  const names = [...readFileSync(new URL('../css/app.css', import.meta.url), 'utf8').matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
});

// The "Today" card ----------------------------------------------------------------------------------
test('every lesson says what it builds and defines a few key ideas, briefly', async () => {
  const { todayFor, todayLessons } = await import('../js/curriculum/today.js');
  const camp = [...STAGES.find((s) => s.id === 'camp').lessons, ...SIDE_TRAILS.map((t) => t.id)];
  for (const id of camp) assert.ok(todayFor(id), `${id} has a Today entry`);
  for (const l of allLessons()) assert.ok(todayFor(l.id), `${l.id} has a Today entry`);
  const words = (t) => t.trim().split(/\s+/).length;
  for (const id of todayLessons()) {
    assert.ok(getLesson(id), `${id} is a real lesson`);
    const { build, ideas } = todayFor(id);
    assert.ok(words(build) <= 18 && /[.!]$/.test(build), `${id}: say what is built in one short sentence`);
    assert.ok(ideas.length >= 2 && ideas.length <= 5, `${id}: two to five key ideas, not ${ideas.length}`);
    assert.equal(new Set(ideas.map((x) => x.term)).size, ideas.length, `${id}: an idea is listed twice`);
    for (const x of ideas) {
      assert.ok(x.term && words(x.term) <= 4, `${id}: "${x.term}" is not a short term`);
      assert.ok(words(x.means) <= 20, `${id}: "${x.term}" takes ${words(x.means)} words to explain`);
    }
  }
  assert.equal(todayFor('zz9'), null);
});

test('lesson 1 teaches where code lives before asking for any code, and checks it', () => {
  const t1 = getLesson('t1');
  const braces = t1.steps.findIndex((s) => s.title === 'Where your code lives');
  const firstCode = t1.steps.findIndex((s) => s.code || s.edits);
  assert.ok(braces >= 0 && braces < firstCode, 'the braces step comes before the first line students add');
  const brief = briefOf(t1.steps[braces]).brief;
  assert.match(brief, /\{/, 'the instruction students see names the opening brace');
  assert.match(brief, /\}/, 'and the closing one');
  assert.match(brief, /between/);
  assert.ok(checksFor('t1').filter((q) => q.after === braces).length >= 2, 'two check questions follow it');
});

test('a "read first" question sits on a step that shows code to add', () => {
  let found = 0;
  for (const l of allLessons()) {
    const firsts = checksFor(l.id).filter((q) => q.before);
    found += firsts.length;
    const seen = new Set();
    for (const q of firsts) {
      const step = l.steps[q.after];
      assert.ok(step, `${l.id}: "${q.q}" names a step that exists`);
      const shown = shownCode(step);
      assert.ok(typeof shown === 'string' && !step.reveal && !step.skeleton, `${l.id}: "${q.q}" is on a step whose code is shown`);
      assert.ok(q.code, `${l.id}: "${q.q}" shows a line to read`);
      assert.ok(!seen.has(q.after), `${l.id}: only one read-first question per step`);
      seen.add(q.after);
    }
  }
  assert.ok(found >= 30, 'read-first questions are used across the roads');
});

test('a step that says to add code shows that code', () => {
  for (const l of allLessons()) for (const s of l.steps) {
    if (s.edits && !s.reveal && !s.skeleton) assert.equal(typeof shownCode(s), 'string', `${l.id} / ${s.title} shows its code`);
  }
});

test('every lesson carries its idea outside the lesson, in a question and in the reflection', () => {
  for (const l of allLessons()) {
    assert.match(l.reflect, /outside this lesson|in a game you play/, `${l.id}: the reflection asks where else the idea is useful`);
    const last = checksFor(l.id).filter((q) => q.after === l.steps.length - 1);
    assert.ok(last.length >= 1, `${l.id}: a closing question puts the idea in another setting`);
  }
});
