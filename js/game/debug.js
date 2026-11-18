// A beginner's debugger. The browser's own error messages often point at the wrong line and use
// words like "token". These look at the student's code to say exactly what is wrong and where.
// Everything here runs after the browser has already found a problem, so a wrong guess here can
// never stop working code from running.

/** Common p5 and JavaScript names, for "did you mean" suggestions. */
export const KNOWN_NAMES = [
  'setup', 'draw', 'preload', 'createCanvas', 'background', 'fill', 'noFill', 'stroke', 'noStroke', 'strokeWeight',
  'ellipse', 'circle', 'rect', 'square', 'line', 'point', 'triangle', 'quad', 'arc', 'beginShape', 'vertex', 'endShape',
  'text', 'textSize', 'textAlign', 'textFont', 'image', 'loadImage', 'imageMode', 'rectMode', 'ellipseMode',
  'random', 'floor', 'round', 'ceil', 'abs', 'min', 'max', 'dist', 'map', 'constrain', 'sin', 'cos', 'atan2', 'sqrt', 'lerp',
  'push', 'pop', 'translate', 'rotate', 'scale', 'frameCount', 'frameRate', 'millis', 'width', 'height',
  'mouseX', 'mouseY', 'mouseIsPressed', 'mousePressed', 'mouseReleased', 'keyIsDown', 'keyIsPressed', 'keyPressed', 'keyReleased',
  'key', 'keyCode', 'LEFT_ARROW', 'RIGHT_ARROW', 'UP_ARROW', 'DOWN_ARROW', 'CENTER', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'CORNER',
  'noLoop', 'loop', 'console', 'Math', 'let', 'const', 'function', 'return', 'true', 'false', 'if', 'else', 'for', 'while',
  'length', 'push', 'splice', 'class', 'constructor', 'this', 'new', 'WEBGL', 'box', 'sphere', 'plane', 'cylinder', 'cone',
  'orbitControl', 'camera', 'normalMaterial', 'ambientLight', 'directionalLight', 'specularMaterial', 'createVector',
];

/** p5 drawing and setup commands, which only work once p5 has started (inside setup or draw). */
const P5_ONLY = new Set(['createCanvas', 'background', 'fill', 'noFill', 'stroke', 'noStroke', 'strokeWeight', 'ellipse', 'circle',
  'rect', 'square', 'line', 'point', 'triangle', 'quad', 'arc', 'text', 'textSize', 'textAlign', 'image', 'random', 'dist',
  'translate', 'rotate', 'scale', 'push', 'pop', 'width', 'height', 'mouseX', 'mouseY', 'frameCount', 'box', 'sphere']);

const PAIRS = { '(': ')', '[': ']', '{': '}' };
const NAMES = { '(': 'parenthesis (', ')': 'parenthesis )', '[': 'square bracket [', ']': 'square bracket ]', '{': 'curly brace {', '}': 'curly brace }' };

/**
 * Walk the code once, skipping strings and comments, and report the first bracket or quote problem:
 * { line, message } or null. Lines count from 1.
 */
export function bracketProblem(code) {
  const stack = [];
  let line = 1;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === '\n') { line++; continue; }
    if (c === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; i--; continue; }
    if (c === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      for (let k = i; k < stop; k++) if (code[k] === '\n') line++;
      i = stop - 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const start = line;
      let j = i + 1;
      while (j < code.length && code[j] !== c && code[j] !== '\n') { if (code[j] === '\\') j++; j++; }
      if (j >= code.length || code[j] === '\n') return { line: start, message: `This line has a ${c} that is never closed. Text needs a matching ${c} at its end.` };
      i = j;
      continue;
    }
    if (c === '`') {
      const start = line;
      let j = i + 1;
      while (j < code.length && code[j] !== '`') { if (code[j] === '\\') j++; if (code[j] === '\n') line++; j++; }
      if (j >= code.length) return { line: start, message: 'This line starts text with a ` that is never closed.' };
      i = j;
      continue;
    }
    if (PAIRS[c]) stack.push({ c, line });
    else if (c === ')' || c === ']' || c === '}') {
      const open = stack.pop();
      if (!open) return { line, message: `There is an extra ${NAMES[c]} here with nothing to close. Remove it, or add the opening one it belongs to.` };
      if (PAIRS[open.c] !== c) {
        return open.line === line
          ? { line, message: `The ${NAMES[open.c]} on this line is closed with a ${NAMES[c]}. They need to match.` }
          : { line: open.line, message: `The ${NAMES[open.c]} on this line is never closed. Add a ${PAIRS[open.c]} where it should end.` };
      }
    }
  }
  const open = stack.pop();
  if (open) return { line: open.line, message: `The ${NAMES[open.c]} on this line is never closed. Add a ${PAIRS[open.c]} where it should end.` };
  return null;
}

