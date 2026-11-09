// BASE CAMP: everyone takes these six lessons together before the first fork.
import { lesson } from './engine.js';

lesson({
  id: 't1', title: 'Hello, Canvas', mins: 35, concepts: ['coordinates', 'function calls', 'color'],
  hook: 'Every game you have ever played is a grid of tiny dots. Today you learn to tell the computer exactly where to put them, and you draw your first scene.',
  starter: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(135, 206, 235);
}
`,
  steps: [
    {
      title: 'Meet the grid', mins: 5,
      say: 'Press **Run**. The blue square is your **canvas**, 400 dots wide and 400 tall.\n\nPositions are written `(x, y)`. `x` counts dots from the left. `y` counts dots from the **top**, so bigger `y` means lower down. Most people expect the opposite, so keep this one in mind.',
    },
    {
      title: 'Add a sun', mins: 5,
      say: 'Each drawing command is a **function call**: a name, then numbers in parentheses. These numbers are called **arguments**.\n\n`ellipse(x, y, width, height)` draws a circle or oval. Add this line inside `draw()`, below `background`:',
      code: '  ellipse(340, 60, 70, 70);',
      at: { after: 'background(135, 206, 235);' },
      check: /ellipse\s*\(/,
      hint: 'It needs to go between the { and } of draw(), after the background line.',
    },
    {
      title: 'Add the ground', mins: 5,
      say: '`rect(x, y, width, height)` draws a rectangle from its **top-left corner**. Add a strip of ground along the bottom of the canvas.',
      code: '  rect(0, 320, 400, 80);',
      at: { after: 'ellipse(340, 60, 70, 70);' },
      check: /rect\s*\(/,
    },
    {
      title: 'Add color', mins: 5,
      say: 'Screens mix **red, green, and blue** light, each from 0 to 255. `fill(r, g, b)` sets the color for every shape drawn after it, like dipping a brush in paint. Make the sun yellow and the ground green.',
      edits: [
        { code: '  fill(255, 220, 60);', at: { before: 'ellipse(340, 60, 70, 70);' } },
        { code: '  fill(90, 170, 80);', at: { before: 'rect(0, 320, 400, 80);' } },
      ],
      show: `fill(255, 220, 60);
ellipse(340, 60, 70, 70);
fill(90, 170, 80);
rect(0, 320, 400, 80);`,
      check: /fill\s*\(/,
    },
    {
      title: 'Draw a character', mins: 10,
      say: 'Now build a character out of shapes: at least **three more** shapes, standing on the ground. Try a `rect` for a body, an `ellipse` for a head, and `line(x1, y1, x2, y2)` for arms.\n\nGuess the numbers, press Run, and adjust. That loop of guess, run, and fix is how programmers actually work.',
      reveal: true,
      code: `  rect(180, 240, 40, 80);
  ellipse(200, 215, 50, 50);
  line(180, 260, 150, 290);
  line(220, 260, 250, 290);`,
      at: { after: 'rect(0, 320, 400, 80);' },
      check: /(?:(?:rect|ellipse|line|triangle)\s*\([^)]*\)[\s\S]*){5,}/,
      hint: 'You need 5 or more shapes in total, counting the sun and the ground.',
    },
    {
      title: 'Read the error', mins: 5,
      say: 'Delete the `)` from one of your lines and press Run. Read the message under the canvas: it tells you the line number. Put the `)` back.\n\nErrors do not mean you failed. They are the computer asking you a question, and you will see them every day from now on.',
    },
  ],
  stretch: ['Add a cloud made of three overlapping ellipses.', 'Use `triangle(x1, y1, x2, y2, x3, y3)` to draw a mountain behind your character.', 'Add a house or a tree to the scene.'],
  reflect: 'Why do you think y counts down from the top instead of up from the bottom?',
});

lesson({
  id: 't2', title: 'Monster Maker', mins: 35, concepts: ['color', 'sequence'],
  hook: 'Time to add color. You will build a monster and discover that the order of your code decides what sits in front of what.',
  starter: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(40, 30, 70);

  // monster body
  ellipse(200, 220, 220, 240);
}
`,
  steps: [
    {
      title: 'Mix a color', mins: 6,
      say: 'Screens mix **red, green, and blue** light, each from 0 to 255. `fill(r, g, b)` sets the color for every shape drawn after it, like dipping a brush in paint. Add it above the body:',
      code: '  fill(120, 220, 90);',
      at: { before: 'ellipse(200, 220, 220, 240);' },
      check: /fill\s*\(/,
    },
    {
      title: 'Add eyes', mins: 7,
      say: 'Add two white eyes with dark pupils. Notice the pupils come **after** the whites. The computer runs your code **top to bottom**, one line at a time. This is called **sequence**, and later shapes paint over earlier ones.',
      code: `
  // eyes
  fill(255);
  ellipse(160, 180, 60, 60);
  ellipse(240, 180, 60, 60);
  fill(20);
  ellipse(160, 185, 24, 24);
  ellipse(240, 185, 24, 24);`,
      at: { after: 'ellipse(200, 220, 220, 240);' },
      check: [/fill\s*\(\s*255\s*\)/, /(?:ellipse\s*\([^)]*\)[\s\S]*){5,}/],
      hint: 'fill() with one number is a gray: 0 is black and 255 is white.',
    },
    {
      title: 'Break the order on purpose', mins: 4,
      say: 'Cut your body `ellipse` line and paste it **below** the eyes. Run it. The eyes vanish, because the body painted over them. Now put it back so the eyes show again.',
    },
    {
      title: 'Add a mouth and outlines', mins: 8,
      say: '`stroke(r, g, b)` colors outlines, `strokeWeight(n)` sets their thickness, and `noStroke()` removes them. Give your monster a mouth using `arc(x, y, w, h, start, stop)`. Angles use `PI`, where a half circle is `PI`.',
      code: `
  // mouth
  stroke(20);
  strokeWeight(6);
  fill(200, 40, 60);
  arc(200, 270, 110, 80, 0, PI);
  noStroke();`,
      at: { endOf: 'function draw' },
      check: [/(?:arc|triangle|rect|ellipse)\s*\(/, /stroke\s*\(|noStroke\s*\(/],
    },
    {
      title: 'Make it yours', mins: 10,
      say: 'Change the colors and shapes so this monster looks like **nobody else\'s**. Add at least **two new features**: horns, teeth, spots, a third eye, whatever you like.',
      reveal: true,
      code: `
  // horns
  fill(240, 200, 80);
  triangle(120, 130, 150, 120, 110, 60);
  triangle(280, 130, 250, 120, 290, 60);`,
      at: { endOf: 'function draw' },
      check: /(?:(?:ellipse|rect|triangle|arc|line|quad)\s*\([^)]*\)[\s\S]*){8,}/,
      hint: 'You need 8 or more shapes in total.',
    },
  ],
  stretch: ['Use `fill(r, g, b, alpha)` with a fourth number to make see-through spots.', 'Give your monster a background scene.', 'Use `rectMode(CENTER)` and see what changes.'],
  reflect: 'What happened when you moved the body below the eyes? What does that tell you about how the computer reads your code?',
});

