// THE STAR ROAD: an arcade shooter that grows from one ship to waves and a thinking boss.
import { lesson } from './engine.js';

lesson({
  id: 's1', title: 'Ready for Launch', mins: 30, concepts: ['variables', 'keyboard input'], path: 'arcade',
  hook: 'Welcome to the Star Road. Over the coming weeks you will build an arcade shooter with waves of enemies and a boss with a mind of its own. First, you need a ship.',
  starter: `let playerX = 180;
let playerY = 340;
let playerSize = 40;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(8, 10, 30);

  // player
  fill(120, 220, 255);
  noStroke();
  rect(playerX, playerY, playerSize, playerSize);
}
`,
  steps: [
    {
      title: 'A speed variable', mins: 3,
      say: 'Name the ship\'s speed once, so you can tune your whole game by changing one number.',
      code: 'let shipSpeed = 5;',
      at: { after: 'let playerSize = 40;' },
      check: /let\s+\w*[sS]peed\w*\s*=/,
    },
    {
      title: 'Fly left and right', mins: 8,
      say: '`keyIsDown()` checks whether a key is held, every frame. Add this above `// player`, then click the canvas so it can hear your keys.',
      code: `  // flying
  if (keyIsDown(LEFT_ARROW)) {
    playerX = playerX - shipSpeed;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    playerX = playerX + shipSpeed;
  }
`,
      at: { before: '// player' },
      check: /keyIsDown\s*\(/,
    },
    {
      title: 'Stay on the screen', mins: 4,
      say: '`constrain(value, low, high)` keeps a number inside a range.',
      code: '  playerX = constrain(playerX, 0, width - playerSize);\n',
      at: { before: '// player' },
      check: /constrain\s*\(/,
    },
    {
      title: 'Flickering engine', mins: 8,
      say: '`random(a, b)` gives a new number every time it runs. Since `draw()` runs 60 times a second, that makes a flicker. Add a flame at the very end of `draw()`, using the ship\'s position so it follows along.',
      code: `
  // engine flame
  fill(255, random(100, 220), 40);
  triangle(playerX + 10, playerY + playerSize, playerX + 30, playerY + playerSize, playerX + 20, playerY + playerSize + random(8, 20));`,
      at: { endOf: 'function draw' },
      check: /random\s*\(/,
    },
    {
      title: 'Pick your mission', mins: 7,
      say: 'Are you a spaceship? A dragon over a city? A submarine firing bubbles? Choose a theme and change the colors to match. Add a shape or two to your ship, using `playerX` and `playerY` so it moves together.',
    },
  ],
  stretch: ['Add up and down movement with limits.', 'Tilt the flame depending on which way you fly.', 'Add a boost while holding Shift.'],
  reflect: 'What is your game about? Why does the flame flicker without any extra code to animate it?',
});

lesson({
  id: 's2', title: 'Fire!', mins: 35, concepts: ['booleans', 'keyPressed', 'object lifecycle'], path: 'arcade',
  hook: 'Today your ship gets a weapon. A bullet seems simple, but it has a whole life: it gets born, travels, and disappears. Booleans will keep track of it.',
  steps: [
    {
      title: 'Bullet variables', mins: 5,
      say: 'A bullet needs a position, plus a **boolean** to say whether it exists right now. Booleans hold only `true` or `false`. Add these at the top.',
      code: 'let bulletX = 0;\nlet bulletY = 0;\nlet bulletActive = false;',
      at: { after: 'let shipSpeed = 5;' },
      check: /let\s+\w+\s*=\s*false/,
    },
    {
      title: 'Pull the trigger', mins: 9,
      say: '`keyPressed()` is a special function p5 calls once per key press. `&&` means **and**, and `!` means **not**, so this reads: "if the key is space and no bullet is active." Add this below `draw()`.',
      code: `function keyPressed() {
  if (key === " " && !bulletActive) {
    bulletX = playerX + playerSize / 2 - 2;
    bulletY = playerY;
    bulletActive = true;
  }
}`,
      at: { end: true },
      check: /function\s+keyPressed/,
    },
    {
      title: 'Send it flying', mins: 8,
      say: 'If the bullet is active, move it up and draw it. Up means **smaller** y, so we subtract. Add this above `// player`.',
      code: `  // bullet
  if (bulletActive) {
    bulletY = bulletY - 8;
    fill(255, 240, 120);
    rect(bulletX, bulletY, 4, 14);
  }
`,
      at: { before: '// player' },
      check: /if\s*\(\s*\w+\s*\)\s*\{[\s\S]*-\s*\d/,
    },
    {
      title: 'End of its life', mins: 5,
      say: 'If you fire once, you can never fire again, because the bullet stays active forever, far above the screen. Add a check inside the `if (bulletActive)` block.',
      code: `    if (bulletY < 0) {
      bulletActive = false;
    }`,
      at: { after: 'rect(bulletX, bulletY, 4, 14);' },
      check: /=\s*false[\s\S]*\w+\s*=\s*false|if\s*\(\s*\w+\s*<\s*-?\d+/,
    },
    {
      title: 'Count your shots', mins: 5,
      say: 'Count how many shots you have fired, and show it on screen. It helps you check that your code runs exactly once per shot.',
      edits: [
        { code: 'let shots = 0;', at: { after: 'let bulletActive = false;' } },
        { code: '    shots = shots + 1;', at: { after: 'bulletActive = true;' } },
        { code: `
  fill(255);
  textSize(16);
  text("Shots: " + shots, 10, 24);`, at: { endOf: 'function draw' } },
      ],
      show: `let shots = 0;            // at the top
shots = shots + 1;        // when you fire
text("Shots: " + shots, 10, 24);   // in draw()`,
      check: /text\s*\([^)]*\+/,
    },
    {
      title: 'Tune your weapon', mins: 3,
      say: 'Change the bullet speed, size, and color. Slow and huge? Tiny and fast? Pick what suits your game.',
    },
  ],
  stretch: ['Make the bullet leave a short trail.', 'Add limited ammo that refills over time.', 'Change the bullet\'s color with `frameCount`.'],
  reflect: 'What would happen without the `bulletActive` check in `keyPressed`? Try removing it and describe what changes.',
});

lesson({
  id: 's3', title: 'Something to Shoot', mins: 40, concepts: ['collision', 'win and lose'], path: 'arcade',
  hook: 'Your ship is armed, but nothing is out there. Today you add an enemy that marches closer and closer, and now your game has stakes.',
  steps: [
    {
      title: 'Game variables', mins: 4,
      say: 'Add these at the top. `won` and `lost` start false, and any part of your game can check them.',
      code: `let score = 0;
let won = false;
let lost = false;
let enemyX = 40;
let enemyY = 40;
let enemySpeed = 2;`,
      at: { after: 'let shots = 0;' },
      check: /let\s+score/,
    },
    {
      title: 'The enemy marches', mins: 10,
      say: 'The enemy slides sideways. At each wall it turns around and steps **down**. `||` means **or**: true if either side is true. Add this above `// player`.',
      code: `  // enemy
  enemyX = enemyX + enemySpeed;
  if (enemyX > width - 30 || enemyX < 0) {
    enemySpeed = enemySpeed * -1;
    enemyY = enemyY + 30;
  }
  fill(255, 90, 120);
  rect(enemyX, enemyY, 30, 30);
`,
      at: { before: '// player' },
      check: /\|\|/,
    },
    {
      title: 'Did the bullet hit?', mins: 10,
      say: '`dist(x1, y1, x2, y2)` gives the distance between two points, which makes a quick hit test. If the bullet is close to the enemy\'s center, it\'s a hit. We send the enemy back to the top, and make it faster.',
      code: `  // did the bullet hit?
  if (bulletActive && dist(bulletX, bulletY, enemyX + 15, enemyY + 15) < 22) {
    bulletActive = false;
    score = score + 10;
    enemyX = 40;
    enemyY = 40;
    enemySpeed = abs(enemySpeed) + 0.5;
  }
`,
      at: { before: '// player' },
      check: /dist\s*\(/,
    },
    {
      title: 'Win and lose', mins: 6,
      say: 'You lose if the enemy reaches your ship, and win at 100 points.',
      code: `  // win or lose
  if (enemyY + 30 > playerY) {
    lost = true;
  }
  if (score >= 100) {
    won = true;
  }
`,
      at: { before: '// player' },
      check: [/lost\s*=\s*true/, /won\s*=\s*true/],
    },
    {
      title: 'Show what happened', mins: 5,
      say: 'Show the score and the ending. Add this at the end of `draw()`.',
      code: `
  // score and messages
  fill(255);
  textSize(18);
  text("Score: " + score, 290, 24);
  if (won) {
    text("Victory!", 165, 200);
  }
  if (lost) {
    text("They got through!", 125, 200);
  }`,
      at: { endOf: 'function draw' },
      check: /if\s*\(\s*(?:won|lost)/,
    },
    {
      title: 'Playtest the balance', mins: 5,
      say: 'Is it too easy? Too hard? Tune the speeds and the score goal, and ask a neighbor to try it. Change the enemy to fit your theme.',
    },
  ],
  stretch: ['Give the enemy 3 health points.', 'Make the enemy shoot back.', 'Add a rare bonus target that flies across the top.'],
  reflect: 'Why do we use `abs(enemySpeed)` when speeding up the enemy? What does the enemy do without `abs`?',
});

lesson({
  id: 's4', title: 'Restart and Repeat', mins: 35, concepts: ['functions', 'for loops'], path: 'arcade',
  hook: 'You just learned about functions at the Crossing, so now use them in your game. Then meet the for loop, which fills your sky with stars from just three lines.',
  steps: [
    {
      title: 'Write a resetGame function', mins: 8,
      say: 'Collect your starting values into one function. Add this at the bottom:',
      code: `function resetGame() {
  playerX = 180;
  bulletActive = false;
  score = 0;
  won = false;
  lost = false;
  enemyX = 40;
  enemyY = 40;
  enemySpeed = 2;
}`,
      at: { end: true },
      check: /function\s+resetGame/,
    },
    {
      title: 'Press R to restart', mins: 4,
      say: 'Call your function when the player presses R.',
      code: `  if (key === "r") {
    resetGame();
  }`,
      at: { after: 'function keyPressed() {' },
      check: /resetGame\s*\(\s*\)\s*;/,
    },
    {
      title: 'Your first for loop', mins: 10,
      say: 'A **for loop** repeats code while counting. It has three parts:\n\n`for (start; keep going while; change each time)`\n\nDraw a row of 8 shield blocks above your ship. Add this above `// player`.',
      code: `  // shield blocks
  fill(90, 200, 140);
  for (let x = 20; x < width; x = x + 50) {
    rect(x, 290, 30, 10);
  }
`,
      at: { before: '// player' },
      check: /for\s*\(\s*let\s+\w+\s*=/,
      hint: 'Separate the three parts with semicolons, not commas.',
    },
    {
      title: 'A scrolling starfield', mins: 8,
      say: 'The loop counter can drive any math. Each star gets its own position, and adding `frameCount` makes them move. `%` gives the remainder, which wraps a star back to the top when it passes 400. Add this just below `background`.',
      code: `
  // stars
  fill(255);
  noStroke();
  for (let i = 0; i < 50; i = i + 1) {
    let starX = (i * 83) % 400;
    let starY = (i * 47 + frameCount) % 400;
    rect(starX, starY, 2, 2);
  }`,
      at: { after: 'background(8, 10, 30);' },
      check: /(?:for\s*\([\s\S]*){2,}/,
    },
    {
      title: 'Make it your sky', mins: 5,
      say: 'Change the loop to fit your theme: faster stars, snow, bubbles, embers. Try a second loop with bigger, slower stars behind them. That is called **parallax**, and it adds depth.',
    },
  ],
  stretch: ['Add a parallax layer of slower stars.', 'Use a loop in a loop to draw a block formation.', 'Show "Press R to try again" when the game ends.'],
  reflect: 'What makes the stars wrap back to the top? Explain what `%` is doing.',
});

lesson({
  id: 's5', title: 'Rapid Fire', mins: 35, concepts: ['arrays', 'objects', 'removing while looping'], path: 'arcade',
  hook: 'One bullet at a time is no way to save the galaxy. Today you learn the data structure that lets you have as many as you like.',
  steps: [
    {
      title: 'Meet arrays and objects', mins: 5,
      say: 'An **object** bundles values together: `{ x: 10, y: 20 }`, and you read them with a dot, like `b.x`. An **array** is a list inside `[ ]`. Our bullets start as an empty list. Replace the three old bullet variables:',
      code: 'let bullets = [];',
      at: { replace: 'let bulletX = 0;\nlet bulletY = 0;\nlet bulletActive = false;' },
      check: /let\s+\w+\s*=\s*\[\s*\]/,
    },
    {
      title: 'Add to the list', mins: 6,
      say: '`push` adds an item to the end of a list. Now each press adds a new bullet. Replace your firing code:',
      code: `if (key === " ") {
    bullets.push({ x: playerX + playerSize / 2 - 2, y: playerY });
    shots = shots + 1;
  }`,
      at: { replace: `if (key === " " && !bulletActive) {
    bulletX = playerX + playerSize / 2 - 2;
    bulletY = playerY;
    bulletActive = true;
    shots = shots + 1;
  }` },
      check: /\.push\s*\(\s*\{/,
    },
    {
      title: 'Loop backward and remove', mins: 11,
      say: '`splice(i, 1)` removes one item at position `i`.\n\nHere is a sneaky bug: removing an item slides everything after it down one place, so a forward loop would skip the next one. Looping **backward** avoids it. Replace your old bullet block:',
      code: `// bullets
  fill(255, 240, 120);
  for (let i = bullets.length - 1; i >= 0; i = i - 1) {
    let b = bullets[i];
    b.y = b.y - 8;
    rect(b.x, b.y, 4, 14);
    if (b.y < 0) {
      bullets.splice(i, 1);
    }
  }`,
      at: { replace: `// bullet
  if (bulletActive) {
    bulletY = bulletY - 8;
    fill(255, 240, 120);
    rect(bulletX, bulletY, 4, 14);
    if (bulletY < 0) {
      bulletActive = false;
    }
  }` },
      check: /\.splice\s*\(/,
    },
    {
      title: 'Check every bullet', mins: 9,
      say: 'The hit test now has to ask about **each** bullet, so it goes in a loop too. `break` stops the loop early, which we want once one bullet has hit.',
      code: `// did a bullet hit?
  for (let i = bullets.length - 1; i >= 0; i = i - 1) {
    if (dist(bullets[i].x, bullets[i].y, enemyX + 15, enemyY + 15) < 22) {
      bullets.splice(i, 1);
      score = score + 10;
      enemyX = 40;
      enemyY = 40;
      enemySpeed = abs(enemySpeed) + 0.5;
      break;
    }
  }`,
      at: { replace: `// did the bullet hit?
  if (bulletActive && dist(bulletX, bulletY, enemyX + 15, enemyY + 15) < 22) {
    bulletActive = false;
    score = score + 10;
    enemyX = 40;
    enemyY = 40;
    enemySpeed = abs(enemySpeed) + 0.5;
  }` },
      check: /(?:\.length[\s\S]*){2,}/,
    },
    {
      title: 'Fix the restart', mins: 4,
      say: 'Your `resetGame` still mentions `bulletActive`. Clear the list instead. Then fire away, and try printing `bullets.length` on screen to watch the list grow and shrink.',
      code: 'bullets = [];',
      at: { replace: 'bulletActive = false;' },
      check: /^\s*\w+\s*=\s*\[\s*\]\s*;/m,
    },
  ],
  stretch: ['Fire two bullets at once, angled apart, by giving each bullet a `vx`.', 'Add a cooldown so holding fire has a limit.', 'Give some bullets more power.'],
  reflect: 'Why does the list need bullets removed? What might happen after a long game if you never removed them?',
});

lesson({
  id: 's6', title: 'The Swarm', mins: 40, concepts: ['nested loops', 'arrays of objects'], path: 'arcade',
  hook: 'One enemy is a duel, and a whole formation is a battle. Today you check every bullet against every enemy: your first truly big loop.',
  steps: [
    {
      title: 'Build a formation', mins: 7,
      say: 'A function can **return** a list. Use a loop to build a row of enemies, so you can get more by changing one number. Replace your three enemy variables:',
      code: `let enemies = makeEnemies();

function makeEnemies() {
  let list = [];
  for (let i = 0; i < 6; i = i + 1) {
    list.push({ x: 20 + i * 55, y: 40, speed: 2 });
  }
  return list;
}
`,
      at: { replace: 'let enemyX = 40;\nlet enemyY = 40;\nlet enemySpeed = 2;' },
      check: /return\s+\w+/,
    },
    {
      title: 'March them all', mins: 9,
      say: 'Each enemy moves on its own. Replace your old enemy block, and notice the bottom check moves into the loop too.',
      code: `// enemies
  for (let i = enemies.length - 1; i >= 0; i = i - 1) {
    let e = enemies[i];
    e.x = e.x + e.speed;
    if (e.x > width - 30 || e.x < 0) {
      e.speed = e.speed * -1;
      e.y = e.y + 30;
    }
    fill(255, 90, 120);
    rect(e.x, e.y, 30, 30);
    if (e.y + 30 > playerY) {
      lost = true;
    }

    // HIT CHECK GOES HERE
  }`,
      at: { replace: `// enemy
  enemyX = enemyX + enemySpeed;
  if (enemyX > width - 30 || enemyX < 0) {
    enemySpeed = enemySpeed * -1;
    enemyY = enemyY + 30;
  }
  fill(255, 90, 120);
  rect(enemyX, enemyY, 30, 30);` },
      check: /\.length[\s\S]*\.x/,
    },
    {
      title: 'Every bullet, every enemy', mins: 12,
      say: 'This is a **nested loop**: for each enemy, try each bullet. With 6 enemies and 10 bullets, that makes 60 checks per frame! We use `j` for the inner loop so it doesn\'t collide with `i`. Replace the `// HIT CHECK GOES HERE` comment, and delete your old hit check.',
      edits: [
        { code: `// did any bullet hit this enemy?
    for (let j = bullets.length - 1; j >= 0; j = j - 1) {
      let b = bullets[j];
      if (dist(b.x, b.y, e.x + 15, e.y + 15) < 22) {
        bullets.splice(j, 1);
        enemies.splice(i, 1);
        score = score + 10;
        break;
      }
    }`, at: { replace: '// HIT CHECK GOES HERE' } },
        { code: '', at: { replace: `  // did a bullet hit?
  for (let i = bullets.length - 1; i >= 0; i = i - 1) {
    if (dist(bullets[i].x, bullets[i].y, enemyX + 15, enemyY + 15) < 22) {
      bullets.splice(i, 1);
      score = score + 10;
      enemyX = 40;
      enemyY = 40;
      enemySpeed = abs(enemySpeed) + 0.5;
      break;
    }
  }
` } },
      ],
      show: `// did any bullet hit this enemy?
for (let j = bullets.length - 1; j >= 0; j = j - 1) {
  let b = bullets[j];
  if (dist(b.x, b.y, e.x + 15, e.y + 15) < 22) {
    bullets.splice(j, 1);
    enemies.splice(i, 1);
    score = score + 10;
    break;
  }
}`,
      check: /for\s*\([\s\S]*for\s*\([\s\S]*\.splice/,
    },
    {
      title: 'New win and lose rules', mins: 5,
      say: 'Losing is now handled in the loop. You win by clearing the list. Replace the old win-or-lose block.',
      code: `// win
  if (enemies.length === 0) {
    won = true;
  }`,
      at: { replace: `// win or lose
  if (enemyY + 30 > playerY) {
    lost = true;
  }
  if (score >= 100) {
    won = true;
  }` },
      check: /\.length\s*===?\s*0/,
    },
    {
      title: 'Fix the restart', mins: 4,
      say: 'Have `resetGame` build a fresh formation, replacing the three old enemy lines.',
      code: '  enemies = makeEnemies();',
      at: { replace: '  enemyX = 40;\n  enemyY = 40;\n  enemySpeed = 2;' },
      check: /^\s*\w+\s*=\s*\w+\s*\(\s*\)\s*;/m,
    },
    {
      title: 'Your formation', mins: 3,
      say: 'Try more rows by using a loop inside `makeEnemies`, or change the spacing and speed. Make the enemies look like your theme.',
    },
  ],
  stretch: ['Make a formation with two rows using nested loops.', 'Let enemies have a `type` that changes their color and points.', 'Drop a power-up when a certain enemy is hit.'],
  reflect: 'How many checks happen each frame with 8 enemies and 5 bullets? What might happen with 1,000 of each?',
});

lesson({
  id: 's7', title: 'Wave After Wave', mins: 40, concepts: ['classes', 'data-driven design'], path: 'arcade',
  hook: 'Pros do not hard-code every level. They describe waves as data, and the game reads it. Today you can add a whole new wave by writing one line.',
  steps: [
    {
      title: 'An Enemy class', mins: 10,
      say: 'You built classes at the last Crossing, and enemies are a natural fit. Add this at the bottom:',
      code: `class Enemy {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
  }

  update() {
    this.x = this.x + this.speed;
    if (this.x > width - 30 || this.x < 0) {
      this.speed = this.speed * -1;
      this.y = this.y + 30;
    }
  }

  show() {
    fill(255, 90, 120);
    rect(this.x, this.y, 30, 30);
  }
}`,
      at: { end: true },
      check: /class\s+\w+\s*\{[\s\S]*constructor/,
    },
    {
      title: 'Let enemies handle themselves', mins: 4,
      say: 'The enemy loop gets much simpler. Replace these lines with two method calls:',
      code: `e.update();
    e.show();`,
      at: { replace: `e.x = e.x + e.speed;
    if (e.x > width - 30 || e.x < 0) {
      e.speed = e.speed * -1;
      e.y = e.y + 30;
    }
    fill(255, 90, 120);
    rect(e.x, e.y, 30, 30);` },
      check: /\.update\s*\(\s*\)|\.\w+\s*\(\s*\)\s*;\s*\n\s*\w+\.\w+\s*\(\s*\)/,
    },
    {
      title: 'Describe waves as data', mins: 8,
      say: 'Each wave is a small object saying how many enemies it has and how fast they go. This is **data-driven design**: the rules live in a list you can edit. Replace the line that makes your enemies:',
      code: `let enemies = [];
let wave = 0;
let waves = [
  { count: 4, speed: 1.5 },
  { count: 6, speed: 2 },
  { count: 7, speed: 3 },
];`,
      at: { replace: 'let enemies = makeEnemies();' },
      check: /let\s+\w+\s*=\s*\[\s*\{\s*\w+\s*:/,
    },
    {
      title: 'Read the data', mins: 8,
      say: 'Have `makeEnemies` read the current wave from your list. Then call it in `setup()`, and have `resetGame` go back to wave 0.',
      edits: [
        { code: `function makeEnemies() {
  let list = [];
  let w = waves[wave];
  for (let i = 0; i < w.count; i = i + 1) {
    list.push(new Enemy(20 + i * 50, 40 + (i % 2) * 40, w.speed));
  }
  return list;
}`, at: { replace: `function makeEnemies() {
  let list = [];
  for (let i = 0; i < 6; i = i + 1) {
    list.push({ x: 20 + i * 55, y: 40, speed: 2 });
  }
  return list;
}` } },
        { code: '  wave = 0;', at: { before: '  enemies = makeEnemies();' } },
        { code: '  enemies = makeEnemies();', at: { after: 'createCanvas(400, 400);' } },
      ],
      show: `function makeEnemies() {
  let list = [];
  let w = waves[wave];
  for (let i = 0; i < w.count; i = i + 1) {
    list.push(new Enemy(20 + i * 50, 40 + (i % 2) * 40, w.speed));
  }
  return list;
}

// in setup():
enemies = makeEnemies();

// in resetGame(), before enemies = makeEnemies();
wave = 0;`,
      check: /new\s+\w+\s*\(/,
    },
    {
      title: 'Next wave!', mins: 6,
      say: 'When the screen is clear, move on to the next wave. Only after the last wave does the player win.',
      code: `// next wave, or win
  if (enemies.length === 0) {
    wave = wave + 1;
    if (wave < waves.length) {
      enemies = makeEnemies();
    } else {
      won = true;
    }
  }`,
      at: { replace: `// win
  if (enemies.length === 0) {
    won = true;
  }` },
      check: /<\s*\w+\.length/,
    },
    {
      title: 'Write your own waves', mins: 4,
      say: 'Add wave data and show the wave number on screen. Build a difficulty curve: easy, harder, then a surprise. Add `text("Wave " + (wave + 1), 10, 46);` to your display.',
      code: '  text("Wave " + (wave + 1), 10, 46);',
      at: { after: 'text("Score: " + score, 290, 24);' },
      check: /text\s*\([^)]*\+/,
    },
  ],
  stretch: ['Add a `pattern` to each wave, such as zig-zag with `sin()`.', 'Give some waves a tough enemy with health.', 'Show a "Wave 2!" banner for 2 seconds using a timer variable.'],
  reflect: 'What is the benefit of keeping waves in a list instead of writing code for each? Could a non-programmer design waves now?',
});

lesson({
  id: 's8', title: 'The Boss Has a Plan', mins: 40, concepts: ['algorithms', 'finite state machines', 'trigonometry'], path: 'arcade',
  hook: 'Time for your first real algorithm for AI. Bosses seem smart, but most follow a simple recipe called a state machine. By the end of today, you will have a boss that aims at the player.',
  steps: [
    {
      title: 'What is a state machine?', mins: 4,
      say: 'A **finite state machine** means something is in exactly one **state** at a time, with clear rules for switching. Our boss has three: `patrol` (move around), `aim` (hold still, a warning to the player), and `rest` (a chance to attack it). Sketch the three states and arrows on paper.',
    },
    {
      title: 'Boss data', mins: 4,
      say: 'Add the boss and its shots at the top. The boss only shows up after the final wave.',
      code: `let boss = { x: 170, y: 40, hp: 20, state: "patrol", timer: 0, speed: 2 };
let bossActive = false;
let enemyShots = [];`,
      at: { after: 'let wave = 0;' },
      check: /state\s*:/,
    },
    {
      title: 'The state machine', mins: 10,
      say: 'Each frame the boss checks its state and does just that one thing. `timer` counts frames in the current state. At 60 frames a second, 120 is 2 seconds. Add this at the bottom:',
      code: `function updateBoss() {
  boss.timer = boss.timer + 1;
  if (boss.state === "patrol") {
    boss.x = boss.x + boss.speed;
    if (boss.x > width - 60 || boss.x < 0) {
      boss.speed = boss.speed * -1;
    }
    if (boss.timer > 120) {
      boss.state = "aim";
      boss.timer = 0;
    }
  } else if (boss.state === "aim") {
    if (boss.timer > 40) {
      fireAtPlayer();
      boss.state = "rest";
      boss.timer = 0;
    }
  } else if (boss.state === "rest") {
    if (boss.timer > 60) {
      boss.state = "patrol";
      boss.timer = 0;
    }
  }
}`,
      at: { end: true },
      check: /===\s*"\w+"[\s\S]*else\s+if/,
    },
    {
      title: 'Aim with trigonometry', mins: 9,
      say: '`atan2(dy, dx)` gives the angle from one point to another. `cos` and `sin` turn an angle back into x and y movement. We fire three shots: one aimed right at the player, and two a little to each side. Add this at the bottom:',
      code: `function fireAtPlayer() {
  let angle = atan2(playerY - boss.y, playerX - boss.x);
  for (let i = -1; i <= 1; i = i + 1) {
    let a = angle + i * 0.25;
    enemyShots.push({ x: boss.x + 30, y: boss.y + 40, vx: cos(a) * 4, vy: sin(a) * 4 });
  }
}`,
      at: { end: true },
      check: [/atan2\s*\(/, /cos\s*\(/],
    },
    {
      title: 'Bring on the boss', mins: 9,
      say: 'Draw the boss, flash it while aiming as a warning, and test bullets and shots. Add this above `// player`. Then change `won = true` in your wave check so that the boss appears instead of you winning.',
      edits: [
        { code: `  // boss
  if (bossActive) {
    updateBoss();
    if (boss.state === "aim" && frameCount % 10 < 5) {
      fill(255);
    } else {
      fill(180, 60, 220);
    }
    rect(boss.x, boss.y, 60, 40);
    fill(255, 0, 80);
    rect(boss.x, boss.y - 10, boss.hp * 3, 5);

    for (let i = bullets.length - 1; i >= 0; i = i - 1) {
      let b = bullets[i];
      if (b.x > boss.x && b.x < boss.x + 60 && b.y > boss.y && b.y < boss.y + 40) {
        bullets.splice(i, 1);
        boss.hp = boss.hp - 1;
        score = score + 5;
      }
    }
    if (boss.hp <= 0) {
      won = true;
    }
  }

  // enemy shots
  fill(255, 120, 60);
  for (let i = enemyShots.length - 1; i >= 0; i = i - 1) {
    let s = enemyShots[i];
    s.x = s.x + s.vx;
    s.y = s.y + s.vy;
    ellipse(s.x, s.y, 10, 10);
    if (dist(s.x, s.y, playerX + 20, playerY + 20) < 22) {
      lost = true;
    }
    if (s.y > height || s.x < 0 || s.x > width) {
      enemyShots.splice(i, 1);
    }
  }
`, at: { before: '// player' } },
        { code: '      bossActive = true;', at: { replace: '      won = true;' } },
      ],
      show: `// above // player: see the boss drawing, bullet test,
// and enemy shots loop below

// in your wave check, replace won = true with:
bossActive = true;`,
      check: /\w+\s*=\s*true[\s\S]*\.hp/,
    },
    {
      title: 'Fix the restart', mins: 4,
      say: 'Reset the boss in `resetGame`, then play. Tune its timers and health. Can you add a fourth state, like a charge?',
      code: `  bossActive = false;
  boss.hp = 20;
  boss.state = "patrol";
  boss.timer = 0;
  enemyShots = [];`,
      at: { before: '  wave = 0;' },
      check: /function\s+resetGame[\s\S]*\.hp\s*=/,
    },
  ],
  stretch: ['Add a fourth state, such as a charge downward.', 'Make the boss angrier below half health by shortening its timers.', 'Add a second attack pattern and pick one at random.'],
  reflect: 'Draw your boss\'s state machine, and label each arrow with what causes the switch. What state would you add next?',
});
