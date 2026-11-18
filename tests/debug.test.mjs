// The beginner debugger: it must point at the right line, and say nothing when it isn't sure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bracketProblem, missingComma, closestName, explainError, warnings } from '../js/game/debug.js';

const SCENE = 'function setup() {\n  createCanvas(400, 400);\n}\n\nfunction draw() {\n  background(135, 206, 235);\n  ellipse(340, 60, 70, 70);\n}\n';

test('working code has no bracket or comma problems', () => {
  assert.equal(bracketProblem(SCENE), null);
  assert.equal(missingComma(SCENE), null);
  assert.equal(bracketProblem('let s = "a ( { [ b";\n// ) } ]\nlet t = `x\n)`;\n/* { */'), null, 'strings and comments are skipped');
  assert.equal(missingComma('for (let i = 0; i < 10; i++) {}\nif (x > 5 && y < 3) {}\nlet a = (b + c) * 2;\n'), null);
});

test('it finds the exact bracket or quote that is wrong', () => {
  assert.equal(bracketProblem(SCENE.replace('ellipse(340, 60, 70, 70);', 'ellipse(340, 60, 70, 70;')).line, 7);
  assert.equal(bracketProblem(SCENE.replace('function draw() {', 'function draw() ')).line, 8, 'stray } at the end');
  assert.equal(bracketProblem(SCENE.replace('  createCanvas(400, 400);\n}', '  createCanvas(400, 400);\n')).line, 1, 'setup never closed');
  assert.match(bracketProblem('fill(255, 0, 0];').message, /closed with a square bracket/);
  const q = bracketProblem('text("hello, 20, 20);\n');
  assert.equal(q.line, 1);
  assert.match(q.message, /never closed/);
});

test('it spots a missing comma', () => {
  const m = missingComma(SCENE.replace('ellipse(340, 60, 70, 70);', 'ellipse(340 60, 70, 70);'));
  assert.equal(m.line, 7);
  assert.match(m.message, /`340` and `60`/);
});

test('it suggests the name the student probably meant', () => {
  assert.equal(closestName('elipse'), 'ellipse');
  assert.equal(closestName('Rect'), 'rect');
  assert.equal(closestName('createcanvas'), 'createCanvas');
  assert.equal(closestName('playrX', 'let playerX = 5;'), 'playerX');
  assert.equal(closestName('zebraStripes'), null, 'no wild guesses');
  assert.match(explainError('Uncaught ReferenceError: elipse is not defined', SCENE, 7).message, /Did you mean `ellipse`/);
  assert.match(explainError('Uncaught ReferenceError: Rect is not defined', SCENE, 7).message, /Capital letters matter/);
});

test('p5 commands outside setup and draw get their own explanation', () => {
  const code = `ellipse(10, 10, 5, 5);\n${SCENE}`;
  assert.match(explainError('Uncaught ReferenceError: ellipse is not defined', code, 1).message, /only works inside `setup\(\)` or `draw\(\)`/);
});

test('syntax errors are explained from the code, not the browser message', () => {
  const broken = SCENE.replace('ellipse(340, 60, 70, 70);', 'ellipse(340, 60, 70, 70;');
  assert.equal(explainError('Uncaught SyntaxError: missing ) after argument list', broken, 9).line, 7);
  assert.equal(explainError('Uncaught SyntaxError: Unexpected token', SCENE, 3), null, 'no guess when the code looks fine');
});

test('a misspelled draw or setup is flagged', () => {
  assert.deepEqual(warnings(SCENE), []);
  assert.match(warnings(SCENE.replace('function draw()', 'function Draw()'))[0], /`Draw`.*`draw`/);
  assert.match(warnings(SCENE.replace('function setup()', 'function setUp()'))[0], /`setUp`/);
});