lesson({
  id: 't3', title: 'It Moves!', mins: 35, concepts: ['variables', 'the draw loop'],
  hook: 'So far your drawings sit still. Today you give the computer a memory, and your scene comes alive.',
  starter: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(15, 20, 50);

  // flying saucer
  fill(180, 220, 255);
  ellipse(50, 120, 90, 30);
  fill(120, 255, 180);
  ellipse(50, 108, 40, 30);
}
`,
  steps: [
    {
      title: 'Why draw() matters', mins: 4,
      say: '`setup()` runs **once**. `draw()` runs over and over, about **60 times every second**. Each pass paints a new frame, and a game is just a very fast flipbook.\n\nThe saucer never moves because its numbers never change. We need a number that *can* change.',
    },
    {
      title: 'Create a variable', mins: 6,
      say: 'A **variable** is a labeled box that holds a value. Put this at the very top, **outside** any function, so it survives between frames:',
      code: 'let saucerX = 50;\n',
      at: { top: true },
      check: /\blet\s+\w+\s*=/,
    },
    {
      title: 'Use the variable', mins: 5,
      say: 'Replace the fixed `50`s with your variable. It looks the same when you run it, but now that number can change.',
      edits: [
        { code: 'ellipse(saucerX, 120, 90, 30);', at: { replace: 'ellipse(50, 120, 90, 30);' } },
        { code: 'ellipse(saucerX, 108, 40, 30);', at: { replace: 'ellipse(50, 108, 40, 30);' } },
      ],
      show: `ellipse(saucerX, 120, 90, 30);
...
ellipse(saucerX, 108, 40, 30);`,
      check: /ellipse\s*\(\s*[a-zA-Z_]\w*\s*,/,
    },
    {
      title: 'Change it every frame', mins: 6,
      say: 'At the end of `draw()`, make the variable bigger. Read `=` as **"becomes"**: saucerX *becomes* its old value plus 2.',
      code: '\n  saucerX = saucerX + 2;',
      at: { endOf: 'function draw' },
      check: /(\w+)\s*=\s*\1\s*[+\-*/]|\w+\s*[+\-*/]=|\w+\+\+/,
      hint: 'The form is: myVariable = myVariable + 2;',
    },
    {
      title: 'Try removing background()', mins: 3,
      say: 'Comment out `background` by putting `//` in front of it, then Run. You get a smear, because old frames never get painted over. Now remove the `//`. Clearing and redrawing every frame is how all animation works.',
    },
    {
      title: 'A second moving thing', mins: 11,
      say: 'Add a **second variable** of your own that moves something else: a falling meteor, a rising moon, a growing planet. It can change position, size, or even color.',
      reveal: true,
      edits: [
        { code: 'let meteorY = 0;', at: { after: 'let saucerX = 50;' } },
        { code: `
  // falling meteor
  fill(255, 170, 60);
  ellipse(300, meteorY, 24, 24);
  meteorY = meteorY + 3;`, at: { endOf: 'function draw' } },
      ],
      show: `let meteorY = 0;   // at the top

// inside draw():
fill(255, 170, 60);
ellipse(300, meteorY, 24, 24);
meteorY = meteorY + 3;`,
      check: /\blet[\s\S]+\blet\s+\w+/,
      hint: 'You need two let lines at the top of your code.',
    },
  ],
  stretch: ['Make something grow by putting a variable in the width of an ellipse.', 'Make the background slowly change color using a variable.', 'Add a third variable for the saucer\'s speed, and use it in place of the 2.'],
  reflect: 'Why does the variable have to be created outside draw()? What would happen if `let saucerX = 50;` were inside draw()?',
});

