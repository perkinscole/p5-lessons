// What students think of the lessons, and asking for help.
//   Students: "Confusing?" on any step or check question, "I'm stuck" to call the teacher, and a
//             rating at the end of a lesson.
//   Teacher:  a Feedback tab that adds it all up, with a report to copy or download, and a
//             "Needs help" card that rings when a student asks.
// None of it affects grades, and nothing here shows the teacher who said what, except a help
// request, which has to.
import { h, clear, debounce, toast, attempt, download } from '../ui.js';
import { app } from '../main.js';
import { getLesson, allLessons } from '../curriculum/engine.js';
import { buildReport, troubleSteps, quizRows, REASONS } from '../curriculum/report.js';
import { XP } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { chime } from '../celebrate.js';

const STAR_WORDS = ['Not for me', 'It was OK', 'Pretty good', 'I liked it', 'Loved it!'];
const FLAG_CHOICES = [['unclear', '😵 Instructions unclear'], ['broken', "🐞 Code didn't work"], ['hard', '🧗 Too hard'], ['easy', '😴 Too easy'], ['other', '💬 Other']];

// Students -------------------------------------------------------------------------------------------

/** The rating box shown after a lesson is submitted. Every change saves, so there is no button. */
export function ratingBox(lessonId) {
  const state = { stars: 0, hardest: '', better: '' };
  const saved = h('span', { 'aria-live': 'polite' });
  const save = debounce(async () => {
    if (!state.stars) return;
    try { await app.store.rateLesson(lessonId, state); saved.textContent = 'Saved. Thanks!'; } catch (_) { saved.textContent = "Couldn't save your rating."; }
  }, 500);
  const more = h('div.stack.tight');
  const stars = h('div.rate-stars', { role: 'radiogroup', 'aria-label': 'Stars' });
  const word = h('span.rate-word');
  const field = (key, label) => h('label.field.small', h('span', label),
    h('input', { maxlength: 200, 'aria-label': label, oninput: (e) => { state[key] = e.target.value; save(); } }));
  let opened = false;
  function drawStars() {
    clear(stars).append(...[1, 2, 3, 4, 5].map((n) => h('button.rate-star', {
      type: 'button', role: 'radio', 'aria-checked': state.stars === n ? 'true' : 'false', 'aria-label': `${n} star${n === 1 ? '' : 's'}: ${STAR_WORDS[n - 1]}`,
      class: n <= state.stars ? 'on' : '',
      onclick: () => {
        state.stars = n;
        drawStars();
        if (!opened) { opened = true; chime('step'); more.append(field('hardest', 'What was the hardest part? (optional)'), field('better', 'What would make this lesson better? (optional)')); }
        save();
      },
    }, '★')));
    word.textContent = state.stars ? STAR_WORDS[state.stars - 1] : '';
  }
  drawStars();
  return h('div.rate',
    h('p.rate-q', 'How was this lesson? ', h('span.rate-xp', `+${XP.rating} XP for rating`)),
    h('div.row', stars, word),
    more,
    h('p.muted.small', 'Your teacher sees ratings without names. ', saved));
}

/**
 * "Confusing?" under a step or check question. `flags` is a Map of target to reason, shared across
 * the lesson so a flag is still showing when the student comes back to that step.
 */
export function confusingButton(lessonId, target, flags) {
  const box = h('div.confuse');
  const send = async (reason, note) => {
    const ok = await attempt(() => app.store.flagStep(lessonId, target, reason, note));
    if (!ok) return;
    if (reason) flags.set(target, reason); else flags.delete(target);
    draw();
  };
  function draw() {
    clear(box);
    if (flags.has(target)) {
      box.append(h('span.small', '🤔 Thanks! Your teacher will see this. '), h('button.linklike', { type: 'button', onclick: () => send('', '') }, 'Undo'));
      return;
    }
    box.append(h('button.linklike', { type: 'button', onclick: open }, '🤔 Confusing?'));
  }
  function open() {
    const note = h('input', { maxlength: 200, placeholder: 'Say more (optional)', 'aria-label': 'Say more about what was confusing' });
    clear(box).append(
      h('p.small', h('strong', 'What was confusing?')),
      h('div.rate-chips', FLAG_CHOICES.map(([key, label]) => h('button.rate-chip', { type: 'button', onclick: () => send(key, note.value) }, label))),
      note,
      h('button.linklike', { type: 'button', onclick: draw }, 'Never mind'));
  }
  draw();
  return box;
}

