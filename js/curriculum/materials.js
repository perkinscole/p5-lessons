// Classroom materials for a lesson: slides to project, a worksheet to print, and a checklist.
//
// Nothing here is written by hand for any one lesson. Every word comes from the lesson's own data
// (its steps, today.js, checks.js, alignment.js), so the materials cannot drift from the lesson:
// change a key idea or a check question and its slide, worksheet line and answer key change too.
// There is no screen code in this file, so tests can build all of it for every lesson.
import { getLesson, briefOf, buildSolution, filesThrough } from './engine.js';
import { checksFor } from './checks.js';
import { todayFor } from './today.js';
import { bigQuestionFor } from './big.js';
import { alignmentFor, standardByCode } from './alignment.js';
import { PATHS, SIDE_TRAILS, sequence, coreSequence, stageOf, isBeyond } from './graph.js';

/**
 * The most words each thing may carry, not counting code or the quoted text of a standard.
 * Students get overwhelmed by text, and a slide has to be read from the back of a room.
 * tests/materials.test.mjs holds every lesson to these.
 */
export const LIMITS = {
  slideWords: 45,      // one slide
  sheetWords: 200,     // the whole student worksheet
  checklistWords: 170, // the whole checklist
  codeLines: 12,       // a question with more code than this is left off slides and paper
  slideQuestions: 2,
  sheetQuestions: 3,
  writingLines: 5,
};

export const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

const LETTERS = 'ABCDEFGH';
const hash = (text) => [...text].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 1000003, 7);

/** The question that carries the lesson's idea somewhere else: the last one after the last step. */
function closingOf(l) {
  const last = checksFor(l.id).filter((q) => q.after === l.steps.length - 1);
  return last.length ? last[last.length - 1] : null;
}

const fits = (q) => q.code.split('\n').length <= LIMITS.codeLines;

/** The lesson's own questions that show code to read, shortest code first kept in lesson order. */
function codeQuestions(l) {
  const closing = closingOf(l);
  return checksFor(l.id).filter((q) => q.code && q !== closing && fits(q));
}

/** Code questions from the lessons before this one on a road, nearest first: something to look back at. */
function lookBack(l, path) {
  const order = sequence(path);
  let at = order.indexOf(l.id);
  if (at < 0) {
    const side = SIDE_TRAILS.find((t) => t.id === l.id);
    at = side ? order.indexOf(side.after) + 1 : 0;
  }
  const out = [];
  for (let i = at - 1; i >= 0; i--) {
    const q = codeQuestions(getLesson(order[i]))[0];
    if (q) out.push(q);
  }
  return out;
}

const roadOf = (l, path) => l.path || (PATHS[path] ? path : 'platformer');

/** Which questions go where. A lesson with several keeps the slides and the worksheet different. */
function pickQuestions(l, path) {
  const own = codeQuestions(l);
  const slides = own.slice(0, own.length >= 4 ? LIMITS.slideQuestions : 1);
  const rest = own.filter((q) => !slides.includes(q));
  const sheet = [...rest, ...slides].slice(0, LIMITS.sheetQuestions).map((q) => ({ q, from: '' }));
  // Most lessons have one code question. A second comes from an earlier lesson, as the warm-ups do.
  for (const q of lookBack(l, roadOf(l, path))) {
    if (sheet.length >= 2) break;
    sheet.push({ q, from: 'Look back' });
  }
  // A lesson with no code to read at all still gets something to predict on a slide.
  const plain = checksFor(l.id).filter((q) => !q.code && q !== closingOf(l));
  return { slides: slides.length ? slides : plain.slice(0, 1), sheet };
}

/** Split text into sentences and pack them into pieces of at most `most` words. */
export function pieces(text, most) {
  const sentences = String(text || '').split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const s of sentences) {
    const last = out[out.length - 1];
    if (last && wordCount(`${last} ${s}`) <= most) out[out.length - 1] = `${last} ${s}`;
    else out.push(s);
  }
  return out;
}

/**
 * The finished game for a lesson, when it can run with nothing but its own code: no sprites,
 * camera, sound files or model to load. Null when there is none to show. The Today card and the
 * "You will build" slide both use this.
 */
export function demoFor(id, path) {
  let code = '';
  try { code = buildSolution(id, path); } catch (_) { return null; }
  if (!code || /SPRITES\.|ml5\.|createCapture|loadSound|loadImage/.test(code)) return null;
  return { code, files: filesThrough(id, path) };
}

function need(id) {
  const l = getLesson(id);
  if (!l) throw new Error(`Unknown lesson: ${id}`);
  return l;
}

// A lesson with nothing in today.js yet still has its concepts: they are named, with no meaning to match.
const ideasOf = (l) => (todayFor(l.id) || { ideas: (l.concepts || []).map((c) => ({ term: c, means: '' })) }).ideas;
const defined = (l) => ideasOf(l).filter((x) => x.means);
const buildOf = (l) => (todayFor(l.id) || { build: l.hook }).build;

/** Where a lesson sits, for the small line above its name. */
export function placeOf(id, path) {
  const l = need(id);
  return { stage: stageOf(id).name, road: l.path ? PATHS[l.path].road : '', extra: isBeyond(id), mins: l.mins };
}

const asked = (q) => ({ q: q.q, code: q.code || '', options: [...q.options], answer: q.answer, why: q.why });

/**
 * Slides for the start of class, in order. Each has a `kind` the screen knows how to draw.
 * A `predict` or `closing` slide carries its answer, which the screen keeps hidden until asked.
 */
