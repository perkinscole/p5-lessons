// THE CROSSINGS: where the three roads meet. Everyone learns a new idea here together.
// A lesson without `starter` continues the student's own game, whichever road they took.
import { lesson } from './engine.js';

lesson({
  id: 'c1', title: 'Forest Maker', mins: 35, concepts: ['functions', 'parameters', 'return values'],
  hook: 'All the roads meet here. Whatever game you are building, you have probably noticed your code getting long. Functions are how programmers name a chunk of code and reuse it. You will use them in your own game next.',
  starter: `function setup() {
  createCanvas(400, 400);
  noLoop();
}

function draw() {
  background(170, 220, 240);
  noStroke();
  fill(100, 170, 90);
  rect(0, 300, 400, 100);

  // one tree
  fill(110, 70, 40);
  rect(90, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(100, 200, 80, 90);
}
`,
  steps: [
    {
      title: 'Name some code', mins: 7,
      say: 'You have been *calling* functions like `rect()` for weeks. Now you will **write** one. Move your tree code into a new function at the bottom:',
      edits: [
        { code: '  drawTree();', at: { replace: `  // one tree
  fill(110, 70, 40);
  rect(90, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(100, 200, 80, 90);` } },
        { code: `function drawTree() {
  fill(110, 70, 40);
  rect(90, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(100, 200, 80, 90);
}`, at: { end: true } },
      ],
      show: `// in draw():
drawTree();

// at the bottom:
function drawTree() {
  fill(110, 70, 40);
  rect(90, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(100, 200, 80, 90);
}`,
      check: /function\s+(?!setup|draw\b)\w+\s*\(/,
      hint: 'Writing a function does nothing by itself. You also have to call it from draw().',
    },
    {
      title: 'Give it a parameter', mins: 8,
      say: 'Calling `drawTree()` twice just draws the same tree on top of itself. A **parameter** is a variable the caller fills in. Add `x` in the parentheses, and use it in the math. The numbers are relative to `x` now.',
      edits: [
        { code: `function drawTree(x) {
  fill(110, 70, 40);
  rect(x - 10, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(x, 200, 80, 90);
}`, at: { replace: `function drawTree() {
  fill(110, 70, 40);
  rect(90, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(100, 200, 80, 90);
}` } },
        { code: `drawTree(100);
  drawTree(220);`, at: { replace: 'drawTree();' } },
      ],
      show: `function drawTree(x) {
  fill(110, 70, 40);
  rect(x - 10, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(x, 200, 80, 90);
}

// in draw():
drawTree(100);
drawTree(220);`,
      check: /function\s+(?!setup|draw\b)\w+\s*\(\s*\w+/,
    },
    {
      title: 'More parameters', mins: 7,
      say: 'Add a `size` parameter too, so you can have big trees and small trees. Multiply every measurement by `size`. A size of 1 is normal, and 2 is double.',
      edits: [
        { code: `function drawTree(x, size) {
  fill(110, 70, 40);
  rect(x - 10 * size, 300 - 80 * size, 20 * size, 80 * size);
  fill(40, 130, 70);
  ellipse(x, 300 - 100 * size, 80 * size, 90 * size);
}`, at: { replace: `function drawTree(x) {
  fill(110, 70, 40);
  rect(x - 10, 220, 20, 80);
  fill(40, 130, 70);
  ellipse(x, 200, 80, 90);
}` } },
        { code: `drawTree(100, 1);
  drawTree(220, 1.6);
  drawTree(320, 0.7);`, at: { replace: `drawTree(100);
  drawTree(220);` } },
      ],
      show: `function drawTree(x, size) {
  fill(110, 70, 40);
  rect(x - 10 * size, 300 - 80 * size, 20 * size, 80 * size);
  fill(40, 130, 70);
  ellipse(x, 300 - 100 * size, 80 * size, 90 * size);
}

drawTree(100, 1);
drawTree(220, 1.6);
drawTree(320, 0.7);`,
      check: /function\s+(?!setup|draw\b)\w+\s*\(\s*\w+\s*,\s*\w+/,
    },
    {
      title: 'A function that answers', mins: 7,
      say: 'Some functions **return** an answer rather than drawing anything. This one picks a shade of green from a size. `return` hands the value back to wherever the function was called. Use it in your tree.',
      edits: [
        { code: `function leafGreen(size) {
  return 100 + size * 50;
}`, at: { end: true } },
        { code: 'fill(40, leafGreen(size), 70);', at: { replace: 'fill(40, 130, 70);' } },
      ],
      show: `function leafGreen(size) {
  return 100 + size * 50;
}

// in your tree function:
fill(40, leafGreen(size), 70);`,
      check: /return\s+[^;]+;/,
    },
    {
      title: 'Grow your forest', mins: 6,
      say: 'Write a **second function of your own**, like `drawRock`, `drawHouse`, or `drawCloud`, with at least one parameter. Call it a few times to finish your scene. In your next lesson you will use functions in your own game.',
      reveal: true,
      edits: [
        { code: `function drawCloud(x, y) {
  fill(255);
  ellipse(x, y, 70, 30);
  ellipse(x + 25, y - 8, 50, 30);
}`, at: { end: true } },
        { code: '  drawCloud(90, 60);\n  drawCloud(290, 100);', at: { after: 'drawTree(320, 0.7);' } },
      ],
      show: `function drawCloud(x, y) {
  fill(255);
  ellipse(x, y, 70, 30);
  ellipse(x + 25, y - 8, 50, 30);
}

drawCloud(90, 60);
drawCloud(290, 100);`,
      check: /(?:function\s+(?!setup|draw\b)\w+\s*\(\s*\w+[\s\S]*){3,}/,
      hint: 'You need one more function with a parameter, for 3 in total.',
    },
  ],
  stretch: ['Add a `color` parameter to your tree.', 'Remove `noLoop()`, and make the trees sway using `frameCount`.', 'Use `randomSeed(42)` and `random()` to place a forest of 10 trees.'],
  reflect: 'Look at your game. Which chunk of code would you turn into a function first, and what would you call it?',
});

lesson({
  id: 'c2', title: 'Draw Your Hero', mins: 40, concepts: ['images', 'preload', 'sprite sheets', 'modulo'],
  hook: 'Time to retire that rectangle. Today you open the Sprite Studio, draw your own character, and bring it into your game, whichever road you are on.',
  steps: [
    {
      title: 'Make your sprite', mins: 13, action: 'sprites',
      say: 'Open **Sprites** above the editor. Draw your hero, or choose one from the library. Make at least **two frames** if you can, using **Duplicate frame** and changing a small detail like a leg or a wing.\n\nName it exactly `hero`, then press **Use in this project**.',
    },
    {
      title: 'Load it before the game starts', mins: 6,
      say: 'Images take time to download. p5 runs `preload()` first and waits for it to finish before `setup()`. Your project\'s sprites live in a list called `SPRITES`. Add this above `setup()`:',
      code: `let heroImg;

function preload() {
  heroImg = loadImage(SPRITES.hero);
}
`,
      at: { before: 'function setup() {' },
      check: [/function\s+preload/, /loadImage\s*\(/],
      hint: 'If you see a pink checkerboard, your sprite has a different name. Check that it is called hero.',
    },
    {
      title: 'Keep the pixels crisp', mins: 2,
      say: 'Browsers blur small images when they stretch them. `noSmooth()` keeps your pixel art sharp. Add it in `setup()`.',
      code: '  noSmooth();',
      at: { after: 'createCanvas(400, 400);' },
      check: /noSmooth\s*\(/,
    },
    {
      title: 'A drawPlayer function', mins: 7,
      say: 'Use your new function skills. Replace your player `rect` with a call to `drawPlayer()`, and write that function at the bottom. `image(img, x, y, w, h)` works just like `rect`, with one extra argument.',
      edits: [
        { code: 'drawPlayer();', at: { replace: 'rect(playerX, playerY, playerSize, playerSize);' } },
        { code: `function drawPlayer() {
  image(heroImg, playerX, playerY, playerSize, playerSize);
}`, at: { end: true } },
      ],
      show: `// where your rect was:
drawPlayer();

// at the bottom:
function drawPlayer() {
  image(heroImg, playerX, playerY, playerSize, playerSize);
}`,
      check: [/function\s+drawPlayer/, /image\s*\(/],
    },
    {
      title: 'Animate it', mins: 9,
      say: 'A **sprite sheet** stores frames side by side. `image` can draw just one slice of it.\n\n`%` wraps the count around, so `floor(frameCount / 8) % frames` counts 0, 1, 0, 1 and so on. Dividing by 8 means it changes every 8 frames. Replace your `image` line:',
      code: `let frameW = heroImg.height;
  let frames = floor(heroImg.width / frameW);
  let f = floor(frameCount / 8) % frames;
  image(heroImg, playerX, playerY, playerSize, playerSize, f * frameW, 0, frameW, frameW);`,
      at: { replace: 'image(heroImg, playerX, playerY, playerSize, playerSize);' },
      check: /%/,
    },
    {
      title: 'Check your work', mins: 3,
      say: 'Run your game and try everything again. Does your hero\'s size feel right? Try changing `playerSize`. Good programmers check that nothing broke after a big change.',
    },
  ],
  stretch: ['Only animate while moving, using `keyIsDown`.', 'Flip the sprite when moving left. Look up `scale(-1, 1)`.', 'Draw a second sprite for an enemy or a coin, and load it the same way.'],
  reflect: 'What is `preload()` for? What do you think would happen if `loadImage` ran in `draw()`?',
  rubric: [
    { id: 'works', label: 'It runs', levels: ['Crashes or empty', 'Runs with errors', 'Sprite shows in the game', 'Sprite is animated, no bugs found'] },
    { id: 'concept', label: 'Uses the concept', levels: ['No image used', 'Static image', 'Sprite sheet slices used', 'Frames react to gameplay'] },
    { id: 'own', label: 'Original art', levels: ['No sprite', 'Library sprite, unchanged', 'Their own sprite', 'Multiple sprites of their own'] },
  ],
});

lesson({
  id: 'c3', title: 'Critter Zoo', mins: 35, concepts: ['classes', 'objects', 'methods'],
  hook: 'The roads meet again. Your game is full of things that each have data and behavior. Classes bundle those together, so you can make a thousand of anything. Today you build a zoo.',
  starter: `let critters = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
}

function draw() {
  background(235, 245, 220);
}
`,
  steps: [
    {
      title: 'What is a class?', mins: 8,
      say: 'A **class** is a blueprint. The **constructor** runs once for each new object, and `this` means "this particular one". Add this at the bottom:',
      code: `class Critter {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speedX = random(-2, 2);
    this.speedY = random(-2, 2);
    this.size = random(20, 50);
  }
}`,
      at: { end: true },
      check: /class\s+\w+\s*\{[\s\S]*constructor[\s\S]*this\./,
    },
    {
      title: 'Teach it a method', mins: 6,
      say: 'A **method** is a function that belongs to a class. Add `show()` inside the class, just after the constructor\'s closing brace. Methods do not use the word `function`.',
      code: `
  show() {
    fill(240, 130, 80);
    ellipse(this.x, this.y, this.size, this.size);
    fill(30);
    ellipse(this.x + 6, this.y - 4, 5, 5);
  }`,
      at: { endOf: 'class Critter' },
      check: /^\s*show\s*\(\s*\)\s*\{|^\s*\w+\s*\(\s*\)\s*\{[\s\S]*this\./m,
    },
    {
      title: 'Teach it to move', mins: 6,
      say: 'Add a second method that moves the critter and bounces it off the walls. Every critter uses its own `this.x`, so they all move independently.',
      code: `
  move() {
    this.x = this.x + this.speedX;
    this.y = this.y + this.speedY;
    if (this.x < 0 || this.x > width) {
      this.speedX = this.speedX * -1;
    }
    if (this.y < 0 || this.y > height) {
      this.speedY = this.speedY * -1;
    }
  }`,
      at: { endOf: 'class Critter' },
      check: /this\.\w+\s*=\s*this\.\w+\s*\+/,
    },
    {
      title: 'Make a crowd', mins: 6,
      say: '`new Critter(x, y)` builds one object from the blueprint. `critters.push(thing)` adds a thing to the end of the list. Make ten in `setup()`, and then ask each to move and show itself in `draw()`.',
      edits: [
        { code: `  for (let i = 0; i < 10; i = i + 1) {
    critters.push(new Critter(random(width), random(height)));
  }`, at: { after: 'noStroke();' } },
        { code: `
  for (let i = 0; i < critters.length; i = i + 1) {
    critters[i].move();
    critters[i].show();
  }`, at: { after: 'background(235, 245, 220);' } },
      ],
      show: `// in setup():
for (let i = 0; i < 10; i = i + 1) {
  critters.push(new Critter(random(width), random(height)));
}

// in draw():
for (let i = 0; i < critters.length; i = i + 1) {
  critters[i].move();
  critters[i].show();
}`,
      check: [/new\s+\w+\s*\(/, /\[\s*\w+\s*\]\s*\.\s*\w+\s*\(/],
    },
    {
      title: 'Click to add', mins: 3,
      say: '`mousePressed()` runs once per click. Each click adds one critter to the list, and your loop handles the rest.',
      code: `function mousePressed() {
  critters.push(new Critter(mouseX, mouseY));
}`,
      at: { end: true },
      check: /function\s+mousePressed/,
    },
    {
      title: 'Your own species', mins: 6,
      say: 'Give critters a new **property** of your choice (a color, a mood, a number of legs), set it in the constructor, and use it in `show()`. Each critter should look a little different.',
      reveal: true,
      edits: [
        { code: '    this.hue = random(255);', at: { after: 'this.size = random(20, 50);' } },
        { code: 'fill(this.hue, 130, 80);', at: { replace: 'fill(240, 130, 80);' } },
      ],
      show: `// in the constructor:
this.hue = random(255);

// in show():
fill(this.hue, 130, 80);`,
      check: /fill\s*\([^)]*this\./,
      hint: 'Set this.something in the constructor, then use this.something in fill().',
    },
  ],
  stretch: ['Add a `hungry()` method that changes color over time.', 'Make two different classes, like Critter and Food.', 'Make critters eat each other when they touch.'],
  reflect: 'What in your own game could be a class? What would its properties and methods be?',
});

lesson({
  id: 'c4', title: 'Title Screens and Endings', mins: 35, concepts: ['game states', 'string comparison'],
  hook: 'Real games have a title screen, a game, and an ending. Today your project gets all three by learning a pattern that every game uses: game states.',
  steps: [
    {
      title: 'One variable to rule them', mins: 3,
      say: 'A game is always in one **state**. A variable can hold it. Add this at the top.',
      code: 'let gameState = "title";\n',
      at: { top: true },
      check: /let\s+\w+\s*=\s*"/,
    },
    {
      title: 'Rename your game loop', mins: 3,
      say: 'All your gameplay now lives in `draw()`. Rename it to `playGame`, because `draw()` is about to get a new job. Your game will stop working for a moment, and that is fine.',
      code: 'function playGame() {',
      at: { replace: 'function draw() {' },
      check: /function\s+playGame/,
    },
    {
      title: 'The new draw()', mins: 8,
      say: 'Now `draw()` is a traffic controller: it checks the state and calls the right function. `else if` asks another question only when the ones before it were false, and the last `else` catches anything left over. Add this at the bottom.',
      code: `function draw() {
  if (gameState === "title") {
    showTitle();
  } else if (gameState === "play") {
    playGame();
    if (won || lost) {
      gameState = "over";
    }
  } else {
    showEnding();
  }
}`,
      at: { end: true },
      check: [/function\s+draw/, /else\s+if/, /===\s*"/],
    },
    {
      title: 'A title screen', mins: 7,
      say: 'Give your game a name and a bold look. `textAlign(CENTER)` centers text at the `x` you give. We switch it back afterward so your score is not affected.',
      code: `function showTitle() {
  background(30, 30, 60);
  fill(255);
  textAlign(CENTER);
  textSize(40);
  text("MY GAME", 200, 160);
  textSize(18);
  text("Click to start", 200, 220);
  textAlign(LEFT);
}`,
      at: { end: true },
      check: /function\s+showTitle/,
    },
    {
      title: 'An ending screen', mins: 7,
      say: 'Show a different message for winning and losing. Display the score too, which makes players want to try again.',
      code: `function showEnding() {
  background(20);
  fill(255);
  textAlign(CENTER);
  textSize(36);
  if (won) {
    text("You win!", 200, 160);
  } else {
    text("Game over", 200, 160);
  }
  textSize(20);
  text("Score: " + score, 200, 210);
  text("Click to play again", 200, 250);
  textAlign(LEFT);
}`,
      at: { end: true },
      check: /function\s+showEnding/,
    },
    {
      title: 'Click to change state', mins: 4,
      say: '`mousePressed()` runs once per click. Clicking on any screen other than the game starts a fresh round, using your `resetGame()` from before.',
      code: `function mousePressed() {
  if (gameState !== "play") {
    resetGame();
    gameState = "play";
  }
}`,
      at: { end: true },
      check: /function\s+mousePressed/,
    },
    {
      title: 'Decorate your screens', mins: 3,
      say: 'Change "MY GAME" to your real title, and draw your hero sprite on the title screen with `image(heroImg, 170, 240, 60, 60)`, using the first frame or the whole sheet.',
    },
  ],
  stretch: ['Add a "pause" state on the P key.', 'Add a "how to play" state between title and game.', 'Keep a best score that lasts between rounds.'],
  reflect: 'How did this change make your code easier to understand? What other state would your game benefit from?',
});

lesson({
  id: 'c5', title: 'The Leaderboard', mins: 35, concepts: ['algorithms', 'linear search', 'selection sort', 'swapping'],
  hook: 'All the roads meet one last time before the summit. Sorting is one of the most studied problems in computer science. Today you do not call a sort function. You write one, and watch it work.',
  starter: `let scores = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
  for (let i = 0; i < 16; i = i + 1) {
    scores.push(floor(random(10, 380)));
  }
}

function draw() {
  background(25, 25, 45);
  for (let i = 0; i < scores.length; i = i + 1) {
    fill(120, 170, 255);
    rect(i * 25, height - scores[i], 22, scores[i]);
  }
}
`,
  steps: [
    {
      title: 'Search for the best', mins: 8,
      reveal: true,
      say: 'To find the highest score, walk the list and remember the best one seen so far. This is **linear search**. (The `scores.push` line in your starter adds each number to the end of the list.) Press **Add the starter code**, then finish the TODO. The function returns the **index** of the largest value, starting from a given position.',
      code: `function findBest(start) {
  let best = start;
  for (let i = start + 1; i < scores.length; i = i + 1) {
    if (scores[i] > scores[best]) {
      best = i;
    }
  }
  return best;
}`,
      at: { end: true },
      check: /best\s*=\s*i\b/,
      hint: 'Compare scores[i] with scores[best].',
      skeleton: [
        { code: `function findBest(start) {
  let best = start;
  for (let i = start + 1; i < scores.length; i = i + 1) {
    // TODO: If the score at i is bigger than the score at best,
    // then i is the new best.

  }
  return best;
}`, at: { end: true } },
      ],
    },
    {
      title: 'Swap two items', mins: 6,
      say: 'To swap two values you need a temporary spot, just as you would need a spare cup to swap the drinks in two glasses. Add this helper.',
      code: `function swap(a, b) {
  let temp = scores[a];
  scores[a] = scores[b];
  scores[b] = temp;
}`,
      at: { end: true },
      check: /let\s+\w+\s*=\s*\w+\[\s*\w+\s*\]/,
    },
    {
      title: 'One sorting step', mins: 7,
      reveal: true,
      say: 'Here is **selection sort**: find the best of what is left, swap it to the front, then repeat from the next position. `sortedUpTo` marks how much of the list is finished. Press **Add the starter code**, then write the three lines that do one step.',
      edits: [
        { code: 'let sortedUpTo = 0;', at: { after: 'let scores = [];' } },
        { code: `function sortStep() {
  if (sortedUpTo < scores.length - 1) {
    let best = findBest(sortedUpTo);
    swap(sortedUpTo, best);
    sortedUpTo = sortedUpTo + 1;
  }
}`, at: { end: true } },
      ],
      show: `let sortedUpTo = 0;     // at the top

function sortStep() {
  if (sortedUpTo < scores.length - 1) {
    let best = findBest(sortedUpTo);
    swap(sortedUpTo, best);
    sortedUpTo = sortedUpTo + 1;
  }
}`,
      check: [/\bswap\s*\(\s*\w+\s*,\s*\w+\s*\)\s*;/, /sortedUpTo\s*(?:=\s*sortedUpTo\s*\+|\+=|\+\+)/],
      skeleton: [
        { code: `let sortedUpTo = 0;`, at: { after: 'let scores = [];' } },
        { code: `function sortStep() {
  if (sortedUpTo < scores.length - 1) {
    // TODO 1: Find the best score from sortedUpTo onward, using findBest.

    // TODO 2: Swap it into position sortedUpTo, using swap.

    // TODO 3: One more bar is finished. Add 1 to sortedUpTo.

  }
}`, at: { end: true } },
      ],
    },
    {
      title: 'Watch it run', mins: 5,
      say: 'Run a step every half second, so you can see each swap. Finished bars turn gold. `frameCount % 30 === 0` is true once every 30 frames.',
      edits: [
        { code: `
  if (frameCount % 30 === 0) {
    sortStep();
  }`, at: { after: 'background(25, 25, 45);' } },
        { code: `if (i < sortedUpTo) {
      fill(255, 210, 80);
    } else {
      fill(120, 170, 255);
    }`, at: { replace: 'fill(120, 170, 255);' } },
      ],
      show: `// at the top of draw():
if (frameCount % 30 === 0) {
  sortStep();
}

// inside the loop, replacing the fill:
if (i < sortedUpTo) {
  fill(255, 210, 80);
} else {
  fill(120, 170, 255);
}`,
      check: /frameCount\s*%/,
    },
    {
      title: 'Count the work', mins: 5,
      say: 'How much work does sorting take? Add a counter inside the `findBest` loop, and display it. Try 16 bars, then 32, and see how it grows. That growth is called an algorithm\'s **complexity**.',
      edits: [
        { code: 'let comparisons = 0;', at: { after: 'let sortedUpTo = 0;' } },
        { code: '    comparisons = comparisons + 1;', at: { after: 'for (let i = start + 1; i < scores.length; i = i + 1) {' } },
        { code: `
  fill(255);
  textSize(16);
  text("Comparisons: " + comparisons, 10, 24);`, at: { endOf: 'function draw' } },
      ],
      show: `let comparisons = 0;                // at the top
comparisons = comparisons + 1;      // inside findBest's loop
text("Comparisons: " + comparisons, 10, 24);   // in draw()`,
      check: /text\s*\([^)]*\+/,
    },
    {
      title: 'Predict, then test', mins: 4,
      say: 'If 16 bars takes about 120 comparisons, how many do you predict for 32? Write down your guess. Change the `16` to `32`, and adjust the bar width if needed. Were you right?',
    },
  ],
  stretch: ['Sort a list of objects with names, and draw a real leaderboard.', 'Look up bubble sort, and try writing that too.', 'Write a search that finds the first score above 300.'],
  reflect: 'What did you predict for 32 bars? What did you get? Why does doubling the list do more than double the work?',
});

lesson({
  id: 'c6', title: 'The Summit: Launch Day', mins: 40, concepts: ['polish', 'particles', 'playtesting', 'publishing'],
  hook: 'You made it. Starting from a blank canvas, you have built a real game, your own version of it. Today you add the shine that makes a game feel great, then publish it to your class Arcade.',
  steps: [
    {
      title: 'Name it for real', mins: 2,
      say: 'If your title screen still says MY GAME, change it now. It is time to commit to a name.',
      code: 'text("MY FINAL GAME", 200, 160);',
      at: { replace: 'text("MY GAME", 200, 160);' },
    },
    {
      title: 'A Spark class', mins: 8,
      say: '**Particles** are tiny objects that burst out, fade, and vanish. They use everything you know: classes, arrays, loops, and removal. Add this at the bottom.',
      code: `class Spark {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    this.life = 255;
  }

  update() {
    this.x = this.x + this.vx;
    this.y = this.y + this.vy;
    this.life = this.life - 8;
  }

  show() {
    fill(255, 220, 80, this.life);
    rect(this.x, this.y, 4, 4);
  }
}`,
      at: { end: true },
      check: /this\.life/,
    },
    {
      title: 'Burst on a score', mins: 8,
      say: 'Your game is different from everyone else\'s, but all of them have a `score`. So we watch it: when it goes up, burst! Add the variables at the top, and the code at the end of `playGame`.',
      edits: [
        { code: 'let sparks = [];\nlet lastScore = 0;\n', at: { top: true } },
        { code: `
  // sparks when the score goes up
  if (score > lastScore) {
    for (let i = 0; i < 25; i = i + 1) {
      sparks.push(new Spark(60, 24));
    }
  }
  lastScore = score;
  for (let i = sparks.length - 1; i >= 0; i = i - 1) {
    sparks[i].update();
    sparks[i].show();
    if (sparks[i].life <= 0) {
      sparks.splice(i, 1);
    }
  }`, at: { endOf: 'function playGame' } },
      ],
      show: `let sparks = [];        // at the top
let lastScore = 0;

// at the end of playGame():
if (score > lastScore) {
  for (let i = 0; i < 25; i = i + 1) {
    sparks.push(new Spark(60, 24));
  }
}
lastScore = score;
for (let i = sparks.length - 1; i >= 0; i = i - 1) {
  sparks[i].update();
  sparks[i].show();
  if (sparks[i].life <= 0) {
    sparks.splice(i, 1);
  }
}`,
      check: /\.push\s*\(\s*new\s+Spark/,
      hint: 'Try moving the burst to where the action happens, like an enemy or a coin. Use its position in place of 60, 24.',
    },
    {
      title: 'Your polish list', mins: 10,
      say: 'Choose **two** from this list, or invent your own:\n\n- A screen shake when something big happens (try `translate(random(-3, 3), random(-3, 3))`)\n- A best score that lasts between rounds\n- A second sprite for enemies or items\n- A "how to play" screen\n- Your own hard level, wave, or map',
    },
    {
      title: 'Playtest and fix', mins: 8,
      say: 'Swap seats with someone from a **different road**. Watch them play without giving hints. Note one thing that confused them, then fix it. Real studios do this constantly.',
    },
    {
      title: 'Publish!', mins: 4, action: 'share',
      say: 'Press **Share to Arcade** at the top, so your class can play your game. Then submit this lesson, and go play what your classmates built.',
    },
  ],
  stretch: ['Play 3 classmates\' games and tell each of them one thing you liked.', 'Read another road\'s code. What did they do differently?', 'Start a sequel!'],
  reflect: 'Look back at your first lesson. What are you most proud of? What would you build next?',
  rubric: [
    { id: 'works', label: 'It runs', levels: ['Crashes or empty', 'Runs with errors', 'Complete game', 'Polished, no bugs found'] },
    { id: 'concept', label: 'Shows learning', levels: ['Few concepts', 'Some concepts', 'Functions, arrays, and classes used well', 'Includes an algorithm of their own'] },
    { id: 'own', label: 'Own vision', levels: ['Unchanged from lessons', 'Small changes', 'Clear theme and own art', 'Goes well beyond the lessons'] },
  ],
});
