// THE HIGH ROAD: a side-view platformer, built up one lesson at a time.
import { lesson } from './engine.js';

lesson({
  id: 'p1', title: 'Gravity Is a Number', mins: 35, concepts: ['variables', 'physics simulation'], path: 'platformer',
  hook: 'Welcome to the High Road. Over the coming weeks you will build a whole platformer. It starts with one surprising idea: gravity is just a number you add every frame.',
  starter: `let playerX = 180;
let playerY = 100;
let playerSize = 40;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(135, 206, 235);

  // ground
  fill(90, 160, 80);
  noStroke();
  rect(0, 360, 400, 40);

  // player
  fill(230, 80, 80);
  rect(playerX, playerY, playerSize, playerSize);
}
`,
  steps: [
    {
      title: 'Add falling speed', mins: 6,
      say: 'To fall realistically, the player needs a **velocity**: how fast they move each frame. Gravity changes the velocity, and velocity changes the position. Add these below your other variables. `VY` stands for velocity in y.',
      code: 'let playerVY = 0;\nlet gravity = 0.6;',
      at: { after: 'let playerSize = 40;' },
      check: /let\s+\w*[vV][yY]?\w*\s*=/,
    },
    {
      title: 'Make it fall', mins: 7,
      say: 'Every frame, gravity speeds up the fall, then the fall moves the player. Add this at the start of `draw()`, right after `background`. Run it and watch them speed up as they drop.',
      code: `
  // physics
  playerVY = playerVY + gravity;
  playerY = playerY + playerVY;`,
      at: { after: 'background(135, 206, 235);' },
      check: /playerY\s*(?:=\s*playerY\s*\+|\+=)/,
    },
    {
      title: 'Remember if you can jump', mins: 4,
      reveal: true,
      say: 'Soon the player needs to know whether they are standing on something. Make a variable called `onGround` that starts as `false`. A **boolean** can only be `true` or `false`.',
      code: 'let onGround = false;',
      at: { after: 'let gravity = 0.6;' },
      check: /let\s+onGround|let\s+\w+\s*=\s*(?:true|false)/,
      hint: 'Use `let`, like your other variables, with the value `false`.',
    },
    {
      title: 'Land on the ground', mins: 8,
      reveal: true,
      say: 'The player falls straight through the floor. The ground starts at `y = 360`, and the feet are at `playerY + playerSize`. If the feet pass the ground, put the player back on top, stop the fall, and set `onGround` to `true`.',
      code: `
  // landing on the ground
  if (playerY + playerSize > 360) {
    playerY = 360 - playerSize;
    playerVY = 0;
    onGround = true;
  }`,
      at: { after: 'playerY = playerY + playerVY;' },
      check: /if\s*\([^)]*playerSize[^)]*>/,
      hint: 'Inside an `if`, set `playerY` to `360 - playerSize`, and set `playerVY` to 0.',
    },
    {
      title: 'Jump!', mins: 7,
      say: '`keyPressed()` is a special function p5 calls once each time a key goes down. A jump is one big **negative** velocity, because up means smaller y. Gravity then slowly brings the player back. Add this below `draw()`:',
      code: `function keyPressed() {
  if (key === " " && onGround) {
    playerVY = -12;
    onGround = false;
  }
}`,
      at: { end: true },
      check: [/function\s+keyPressed/, /=\s*-\s*\d/],
      hint: 'Click on the canvas first so it can hear your keys, then press the space bar.',
    },
    {
      title: 'Tune the feel', mins: 3,
      say: 'Change `gravity` and the jump strength until it feels good to you. Floaty? Snappy? Try a moon level at 0.2. Game designers spend ages on exactly this. Pick the values you like best.',
    },
  ],
  stretch: ['Change the player\'s color while in the air.', 'Add a double jump by counting jumps instead of using a boolean.', 'Make a short tap jump lower than a long press. Look up `keyReleased()`.'],
  reflect: 'Explain in your own words how gravity, velocity, and position connect. Which values did you pick, and why?',
});

