// Run with: npm test
// Every lesson must build into working code that passes its own checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATH_IDS, STAGES, SIDE_TRAILS, sequence, coreSequence, mapLayout, previousGameLesson } from '../js/curriculum/graph.js';
import { ALIGNMENT } from '../js/curriculum/alignment.js';
import { checksFor } from '../js/curriculum/checks.js';
import { recentAchievements } from '../js/game/rules.js';
import { paceAlerts_, isCoreLesson_, weekdaysBetween_ } from '../js/game/pace.js';
import { STANDARDS } from '../js/curriculum/standards.js';
import { attribute_, lineShares_, matchLines_ } from '../js/game/blame.js';
import { installSynth, cleanSong, songCode } from '../js/game/synth.js';
import { buildWorld, place, isSolid, BOX } from '../js/game/world.js';
import { allLessons, buildSolution, buildThrough, applySkeleton, stepPasses, checkSummary, getLesson, stripComments, fallbackStarter, briefOf, filesThrough } from '../js/curriculum/engine.js';

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

test('stripComments ignores commented code but keeps strings', () => {
  assert.equal(stripComments('a // b\nc').trim(), 'a \nc'.trim());
  assert.equal(stripComments('"// keep"'), '"// keep"');
  assert.equal(stripComments('x /* gone */ y'), 'x  y');
});