export function slidesFor(id, path) {
  const l = need(id);
  const ideas = ideasOf(l);
  const picked = pickQuestions(l, path);
  const closing = closingOf(l);
  const a = alignmentFor(id);
  const codes = a.anchor.length ? a.anchor : a.support;
  return [
    { kind: 'title', title: l.title, ...placeOf(id, path), question: bigQuestionFor(id) },
    { kind: 'build', text: buildOf(l), demo: true },
    ...ideas.map((x, i) => ({ kind: 'idea', n: i + 1, of: ideas.length, term: x.term, means: x.means })),
    ...picked.slides.map((q, i) => ({ kind: 'predict', n: i + 1, of: picked.slides.length, ...asked(q) })),
    { kind: 'map', steps: l.steps.map((s) => ({ title: s.title, mins: s.mins })), mins: l.mins },
    closing && { kind: 'closing', ...asked(closing) },
    ...pieces(l.reflect, 30).map((text) => ({ kind: 'reflect', text })),
    codes.length > 0 && { kind: 'standards', assessed: a.anchor.length > 0, items: codes.map((c) => ({ code: c, text: standardByCode(c).text })) },
  ].filter(Boolean);
}

/** The key ideas in a mixed-up order that is the same every time, and never the order they were taught in. */
function mixed(l) {
  const ideas = defined(l);
  let order = ideas.map((_, i) => i).sort((x, y) => hash(l.id + ideas[x].term) - hash(l.id + ideas[y].term) || x - y);
  if (order.length > 1 && order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
  return order;
}

/**
 * The student's worksheet. It holds no answers: nothing here says which meaning goes with which
 * idea or which option is right. Those are only in answerKeyFor.
 */
export function worksheetFor(id, path) {
  const l = need(id);
  const ideas = defined(l);
  const order = mixed(l);
  const questions = pickQuestions(l, path).sheet.map(({ q, from }) => ({ q: q.q, code: q.code, options: [...q.options], from }));
  const codeLines = questions.reduce((sum, q) => sum + q.code.split('\n').length, 0);
  return {
    title: l.title,
    ...placeOf(id, path),
    terms: ideas.map((x) => x.term),
    meanings: order.map((i, at) => ({ letter: LETTERS[at], means: ideas[i].means })),
    questions,
    reflect: l.reflect || '',
    // A page only holds so much: three questions, or a long piece of code, leave room for one line fewer.
    lines: LIMITS.writingLines - (questions.length > 2 || codeLines > 8 ? 1 : 0),
  };
}

/** The teacher's answers for the worksheet, with what the lesson is evidence of. */
export function answerKeyFor(id, path) {
  const l = need(id);
  const ideas = defined(l);
  const order = mixed(l);
  const a = alignmentFor(id);
  const std = (c) => ({ code: c, text: standardByCode(c).text });
  return {
    title: l.title,
    ...placeOf(id, path),
    matches: ideas.map((x, i) => ({ term: x.term, letter: LETTERS[order.indexOf(i)], means: x.means })),
    questions: pickQuestions(l, path).sheet.map(({ q }) => ({ q: q.q, letter: LETTERS[q.answer], option: q.options[q.answer], why: q.why })),
    evidence: a.evidence,
    assessed: a.anchor.map(std),
    practiced: a.support.map(std),
  };
}

/**
 * The checklist: a box for each step under the name students see on it, the stretch goals, and
 * an "I can" line for each key idea. A step where the student works without the code shown
 * (`reveal`) also carries its goal, since there the name alone does not say what to do.
 */
export function checklistFor(id, path) {
  const l = need(id);
  return {
    title: l.title,
    ...placeOf(id, path),
    steps: l.steps.map((s) => ({ title: s.title, goal: s.reveal ? briefOf(s).brief.split(/\n{2,}/).pop() : '' })),
    stretch: [...(l.stretch || [])],
    ican: ideasOf(l).map((x) => ({ lead: 'I can explain', term: x.term, tail: 'to a classmate.' })),
  };
}

/** Everything for one lesson. */
export function materialsFor(id, path) {
  return { slides: slidesFor(id, path), worksheet: worksheetFor(id, path), key: answerKeyFor(id, path), checklist: checklistFor(id, path) };
}

/** The core lessons of a road in order: what "print all worksheets for this road" prints. */
export const roadLessons = (path) => coreSequence(PATHS[path] ? path : 'platformer');

// ---- Counting words, for the limits above. Code and quoted standards are not counted. ----

export function slideWords(s) {
  const options = (s.options || []).join(' ');
  if (s.kind === 'title') return wordCount(`${s.title} ${s.question}`);
  if (s.kind === 'build' || s.kind === 'reflect') return wordCount(s.text);
  if (s.kind === 'idea') return wordCount(`${s.term} ${s.means}`);
  if (s.kind === 'map') return wordCount(s.steps.map((x) => x.title).join(' '));
  if (s.kind === 'predict' || s.kind === 'closing') return wordCount(`${s.q} ${options} ${s.why}`);
  return 0;
}

export function sheetWords(w) {
  return wordCount([w.title, ...w.terms, ...w.meanings.map((m) => m.means), ...w.questions.flatMap((q) => [q.q, ...q.options]), w.reflect].join(' '));
}

export function checklistWords(c) {
  return wordCount([c.title, ...c.steps.flatMap((s) => [s.title, s.goal]), ...c.stretch, ...c.ican.flatMap((x) => [x.lead, x.term, x.tail])].join(' '));
}