lesson({
  id: 't4', title: 'Puppet Master', mins: 30, concepts: ['input', 'expressions'],
  hook: 'A game needs a player. Today your program starts listening, and you build a creature that follows you around.',
  starter: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(250, 235, 200);

  // creature
  fill(255, 130, 80);
  ellipse(200, 200, 100, 100);
  fill(255);
  ellipse(180, 190, 30, 30);
  ellipse(220, 190, 30, 30);
}
`,
  steps: [
    {
      title: 'Variables p5 gives you', mins: 6,
      say: 'p5 keeps some variables updated for you. `mouseX` and `mouseY` always hold the mouse position. Replace the body\'s position so it follows the mouse:',
      code: 'ellipse(mouseX, mouseY, 100, 100);',
      at: { replace: 'ellipse(200, 200, 100, 100);' },
      check: /mouseX/,
    },
    {
      title: 'Do math in the arguments', mins: 7,
      say: 'The eyes got left behind. Anywhere a number goes, you can write an **expression**, which is math the computer works out. Keep the eyes 20 dots to each side of the body and 10 above it:',
      edits: [
        { code: 'ellipse(mouseX - 20, mouseY - 10, 30, 30);', at: { replace: 'ellipse(180, 190, 30, 30);' } },
        { code: 'ellipse(mouseX + 20, mouseY - 10, 30, 30);', at: { replace: 'ellipse(220, 190, 30, 30);' } },
      ],
      show: `ellipse(mouseX - 20, mouseY - 10, 30, 30);
ellipse(mouseX + 20, mouseY - 10, 30, 30);`,
      check: /mouse[XY]\s*[-+]/,
    },
    {
      title: 'Check the mouse with if', mins: 7,
      say: 'Time for your first **if**. The code inside the braces runs only when the condition is true. `mouseIsPressed` is true while the button is held down. Add this so the creature opens its mouth on a click:',
      code: `
  if (mouseIsPressed) {
    fill(60, 20, 20);
    ellipse(mouseX, mouseY + 25, 40, 30);
  }`,
      at: { endOf: 'function draw' },
      check: /if\s*\(\s*mouseIsPressed/,
    },
    {
      title: 'Show a number on screen', mins: 4,
      say: '`text(what, x, y)` draws words. Show the coordinates. This is a great way to check what your variables hold, and programmers call it **debugging**.',
      code: `
  fill(0);
  textSize(16);
  text("x: " + mouseX + "  y: " + mouseY, 10, 24);`,
      at: { endOf: 'function draw' },
      check: /text\s*\(/,
    },
    {
      title: 'Your creature, your rules', mins: 6,
      say: 'Make something else respond to the mouse. Maybe the background color changes with `mouseX`, or the creature\'s size changes with `mouseY`. Use `mouseX` or `mouseY` in a **new** place.',
      reveal: true,
      code: 'background(mouseX / 2, 235, 200);',
      at: { replace: 'background(250, 235, 200);' },
      check: /background\s*\([^)]*mouse|ellipse\s*\([^,]+,[^,]+,[^,]*mouse/,
      hint: 'Try putting mouseX inside background(), or use it for the width of the body.',
    },
  ],
  stretch: ['Make the pupils look toward the mouse.', 'Add a hat that only appears when the mouse is on the right half of the canvas.', 'Use `pmouseX` to draw a trail.'],
  reflect: 'What is the difference between a variable you made and one p5 gives you?',
});

lesson({
  id: 't5', title: 'Bounce House', mins: 35, concepts: ['conditionals', 'comparison'],
  hook: 'Your saucer flew off the edge and never came back. Today your objects learn about walls, and your code starts making decisions.',
  starter: `let ballX = 200;
let ballY = 100;
let speedX = 3;
let speedY = 2;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(30, 30, 40);

  ballX = ballX + speedX;
  ballY = ballY + speedY;

  fill(255, 220, 80);
  noStroke();
  ellipse(ballX, ballY, 40, 40);
}
`,
  steps: [
    {
      title: 'Spot the problem', mins: 2,
      say: 'Run it. The ball leaves forever. To stop that, the code has to ask a question every frame: **has the ball passed the wall?**',
    },
    {
      title: 'Bounce off the right wall', mins: 7,
      say: 'If the ball is past the right edge, flip its direction. Multiplying speed by `-1` turns 3 into -3, which moves it left. `width` is the canvas width, provided by p5.',
      code: `
  if (ballX > width) {
    speedX = speedX * -1;
  }`,
      at: { after: 'ballY = ballY + speedY;' },
      check: /if\s*\([^)]*>[^)]*\)/,
    },
    {
      title: 'All four walls', mins: 7,
      say: 'Now do the other walls yourself. You need **four** checks in all. `<` means less than, and `height` is the canvas height. Remember the top of the canvas is `y = 0`.',
      reveal: true,
      code: `  if (ballX < 0) {
    speedX = speedX * -1;
  }
  if (ballY > height) {
    speedY = speedY * -1;
  }
  if (ballY < 0) {
    speedY = speedY * -1;
  }`,
      at: { before: '  fill(255, 220, 80);' },
      check: /(?:if\s*\([^)]*[<>][^)]*\)[\s\S]*){4,}/,
      hint: 'The left wall is ballX < 0. Which variable and which comparison handle the bottom?',
    },
    {
      title: 'Fix the sinking edge', mins: 4,
      say: 'Look closely. The ball goes halfway through the wall, because `ballX` is its **center**. Its edge is 20 dots from the center, so change the first check.',
      code: 'if (ballX > width - 20) {',
      at: { replace: 'if (ballX > width) {' },
      check: /width\s*-\s*\d+/,
      hint: 'Your ball might be a different size. Use half of its width.',
    },
    {
      title: 'Change color when it bounces', mins: 5,
      say: 'A condition can do anything, not just flip the speed. Make the ball change color on the bottom half of the canvas. **else** handles the other case:',
      code: `  if (ballY > height / 2) {
    fill(255, 100, 120);
  } else {
    fill(120, 200, 255);
  }`,
      at: { replace: '  fill(255, 220, 80);' },
      check: /\belse\b/,
    },
    {
      title: 'Add a bounce counter', mins: 5,
      say: 'Add a variable that counts bounces off the right wall, and show it with `text`. Inside your if, add 1 to it. This is the same trick every score in every game uses.',
      reveal: true,
      edits: [
        { code: 'let bounces = 0;', at: { after: 'let speedY = 2;' } },
        { code: '    bounces = bounces + 1;', at: { after: 'if (ballX > width - 20) {' } },
        { code: `
  fill(255);
  textSize(18);
  text("Bounces: " + bounces, 10, 26);`, at: { endOf: 'function draw' } },
      ],
      show: `let bounces = 0;      // at the top

