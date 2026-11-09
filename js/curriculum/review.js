// One question from an earlier lesson, as a warm-up. Coming back to an idea after a gap is what
// makes it stick, so the lesson right before this one is left out.
import { sequence } from './graph.js';
import { checksFor } from './checks.js';

const pick = (text, size) => [...text].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7) % size;

export function reviewFor(lessonId, path) {
  const order = sequence(path);
  const at = order.indexOf(lessonId);
  if (at < 2) return null;
  const pool = order.slice(Math.max(0, at - 8), at - 1).flatMap((id) => checksFor(id).filter((q) => q.code).map((q) => ({ ...q, after: -1, review: true })));
  return pool.length ? pool[pick(lessonId, pool.length)] : null;
}
