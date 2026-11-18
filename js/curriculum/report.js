// Turns a class's lesson feedback into a Markdown report a teacher can paste to Claude (or anyone)
// to improve the lessons. It names each lesson's source file and numbers steps the way students
// see them. It never includes student names; the totals it is given have none.
import { allLessons, getLesson } from './engine.js';
import { checksFor } from './checks.js';

const FILES = { t: 'trunk.js', p: 'platformer.js', a: 'adventure.js', s: 'arcade.js', m: 'mind.js', c: 'crossings.js', d: 'lowpoly.js', e: 'sound.js' };
export const sourceFile = (lessonId) => `js/curriculum/${FILES[String(lessonId)[0]] || 'trunk.js'}`;
export const REASONS = { unclear: 'the instructions were unclear', broken: "the code didn't work", hard: 'too hard', easy: 'too easy', other: 'other' };
const OLD_REASONS = { instructions: 'the instructions', where: 'where the code goes', code: 'the code itself', errors: 'error messages', questions: 'the check questions' };

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const quote = (text) => `"${String(text).replace(/\s+/g, ' ').trim()}"`;
const reasonList = (reasons) => Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${REASONS[k] || k} ${n}`).join(', ');

/** Steps worth a look, worst first: a "confusing" flag counts double a help request. */
export function troubleSteps(entry) {
  const lesson = getLesson(entry.lesson_id);
  const rows = new Map();
  const row = (i) => { if (!rows.has(i)) rows.set(i, { index: i, title: lesson?.steps[i]?.title || 'Step', flags: 0, reasons: {}, notes: [], help: 0 }); return rows.get(i); };
  for (const [target, tally] of Object.entries(entry.flags || {})) {
    const [kind, n] = target.split(':');
    if (kind !== 'step') continue;
    Object.assign(row(Number(n)), { flags: tally.count, reasons: tally.reasons, notes: tally.notes });
  }
  for (const [n, count] of Object.entries(entry.help || {})) row(Number(n)).help = count;
  return [...rows.values()].sort((a, b) => (b.flags * 2 + b.help) - (a.flags * 2 + a.help) || a.index - b.index);
}

/** Each of the lesson's own check questions, with how many missed it on the first try. */
export function quizRows(entry) {
  return checksFor(entry.lesson_id).map((q, i) => {
    const tally = (entry.quiz || {})[i] || { tries: 0, missed: 0 };
    const flag = (entry.flags || {})[`quiz:${i}`];
    return { index: i, q: q.q, tries: tally.tries, missed: tally.missed, rate: tally.tries ? tally.missed / tally.tries : 0, flags: flag ? flag.count : 0, notes: flag ? flag.notes : [] };
  });
}

function lessonSection(entry) {
  const lesson = getLesson(entry.lesson_id);
  if (!lesson) return '';
  const out = [`## ${lesson.title} (lesson \`${lesson.id}\`)`, '', `File: \`${sourceFile(lesson.id)}\` (the lesson with id \`${lesson.id}\`)`, ''];
  out.push(`- Students started: ${entry.started}, finished: ${entry.finished}`);
  out.push(entry.count
    ? `- Rating: ${entry.average} / 5 from ${entry.count} student${entry.count === 1 ? '' : 's'} (${entry.stars.map((n, i) => `${i + 1}★ ${n}`).join(', ')})`
    : '- Rating: none yet');

  const steps = troubleSteps(entry);
  if (steps.length) {
    out.push('', '### Steps students found confusing or needed help with', '', '| Step | Title | Confusing flags | Reasons | Help requests |', '|---|---|---|---|---|');
    for (const s of steps) out.push(`| ${s.index + 1} | ${cell(s.title)} | ${s.flags} | ${cell(reasonList(s.reasons))} | ${s.help} |`);
    const notes = steps.flatMap((s) => s.notes.map((n) => `- Step ${s.index + 1}: ${quote(n)}`));
    if (notes.length) out.push('', ...notes);
  }

  const quiz = quizRows(entry);
  if (quiz.some((q) => q.tries || q.flags)) {
    out.push('', '### Check questions', '', '| Q | Question | Missed on first try | Confusing flags |', '|---|---|---|---|');
    for (const q of quiz) out.push(`| ${q.index + 1} | ${cell(q.q)} | ${q.tries ? `${Math.round(q.rate * 100)}% (${q.missed}/${q.tries})` : 'no answers yet'} | ${q.flags} |`);
    const notes = quiz.flatMap((q) => q.notes.map((n) => `- Q${q.index + 1}: ${quote(n)}`));
    if (notes.length) out.push('', ...notes);
  }

  const old = Object.entries(entry.confusing || {}).filter(([k]) => k !== 'nothing');
  if (old.length) out.push('', `Students also said these were confusing: ${old.sort((a, b) => b[1] - a[1]).map(([k, n]) => `${OLD_REASONS[k] || k} ${n}`).join(', ')}.`);
  const oldSteps = Object.entries(entry.steps || {});
  if (oldSteps.length) out.push(`They named these steps: ${oldSteps.sort((a, b) => b[1] - a[1]).map(([i, n]) => `Step ${Number(i) + 1} (${lesson.steps[i]?.title || 'Step'}) ${n}`).join(', ')}.`);

  for (const [key, heading] of [['hardest', '"What was the hardest part?"'], ['better', '"What would make this lesson better?"'], ['comments', 'Other comments']]) {
    if ((entry[key] || []).length) out.push('', `### ${heading}`, '', ...entry[key].map((c) => `- ${String(c).replace(/\s+/g, ' ').trim()}`));
  }
  return out.join('\n');
}

/**
 * The whole report, or one lesson's when `only` is its id.
 *   info: { className, students, date }
 */
export function buildReport(entries, info, only) {
  const order = allLessons().map((l) => l.id);
  const list = entries.filter((e) => getLesson(e.lesson_id) && (!only || e.lesson_id === only)).sort((a, b) => order.indexOf(a.lesson_id) - order.indexOf(b.lesson_id));
  const head = [
    '# Pixel Trail lesson feedback', '',
    `${info.className} · ${info.date} · ${info.students} student${info.students === 1 ? '' : 's'} · student names removed`, '',
    'Please use this to improve the lessons in the Pixel Trail repository (p5-lessons). Lessons are JavaScript data in `js/curriculum/` (path given for each lesson). Steps are numbered the way students see them (Step 1 = the first step). The one-line instruction a student sees for a step comes from the step\'s `say` text, or from `js/curriculum/briefs.js` when it is set by hand. Check questions are in `js/curriculum/checks.js`, numbered here in the order they are written there (each has an `after` value that says which step it follows). "Missed" counts first tries only. Read `CLAUDE.md` first: lessons build their own answer keys, and tests enforce word limits.',
  ];
  return `${[...head, ...list.map((e) => `\n${lessonSection(e)}`)].join('\n')}\n`;
}