bounces = bounces + 1;   // inside your if

text("Bounces: " + bounces, 10, 26);   // in draw()`,
      check: /text\s*\([^)]*\+/,
      hint: 'Use "Bounces: " + yourVariable as the text.',
    },
    {
      title: 'Bug hunt', mins: 5,
      reveal: true,
      say: 'Press **Add the starter code**. It has a bug: the square should turn red when the mouse is on the right half of the canvas. Find the wrong number and fix it.',
      code: `
  // mouse side light
  if (mouseX > 200) {
    fill(220, 60, 60);
  } else {
    fill(60, 120, 220);
  }
  rect(10, 40, 30, 30);`,
      at: { endOf: 'function draw' },
      check: /mouseX\s*>\s*(?:200|width\s*\/\s*2)/,
      hint: 'The canvas is 400 wide. Where is its middle?',
      skeleton: [
        { code: `
  // TODO: Bug hunt! This square should turn red on the right half of the canvas. It never does.
  if (mouseX > 600) {
    fill(220, 60, 60);
  } else {
    fill(60, 120, 220);
  }
  rect(10, 40, 30, 30);`, at: { endOf: 'function draw' } },
      ],
    },
  ],
  stretch: ['Speed the ball up a little on every bounce.', 'Add a second ball with its own four variables.', 'Make the ball bounce off a paddle at your mouse.'],
  reflect: 'What would happen if you wrote `ballX == width` instead of `ballX > width`? Try it and explain.',
});

