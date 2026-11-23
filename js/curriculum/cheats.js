// The code cheat sheet: every command a student has met so far, what it does, and a real line that
// uses it. No screen code here, so tests can check it.
//
// Nothing is written per lesson. CODE says what each command means, once. Which lesson a command
// belongs to is worked out from the lesson's own code: it is listed under the first lesson, in the
// order given, whose steps use it. The example line is taken from that lesson too. A test fails if
// a lesson uses a built-in command that has no entry here, so the sheet cannot fall behind.
import { getLesson } from './engine.js';
import { todayFor } from './today.js';

// form: how it is written. does: one plain sentence. A key starting with "." is something you
// write after a dot, like list.push(item).
export const CODE = {
  // The two functions every sketch has
  setup: { form: 'function setup() { }', does: 'Runs once, when your program starts. Make the canvas here.' },
  draw: { form: 'function draw() { }', does: 'Runs again and again, about 60 times a second. Each run paints one picture.' },
  createCanvas: { form: 'createCanvas(width, height)', does: 'Makes the square you draw on, this many dots wide and tall.' },
  background: { form: 'background(red, green, blue)', does: 'Paints over the whole canvas with one color, wiping the last picture.' },
  // Shapes
  ellipse: { form: 'ellipse(x, y, width, height)', does: 'Draws a circle or oval. x and y are its center.' },
  rect: { form: 'rect(x, y, width, height)', does: 'Draws a rectangle. x and y are its top-left corner.' },
  line: { form: 'line(x1, y1, x2, y2)', does: 'Draws a straight line from one spot to another.' },
  triangle: { form: 'triangle(x1, y1, x2, y2, x3, y3)', does: 'Draws a triangle between three spots.' },
  // Color and style
  fill: { form: 'fill(red, green, blue)', does: 'Sets the color for every shape drawn after it. Each number is 0 to 255.' },
  stroke: { form: 'stroke(red, green, blue)', does: 'Sets the color of the outline around shapes drawn after it.' },
  noStroke: { form: 'noStroke()', does: 'Turns off the outline around shapes drawn after it.' },
  strokeWeight: { form: 'strokeWeight(thickness)', does: 'Sets how thick outlines and lines are.' },
  noFill: { form: 'noFill()', does: 'Draws shapes after it as outlines only, with nothing inside.' },
  // Words on screen
  text: { form: 'text(words, x, y)', does: 'Draws words or a value on the canvas at a spot.' },
  textSize: { form: 'textSize(size)', does: 'Sets how big the letters are for text drawn after it.' },
  textAlign: { form: 'textAlign(CENTER)', does: 'Lines text up to the left, center, or right of its x.' },
  // Variables
  let: { form: 'let name = value;', does: 'Makes a variable: a name that holds a value your code can change.' },
  const: { form: 'const name = value;', does: 'Makes a name for a value that never changes.' },
  true: { form: 'true', does: 'The value for yes. Used with false to remember if something is on or off.' },
  false: { form: 'false', does: 'The value for no. Used with true to remember if something is on or off.' },
  // Decisions and loops
  if: { form: 'if (question) { }', does: 'Runs the code in its { } only when the answer to the question is yes.' },
  else: { form: 'else { }', does: 'Comes after an if. Runs its code when the answer was no.' },
  for: { form: 'for (let i = 0; i < 10; i++) { }', does: 'Repeats the code in its { } a set number of times, counting with i.' },
  while: { form: 'while (question) { }', does: 'Repeats the code in its { } for as long as the answer is yes.' },
  // Your own functions
  function: { form: 'function name() { }', does: 'Makes a named set of instructions you can run by writing its name.' },
  return: { form: 'return value;', does: 'Ends a function and hands a value back to the line that called it.' },
  // Mouse and keyboard
  mouseX: { form: 'mouseX', does: 'How far across the mouse is. p5 changes it for you every frame.' },
  mouseY: { form: 'mouseY', does: 'How far down the mouse is. p5 changes it for you every frame.' },
  mouseIsPressed: { form: 'mouseIsPressed', does: 'True while the mouse button is held down, false when it is not.' },
  mousePressed: { form: 'function mousePressed() { }', does: 'p5 runs this once each time the mouse is clicked.' },
  keyPressed: { form: 'function keyPressed() { }', does: 'p5 runs this once each time a key is pressed.' },
  key: { form: 'key', does: 'The key that was just pressed, such as "a" or " " for the space bar.' },
  keyCode: { form: 'keyCode', does: 'A number for the key just pressed. Used for arrow keys.' },
  keyIsDown: { form: 'keyIsDown(LEFT_ARROW)', does: 'True while that key is being held down. Good for smooth movement.' },
  LEFT_ARROW: { form: 'LEFT_ARROW', does: 'The name of the left arrow key, for keyIsDown or keyCode.' },
  RIGHT_ARROW: { form: 'RIGHT_ARROW', does: 'The name of the right arrow key, for keyIsDown or keyCode.' },
  UP_ARROW: { form: 'UP_ARROW', does: 'The name of the up arrow key, for keyIsDown or keyCode.' },
  DOWN_ARROW: { form: 'DOWN_ARROW', does: 'The name of the down arrow key, for keyIsDown or keyCode.' },
  // Numbers p5 keeps for you
  width: { form: 'width', does: 'How wide the canvas is. Use it so your code still fits a different size.' },
  height: { form: 'height', does: 'How tall the canvas is. Use it so your code still fits a different size.' },
  frameCount: { form: 'frameCount', does: 'How many times draw() has run so far. It keeps counting up.' },
  PI: { form: 'PI', does: 'The number pi, about 3.14. Half a turn, when measuring angles.' },
  // Math helpers
  random: { form: 'random(low, high)', does: 'Gives a different number each time, somewhere between the two.' },
  constrain: { form: 'constrain(value, low, high)', does: 'Keeps a value from going below low or above high.' },
  dist: { form: 'dist(x1, y1, x2, y2)', does: 'How far apart two spots are. Used to tell if things touch.' },
  floor: { form: 'floor(number)', does: 'Rounds down to a whole number.' },
  ceil: { form: 'ceil(number)', does: 'Rounds up to a whole number.' },
  round: { form: 'round(number)', does: 'Rounds to the nearest whole number.' },
  abs: { form: 'abs(number)', does: 'Makes a number positive. Good for how far apart two values are.' },
  max: { form: 'max(a, b)', does: 'Gives back whichever number is bigger.' },
  min: { form: 'min(a, b)', does: 'Gives back whichever number is smaller.' },
  pow: { form: 'pow(base, power)', does: 'Multiplies a number by itself that many times.' },
  sin: { form: 'sin(angle)', does: 'Swings smoothly between -1 and 1 as the angle grows. Good for waves.' },
  cos: { form: 'cos(angle)', does: 'Swings smoothly between -1 and 1, a quarter turn ahead of sin.' },
  atan2: { form: 'atan2(y, x)', does: 'The angle that points from one spot toward another.' },
  lerp: { form: 'lerp(start, end, amount)', does: 'A value part of the way from start to end. 0.5 is halfway.' },
  noise: { form: 'noise(x)', does: 'A number that drifts smoothly instead of jumping. Good for hills.' },
  noiseSeed: { form: 'noiseSeed(number)', does: 'Makes noise() give the same hills every time.' },
  randomSeed: { form: 'randomSeed(number)', does: 'Makes random() give the same numbers every time.' },
  arc: { form: 'arc(x, y, width, height, start, stop)', does: 'Draws part of a circle, like a smile or a slice of pie.' },
  // Stopping, pictures
  noLoop: { form: 'noLoop()', does: 'Stops draw() from running again, so the picture freezes.' },
  preload: { form: 'function preload() { }', does: 'Runs before setup(). Load your pictures here so they are ready.' },
  loadImage: { form: 'loadImage("name.png")', does: 'Loads a picture so you can draw it later.' },
  image: { form: 'image(picture, x, y, width, height)', does: 'Draws a loaded picture on the canvas.' },
  noSmooth: { form: 'noSmooth()', does: 'Keeps pixel art sharp instead of blurry when it is drawn bigger.' },
  // Lists
  '.push': { form: 'list.push(item)', does: 'Adds an item to the end of a list.' },
  '.splice': { form: 'list.splice(index, 1)', does: 'Removes the item at that place in a list.' },
  '.shift': { form: 'list.shift()', does: 'Removes the first item from a list and gives it to you.' },
  '.indexOf': { form: 'list.indexOf(item)', does: 'The place of an item in a list, or -1 if it is not there.' },
  // Classes
  class: { form: 'class Name { }', does: 'A blueprint for making many things of the same kind.' },
  constructor: { form: 'constructor() { }', does: 'Inside a class. Runs once for each new thing, to set its starting values.' },
  this: { form: 'this.x', does: 'Inside a class, means "the one thing this code is running for".' },
  new: { form: 'new Name()', does: 'Makes one new thing from a class.' },
  // Moving the whole drawing
  translate: { form: 'translate(x, y)', does: 'Moves where drawing starts from, for everything drawn after it.' },
  push: { form: 'push()', does: 'Remembers the drawing settings, so a change can be undone with pop().' },
  pop: { form: 'pop()', does: 'Puts the drawing settings back to how they were at the last push().' },
  // 3D
  WEBGL: { form: 'createCanvas(400, 400, WEBGL)', does: 'Makes a 3D canvas. (0, 0) is then the middle, not the corner.' },
  box: { form: 'box(width, height, depth)', does: 'Draws a 3D box.' },
  sphere: { form: 'sphere(radius)', does: 'Draws a 3D ball.' },
  cylinder: { form: 'cylinder(radius, height)', does: 'Draws a 3D tube.' },
  cone: { form: 'cone(radius, height)', does: 'Draws a 3D cone.' },
  rotateX: { form: 'rotateX(angle)', does: 'Tips everything drawn after it forward or back.' },
  rotateY: { form: 'rotateY(angle)', does: 'Spins everything drawn after it left or right.' },
  ambientLight: { form: 'ambientLight(brightness)', does: 'Soft light from everywhere, so nothing in 3D is fully dark.' },
  directionalLight: { form: 'directionalLight(r, g, b, x, y, z)', does: 'Light from one direction, like the sun, so 3D shapes have shaded sides.' },
  camera: { form: 'camera(x, y, z, lookX, lookY, lookZ)', does: 'Puts the viewer at one spot in 3D, looking at another.' },
  perspective: { form: 'perspective(angle)', does: 'Sets how wide the 3D view is, like zooming a camera lens.' },
  beginShape: { form: 'beginShape()', does: 'Starts a shape you build corner by corner with vertex().' },
  vertex: { form: 'vertex(x, y, z)', does: 'Adds one corner to the shape being built.' },
  endShape: { form: 'endShape(CLOSE)', does: 'Finishes the shape started with beginShape().' },
  buildGeometry: { form: 'buildGeometry(makeIt)', does: 'Builds a 3D model once, so drawing it many times stays fast.' },
  model: { form: 'model(shape)', does: 'Draws a 3D model made with buildGeometry().' },
  // Sound
  playSound: { form: 'playSound("name")', does: 'Plays one of your sound effects once.' },
  playMusic: { form: 'playMusic("name")', does: 'Starts one of your songs playing.' },
  stopMusic: { form: 'stopMusic()', does: 'Stops the song that is playing.' },
  playNote: { form: 'playNote(note, seconds)', does: 'Plays one musical note for a short time.' },
  // On the page, outside the canvas
  createDiv: { form: 'createDiv("words")', does: 'Puts words on the page outside the canvas, such as a score board.' },
  createCapture: { form: 'createCapture(VIDEO)', does: 'Turns on the camera, so your code can use what it sees.' },
  // Machine learning
  '.neuralNetwork': { form: 'ml5.neuralNetwork(options)', does: 'Makes a small brain that can learn from examples.' },
  '.addData': { form: 'brain.addData(inputs, answer)', does: 'Gives the brain one example to learn from.' },
  '.normalizeData': { form: 'brain.normalizeData()', does: 'Gets the examples ready, so big and small numbers count fairly.' },
  '.train': { form: 'brain.train(options, whenDone)', does: 'Has the brain study its examples. This takes a moment.' },
  '.imageClassifier': { form: 'ml5.imageClassifier(model)', does: 'Loads a trained model that can name what the camera sees.' },
  '.classifyStart': { form: 'classifier.classifyStart(video, gotResult)', does: 'Keeps asking the model what it sees, and tells you each answer.' },
  '.classify': { form: 'brain.classify(inputs, gotGuess)', does: 'Asks the trained brain for its best guess.' },
};

