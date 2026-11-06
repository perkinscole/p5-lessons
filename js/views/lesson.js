// The workspace: lesson steps on the left, code in the middle, the running game on the right.
import { h, clear, md, toast, attempt, modal, debounce, confirmBox } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson, stepPasses, checkSummary, buildSolution, fallbackStarter, rubricFor } from '../curriculum/engine.js';
import { PATHS, previousGameLesson, sequence, stageOf, currentLesson } from '../curriculum/graph.js';
import { createPlayer } from '../sandbox.js';
import { loadMe, badgeChip } from './student.js';
import { statsFor, XP, isDone } from '../game/rules.js';
import { openSpritePicker } from './sprites.js';

export function makeEditor(parent, value, opts = {}) {
  return window.CodeMirror(parent, {
    value, mode: 'javascript', lineNumbers: true, indentUnit: 2, tabSize: 2, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
    extraKeys: {
      Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('  ')),
      'Shift-Tab': (cm) => cm.indentSelection('subtract'),
      'Cmd-/': 'toggleComment', 'Ctrl-/': 'toggleComment',
      'Cmd-Enter': () => opts.onRun && opts.onRun(), 'Ctrl-Enter': () => opts.onRun && opts.onRun(),
    },
    ...opts.cm,
  });
}

export async function viewLesson(main, id, previewPath) {
  const lesson = getLesson(id);
  if (!lesson) throw new Error('That lesson does not exist.');
  const isStudent = app.session.role === 'student';
  let me = null;
  let work = null;
  let path = previewPath || lesson.path || 'platformer';
  let code;
  let assets = {};

  if (isStudent) {
    me = await loadMe();
    path = me.student.path;
    const roadOrder = sequence(path);
    if (!roadOrder.includes(id)) { go(me.done.has('t6') && !path ? '/road' : '/'); return null; }
    const current = currentLesson(path, me.done);
    if (!me.done.has(id) && id !== current) { toast('Finish the lesson before this one first.'); go('/map'); return null; }
    work = me.works.find((w) => w.lesson_id === id) || null;
    if (work) {
      code = work.code;
      assets = work.assets || {};
    } else {
      // Carry the student's own game forward from their last game lesson.
      const prevId = previousGameLesson(id, path);
      const prevWork = prevId && me.works.find((w) => w.lesson_id === prevId);
      code = prevWork ? prevWork.code : fallbackStarter(lesson, prevId, path);
      assets = prevWork ? prevWork.assets || {} : {};
    }
  } else {
    code = fallbackStarter(lesson, previousGameLesson(id, path), path);
  }

  const readOnly = isStudent && work?.status === 'approved';
  const preview = !isStudent;
  let stepIndex = 0;
  let stretchDone = work?.stretch_done || 0;
  let dirty = false;
  const status = h('span.save-state', { 'aria-live': 'polite' }, preview ? 'Teacher preview: nothing is saved' : readOnly ? 'Approved: read only' : 'All saved');

  // Run panel -----------------------------------------------------------------------------------
  const consoleBox = h('div.console', { 'aria-live': 'polite' }, h('span.muted', 'Press Run to see your code work.'));
  const logLine = (el) => { consoleBox.append(el); consoleBox.scrollTop = consoleBox.scrollHeight; };
  let errorMark = null;
  const player = createPlayer((ev) => {
    if (ev.type === 'error') {
      logLine(h('div.err', ev.line && h('button.linejump', { onclick: () => { cm.setCursor(ev.line - 1, 0); cm.focus(); } }, `Line ${ev.line}`), ' ', md(ev.message)));
      if (ev.line) {
        if (errorMark !== null) cm.removeLineClass(errorMark, 'background', 'error-line');
        errorMark = ev.line - 1;
        cm.addLineClass(errorMark, 'background', 'error-line');
      }
    } else if (ev.type === 'log') logLine(h('div.log', ev.message));
    else if (ev.type === 'warn') logLine(h('div.warn', ev.message));
  });
  const run = () => {
    if (errorMark !== null) { cm.removeLineClass(errorMark, 'background', 'error-line'); errorMark = null; }
    clear(consoleBox);
    player.run(cm.getValue(), assets);
  };

  // Editor --------------------------------------------------------------------------------------
  const editorHost = h('div.editor-host');
  const cm = makeEditor(editorHost, code, { onRun: run, cm: { readOnly } });

  const persist = async () => {
    if (preview || readOnly) return;
    const src = cm.getValue();
    const c = checkSummary(lesson, src);
    try {
      work = await app.store.saveWork(id, { code: src, assets, stretch_done: stretchDone, reflection: reflect.value, checks_passed: c.passed, checks_total: c.total, auto_ok: c.passed === c.total });
      dirty = false;
      status.textContent = 'All saved';
      status.classList.remove('bad');
    } catch (e) {
      status.textContent = "Couldn't save. Check your connection.";
      status.classList.add('bad');
      console.error(e);
    }
  };
  const saveSoon = debounce(persist, 1500);
  const markDirty = () => {
    if (preview || readOnly) return;
    dirty = true;
    status.textContent = 'Saving...';
    saveSoon();
  };

  // Steps ---------------------------------------------------------------------------------------
  const stepBox = h('div.step-body');
  const dots = h('ol.step-dots');
  const reflect = h('textarea', { rows: 3, value: work?.reflection || '', readOnly, oninput: markDirty, 'aria-label': 'Your reflection' });
  const progress = () => lesson.steps.map((s) => stepPasses(s, cm.getValue()));

  const drawDots = () => {
    const results = progress();
    clear(dots);
    lesson.steps.forEach((s, i) => {
      const state = s.check ? (results[i] ? 'ok' : '') : 'read';
      dots.append(h('li', h('button', { class: `${state} ${i === stepIndex ? 'on' : ''}`, 'aria-label': `Step ${i + 1}: ${s.title}${s.check && results[i] ? ', passing' : ''}`, 'aria-current': i === stepIndex ? 'step' : null, title: s.title, onclick: () => { stepIndex = i; drawStep(); } }, s.check && results[i] ? '✓' : i + 1)));
    });
    dots.append(h('li', h('button', { class: `${stepIndex === lesson.steps.length ? 'on' : ''} finish`, 'aria-label': 'Finish', title: 'Finish', onclick: () => { stepIndex = lesson.steps.length; drawStep(); } }, '★')));
  };

  const finishPane = () => {
    const c = checkSummary(lesson, cm.getValue());
    const boxes = lesson.stretch.map((g, i) => h('label.check', h('input', {
      type: 'checkbox', checked: i < stretchDone, disabled: readOnly,
      onchange: (e) => { stretchDone += e.target.checked ? 1 : -1; stretchDone = Math.max(0, Math.min(3, stretchDone)); markDirty(); },
    }), md(g)));
    return h('div.stack',
      h('h2', 'Finish up'),
      h('h3', `Stretch goals (+${XP.stretch} XP each)`),
      h('p.muted.small', 'Done early? Pick one. These are how your game becomes really yours.'),
      h('div.stretches', boxes),
      h('h3', 'Think about it'),
      md(lesson.reflect),
      reflect,
      !preview && h('p', c.passed === c.total ? h('span.ok', `All ${c.total} checks pass.`) : h('span.warn', `${c.passed} of ${c.total} checks pass.`)),
      !preview && !readOnly && h('button.btn.primary.big', { onclick: submit }, work && isDone(work) ? 'Submit again' : 'Submit lesson'),
    );
  };

  const drawStep = () => {
    drawDots();
    clear(stepBox);
    if (stepIndex >= lesson.steps.length) { stepBox.append(finishPane()); return; }
    const s = lesson.steps[stepIndex];
    const passing = s.check && stepPasses(s, cm.getValue());
    const display = s.show !== undefined ? s.show : s.code;
    const codeBlock = display !== undefined && h('pre.snippet', h('code', display.replace(/^\n+/, '').replace(/\n+$/, '')));
    let revealArea = codeBlock;
    if (codeBlock && s.reveal) {
      revealArea = h('div', h('button.btn', { onclick: (e) => e.target.replaceWith(codeBlock) }, 'Stuck? Show me an example'));
    }
    stepBox.append(...[
      h('p.eyebrow', `Step ${stepIndex + 1} of ${lesson.steps.length} · ${s.mins} min`),
      h('h2', s.title),
      md(s.say),
      revealArea || '',
      s.action === 'sprites' && h('button.btn.primary', { onclick: openPicker }, 'Open Sprites'),
      s.action === 'share' && h('button.btn.primary', { onclick: toggleShare }, 'Share to Arcade'),
      s.hint && !passing && h('details.hint', h('summary', 'Hint'), md(s.hint)),
      s.check && h('p.step-check', { class: passing ? 'ok' : 'wait' }, passing ? '✓ The check for this step passes.' : 'Not passing yet. Make the change in your code.'),
      h('div.row.step-nav',
        stepIndex > 0 && h('button.btn', { onclick: () => { stepIndex--; drawStep(); } }, 'Back'),
        h('button.btn.primary', { onclick: () => { stepIndex++; drawStep(); run(); } }, 'Next step'),
      ),
    ].filter(Boolean));
  };

  // Actions ---------------------------------------------------------------------------------------
  const openPicker = () => openSpritePicker({
    project: assets,
    suggestedName: lesson.steps.some((s) => s.action === 'sprites') ? 'hero' : '',
    onChange: (next) => { assets = next; markDirty(); run(); },
  });

  const toggleShare = async () => {
    if (preview) { toast('Students share from here.'); return; }
    await persist();
    const next = !work?.shared;
    const ok = await attempt(async () => { await app.store.setShared(id, next); return true; });
    if (ok) {
      work = { ...work, shared: next };
      toast(next ? 'Your game is in the Arcade!' : 'Removed from the Arcade.');
      drawHead();
    }
  };

  async function submit() {
    const c = checkSummary(lesson, cm.getValue());
    if (c.passed < c.total) {
      const sure = await confirmBox('Some checks are not passing', `${c.passed} of ${c.total} checks pass. Your teacher will see that. Sometimes the checker misses a different but correct way of doing things, so you can still submit if you think it works.`, 'Submit anyway');
      if (!sure) return;
    }
    saveSoon.cancel();
    const before = statsFor({ ...me.row, path, works: me.row.works });
    const saved = await attempt(() => app.store.submitWork(id, { code: cm.getValue(), assets, stretch_done: stretchDone, reflection: reflect.value, checks_passed: c.passed, checks_total: c.total, auto_ok: c.passed === c.total }));
    if (!saved) return;
    work = saved;
    dirty = false;
    me = await loadMe();
    celebrate(before, me.stats);
  }

  function celebrate(before, after) {
    const newBadges = after.badges.filter((b) => !before.badges.includes(b));
    const rankedUp = after.rankIndex > before.rankIndex;
    const nextId = currentLesson(path, me.done);
    modal((close) => h('div.stack.celebrate',
      h('p.eyebrow', 'Lesson submitted'),
      h('h2', `+${after.xp - before.xp} XP`),
      rankedUp && h('p.rankup', `You are now a ${after.rank.name}!`),
      newBadges.length > 0 && h('div.stack', h('h3', 'New badge!'), h('div.badges', newBadges.map((b) => badgeChip(b)))),
      h('div.row.end',
        h('a.btn', { href: '#/map', onclick: close }, 'See the map'),
        nextId
          ? h('a.btn.primary', { href: `#/${!path && me.done.has('t6') ? 'road' : `lesson/${nextId}`}`, onclick: close }, 'Next lesson')
          : (!path ? h('a.btn.primary', { href: '#/road', onclick: close }, 'Choose your road') : h('a.btn.primary', { href: '#/arcade', onclick: close }, 'Open the Arcade')),
      ),
    ));
  }

  const head = h('header.lesson-head');
  const drawHead = () => {
    const stage = stageOf(id);
    clear(head).append(
      h('div.lesson-title',
        h('p.eyebrow', stage.name, lesson.path ? ` · ${PATHS[lesson.path].road}` : '', ` · ${lesson.mins} minutes`),
        h('h1', lesson.title),
      ),
      h('div.row.lesson-actions',
        status,
        h('button.btn', { onclick: openPicker }, 'Sprites'),
        isStudent && !readOnly && h('button.btn', { onclick: toggleShare }, work?.shared ? 'In the Arcade ✓' : 'Share to Arcade'),
        preview && h('select.path-pick', { 'aria-label': 'Road to preview', onchange: (e) => go(`/lesson/${id}/${e.target.value}`) }, Object.values(PATHS).map((p) => h('option', { value: p.id, selected: p.id === path }, p.road))),
        preview && h('button.btn', { onclick: () => { cm.setValue(buildSolution(id, path)); run(); toast('Showing the answer key.'); } }, 'Show answer key'),
        h('button.btn.run', { onclick: run, title: 'Cmd or Ctrl + Enter' }, '▶ Run'),
      ),
    );
  };

  drawHead();
  drawStep();

  const onChange = debounce(() => { drawDots(); if (stepIndex < lesson.steps.length) { const el = stepBox.querySelector('.step-check'); const s = lesson.steps[stepIndex]; if (el && s.check) { const ok = stepPasses(s, cm.getValue()); el.className = `step-check ${ok ? 'ok' : 'wait'}`; el.textContent = ok ? '✓ The check for this step passes.' : 'Not passing yet. Make the change in your code.'; } } }, 350);
  cm.on('change', () => { markDirty(); onChange(); });

  const feedback = work?.grade?.feedback || (work?.status === 'returned');
  const page = h('div.workspace',
    head,
    work?.status === 'returned' && h('div.returned', h('strong', 'Your teacher asked for changes. '), work.grade?.feedback || ''),
    work?.status === 'approved' && feedback && h('div.approved', h('strong', 'Approved! '), work.grade?.feedback || '', work.grade ? ` Score: ${work.grade.total} of ${work.grade.max_total}.` : ''),
    h('div.panes',
      h('aside.steps',
        h('details.hook', { open: stepIndex === 0 }, h('summary', 'Why this lesson?'), h('p', lesson.hook), h('p.concepts', lesson.concepts.map((c) => h('span.tag', c)))),
        dots,
        stepBox,
      ),
      h('section.code-pane', { 'aria-label': 'Code editor' }, editorHost),
      h('section.game-pane', { 'aria-label': 'Your game' },
        h('div.game-frame', player.el),
        h('p.muted.small', 'Click the game so it can hear your keyboard.'),
        consoleBox,
      ),
    ),
  );

  clear(main).append(page);
  document.body.classList.add('in-workspace');
  cm.refresh();
  run();

  const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  app.cleanup = async () => {
    window.removeEventListener('beforeunload', beforeUnload);
    document.body.classList.remove('in-workspace');
    saveSoon.cancel();
    if (dirty) await persist();
    player.destroy();
  };
  return null;
}

export { rubricFor };