/**
 * "I'm stuck": a quiet way to ask the teacher for help. getStep() says which step the student is on.
 * Returns { el, stop }.
 */
export function helpBox(lessonId, getStep, startOpen) {
  const el = h('div.help-box');
  let waiting = !!startOpen;
  let timer = null;
  const watch = () => {
    clearInterval(timer);
    // While waiting, check now and then whether the teacher has marked it helped.
    timer = waiting ? setInterval(async () => {
      try { const now = await app.store.myHelp(); if (!now.open) { waiting = false; watch(); draw(); toast('Your teacher marked you as helped.'); } } catch (_) { /* try again next time */ }
    }, 20000) : null;
  };
  function draw() {
    clear(el);
    el.classList.toggle('waiting', waiting);
    if (waiting) {
      el.append(h('p', h('strong', '✋ Help is on the way! '), 'Keep trying while you wait.'),
        h('button.btn.small', { type: 'button', onclick: async () => { if (await attempt(() => app.store.cancelHelp())) { waiting = false; watch(); draw(); } } }, 'I figured it out 👍'));
      return;
    }
    el.append(h('button.btn.small', { type: 'button', onclick: ask }, "✋ I'm stuck: ask for help"));
  }
  function ask() {
    const note = h('input', { maxlength: 140, placeholder: 'What are you stuck on? (optional)', 'aria-label': 'What are you stuck on?' });
    const go = async () => { if (await attempt(() => app.store.askHelp(lessonId, getStep(), note.value))) { waiting = true; watch(); draw(); } };
    clear(el).append(note,
      h('div.row', h('button.btn.small.primary', { type: 'button', onclick: go }, 'Ask my teacher'), h('button.linklike', { type: 'button', onclick: draw }, 'Never mind')),
      h('p.muted.small', 'Only your teacher sees who asked and what you wrote.'));
    note.focus();
  }
  watch();
  draw();
  return { el, stop: () => clearInterval(timer) };
}

// Teacher --------------------------------------------------------------------------------------------

const ago = (iso) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 1 ? 'just now' : `${m} min ago`; };
export const helpPlace = (r) => { const l = getLesson(r.lesson_id); return l ? `${l.title} · Step ${r.step + 1}: ${l.steps[r.step] ? l.steps[r.step].title : ''}` : 'A lesson'; };

/**
 * A live "Needs help" list for one class. It checks every few seconds, and rings twice when a new
 * request arrives. onUpdate(list) lets a page react, for example to mark students on the display.
 * Returns { el, stop }.
 */
export function helpCard(classId, { onUpdate } = {}) {
  const el = h('section.help-card', { 'aria-live': 'polite' });
  let known = null;
  const draw = (list) => {
    clear(el);
    el.classList.toggle('has', list.length > 0);
    if (!list.length) return;
    el.append(h('h2', `✋ ${list.length} need${list.length === 1 ? 's' : ''} help`),
      h('ul.help-list', list.map((r) => h('li',
        h('img', { src: avatarURL(r.avatar || defaultAvatar(r.student_id), 2), alt: '' }),
        h('span.help-who', h('strong', r.display_name), h('span.small', ` ${helpPlace(r)}`), r.note && h('span.help-note', `“${r.note}”`), h('span.muted.small', ` ${ago(r.at)}`)),
        h('button.btn.small', { type: 'button', onclick: async () => { if (await attempt(() => app.store.markHelped(classId, r.student_id))) check(); } }, '✓ Helped')))));
  };
  async function check() {
    let list;
    try { list = await app.store.helpRequests(classId); } catch (_) { return; }
    const ids = list.map((r) => `${r.student_id}@${r.at}`);
    if (known && ids.some((id) => !known.includes(id))) chime('doorbell');
    known = ids;
    draw(list);
    if (onUpdate) onUpdate(list);
  }
  check();
  const timer = setInterval(check, 6000);
  return { el, stop: () => clearInterval(timer), check };
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* a sandboxed frame may refuse: fall back */ }
  const area = h('textarea', { style: 'position:fixed;left:-9999px' });
  area.value = text;
  document.body.append(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  area.remove();
  return ok;
}