/** Two values side by side with no comma, like ellipse(340 60, 70, 70). */
export function missingComma(code) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].replace(/\/\/.*$/, '').replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
    const m = text.match(/\(([^()]*?)(-?\d+(?:\.\d+)?|[A-Za-z_]\w*)\s+(-?\d+(?:\.\d+)?)/);
    if (m && !/\b(let|const|var|return|new|typeof|of|in)$/.test(m[2])) {
      return { line: i + 1, message: `A comma is missing between \`${m[2]}\` and \`${m[3]}\`. Each number in the parentheses needs a comma between them.` };
    }
  }
  return null;
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

/** Names the student created, so suggestions include their own variables and functions. */
export function declaredNames(code) {
  const out = new Set();
  for (const m of code.matchAll(/\b(?:let|const|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of code.matchAll(/\bfunction\s*\w*\s*\(([^)]*)\)/g)) m[1].split(',').map((x) => x.trim().split('=')[0].trim()).filter(Boolean).forEach((x) => out.add(x));
  return out;
}

/** The closest known name, if it is close enough to be a typo. */
export function closestName(name, code = '') {
  const pool = [...new Set([...declaredNames(code), ...KNOWN_NAMES])].filter((n) => n !== name);
  const lower = name.toLowerCase();
  const sameLetters = pool.find((n) => n.toLowerCase() === lower);
  if (sameLetters) return sameLetters;
  let best = null;
  let bestScore = Infinity;
  for (const n of pool) {
    const d = editDistance(lower, n.toLowerCase());
    if (d < bestScore) { best = n; bestScore = d; }
  }
  const allowed = name.length <= 4 ? 1 : 2;
  return bestScore <= allowed ? best : null;
}

/** Is this line outside every function and block? */
function topLevel(code, lineNumber) {
  const before = code.split('\n').slice(0, lineNumber - 1).join('\n');
  let depth = 0;
  for (const c of before.replace(/(["'`])(?:\\.|(?!\1)[^\n])*\1/g, '').replace(/\/\/.*$/gm, '')) {
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  return depth <= 0;
}

/**
 * Explain an error from the game using the student's code. Returns { line, message } with a better
 * line or message when one can be found, or null to keep the browser's explanation.
 */
export function explainError(raw, code, line) {
  const text = String(raw || '');
  if (/SyntaxError|Unexpected|missing \) after|Invalid or unexpected token|Unterminated/.test(text)) {
    return bracketProblem(code) || missingComma(code);
  }
  const notDefined = text.match(/(\S+) is not defined/);
  if (notDefined) {
    const name = notDefined[1];
    if (P5_ONLY.has(name) && line && topLevel(code, line)) {
      return { line, message: `\`${name}\` only works inside \`setup()\` or \`draw()\`. Move this line between the \`{\` and \`}\` of one of them.` };
    }
    const guess = closestName(name, code);
    if (guess) {
      const caseOnly = guess.toLowerCase() === name.toLowerCase();
      return { line, message: caseOnly
        ? `The computer doesn't know \`${name}\`. Did you mean \`${guess}\`? Capital letters matter.`
        : `The computer doesn't know \`${name}\`. Did you mean \`${guess}\`?` };
    }
    return null;
  }
  const notFunction = text.match(/(\S+) is not a function/);
  if (notFunction) {
    const name = notFunction[1].split('.').pop();
    const guess = closestName(name, code);
    if (guess) return { line, message: `\`${name}\` isn't a command the computer knows. Did you mean \`${guess}\`?` };
  }
  return null;
}

/** Things that aren't errors but stop a game from working, like `function Draw()`. */
export function warnings(code) {
  const out = [];
  for (const want of ['setup', 'draw', 'preload', 'keyPressed', 'mousePressed']) {
    if (new RegExp(`\\bfunction\\s+${want}\\s*\\(`).test(code)) continue;
    const m = code.match(new RegExp(`\\bfunction\\s+(${want.split('').map((ch) => `[${ch.toLowerCase()}${ch.toUpperCase()}]`).join('')})\\s*\\(`));
    if (m && m[1] !== want) out.push(`Your function is called \`${m[1]}\`, but p5 only runs \`${want}\`. Capital letters matter.`);
  }
  return out;
}
