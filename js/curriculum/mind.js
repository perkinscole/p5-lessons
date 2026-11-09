// THE MIND ROAD: a chase game that goes from hand-written rules to machine learning.
// Students control it with a Teachable Machine model, write nearest neighbor themselves,
// and (Beyond) compare that algorithm against a real ml5 neural network.
import { lesson } from './engine.js';

lesson({
  id: 'm1', title: 'The Bot Follows Rules', mins: 35, concepts: ['variables', 'conditionals', 'rule-based AI'], path: 'mind',
  hook: 'Welcome to the Mind Road. You will build a game with a bot that learns how you play. Today it has no learning at all: just rules you write. Finding where rules break down is the first step toward understanding AI.',
  starter: `let playerX = 60;
let playerY = 60;
let playerSize = 30;
let speed = 3;
let botX = 340;
let botY = 340;
let botSpeed = 1.5;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(28, 32, 58);

  // player
  fill(90, 220, 200);
  noStroke();
  rect(playerX, playerY, playerSize, playerSize);
}
`,
  steps: [
    {
      title: 'What counts as AI?', mins: 4,
      say: 'Talk with a partner: is the enemy in a video game intelligent? Most game enemies just follow rules a programmer wrote. Machine learning is different: the computer finds its own rules from **examples**. You will build both, and see what each one is good at.',
    },
    {
      title: 'Walk in four directions', mins: 8,
      say: '`keyIsDown()` checks if a key is held, every frame. Up means a **smaller** `y`. Add this above `// player`, then click the canvas so it can hear your keys.',
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
      title: 'Stay in the arena', mins: 3,
      say: '`constrain(value, low, high)` keeps a value inside a range.',
      code: `  playerX = constrain(playerX, 0, width - playerSize);
  playerY = constrain(playerY, 0, height - playerSize);
`,
      at: { before: '// player' },
      check: /constrain\s*\(/,
    },
    {
      title: 'Write the bot\'s rules', mins: 10,
      say: 'These four `if` statements are the bot\'s entire brain. Read them aloud: if I am left of the player, move right. Add this above `// player`.',
      code: `  // bot rules
  if (botX < playerX) { botX = botX + botSpeed; }
  if (botX > playerX) { botX = botX - botSpeed; }
  if (botY < playerY) { botY = botY + botSpeed; }
  if (botY > playerY) { botY = botY - botSpeed; }
  fill(240, 90, 110);
  rect(botX, botY, 30, 30);
`,
      at: { before: '// player' },
      check: /if\s*\(\s*botX\s*</,
    },
    {
      title: 'Add a rule of your own', mins: 6,
      say: 'Make the bot behave differently in some situation. For example, it could sprint when it gets close. Use `dist()` to measure how far away the player is, and change `botSpeed`.',
      reveal: true,
      code: `  // my extra rule
  if (dist(botX, botY, playerX, playerY) < 100) {
    botSpeed = 2;
  } else {
    botSpeed = 1.5;
  }

`,
      at: { before: '// bot rules' },
      check: /\{\s*botSpeed\s*=/,
      hint: 'Inside an if statement, set botSpeed to a new number. Around 2 is a fair sprint. Much faster and nobody can win.',
    },
    {
      title: 'Beat your own bot', mins: 4,
      say: 'Play until you find a way to fool the bot every time. It can never surprise you, because it only knows the rules you gave it. Could you write rules for everything a person might do?',
    },
  ],
  stretch: ['Give the bot a second mode where it runs away for a few seconds.', 'Add a second bot with different rules.', 'Make the bot move only when you are moving.'],
  reflect: 'Name one thing that is easy for you but very hard to write rules for, like recognizing a friend\'s face. Name one thing a computer does more easily than you. Why is each one easier for that side?',
});

lesson({
  id: 'm2', title: 'Catch and Dodge', mins: 35, concepts: ['collision', 'booleans', 'win and lose'], path: 'mind',
  hook: 'A chase needs stakes. Today you add something to collect, a way to get caught, and an ending. Then you playtest how fair your bot feels.',
  steps: [
    {
      title: 'Game variables', mins: 3,
      say: 'Add these at the top. `won` and `lost` start false, and any part of your game can check them.',
      code: `let score = 0;
let won = false;
let lost = false;
let coinX = 200;
let coinY = 120;`,
      at: { after: 'let botSpeed = 1.5;' },
      check: /let\s+score/,
    },
    {
      title: 'Grab a coin', mins: 10,
      say: '`dist(x1, y1, x2, y2)` gives the distance between two points. When the player reaches the coin, move it somewhere new with `random`. Add this above `// player`.',
      code: `  // coin
  fill(255, 215, 80);
  ellipse(coinX, coinY, 20, 20);
  if (dist(playerX + 15, playerY + 15, coinX, coinY) < 25) {
    score = score + 10;
    coinX = random(30, 370);
    coinY = random(30, 370);
  }
`,
      at: { before: '// player' },
      check: /dist\s*\(/,
    },
    {
      title: 'Getting caught', mins: 6,
      say: 'If the bot gets close enough, the player loses. Add this above `// player`.',
      code: `  // caught?
  if (dist(playerX, playerY, botX, botY) < 28) {
    lost = true;
  }
`,
      at: { before: '// player' },
      check: /lost\s*=\s*true/,
    },
    {
      title: 'Winning and the score', mins: 7,
      say: 'You win at 100 points. Add this at the very end of `draw()`.',
      code: `
  if (score >= 100) {
    won = true;
  }

  // score and messages
  fill(255);
  textSize(18);
  text("Score: " + score, 10, 24);
  if (won) {
    text("You outran the bot!", 115, 200);
  }
  if (lost) {
    text("Caught!", 165, 200);
  }`,
      at: { endOf: 'function draw' },
      check: /won\s*=\s*true/,
    },
    {
      title: 'Playtest for fairness', mins: 9,
      say: 'Is it too easy? Too hard? Change `botSpeed` and the starting spots, then ask a neighbor to play without any hints. Watch what they try. Pick a theme too: is this a cat and mouse, a ghost, a robot?',
    },
  ],
  stretch: ['Add a power-up that freezes the bot for 3 seconds.', 'Make the coin worth more the closer the bot is.', 'Add a wall the bot does not know how to get around.'],
  reflect: 'What did your playtester try that surprised you? What rule would you need to add to handle it?',
});

lesson({
  id: 'm3', title: 'Train a Model to See You', mins: 40, concepts: ['machine learning', 'training data', 'classification'], path: 'mind',
  hook: 'Now you hand the job to machine learning. You will teach a model to recognize your gestures from examples, then use it to steer your game with your body. No rules about what a hand looks like. Just examples.',
  steps: [
    {
      title: 'Train your model', mins: 15, action: 'teachable',
      say: 'Open **Teachable Machine** and choose an Image Project with the Standard model. Make five classes, named exactly `left`, `right`, `up`, `down`, and `still`. Use your webcam to record about 30 pictures of a different gesture for each one, then press **Train Model**.\n\nTry it in the preview. When it works, choose **Export Model**, then **Upload my model**, and copy the link it gives you.',
    },
    {
      title: 'Paste in your model\'s link', mins: 3,
      say: 'This variable holds the link to your model. Add it at the top, then paste your link between the quotes. Leave the quotes empty for now if you are not ready, and the arrow keys will keep working.',
      code: 'let MODEL_URL = "";',
      at: { after: 'let botSpeed = 1.5;' },
      check: /let\s+MODEL_URL/,
    },
    {
      title: 'Connect your model', mins: 7,
      say: 'Connecting a model to a game takes some code you will learn later, so it is already written, in a file of its own. Press **Add the finished file**. Then add this line inside `setup()` to start it. After that, a variable called `label` always holds what the model sees.',
      provides: { name: 'model.js', code: `// A finished helper file. You can use it without changing it.
// It connects your Teachable Machine model to your game.

let classifier;
let video;
let label = "still";

// Start the camera and the model. After this, label holds what the model sees.
function startModel(url) {
  if (url === "") {
    return;
  }
  video = createCapture(VIDEO);
  video.size(160, 120);
  video.hide();
  classifier = ml5.imageClassifier(url + "model.json", function () {
    classifier.classifyStart(video, function (results) {
      label = results[0].label;
    });
  });
}
` },
      code: '  startModel(MODEL_URL);',
      at: { after: 'createCanvas(400, 400);' },
      check: [/imageClassifier\s*\(/, /startModel\s*\(\s*MODEL_URL/],
      hint: 'If the camera does not start, check that your browser allows it. The arrow keys still work.',
    },
    {
      title: 'Steer with your model', mins: 7,
      say: 'The model\'s answer is just text in `label`, so your code can treat it like any other input. Change all four conditions so a key **or** the model can move the player.',
      edits: [
        { code: 'if (keyIsDown(LEFT_ARROW) || label === "left") {', at: { replace: 'if (keyIsDown(LEFT_ARROW)) {' } },
        { code: 'if (keyIsDown(RIGHT_ARROW) || label === "right") {', at: { replace: 'if (keyIsDown(RIGHT_ARROW)) {' } },
        { code: 'if (keyIsDown(UP_ARROW) || label === "up") {', at: { replace: 'if (keyIsDown(UP_ARROW)) {' } },
        { code: 'if (keyIsDown(DOWN_ARROW) || label === "down") {', at: { replace: 'if (keyIsDown(DOWN_ARROW)) {' } },
      ],
      show: `if (keyIsDown(LEFT_ARROW) || label === "left") {
...
if (keyIsDown(RIGHT_ARROW) || label === "right") {
if (keyIsDown(UP_ARROW) || label === "up") {
if (keyIsDown(DOWN_ARROW) || label === "down") {`,
      check: /(?:\|\|\s*label\s*===?[\s\S]*){4,}/,
      hint: 'Your class names must match exactly, including lowercase letters.',
    },
    {
      title: 'Show what the model sees', mins: 3,
      say: 'Showing the model\'s answer on screen helps you tell a bad model from a bug. Add this just above `// score and messages`.',
      code: `  // what the model sees
  if (video) {
    image(video, 280, 310, 120, 90);
  }
  fill(255);
  textSize(14);
  text("Model says: " + label, 10, 390);

`,
      at: { before: '// score and messages' },
      check: /text\s*\([^)]*label/,
    },
    {
      title: 'Test it on someone else', mins: 5,
      say: 'Have a partner try your model, without retraining it. Then change the lighting or background behind you. Write down when it fails. A model only knows what its examples showed it, so its mistakes tell you what was missing from your data.',
    },
  ],
  stretch: ['Add a `boost` class that makes you faster while you hold it.', 'Add a gesture that triggers a speed boost.', 'Retrain with examples from three different people, and compare.'],
  reflect: 'Your model is a simplified model of "reading a gesture." What did it pay attention to that it should not have? What did you, the human, have to do that the machine could not do alone?',
  rubric: [
    { id: 'works', label: 'It runs', levels: ['Crashes or empty', 'Runs, model not connected', 'Model steers the game', 'Model steers it reliably'] },
    { id: 'concept', label: 'Understands training', levels: ['Cannot explain it', 'Describes the steps', 'Explains how examples shape results', 'Improved results by changing the data'] },
    { id: 'own', label: 'Testing', levels: ['Not tested', 'Tested on self only', 'Tested on another person', 'Tested several conditions and explained failures'] },
  ],
});

lesson({
  id: 'm4', title: 'Restart and Repeat', mins: 35, concepts: ['functions', 'for loops'], path: 'mind',
  hook: 'You just learned about functions at the Crossing, so now put them to work in your own game. Then you meet the for loop, which draws a hundred things from one line.',
  steps: [
    {
      title: 'Write a resetGame function', mins: 8,
      reveal: true,
      say: 'Use what you learned at the Crossing: write a function called `resetGame` at the bottom that puts every starting value back. Look at your variables and decide which ones change during play.',
      code: `function resetGame() {
  playerX = 60;
  playerY = 60;
  botX = 340;
  botY = 340;
  score = 0;
  won = false;
  lost = false;
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
      say: 'A **for loop** repeats code while counting. It has three parts:\n\n`for (start; keep going while; change each time)`\n\nDraw a row of markers along the top of the arena. Add this just below `background`.',
      code: `
  // arena lights
  fill(70, 80, 130);
  noStroke();
  for (let x = 10; x < width; x = x + 40) {
    ellipse(x, 8, 8, 8);
  }`,
      at: { after: 'background(28, 32, 58);' },
      check: /for\s*\(\s*let\s+\w+\s*=/,
      hint: 'Separate the three parts with semicolons, not commas.',
    },
    {
      title: 'Loop with math', mins: 8,
      reveal: true,
      say: 'Below your lights, use a for loop to scatter 40 small floor dots. Try an `x` of `(i * 97) % 400` and a `y` of `(i * 53) % 400`. `%` gives the remainder, which wraps big numbers back onto the canvas, so the pattern looks random but is not.',
      code: `
  // floor dots
  fill(50, 56, 95);
  for (let i = 0; i < 40; i = i + 1) {
    ellipse((i * 97) % 400, (i * 53) % 400, 4, 4);
  }`,
      at: { after: 'ellipse(x, 8, 8, 8);\n  }' },
      check: /(?:for\s*\([\s\S]*){2,}/,
    },
    {
      title: 'Your scenery', mins: 5,
      say: 'Use a loop to add scenery that fits your theme. Change the numbers and watch how the pattern changes.',
    },
  ],
  stretch: ['Use a loop inside a loop to draw a grid.', 'Make the dots pulse using `frameCount`.', 'Show "Press R to try again" when the game ends.'],
  reflect: 'How does `resetGame` make your code easier to change? What does each of the three parts of a for loop do?',
});

lesson({
  id: 'm5', title: 'A Bot That Remembers', mins: 40, concepts: ['arrays', 'objects', 'nearest neighbor'], path: 'mind',
  hook: 'Time to write a machine learning algorithm yourself. Your bot will remember what you did in every spot, and then guess what you will do next by finding the most similar moment. That idea is called nearest neighbor.',
  steps: [
    {
      title: 'A list of memories', mins: 4,
      say: 'An **array** is an ordered list inside `[ ]`. Each memory will be an **object**, which bundles values under one name: `{ x: 10, y: 20, move: "left" }`. Choosing what to record is how you describe a moment to a computer. Add these at the top.',
      code: 'let memories = [];\nlet lastMove = "";',
      at: { after: 'let MODEL_URL = "";' },
      check: /let\s+memories\s*=\s*\[\s*\]/,
    },
    {
      title: 'Notice each move', mins: 6,
      reveal: true,
      say: 'Whenever the player moves, store the direction in `lastMove`. Add one line inside each of your four movement checks, using `"left"`, `"right"`, `"up"`, or `"down"`.',
      edits: [
        { code: '    lastMove = "left";', at: { after: 'playerX = playerX - speed;' } },
        { code: '    lastMove = "right";', at: { after: 'playerX = playerX + speed;' } },
        { code: '    lastMove = "up";', at: { after: 'playerY = playerY - speed;' } },
        { code: '    lastMove = "down";', at: { after: 'playerY = playerY + speed;' } },
      ],
      show: `playerX = playerX - speed;
lastMove = "left";      // and the same for right, up, and down`,
      check: /(?:lastMove\s*=\s*"\w+"[\s\S]*){4,}/,
    },
    {
      title: 'Record a memory', mins: 6,
      say: '`push` adds an item to the end of a list. Every 15 frames, if the player has moved, save where they were and what they did. `frameCount % 15 === 0` is true once every 15 frames. Add this above `// bot rules`.',
      code: `  // remember what the player does
  if (frameCount % 15 === 0 && lastMove !== "") {
    memories.push({ x: playerX, y: playerY, move: lastMove });
    lastMove = "";
  }

`,
      at: { before: '// bot rules' },
      check: /memories\.push\s*\(\s*\{/,
    },
    {
      title: 'See the memories', mins: 5,
      reveal: true,
      say: 'Draw a small dot for every memory, using a for loop that runs to `memories.length`. Read each one with `memories[i]`. Put it just above `// player`. Then play, and watch your habits appear on the floor.',
      code: `  // show the memories
  fill(120, 130, 220);
  for (let i = 0; i < memories.length; i = i + 1) {
    ellipse(memories[i].x + 15, memories[i].y + 15, 6, 6);
  }
`,
      at: { before: '// player' },
      check: /memories\s*\[\s*\w+\s*\]/,
    },
    {
      title: 'Write nearest neighbor', mins: 12,
      reveal: true,
      say: 'Here is the algorithm: look through every memory, find the one where the player was closest to where they are now, and guess they will do the same thing again. Press **Add the starter code**, then finish the TODO.',
      code: `function predictMove() {
  let closest = null;
  let closestDist = Infinity;
  for (let i = 0; i < memories.length; i = i + 1) {
    let d = dist(playerX, playerY, memories[i].x, memories[i].y);
    if (d < closestDist) {
      closestDist = d;
      closest = memories[i];
    }
  }
  if (closest === null) {
    return "";
  }
  return closest.move;
}`,
      at: { end: true },
      skeleton: [{ code: `function predictMove() {
  let closest = null;
  let closestDist = Infinity;
  for (let i = 0; i < memories.length; i = i + 1) {
    let d = dist(playerX, playerY, memories[i].x, memories[i].y);
    // TODO: If d is smaller than closestDist, this memory is the new closest.
    // Update both closestDist and closest.

  }
  if (closest === null) {
    return "";
  }
  return closest.move;
}`, at: { end: true } }],
      check: [/closestDist\s*=\s*d\b/, /closest\s*=\s*memories\s*\[/],
      hint: 'This is the same "best so far" idea as finding a high score.',
    },
    {
      title: 'Let the bot use it', mins: 7,
      reveal: true,
      say: 'Instead of chasing where you are, the bot should head for where it predicts you will be. Replace the four chase rules. Make `targetX` and `targetY` start at the player, shift them 60 dots in the guessed direction, and chase that point.',
      code: `  let guess = predictMove();
  let targetX = playerX;
  let targetY = playerY;
  if (guess === "left") { targetX = playerX - 60; }
  if (guess === "right") { targetX = playerX + 60; }
  if (guess === "up") { targetY = playerY - 60; }
  if (guess === "down") { targetY = playerY + 60; }
  if (botX < targetX) { botX = botX + botSpeed; }
  if (botX > targetX) { botX = botX - botSpeed; }
  if (botY < targetY) { botY = botY + botSpeed; }
  if (botY > targetY) { botY = botY - botSpeed; }`,
      at: { replace: `  if (botX < playerX) { botX = botX + botSpeed; }
  if (botX > playerX) { botX = botX - botSpeed; }
  if (botY < playerY) { botY = botY + botSpeed; }
  if (botY > playerY) { botY = botY - botSpeed; }` },
      check: /predictMove\s*\(\s*\)\s*;/,
      hint: 'If guess is "", the target simply stays on the player, which is the old behavior.',
    },
  ],
  stretch: ['Use the 3 nearest memories, and take the most common move.', 'Forget old memories once the list passes 200.', 'Also record where the bot is, and see if predictions change.'],
  reflect: 'What attributes did you record about each moment? What did you leave out, and how might that make the bot\'s guesses worse?',
});

lesson({
  id: 'm6', title: 'A Real Neural Network', mins: 35, concepts: ['neural networks', 'training', 'comparing algorithms'], path: 'mind',
  hook: 'Your bot already learns by looking things up. A neural network learns differently: it adjusts thousands of numbers until it fits your data. Today you train one on your own gameplay, and find out which approach predicts you better.',
  steps: [
    {
      title: 'Two ways to learn', mins: 4,
      say: 'Nearest neighbor keeps every example and searches them each time. A neural network studies the examples once during **training**, then answers quickly without them. Predict which will guess your moves better, and write down why.',
    },
    {
      title: 'Build and train the network', mins: 10,
      say: '`addData` gives it one example: the inputs, and the right answer. `normalizeData` scales the numbers so they are easier to learn from. `train` runs through the examples 30 times, each pass called an **epoch**. Add these variables at the top and this function at the bottom.',
      edits: [
        { code: 'let brain;\nlet brainReady = false;\nlet brainGuess = "";', at: { after: 'let lastMove = "";' } },
        { code: `function trainBrain() {
  if (memories.length < 20) {
    return;
  }
  brain = ml5.neuralNetwork({ task: "classification" });
  for (let i = 0; i < memories.length; i = i + 1) {
    let m = memories[i];
    brain.addData([m.x, m.y], [m.move]);
  }
  brain.normalizeData();
  brain.train({ epochs: 30 }, whenTrained);
}

function whenTrained() {
  brainReady = true;
}`, at: { end: true } },
      ],
      show: `let brain;               // at the top
let brainReady = false;
let brainGuess = "";

// at the bottom:
function trainBrain() {
  if (memories.length < 20) {
    return;
  }
  brain = ml5.neuralNetwork({ task: "classification" });
  for (let i = 0; i < memories.length; i = i + 1) {
    let m = memories[i];
    brain.addData([m.x, m.y], [m.move]);
  }
  brain.normalizeData();
  brain.train({ epochs: 30 }, whenTrained);
}

function whenTrained() {
  brainReady = true;
}`,
      check: [/neuralNetwork\s*\(/, /\.train\s*\(/],
    },
    {
      title: 'Press T to train', mins: 3,
      reveal: true,
      say: 'Call `trainBrain()` when the player presses T. Add a new `if` inside your `keyPressed()`. Play until you have 20 or more memory dots, then press T.',
      code: `  if (key === "t") {
    trainBrain();
  }`,
      at: { after: 'function keyPressed() {' },
      check: /key\s*===?\s*"t"/,
    },
    {
      title: 'Ask the network', mins: 6,
      say: 'Asking takes a moment, so `classify` calls a function when the answer is ready. We ask four times a second. Add the `if` inside your memory block, right after the line that checks `frameCount % 15`, and the function at the bottom.',
      edits: [
        { code: `  if (brainReady && frameCount % 15 === 0) {
    brain.classify([playerX, playerY], gotGuess);
  }
`, at: { before: '// remember what the player does' } },
        { code: `function gotGuess(results) {
  brainGuess = results[0].label;
}`, at: { end: true } },
      ],
      show: `if (brainReady && frameCount % 15 === 0) {
  brain.classify([playerX, playerY], gotGuess);
}

// at the bottom:
function gotGuess(results) {
  brainGuess = results[0].label;
}`,
      check: /\.classify\s*\(/,
    },
    {
      title: 'Keep score for both', mins: 6,
      reveal: true,
      say: 'Which algorithm is better? Count it. Create `tests`, `nearestRight`, and `brainRight`, all 0, at the top. Just before you push a new memory, compare each algorithm\'s guess with `lastMove`, the move that really happened. Only count once the network is ready.',
      edits: [
        { code: 'let tests = 0;\nlet nearestRight = 0;\nlet brainRight = 0;', at: { after: 'let brainGuess = "";' } },
        { code: `    if (brainReady) {
      tests = tests + 1;
      if (predictMove() === lastMove) { nearestRight = nearestRight + 1; }
      if (brainGuess === lastMove) { brainRight = brainRight + 1; }
    }`, at: { before: 'memories.push({ x: playerX' } },
      ],
      show: `let tests = 0;           // at the top
let nearestRight = 0;
let brainRight = 0;

// just before memories.push:
if (brainReady) {
  tests = tests + 1;
  if (predictMove() === lastMove) { nearestRight = nearestRight + 1; }
  if (brainGuess === lastMove) { brainRight = brainRight + 1; }
}`,
      check: /brainRight\s*(?:=\s*brainRight\s*\+|\+=|\+\+)/,
    },
    {
      title: 'Declare a winner', mins: 6,
      reveal: true,
      say: 'Show both scores on screen above `// score and messages` using `text()`. Then play for two minutes. Compare the scores with the prediction you wrote down. Would the winner still win with less data?',
      code: `  fill(255);
  textSize(14);
  text("Nearest: " + nearestRight + "  Network: " + brainRight + "  of " + tests, 10, 44);

`,
      at: { before: '// score and messages' },
      check: /text\s*\([^)]*brainRight/,
    },
  ],
  stretch: ['Try 10 epochs and 100 epochs. What changes?', 'Add `score` as a third input. Does it help?', 'Let the bot use whichever algorithm has the better score so far.'],
  reflect: 'Which algorithm won, and by how much? Name one reason you might still choose the other one, such as speed, memory, or being able to explain its answer.',
});

lesson({
  id: 'm7', title: 'Rival Bots', mins: 40, concepts: ['classes', 'objects', 'abstraction'], path: 'mind',
  hook: 'One rule-following bot and one learning bot, side by side. Classes let you build many bots from one blueprint, and see which kind is harder to escape.',
  steps: [
    {
      title: 'A Bot class', mins: 12,
      reveal: true,
      say: 'You built classes at the last Crossing. Write a class called `Bot` at the bottom. Its constructor takes `x`, `y`, and `smart`, which is true or false. Give it an `update()` method that chases the player, using `predictMove()` only if `smart` is true. Give it a `show()` method that draws smart bots in a different color.',
      code: `class Bot {
  constructor(x, y, smart) {
    this.x = x;
    this.y = y;
    this.smart = smart;
  }

  update() {
    let targetX = playerX;
    let targetY = playerY;
    if (this.smart) {
      let guess = predictMove();
      if (guess === "left") { targetX = playerX - 60; }
      if (guess === "right") { targetX = playerX + 60; }
      if (guess === "up") { targetY = playerY - 60; }
      if (guess === "down") { targetY = playerY + 60; }
    }
    if (this.x < targetX) { this.x = this.x + 1; }
    if (this.x > targetX) { this.x = this.x - 1; }
    if (this.y < targetY) { this.y = this.y + 1; }
    if (this.y > targetY) { this.y = this.y - 1; }
  }

  show() {
    if (this.smart) {
      fill(200, 120, 255);
    } else {
      fill(255, 170, 90);
    }
    rect(this.x, this.y, 26, 26);
  }
}`,
      at: { end: true },
      check: /class\s+Bot\s*\{[\s\S]*constructor/,
      hint: 'Your bot rules already have this logic. Change botX to this.x, and use a speed of 1 so a crowd stays fair.',
    },
    {
      title: 'Make the rivals', mins: 6,
      reveal: true,
      say: 'Create an empty list called `rivals` at the top. In `setup()`, use `new Bot(...)` to add one smart bot and one that is not. Classes must be used after the code has loaded, which is why this happens in `setup()`.',
      edits: [
        { code: 'let rivals = [];', at: { after: 'let lastMove = "";' } },
        { code: '  rivals.push(new Bot(40, 340, true));\n  rivals.push(new Bot(340, 40, false));', at: { after: 'createCanvas(400, 400);' } },
      ],
      show: `let rivals = [];       // at the top

// in setup():
rivals.push(new Bot(40, 340, true));
rivals.push(new Bot(340, 40, false));`,
      check: /new\s+Bot\s*\(/,
    },
    {
      title: 'Run the rivals', mins: 8,
      reveal: true,
      say: 'Above `// player`, loop over `rivals`. Ask each one to `update()` and `show()`. If one touches the player, set `lost` to true.',
      code: `  // rivals
  for (let i = 0; i < rivals.length; i = i + 1) {
    rivals[i].update();
    rivals[i].show();
    if (dist(rivals[i].x, rivals[i].y, playerX, playerY) < 26) {
      lost = true;
    }
  }
`,
      at: { before: '// player' },
      check: /rivals\s*\[\s*\w+\s*\]\s*\.\s*update\s*\(/,
    },
    {
      title: 'Fix the restart', mins: 4,
      reveal: true,
      say: 'In `resetGame`, empty `rivals` and build them again, so they start from their corners. Notice that `memories` stays: the bots keep what they learned between rounds.',
      code: `  rivals = [];
  rivals.push(new Bot(40, 340, true));
  rivals.push(new Bot(340, 40, false));`,
      at: { after: '  score = 0;' },
      check: /function\s+resetGame[\s\S]*rivals\s*=\s*\[\s*\]/,
    },
    {
      title: 'Which one catches you?', mins: 10,
      say: 'Play several rounds and keep a tally of which bot catches you. Does the smart bot get better as more dots appear? Change the balance of smart and simple bots until the game feels good. Then try playing in a completely new pattern, and see what happens to the smart bot.',
    },
  ],
  stretch: ['Give each bot its own speed property.', 'Make bots that use the neural network instead.', 'Add a bot that learns only from the last 30 memories.'],
  reflect: 'What happened to the smart bot when you changed how you played? What does that tell you about AI systems trained on old data?',
});

lesson({
  id: 'm8', title: 'Is It Fair?', mins: 40, concepts: ['evaluating models', '2D arrays', 'AI ethics'], path: 'mind',
  hook: 'People use machine learning to decide things that matter. Saying "it works" is not enough: you need to know where it fails, and who gets hurt when it does. Today you measure your model the way professionals do.',
  steps: [
    {
      title: 'Accuracy can hide things', mins: 5,
      say: 'Imagine a model that is right 95% of the time. Now imagine the 5% are nearly all one group of people. A single number hid the problem. A **confusion table** shows what the model guessed against what really happened, so you can see exactly where it goes wrong.',
    },
    {
      title: 'A table in a list of lists', mins: 5,
      say: 'A **2D array** is a list of lists: one row for each real move, one column for each guess. Add this at the top.',
      code: `let MOVES = ["left", "right", "up", "down"];
let confusion = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];`,
      at: { after: 'let lastMove = "";' },
      check: /let\s+confusion\s*=\s*\[\s*\[/,
    },
    {
      title: 'Count each guess', mins: 8,
      reveal: true,
      say: 'Write a function called `recordGuess(actual, guessed)` at the bottom. Use `MOVES.indexOf()` to turn each word into a row or column number. If the guess is not in the list, `indexOf` gives -1, so stop there. Otherwise add 1 to `confusion[row][col]`.',
      code: `function recordGuess(actual, guessed) {
  let row = MOVES.indexOf(actual);
  let col = MOVES.indexOf(guessed);
  if (row === -1 || col === -1) {
    return;
  }
  confusion[row][col] = confusion[row][col] + 1;
}`,
      at: { end: true },
      check: /confusion\s*\[\s*\w+\s*\]\s*\[\s*\w+\s*\]\s*(?:=|\+\+|\+=)/,
    },
    {
      title: 'Collect the results', mins: 4,
      reveal: true,
      say: 'Just before you push a new memory, call `recordGuess` with the move that really happened and what `predictMove()` guessed.',
      code: '    recordGuess(lastMove, predictMove());',
      at: { before: 'memories.push({ x: playerX' },
      check: /recordGuess\s*\(\s*\w+\s*,\s*\w+\s*\(/,
    },
    {
      title: 'Draw the table', mins: 10,
      reveal: true,
      say: 'A loop inside a loop visits every cell. Press **Add the starter code**, then finish the TODO so each cell shows its count. The diagonal, where row equals column, is where the guess was right.',
      code: `  // confusion table
  textSize(11);
  for (let row = 0; row < 4; row = row + 1) {
    for (let col = 0; col < 4; col = col + 1) {
      if (row === col) {
        fill(120, 240, 170);
      } else {
        fill(255);
      }
      text(confusion[row][col], 290 + col * 26, 60 + row * 18);
    }
  }

`,
      at: { before: '// score and messages' },
      skeleton: [{ code: `  // confusion table
  textSize(11);
  for (let row = 0; row < 4; row = row + 1) {
    for (let col = 0; col < 4; col = col + 1) {
      if (row === col) {
        fill(120, 240, 170);
      } else {
        fill(255);
      }
      // TODO: Use text() to draw confusion[row][col].
      // Put it at x = 290 + col * 26 and y = 60 + row * 18.

    }
  }

`, at: { before: '// score and messages' } }],
      check: /text\s*\(\s*confusion\s*\[/,
    },
    {
      title: 'Who does it fail for?', mins: 8,
      say: 'Play, then read your table: which move does it confuse most? Now swap seats. The bot learned from you, so how well does it predict your partner?\n\nThen go back to your Teachable Machine model. Test it with people who look different from you, or in different light. Discuss who a system like this would work poorly for, if it were used for something important like unlocking a door or grading a test.',
    },
  ],
  stretch: ['Calculate and display accuracy as a percentage.', 'Compare the tables for nearest neighbor and your neural network.', 'Find a news story about an AI system that treated people unfairly.'],
  reflect: 'If a school used a model like yours to make a real decision, who could be harmed by its mistakes? What would you want checked before it was used?',
});
