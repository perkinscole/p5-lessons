// What each lesson builds and the few ideas it turns on. Shown on the "Today" card when a student
// first opens a lesson, and again behind the "Key ideas" button.
//
// Keep each `build` to one sentence about the thing made, and each idea to one plain sentence a
// student could say back. Two to five ideas a lesson: these are the words worth knowing, not a
// list of everything on the page. A lesson with no entry shows its hook and concept names instead.

const TODAY = {
  t1: {
    build: 'A scene with a sun, the ground, and a character you design.',
    ideas: [
      { term: 'canvas', means: 'The square your code draws on. Yours is 400 dots wide and 400 tall.' },
      { term: 'coordinates (x, y)', means: 'A position on the canvas. x counts from the left, and y counts down from the top.' },
      { term: 'function', means: 'A named set of instructions, like draw(). Its code sits between { and }.' },
      { term: 'braces { }', means: '{ opens a function and } closes it. Every { needs its own }.' },
      { term: 'function call', means: 'A line that runs a command: its name, then numbers in ( ), then a ;' },
    ],
  },
  t2: {
    build: 'A monster with a face, in your own colors.',
    ideas: [
      { term: 'fill(red, green, blue)', means: 'Sets the color for every shape drawn after it. Each number is 0 to 255.' },
      { term: 'sequence', means: 'Code runs from top to bottom, one line at a time.' },
      { term: 'layering', means: 'A shape drawn later sits on top of the shapes drawn before it.' },
    ],
  },
  t3: {
    build: 'A night sky where a flying saucer moves by itself.',
    ideas: [
      { term: 'variable', means: 'A name that holds a value. The computer remembers it, and your code can change it.' },
      { term: 'the draw loop', means: 'setup() runs once. draw() runs about 60 times a second, and each run is one frame.' },
      { term: '= means "becomes"', means: 'saucerX = saucerX + 2 makes saucerX become its old value plus 2.' },
      { term: 'animation', means: 'Changing a variable a little every frame makes a shape look like it moves.' },
    ],
  },
  t4: {
    build: 'A creature that follows your mouse and reacts when you click.',
    ideas: [
      { term: 'input', means: 'Information coming into your program from the player, like the mouse.' },
      { term: 'mouseX and mouseY', means: 'Variables p5 keeps up to date with where the mouse is.' },
      { term: 'expression', means: 'Math written where a number goes, like mouseX + 20. The computer works it out first.' },
      { term: 'if', means: 'Runs the code inside its { } only when its condition is true.' },
    ],
  },
  t5: {
    build: 'A ball that bounces off all four walls and counts its bounces.',
    ideas: [
      { term: 'conditional', means: 'An if statement. It lets your code decide what to do.' },
      { term: 'condition', means: 'A question with a true or false answer, like ballX > 400.' },
      { term: 'comparison', means: '> means greater than, and < means less than. They compare two values.' },
      { term: 'speed', means: 'A variable added to a position every frame. Flip its sign to turn around.' },
    ],
  },
  t6: {
    build: 'Your first whole game: catch falling stars, keep score, and do not run out of lives.',
    ideas: [
      { term: '&& means "and"', means: 'Both sides must be true. It checks two conditions at once.' },
      { term: 'random(low, high)', means: 'Gives a different number each time, so the game is not the same twice.' },
      { term: 'collision', means: 'Checking whether two things are touching, by comparing their positions.' },
      { term: 'lives', means: 'A variable that counts down. When it reaches 0, the game is over.' },
    ],
  },
};

/** { build, ideas } for a lesson, or null when nothing has been written for it yet. */
export const todayFor = (lessonId) => TODAY[lessonId] || null;
export const todayLessons = () => Object.keys(TODAY);
