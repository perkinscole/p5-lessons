// Lesson engine: one source of truth for what a lesson teaches and what its answer is.
// Each step's `code` + `at` is both what students are shown and the edit that builds
// the lesson's solution, so instructions and the answer key can never drift apart.

const REGISTRY = new Map();

/** Register a lesson definition. See docs/ADDING_LESSONS.md for the format. */
export function lesson(def) {
  if (REGISTRY.has(def.id)) throw new Error(`Duplicate lesson id: ${def.id}`);
  REGISTRY.set(def.id, def);
  return def;
}

export const getLesson = (id) => REGISTRY.get(id);
export const allLessons = () => [...REGISTRY.values()];

/** Remove comments so checks can't be satisfied by commented-out code. */
export function stripComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '"' || c === "'" || c === '`') {
      const start = i;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      out += src.slice(start, i);
    } else if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

function lineBounds(src, idx) {
  const start = src.lastIndexOf('\n', idx) + 1;
  let end = src.indexOf('\n', idx);
  if (end === -1) end = src.length;
  return { start, end };
}

/** Find the index of the closing brace matching the first `{` at or after `from`. */
function matchingBrace(src, from) {
  let depth = 0;
  for (let i = src.indexOf('{', from); i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Apply one edit to source code. `at` is one of:
 *   { after: 'text' }    insert below the line containing text
 *   { before: 'text' }   insert above the line containing text
 *   { replace: 'text' }  swap that exact text for the code
 *   { endOf: 'text' }    insert just before the closing brace of the block opened after text
 *   { top: true }        insert at the very top
 *   { end: true }        append at the bottom
 */
export function applyEdit(src, code, at) {
  const need = (needle) => {
    const i = src.indexOf(needle);
    if (i === -1) throw new Error(`Anchor not found: ${JSON.stringify(needle)}`);
    return i;
  };
  if (at.top) return `${code}\n${src}`;
  if (at.end) return `${src.replace(/\s*$/, '')}\n\n${code}\n`;
  if (at.replace !== undefined) {
    const i = need(at.replace);
    return src.slice(0, i) + code + src.slice(i + at.replace.length);
  }
  if (at.after !== undefined) {
    const { end } = lineBounds(src, need(at.after));
    return `${src.slice(0, end)}\n${code}${src.slice(end)}`;
  }
  if (at.before !== undefined) {
    const { start } = lineBounds(src, need(at.before));
    return `${src.slice(0, start)}${code}\n${src.slice(start)}`;
  }
  if (at.endOf !== undefined) {
    const close = matchingBrace(src, need(at.endOf));
    if (close === -1) throw new Error(`No block after: ${at.endOf}`);
    const { start } = lineBounds(src, close);
    return `${src.slice(0, start)}${code}\n${src.slice(start)}`;
  }
  throw new Error(`Unknown edit position: ${JSON.stringify(at)}`);
}

/**
 * Where a step's code goes in the student's own code, as a line number, so the lesson can say
 * "new line after line 6". Matches the anchor's first line ignoring spaces, since students indent
 * their own way. Returns null when the student's code no longer has the anchor.
 *   { line, how }  how: 'after' | 'before' | 'replace' | 'top' | 'end'
 */
export function placeFor(src, at) {
  if (!at) return null;
  const lines = src.split('\n');
  const squash = (t) => t.replace(/\s+/g, '');
  const find = (needle) => {
    const first = squash(String(needle).split('\n')[0]);
    if (!first) return -1;
    return lines.findIndex((l) => squash(l).includes(first));
  };
  if (at.top) return { line: 1, how: 'top' };
  if (at.end) {
    let last = lines.length;
    while (last > 1 && !lines[last - 1].trim()) last--;
    return { line: last, how: 'end' };
  }
  if (at.replace !== undefined) { const i = find(at.replace); return i < 0 ? null : { line: i + 1, how: 'replace' }; }
  if (at.after !== undefined) {
    const i = find(at.after);
    if (i < 0) return null;
    // An anchor can span lines; the new code goes after its last line.
    const span = String(at.after).split('\n').length - 1;
    return { line: i + 1 + span, how: 'after' };
  }
  if (at.before !== undefined) { const i = find(at.before); return i < 0 ? null : { line: i + 1, how: 'before' }; }
  if (at.endOf !== undefined) {
    const i = find(at.endOf);
    if (i < 0) return null;
    const offset = lines.slice(0, i).reduce((a, l) => a + l.length + 1, 0);
    const close = matchingBrace(src, offset);
    if (close === -1) return null;
    return { line: src.slice(0, close).split('\n').length, how: 'before' };
  }
  return null;
}

/** The code a lesson starts from when the student has no saved prior work. */
export function fallbackStarter(l, prevId, path) {
  if (l.starter !== undefined) return l.starter;
  if (!prevId) throw new Error(`${l.id} continues but has no previous lesson`);
  return buildSolution(prevId, path);
}

const solutionCache = new Map();
let previousOf = () => null;

/** Injected by graph.js so a lesson can find what it continues from on a given path. */
export function setPreviousResolver(fn) {
  previousOf = fn;
  solutionCache.clear();
}

/** Apply a step's starter skeleton: the structure, with TODOs for students to finish. */
export function applySkeleton(src, step) {
  return step.skeleton.reduce((code, e) => applyEdit(code, e.code, e.at), src);
}

/** Starter + every step's edit, in order: the complete working answer. */
export function buildSolution(id, path) {
  const key = `${id}:${path || ''}`;
  if (solutionCache.has(key)) return solutionCache.get(key);
  const src = buildThrough(id, path, Infinity);
  solutionCache.set(key, src);
  return src;
}

/** The working code after the first `count` steps. */
export function buildThrough(id, path, count) {
  const l = getLesson(id);
  if (!l) throw new Error(`Unknown lesson: ${id}`);
  let src = fallbackStarter(l, previousOf(id, path), path);
  for (const s of l.steps.slice(0, count)) {
    const edits = s.edits || (s.code !== undefined && s.at ? [{ code: s.code, at: s.at }] : []);
    for (const e of edits) {
      try {
        src = applyEdit(src, e.code, e.at);
      } catch (err) {
        throw new Error(`${id} / "${s.title}" (${path || 'no path'}): ${err.message}`);
      }
    }
  }
  return src;
}

/** Finished helper files the lesson chain has handed the student, after the first `count` steps. */
export function filesThrough(id, path, count = Infinity) {
  const l = getLesson(id);
  const prev = l.starter === undefined ? previousOf(id, path) : null;
  const files = prev ? filesThrough(prev, path) : {};
  for (const s of l.steps.slice(0, count)) if (s.provides) files[s.provides.name] = s.provides.code;
  return files;
}

/** Evaluate a step's checks against student code. Returns true when all pass. */
export function stepPasses(step, code) {
  if (!step.check) return true;
  const clean = stripComments(code);
  const checks = Array.isArray(step.check) ? step.check : [step.check];
  return checks.every((re) => re.test(clean));
}

export function checkSummary(l, code) {
  const results = l.steps.map((s) => stepPasses(s, code));
  return { results, passed: results.filter(Boolean).length, total: results.length };
}

const DOING = /^(Add|Replace|Write|Change|Make|Create|Press|Run|Use|Put|Click|Open|Try|Move|Draw|Show|Call|Give|Play|Pick|Set|Have|Cut|Delete|Comment|Keep|Talk|Sketch|Read|Ask|Wrap|Build|Start|Show|Reset|Test|Swap|Rearrange|Tune|Replay|Name|Finish|Choose|Look|Grab|Install|Spread|Place|Inside|Above|Below|Just|In |At the|Now use)\b/;

/**
 * Split a step's text into the one thing to do now, and the explanation to keep folded.
 * A step can set `brief` to say it by hand.
 */
export function briefOf(step) {
  const say = step.say || '';
  const sentences = say.split(/(?<=[.!?:])\s+(?=[A-Z`*])/).map((x) => x.trim()).filter(Boolean);
  if (step.brief) return { brief: step.brief, more: say };
  const doing = sentences.filter((x) => DOING.test(x.replace(/^\*+/, '')) && !x.startsWith('- '));
  const chosen = (doing.length ? doing : sentences).slice(doing.length ? -2 : 0, doing.length ? undefined : 1);
  const more = sentences.filter((x) => !chosen.includes(x)).join(' ');
  return { brief: chosen.join(' '), more };
}

/** Default rubric; a lesson may override with its own `rubric`. */
export const DEFAULT_RUBRIC = [
  { id: 'works', label: 'It runs', levels: ['Crashes or empty', 'Runs with errors', 'Runs as expected', 'Runs smoothly, no bugs found'] },
  { id: 'concept', label: 'Uses the concept', levels: ['Not used', 'Copied without changes', 'Used correctly', 'Used in a way of their own'] },
  { id: 'own', label: 'Made it their own', levels: ['No changes', 'Small changes', 'Clear personal choices', 'Went past the stretch goals'] },
];
export const rubricFor = (l) => l.rubric || DEFAULT_RUBRIC;
