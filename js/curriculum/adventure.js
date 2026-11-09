// THE WILD ROAD: a top-down exploration game with keys, doors, and a hunter that thinks.
import { lesson } from './engine.js';

lesson({
  id: 'a1', title: 'Walk the World', mins: 30, concepts: ['variables', 'keyboard input'], path: 'adventure',
  hook: 'Welcome to the Wild Road. Over the coming weeks you will build a top-down adventure with rooms, treasure, and an enemy that hunts you. First, you need to learn to walk.',
  starter: `let playerX = 60;
let playerY = 60;
let playerSize = 30;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(110, 180, 90);

  // player
  fill(70, 110, 230);
  noStroke();
  rect(playerX, playerY, playerSize, playerSize);
}
`,
  steps: [
    {
      title: 'A speed variable', mins: 3,
      reveal: true,
      say: 'Name a number once, and you can retune your whole game by changing it. Make a variable called `speed` and set it to 3.',
      code: 'let speed = 3;',
      at: { after: 'let playerSize = 30;' },
      check: /let\s+speed/,
      hint: 'Use `let`, like your other variables.',
    },
    {
      title: 'Walk in four directions', mins: 9,
      say: '`keyIsDown()` checks if a key is held, every frame. Each arrow changes `x` or `y`. Remember up means a **smaller** `y`. Add this above `// player`. Click the canvas so it can hear your keys.',
      code: `  // movement
  if (keyIsDown(LEFT_ARROW)) {
    playerX = playerX - speed;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    playerX = playerX + speed;
  }
  if (keyIsDown(UP_ARROW)) {
    playerY = playerY - speed;
  }
  if (keyIsDown(DOWN_ARROW)) {
    playerY = playerY + speed;
  }
`,
      at: { before: '// player' },
      check: /(?:keyIsDown\s*\([\s\S]*){4,}/,
    },
    {
      title: 'Stay in the world', mins: 4,
      reveal: true,
      say: 'Keep your hero on the map. `constrain(value, low, high)` keeps a number inside a range. Use it on both `playerX` and `playerY`.',
      code: `  playerX = constrain(playerX, 0, width - playerSize);
  playerY = constrain(playerY, 0, height - playerSize);
`,
      at: { before: '// player' },
      check: /constrain\s*\(/,
      hint: 'The highest value allowed is `width - playerSize`.',
    },
    {
      title: 'Add a pond', mins: 8,
      say: 'Let\'s make the world affect the player. Draw a pond, then slow the player while inside it. We use `dist()` to test how far they are from the pond\'s center. `else` handles the case where they are out of the water. Add this above `// movement`:',
      code: `  // pond
  fill(70, 140, 210);
  ellipse(280, 280, 140, 140);
  if (dist(playerX + 15, playerY + 15, 280, 280) < 70) {
    speed = 1;
  } else {
    speed = 3;
  }

`,
      at: { before: '// movement' },
      check: [/dist\s*\(/, /\belse\b/],
    },
    {
      title: 'Pick your world', mins: 6,
      say: 'Is this a forest? A desert? The ocean floor? Change the colors and add some scenery with shapes. Draw it above your player so the player appears on top.',
    },
  ],
  stretch: ['Hold Shift to sprint by changing `speed`.', 'Add a second pond, or sand that makes you faster.', 'Wrap around: leaving the right edge brings you back on the left.'],
  reflect: 'What world did you choose, and what will the player be looking for there?',
});

lesson({
  id: 'a2', title: 'Solid Walls', mins: 35, concepts: ['collision detection', 'compound conditions'], path: 'adventure',
  hook: 'Right now your hero is a ghost. Today the world turns solid, and you learn the collision check you will use for the rest of your coding life.',
  steps: [
    {
      title: 'Describe a wall', mins: 4,
      reveal: true,
      say: 'A wall is a rectangle, so it needs four numbers. Make variables named `wallX`, `wallY`, `wallW`, and `wallH`. Then draw the wall above the `// player` comment.',
      edits: [
        { code: 'let wallX = 150;\nlet wallY = 60;\nlet wallW = 40;\nlet wallH = 220;', at: { after: 'let speed = 3;' } },
        { code: `  // wall
  fill(100, 80, 70);
  rect(wallX, wallY, wallW, wallH);
`, at: { before: '// player' } },
      ],
      show: `let wallX = 150;
let wallY = 60;
let wallW = 40;
let wallH = 220;

// above // player:
fill(100, 80, 70);
rect(wallX, wallY, wallW, wallH);`,
      check: /rect\s*\(\s*wall/,
      hint: 'Try 150, 60, 40, and 220. Then use all four in one `rect`.',
    },
    {
      title: 'Remember where you were', mins: 5,
      say: 'Here is the trick: **save the old position, move, then undo the move if you hit something.** Add this just above `// movement`. These variables are only needed during this frame, so they live inside `draw()`.',
      code: '  let oldX = playerX;\n  let oldY = playerY;\n',
      at: { before: '// movement' },
      check: /let\s+\w+\s*=\s*playerX/,
    },
    {
      title: 'Check for overlap', mins: 12,
      say: 'Two rectangles overlap when all four of these are true:\n\n- A\'s left is before B\'s right\n- A\'s right is after B\'s left\n- A\'s top is above B\'s bottom\n- A\'s bottom is below B\'s top\n\nThis is called **AABB collision**. Add it above `// wall`.',
      code: `  // bump into the wall
  if (playerX < wallX + wallW &&
      playerX + playerSize > wallX &&
      playerY < wallY + wallH &&
      playerY + playerSize > wallY) {
    playerX = oldX;
    playerY = oldY;
  }

`,
      at: { before: '// wall' },
      check: /if\s*\([\s\S]*?&&[\s\S]*?&&[\s\S]*?&&/,
      hint: 'Sketch two rectangles on paper and label each edge. It helps a lot.',
    },
    {
      title: 'Slide along walls', mins: 8,
      say: 'Try walking diagonally into the wall. You stick to it! That is because we undo both directions at once. Better: undo only the `x` move, then check whether you are still overlapping. Only then undo `y`. Change the two undo lines to this:',
      code: `    // try keeping the y move, and undo only x
    playerX = oldX;
    if (playerY < wallY + wallH && playerY + playerSize > wallY && playerX < wallX + wallW && playerX + playerSize > wallX) {
      playerY = oldY;
    }`,
      at: { replace: '    playerX = oldX;\n    playerY = oldY;' },
      check: /playerX\s*=\s*\w+/,
    },
    {
      title: 'Build a maze', mins: 6,
      say: 'Add a second wall using a new set of variables, and try to make the player go a certain way. Writing the same thing twice feels clumsy, doesn\'t it? Arrays will solve that soon.',
    },
  ],
  stretch: ['Make a wall that slowly slides open and closed.', 'Add a pushable block.', 'Make your hero bounce back a little when bumping a wall.'],
  reflect: 'Why do we check all four sides with `&&`? What happens if one is changed to `||`?',
});

lesson({
  id: 'a3', title: 'Keys and Treasure', mins: 40, concepts: ['booleans', 'game state', 'win and lose'], path: 'adventure',
  hook: 'A locked door is a promise: there is something good on the other side. Today your world gets a puzzle, a danger, and a prize.',
  steps: [
    {
      title: 'Game variables', mins: 4,
      say: 'Booleans hold true or false, which fits this game well: do you have the key? Add these at the top.',
      code: `let score = 0;
let won = false;
let lost = false;
let hasKey = false;
let keyX = 60;
let keyY = 340;
let doorX = 300;
let doorY = 60;
let treasureX = 350;
let treasureY = 40;`,
      at: { after: 'let wallH = 220;' },
      check: /let\s+\w+\s*=\s*false/,
    },
    {
      title: 'Pick up the key', mins: 8,
      say: 'Draw the key until it is collected. `!hasKey` reads as "not hasKey". Add this above `// player`.',
      code: `  // key
  if (!hasKey) {
    fill(255, 215, 0);
    ellipse(keyX, keyY, 20, 20);
    if (dist(playerX + 15, playerY + 15, keyX, keyY) < 25) {
      hasKey = true;
      score = score + 10;
    }
  }
`,
      at: { before: '// player' },
      check: /if\s*\(\s*!\s*\w+/,
    },
    {
      title: 'A door that checks', mins: 10,
      say: 'The door blocks you unless you have the key. Combine the AABB check with `!hasKey`, using the same undo trick as your wall. Add this above `// player`.',
      code: `  // door
  if (!hasKey) {
    fill(140, 70, 30);
    rect(doorX, doorY, 40, 80);
    if (playerX < doorX + 40 && playerX + playerSize > doorX &&
        playerY < doorY + 80 && playerY + playerSize > doorY) {
      playerX = oldX;
      playerY = oldY;
    }
  }
`,
      at: { before: '// player' },
      check: /(?:if\s*\(\s*!\s*\w+[\s\S]*){2,}/,
    },
    {
      title: 'Lava pit', mins: 6,
      reveal: true,
      say: 'Add a danger: a round lava pit at (100, 200). Use `dist` to set `lost` to `true` when the player touches it.',
      code: `  // lava pit
  fill(230, 80, 30);
  ellipse(100, 200, 60, 60);
  if (dist(playerX + 15, playerY + 15, 100, 200) < 35) {
    lost = true;
  }
`,
      at: { before: '// player' },
      check: /lost\s*=\s*true/,
      hint: 'The pit is 60 wide. Check if `dist` from the player to the pit is under 35.',
    },
    {
      title: 'The treasure', mins: 6,
      reveal: true,
      say: 'Draw the prize at `treasureX` and `treasureY`. The player wins only if they have the key **and** they are close to the prize.',
      code: `  // treasure
  fill(255, 240, 120);
  rect(treasureX - 12, treasureY - 10, 24, 20);
  if (hasKey && dist(playerX + 15, playerY + 15, treasureX, treasureY) < 30) {
    won = true;
  }
`,
      at: { before: '// player' },
      check: /won\s*=\s*true/,
      hint: 'Join `hasKey` and a `dist` check with `&&`. Under 30 counts as close.',
    },
    {
      title: 'Show what happened', mins: 6,
      reveal: true,
      say: 'Press **Add the starter code** to show the score. Finish the TODOs, so the game says when the player wins or loses. Then try to win without the key.',
      code: `
  // score and messages
  fill(255);
  textSize(18);
  text("Score: " + score, 10, 24);
  if (hasKey) {
    text("You have the key", 230, 24);
  }
  if (won) {
    text("You found the treasure!", 110, 200);
  }
  if (lost) {
    text("Into the lava!", 150, 200);
  }`,
      at: { endOf: 'function draw' },
      check: /if\s*\(\s*(?:won|lost)/,
      hint: 'Write `if (won) {`, then use `text` inside it.',
      skeleton: [
        { code: `
  // score and messages
  fill(255);
  textSize(18);
  text("Score: " + score, 10, 24);
  // TODO: If won is true, show a winning message with text().

  // TODO: If lost is true, show a losing message.
`, at: { endOf: 'function draw' } },
      ],
    },
  ],
  stretch: ['Add a second key and a second door.', 'Make the lava pulse in size using `sin(frameCount * 0.05)`.', 'Make the key float and glint.'],
  reflect: 'List the conditions a player must meet to win. How did your playtester handle the puzzle?',
});

lesson({
  id: 'a4', title: 'Restart and Repeat', mins: 35, concepts: ['functions', 'for loops'], path: 'adventure',
  hook: 'You just learned about functions at the Crossing. Now use them in your game, then meet the for loop, which grows a whole forest from one line.',
  steps: [
    {
      title: 'Write a resetGame function', mins: 8,
      reveal: true,
      say: 'Use what you learned at the Crossing: write a function called `resetGame` at the bottom that puts every starting value back. Look at your variables and decide which ones change during play.',
      code: `function resetGame() {
  playerX = 60;
  playerY = 60;
  score = 0;
  won = false;
  lost = false;
  hasKey = false;
}`,
      at: { end: true },
      check: /function\s+resetGame/,
      hint: 'Check each variable at the top of your code. If it changes while the game runs, reset it here.',
    },
    {
      title: 'Press R to restart', mins: 4,
      reveal: true,
      say: 'p5 calls `keyPressed()` once per key press. Write your own `keyPressed()` at the bottom that calls `resetGame()` when `key === "r"`.',
      code: `function keyPressed() {
  if (key === "r") {
    resetGame();
  }
}`,
      at: { end: true },
      check: [/function\s+keyPressed/, /resetGame\s*\(\s*\)\s*;/],
    },
    {
      title: 'Your first for loop', mins: 10,
      say: 'A **for loop** repeats code while counting. It has three parts:\n\n`for (start; keep going while; change each time)`\n\nGrow a line of trees across the bottom of the map. Add this above `// pond`.',
      code: `  // tree line
  fill(40, 110, 60);
  for (let x = 0; x < width; x = x + 40) {
    ellipse(x + 20, 390, 44, 44);
  }

`,
      at: { before: '// pond' },
      check: /for\s*\(\s*let\s+\w+\s*=/,
      hint: 'Separate the three parts with semicolons, not commas.',
    },
    {
      title: 'Loop with math', mins: 8,
      reveal: true,
      say: 'Just below `background`, use a for loop to scatter 40 small flowers. Try an `x` of `(i * 97) % 400` and a `y` of `(i * 53) % 400`. `%` gives the remainder, which wraps big numbers back onto the canvas, so the pattern looks random but is not.',
      code: `
  // flowers
  fill(255, 240, 150);
  for (let i = 0; i < 40; i = i + 1) {
    ellipse((i * 97) % 400, (i * 53) % 400, 5, 5);
  }`,
      at: { after: 'background(110, 180, 90);' },
      check: /(?:for\s*\([\s\S]*){2,}/,
    },
    {
      title: 'Your scenery', mins: 5,
      say: 'Use a loop to add scenery to fit your world: rocks, cacti, seaweed, torches. Try changing the numbers in the loop and watching the pattern change.',
    },
  ],
  stretch: ['Use a loop inside a loop to draw a checkerboard floor.', 'Make the flowers sway using `frameCount`.', 'Show "Press R to try again" when the game ends.'],
  reflect: 'What does each of the three parts of a for loop do? What happens if you forget the last part?',
});

lesson({
  id: 'a5', title: 'A World of Walls', mins: 35, concepts: ['arrays', 'objects', 'looping over arrays'], path: 'adventure',
  hook: 'One wall took four variables. A real maze needs many more. Today you learn the data structure that makes big worlds possible.',
  steps: [
    {
      title: 'Meet objects', mins: 6,
      say: 'An **object** bundles related values under one name: `{ x: 150, y: 60 }`. You read them with a dot: `wall.x`.\n\nAn **array** is an ordered list inside `[ ]`. Together, they make a list of walls! Replace your four wall variables with this:',
      code: `let walls = [
  { x: 150, y: 60, w: 40, h: 220 },
  { x: 300, y: 0, w: 40, h: 60 },
  { x: 300, y: 140, w: 40, h: 260 },
];`,
      at: { replace: 'let wallX = 150;\nlet wallY = 60;\nlet wallW = 40;\nlet wallH = 220;' },
      check: /let\s+\w+\s*=\s*\[\s*\{/,
    },
    {
      title: 'Draw them all', mins: 7,
      say: '`walls.length` is how many items the list has, and `walls[0]` is the **first**, because counting starts at 0. A loop visits each. Replace your old `rect`:',
      code: `for (let i = 0; i < walls.length; i = i + 1) {
    let w = walls[i];
    rect(w.x, w.y, w.w, w.h);
  }`,
      at: { replace: 'rect(wallX, wallY, wallW, wallH);' },
      check: /\.length/,
    },
    {
      title: 'A helper that returns an answer', mins: 6,
      reveal: true,
      say: 'You will need that long overlap check again and again. Write a function called `hitsWall(x, y)` at the bottom. It loops over `walls` and **returns** `true` if a player at that position overlaps any wall. If the loop finishes without a hit, it returns `false`.',
      code: `function hitsWall(x, y) {
  for (let i = 0; i < walls.length; i = i + 1) {
    let w = walls[i];
    if (x < w.x + w.w && x + playerSize > w.x && y < w.y + w.h && y + playerSize > w.y) {
      return true;
    }
  }
  return false;
}`,
      at: { end: true },
      check: /return\s+true[\s\S]*return\s+false/,
      hint: 'The four-part overlap check from your bump code goes inside the loop. Use x and y in place of playerX and playerY.',
    },
    {
      title: 'Use your helper', mins: 8,
      reveal: true,
      say: 'Replace your whole bump check so it uses `hitsWall`. Test one direction at a time so the player still slides: call `hitsWall(playerX, oldY)` and undo `x` if it hits. Then call `hitsWall(playerX, playerY)` and undo `y` if it hits.',
      code: `// bump into walls
  if (hitsWall(playerX, oldY)) {
    playerX = oldX;
  }
  if (hitsWall(playerX, playerY)) {
    playerY = oldY;
  }`,
      at: { replace: `// bump into the wall
  if (playerX < wallX + wallW &&
      playerX + playerSize > wallX &&
      playerY < wallY + wallH &&
      playerY + playerSize > wallY) {
    // try keeping the y move, and undo only x
    playerX = oldX;
    if (playerY < wallY + wallH && playerY + playerSize > wallY && playerX < wallX + wallW && playerX + playerSize > wallX) {
      playerY = oldY;
    }
  }` },
      check: /if\s*\(\s*hitsWall\s*\(/,
    },
    {
      title: 'Design your maze', mins: 8,
      reveal: true,
      say: 'Add at least one more wall to your array, one line each, until you have a real maze. Keep the two walls beside the door, because they seal off the treasure. Check that the key can still be reached.',
      code: '  { x: 40, y: 280, w: 200, h: 30 },',
      at: { after: '{ x: 300, y: 140, w: 40, h: 260 },' },
      check: /(?:\{\s*x\s*:[\s\S]*){4,}/,
      hint: 'You need at least 4 walls in the array.',
    },
  ],
  stretch: ['Give each wall a `color` property.', 'Add a `secret: true` wall the player can walk through.', 'Add a moving wall using a `speed` property.'],
  reflect: 'How does a function with `return` make your code easier to read? Show an example from your game.',
});

lesson({
  id: 'a6', title: 'Gem Hunt', mins: 35, concepts: ['array methods', 'removing while looping'], path: 'adventure',
  hook: 'One key is a puzzle, and a dozen gems is a reason to explore every corner. Today your list changes as the game runs.',
  steps: [
    {
      title: 'Build the gem list', mins: 7,
      reveal: true,
      say: 'Write a function called `makeGems()` at the bottom that **returns** a list of at least four `{ x, y }` objects. Using a function means a restart can bring every gem back.',
      code: `function makeGems() {
  return [
    { x: 30, y: 200 },
    { x: 220, y: 40 },
    { x: 230, y: 350 },
    { x: 350, y: 300 },
  ];
}`,
      at: { end: true },
      check: /return\s*\[/,
    },
    {
      title: 'Create the list', mins: 3,
      reveal: true,
      say: 'Create a variable called `gems` at the top, and fill it by calling your function.',
      code: 'let gems = makeGems();',
      at: { after: 'let treasureY = 40;' },
      check: /let\s+\w+\s*=\s*\w+\s*\(\s*\)/,
    },
    {
      title: 'Loop backward and remove', mins: 12,
      say: '`splice(i, 1)` removes 1 item at position `i`.\n\nHere is a sneaky bug: removing an item slides everything after it down a place, so a forward loop would skip the next gem. Looping **backward** avoids it. Add this above `// player`:',
      code: `  // gems
  fill(120, 240, 230);
  for (let i = gems.length - 1; i >= 0; i = i - 1) {
    let g = gems[i];
    ellipse(g.x, g.y, 16, 16);
    if (dist(playerX + 15, playerY + 15, g.x, g.y) < 22) {
      gems.splice(i, 1);
      score = score + 5;
    }
  }
`,
      at: { before: '// player' },
      check: /\.splice\s*\(/,
    },
    {
      title: 'Fix the restart', mins: 3,
      reveal: true,
      say: 'Have `resetGame` fetch a fresh list of gems.',
      code: '  gems = makeGems();',
      at: { after: '  score = 0;' },
      check: /^\s*\w+\s*=\s*\w+\s*\(\s*\)\s*;/m,
    },
    {
      title: 'Require all gems to win', mins: 5,
      reveal: true,
      say: 'Make the treasure chest count only once the list is **empty**. Add one more condition to your treasure `if` using `&&`. `===` asks "exactly equal?".',
      code: 'if (hasKey && gems.length === 0 && dist(playerX + 15, playerY + 15, treasureX, treasureY) < 30) {',
      at: { replace: 'if (hasKey && dist(playerX + 15, playerY + 15, treasureX, treasureY) < 30) {' },
      check: /\.length\s*===?\s*0/,
    },
    {
      title: 'Show progress', mins: 5,
      reveal: true,
      say: 'Show players how many gems remain, using `text()` and `gems.length`. Then spread gems around your map so collecting them means exploring it all.',
      code: '  text("Gems left: " + gems.length, 230, 46);',
      at: { after: 'text("Score: " + score, 10, 24);' },
      check: /text\s*\([^)]*\.length/,
    },
  ],
  stretch: ['Give gems a `value` property so some are worth more.', 'Make the gems pulse in size.', 'Use `push()` to drop a bonus gem when the door opens.'],
  reflect: 'Why does the backward loop avoid skipping gems? Try drawing it on paper with 3 gems.',
});

lesson({
  id: 'a7', title: 'Maps Made of Letters', mins: 40, concepts: ['classes', '2D data', 'nested loops'], path: 'adventure',
  hook: 'Pros do not type the coordinates of every wall. They paint maps with letters, and a program builds the world. Today your map becomes something you can draw with a keyboard.',
  steps: [
    {
      title: 'A Gem class', mins: 8,
      reveal: true,
      say: 'You built classes at the last Crossing. Write a class called `Gem` at the bottom. Its constructor takes `x` and `y`. Give it a `show()` method that draws the gem, and a `touches()` method that **returns** whether the player is within 22 dots of it.',
      code: `class Gem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  show() {
    fill(120, 240, 230);
    ellipse(this.x, this.y, 16, 16);
  }

  touches() {
    return dist(playerX + 15, playerY + 15, this.x, this.y) < 22;
  }
}`,
      at: { end: true },
      check: /class\s+Gem\s*\{/,
      hint: 'Your gem loop already has the drawing and the dist() check. Move them here, and use this.x and this.y.',
    },
    {
      title: 'Draw a map with letters', mins: 8,
      say: 'Each string is a row, and each character is a 40-by-40 tile: `#` is wall, `g` is a gem, and `.` is open ground. This is a **2D** data structure. Add it at the top:',
      code: `let tileMap = [
  "..........",
  "..g.#.....",
  "....#..g..",
  ".####.###.",
  "......#...",
  ".g....#.g.",
  "###...#...",
  "......###.",
  "..g.......",
  "..........",
];
`,
      at: { top: true },
      check: /let\s+\w+\s*=\s*\[\s*"/,
    },
    {
      title: 'Build it with nested loops', mins: 11,
      say: 'A loop inside a loop visits every tile: the outer one picks a row, the inner walks across it. `tileMap[row][col]` reads one character. Multiply by 40 to turn tile numbers into pixels. Add this at the bottom:',
      code: `function buildMap() {
  walls = [];
  gems = [];
  for (let row = 0; row < tileMap.length; row = row + 1) {
    for (let col = 0; col < tileMap[row].length; col = col + 1) {
      let tile = tileMap[row][col];
      if (tile === "#") {
        walls.push({ x: col * 40, y: row * 40, w: 40, h: 40 });
      }
      if (tile === "g") {
        gems.push(new Gem(col * 40 + 20, row * 40 + 20));
      }
    }
  }
}`,
      at: { end: true },
      check: [/for[\s\S]*for[\s\S]*\[\s*\w+\s*\]\s*\[\s*\w+\s*\]/, /new\s+\w+\s*\(/],
    },
    {
      title: 'Use the class', mins: 4,
      reveal: true,
      say: 'The gems are `Gem` objects now. In your gem loop, replace the drawing line and the `dist` check so each gem handles itself, using `g.show()` and `g.touches()`.',
      code: `g.show();
    if (g.touches()) {`,
      at: { replace: `ellipse(g.x, g.y, 16, 16);
    if (dist(playerX + 15, playerY + 15, g.x, g.y) < 22) {` },
      check: /\.\w+\s*\(\s*\)\s*\)\s*\{/,
    },
    {
      title: 'Plug it in', mins: 4,
      reveal: true,
      say: 'Call `buildMap()` in `setup()`, and again in `resetGame()` in place of `gems = makeGems();`.',
      edits: [
        { code: '  buildMap();', at: { replace: '  gems = makeGems();' } },
        { code: '  buildMap();', at: { after: 'createCanvas(400, 400);' } },
      ],
      show: `// in setup():
buildMap();

// in resetGame(), instead of gems = makeGems();
buildMap();`,
      check: /(?:^\s*buildMap\s*\(\s*\)\s*;[\s\S]*){2,}/m,
    },
    {
      title: 'Paint your own map', mins: 5,
      say: 'Move the letters around to design your world. Move your key, door, and treasure to fit it too. Check that the starting spot, top left, is not inside a wall.',
    },
  ],
  stretch: ['Add `L` as a lava tile.', 'Add `K` to place the key from the map.', 'Make a second map and switch to it through a door: that is a room change!'],
  reflect: 'Why does `tileMap[row][col]` use row first? What would you see if they were swapped?',
});

lesson({
  id: 'a8', title: 'The Hunter', mins: 40, concepts: ['algorithms', 'breadth-first search', 'queues'], path: 'adventure',
  hook: 'Time for a famous algorithm. You will write breadth-first search, the idea behind enemy AI, map apps, and maze solvers. Your enemy will find its way to you through any maze you can design.',
  steps: [
    {
      title: 'How BFS thinks', mins: 5,
      say: 'Picture water poured on your map. It spreads to every neighboring tile, then their neighbors, in rings. The first time it touches the goal, it has followed a **shortest path**.\n\nThat is **breadth-first search**. It uses a **queue**, a list where you add to the back and take from the front, like a lunch line. Read this over, and talk it through with a partner before moving on.',
    },
    {
      title: 'Which tiles are open?', mins: 5,
      reveal: true,
      say: 'First a small helper. Write a function called `isOpen(col, row)` at the bottom. Return `false` if the tile is off the map. `||` means **or**, so one `if` can check all four edges. Otherwise, return whether `tileMap[row][col]` is something other than `"#"`.',
      code: `function isOpen(col, row) {
  if (row < 0 || row >= tileMap.length || col < 0 || col >= tileMap[0].length) {
    return false;
  }
  return tileMap[row][col] !== "#";
}`,
      at: { end: true },
      check: [/function\s+isOpen/, /return\s+false/],
    },
    {
      title: 'Write the search', mins: 15,
      reveal: true,
      say: 'This is the heart of it. Press **Add the starter code**, then read every comment. We start at the goal (the player) and spread out until we reach the hunter. `cameFrom` remembers which tile led to which, so the hunter simply follows it home.\n\nThree key lines are left for you, marked TODO. They are what make this a queue.',
      code: `function nextStep(startCol, startRow, goalCol, goalRow) {
  let queue = [{ col: goalCol, row: goalRow }];
  let cameFrom = {};
  cameFrom[goalCol + "," + goalRow] = null;

  while (queue.length > 0) {
    // take the next tile from the front of the line
    let current = queue.shift();

    // did the water reach the hunter?
    if (current.col === startCol && current.row === startRow) {
      return cameFrom[current.col + "," + current.row];
    }

    // spread to the four neighbors
    let neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];
    for (let i = 0; i < neighbors.length; i = i + 1) {
      let n = neighbors[i];
      let id = n.col + "," + n.row;
      if (isOpen(n.col, n.row) && cameFrom[id] === undefined) {
        cameFrom[id] = current;
        queue.push(n);
      }
    }
  }
  return null;
}`,
      at: { end: true },
      check: [/while\s*\(/, /\.shift\s*\(\s*\)/, /\.push\s*\(/, /cameFrom\s*\[\s*\w+\s*\]\s*=\s*\w/],
      hint: 'TODO 1: let current = queue.shift(); TODO 3 uses queue.push(n).',
      skeleton: [
        { code: `function nextStep(startCol, startRow, goalCol, goalRow) {
  let queue = [{ col: goalCol, row: goalRow }];
  let cameFrom = {};
  cameFrom[goalCol + "," + goalRow] = null;

  while (queue.length > 0) {
    // TODO 1: Take the next tile from the FRONT of the line.
    // Replace null below. A list's .shift() removes and returns its first item.
    let current = null;

    // did the water reach the hunter?
    if (current.col === startCol && current.row === startRow) {
      return cameFrom[current.col + "," + current.row];
    }

    // spread to the four neighbors
    let neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];
    for (let i = 0; i < neighbors.length; i = i + 1) {
      let n = neighbors[i];
      let id = n.col + "," + n.row;
      if (isOpen(n.col, n.row) && cameFrom[id] === undefined) {
        // TODO 2: Remember that we reached n from current. Store current in cameFrom[id].

        // TODO 3: Add n to the BACK of the line.

      }
    }
  }
  return null;
}`, at: { end: true } },
      ],
    },
    {
      title: 'Create the hunter', mins: 4,
      reveal: true,
      say: 'The hunter walks from tile to tile, so it remembers its current spot and where it is headed. Create an object called `hunter` near the top with `x`, `y`, `targetX`, and `targetY`, all set to 380. Then set those four values back to 380 in `resetGame`.',
      edits: [
        { code: 'let hunter = { x: 380, y: 380, targetX: 380, targetY: 380 };', at: { after: 'let gems = makeGems();' } },
        { code: `  hunter.x = 380;
  hunter.y = 380;
  hunter.targetX = 380;
  hunter.targetY = 380;`, at: { after: '  score = 0;' } },
      ],
      show: `let hunter = { x: 380, y: 380, targetX: 380, targetY: 380 };

// in resetGame(), put it back in the corner:
hunter.x = 380;
hunter.y = 380;
hunter.targetX = 380;
hunter.targetY = 380;`,
      check: /let\s+hunter\s*=\s*\{/,
    },
    {
      title: 'Make it hunt', mins: 8,
      reveal: true,
      say: 'When the hunter reaches its target tile, it asks your search where to go next. Between tiles, it glides 1.5 dots a frame. Press **Add the starter code**, then finish the two TODOs. Change the speed to set the difficulty.',
      code: `  // hunter
  if (dist(hunter.x, hunter.y, hunter.targetX, hunter.targetY) < 2) {
    hunter.x = hunter.targetX;
    hunter.y = hunter.targetY;
    let step = nextStep(
      floor(hunter.x / 40),
      floor(hunter.y / 40),
      floor((playerX + 15) / 40),
      floor((playerY + 15) / 40)
    );
    if (step) {
      hunter.targetX = step.col * 40 + 20;
      hunter.targetY = step.row * 40 + 20;
    }
  }
  if (hunter.x < hunter.targetX) { hunter.x = hunter.x + 1.5; }
  if (hunter.x > hunter.targetX) { hunter.x = hunter.x - 1.5; }
  if (hunter.y < hunter.targetY) { hunter.y = hunter.y + 1.5; }
  if (hunter.y > hunter.targetY) { hunter.y = hunter.y - 1.5; }
  fill(200, 40, 70);
  ellipse(hunter.x, hunter.y, 28, 28);
  if (dist(hunter.x, hunter.y, playerX + 15, playerY + 15) < 26) {
    lost = true;
  }
`,
      at: { before: '// player' },
      check: [/\w+\s*\(\s*floor\s*\(/, /targetX\s*=[^;]*\bcol\b/],
      hint: 'The first argument to nextStep is floor(hunter.x / 40).',
      skeleton: [
        { code: `  // hunter
  if (dist(hunter.x, hunter.y, hunter.targetX, hunter.targetY) < 2) {
    hunter.x = hunter.targetX;
    hunter.y = hunter.targetY;

    // TODO 1: Replace null with a call to nextStep. It takes four TILE numbers:
    // the hunter's column and row, then the player's column and row.
    // Turn pixels into tiles with floor(pixels / 40). Use the player's center, playerX + 15.
    let step = null;

    if (step) {
      // TODO 2: Set hunter.targetX and hunter.targetY to the CENTER of that tile.
      // A tile's center is step.col * 40 + 20.

    }
  }
  if (hunter.x < hunter.targetX) { hunter.x = hunter.x + 1.5; }
  if (hunter.x > hunter.targetX) { hunter.x = hunter.x - 1.5; }
  if (hunter.y < hunter.targetY) { hunter.y = hunter.y + 1.5; }
  if (hunter.y > hunter.targetY) { hunter.y = hunter.y - 1.5; }
  fill(200, 40, 70);
  ellipse(hunter.x, hunter.y, 28, 28);
  if (dist(hunter.x, hunter.y, playerX + 15, playerY + 15) < 26) {
    lost = true;
  }
`, at: { before: '// player' } },
      ],
    },
    {
      title: 'Outsmart it', mins: 3,
      say: 'Play! Lure the hunter into long routes around your walls. Change your map and watch: the hunter finds the new shortest path without changing a line of its code. That is the power of an algorithm.',
    },
  ],
  stretch: ['Make the search stop when the player is far away, so the hunter can lose you.', 'Add a second hunter with a different speed.', 'Draw the path the hunter plans to take.'],
  reflect: 'Why does BFS always find a shortest path? What would change if you used `.pop()` instead of `.shift()`? Try it!',
});
