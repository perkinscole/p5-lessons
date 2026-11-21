// The workspace: lesson steps on the left, code in the middle, the running game on the right.
import { h, clear, md, toast, attempt, modal, debounce, confirmBox } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson, stepPasses, checkSummary, buildSolution, buildThrough, fallbackStarter, rubricFor, applySkeleton, briefOf, filesThrough, placeFor, shownCode } from '../curriculum/engine.js';
import { checksFor } from '../curriculum/checks.js';
import { explainError, warnings } from '../game/debug.js';
import { ratingBox, confusingButton, helpBox } from './feedback.js';
import { chime, sparkle, pop, countUp, markCelebrated, correct, incorrect, splash, popBadge, popRank, flyXP, gainXP } from '../celebrate.js';
import { PATHS, PATH_IDS, previousGameLesson, sequence, stageOf, currentLesson, isSideTrail, sideTrailOpen, isBeyond } from '../curriculum/graph.js';
import { createPlayer } from '../sandbox.js';
import { todayFor } from '../curriculum/today.js';
import { openBugReport } from './bugs.js';
import { loadMe, badgeChip } from './student.js';
import { statsFor, XP, isDone } from '../game/rules.js';
import { openSpritePicker } from './sprites.js';
import { openSoundPicker, openMusicMaker } from './sounds.js';
import { reviewFor } from '../curriculum/review.js';
import { onSettings, getSettings, readButton, speak, stopSpeaking } from '../settings.js';
import { alignmentFor, standardByCode } from '../curriculum/alignment.js';

/** A button named in an instruction looks like that button, so it is easy to find on the page. */
function nameButtons(el) {
  el.querySelectorAll('strong').forEach((b) => {
    const name = b.textContent.trim();
    if (name === 'Run') b.classList.add('say-run');
    if (name === 'Grid') b.classList.add('say-grid');
  });
  return el;
}

/** Code for reading, colored the way the editor colors it. */
function snippet(text) {
  const code = h('code');
  const pre = h('pre.snippet.cm-s-default', code);
  const CM = window.CodeMirror;
  if (!CM || !CM.StringStream) { code.textContent = text; return pre; }
  const mode = CM.getMode({ indentUnit: 2 }, 'javascript');
  const state = CM.startState(mode);
  text.split('\n').forEach((line, i) => {
    if (i) code.append('\n');
    const stream = new CM.StringStream(line);
    while (!stream.eol()) {
      const style = mode.token(stream, state);
      const piece = stream.current();
      stream.start = stream.pos;
      code.append(style ? h('span', { class: style.split(' ').map((c) => `cm-${c}`).join(' ') }, piece) : piece);
    }
  });
  return pre;
}

