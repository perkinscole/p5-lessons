// Checks for learning: short questions built into each lesson's walkthrough.
// after: show this question once the step at that position (counting from 0) is finished.
const Q = (after, q, options, answer, why, code) => ({ after, q, options, answer, why, code });

export const CHECKS = {
  t1: [
    Q(1, 'What goes between the numbers inside the parentheses?', ['A semicolon', 'A comma', 'Nothing'], 1, 'Commas split the numbers. A semicolon ends the line.', 'ellipse(340, 60, 70, 70);'),
    Q(1, 'Which mark is missing from this line?', ['A comma', 'A )', 'A ;'], 1, 'Every ( needs a matching ).', 'rect(0, 320, 400, 80;'),
    Q(3, 'Where does this square appear?', ['Bottom right', 'Top left', 'Center'], 1, 'x and y both start at 0, the top left corner.', 'rect(0, 0, 50, 50);'),
    Q(2, 'Which way does a bigger `y` move a shape?', ['Up', 'Down', 'Right'], 1, 'y counts down from the top.'),
    Q(4, 'Where does a `rect` start drawing?', ['Its center', 'Its bottom edge', 'Its top-left corner'], 2, 'x and y are the top-left corner.'),
  ],
  t2: [
    Q(1, 'What color is this square?', ['Green', 'Blue', 'Red'], 2, 'The first number in fill is red.', 'fill(255, 0, 0);\nrect(10, 10, 20, 20);'),
    Q(1, 'Which shape ends up on top?', ['The one drawn last', 'The one drawn first', 'The biggest one'], 0, 'Later shapes paint over earlier ones.'),
    Q(3, 'What color is `fill(0)`?', ['White', 'Black', 'Red'], 1, 'One number is a gray. 0 is black.'),
  ],
  t3: [
    Q(0, 'How often does `draw()` run?', ['Once', 'Only when you click', 'About 60 times a second'], 2, 'setup() runs once. draw() keeps repeating.'),
    Q(1, 'In this line, what is the variable\'s name?', ['let', 'score', '0'], 1, '`let` makes the box, `score` names it, and 0 goes in it.', 'let score = 0;'),
    Q(3, 'After this runs, what is `x`?', ['7', '5', '2'], 0, '= means "becomes." x becomes 5 + 2.', 'let x = 5;\nx = x + 2;'),
  ],
  t4: [
    Q(1, 'The mouse is at x = 100. Where is this circle?', ['x = 100', 'x = 120', 'x = 80'], 1, 'The computer works out 100 + 20.', 'ellipse(mouseX + 20, 200, 30, 30);'),
    Q(2, 'When does this code run?', ['All the time', 'Only while the mouse is pressed', 'Only once'], 1, 'if runs its code only when the condition is true.', 'if (mouseIsPressed) {\n  fill(0);\n}'),
    Q(2, 'What is wrong with this code?', ['Nothing', 'The { is never closed', 'It needs a comma'], 1, 'Every { needs a matching }.', 'if (mouseX > 200) {\n  fill(255, 0, 0);'),
  ],
  t5: [
    Q(1, 'If `speedX` is 3, what is it after this line?', ['3', '0', '-3'], 2, 'Multiplying by -1 flips the direction.', 'speedX = speedX * -1;'),
    Q(3, 'The ball is 40 wide. Why check `width - 20`?', ['So its edge touches the wall', 'To make it faster', 'To make it smaller'], 0, 'ballX is the center. The edge is 20 away.'),
  ],
  t6: [
    Q(2, 'When is this condition true?', ['When either part is true', 'When both parts are true', 'Never'], 1, '&& means and. Every part must be true.', 'if (starY > 350 && starX > 100) {'),
    Q(4, 'When is this condition true?', ['Only if both are true', 'Never', 'If either one is true'], 2, '|| means or.', 'if (lives <= 0 || score >= 20) {'),
  ],
  p1: [
    Q(1, 'What is `y` at the end?', ['104', '105', '103'], 1, 'y becomes 102, vy becomes 3, then y becomes 105.', 'let y = 100;\nlet vy = 2;\ny = y + vy;\nvy = vy + 1;\ny = y + vy;'),
    Q(1, 'Why does the player speed up while falling?', ['Gravity adds to the velocity each frame', 'The canvas gets bigger', 'draw() runs faster'], 0, 'Velocity grows, so the position changes more each frame.'),
    Q(4, 'Why is the jump velocity negative?', ['It makes the jump slower', 'Up means a smaller y', 'Gravity is negative'], 1, 'Moving up means y gets smaller.'),
  ],
  p2: [
    Q(1, 'What is `x` now?', ['400', '410', '0'], 0, 'constrain holds x at the top of the range.', 'let x = 410;\nx = constrain(x, 0, 400);'),
    Q(0, 'Which one is best for holding a key down?', ['keyPressed()', 'mouseIsPressed', 'keyIsDown()'], 2, 'keyIsDown is checked every frame.'),
    Q(4, 'Why check `playerVY >= 0` before landing?', ['So you can jump up through it', 'To make coins appear', 'To stop gravity'], 0, 'You only land when you are falling.'),
  ],
  p3: [
    Q(1, 'What does `!coinTaken` mean?', ['The coin was taken', 'The coin was not taken', 'Coins are worth more'], 1, '! means not.'),
    Q(3, 'When can this player win?', ['Any time', 'Only before getting the coin', 'After the coin, at the flag'], 2, 'Both parts of && must be true.', 'if (coinTaken && playerX > goalX) {'),
  ],
  p4: [
    Q(1, 'What makes a function actually run?', ['Calling it by name', 'Writing it', 'Saving the file'], 0, 'Writing it only teaches the computer. A call runs it.'),
    Q(2, 'How many tiles does this draw?', ['4', '5', '6'], 1, 'x is 0, 40, 80, 120, 160. Then 200 is not under 200.', 'for (let x = 0; x < 200; x = x + 40) {\n  rect(x, 360, 38, 40);\n}'),
  ],
  p5: [
    Q(0, 'What is `plats[0].y` here?', ['10', '50', '20'], 2, 'The first item has y: 20. Counting starts at 0.', 'let plats = [{ x: 10, y: 20 }, { x: 50, y: 60 }];'),
    Q(3, 'You add one more platform to the list. What else must you change?', ['Nothing', 'Every loop', 'The canvas size'], 0, '.length grows, so loops handle it.'),
  ],
  p6: [
    Q(0, 'What is left in the list?', ['[2, 3]', '[1, 3]', '[1, 2]'], 1, 'splice(1, 1) removes one item at position 1.', 'let a = [1, 2, 3];\na.splice(1, 1);'),
    Q(1, 'Why loop backward when removing items?', ['It is faster to type', 'Removing slides later items down, so forward loops skip one', 'Backward loops use less color'], 1, 'Going backward, the items that slide are already checked.'),
    Q(2, 'What does `coins.length === 0` mean?', ['There is one coin left', 'The first coin is gone', 'The list is empty'], 2, '=== asks "exactly equal?"'),
  ],
  p7: [
    Q(1, 'In this level, how far is `#` from the left edge?', ['80 dots', '2 dots', '40 dots'], 0, 'It is at column 2, and each tile is 40 wide.', 'let row = "..#.";'),
    Q(2, 'A level has 3 rows of 4 tiles. How many times does the inner loop body run?', ['7', '12', '4'], 1, '3 rows times 4 columns.'),
  ],
  p8: [
    Q(1, 'What is `h` now?', ['8', '5', '6'], 2, '5 + 3 is 8, and constrain holds it at 6.', 'let h = 5;\nh = constrain(h + 3, 0, 6);'),
    Q(0, 'Why use `push()` and `pop()` around the camera?', ['To add items to a list', 'To make it faster', 'To keep the score from moving'], 2, 'pop() undoes the shift before the score is drawn.'),
    Q(3, 'Why limit how big the gaps can be?', ['So every level can be beaten', 'So the code is shorter', 'So it uses less color'], 0, 'Constraints keep random levels possible.'),
  ],
  a1: [
    Q(1, 'What is `x` at the end?', ['4', '16', '7'], 0, 'Subtract 3 twice from 10.', 'let speed = 3;\nlet x = 10;\nx = x - speed;\nx = x - speed;'),
    Q(1, 'Which key should make `playerY` smaller?', ['Down', 'Up', 'Left'], 1, 'Up means a smaller y.'),
    Q(3, 'When does the `else` part run?', ['Always', 'When the if is true', 'When the if is false'], 2, 'else handles the other case.'),
  ],
  a2: [
    Q(1, 'What is `x` at the end?', ['55', '50', '5'], 1, 'The last line undoes the move.', 'let oldX = 50;\nlet x = 50;\nx = x + 5;\nx = oldX;'),
    Q(1, 'Why save `oldX` before moving?', ['So you can undo the move', 'To go faster', 'To draw a wall'], 0, 'If you hit a wall, you go back.'),
    Q(2, 'For two boxes to overlap, how many of the four checks must be true?', ['One', 'Two', 'All four'], 2, 'That is why the checks use &&.'),
  ],
  a3: [
    Q(1, 'What happens when this runs?', ['Nothing', 'The game stops', 'It logs locked'], 2, '`!hasKey` is true when hasKey is false.', 'let hasKey = false;\nif (!hasKey) {\n  console.log("locked");\n}'),
    Q(1, 'What does `hasKey` hold?', ['A number', 'true or false', 'A color'], 1, 'It is a boolean.'),
    Q(2, 'When does the door block you?', ['When you do not have the key', 'When you have the key', 'Always'], 0, '!hasKey is true when you have no key.'),
  ],
  a4: [
    Q(1, 'What makes `resetGame` actually run?', ['Writing it', 'Pressing Save', 'Calling resetGame()'], 2, 'A call runs the function.'),
    Q(2, 'How many trees does this draw?', ['5', '4', '6'], 0, 'x is 0, 40, 80, 120, 160. Then 200 is not under 200.', 'for (let x = 0; x < 200; x = x + 40) {\n  ellipse(x, 390, 44, 44);\n}'),
  ],
  a5: [
    Q(0, 'What is `walls[1].x` here?', ['10', '70', '30'], 1, 'Counting starts at 0, so [1] is the second one.', 'let walls = [{ x: 10 }, { x: 70 }, { x: 30 }];'),
    Q(3, 'What does `hitsWall(x, y)` give back?', ['A number', 'A wall', 'true or false'], 2, 'return hands back the answer.'),
  ],
  a6: [
    Q(0, 'Does `won` become true?', ['Yes', 'No, two gems are left', 'No, the length is 1'], 1, 'The length is 2, not 0.', 'let gems = [1, 2];\nif (gems.length === 0) {\n  won = true;\n}'),
    Q(2, 'Why loop backward when removing items?', ['Removing slides later items down, so forward loops skip one', 'It is faster to type', 'Forward loops cannot use splice'], 0, 'Going backward, the items that slide are already checked.'),
    Q(4, 'Which line asks if the list is empty?', ['gems = 0', 'gems.length === 0', 'gems[0] === 0'], 1, '.length counts the items.'),
  ],
  a7: [
    Q(1, 'In this row, how far is `#` from the left edge?', ['2 dots', '40 dots', '80 dots'], 2, 'It is at column 2, and each tile is 40 wide.', 'let row = "..#.";'),
    Q(2, 'A map has 10 rows of 10 tiles. How many tiles do the loops visit?', ['100', '20', '10'], 0, '10 rows times 10 columns.'),
  ],
  a8: [
    Q(0, 'What is `h` at the end?', ['3', '5', '8'], 0, 'The if is false, so h never changes.', 'let h = 3;\nif (h > 5) {\n  h = 8;\n}'),
    Q(0, 'In a queue, who goes next?', ['The newest', 'The first one in line', 'Someone random'], 1, 'Add at the back, take from the front.'),
    Q(2, 'Why does BFS find a shortest path?', ['It guesses well', 'It tries the longest paths first', 'It spreads out one ring at a time'], 2, 'The first time it arrives, no shorter way exists.'),
  ],
  s1: [
    Q(1, 'The left key is not held. What is `x`?', ['95', '105', '100'], 2, 'The if is false, so x stays the same.', 'let x = 100;\nif (keyIsDown(LEFT_ARROW)) {\n  x = x - 5;\n}'),
    Q(1, 'What does `keyIsDown` tell you?', ['A key is held right now', 'A key was ever pressed', 'Which key is biggest'], 0, 'It checks every frame.'),
    Q(3, 'Why does the flame flicker?', ['The canvas shakes', 'random() gives a new number each frame', 'Colors fade over time'], 1, 'draw() runs 60 times a second.'),
  ],
  s2: [
    Q(1, 'When can this fire?', ['Any time', 'When a bullet is active', 'On space, with no active bullet'], 2, '!bulletActive means no bullet is flying.', 'if (key === " " && !bulletActive) {'),
    Q(3, 'Why turn the bullet off above the screen?', ['So you can fire again', 'To save color', 'To stop the game'], 0, 'Only one bullet can be active.'),
  ],
  s3: [
    Q(1, 'When is this condition true?', ['At both edges at once', 'At either edge', 'Never'], 1, '|| means or.', 'if (enemyX > 370 || enemyX < 0) {'),
    Q(2, 'What does `dist` give you?', ['A color', 'A speed', 'How far apart two points are'], 2, 'A small distance means a hit.'),
  ],
  s4: [
    Q(1, 'What is `t` at the end?', ['6', '3', '2'], 0, 'The loop runs 3 times and adds 2 each time.', 'let t = 0;\nfor (let i = 0; i < 3; i = i + 1) {\n  t = t + 2;\n}'),
    Q(1, 'What makes `resetGame` actually run?', ['Calling resetGame()', 'Writing it', 'Pressing Save'], 0, 'A call runs the function.'),
    Q(3, 'What is `410 % 400`?', ['400', '10', '1'], 1, '% gives the remainder, which wraps stars to the top.'),
  ],
  s5: [
    Q(0, 'What does this log?', ['2', '3', '4'], 1, 'length counts the items.', 'let bullets = [1, 2, 3];\nconsole.log(bullets.length);'),
    Q(1, 'What does `push` do?', ['Removes the last item', 'Moves an item up', 'Adds an item to the end'], 2, 'Each shot adds one bullet.'),
    Q(2, 'Why loop backward when removing items?', ['Removing slides later items down, so forward loops skip one', 'It is faster to type', 'Bullets move up'], 0, 'Going backward, the items that slide are already checked.'),
  ],
  s6: [
    Q(0, 'What does this log?', ['5', 'true', '6'], 2, 'e.x starts at 5, and goes up by 1.', 'let e = { x: 5, alive: true };\ne.x = e.x + 1;\nconsole.log(e.x);'),
    Q(2, 'With 6 enemies and 10 bullets, how many checks happen each frame?', ['16', '60', '10'], 1, 'Each enemy checks every bullet.'),
    Q(3, 'When do you win now?', ['At 100 points', 'When a bullet hits', 'When the enemy list is empty'], 2, 'enemies.length === 0.'),
  ],
  s7: [
    Q(0, 'What is `s.hp` at the end?', ['2', '3', '0'], 0, 'The constructor sets 3, and hit takes away 1.', 'class Ship {\n  constructor() {\n    this.hp = 3;\n  }\n  hit() {\n    this.hp = this.hp - 1;\n  }\n}\nlet s = new Ship();\ns.hit();'),
    Q(0, 'What does `this.x` mean inside a class?', ['This particular enemy\'s x', 'Every enemy\'s x', 'The mouse x'], 0, 'Each object keeps its own values.'),
    Q(2, 'To add a new wave, what do you change?', ['The Enemy class', 'One line in the waves list', 'Every loop'], 1, 'That is data-driven design.'),
  ],
  s8: [
    Q(0, 'What is `mode` at the end?', ['aim', 'fire', 'Both'], 1, 'Only the first branch runs.', 'let mode = "aim";\nif (mode === "aim") {\n  mode = "fire";\n} else {\n  mode = "aim";\n}'),
    Q(0, 'How many states can the boss be in at once?', ['Three', 'Two', 'One'], 2, 'That is what a state machine means.'),
    Q(3, 'What does `atan2` give you?', ['The angle toward a point', 'The distance', 'A random number'], 0, 'cos and sin turn the angle into movement.'),
  ],
  m1: [
    Q(3, 'What is `botX` at the end?', ['48', '52', '80'], 1, 'The bot is left of the player, so it moves right.', 'let botX = 50;\nlet playerX = 80;\nif (botX < playerX) {\n  botX = botX + 2;\n}'),
    Q(0, 'What makes machine learning different?', ['It runs faster', 'It finds its own rules from examples', 'It only works in games'], 1, 'A programmer does not write each rule.'),
    Q(3, 'The bot is left of the player. Which rule runs?', ['botX gets smaller', 'botY gets smaller', 'botX gets bigger'], 2, 'if (botX < playerX), move right.'),
  ],
  m2: [
    Q(1, 'What is `won`?', ['true', 'false', '100'], 0, 'score is 100, so the comparison is true.', 'let score = 90;\nscore = score + 10;\nlet won = score >= 100;'),
    Q(1, 'What happens when `dist` is under 25?', ['The coin was reached', 'The game ends', 'The bot speeds up'], 0, 'A small distance means they touch.'),
    Q(2, 'What can `lost` hold?', ['Any number', 'true or false', 'A color'], 1, 'It is a boolean.'),
  ],
  m3: [
    Q(3, 'What does this log?', ['left', 'go', 'Nothing'], 2, 'The label is not "right", so the if is skipped.', 'let label = "left";\nif (label === "right") {\n  console.log("go");\n}'),
    Q(0, 'What did you give the model to learn from?', ['Rules you wrote', 'A list of colors', 'Labeled examples'], 2, 'Examples, not rules.'),
    Q(5, 'Your model fails in a new room. Why?', ['Its examples did not include that room', 'The code has a typo', 'The computer is too slow'], 0, 'A model only knows what its examples showed it.'),
  ],
  m4: [
    Q(1, 'What makes `resetGame` actually run?', ['Writing it', 'Calling resetGame()', 'Pressing Save'], 1, 'A call runs the function.'),
    Q(2, 'How many lights does this draw?', ['4', '6', '5'], 2, 'x is 0, 40, 80, 120, 160. Then 200 is not under 200.', 'for (let x = 0; x < 200; x = x + 40) {\n  ellipse(x, 8, 8, 8);\n}'),
  ],
  m5: [
    Q(2, 'What does this add to `memories`?', ['One object', 'Three lists', 'Nothing'], 0, 'push adds one item: this object.', 'memories.push({ x: 10, y: 20, move: "left" });'),
    Q(4, 'How does nearest neighbor make its guess?', ['It picks at random', 'It copies the most similar memory', 'It uses the newest memory'], 1, 'It finds the closest example and reuses its answer.'),
  ],
  m6: [
    Q(1, 'What is `right` at the end?', ['0', '1', '2'], 1, 'The two guesses match, so it adds 1.', 'let guess = "left";\nlet real = "left";\nlet right = 0;\nif (guess === real) {\n  right = right + 1;\n}'),
    Q(1, 'What does training do?', ['Draws the game', 'Deletes old data', 'Adjusts the network to fit the examples'], 2, 'Each pass is called an epoch.'),
    Q(4, 'Why count how often each algorithm is right?', ['To compare them with evidence', 'To make them faster', 'To get more data'], 0, 'Measure it instead of guessing.'),
  ],
  m7: [
    Q(0, 'What is `b.x` at the end?', ['2', '1', '0'], 0, 'update runs twice.', 'class Bot {\n  constructor() {\n    this.x = 0;\n  }\n  update() {\n    this.x = this.x + 1;\n  }\n}\nlet b = new Bot();\nb.update();\nb.update();'),
    Q(0, 'What does `new Bot(40, 340, true)` make?', ['A class', 'One object from the blueprint', 'A list'], 1, 'A class is the blueprint. new builds one.'),
    Q(4, 'You suddenly change how you play. What happens to the smart bot?', ['It instantly adapts', 'Nothing changes', 'Its old memories mislead it for a while'], 2, 'Models trained on old data can go stale.'),
  ],
  m8: [
    Q(0, 'What percent is this?', ['20', '95', '19'], 1, '19 out of 20 is 95 percent.', 'let right = 19;\nlet total = 20;\nconsole.log((right / total) * 100);'),
    Q(1, 'What does `confusion[1][2]` count?', ['Real move 1, guessed as move 2', 'Moves 1 and 2 added', 'Two correct guesses'], 0, 'Row is what happened. Column is the guess.'),
    Q(4, 'Where in the table are the correct guesses?', ['The top row', 'The diagonal', 'The last column'], 1, 'Right answers are where row equals column.'),
  ],
  c1: [
    Q(1, 'What is the `x` in `drawTree(x)`?', ['A global variable', 'A color', 'A parameter the caller fills in'], 2, 'Each call can pass a different value.'),
    Q(3, 'What does this give back?', ['15', '5', 'Nothing'], 0, 'return hands back 5 * 3.', 'function triple(n) {\n  return n * 3;\n}\ntriple(5);'),
  ],
  c2: [
    Q(1, 'How wide is each frame?', ['4', '16', '64'], 1, '64 divided by 4 is 16.', 'let sheetWidth = 64;\nlet frames = 4;\nconsole.log(sheetWidth / frames);'),
    Q(1, 'Why load images in `preload()`?', ['It makes them bigger', 'They are ready before setup() runs', 'It draws them'], 1, 'p5 waits for preload to finish.'),
    Q(4, 'With 2 frames, what is `5 % 2`?', ['2', '5', '1'], 2, '% wraps the count, so frames repeat 0, 1, 0, 1.'),
  ],
  c3: [
    Q(1, 'What is `critters.length`?', ['1', '4', '2'], 2, 'Each push adds one critter.', 'let critters = [];\ncritters.push(new Critter(1, 2));\ncritters.push(new Critter(3, 4));'),
    Q(0, 'What is a class?', ['A blueprint for making objects', 'A list of numbers', 'A kind of loop'], 0, 'Objects are built from it.'),
    Q(3, 'You click 3 times. How many critters are added?', ['1', '3', '10'], 1, 'Each click pushes one new critter.'),
  ],
  e1: [
    Q(1, 'Does the sound play?', ['Yes', 'No', 'Twice'], 1, '5 is not greater than 5.', 'let before = 5;\nlet now = 5;\nif (now > before) {\n  playSound("coin");\n}'),
    Q(1, 'Why compare `score` to `scoreBefore`?', ['To make the sound louder', 'To save memory', 'To play the sound only once'], 2, 'The score only rises for one frame at a time.'),
    Q(3, 'When is `(won || lost) && !overBefore` true?', ['On the first frame the game ends', 'On every frame', 'Before the game starts'], 0, 'It is over now, and it was not last frame.'),
  ],
  e2: [
    Q(5, 'How many steps does this track have?', ['3', '4', '5'], 2, 'Each word is a step, and each dot counts too.', 'let lead = "C5 . E5 . G5";'),
    Q(5, 'In a song, what does `.` mean?', ['The song ends', 'A silent step', 'Play louder'], 1, 'Each word is a step, and a dot is a rest.'),
    Q(6, 'Who owns the copyright on music you write?', ['You do', 'The school', 'Nobody'], 0, 'Creators own what they make, and a license says how others may use it.'),
  ],
  e3: [
    Q(1, 'What is `f` at the end?', ['440', '880', '660'], 1, 'It doubles twice: 440, then 880.', 'let f = 220;\nf = f * 2;\nf = f * 2;'),
    Q(1, 'A note is 440. What is one octave higher?', ['441', '220', '880'], 2, 'Each octave doubles the frequency.'),
    Q(6, 'How many values can 3 bits store?', ['3', '8', '9'], 1, 'Two choices per bit: 2 times 2 times 2.'),
  ],
  d1: [
    Q(2, 'How far right is the next shape?', ['15', '10', '5'], 2, 'pop undoes the first move.', 'push();\ntranslate(10, 0, 0);\npop();\ntranslate(5, 0, 0);'),
    Q(2, 'In WEBGL, where is `y = -50`?', ['Below the center', 'Above the center', 'Toward you'], 1, 'In p5, y grows downward, so negative is up.'),
    Q(4, 'What do `push` and `pop` protect?', ['Everything drawn after them', 'The score', 'The canvas size'], 0, 'A move between them ends at pop.'),
  ],
  d2: [
    Q(2, 'Are `a` and `b` the same?', ['Yes', 'No', 'Only sometimes'], 0, 'The same seed gives the same numbers.', 'randomSeed(7);\nlet a = random(10);\nrandomSeed(7);\nlet b = random(10);'),
    Q(1, 'What does `FLAT` do to a shape?', ['Squashes it', 'Removes its color', 'Gives each face one shade'], 2, 'One shade per face is the low poly look.'),
    Q(2, 'Why call `randomSeed` in the loop?', ['So trees stay in place', 'To add more trees', 'To color trees'], 0, 'The same seed gives the same numbers every frame.'),
  ],
  d3: [
    Q(2, 'Which way does this step move?', ['Only x', 'Only z', 'Neither'], 1, 'sin(0) is 0, and cos(0) is 1.', 'let heading = 0;\nlet x = sin(heading) * 2;\nlet z = cos(heading) * 2;'),
    Q(2, 'Why use `sin` and `cos` for walking?', ['To change color', 'To split a step into x and z', 'To draw circles'], 1, 'Together they turn a heading into a direction.'),
    Q(4, 'What does `constrain` do here?', ['Slows the hero', 'Turns the camera', 'Keeps the hero inside the world'], 2, 'It holds a value between a low and a high.'),
  ],
  d4: [
    Q(0, 'What does this log?', ['1', '4', '3'], 2, 'Row 1 is [3, 4], and column 0 of that is 3.', 'let grid = [[1, 2], [3, 4]];\nconsole.log(grid[1][0]);'),
    Q(0, 'How do you read row 2, column 5?', ['hills[2][5]', 'hills[5, 2]', 'hills.2.5'], 0, 'First the row, then the column inside it.'),
    Q(1, 'Why are squares split into triangles?', ['Triangles draw faster than lines', 'Squares are not allowed', 'Three points are always flat'], 2, 'Four corners at different heights may not be flat.'),
  ],
  d5: [
    Q(3, 'What is logged first?', ['7', '5', '3'], 0, 'The loop starts at the last position.', 'let a = [5, 6, 7];\nfor (let i = a.length - 1; i >= 0; i = i - 1) {\n  console.log(a[i]);\n}'),
    Q(1, 'How many numbers does 3D `dist` need?', ['Six', 'Four', 'Three'], 0, 'Three for each of the two spots.'),
    Q(3, 'Why loop backward when removing gems?', ['It is faster', 'So removing does not skip a gem', 'To reverse the score'], 1, 'splice shifts later items down a spot.'),
  ],
  c4: [
    Q(2, 'What does this log?', ['B', 'A', 'C'], 0, 'The first check is false, and the second is true.', 'let s = "title";\nif (s === "play") {\n  console.log("A");\n} else if (s === "title") {\n  console.log("B");\n} else {\n  console.log("C");\n}'),
    Q(2, 'When does `else if` get checked?', ['Always', 'Before the if', 'Only when the if was false'], 2, 'Once one branch runs, the rest are skipped.'),
    Q(5, 'Why call `resetGame()` when starting a round?', ['So old scores and positions are cleared', 'To draw the title', 'To load images'], 0, 'One call restores every starting value.'),
  ],
  c5: [
    Q(1, 'What is `b` at the end?', ['2', '7', '9'], 1, 'temp held on to the 7.', 'let a = 7;\nlet b = 2;\nlet temp = a;\na = b;\nb = temp;'),
    Q(1, 'What does `temp` do in a swap?', ['Sorts the list', 'Holds one value so it is not lost', 'Counts the bars'], 1, 'Without it, one value gets overwritten.'),
    Q(2, 'After one sorting step, what is true?', ['The whole list is sorted', 'Nothing changed', 'The biggest score is at the front'], 2, 'Then it repeats on the rest.'),
  ],
  c6: [
    Q(2, 'Does `burst` run?', ['Yes', 'Only once', 'No, the score did not rise'], 2, '10 is not greater than 10.', 'let lastScore = 10;\nlet score = 10;\nif (score > lastScore) {\n  burst(60, 24);\n}'),
    Q(1, 'What is a particle here?', ['A small object that moves, fades, and is removed', 'A type of loop', 'A sprite file'], 0, 'Your helper file keeps a list of them.'),
    Q(4, 'Why watch someone play without helping?', ['To see their score', 'To find what confuses a new player', 'To finish faster'], 1, 'You already know how your game works. They do not.'),
  ],
};

export const checksFor = (id) => CHECKS[id] || [];
