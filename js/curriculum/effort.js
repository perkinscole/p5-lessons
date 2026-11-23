// Signs that a lesson was clicked through instead of done, for the teacher only. No screen code
// here, so tests can check it.
//
// These are things worth a look, never a verdict: a checker can miss a correct answer, and a
// student can guess badly and still have learned. Nothing here may feed points, ranks, or badges,
// and none of it belongs on the projected display.
import { getLesson } from './engine.js';
import { checksFor } from './checks.js';

const wordsIn = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const squash = (code) => String(code || '').replace(/\s+/g, '');

/**
 * What one piece of work shows about the effort behind it.
 *   work: a row from classWork or getWorkFull. Pass `code` (as getWorkFull has it) to also check
 *         whether the code was changed at all.
 * Returns { level: 'ok' | 'look' | 'rushed', notes: [why it is worth a look], facts: [what was done] }.
 */
export function effortOf(work, code) {
  const lesson = work && getLesson(work.lesson_id);
  if (!lesson) return { level: 'ok', notes: [], facts: [] };
  const notes = [];
  const facts = [];

  const total = Number(work.checks_total) || lesson.steps.filter((s) => s.check).length;
  const passed = Math.min(total, Number(work.checks_passed) || 0);
  if (total > 0) {
    facts.push(`${passed} of ${total} steps done`);
    if (passed / total < 0.6) notes.push(`Only ${passed} of ${total} steps were done. The rest were skipped.`);
  }

  // Each question's first try, right or wrong. Near what guessing gives is worth a look.
  const tries = Object.values(work.quiz_first && typeof work.quiz_first === 'object' ? work.quiz_first : {});
  const asked = checksFor(lesson.id).length;
  const right = tries.filter(Boolean).length;
  if (tries.length > 0) {
    facts.push(`${right} of ${tries.length} questions right on the first try`);
    if (tries.length >= 3 && right / tries.length <= 1 / 3) notes.push(`${right} of ${tries.length} questions were right on the first try, about what guessing gives.`);
  } else if (asked > 0) {
    facts.push('No question answers recorded');
  }

  const words = wordsIn(work.reflection);
  facts.push(words ? `Reflection: ${words} word${words === 1 ? '' : 's'}` : 'No reflection');
  if (words === 0) notes.push('The reflection is blank.');
  else if (words < 4) notes.push(`The reflection is ${words} word${words === 1 ? '' : 's'} long.`);

  if (code !== undefined && lesson.starter && squash(code) === squash(lesson.starter)) {
    notes.push('The code is the same as when the lesson began. Nothing was typed.');
  }

  return { level: notes.length >= 2 ? 'rushed' : notes.length === 1 ? 'look' : 'ok', notes, facts };
}

/** Handed-in work that deserves a closer look, most worrying first. */
export function worthALook(works) {
  return works.filter((w) => w.status === 'submitted' || w.status === 'approved')
    .map((w) => ({ work: w, effort: effortOf(w) }))
    .filter((x) => x.effort.level !== 'ok')
    .sort((a, b) => b.effort.notes.length - a.effort.notes.length || (b.work.submitted_at || '').localeCompare(a.work.submitted_at || ''));
}
