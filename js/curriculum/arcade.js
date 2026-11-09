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
      reveal: true,
      say: 'Name the ship\'s speed once, so you can retune your game by changing one number. Make a variable called `shipSpeed` and set it to 5.',
      code: 'let shipSpeed = 5;',
      at: { after: 'let playerSize = 40;' },
      check: /let\s+\w*[sS]peed\w*\s*=/,
      hint: 'Use `let`, like your other variables.',
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
      reveal: true,
      say: 'Keep the ship on the screen. `constrain(value, low, high)` keeps a number inside a range. Use it on `playerX`.',
      code: '  playerX = constrain(playerX, 0, width - playerSize);\n',
      at: { before: '// player' },
      check: /constrain\s*\(/,
      hint: 'The highest value allowed is `width - playerSize`.',
    },
    {
      title: 'Flickering engine', mins: 8,
      reveal: true,
      say: 'Add a flame under the ship: a triangle whose tip uses `random`, so it changes every frame. Use `playerX` and `playerY` so it follows the ship.',
      code: `
  // engine flame
  fill(255, random(100, 220), 40);
  triangle(playerX + 10, playerY + playerSize, playerX + 30, playerY + playerSize, playerX + 20, playerY + playerSize + random(8, 20));`,
      at: { endOf: 'function draw' },
      check: /random\s*\(/,
      hint: '`random(8, 20)` added to the bottom of the ship makes a good flame tip.',
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
      reveal: true,
      say: 'When `bulletActive` is true, move the bullet up and draw it as a thin rectangle. Remember that up means a **smaller** `y`.',
      code: `  // bullet
  if (bulletActive) {
    bulletY = bulletY - 8;
    fill(255, 240, 120);
    rect(bulletX, bulletY, 4, 14);
  }
`,
      at: { before: '// player' },
      check: /if\s*\(\s*\w+\s*\)\s*\{[\s\S]*-\s*\d/,
      hint: 'Inside `if (bulletActive) {`, subtract 8 from `bulletY`, then use `rect`.',
    },
    {
      title: 'End of its life', mins: 5,
      reveal: true,
      say: 'Once you fire, you can never fire again, because the bullet stays active far above the screen. When it passes the top, set `bulletActive` to `false`.',
      code: `    if (bulletY < 0) {
      bulletActive = false;
    }`,
      at: { after: 'rect(bulletX, bulletY, 4, 14);' },
      check: /=\s*false[\s\S]*\w+\s*=\s*false|if\s*\(\s*\w+\s*<\s*-?\d+/,
      hint: 'The top of the screen is `y = 0`. Put your check inside the `if (bulletActive)` block.',
    },
    {
      title: 'Count your shots', mins: 5,
      reveal: true,
      say: 'Count how many shots you have fired, and show it on screen. It proves your code runs exactly once per shot.',
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
      hint: 'Make a variable, add 1 where the shot fires, and use `text` at the end of `draw()`.',
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
      reveal: true,
      say: 'You lose if the enemy reaches your ship, and you win at 100 points. Set `lost` or `won` to `true` when each one happens.',
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
      hint: 'The bottom of the enemy is `enemyY + 30`. Compare it to `playerY`.',
    },
    {
      title: 'Show what happened', mins: 5,
      reveal: true,
      say: 'Press **Add the starter code** to show the score. Then finish the TODOs, so the game says when the player wins or loses.',
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
      hint: 'Write `if (won) {`, then use `text` inside it.',
      skeleton: [
        { code: `
  // score and messages
  fill(255);
  textSize(18);
  text("Score: " + score, 290, 24);
  // TODO: If won is true, show a winning message with text().

  // TODO: If lost is true, show a losing message.
`, at: { endOf: 'function draw' } },
      ],
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
      reveal: true,
      say: 'Use what you learned at the Crossing: write a function called `resetGame` at the bottom that puts every starting value back. Look at your variables and decide which ones change during play.',
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
      reveal: true,
      say: 'Just below `background`, draw 50 stars with a for loop. Give each star an `x` of `(i * 83) % 400` and a `y` of `(i * 47 + frameCount) % 400`. Adding `frameCount` makes them move, and `%` gives the remainder, which wraps a star back to the top.',
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
      reveal: true,
      say: 'The hit test only knows about one bullet, and `bulletActive` is gone. Rewrite it as a loop over `bullets`, using the same backward loop. If a bullet is close to the enemy, remove it, add to the score, and send the enemy back to the top. `break` stops the loop early, which you want once one bullet has hit.',
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
      reveal: true,
      say: 'Your `resetGame` still mentions `bulletActive`. Make it empty the list instead. Then fire away, and try printing `bullets.length` on screen to watch the list grow and shrink.',
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
      reveal: true,
      say: 'Replace your three enemy variables with a list called `enemies`, built by a function called `makeEnemies()`. Inside the function, start an empty list, use a for loop to `push` six `{ x, y, speed }` objects, and **return** the list.',
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
      hint: 'Spacing the enemies out is math on the loop counter, like 20 + i * 55.',
    },
    {
      title: 'March them all', mins: 9,
      reveal: true,
      say: 'Replace your old enemy block with a backward loop over `enemies`. Use `let e = enemies[i];`, then do for `e.x`, `e.y`, and `e.speed` what your old code did for one enemy. Move the check for reaching the player inside the loop too. End the loop body with the comment `// HIT CHECK GOES HERE`, for the next step.',
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
      check: /enemies\s*\[\s*\w+\s*\]/,
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
      reveal: true,
      say: 'Losing is now handled in the loop. Replace your old win-or-lose block with one rule: you win when the list is **empty**.',
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
      reveal: true,
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
      reveal: true,
      say: 'You built classes at the last Crossing, and enemies are a natural fit. Write a class called `Enemy` at the bottom, with `x`, `y`, and `speed`. Give it an `update()` method that moves and bounces, and a `show()` method that draws.',
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
      check: /class\s+Enemy\s*\{/,
      hint: 'Your enemy loop already has this code. Move it here, and change e. to this.',
    },
    {
      title: 'Let enemies handle themselves', mins: 4,
      reveal: true,
      say: 'Replace the moving and drawing lines in your enemy loop with two method calls, so each enemy handles itself.',
      code: `e.update();
    e.show();`,
      at: { replace: `e.x = e.x + e.speed;
    if (e.x > width - 30 || e.x < 0) {
      e.speed = e.speed * -1;
      e.y = e.y + 30;
    }
    fill(255, 90, 120);
    rect(e.x, e.y, 30, 30);` },
      check: /\be\.update\s*\(\s*\)/,
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
      reveal: true,
      say: 'Rewrite `makeEnemies` so it reads the current wave with `let w = waves[wave];`. Loop `w.count` times and push a `new Enemy` that uses `w.speed`. Then fill the list in `setup()` with `enemies = makeEnemies();`, and set `wave = 0;` in `resetGame` before it builds the enemies.',
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
      check: /new\s+Enemy\s*\(/,
    },
    {
      title: 'Next wave!', mins: 6,
      reveal: true,
      say: 'When the screen is clear, add 1 to `wave`. If there is another wave in the list, build it. If not, the player wins. Replace your old win check.',
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
      check: /wave\s*<\s*waves\.length/,
    },
    {
      title: 'Write your own waves', mins: 4,
      reveal: true,
      say: 'Add wave data to your list, and show the wave number on screen using `text()` and `wave + 1`. Build a difficulty curve: easy, harder, then a surprise.',
      code: '  text("Wave " + (wave + 1), 10, 46);',
      at: { after: 'text("Score: " + score, 290, 24);' },
      check: /text\s*\([^)]*wave/i,
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
      reveal: true,
      say: 'Create a `boss` object at the top with `x: 170`, `y: 40`, `hp: 20`, `state: "patrol"`, `timer: 0`, and `speed: 2`. Also create `bossActive` set to `false`, and an empty list called `enemyShots`. The boss only shows up after the final wave.',
      code: `let boss = { x: 170, y: 40, hp: 20, state: "patrol", timer: 0, speed: 2 };
let bossActive = false;
let enemyShots = [];`,
      at: { after: 'let wave = 0;' },
      check: /state\s*:/,
    },
    {
      title: 'The state machine', mins: 10,
      reveal: true,
      say: 'Each frame the boss checks its state and does just that one thing. `timer` counts frames in the current state. At 60 frames a second, 120 is 2 seconds. Press **Add the starter code**. The `patrol` state is finished, as your example. Finish the other two.',
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
      check: [/state\s*=\s*"rest"/, /state\s*=\s*"patrol"/, /else\s+if/],
      hint: 'Each TODO has the same shape as the if (boss.timer > 120) block in patrol.',
      skeleton: [
        { code: `function updateBoss() {
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
    // TODO 1: When the timer passes 40, call fireAtPlayer(),
    // switch to the "rest" state, and set the timer back to 0.

  } else if (boss.state === "rest") {
    // TODO 2: When the timer passes 60, switch back to "patrol",
    // and set the timer back to 0.

  }
}`, at: { end: true } },
      ],
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
      reveal: true,
      say: 'Press **Add the starter code** to draw the boss and its shots, including a flash while it aims as a warning. Then finish the two TODOs. Last, change `won = true` in your wave check to `bossActive = true`, so the boss appears instead of you winning.',
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
      check: [/\.hp\s*(?:=\s*\w+\.hp\s*-|-=|--)/, /bossActive\s*=\s*true/, /\.hp\s*<=?\s*0/],
      hint: 'For TODO 1, a point is inside a box when b.x > boss.x and b.x < boss.x + 60, and the same for y with 40.',
      skeleton: [
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
      // TODO 1: If b is inside the boss's box (60 wide, 40 tall),
      // remove the bullet, subtract 1 from boss.hp, and add 5 to the score.

    }

    // TODO 2: If the boss has no health left, the player has won.

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
      ],
    },
    {
      title: 'Fix the restart', mins: 4,
      reveal: true,
      say: 'Reset the boss in `resetGame`: `bossActive` back to false, then `hp`, `state`, and `timer`, and an empty `enemyShots`. Then play, and tune its timers and health. Can you add a fourth state, like a charge?',
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