/** The class's Feedback tab. */
export async function feedbackTab(cls, students) {
  const entries = (await app.store.lessonRatings(cls.id)).filter((e) => getLesson(e.lesson_id));
  const said = (e) => e.count || Object.keys(e.flags || {}).length || Object.keys(e.help || {}).length || Object.keys(e.quiz || {}).length;
  const useful = entries.filter(said);
  if (!useful.length) {
    return h('section.card.stack', h('h2', 'No feedback yet'),
      h('p', 'As students work, they can mark a step or question as confusing, ask for help, and rate each lesson when they submit it. It all adds up here, without names.'));
  }
  const order = allLessons().map((l) => l.id);
  useful.sort((a, b) => order.indexOf(a.lesson_id) - order.indexOf(b.lesson_id));
  const info = { className: cls.name, students: students.length, date: new Date().toLocaleDateString('en-CA') };
  const report = (only) => buildReport(useful, info, only);
  const copy = async (only) => { toast(await copyText(report(only)) ? 'Report copied. Paste it to Claude.' : "Couldn't copy. Use Download instead.", 'info'); };
  const rated = useful.filter((e) => e.count);
  const total = rated.reduce((a, e) => a + e.count, 0);
  const overall = total ? rated.reduce((a, e) => a + e.average * e.count, 0) / total : 0;

  const card = (e) => {
    const lesson = getLesson(e.lesson_id);
    const steps = troubleSteps(e).slice(0, 4);
    const missed = quizRows(e).filter((q) => q.tries > 0 && q.rate >= 0.3);
    const quotes = [...e.hardest.map((c) => ['Hardest part', c]), ...e.better.map((c) => ['Would be better with', c]), ...e.comments.map((c) => ['Comment', c])];
    return h('section.card.stack.fb-lesson',
      h('div.row.between',
        h('h2', lesson.title),
        h('button.btn.small', { type: 'button', onclick: () => copy(e.lesson_id) }, 'Copy this lesson')),
      h('p.small', e.count ? h('strong', { class: e.average < 3 ? 'warn' : '' }, `★ ${e.average.toFixed(1)} from ${e.count}`) : h('span.muted', 'No ratings yet'),
        ` · ${e.started} started, ${e.finished} finished`),
      steps.length > 0 && h('div', h('h3', 'Steps to look at'), h('ul.fb-list', steps.map((s) => h('li',
        h('strong', `Step ${s.index + 1}: ${s.title}`),
        ` · ${s.flags} confusing${s.flags ? ` (${Object.entries(s.reasons).map(([k, n]) => `${REASONS[k] || k} ${n}`).join(', ')})` : ''}, ${s.help} asked for help`,
        s.notes.length > 0 && h('ul', s.notes.map((n) => h('li.small', `“${n}”`))))))),
      missed.length > 0 && h('div', h('h3', 'Questions often missed on the first try'), h('ul.fb-list', missed.map((q) => h('li', `Q${q.index + 1}: ${q.q} `, h('strong', `${Math.round(q.rate * 100)}% missed (${q.missed} of ${q.tries})`))))),
      quotes.length > 0 && h('details', h('summary', `${quotes.length} comment${quotes.length === 1 ? '' : 's'}`), h('ul.fb-list', quotes.map(([k, c]) => h('li', h('span.muted.small', `${k}: `), c)))));
  };

  return h('div.stack',
    h('section.card.stack',
      h('h2', total ? `★ ${overall.toFixed(1)} average from ${total} rating${total === 1 ? '' : 's'}` : 'Feedback so far'),
      h('div.row',
        h('button.btn.primary', { type: 'button', onclick: () => copy() }, '📋 Copy report for Claude'),
        h('button.btn', { type: 'button', onclick: () => download(`${cls.name}-lesson-feedback.md`, report(), 'text/markdown') }, '⬇ Download .md')),
      h('p.muted.small', 'The report lists each lesson\'s file, its confusing steps, missed questions, ratings, and comments, with no names. Students\' typed notes are included as written, so read it before sharing in case one mentions a name.')),
    useful.map(card));
}
