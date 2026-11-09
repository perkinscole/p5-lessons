// The workspace: lesson steps on the left, code in the middle, the running game on the right.
import { h, clear, md, toast, attempt, modal, debounce, confirmBox } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson, stepPasses, checkSummary, buildSolution, fallbackStarter, rubricFor, applySkeleton, briefOf, filesThrough } from '../curriculum/engine.js';
import { checksFor } from '../curriculum/checks.js';
import { PATHS, PATH_IDS, previousGameLesson, sequence, stageOf, currentLesson, isSideTrail, sideTrailOpen, isBeyond } from '../curriculum/graph.js';
import { createPlayer } from '../sandbox.js';
import { loadMe, badgeChip } from './student.js';
import { statsFor, XP, isDone } from '../game/rules.js';
import { openSpritePicker } from './sprites.js';
import { openSoundPicker, openMusicMaker } from './sounds.js';
import { reviewFor } from '../curriculum/review.js';
import { onSettings, getSettings, readButton, speak, stopSpeaking } from '../settings.js';
import { alignmentFor, standardByCode } from '../curriculum/alignment.js';

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
  let path = previewPath || lesson.path || 'platformer';
  let code;
  let assets = {};
  let startFiles = {};

  if (isStudent) {
    me = await loadMe();
    path = me.student.path;
    const roadOrder = sequence(path);
    team = await app.store.teamFor(id, Object.fromEntries(PATH_IDS.map((p) => [p, previousGameLesson(id, p)])), {});
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
  let driving = !!team && team.driver_id === me.student.id;
  let readOnly = approved || (!!team && !driving);
  let applyingRemote = false;
  const preview = !isStudent;
  // The walkthrough: steps with short questions woven in, one screen at a time.
  const warmUp = reviewFor(id, path);
  const quizzes = [...(warmUp ? [warmUp] : []), ...checksFor(id)];
  const flow = [...(warmUp ? [{ quiz: warmUp }] : []), ...lesson.steps.flatMap((step, i) => [{ step, n: i }, ...quizzes.filter((q) => q.after === i).map((quiz) => ({ quiz }))])];
  const answered = new Set(work && work.quiz_total === quizzes.length && quizzes.length ? quizzes : []);
  let quizRight = work?.quiz_right || 0;
  let stepIndex = 0;
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
      const where = ev.line ? (ev.file && ev.file !== 'sketch.js' ? `${ev.file}, line ${ev.line}` : `Line ${ev.line}`) : null;
      logLine(h('div.err', where && h('button.linejump', { onclick: () => { openFile(ev.file || MAIN); cm.setCursor(ev.line - 1, 0); cm.focus(); } }, where), ' ', md(ev.message)));
      if (ev.line) {
        clearErrorMark();
        const doc = docFor(ev.file || MAIN);
        doc.addLineClass(ev.line - 1, 'background', 'error-line');
        errorMark = { doc, line: ev.line - 1 };
      }
    } else if (ev.type === 'log') logLine(h('div.log', ev.message));
    else if (ev.type === 'warn') logLine(h('div.warn', ev.message));
    else if (ev.type === 'status') logLine(h('div.muted', ev.message));
  });
  const run = () => {
    clearErrorMark();
    clear(consoleBox);
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
    drawFileBar();
    cm.refresh();
  }
  const projectSize = () => JSON.stringify({ code: mainCode(), assets, files: extraFiles() }).length;
  function addCodeFile(rawName, text = '') {
    const base = safeName(rawName);
    let name = `${base}.js`;
    for (let n = 2; extraDocs.has(name) || name === MAIN; n++) name = `${base}${n}.js`;
    if (extraDocs.size >= 8) { toast('A project can have up to 8 extra code files.', 'error'); return; }
    extraDocs.set(name, window.CodeMirror.Doc(text, 'javascript'));
    openFile(name);
    markDirty();
  }
  async function addUploads(list) {
    if (readOnly) return;
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
    modal((close) => h('div.stack',
      h('h2', 'Get a clean copy'),
      h('p', 'This replaces the code in sketch.js. Your images and extra files stay.'),
      prevWork && h('button.btn', { onclick: () => restore(prevWork.code, close) }, 'My code from the start of this lesson'),
      h('button.btn.primary', { onclick: () => restore(working, close) }, prevWork ? 'A fresh copy that works' : 'Start this lesson over'),
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
        h('button', { 'aria-current': name === activeFile ? 'true' : null, onclick: () => openFile(name) }, name),
        name !== MAIN && !readOnly && h('button.file-x', { 'aria-label': `Remove ${name}`, onclick: async () => {
          if (!(await confirmBox(`Remove ${name}?`, 'Its code will be deleted from this project.', 'Remove', true))) return;
          extraDocs.delete(name);
          openFile(MAIN);
          markDirty();
          run();
        } }, '×')))),
      Object.keys(assets).length > 0 && h('div.file-assets', Object.keys(assets).map((name) => h('button.file-asset', { title: `SPRITES.${name}`, 'aria-label': `Image ${name}`, onclick: openPicker }, h('img', { src: assets[name], alt: '' }), name))),
      !readOnly && h('div.file-actions',
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
      work = await app.store.saveWork(id, { ...codePatch(src), ...teamPatch(), stretch_done: stretchDone, reflection: reflect.value, checks_passed: c.passed, checks_total: c.total, auto_ok: c.passed === c.total, ...quizPatch() });
      dirty = false;
      if (work.team_lost) { driving = false; applyRole(); pollTeam(); }
      status.textContent = 'All saved';
      status.classList.remove('bad');
    } catch (e) {
      status.textContent = "Couldn't save. Check your connection.";
      status.classList.add('bad');
      console.error(e);
      saveSoon(); // Try again, so a busy moment can't lose a student's work.
    }
  };
  function quizPatch() { return { quiz_right: quizRight, quiz_total: answered.size === quizzes.length ? quizzes.length : 0 }; }
  const saveSoon = debounce(persist, app.store.saveDelay || 1500);
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
    clear(dots);
    flow.forEach((item, i) => {
      const on = i === stepIndex ? 'on' : '';
      const go = () => { stepIndex = i; drawStep(); };
      if (item.quiz) {
        dots.append(h('li', h('button', { class: `quiz ${answered.has(item.quiz) ? 'ok' : ''} ${on}`, 'aria-label': 'Quick check', 'aria-current': on ? 'step' : null, onclick: go }, answered.has(item.quiz) ? '✓' : '?')));
        return;
      }
      const passing = item.step.check && results[item.n];
      dots.append(h('li', h('button', { class: `${passing ? 'ok' : ''} ${on}`, 'aria-label': `Step ${item.n + 1}: ${item.step.title}${passing ? ', done' : ''}`, 'aria-current': on ? 'step' : null, title: item.step.title, onclick: go }, passing ? '✓' : item.n + 1)));
    });
    dots.append(h('li', h('button', { class: `${stepIndex === flow.length ? 'on' : ''} finish`, 'aria-label': 'Finish', title: 'Finish', onclick: () => { stepIndex = flow.length; drawStep(); } }, '★')));
  };

  const quizPane = (q) => {
    let firstTry = !answered.has(q);
    const feedback = h('div.quiz-feedback', { 'aria-live': 'polite' });
    const nav = h('div.row.step-nav');
    const drawNav = () => clear(nav).append(...[
      stepIndex > 0 && h('button.btn', { onclick: () => { stepIndex--; drawStep(); } }, 'Back'),
      (answered.has(q) || preview) && h('button.btn.primary', { onclick: () => { stepIndex++; drawStep(); } }, 'Next'),
    ].filter(Boolean));
    drawNav();
    const buttons = h('div.quiz-options', q.options.map((text, i) => h('button.quiz-option', {
      onclick: (e) => {
        if (i === q.answer) {
          e.currentTarget.classList.add('right');
          if (firstTry && !answered.has(q)) quizRight++;
          answered.add(q);
          clear(feedback).append(h('p.ok', '✓ ', md(q.why)));
          drawNav();
          drawDots();
          markDirty();
        } else {
          firstTry = false;
          e.currentTarget.classList.add('wrong');
          e.currentTarget.disabled = true;
          clear(feedback).append(h('p.warn', 'Not quite. Try another one.'));
        }
      },
    }, md(text))));
    return h('div.stack',
      h('p.eyebrow', 'Quick check'),
      q.review && h('p.eyebrow', 'From an earlier lesson'),
      h('div.quiz-q', h('div.read-row', md(q.q), readButton(() => `${q.q} ${q.options.map((o, i) => `Choice ${i + 1}: ${o}.`).join(' ')}`))),
      q.code && h('pre.snippet', h('code', q.code)),
      buttons, feedback, nav);
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
      !preview && !approved && h('button.btn.primary.big', { onclick: submit }, work && isDone(work) ? 'Submit again' : 'Submit lesson'),
    );
  };

  const drawStep = () => {
    drawDots();
    clear(stepBox);
    stopSpeaking();
    if (stepIndex >= flow.length) { stepBox.append(finishPane()); return; }
    if (flow[stepIndex].quiz) { stepBox.append(quizPane(flow[stepIndex].quiz)); return; }
    const s = flow[stepIndex].step;
    const { brief, more } = briefOf(s);
    if (getSettings().autoRead) speak(brief);
    const passing = s.check && stepPasses(s, allCode());
    const display = s.show !== undefined ? s.show : s.code;
    const codeBlock = display !== undefined && h('pre.snippet', h('code', display.replace(/^\n+/, '').replace(/\n+$/, '')));
    let revealArea = codeBlock;
    if (codeBlock && s.reveal) {
      revealArea = h('div', h('button.btn', { onclick: (e) => e.target.replaceWith(codeBlock) }, 'Stuck? Show me an example'));
    }
    const lastSkeleton = s.skeleton && s.skeleton[s.skeleton.length - 1].code.trim().split('\n')[0];
    const skeletonArea = s.skeleton && h('div.stack.tight',
      h('pre.snippet', h('code', s.skeleton.map((e) => e.code).join('\n\n'))),
      !readOnly && h('button.btn.primary', {
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
    stepBox.append(...[
      h('h2', s.title),
      h('div.step-do', h('div.read-row', md(brief), readButton(() => brief))),
      skeletonArea || '',
      revealArea || '',
      s.provides && !readOnly && h('button.btn.primary', { disabled: extraDocs.has(s.provides.name), onclick: () => addProvided(s.provides) }, extraDocs.has(s.provides.name) ? `${s.provides.name} added ✓` : 'Add the finished file'),
      s.provides && h('details.hint', h('summary', 'Peek inside'), h('pre.snippet', h('code', s.provides.code))),
      s.action === 'sprites' && h('button.btn.primary', { onclick: openPicker }, 'Open Sprites'),
      s.action === 'sounds' && h('button.btn.primary', { onclick: openSounds }, 'Open Sounds'),
      s.action === 'music' && h('button.btn.primary', { onclick: openMusic }, 'Open Music Maker'),
      s.action === 'share' && h('button.btn.primary', { onclick: toggleShare }, 'Share to Arcade'),
      s.action === 'teachable' && h('a.btn.primary', { href: 'https://teachablemachine.withgoogle.com/train/image', target: '_blank', rel: 'noopener noreferrer' }, 'Open Teachable Machine ↗'),
      s.hint && !passing && h('details.hint', h('summary', 'Hint'), md(s.hint)),
      more && h('details.hint', h('summary', 'Why?'), md(more), readButton(() => more, 'Read the explanation aloud')),
      s.check && h('p.step-check', { class: passing ? 'ok' : 'wait' }, passing ? '✓ Done' : 'Not done yet'),
      h('div.row.step-nav',
        stepIndex > 0 && h('button.btn', { onclick: () => { stepIndex--; drawStep(); } }, 'Back'),
        h('button.btn.primary', { onclick: () => { stepIndex++; drawStep(); run(); } }, 'Next'),
      ),
    ].filter(Boolean));
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
  const openMusic = () => openMusicMaker({
    onAdd: readOnly ? null : (fileName, code, variable) => {
      if (extraDocs.has(fileName)) extraDocs.get(fileName).setValue(code);
      else extraDocs.set(fileName, window.CodeMirror.Doc(code, 'javascript'));
      drawFileBar();
      markDirty();
      run();
      toast(`Added ${fileName}. Play it with playMusic(${variable});`);
    },
  });

  // Group projects: one shared project, one person typing at a time.
  let turnStarted = 0;
  function drawTeamBar() {
    if (!team) return;
    const holder = team.members.find((m) => m.id === team.driver_id);
    clear(teamBar).append(...[
      h('span', h('strong', 'Group: '), team.members.map((m) => m.display_name).join(', ')),
      h('span.team-turn', driving ? 'You have the keyboard.' : holder ? `${holder.display_name} has the keyboard.` : 'The keyboard is free.'),
      !approved && driving && h('button.btn.small', { type: 'button', onclick: passTurn }, 'Pass the keyboard'),
      !approved && !driving && !holder && h('button.btn.small.primary', { type: 'button', onclick: takeTurn }, 'Take the keyboard'),
    ].filter(Boolean));
  }
  function applyRole() {
    readOnly = approved || !driving;
    cm.setOption('readOnly', readOnly);
    drawTeamBar();
    drawFileBar();
    drawStep();
    drawHead();
  }
  function applyRemote(doc) {
    applyingRemote = true;
    if (doc.code !== mainDoc.getValue()) mainDoc.setValue(doc.code || '');
    const incoming = doc.files || {};
    for (const name of [...extraDocs.keys()]) {
      if (incoming[name] === undefined) { if (activeFile === name) openFile(MAIN); extraDocs.delete(name); }
    }
    for (const [name, text] of Object.entries(incoming)) {
      if (!extraDocs.has(name)) extraDocs.set(name, window.CodeMirror.Doc(text, 'javascript'));
      else if (extraDocs.get(name).getValue() !== text) extraDocs.get(name).setValue(text);
    }
    assets = doc.assets || {};
    drawFileBar();
    applyingRemote = false;
  }
  async function pollTeam() {
    let fresh;
    try { fresh = await app.store.teamFor(id, null, { stamp: team.doc_at, beat: driving }); } catch (_) { return; }
    if (!fresh) return;
    const was = driving;
    const { doc, same, ...view } = fresh;
    team = { ...team, ...view };
    driving = team.driver_id === me.student.id;
    if (!driving && doc) applyRemote(doc);
    if (was !== driving) applyRole();
    else drawTeamBar();
    if (driving && turnStarted && Date.now() - turnStarted > 600000) {
      turnStarted = 0;
      toast('You have been typing for 10 minutes. Time to swap?');
    }
  }
  async function takeTurn() {
    const base = team.started ? null : { code: mainCode(), assets, files: extraFiles() };
    const fresh = await attempt(() => app.store.takeKeyboard(id, base));
    if (!fresh) { pollTeam(); return; }
    const { doc, ...view } = fresh;
    team = { ...team, ...view };
    if (doc) applyRemote(doc);
    driving = true;
    turnStarted = Date.now();
    applyRole();
    cm.focus();
  }
  async function passTurn() {
    saveSoon.cancel();
    if (dirty) await persist();
    if (await attempt(async () => { await app.store.passKeyboard(id); return true; })) {
      driving = false;
      team = { ...team, driver_id: '' };
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

  async function submit() {
    const c = checkSummary(lesson, allCode());
    if (c.passed < c.total) {
      const sure = await confirmBox('Some checks are not passing', `${c.passed} of ${c.total} checks pass. Your teacher will see that. Sometimes the checker misses a different but correct way of doing things, so you can still submit if you think it works.`, 'Submit anyway');
      if (!sure) return;
    }
    if (team && !contribution.value.trim()) { toast('Write what each person in your group did first.', 'error'); return; }
    saveSoon.cancel();
    const before = statsFor({ ...me.row, path, works: me.row.works });
    const saved = await attempt(() => app.store.submitWork(id, { ...codePatch(mainCode()), ...teamPatch(), stretch_done: stretchDone, reflection: reflect.value, checks_passed: c.passed, checks_total: c.total, auto_ok: c.passed === c.total, ...quizPatch() }));
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
          ? h('a.btn.primary', { href: `#/${!path && me.done.has('t6') ? 'road' : `lesson/${nextId}`}`, onclick: close }, id === 'c6' ? 'Go Beyond the Summit' : 'Next lesson')
          : (!path ? h('a.btn.primary', { href: '#/road', onclick: close }, 'Choose your road') : h('a.btn.primary', { href: '#/arcade', onclick: close }, 'Open the Arcade')),
      ),
    ));
  }

  const head = h('header.lesson-head');
  const drawHead = () => {
    const stage = stageOf(id);
    clear(head).append(
      h('div.lesson-title',
        h('p.eyebrow', stage.name, lesson.path ? ` · ${PATHS[lesson.path].road}` : '', isBeyond(id) ? ' · Extra challenge' : '', ` · ${lesson.mins} minutes`),
        h('h1', lesson.title),
        standardChips(id, stdPanel),
      ),
      h('div.row.lesson-actions',
        status,
        isStudent && !readOnly && h('button.btn', { onclick: cleanCopy }, 'Get a clean copy'),
        h('button.btn', { onclick: openPicker }, 'Sprites'),
        h('button.btn', { onclick: openSounds }, 'Sounds'),
        h('button.btn', { onclick: openMusic }, 'Music'),
        isStudent && !readOnly && h('button.btn', { onclick: toggleShare }, work?.shared ? 'In the Arcade ✓' : 'Share to Arcade'),
        preview && h('select.path-pick', { 'aria-label': 'Road to preview', onchange: (e) => go(`/lesson/${id}/${e.target.value}`) }, Object.values(PATHS).map((p) => h('option', { value: p.id, selected: p.id === path }, p.road))),
        preview && h('button.btn', { onclick: () => { openFile(MAIN); cm.setValue(buildSolution(id, path)); for (const [n, t] of Object.entries(filesThrough(id, path))) if (!extraDocs.has(n)) extraDocs.set(n, window.CodeMirror.Doc(t, 'javascript')); drawFileBar(); run(); toast('Showing the answer key.'); } }, 'Show answer key'),
        h('button.btn.run', { onclick: run, title: 'Cmd or Ctrl + Enter' }, '▶ Run'),
      ),
    );
  };

  drawHead();
  drawStep();

  const onChange = debounce(() => {
    drawDots();
    const item = flow[stepIndex];
    const el = stepBox.querySelector('.step-check');
    if (item?.step?.check && el) {
      const ok = stepPasses(item.step, allCode());
      el.className = `step-check ${ok ? 'ok' : 'wait'}`;
      el.textContent = ok ? '✓ Done' : 'Not done yet';
    }
  }, 350);
  cm.on('change', () => { markDirty(); onChange(); });

  const feedback = work?.grade?.feedback || (work?.status === 'returned');
  const page = h('div.workspace',
    head,
    work?.status === 'returned' && h('div.returned', h('strong', 'Your teacher asked for changes. '), work.grade?.feedback || ''),
    work?.status === 'approved' && feedback && h('div.approved', h('strong', 'Approved! '), work.grade?.feedback || '', work.grade ? ` Score: ${work.grade.total} of ${work.grade.max_total}.` : ''),
    h('div.panes',
      h('aside.steps',
        h('details.hook', h('summary', 'Why this lesson?'), h('p', lesson.hook), h('p.concepts', lesson.concepts.map((c) => h('span.tag', c)))),
        stdPanel,
        dots,
        stepBox,
      ),
      h('section.code-pane', {
        'aria-label': 'Code editor',
        ondragover: (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); },
        ondrop: (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); e.stopPropagation(); addUploads([...e.dataTransfer.files]); } },
      }, teamBar, fileBar, editorHost),
      h('section.game-pane', { 'aria-label': 'Your game' },
        h('div.game-frame', player.el),
        consoleBox,
      ),
    ),
  );

  clear(main).append(page);
  document.body.classList.add('in-workspace');
  drawFileBar();
  cm.refresh();
  run();

  const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  drawTeamBar();
  const teamTimer = team ? setInterval(pollTeam, 20000) : null;
  app.cleanup = async () => {
    clearInterval(teamTimer);
    window.removeEventListener('beforeunload', beforeUnload);
    document.body.classList.remove('in-workspace');
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