lesson({
  id: 't6', title: 'Catch the Star', mins: 40, concepts: ['logical operators', 'random', 'collision'],
  hook: 'Everything so far adds up to this: your first real game. It has a player, a goal, a score, and a way to lose. After today you pick your own path.',
  starter: `let basketX = 200;
let starX = 200;
let starY = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(20, 24, 60);

  // basket follows the mouse
  basketX = mouseX;
  fill(200, 140, 80);
  noStroke();
  rect(basketX - 40, 360, 80, 24);

  // falling star
  starY = starY + 4;
  fill(255, 230, 90);
  ellipse(starX, starY, 24, 24);
}
`,
  steps: [
    {
      title: 'Send another star', mins: 4,
      say: 'Only one star falls, and then nothing. When it passes the bottom, put it back at the top in a **random** spot. `random(a, b)` gives a number between a and b.',
      code: `
  if (starY > height) {
    starY = 0;
    starX = random(20, 380);
  }`,
      at: { endOf: 'function draw' },
      check: /random\s*\(/,
    },
    {
      title: 'Add a score', mins: 4,
      say: 'Make a variable for the score and display it.',
      edits: [
        { code: 'let score = 0;', at: { after: 'let starY = 0;' } },
        { code: `
  fill(255);
  textSize(20);
  text("Score: " + score, 10, 28);`, at: { endOf: 'function draw' } },
      ],
      show: `let score = 0;    // at the top

text("Score: " + score, 10, 28);    // in draw()`,
      check: /text\s*\([^)]*\+/,
    },
    {
      title: 'Did we catch it?', mins: 9,
      say: 'This is **collision detection**, one of the most important ideas in games. A catch means *all* of these are true: the star is low enough, **and** it is right of the basket\'s left side, **and** it is left of the right side.\n\n`&&` means **and**: every part must be true.',
      code: `
  if (starY > 350 && starX > basketX - 40 && starX < basketX + 40) {
    score = score + 1;
    starY = 0;
    starX = random(20, 380);
  }`,
      at: { before: '  if (starY > height) {' },
      check: /if\s*\([^)]*&&[^)]*\)/,
      hint: 'Put && between each of the three comparisons.',
    },
    {
      title: 'Add lives', mins: 6,
      say: 'A missed star should cost something. Add `lives`, subtract one in the "passed the bottom" check, and display it.',
      edits: [
        { code: 'let lives = 3;', at: { after: 'let score = 0;' } },
        { code: '    lives = lives - 1;', at: { after: 'if (starY > height) {' } },
        { code: '  text("Lives: " + lives, 300, 28);', at: { after: 'text("Score: " + score, 10, 28);' } },
      ],
      show: `let lives = 3;           // at the top
lives = lives - 1;       // when the star hits the bottom
text("Lives: " + lives, 300, 28);`,
      check: /(\w+)\s*(?:=\s*\1\s*-|-=|--)/,
    },
    {
      title: 'Game over', mins: 5,
      say: 'The round should end when lives run out **or** when the player reaches 20 points. `||` means **or**: the condition is true if either side is true. `noLoop()` stops `draw()` from repeating. Add this at the end of `draw()`:',
      code: `
  if (lives <= 0 || score >= 20) {
    textSize(40);
    textAlign(CENTER);
    text("GAME OVER", 200, 200);
    noLoop();
  }`,
      at: { endOf: 'function draw' },
      check: [/noLoop\s*\(\s*\)/, /\|\|/],
    },
    {
      title: 'Make it get harder', mins: 7,
      say: 'A good game gets harder as you improve. Add a `fallSpeed` variable, use it in place of the `4`, and raise it a little on each catch. Then change the colors and theme so it is your game, not mine.',
      reveal: true,
      edits: [
        { code: 'let fallSpeed = 4;', at: { after: 'let lives = 3;' } },
        { code: 'starY = starY + fallSpeed;', at: { replace: 'starY = starY + 4;' } },
        { code: '    fallSpeed = fallSpeed + 0.3;', at: { after: 'score = score + 1;' } },
      ],
      show: `let fallSpeed = 4;               // at the top
starY = starY + fallSpeed;        // instead of + 4
fallSpeed = fallSpeed + 0.3;      // on each catch`,
      check: /\w+\s*(?:=\s*\w+\s*\+\s*\d*\.\d+|\+=\s*\d*\.\d+)|fallSpeed/i,
      hint: 'Create a variable for the speed, then add a small amount to it inside the catch check.',
    },
    {
      title: 'Bug hunt', mins: 5,
      reveal: true,
      say: 'Press **Add the starter code**, then catch some stars. Your score gets stuck! Add `console.log(score);` above the bug to watch the number below your game. One `=` **sets** a value, and `===` **compares** two values. Fix the `if`.',
      code: `
  // halfway message
  if (score === 5) {
    text("Halfway!", 160, 60);
  }`,
      at: { endOf: 'function draw' },
      check: /score\s*(?:===|==|>=)\s*5/,
      hint: 'Look at what is between `score` and `5` in the `if`.',
      skeleton: [
        { code: `
  // halfway message
  // TODO: Bug hunt! Catch a star and watch your score get stuck. Fix the if.
  if (score = 5) {
    text("Halfway!", 160, 60);
  }`, at: { endOf: 'function draw' } },
      ],
    },
  ],
  stretch: ['Add a bad star (a different color) that costs a life when you catch it.', 'Let players restart: look up `keyPressed()` and `loop()`.', 'Keep and show a best score.'],
  reflect: 'Write out the catch check in plain English. What is one bug you found in your game?',
});