lesson({
  id: 'p2', title: 'Run and Land', mins: 35, concepts: ['keyboard input', 'compound conditions'], path: 'platformer',
  hook: 'Your hero can jump but not go anywhere. Today they learn to run, and they get their first platform to land on.',
  steps: [
    {
      title: 'Run left and right', mins: 7,
      say: '`keyPressed()` fires once per press. For holding a key down, use `keyIsDown()` inside `draw()`, which checks every frame. Add this above `// physics`:',
      code: `  // running
  if (keyIsDown(LEFT_ARROW)) {
    playerX = playerX - 4;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    playerX = playerX + 4;
  }
`,
      at: { before: '// physics' },
      check: /keyIsDown\s*\(/,
    },
    {
      title: 'Stay on the screen', mins: 4,
      reveal: true,
      say: 'Keep the player on the screen. `constrain(value, low, high)` keeps a number inside a range. Use it on `playerX`, after your running code.',
      code: '  playerX = constrain(playerX, 0, width - playerSize);\n',
      at: { before: '// physics' },
      check: /constrain\s*\(/,
      hint: 'The highest `playerX` allowed is `width - playerSize`.',
    },
    {
      title: 'Describe a platform', mins: 5,
      reveal: true,
      say: 'A platform is a rectangle, so it needs four numbers. Make variables named `platX`, `platY`, `platW`, and `platH`. Then draw it just after the ground.',
      edits: [
        { code: 'let platX = 220;\nlet platY = 260;\nlet platW = 120;\nlet platH = 20;', at: { after: 'let onGround = false;' } },
        { code: `
  // platform
  fill(140, 90, 50);
  rect(platX, platY, platW, platH);`, at: { after: 'rect(0, 360, 400, 40);' } },
      ],
      show: `let platX = 220;
let platY = 260;
let platW = 120;
let platH = 20;

// in draw(), after the ground:
fill(140, 90, 50);
rect(platX, platY, platW, platH);`,
      check: /rect\s*\(\s*plat/,
      hint: 'Try 220, 260, 120, and 20. Then use all four in one `rect`.',
    },
    {
      title: 'Airborne by default', mins: 3,
      say: 'The player should count as in the air unless something is holding them up. Set `onGround` to false each frame just before the landing check, and the ground or platform will set it back to true.',
      code: '  onGround = false;',
      at: { before: '// landing on the ground' },
      check: /onGround\s*=\s*false[\s\S]*onGround\s*=\s*true/,
    },
    {
      title: 'Land on the platform', mins: 12,
      say: 'This is the longest condition you have written. A landing needs all of these:\n\n- The player is **falling** (`playerVY >= 0`)\n- The player is horizontally over the platform (two checks)\n- The player\'s feet are at the platform\'s top\n\nBreaking a long condition across lines makes it easier to read. Add it just above `// ground`.',
      code: `  // landing on the platform
  if (playerVY >= 0 &&
      playerX + playerSize > platX &&
      playerX < platX + platW &&
      playerY + playerSize >= platY &&
      playerY + playerSize <= platY + platH + playerVY) {
    playerY = platY - playerSize;
    playerVY = 0;
    onGround = true;
  }
`,
      at: { before: '// ground' },
      check: /if\s*\([\s\S]*?&&[\s\S]*?&&[\s\S]*?&&/,
      hint: 'Try removing the "falling" part, run it, and jump up through the platform to see why it matters.',
    },
    {
      title: 'Pick your theme', mins: 4,
      say: 'This is **your** platformer. Is it a jungle, a castle, a candy world? Change the background, ground, and platform colors to fit your idea. A better hero is coming soon.',
    },
  ],
  stretch: ['Move the platform slowly left and right using a speed variable.', 'Add a second platform with four more variables, and notice how annoying that is. Arrays will fix it soon!', 'Add a run boost while holding Shift.'],
  reflect: 'Pick one line of the platform condition. What goes wrong if you remove it?',
});

lesson({
  id: 'p3', title: 'Coins, Spikes, Flags', mins: 40, concepts: ['dist()', 'booleans', 'win and lose'], path: 'platformer',
  hook: 'Right now you have a toy. A game needs something to want and something to fear. Today you add a reward, a danger, and an ending.',
  steps: [
    {
      title: 'Set up game variables', mins: 4,
      say: 'Add these at the top. We start with `won` and `lost` as false. Every part of your game can check them.',
      code: `let score = 0;
let won = false;
let lost = false;
let coinX = 280;
let coinY = 220;
let coinTaken = false;
let spikeX = 120;
let goalX = 360;`,
      at: { after: 'let platH = 20;' },
      check: /let\s+score/,
    },
    {
      title: 'Grab a coin', mins: 10,
      say: '`dist(x1, y1, x2, y2)` gives the distance between two points. It is the easy way to check if round things touch. `!` means **not**, so `!coinTaken` is true while the coin is still there. Add this above `// player`:',
      code: `  // coin
  if (!coinTaken) {
    fill(255, 210, 50);
    ellipse(coinX, coinY, 20, 20);
    if (dist(playerX + playerSize / 2, playerY + playerSize / 2, coinX, coinY) < 30) {
      coinTaken = true;
      score = score + 10;
    }
  }
`,
      at: { before: '// player' },
      check: [/dist\s*\(/, /!\s*\w+/],
    },
    {
      title: 'Add a spike', mins: 8,
      say: 'Spikes are triangles sitting on the ground. Touching one sets `lost`. We test a smaller box than the triangle, which feels fairer to players.',
      code: `  // spike
  fill(90);
  triangle(spikeX, 360, spikeX + 30, 360, spikeX + 15, 325);
  if (playerX + playerSize > spikeX + 5 &&
      playerX < spikeX + 25 &&
      playerY + playerSize > 330) {
    lost = true;
  }
`,
      at: { before: '// player' },
      check: /lost\s*=\s*true/,
    },
    {
      title: 'Plant the flag', mins: 7,
      reveal: true,
      say: 'Draw a flag at `goalX`. The player wins only if the coin is taken **and** the player has reached the flag. Set `won` to `true` when both happen.',
      code: `  // goal flag
  fill(60);
  rect(goalX, 280, 6, 80);
  fill(255, 90, 160);
  triangle(goalX + 6, 280, goalX + 6, 305, goalX + 36, 292);
  if (coinTaken && playerX + playerSize > goalX) {
    won = true;
  }
`,
      at: { before: '// player' },
      check: /won\s*=\s*true/,
      hint: 'Join two conditions with `&&`: `coinTaken` and `playerX + playerSize > goalX`.',
    },
    {
      title: 'Show what happened', mins: 6,
      reveal: true,
      say: 'Press **Add the starter code** to show the score. Then finish the TODOs, so the game says when the player wins or loses.',
      code: `
  // score and messages
  fill(0);
  textSize(18);
  text("Score: " + score, 10, 24);
  if (won) {
    text("You made it!", 150, 200);
  }
  if (lost) {
    text("Ouch! Spikes!", 150, 200);
  }`,
      at: { endOf: 'function draw' },
      check: /if\s*\(\s*(?:won|lost)/,
      hint: 'Write `if (won) {`, then use `text` inside it.',
      skeleton: [
        { code: `
  // score and messages
  fill(0);
  textSize(18);
  text("Score: " + score, 10, 24);
  // TODO: If won is true, show a winning message with text().

  // TODO: If lost is true, show a losing message.
`, at: { endOf: 'function draw' } },
      ],
    },
    {
      title: 'Playtest your level', mins: 5,
      say: 'Move the coin, spike, and flag so getting through feels satisfying. Try to beat it. Then ask a neighbor to try it without any hints, and watch what they do.',
    },
  ],
  stretch: ['Add a second coin and require both.', 'Add a moving spike.', 'Make the coin bob up and down using `sin(frameCount * 0.1)`.'],
  reflect: 'What did your playtester do that surprised you?',
});

lesson({
  id: 'p4', title: 'Restart and Repeat', mins: 35, concepts: ['functions', 'for loops'], path: 'platformer',
  hook: 'You just learned about functions at the Crossing, so now put them to work in your own game. Then you meet the for loop, which lets one line of code draw a hundred things.',
  steps: [
    {
      title: 'Write a resetGame function', mins: 8,
      reveal: true,
      say: 'Right now the only way to replay is to press Run. Use what you learned at the Crossing: write a function called `resetGame` at the bottom that puts every starting value back. Look at your variables and decide which ones change during play.',
      code: `function resetGame() {
  playerX = 180;
  playerY = 100;
  playerVY = 0;
  score = 0;
  won = false;
  lost = false;
  coinTaken = false;
}`,
      at: { end: true },
      check: /function\s+resetGame/,
      hint: 'Check each variable at the top of your code. If it changes while the game runs, reset it here.',
    },
    {
      title: 'Press R to restart', mins: 4,
      reveal: true,
      say: 'Make the game call `resetGame()` when the player presses R. Put a new `if` inside your `keyPressed()` that checks whether `key === "r"`.',
      code: `  if (key === "r") {
    resetGame();
  }`,
      at: { after: 'function keyPressed() {' },
      check: /resetGame\s*\(\s*\)\s*;/,
    },
    {
      title: 'Your first for loop', mins: 10,
      say: 'A **for loop** repeats code while counting. It has three parts:\n\n`for (start; keep going while; change each time)`\n\nReplace the plain ground rectangle with a row of tiles. Read it as: start `x` at 0, keep going while `x` is under the width, and add 40 each time.',
      code: `for (let x = 0; x < width; x = x + 40) {
    rect(x, 360, 38, 40);
  }`,
      at: { replace: 'rect(0, 360, 400, 40);' },
      check: /for\s*\(\s*let\s+\w+\s*=/,
      hint: 'Separate the three parts with semicolons, not commas.',
    },
    {
      title: 'Loop with math', mins: 8,
      reveal: true,
      say: 'Just after `background`, draw a row of 5 clouds with a for loop that counts `i` from 0 to 4. Work out each cloud\'s `x` from `i`, such as `40 + i * 80`. For a zig-zag, add `(i % 2) * 30` to `y`. `%` gives the remainder, so `i % 2` flips between 0 and 1.',
      code: `
  // clouds
  fill(255);
  noStroke();
  for (let i = 0; i < 5; i = i + 1) {
    ellipse(40 + i * 80, 50 + (i % 2) * 30, 70, 30);
  }`,
      at: { after: 'background(135, 206, 235);' },
      check: /(?:for\s*\([\s\S]*){2,}/,
    },
    {
      title: 'Your scenery', mins: 5,
      say: 'Use a loop to add scenery that fits your theme: fence posts, trees, lava bubbles, castle bricks. Change the numbers and watch how the pattern changes.',
    },
  ],
  stretch: ['Use a loop inside a loop to draw a brick wall.', 'Make the clouds drift using `frameCount`.', 'Show a "Press R to try again" message when the game ends.'],
  reflect: 'How many lines of code would your ground tiles take without a loop? What would you change to make the tiles half as wide?',
});

lesson({
  id: 'p5', title: 'A World of Platforms', mins: 35, concepts: ['arrays', 'objects', 'looping over arrays'], path: 'platformer',
  hook: 'One platform took four variables. A real level needs dozens. Today you learn the data structure that makes big worlds possible.',
  steps: [
    {
      title: 'Meet objects', mins: 6,
      say: 'An **object** bundles related values under one name: `{ x: 220, y: 260 }`. You read them with a dot: `plat.x`.\n\nAn **array** is an ordered list inside `[ ]`. Put them together and you get a list of platforms! Replace your four platform variables with this:',
      code: `let platforms = [
  { x: 220, y: 260, w: 120, h: 20 },
  { x: 40, y: 200, w: 100, h: 20 },
  { x: 220, y: 130, w: 100, h: 20 },
];`,
      at: { replace: 'let platX = 220;\nlet platY = 260;\nlet platW = 120;\nlet platH = 20;' },
      check: /let\s+\w+\s*=\s*\[\s*\{/,
    },
    {
      title: 'Draw them all', mins: 8,
      say: '`platforms.length` is how many items the list has, and `platforms[0]` is the **first**, because counting starts at 0. A loop visits each one in turn. Replace your old `rect` with this:',
      code: `for (let i = 0; i < platforms.length; i = i + 1) {
    let p = platforms[i];
    rect(p.x, p.y, p.w, p.h);
  }`,
      at: { replace: 'rect(platX, platY, platW, platH);' },
      check: /\.length/,
    },
    {
      title: 'Land on any of them', mins: 11,
      reveal: true,
      say: 'Your old landing check only knows about one platform. Wrap it in a loop like the one you just wrote, and use `p.x`, `p.y`, `p.w`, and `p.h` in place of the old variables. Your game will work again when this is done.',
      code: `// landing on the platforms
  for (let i = 0; i < platforms.length; i = i + 1) {
    let p = platforms[i];
    if (playerVY >= 0 &&
        playerX + playerSize > p.x &&
        playerX < p.x + p.w &&
        playerY + playerSize >= p.y &&
        playerY + playerSize <= p.y + p.h + playerVY) {
      playerY = p.y - playerSize;
      playerVY = 0;
      onGround = true;
    }
  }`,
      at: { replace: `// landing on the platform
  if (playerVY >= 0 &&
      playerX + playerSize > platX &&
      playerX < platX + platW &&
      playerY + playerSize >= platY &&
      playerY + playerSize <= platY + platH + playerVY) {
    playerY = platY - playerSize;
    playerVY = 0;
    onGround = true;
  }` },
      check: /(?:\.length[\s\S]*){2,}/,
      hint: 'Copy your drawing loop first. Then move the whole landing check inside it.',
    },
    {
      title: 'Add one line, get a platform', mins: 4,
      reveal: true,
      say: 'Add a fourth platform by writing one more `{ }` line in your array, with `x`, `y`, `w`, and `h`. Press Run. You added a platform with **one line**, and all your loops handled it automatically. This is why programmers love arrays.',
      code: '  { x: 150, y: 310, w: 60, h: 15 },',
      at: { after: '{ x: 220, y: 130, w: 100, h: 20 },' },
      check: /(?:\{\s*x\s*:[\s\S]*){4,}/,
      hint: 'You need at least 4 platforms in the array. Do not forget the comma at the end of each line.',
    },
    {
      title: 'Design your climb', mins: 6,
      say: 'Rearrange the platforms into a level. The jump reaches about 120 dots high, so plan a route that is possible but takes some skill.',
    },
  ],
  stretch: ['Give each platform a `color` property and use it when drawing.', 'Add a `speed` property to make some platforms move.', 'Add a platform that disappears after you land on it.'],
  reflect: 'What is the difference between `platforms[0]` and `platforms.length`?',
});

lesson({
  id: 'p6', title: 'Coin Rush', mins: 35, concepts: ['array methods', 'removing while looping'], path: 'platformer',
  hook: 'One coin is a chore, and twenty coins scattered along a route is a reason to explore. Today your list changes as the game runs.',
  steps: [
    {
      title: 'Build the coin list', mins: 7,
      reveal: true,
      say: 'Replace the three old coin variables with a list called `coins`. Start with `let coins = makeCoins();`, then write a function called `makeCoins()` that **returns** a list of at least three `{ x, y }` objects. Now a restart can bring every coin back.',
      code: `let coins = makeCoins();

function makeCoins() {
  return [
    { x: 280, y: 220 },
    { x: 90, y: 160 },
    { x: 270, y: 90 },
  ];
}
`,
      at: { replace: 'let coinX = 280;\nlet coinY = 220;\nlet coinTaken = false;' },
      check: /return\s*\[/,
    },
    {
      title: 'Loop backward and remove', mins: 12,
      say: 'When a coin is collected, it should leave the list. `splice(i, 1)` removes 1 item at position `i`.\n\nHere is a sneaky bug: removing an item slides everything after it down one place, so a forward loop would skip the next coin. Looping **backward** avoids it. Replace your old coin block:',
      code: `// coins
  fill(255, 210, 50);
  for (let i = coins.length - 1; i >= 0; i = i - 1) {
    let c = coins[i];
    ellipse(c.x, c.y, 20, 20);
    if (dist(playerX + playerSize / 2, playerY + playerSize / 2, c.x, c.y) < 30) {
      coins.splice(i, 1);
      score = score + 10;
    }
  }`,
      at: { replace: `// coin
  if (!coinTaken) {
    fill(255, 210, 50);
    ellipse(coinX, coinY, 20, 20);
    if (dist(playerX + playerSize / 2, playerY + playerSize / 2, coinX, coinY) < 30) {
      coinTaken = true;
      score = score + 10;
    }
  }` },
      check: /\.splice\s*\(/,
    },
    {
      title: 'Fix the flag', mins: 4,
      reveal: true,
      say: '`coinTaken` no longer exists, so the flag needs a new rule: you can only win when the list is **empty**. How can you tell that a list is empty? Change the `if` for your flag.',
      code: 'if (coins.length === 0 && playerX + playerSize > goalX) {',
      at: { replace: 'if (coinTaken && playerX + playerSize > goalX) {' },
      check: /\.length\s*===?\s*0/,
    },
    {
      title: 'Fix the restart', mins: 3,
      reveal: true,
      say: 'Your `resetGame` still mentions `coinTaken`. Have it fetch a fresh list instead, using the function you wrote.',
      code: 'coins = makeCoins();',
      at: { replace: 'coinTaken = false;' },
      check: /^\s*\w+\s*=\s*\w+\s*\(\s*\)\s*;/m,
    },
    {
      title: 'Spread them out', mins: 9,
      say: 'Place at least **six** coins so collecting them means visiting your whole level. Add a coins-left counter to the screen using `coins.length`, so players know how many remain.',
      reveal: true,
      edits: [
        { code: `    { x: 180, y: 300 },
    { x: 360, y: 240 },
    { x: 60, y: 330 },`, at: { after: '{ x: 270, y: 90 },' } },
        { code: '  text("Coins left: " + coins.length, 240, 24);', at: { after: 'text("Score: " + score, 10, 24);' } },
      ],
      show: `{ x: 180, y: 300 },    // more coins in makeCoins()

text("Coins left: " + coins.length, 240, 24);`,
      check: /text\s*\([^)]*\.length/,
      hint: 'Use text() with "Coins left: " + coins.length.',
    },
  ],
  stretch: ['Add a big rare coin worth 50 points by giving coins a `value` property.', 'Make spikes into an array too.', 'Use `coins.push()` to spawn a bonus coin when you land on a certain platform.'],
  reflect: 'Why does the backward loop avoid skipping coins? Try drawing it on paper with 3 coins.',
});

lesson({
  id: 'p7', title: 'Levels as Text', mins: 40, concepts: ['classes', '2D data', 'nested loops'], path: 'platformer',
  hook: 'Pros do not type coordinates for every platform. They paint levels with letters, and a program builds the world. Today your level becomes something you can draw on a keyboard.',
  steps: [
    {
      title: 'A Coin class', mins: 9,
      reveal: true,
      say: 'You built classes at the last Crossing. Write a class called `Coin` at the bottom. Its constructor takes `x` and `y`. Give it a `show()` method that draws the coin, and a `touches()` method that **returns** whether the player is within 30 dots of it.',
      code: `class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  show() {
    fill(255, 210, 50);
    ellipse(this.x, this.y, 20, 20);
  }

  touches() {
    return dist(playerX + playerSize / 2, playerY + playerSize / 2, this.x, this.y) < 30;
  }
}`,
      at: { end: true },
      check: /class\s+Coin\s*\{/,
      hint: 'Your coin loop already has the drawing and the dist() check. Move them here, and use this.x and this.y.',
    },
    {
      title: 'Draw a level with letters', mins: 7,
      say: 'Each string is a row. Each character is one 40-by-40 tile: `#` is a platform, `c` is a coin, and `.` is empty air. This is a **2D** data structure: a list of rows, each a list of characters. Add this at the top:',
      code: `let level = [
  "..........",
  "..........",
  "...c...c..",
  "..###.###.",
  ".........c",
  "c.......##",
  "##.c......",
  "...##.....",
  "..........",
];
`,
      at: { top: true },
      check: /let\s+\w+\s*=\s*\[\s*"/,
    },
    {
      title: 'Build the world with nested loops', mins: 11,
      say: 'A loop inside a loop visits every tile: the outer one picks a row, and the inner one walks across it. `level[row][col]` reads a single character. Multiply by 40 to turn tile numbers into pixels. Add this at the bottom:',
      code: `function buildLevel() {
  platforms = [];
  coins = [];
  for (let row = 0; row < level.length; row = row + 1) {
    for (let col = 0; col < level[row].length; col = col + 1) {
      let tile = level[row][col];
      if (tile === "#") {
        platforms.push({ x: col * 40, y: row * 40, w: 40, h: 20 });
      }
      if (tile === "c") {
        coins.push(new Coin(col * 40 + 20, row * 40 + 20));
      }
    }
  }
}`,
      at: { end: true },
      check: [/for[\s\S]*for[\s\S]*\[\s*\w+\s*\]\s*\[\s*\w+\s*\]/, /new\s+\w+\s*\(/],
    },
    {
      title: 'Use the class', mins: 5,
      reveal: true,
      say: 'The coins are `Coin` objects now. In your coin loop, replace the drawing line and the `dist` check so each coin handles itself, using `c.show()` and `c.touches()`.',
      edits: [
        { code: `c.show();
    if (c.touches()) {`, at: { replace: `ellipse(c.x, c.y, 20, 20);
    if (dist(playerX + playerSize / 2, playerY + playerSize / 2, c.x, c.y) < 30) {` } },
      ],
      show: `c.show();
if (c.touches()) {`,
      check: /\.\w+\s*\(\s*\)\s*\)\s*\{/,
    },
    {
      title: 'Plug it in', mins: 3,
      reveal: true,
      say: 'Call `buildLevel()` in `setup()`, and again in `resetGame()` in place of `coins = makeCoins();`.',
      edits: [
        { code: '  buildLevel();', at: { replace: '  coins = makeCoins();' } },
        { code: '  buildLevel();', at: { after: 'createCanvas(400, 400);' } },
      ],
      show: `// in setup():
buildLevel();

// in resetGame(), instead of coins = makeCoins();
buildLevel();`,
      check: /(?:^\s*buildLevel\s*\(\s*\)\s*;[\s\S]*){2,}/m,
    },
    {
      title: 'Paint your own level', mins: 5,
      say: 'Change the letters to design your level. No math needed: just move characters around, run it, and try to play it. Make sure every coin can be reached.',
    },
  ],
  stretch: ['Add `^` as a spike tile using an array of spikes.', 'Add `G` to place the goal flag from the map.', 'Make a second level and switch to it when the first is finished.'],
  reflect: 'What is easier about making a level this way? What is harder?',
});

lesson({
  id: 'p8', title: 'Endless Cliffs', mins: 40, concepts: ['algorithms', 'procedural generation', 'camera'], path: 'platformer',
  hook: 'Time for your first real algorithm. Instead of designing a level, you will write the instructions for generating one, so every play is different and every jump is still possible.',
  steps: [
    {
      title: 'Add a camera', mins: 8,
      say: 'A camera is an illusion: the player stays near the middle of the screen while the world slides. `translate(x, y)` shifts everything drawn after it. `push()` and `pop()` save and restore that shift, so the score stays pinned to the screen.',
      edits: [
        { code: 'let cameraX = 0;', at: { after: 'let onGround = false;' } },
        { code: `
  // camera follows the player
  cameraX = playerX - 150;
  push();
  translate(-cameraX, 0);`, at: { after: 'background(135, 206, 235);' } },
        { code: '  pop();\n', at: { before: '// score and messages' } },
      ],
      show: `let cameraX = 0;           // at the top

// right after background():
cameraX = playerX - 150;
push();
translate(-cameraX, 0);

// just before // score and messages:
pop();`,
      check: [/translate\s*\(/, /push\s*\(\s*\)[\s\S]*pop\s*\(\s*\)/],
    },
    {
      title: 'Unlock the right edge', mins: 3,
      reveal: true,
      say: 'The player is still stuck inside 400 dots. Keep the left limit and remove the right one by replacing your `constrain` line. `max(a, b)` gives whichever is larger.',
      code: 'playerX = max(playerX, 0);',
      at: { replace: 'playerX = constrain(playerX, 0, width - playerSize);' },
      check: /max\s*\(/,
    },
    {
      title: 'Follow the ground', mins: 5,
      reveal: true,
      say: 'Ground tiles need to appear wherever the camera is looking. Change the start of your ground loop so `x` begins at the camera\'s position, snapped to a multiple of 40 using `floor`. Keep going until `cameraX + width`.',
      code: 'for (let x = floor(cameraX / 40) * 40; x < cameraX + width; x = x + 40) {',
      at: { replace: 'for (let x = 0; x < width; x = x + 40) {' },
      check: /floor\s*\(\s*cameraX/,
    },
    {
      title: 'The generator algorithm', mins: 14,
      reveal: true,
      say: 'An **algorithm** is a precise recipe. Ours is a **random walk**: start somewhere, take a random step, then repeat.\n\nThe important part is the **constraints**. Your jump travels about 160 dots across and 120 up, so every gap must stay under 90 and every height change under 70. Press **Add the starter code**, then finish the two TODOs. They are the steps of the walk.',
      code: `function generateWorld() {
  platforms = [];
  coins = [];
  let x = 420;
  let y = 280;
  for (let i = 0; i < 30; i = i + 1) {
    let w = random(80, 140);
    platforms.push({ x: x, y: y, w: w, h: 20 });
    if (random() < 0.6) {
      coins.push(new Coin(x + w / 2, y - 30));
    }
    x = x + w + random(40, 90);
    y = constrain(y + random(-70, 70), 120, 320);
  }
  goalX = x;
}`,
      at: { end: true },
      check: [/random\s*\(/, /\.push\s*\(/, /\bx\s*(?:=\s*x\s*\+|\+=)[^;)]*random/, /\by\s*(?:=|\+=)[^;]*random/],
      hint: 'For TODO 1, your line starts with x = x + w. For TODO 2, you can write y = constrain(y + random(-70, 70), 120, 320);',
      skeleton: [
        { code: `function generateWorld() {
  platforms = [];
  coins = [];
  let x = 420;
  let y = 280;
  for (let i = 0; i < 30; i = i + 1) {
    let w = random(80, 140);
    platforms.push({ x: x, y: y, w: w, h: 20 });
    if (random() < 0.6) {
      coins.push(new Coin(x + w / 2, y - 30));
    }

    // TODO 1: Move x past this platform (add w), and across a random gap of 40 to 90.

    // TODO 2: Change y by a random amount from -70 to 70.
    // Then use constrain() to keep y between 120 and 320.
  }
  goalX = x;
}`, at: { end: true } },
      ],
    },
    {
      title: 'Switch to the generator', mins: 5,
      reveal: true,
      say: 'Call `generateWorld()` everywhere you called `buildLevel()`. Also change the flag so it only cares about reaching the end, since not every coin must be collected.',
      edits: [
        { code: 'generateWorld();', at: { replace: 'buildLevel();' } },
        { code: 'generateWorld();', at: { replace: 'buildLevel();' } },
        { code: 'if (playerX + playerSize > goalX) {', at: { replace: 'if (coins.length === 0 && playerX + playerSize > goalX) {' } },
      ],
      show: `// in setup() and resetGame():
generateWorld();

// the flag check:
if (playerX + playerSize > goalX) {`,
      check: /generateWorld\s*\(\s*\)\s*;/,
    },
    {
      title: 'Lava below!', mins: 5,
      reveal: true,
      say: 'Without danger, you could just walk along the ground. Inside your ground landing check, set `lost` to true if `playerX` is past 420, which is the end of the starting area.',
      code: `    if (playerX > 420) {
      lost = true;
    }`,
      at: { after: 'playerY = 360 - playerSize;' },
      check: /lost\s*=\s*true[\s\S]*lost\s*=\s*true/,
    },
  ],
  stretch: ['Make gaps grow as you travel further, while keeping them possible.', 'Use `randomSeed(n)` so a "daily level" is the same for everyone.', 'Add moving platforms that the generator places sometimes.'],
  reflect: 'What would break if you removed the constraints from the random walk? Test it and explain what happened.',
});