export function makeEditor(parent, value, opts = {}) {
  // Tab indents, so Esc then Tab is how keyboard users leave the editor.
  let leaving = false;
  const leaveOr = (fn) => (cm) => {
    if (leaving) { leaving = false; return window.CodeMirror.Pass; }
    return fn(cm);
  };
  const cm = window.CodeMirror(parent, {
    value, mode: 'javascript', lineNumbers: true, indentUnit: 2, tabSize: 2, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
    extraKeys: {
      Tab: leaveOr((c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  '))),
      'Shift-Tab': leaveOr((c) => c.indentSelection('subtract')),
      Esc: () => { leaving = true; },
      'Cmd-/': 'toggleComment', 'Ctrl-/': 'toggleComment',
      'Cmd-Enter': () => opts.onRun && opts.onRun(), 'Ctrl-Enter': () => opts.onRun && opts.onRun(),
    },
    ...opts.cm,
  });
  cm.getInputField().setAttribute('aria-label', 'Code editor. Press Escape, then Tab, to leave the editor.');
  cm.getScrollerElement().setAttribute('tabindex', '0');
  const stop = onSettings((set) => { cm.setOption('lineWrapping', set.wrap); cm.refresh(); });
  cm.stopSettings = stop;
  return cm;
}

const MAX_PROJECT = 520000;
const safeName = (name) => name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'file';

/** Shrink an uploaded picture so a project still fits in the class Sheet. */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      if (file.type === 'image/gif') { resolve(reader.result); return; }
      const img = new Image();
      img.onerror = () => reject(new Error(`${file.name} is not a picture this browser can read.`));
      img.onload = () => {
        const scale = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        const g = c.getContext('2d');
        // Small pixel art stays crisp. Photos get smoothed when they shrink.
        g.imageSmoothingEnabled = scale < 1;
        g.drawImage(img, 0, 0, c.width, c.height);
        const png = c.toDataURL('image/png');
        resolve(png.length < 120000 ? png : c.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** The standards a lesson addresses, in full. Teachers also see what to look for. */
function standardsPanel(id, isTeacher) {
  const a = alignmentFor(id);
  const group = (title, codes) => codes.length > 0 && h('div',
    h('h3', title),
    h('ul.std-list', codes.map((c) => h('li', h('strong', c.replace('6-8.', '')), ' ', standardByCode(c).text))));
  return h('details.hook', { id: 'lesson-standards' },
    h('summary', 'Standards in this lesson'),
    group(isTeacher ? 'Assess here' : 'Your work shows this', a.anchor),
    group(isTeacher ? 'Practiced here' : 'You practice this', a.support),
    isTeacher && h('p.small', h('strong', 'Evidence: '), a.evidence));
}

/** Short standard codes under the lesson title. Solid codes are assessed here. */
function standardChips(id, panel) {
  const a = alignmentFor(id);
  const chip = (code, cls, kind) => h(`button.std${cls}`, {
    type: 'button',
    title: `${kind}: ${standardByCode(code).text}`,
    onclick: () => { panel.open = true; panel.scrollIntoView({ block: 'nearest' }); },
  }, code.replace('6-8.', ''));
  return h('p.std-codes', h('a.std-link', { href: '#/standards' }, 'MA DLCS'), a.anchor.map((c) => chip(c, '.anchor', 'Assessed here')), a.support.map((c) => chip(c, '', 'Practiced here')));
}

export async function viewLesson(main, id, previewPath) {
  const lesson = getLesson(id);
  if (!lesson) throw new Error('That lesson does not exist.');
  const isStudent = app.session.role === 'student';
  let me = null;
  let work = null;
  let team = null;
  let myFlags = new Map(); // steps and questions this student marked as confusing
  let helpOpen = false;
  let path = previewPath || lesson.path || 'platformer';
  let code;
  let assets = {};
  let startFiles = {};

  if (isStudent) {
    let flagList;
    let helpNow;
    // This page uses the code of this lesson and of the one it continues from, on any road.
    const needCode = [...new Set([id, ...PATH_IDS.map((p) => previousGameLesson(id, p))].filter(Boolean))];
    [me, team, flagList, helpNow] = await Promise.all([loadMe(needCode), app.store.teamFor(id, Object.fromEntries(PATH_IDS.map((p) => [p, previousGameLesson(id, p)])), {}),
      app.store.myFlags(id).catch(() => []), app.store.myHelp().catch(() => ({ open: false }))]);
    myFlags = new Map(flagList.map((f) => [f.target, f.reason]));
    helpOpen = !!helpNow.open;
    path = me.student.path;
    const roadOrder = sequence(path);
    if (team) {
      // The teacher put this student in a group for this lesson, so it is open to them.
    } else if (isSideTrail(id)) {
      if (!sideTrailOpen(id, me.done)) { toast('This side trail opens after the lesson before it.'); go('/map'); return null; }
    } else {
      if (!roadOrder.includes(id)) { go(me.done.has('t6') && !path ? '/road' : '/'); return null; }
      const current = currentLesson(path, me.done);
      if (!me.done.has(id) && id !== current) { toast('Finish the lesson before this one first.'); go('/map'); return null; }
    }
    work = me.works.find((w) => w.lesson_id === id) || null;
    // Never open the editor on a lesson whose code did not arrive: an empty editor would be saved over real work.
    if (me.works.some((w) => needCode.includes(w.lesson_id) && w.full === false)) throw new Error('Your code did not load. Reload the page to try again.');
    if (work) {
      code = work.code;
      assets = work.assets || {};
      startFiles = work.files || {};
    } else {
      // Carry the student's own game forward from their last game lesson.
      const prevId = previousGameLesson(id, path);
      const prevWork = prevId && me.works.find((w) => w.lesson_id === prevId);
      code = prevWork ? prevWork.code : fallbackStarter(lesson, prevId, path);
      startFiles = prevWork ? prevWork.files || {} : (prevId ? filesThrough(prevId, path) : {});
      assets = prevWork ? prevWork.assets || {} : {};
    }
    if (team && team.doc) {
      code = team.doc.code;
      assets = team.doc.assets || {};
      startFiles = team.doc.files || {};
    } else if (team && !work?.code) {
      const leadPath = team.lead_path || path;
      const prevId = previousGameLesson(id, leadPath);
      code = fallbackStarter(lesson, prevId, leadPath);
      startFiles = prevId ? filesThrough(prevId, leadPath) : {};
      assets = {};
    }
  } else {
    code = fallbackStarter(lesson, previousGameLesson(id, path), path);
    const prevGame = previousGameLesson(id, path);
    if (prevGame) startFiles = filesThrough(prevGame, path);
  }

  const approved = isStudent && work?.status === 'approved';
  // Group projects: each file has its own keyboard, so group members can work at the same time in
  // different files. holders says who is editing each file right now.
  let holders = (team && team.holders) || {};
  const iHold = (name) => !!team && holders[name] === me.student.id;
  const canEdit = (name) => !approved && (!team || iHold(name));
  let driving = !!team && Object.values(holders).includes(me.student.id);
  let readOnly = !canEdit('sketch.js');
  let applyingRemote = false;
  const preview = !isStudent;
  // The walkthrough: steps with short questions woven in, one screen at a time.
  const warmUp = reviewFor(id, path);
  const quizzes = [...(warmUp ? [warmUp] : []), ...checksFor(id)];
  const flow = [...(warmUp ? [{ quiz: warmUp }] : []), ...lesson.steps.flatMap((step, i) => {
    const mine = quizzes.filter((q) => q.after === i);
    // A "read first" question sits on its step's card and must be answered before the code shows.
    const ask = mine.find((q) => q.before);
    return [{ step, n: i, ask }, ...mine.filter((q) => q !== ask).map((quiz) => ({ quiz }))];
  })];
  const answered = new Set(work && work.quiz_total === quizzes.length && quizzes.length ? quizzes : []);
  let quizRight = work?.quiz_right || 0;
  let stepIndex = 0;
  // Still to answer before this step's code is shown.
  const pending = (item) => !!(item && item.ask && !preview && !answered.has(item.ask));
  // The furthest step reached is saved, so the class display can show it and the lesson reopens there.
  const stepNumberAt = (i) => {
    if (i >= flow.length) return lesson.steps.length;
    for (let k = i; k >= 0; k--) if (flow[k].step) return flow[k].n;
    return 0;
  };
  let furthest = Math.min(Number(work?.step_at) || 0, lesson.steps.length);
  if (furthest > 0) stepIndex = furthest >= lesson.steps.length ? flow.length : Math.max(0, flow.findIndex((x) => x.step && x.n === furthest));
  // Questions answered on an earlier visit stay answered, so coming back doesn't mean doing them again.
  quizzes.forEach((q, k) => {
    const own = k - (warmUp ? 1 : 0);
    if (own < 0 ? furthest > 0 : (work?.quiz_first || {})[own] !== undefined) answered.add(q);
  });
  // A student can't go past a question they haven't answered. Teachers looking at a lesson can.
  const gate = () => {
    if (preview) return flow.length;
    const at = flow.findIndex((x) => (x.quiz && !answered.has(x.quiz)) || (x.ask && !answered.has(x.ask)));
    return at < 0 ? flow.length : at;
  };
  stepIndex = Math.min(stepIndex, gate());
  // What a step asks for: something to do in the code, or only something to read.
  const kindOf = (step) => (step.check || step.code !== undefined || step.edits || step.skeleton || step.provides || step.action ? 'do' : 'read');
  let stretchDone = work?.stretch_done || 0;
  let dirty = false;
  const stdPanel = standardsPanel(id, preview);
  const status = h('span.save-state', { 'aria-live': 'polite' }, preview ? 'Teacher preview: nothing is saved' : approved ? 'Approved: read only' : 'All saved');

  // Run panel -----------------------------------------------------------------------------------
  const consoleBox = h('div.console', { 'aria-live': 'polite' }, h('span.muted', 'Press Run to see your code work.'));
  const logLine = (el) => { consoleBox.append(el); consoleBox.scrollTop = consoleBox.scrollHeight; };
  let errorMark = null;
  const player = createPlayer((ev) => {
    if (ev.type === 'error') {
      // Look at the student's own code for a clearer message and the line that's really wrong.
      const file = ev.file || MAIN;
      const doc = docFor(file);
      const better = explainError(ev.raw, doc.getValue(), ev.line);
      const line = (better && better.line) || ev.line;
      const where = line ? (file !== MAIN ? `${file}, line ${line}` : `Line ${line}`) : null;
      const lineText = line && line <= doc.lineCount() ? doc.getLine(line - 1).trim() : '';
      logLine(h('div.err',
        h('div', where && h('button.linejump', { onclick: () => { openFile(file); cm.setCursor(line - 1, 0); cm.focus(); } }, where), ' ', md(better ? better.message : ev.message)),
        lineText && h('pre.err-code', lineText)));
      if (line && line <= doc.lineCount()) {
        clearErrorMark();
        doc.addLineClass(line - 1, 'background', 'error-line');
        errorMark = { doc, line: line - 1 };
      }
    } else if (ev.type === 'log') logLine(h('div.log', ev.message));
    else if (ev.type === 'warn') logLine(h('div.warn', ev.message));
    else if (ev.type === 'status') logLine(h('div.muted', ev.message));
  });
  // The coordinate grid: lines and numbers over the game, so (x, y) is something students can see.
  let gridOn = false;
  const gridButton = h('button.btn.toggle', { type: 'button', 'aria-pressed': 'false', title: 'Show a grid with x and y numbers over your game',
    onclick: () => { gridOn = !gridOn; gridButton.setAttribute('aria-pressed', String(gridOn)); gridButton.classList.toggle('on', gridOn); player.setGrid(gridOn); } }, 'Grid', h('span.switch', { 'aria-hidden': 'true' }, h('i')));
  const run = () => {
    clearErrorMark();
    clear(consoleBox);
    for (const w of warnings(mainCode())) logLine(h('div.warn', md(w)));
    player.run(mainCode(), assets, extraFiles());
    if (dirty) { saveSoon.cancel(); persist(); } // Pressing Run also saves.
  };

  // Editor --------------------------------------------------------------------------------------
  const editorHost = h('div.editor-host');
  const cm = makeEditor(editorHost, code, { onRun: run, cm: { readOnly } });
  const MAIN = 'sketch.js';
  const mainDoc = cm.getDoc();
  const extraDocs = new Map(Object.entries(startFiles).map(([name, text]) => [name, window.CodeMirror.Doc(text, 'javascript')]));
  let activeFile = MAIN;
  const docFor = (name) => extraDocs.get(name) || mainDoc;
  const mainCode = () => mainDoc.getValue();
  const allCode = () => [mainCode(), ...[...extraDocs.values()].map((d) => d.getValue())].join('\n');
  const extraFiles = () => Object.fromEntries([...extraDocs.entries()].map(([name, d]) => [name, d.getValue()]));
  function clearErrorMark() {
    if (errorMark) errorMark.doc.removeLineClass(errorMark.line, 'background', 'error-line');
    errorMark = null;
  }
  const fileBar = h('div.file-bar');
  const teamBar = h('div.team-bar', { 'aria-live': 'polite' });
  const contribution = h('textarea', { rows: 2, value: team?.my_note || '', readOnly: approved, oninput: () => markDirty(), 'aria-label': 'What each person in your group did', placeholder: 'I wrote... My partner...' });
  const codePatch = (src) => (team && !driving ? {} : { code: src, assets, files: extraFiles() });
  const teamPatch = () => (team ? { contribution: contribution.value } : {});
  function openFile(name) {
    activeFile = extraDocs.has(name) ? name : MAIN;
    cm.swapDoc(docFor(activeFile));
    cm.setOption('mode', 'javascript');
    readOnly = !canEdit(activeFile);
    cm.setOption('readOnly', readOnly);
    drawFileBar();
    drawTeamBar();
    cm.refresh();
  }
  const projectSize = () => JSON.stringify({ code: mainCode(), assets, files: extraFiles() }).length;
  function addCodeFile(rawName, text = '') {
    const base = safeName(rawName);
    let name = `${base}.js`;
    for (let n = 2; extraDocs.has(name) || name === MAIN; n++) name = `${base}${n}.js`;
    if (extraDocs.size >= 8) { toast('A project can have up to 8 extra code files.', 'error'); return; }
    extraDocs.set(name, window.CodeMirror.Doc(text, 'javascript'));
    // A new file is yours to edit. Saving right away claims it for the group.
    if (team) { holders = { ...holders, [name]: me.student.id }; driving = true; }
    openFile(name);
    markDirty();
    if (team) { saveSoon.cancel(); persist(); }
  }
  async function addUploads(list) {
    if (approved) return;
    for (const file of list) {
      if (/\.js$/i.test(file.name)) {
        if (file.size > 100000) { toast(`${file.name} is too long to add.`, 'error'); continue; }
        addCodeFile(file.name, await file.text());
      } else if (/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
        const url = await attempt(() => readImage(file));
        if (!url) continue;
        if (projectSize() + url.length > MAX_PROJECT) { toast('This project is full. Remove an image first.', 'error'); break; }
        const base = safeName(file.name);
        let name = base;
        for (let n = 2; assets[name]; n++) name = `${base}${n}`;
        assets = { ...assets, [name]: url };
        toast(`Added ${name}. Load it with SPRITES.${name}`);
        markDirty();
      } else {
        toast(`${file.name}: add pictures (PNG, JPG, GIF, WebP) or .js code files.`, 'error');
      }
    }
    drawFileBar();
    run();
  }
  function addProvided(p) {
    if (extraDocs.has(p.name)) return;
    extraDocs.set(p.name, window.CodeMirror.Doc(p.code, 'javascript'));
    drawFileBar();
    markDirty();
    drawStep();
    run();
  }

  // Getting unstuck: go back to how this lesson began, or to a known working version.
  function cleanCopy() {
    const prevId = previousGameLesson(id, path);
    const prevWork = prevId && me?.works.find((w) => w.lesson_id === prevId);
    const working = fallbackStarter(lesson, prevId, path);
    const restore = (src, close) => {
      openFile(MAIN);
      cm.setValue(src);
      if (prevId) {
        for (const [n, t] of Object.entries(filesThrough(prevId, path))) if (!extraDocs.has(n)) extraDocs.set(n, window.CodeMirror.Doc(t, 'javascript'));
        drawFileBar();
      }
      close();
      run();
      drawStep();
      toast('Restored. Changed your mind? Press Ctrl+Z in the code.');
    };
    // The code as it should be when this step begins: every earlier step done, this one still to do.
    const doneSteps = flow.slice(0, stepIndex).filter((x) => x.step).length;
    let toHere = null;
    try { toHere = doneSteps > 0 && doneSteps < lesson.steps.length ? buildThrough(id, path, doneSteps) : null; } catch (_) { toHere = null; }
    modal((close) => h('div.stack',
      h('h2', 'Reset the code'),
      h('p', 'This only replaces the code in sketch.js. Your answers, XP, images, and place in the lesson stay.'),
      toHere && h('button.btn.primary', { onclick: () => restore(toHere, close) }, 'Reset the code to this step'),
      toHere && h('p.muted.small', 'Earlier steps are done for you. You only redo this one.'),
      prevWork && h('button.btn', { onclick: () => restore(prevWork.code, close) }, 'My code from the start of this lesson'),
      h('button.btn', { class: toHere ? '' : 'primary', onclick: () => restore(working, close) }, prevWork ? 'A fresh copy that works' : 'Code from the start of this lesson'),
      prevWork && h('p.muted.small', 'A fresh copy works, but it won\'t have your own changes.'),
      h('button.btn', { onclick: close }, 'Cancel'),
    ));
  }

  const fileInput = h('input.visually-hidden', { type: 'file', multiple: true, accept: 'image/png,image/jpeg,image/gif,image/webp,.js', 'aria-label': 'Add images or code files', onchange: (e) => { addUploads([...e.target.files]); e.target.value = ''; } });
  function newFileDialog() {
    modal((close) => {
      const input = h('input', { 'aria-label': 'File name', placeholder: 'helpers', maxlength: 30 });
      return h('form.stack', { onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) { addCodeFile(input.value.trim()); close(); } } },
        h('h2', 'New code file'), input, h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Create')));
    });
  }
  function drawFileBar() {
    const names = [MAIN, ...extraDocs.keys()];
    clear(fileBar).append(...[
      h('div.file-tabs', { 'aria-label': 'Project files' }, names.map((name) => h('div.file-tab', { class: name === activeFile ? 'on' : '' },
        h('button', { 'aria-current': name === activeFile ? 'true' : null, onclick: () => openFile(name) }, name,
          team && holders[name] && h('span.file-holder', { class: iHold(name) ? 'mine' : '' }, iHold(name) ? ' ✏️ you' : ` 🔒 ${memberName(holders[name])}`)),
        name !== MAIN && canEdit(name) && h('button.file-x', { 'aria-label': `Remove ${name}`, onclick: async () => {
          if (!(await confirmBox(`Remove ${name}?`, 'Its code will be deleted from this project.', 'Remove', true))) return;
          extraDocs.delete(name);
          openFile(MAIN);
          markDirty();
          run();
        } }, '×')))),
      Object.keys(assets).length > 0 && h('div.file-assets', Object.keys(assets).map((name) => h('button.file-asset', { title: `SPRITES.${name}`, 'aria-label': `Image ${name}`, onclick: openPicker }, h('img', { src: assets[name], alt: '' }), name))),
      !approved && h('div.file-actions',
        h('button.btn.small', { onclick: newFileDialog }, '+ Code file'),
        h('button.btn.small', { onclick: () => fileInput.click() }, '+ Images or files')),
      fileInput,
    ].filter(Boolean));
  }

  const persist = async () => {
    if (preview || approved) return;
    const src = mainCode();
    const c = checkSummary(lesson, allCode());
    try {
      work = await app.store.saveWork(id, { ...codePatch(src), ...teamPatch(), stretch_done: stretchDone, reflection: reflect.value, checks_passed: c.passed, checks_total: c.total, auto_ok: c.passed === c.total, step_at: furthest, ...quizPatch() });
      dirty = false;
      if (work.team_lost) pollTeam(); // Someone else changed the project: catch up.
      status.textContent = 'All saved';
      status.classList.remove('bad');
    } catch (e) {
      // A busy server is not the student's problem: say it calmly and keep trying.
      const busy = /busy/i.test(e.message || '');
      status.textContent = busy ? 'Saving again in a moment…' : "Couldn't save. Check your connection.";
      status.classList.toggle('bad', !busy);
      console.error(e);
      saveSoon(); // Try again, so a busy moment can't lose a student's work.
    }
  };
  // The first try on each of the lesson's own questions, for the teacher's feedback report.
  const quizFirst = { ...(work?.quiz_first || {}) };
  const ownIndex = (q) => quizzes.indexOf(q) - (warmUp ? 1 : 0);
  function quizPatch() { return { quiz_right: quizRight, quiz_total: answered.size === quizzes.length ? quizzes.length : 0, quiz_first: quizFirst }; }
  // Groups save more often, so partners see each other's work sooner.
  const saveSoon = debounce(persist, team ? Math.min(10000, app.store.saveDelay || 1500) : (app.store.saveDelay || 1500));
  const markDirty = () => {
    if (preview || approved || applyingRemote) return;
    dirty = true;
    status.textContent = 'Not saved yet';
    saveSoon();
  };

  // Steps ---------------------------------------------------------------------------------------
  const stepBox = h('div.step-body');
  const dots = h('ol.step-dots');
  const reflect = h('textarea', { rows: 3, value: work?.reflection || '', readOnly: approved, oninput: markDirty, 'aria-label': 'Your reflection' });
  const progress = () => lesson.steps.map((s) => stepPasses(s, allCode()));

  const drawDots = () => {
    const results = progress();
    const open = gate();
    const LOCKED = 'Answer the question first';
    clear(dots);
    flow.forEach((item, i) => {
      const on = i === stepIndex ? 'on' : '';
      const shut = i > open;
      const go = () => { stepIndex = i; drawStep(); };
      if (item.quiz) {
        dots.append(h('li', h('button', { class: `quiz ${answered.has(item.quiz) ? 'ok' : ''} ${on} ${i === open ? 'next-up' : ''}`, disabled: shut, 'aria-label': shut ? `Quick check, locked. ${LOCKED}` : 'Quick check', title: shut ? LOCKED : 'Quick check', 'aria-current': on ? 'step' : null, onclick: go }, answered.has(item.quiz) ? '✓' : '?')));
        return;
      }
      const passing = item.step.check && results[item.n];
      const kind = kindOf(item.step);
      dots.append(h('li', h('button', { class: `${kind} ${passing ? 'ok' : ''} ${on}`, disabled: shut, 'aria-label': `Step ${item.n + 1}: ${item.step.title}${passing ? ', done' : ''}${shut ? `, locked. ${LOCKED}` : ''}`, 'aria-current': on ? 'step' : null, title: shut ? LOCKED : item.step.title, onclick: go }, passing ? '✓' : item.n + 1)));
    });
    const shut = open < flow.length;
    dots.append(h('li', h('button', { class: `${stepIndex === flow.length ? 'on' : ''} finish`, disabled: shut, 'aria-label': shut ? `Finish, locked. ${LOCKED}` : 'Finish', title: shut ? LOCKED : 'Finish', onclick: () => { stepIndex = flow.length; drawStep(); } }, '★')));
  };

  // Right answers in a row on the first try, for a little extra cheer.
  let streak = 0;
  // The answer buttons for a question, shared by a question on its own card and one on a step.
  const quizButtons = (q, onRight) => {
    let firstTry = !answered.has(q);
    const qi = ownIndex(q);
    const feedback = h('div.quiz-feedback', { 'aria-live': 'polite' });
    const buttons = h('div.quiz-options', q.options.map((text, i) => h(`button.quiz-option.c${i % 4}`, {
      onclick: (e) => {
        if (qi >= 0 && quizFirst[qi] === undefined) { quizFirst[qi] = i === q.answer; markDirty(); }
        if (i === q.answer) {
          e.currentTarget.classList.add('right');
          streak = firstTry ? streak + 1 : 0;
          correct(e.currentTarget, streak);
          if (firstTry && !answered.has(q)) quizRight++;
          answered.add(q);
          clear(feedback).append(h('p.ok', '✓ ', md(q.why)));
          onRight();
          drawDots();
          markDirty();
        } else {
          firstTry = false;
          streak = 0;
          incorrect(e.currentTarget);
          e.currentTarget.classList.add('wrong');
          e.currentTarget.disabled = true;
          clear(feedback).append(h('p.warn', 'Not quite. Try another one.'));
        }
      },
    }, md(text))));
    return { buttons, feedback, qi };
  };
  const quizPane = (q) => {
    const nav = h('div.row.step-nav');
    const drawNav = () => clear(nav).append(...[
      stepIndex > 0 && h('button.btn', { onclick: () => { stepIndex--; drawStep(); } }, 'Back'),
      (answered.has(q) || preview) && h('button.btn.primary', { onclick: () => { stepIndex++; drawStep(); } }, 'Next'),
    ].filter(Boolean));
    drawNav();
    const { buttons, feedback, qi } = quizButtons(q, () => {
      const tag = stepBox.querySelector('.step-kind span');
      if (tag) tag.remove();
      drawNav();
    });
    return h('div.stack',
      h('p.step-kind.answer', h('b', '❓ Answer this', !answered.has(q) && !preview && h('span', ' to keep going')), h('small', 'Quick check')),
      q.review && h('p.eyebrow', 'From an earlier lesson'),
      h('div.quiz-q', h('div.read-row', md(q.q), readButton(() => `${q.q} ${q.options.map((o, i) => `Choice ${i + 1}: ${o}.`).join(' ')}`))),
      q.code && snippet(q.code),
      buttons, feedback,
      isStudent && qi >= 0 && confusingButton(id, `quiz:${qi}`, myFlags),
      nav);
  };
  // A question about a line like the one a step is about to add. The code to type stays hidden
  // until it is answered, so the line is read before it is copied.
  const readFirst = (item) => {
    const q = item.ask;
    const { buttons, feedback } = quizButtons(q, () => setTimeout(() => { if (flow[stepIndex] === item) drawStep(); }, 900));
    return h('div.read-first',
      h('p.read-first-tag', '🔎 Read it first'),
      h('div.quiz-q', h('div.read-row', md(q.q), readButton(() => `${q.q} ${q.options.map((o, i) => `Choice ${i + 1}: ${o}.`).join(' ')}`))),
      q.code && snippet(q.code),
      buttons, feedback,
      h('p.read-first-note', 'Answer to see the code to add.'));
  };

  const finishPane = () => {
    const c = checkSummary(lesson, allCode());
    const boxes = lesson.stretch.map((g, i) => h('label.check', h('input', {
      type: 'checkbox', checked: i < stretchDone, disabled: approved,
      onchange: (e) => { stretchDone += e.target.checked ? 1 : -1; stretchDone = Math.max(0, Math.min(3, stretchDone)); markDirty(); },
    }), md(g)));
    return h('div.stack',
      h('h2', 'Finish up'),
      h('div.read-row', md(lesson.reflect), readButton(() => lesson.reflect)),
      reflect,
      team && h('label.field', h('span', 'What did each person in your group do?'), contribution),
      h('details.hint', h('summary', `Done early? Stretch goals (+${XP.stretch} XP each)`), h('div.stretches', boxes)),
      !preview && c.passed < c.total && h('p.warn', `${c.passed} of ${c.total} steps done.`),
      !preview && work && isDone(work) && !submitting && h('p.submitted-note', '✓ Submitted. Your teacher can see it.'),
      !preview && submitNote && h('p.warn', { translate: 'no' }, submitNote),
      !preview && !approved && h('button.btn.primary.big', { onclick: submit, disabled: submitting }, submitting ? 'Submitting… please wait' : work && isDone(work) ? 'Submit again' : 'Submit lesson'),
    );
  };

  // Where this step's code goes, as a line number in the student's own code.
  const PLACE_TEXT = {
    after: (n) => `New line after line ${n}`,
    before: (n) => `New line before line ${n}`,
    replace: (n) => `Change line ${n}`,
    top: () => 'At the very top, line 1',
    end: (n) => `At the very bottom, after line ${n}`,
  };
  let placeMarks = [];
  const clearPlace = () => { placeMarks.forEach((m) => m()); placeMarks = []; };
  const stepAt = (s) => s.at || (s.edits && s.edits[0] && s.edits[0].at);
  const placeOf = (s) => (s && !s.reveal && stepAt(s) && !(s.check && stepPasses(s, allCode())) ? placeFor(mainCode(), stepAt(s)) : null);
  const placeBox = h('div.step-place');
  function showPlace(place) {
    clearPlace();
    openFile(MAIN);
    const line = place.line - 1;
    mainDoc.addLineClass(line, 'background', 'place-line');
    // Show what to type right where it goes, so nobody has to look back and forth to find it.
    const now = flow[stepIndex] && flow[stepIndex].step;
    const shown = now && !now.reveal && !now.skeleton && typeof now.code === 'string' ? now.code : undefined;
    const marker = h('div.place-marker', h('div', place.how === 'replace' ? '▲ change this line to:' : shown ? '▼ type this here:' : '▼ your new line goes here'),
      shown && h('pre.place-ghost', shown.replace(/^\n+/, '').replace(/\n+$/, '')));
    const above = place.how === 'before' || place.how === 'top';
    const widget = cm.addLineWidget(line, marker, { above });
    placeMarks.push(() => mainDoc.removeLineClass(line, 'background', 'place-line'), () => widget.clear());
    const ch = above ? 0 : mainDoc.getLine(line).length;
    cm.setCursor({ line, ch });
    cm.scrollIntoView({ line, ch }, 80);
    cm.focus();
  }
  function drawPlace() {
    clear(placeBox);
    const item = flow[stepIndex];
    const place = item && item.step && !pending(item) ? placeOf(item.step) : null;
    if (!place) return;
    placeBox.append(h('span.place-text', '📍 ', PLACE_TEXT[place.how](place.line)), canEdit(MAIN) && h('button.btn.small', { onclick: () => showPlace(place) }, 'Show me'));
  }

  // Type-along, for the first lessons: a new line is opened where the code goes, with the code shown
  // faintly on it. The faint part shrinks as the student types over it, and turns red on a slip.
  const TYPE_ALONG = new Set(['t1', 't2', 't3']);
  const typedSteps = new Set();
  let typing = null;
  const squash = (t) => t.replace(/\s+/g, '');
  function stopTyping() {
    if (!typing) return;
    if (typing.mark) typing.mark.clear();
    cm.setOption('autoCloseBrackets', typing.closers);
    typing = null;
  }
  function updateTyping() {
    if (!typing) return;
    if (typing.mark) { typing.mark.clear(); typing.mark = null; }
    const first = mainDoc.getLineNumber(typing.handle);
    if (first === null) { stopTyping(); return; }
    const endLine = typing.end ? mainDoc.getLineNumber(typing.end) : mainDoc.lineCount();
    const ghost = (line, text, bad) => { typing.mark = mainDoc.setBookmark({ line, ch: mainDoc.getLine(line).length }, { widget: h(`span.type-ghost${bad ? '.bad' : ''}`, text), insertLeft: false }); };
    for (let k = 0; k < typing.targets.length; k++) {
      const target = typing.targets[k];
      const line = first + k;
      // The student hasn't made this line yet: tell them to press Enter on the one before.
      if (endLine === null || line >= endLine) { ghost(line - 1, `  ⏎ Enter, then: ${target.trim()}`); return; }
      const typed = squash(mainDoc.getLine(line));
      const want = squash(target);
      if (typed === want) continue;
      if (!want.startsWith(typed)) { ghost(line, `   ✗ should be: ${target.trim()}`, true); return; }
      let pos = 0;
      for (let seen = 0; pos < target.length && seen < typed.length; pos++) if (!/\s/.test(target[pos])) seen++;
      ghost(line, typed ? target.slice(pos) : target.trim());
      return;
    }
    stopTyping(); // every line matches
  }
  function startTyping(step, place) {
    openFile(MAIN);
    const targets = step.code.split('\n').filter((l) => l.trim());
    if (!targets.length) return;
    const indent = targets[0].match(/^\s*/)[0];
    const count = mainDoc.lineCount();
    let at = place.how === 'after' ? place.line : place.how === 'end' ? count : place.line - 1;
    if (at >= count) { mainDoc.replaceRange(`\n${indent}`, { line: count - 1, ch: mainDoc.getLine(count - 1).length }); at = mainDoc.lineCount() - 1; } else mainDoc.replaceRange(`${indent}\n`, { line: at, ch: 0 });
    // The editor normally adds a closing bracket for you. Here every character shown gets typed, so it is off for now.
    typing = { handle: mainDoc.getLineHandle(at), end: at + 1 < mainDoc.lineCount() ? mainDoc.getLineHandle(at + 1) : null, targets, closers: cm.getOption('autoCloseBrackets') };
    cm.setOption('autoCloseBrackets', false);
    cm.setCursor({ line: at, ch: mainDoc.getLine(at).length });
    cm.scrollIntoView({ line: at, ch: 0 }, 80);
    cm.focus();
    updateTyping();
  }
  /** Start type-along for this step, once, if it is the kind of step it suits. */
  function maybeTypeAlong(n, step) {
    if (!TYPE_ALONG.has(id) || !isStudent || approved || typedSteps.has(n) || !canEdit(MAIN) || pending(flow[stepIndex])) return;
    if (typeof step.code !== 'string' || step.reveal || step.skeleton) return;
    const place = placeOf(step);
    if (!place || place.how === 'replace') return;
    typedSteps.add(n);
    startTyping(step, place);
  }

  const drawStep = () => {
    clearPlace();
    stopTyping();
    if (stepNumberAt(stepIndex) > furthest) { furthest = stepNumberAt(stepIndex); markDirty(); }
    drawDots();
    clear(stepBox);
    stopSpeaking();
    if (stepIndex >= flow.length) { stepBox.append(finishPane()); return; }
    if (flow[stepIndex].quiz) { stepBox.append(quizPane(flow[stepIndex].quiz)); return; }
    const item = flow[stepIndex];
    const s = item.step;
    const wait = pending(item);
    const { brief, more } = briefOf(s);
    if (getSettings().autoRead) speak(brief);
    const passing = s.check && stepPasses(s, allCode());
    const display = shownCode(s);
    const codeBlock = display !== undefined && h('div.snippet-wrap',
      h('p.snippet-label', s.code || s.edits ? 'Add this code' : 'Look at this'),
      snippet(display.replace(/^\n+/, '').replace(/\n+$/, '')));
    let revealArea = codeBlock;
    if (codeBlock && s.reveal) {
      revealArea = h('div', h('button.btn', { onclick: (e) => e.target.replaceWith(codeBlock) }, 'Stuck? Show me an example'));
    }
    const lastSkeleton = s.skeleton && s.skeleton[s.skeleton.length - 1].code.trim().split('\n')[0];
    const skeletonArea = s.skeleton && h('div.stack.tight',
      snippet(s.skeleton.map((e) => e.code).join('\n\n')),
      canEdit(MAIN) && h('button.btn.primary', {
        disabled: mainCode().includes(lastSkeleton),
        onclick: (e) => {
          try {
            openFile(MAIN);
            cm.setValue(applySkeleton(mainCode(), s));
          } catch (err) {
            toast("Couldn't find where this goes in your code. Copy it in by hand.", 'error');
            return;
          }
          e.target.disabled = true;
          run();
        },
      }, 'Add the starter code'));
    const kind = kindOf(s);
    const nextLabel = () => (kind === 'read' ? 'Got it, next' : !s.check || stepPasses(s, allCode()) ? 'Next' : 'Skip for now');
    stepBox.append(...[
      h(`p.step-kind.${kind}`, h('b', kind === 'do' ? '✏️ Your turn' : '👀 Just read'), h('small', `Step ${flow[stepIndex].n + 1} of ${lesson.steps.length}`)),
      h('h2', s.title),
      h('div.step-do', h('div.read-row', nameButtons(md(brief)), readButton(() => brief))),
      wait && readFirst(item),
      item.ask && !wait && !preview && h('p.read-first-done', '✓ ', md(item.ask.why)),
      placeBox,
      !wait && (skeletonArea || ''),
      !wait && (revealArea || ''),
      s.provides && !approved && h('button.btn.primary', { disabled: extraDocs.has(s.provides.name), onclick: () => addProvided(s.provides) }, extraDocs.has(s.provides.name) ? `${s.provides.name} added ✓` : 'Add the finished file'),
      s.provides && h('details.hint', h('summary', 'Peek inside'), snippet(s.provides.code)),
      s.action === 'sprites' && h('button.btn.primary', { onclick: openPicker }, 'Open Sprites'),
      s.action === 'sounds' && h('button.btn.primary', { onclick: openSounds }, 'Open Sounds'),
      s.action === 'music' && h('button.btn.primary', { onclick: openMusic }, 'Open Music Maker'),
      s.action === 'share' && h('button.btn.primary', { onclick: toggleShare }, 'Share to Arcade'),
      s.action === 'teachable' && h('a.btn.primary', { href: 'https://teachablemachine.withgoogle.com/train/image', target: '_blank', rel: 'noopener noreferrer' }, 'Open Teachable Machine ↗'),
      s.hint && !passing && !wait && h('details.hint', h('summary', 'Hint'), md(s.hint)),
      more && h('details.hint', h('summary', 'Why?'), md(more), readButton(() => more, 'Read the explanation aloud')),
      s.check && h('p.step-check', { class: passing ? 'ok' : 'wait' }, passing ? '✓ Done' : 'Not done yet'),
      isStudent && confusingButton(id, `step:${flow[stepIndex].n}`, myFlags),
      h('div.row.step-nav',
        stepIndex > 0 && h('button.btn', { onclick: () => { stepIndex--; drawStep(); } }, 'Back'),
        !wait && h('button.btn.step-next', { class: nextLabel() === 'Skip for now' ? '' : 'primary', onclick: () => { stepIndex++; drawStep(); run(); } }, nextLabel()),
      ),
    ].filter(Boolean));
    // After the page has drawn, so the editor is on screen to take the cursor.
    const n = flow[stepIndex].n;
    setTimeout(() => { if (flow[stepIndex] && flow[stepIndex].step === s) maybeTypeAlong(n, s); }, 0);
    drawPlace();
  };

  // Actions ---------------------------------------------------------------------------------------
  const openPicker = () => openSpritePicker({
    project: assets,
    suggestedName: lesson.steps.some((s) => s.action === 'sprites') ? 'hero' : '',
    onChange: (next) => { assets = next; drawFileBar(); markDirty(); run(); },
  });

  const openSounds = () => openSoundPicker({
    onInsert: readOnly ? null : (line) => { cm.replaceSelection(`${line}\n`); cm.focus(); markDirty(); },
  });
  // The teacher opens and closes the Music Maker for the class. A step that teaches it always can.
  const musicAllowed = () => !isStudent || !!app.session?.class?.music_open;
  const openMusic = () => openMusicMaker({
    onAdd: approved ? null : (fileName, code, variable) => {
      if (extraDocs.has(fileName)) extraDocs.get(fileName).setValue(code);
      else extraDocs.set(fileName, window.CodeMirror.Doc(code, 'javascript'));
      drawFileBar();
      markDirty();
      run();
      toast(`Added ${fileName}. Play it with playMusic(${variable});`);
    },
  });

  // Group projects: one shared project, and one person editing each file at a time.
  function memberName(sid) { return team?.members.find((m) => m.id === sid)?.display_name || 'A teammate'; }
  function drawTeamBar() {
    if (!team) return;
    const who = holders[activeFile];
    const busy = Object.entries(holders).map(([file, sid]) => `${sid === me.student.id ? 'You' : memberName(sid)}: ${file}`);
    clear(teamBar).append(...[
      h('span', h('strong', 'Group: '), team.members.map((m) => m.display_name).join(', ')),
      h('span.team-turn', iHold(activeFile) ? `You're editing ${activeFile}.` : who ? `${memberName(who)} is editing ${activeFile}. Pick another file, or make a new one.` : `Nobody is editing ${activeFile}.`),
      !approved && iHold(activeFile) && h('button.btn.small', { type: 'button', onclick: () => passTurn(activeFile) }, `Let go of ${activeFile}`),
      !approved && !who && h('button.btn.small.primary', { type: 'button', onclick: () => takeTurn(activeFile) }, `Edit ${activeFile}`),
      busy.length > 0 && h('span.muted.small', busy.join(' · ')),
    ].filter(Boolean));
  }
  function applyRole() {
    driving = !!team && Object.values(holders).includes(me.student.id);
    readOnly = !canEdit(activeFile);
    cm.setOption('readOnly', readOnly);
    drawTeamBar();
    drawFileBar();
    drawStep();
    drawHead();
  }
  /** Bring in teammates' changes, leaving the files you are editing alone. */
  function applyRemote(doc) {
    applyingRemote = true;
    if (!iHold(MAIN) && doc.code !== mainDoc.getValue()) mainDoc.setValue(doc.code || '');
    const incoming = doc.files || {};
    for (const name of [...extraDocs.keys()]) {
      if (incoming[name] === undefined && !iHold(name)) { if (activeFile === name) openFile(MAIN); extraDocs.delete(name); }
    }
    for (const [name, text] of Object.entries(incoming)) {
      if (iHold(name)) continue;
      if (!extraDocs.has(name)) extraDocs.set(name, window.CodeMirror.Doc(text, 'javascript'));
      else if (extraDocs.get(name).getValue() !== text) extraDocs.get(name).setValue(text);
    }
    assets = { ...(doc.assets || {}), ...assets };
    drawFileBar();
    applyingRemote = false;
  }
  async function pollTeam() {
    let fresh;
    try { fresh = await app.store.teamFor(id, null, { stamp: team.doc_at, beat: driving }); } catch (_) { return; }
    if (!fresh) return;
    const { doc, same, ...view } = fresh;
    team = { ...team, ...view };
    holders = view.holders || {};
    if (doc) applyRemote(doc);
    applyRole();
  }
  async function takeTurn(file) {
    const base = team.started ? null : { code: mainCode(), assets, files: extraFiles() };
    const fresh = await attempt(() => app.store.takeKeyboard(id, base, file));
    if (!fresh) { pollTeam(); return; }
    const { doc, ...view } = fresh;
    team = { ...team, ...view };
    holders = view.holders || {};
    if (doc) applyRemote(doc);
    applyRole();
    cm.focus();
  }
  async function passTurn(file) {
    saveSoon.cancel();
    if (dirty) await persist();
    if (await attempt(async () => { await app.store.passKeyboard(id, file); return true; })) {
      const { [file]: _gone, ...rest } = holders;
      holders = rest;
      applyRole();
    }
  }

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

  // One submit at a time. On a busy server a submit can take a while, and a second press used to
  // send it again, which played the celebration once for every press.
  let submitting = false;
  let asking = false;
  let submitNote = '';
  async function submit() {
    if (submitting || asking) return;
    const c = checkSummary(lesson, allCode());
    if (c.passed < c.total) {
      asking = true;
      const sure = await confirmBox('Some checks are not passing', `${c.passed} of ${c.total} checks pass. Your teacher will see that. Sometimes the checker misses a different but correct way of doing things, so you can still submit if you think it works.`, 'Submit anyway');
      asking = false;
      if (!sure) return;
    }
    if (team && !contribution.value.trim()) { toast('Write what each person in your group did first.', 'error'); return; }
    if (submitting) return;
    submitting = true;
    submitNote = '';
    saveSoon.cancel();
    if (stepIndex === flow.length) drawStep();
    const before = statsFor({ ...me.row, path, works: me.row.works });
    let saved = null;
    try {
      saved = await app.store.submitWork(id, { ...codePatch(mainCode()), ...teamPatch(), stretch_done: stretchDone, reflection: reflect.value, checks_passed: c.passed, checks_total: c.total, auto_ok: c.passed === c.total, step_at: lesson.steps.length, ...quizPatch() });
    } catch (e) {
      console.error(e);
      submitNote = `Not submitted yet: ${e.message || 'something went wrong.'} Your code is still here. Press Submit again.`;
      toast('Not submitted yet. Press Submit again.', 'error');
    }
    submitting = false;
    if (!saved) { if (stepIndex === flow.length) drawStep(); return; }
    work = saved;
    dirty = false;
    status.textContent = 'Submitted';
    status.classList.remove('bad');
    // The answer already says what was saved, so nothing more is asked of the server here. At the
    // end of class everyone submits together, and three more requests each was what made it slow.
    const swap = (list) => [...(list || []).filter((w) => w.lesson_id !== id), saved];
    const row = { ...me.row, works: swap(me.row.works) };
    const works = swap(me.works);
    me = { ...me, works, row, done: new Set(works.filter(isDone).map((w) => w.lesson_id)), stats: statsFor({ ...row, path }) };
    if (stepIndex === flow.length) drawStep();
    try { celebrate(before, me.stats); } catch (e) { console.error(e); toast('Submitted! Your teacher can see it now.'); }
  }

  function celebrate(before, after) {
    const newBadges = after.badges.filter((b) => !before.badges.includes(b));
    const rankedUp = after.rankIndex > before.rankIndex;
    const firstSubmit = after.done.size > before.done.size; // Resubmitting doesn't earn more play time.
    const nextId = currentLesson(path, me.done);
    const gain = after.xp - before.xp;
    const gained = h('h2', `+${gain} XP`);
    markCelebrated(me.student.id, after);
    // The whole screen celebrates first: the lesson, then a new rank, then each new badge.
    // The XP flies into the purse as the first one leaves.
    let big = null;
    splash({ kind: 'lesson', icon: '🏁', eyebrow: 'Lesson complete!', title: lesson.title, detail: gain > 0 ? `+${gain} XP` : 'Submitted again', sound: 'submit', seconds: 5, onShow: (el) => { big = el.querySelector('.fx-splash-detail'); if (gain > 0) countUp(big, 0, gain, (n) => `+${n} XP`, 1100); } })
      .then(() => flyXP(document.querySelector('.celebrate h2') || document.body, after.xp));
    if (rankedUp) popRank(after.rank.name);
    newBadges.slice(0, 3).forEach((b) => popBadge(b));
    modal((close) => h('div.stack.celebrate',
      h('p.eyebrow', 'Lesson submitted'),
      gained,
      rankedUp && h('p.rankup', `You are now a ${after.rank.name}!`),
      newBadges.length > 0 && h('div.stack', h('h3', 'New badge!'), h('div.badges', newBadges.map((b) => badgeChip(b)))),
      ratingBox(id),
      app.session?.class?.world_mode === 'earned' && firstSubmit && h('p.quest-earned', `🗺️ +${app.session.class.world_mins || 5} minutes in Trail Quest`),
      h('div.row.end',
        app.session?.class?.world_mode && h('a.btn', { href: '#/quest', onclick: close }, 'Play Trail Quest'),
        h('a.btn', { href: '#/map', onclick: close }, 'See the map'),
        nextId
          ? h('a.btn.primary', { href: `#/${!path && me.done.has('t6') ? 'road' : `lesson/${nextId}`}`, onclick: close }, id === 'c6' ? 'Go Beyond the Summit' : 'Next lesson')
          : (!path ? h('a.btn.primary', { href: '#/road', onclick: close }, 'Choose your road') : h('a.btn.primary', { href: '#/arcade', onclick: close }, 'Open the Arcade')),
      ),
    ));
  }

  // "Today": what this lesson builds and the few ideas it turns on. Shown once when a student first
  // opens the lesson, and again whenever they press Key ideas. Kept short on purpose.
  const openToday = () => {
    const today = todayFor(id);
    let demo = null;
    let answer = '';
    try { answer = buildSolution(id, path); } catch (_) { /* no finished version to show */ }
    // Only a finished version that runs with nothing but its own code: no sprites, camera or model to load.
    const showable = answer && !/SPRITES\.|ml5\.|createCapture|loadSound|loadImage/.test(answer);
    modal((close) => {
      const frame = h('div.today-frame');
      if (showable) {
        demo = createPlayer(() => {});
        frame.append(demo.el);
        demo.run(answer, {}, filesThrough(id, path));
      }
      return h('div.stack.today',
        h('p.eyebrow', `Today · ${lesson.mins} minutes`),
        h('h2', lesson.title),
        h('div.today-top',
          showable && h('figure.today-demo', frame, h('figcaption.muted.small', 'A finished one. Yours will look different.')),
          h('div.stack',
            h('h3', 'You will build'),
            h('p.today-build', today ? today.build : lesson.hook),
            today && h('p.muted', lesson.hook),
            h('h3', 'Key ideas'),
            today
              ? h('dl.ideas', today.ideas.map((x) => h('div', h('dt', x.term), h('dd', x.means))))
              : h('p.concepts', lesson.concepts.map((c) => h('span.tag', c))))),
        isStudent && standardsPanel(id, false),
        h('div.row.end', h('button.btn.primary.big', { onclick: close }, 'Start')));
    }, { wide: true, onClose: () => { if (demo) demo.destroy(); } });
  };

  // Tools a student needs now and then, kept in one menu so the page is not a wall of buttons.
  // A step that needs one of them shows its own button at the moment it is needed.
  const moreMenu = () => {
    const menu = h('details.more-menu');
    const item = (label, action) => h('button.btn', { type: 'button', onclick: () => { menu.open = false; action(); } }, label);
    menu.append(
      h('summary.btn', 'More ▾'),
      h('div.more-list',
        isStudent && canEdit(MAIN) && item('Reset code', cleanCopy),
        isStudent && !approved && item(work?.shared ? 'In the Arcade ✓' : 'Share to Arcade', toggleShare),
        item('🐞 Report a problem', openBugReport)));
    return menu;
  };

  const head = h('header.lesson-head');
  const drawHead = () => {
    const stage = stageOf(id);
    clear(head).append(
      h('div.lesson-title',
        h('p.eyebrow', stage.name, lesson.path ? ` · ${PATHS[lesson.path].road}` : '', isBeyond(id) ? ' · Extra challenge' : '', ` · ${lesson.mins} minutes`),
        h('h1', lesson.title),
        // Standards sit behind Key ideas for students. A teacher previewing keeps them in view.
        preview && standardChips(id, stdPanel),
      ),
      h('div.row.lesson-actions',
        status,
        preview && h('select.path-pick', { 'aria-label': 'Road to preview', onchange: (e) => go(`/lesson/${id}/${e.target.value}`) }, Object.values(PATHS).map((p) => h('option', { value: p.id, selected: p.id === path }, p.road))),
        preview && h('button.btn', { onclick: () => { openFile(MAIN); cm.setValue(buildSolution(id, path)); for (const [n, t] of Object.entries(filesThrough(id, path))) if (!extraDocs.has(n)) extraDocs.set(n, window.CodeMirror.Doc(t, 'javascript')); drawFileBar(); run(); toast('Showing the answer key.'); } }, 'Show answer key'),
        h('button.btn.key-ideas', { onclick: openToday, title: 'What this lesson builds, and its key ideas' }, '💡 Key ideas'),
        moreMenu(),
      ),
    );
  };

  drawHead();
  drawStep();

  // A nudge for a student who has stopped. Nothing is sent anywhere: it only draws the eye to the
  // next thing to do, first gently, then by pointing at the exact line in the code.
  let lastActive = Date.now();
  let nudged = 0;
  const NUDGE = 'nudge';
  const calm = () => { page.querySelectorAll(`.${NUDGE}`).forEach((el) => el.classList.remove(NUDGE)); nudged = 0; };
  const active = () => { lastActive = Date.now(); if (nudged) calm(); };
  const nudgeTimer = isStudent && !approved ? setInterval(() => {
    if (document.hidden || document.querySelector('.backdrop, .fx-splash')) { lastActive = Date.now(); return; }
    const idle = (Date.now() - lastActive) / 1000;
    const item = flow[stepIndex];
    const todo = item && item.step && !pending(item) && kindOf(item.step) === 'do' && !(item.step.check && stepPasses(item.step, allCode()));
    if (idle > 25 && nudged < 1) {
      nudged = 1;
      // What to look at depends on the step: where the code goes, an answer to pick, or the way on.
      const targets = !item ? ['.btn.primary.big'] : item.quiz ? (answered.has(item.quiz) ? ['.step-nav .btn.primary'] : ['.step-kind', '.quiz-options']) : pending(item) ? ['.read-first-tag', '.quiz-options'] : todo ? ['.step-kind', '.step-place', '.snippet'] : ['.step-nav .step-next'];
      targets.forEach((sel) => { const el = stepBox.querySelector(sel); if (el) el.classList.add(NUDGE); });
    }
    if (idle > 50 && nudged < 2 && todo) {
      nudged = 2;
      const place = placeOf(item.step);
      if (place && canEdit(MAIN)) { showPlace(place); chime('step'); }
      const editor = page.querySelector('.CodeMirror');
      if (editor) editor.classList.add(NUDGE);
    }
  }, 5000) : null;
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => window.addEventListener(ev, active, true));

  // Steps that were already done when the lesson opened stay quiet. Finishing one chimes once.
  const cheered = new Set(lesson.steps.map((s, i) => (s.check && stepPasses(s, allCode()) ? i : -1)));
  const onChange = debounce(() => {
    drawDots();
    drawPlace();
    const fresh = lesson.steps.map((s, i) => i).filter((i) => lesson.steps[i].check && !cheered.has(i) && stepPasses(lesson.steps[i], allCode()));
    fresh.forEach((i) => cheered.add(i));
    if (fresh.length && !applyingRemote) {
      chime('step');
      // Each finished step pays a little XP straight away, so there is a reason to do the next one.
      if (isStudent && !approved) {
        gainXP(stepBox.querySelector('.step-check') || stepBox, fresh.length * XP.step);
        saveSoon();
      }
      const badge = stepBox.querySelector('.step-check');
      if (badge && flow[stepIndex] && fresh.includes(flow[stepIndex].n)) setTimeout(() => { pop(badge); sparkle(badge); }, 0);
    }
    const item = flow[stepIndex];
    const el = stepBox.querySelector('.step-check');
    if (item?.step?.check && el) {
      const ok = stepPasses(item.step, allCode());
      el.className = `step-check ${ok ? 'ok' : 'wait'}`;
      el.textContent = ok ? '✓ Done' : 'Not done yet';
      const next = stepBox.querySelector('.step-next');
      if (next) { next.textContent = ok ? 'Next' : 'Skip for now'; next.classList.toggle('primary', ok); }
    }
  }, 350);
  cm.on('change', () => { clearPlace(); markDirty(); onChange(); updateTyping(); });

  const stuck = isStudent && !approved ? helpBox(id, () => Math.min(stepNumberAt(stepIndex), lesson.steps.length - 1), helpOpen) : null;
  const feedback = work?.grade?.feedback || (work?.status === 'returned');
  // Panels a student can resize: drag a divider, or focus it and use the arrow keys. Double-click
  // puts it back. Sizes are kept in this browser only.
  const SIZES = 'pixeltrail.panes';
  let sizes = {};
  try { sizes = JSON.parse(localStorage.getItem(SIZES) || '{}') || {}; } catch (_) { /* private mode */ }
  const keepSizes = () => { try { localStorage.setItem(SIZES, JSON.stringify(sizes)); } catch (_) { /* this visit only */ } };
  const runBar = h('div.run-bar', h('button.btn.run', { onclick: run, title: 'Cmd or Ctrl + Enter' }, '▶ Run', h('i.twinkle', { 'aria-hidden': 'true' }, '✦'), h('i.twinkle.two', { 'aria-hidden': 'true' }, '✦')), gridButton);
  const gameFrame = h('div.game-frame', player.el);
  const MIN_CONSOLE = 64;
  const fitGame = () => {
    const box = gamePane.getBoundingClientRect();
    if (!box.width) return;
    const pad = 16;
    // The game comes first: the messages give way to it unless the student has sized them, and the
    // buttons above it shrink when the panel is small.
    const consoleH = Math.max(MIN_CONSOLE, Number(sizes.console) || MIN_CONSOLE);
    const stacked = window.matchMedia('(max-width: 1050px)').matches;
    const fit = () => (stacked ? box.width - pad : Math.min(box.width - pad, box.height - pad - runBar.offsetHeight - consoleH - 30));
    runBar.classList.remove('compact');
    if (fit() < 340) runBar.classList.add('compact');
    const side = Math.max(160, Math.floor(fit()));
    gameFrame.style.width = gameFrame.style.height = `${side}px`;
    runBar.style.maxWidth = `${side}px`;
  };
  function applySizes() {
    const panes = page.querySelector('.panes');
    ['steps', 'game'].forEach((k) => (sizes[k] ? panes.style.setProperty(`--w-${k}`, `${sizes[k]}px`) : panes.style.removeProperty(`--w-${k}`)));
    consoleBox.style.setProperty('--h-console', `${Math.max(MIN_CONSOLE, Number(sizes.console) || MIN_CONSOLE)}px`);
    fitGame();
    cm.refresh();
  }
  const splitter = (key, label, across, measure) => {
    const set = (v) => { sizes[key] = Math.round(v); applySizes(); };
    const el = h(`div.split.${across ? 'across' : 'down'}`, {
      role: 'separator', tabindex: 0, 'aria-label': label, 'aria-orientation': across ? 'horizontal' : 'vertical', title: 'Drag to resize. Double-click to reset.',
      onpointerdown: (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('dragging'); },
      onpointermove: (e) => { if (el.classList.contains('dragging')) set(measure(e)); },
      onpointerup: () => { el.classList.remove('dragging'); keepSizes(); },
      onpointercancel: () => { el.classList.remove('dragging'); },
      ondblclick: () => { delete sizes[key]; applySizes(); keepSizes(); },
      onkeydown: (e) => {
        const step = { ArrowLeft: -24, ArrowUp: 24, ArrowRight: 24, ArrowDown: -24 }[e.key];
        if (!step) return;
        e.preventDefault();
        const r = el.getBoundingClientRect();
        set(measure({ clientX: r.left + r.width / 2 + (across ? 0 : step), clientY: r.top + r.height / 2 - (across ? step : 0) }));
        keepSizes();
      },
    }, h('span'));
    return el;
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const panesBox = () => page.querySelector('.panes').getBoundingClientRect();
  const splitSteps = splitter('steps', 'Resize the steps panel', false, (e) => { const b = panesBox(); return clamp(e.clientX - b.left, 260, b.width - 620); });
  const splitGame = splitter('game', 'Resize the game panel', false, (e) => { const b = panesBox(); return clamp(b.right - e.clientX, 240, b.width - 620); });
  const splitConsole = splitter('console', 'Resize the messages under the game', true, (e) => { const b = gamePane.getBoundingClientRect(); return clamp(b.bottom - e.clientY - 12, MIN_CONSOLE, b.height - 260); });
  const gamePane = h('section.game-pane', { 'aria-label': 'Your game' }, runBar, gameFrame, splitConsole, consoleBox);
  const watchSize = window.ResizeObserver ? new ResizeObserver(() => fitGame()) : null;
  if (watchSize) watchSize.observe(gamePane);

  const page = h('div.workspace',
    head,
    work?.status === 'returned' && h('div.returned', h('strong', 'Your teacher asked for changes. '), work.grade?.feedback || ''),
    work?.status === 'approved' && feedback && h('div.approved', h('strong', 'Approved! '), work.grade?.feedback || '', work.grade ? ` Score: ${work.grade.total} of ${work.grade.max_total}.` : ''),
    h('nav.step-track', { 'aria-label': 'Steps in this lesson' }, dots),
    h('div.panes',
      h('aside.steps',
        stepBox,
        stuck && stuck.el,
        stdPanel,
      ),
      h('section.code-pane', {
        'aria-label': 'Code editor',
        ondragover: (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); },
        ondrop: (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); e.stopPropagation(); addUploads([...e.dataTransfer.files]); } },
      }, teamBar, fileBar, editorHost),
      splitGame,
      gamePane,
    ),
  );
  page.querySelector('.panes').insertBefore(splitSteps, page.querySelector('.code-pane'));
  applySizes();

  clear(main).append(page);
  document.body.classList.add('in-workspace');
  // The top bar's Tools menu opens these here, so a student stays in the lesson.
  app.lessonTools = { sprites: openPicker, sounds: openSounds, music: musicAllowed() ? openMusic : null };
  drawFileBar();
  cm.refresh();
  run();
  // Where to look first: the instruction card is outlined for a few seconds, and Run twinkles.
  stepBox.classList.add('hello');
  setTimeout(() => stepBox.classList.remove('hello'), 7000);
  // A student's first look at a lesson starts with what they are about to build and learn.
  if (isStudent && !work) openToday();

  const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  drawTeamBar();
  const teamTimer = team ? setInterval(() => { if (!document.hidden) pollTeam(); }, 15000) : null;
  app.cleanup = async () => {
    if (stuck) stuck.stop();
    clearInterval(teamTimer);
    clearInterval(nudgeTimer);
    ['pointerdown', 'keydown', 'wheel'].forEach((ev) => window.removeEventListener(ev, active, true));
    window.removeEventListener('beforeunload', beforeUnload);
    document.body.classList.remove('in-workspace');
    if (watchSize) watchSize.disconnect();
    delete app.lessonTools;
    saveSoon.cancel();
    if (dirty) await persist();
    if (team && driving) app.store.passKeyboard(id).catch(() => {});
    cm.stopSettings();
    stopSpeaking();
    player.destroy();
  };
  return null;
}

export { rubricFor };