/** Plumbing a lesson's code needs but that is not worth a line on the sheet. */
export const NOT_LISTED = new Set(['.size', '.hide', '.computeNormals', '.position', '.style', '.html']);

/** Every piece of code a lesson shows or hands the student: its steps, its starter, and helper files. */
function codeIn(lesson) {
  return [lesson.starter, ...lesson.steps.flatMap((s) => [s.code, ...(s.edits || []).map((e) => e.code), s.provides && s.provides.code])].filter(Boolean).join('\n');
}

/** The commands and keywords a piece of code uses, as CODE keys, in the order they first appear. */
export function tokensIn(src) {
  const found = new Map();
  const note = (key, at) => { if (!found.has(key)) found.set(key, at); };
  const clean = String(src).replace(/\/\/[^\n]*/g, '').replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
  for (const m of clean.matchAll(/(\.?)\b([A-Za-z_]\w*)\s*\(/g)) note(m[1] + m[2], m.index);
  for (const m of clean.matchAll(/\b[A-Za-z_]\w*\b/g)) if (Object.prototype.hasOwnProperty.call(CODE, m[0])) note(m[0], m.index);
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
}

/** Names a lesson's own code makes (its functions and classes), which are not built-in commands. */
export function namesMadeIn(src) {
  const text = String(src);
  // Functions and classes by name, and the methods written inside a class: `show() {`.
  return new Set([...text.matchAll(/\b(?:function|class)\s+([A-Za-z_]\w*)/g), ...text.matchAll(/^\s*([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/gm)]
    .map((m) => m[1]).filter((n) => !['if', 'for', 'while', 'function', 'switch'].includes(n)));
}

/** The first line of a lesson's code that uses a command, to show it in use. */
function exampleOf(key, src) {
  const name = key.replace(/^\./, '');
  const test = key.startsWith('.') ? new RegExp(`\\.${name}\\s*\\(`) : new RegExp(`(^|[^.\\w])${name}\\b`);
  const line = String(src).split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('//') && test.test(l));
  // A line that only opens a function shows nothing the form above it doesn't.
  return line && line.length <= 70 && !/^function\b/.test(line) ? line : '';
}

/**
 * The cheat sheet for a student who has met these lessons, in this order. One section per lesson
 * that taught new code: { lesson_id, title, items: [{ key, form, does, example }], ideas }.
 * A command is listed once, under the first lesson that used it.
 */
export function cheatSheet(lessonIds) {
  const seen = new Set();
  const sheet = [];
  for (const id of lessonIds) {
    const lesson = getLesson(id);
    if (!lesson || sheet.some((s) => s.lesson_id === id)) continue;
    const src = codeIn(lesson);
    const items = [];
    for (const key of tokensIn(src)) {
      if (seen.has(key) || !Object.prototype.hasOwnProperty.call(CODE, key)) continue;
      seen.add(key);
      items.push({ key, form: CODE[key].form, does: CODE[key].does, example: exampleOf(key, src) });
    }
    const today = todayFor(id);
    if (items.length) sheet.push({ lesson_id: id, title: lesson.title, items, ideas: today ? today.ideas.map((x) => ({ term: x.term, means: x.means })) : [] });
  }
  return sheet;
}

export { codeIn };
