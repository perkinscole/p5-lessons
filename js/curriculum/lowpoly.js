// Beyond the Summit: the Low Poly Road. One 3D world, built up over five lessons.
// It starts a fresh project, so it doesn't depend on which road a student took.
import { lesson } from './engine.js';

lesson({
  id: 'd1', title: 'A World With Depth', mins: 35, concepts: ['3D coordinates', 'transformations', 'push and pop'],
  hook: 'Every game you have made was flat. Today you add a third direction, and start a world you can walk through.',
  starter: `let spin = 0;

function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
}

function draw() {
  background(130, 200, 235);
  // world
}
`,
  steps: [
    {
      title: 'Your first box', mins: 5,
      say: '**WEBGL** in `createCanvas` turns on 3D. The middle of the canvas is now (0, 0). Add a box below `// world`.',
      code: '  box(80);',
      at: { after: '// world' },
      check: /box\s*\(/,
    },
    {
      title: 'Turn on the lights', mins: 6,
      say: 'Without light, a 3D shape looks like a flat sticker. `ambientLight` lights everything a little. `directionalLight` is the sun. Add these above your box.',
      code: `  ambientLight(110);
  directionalLight(255, 245, 220, 0.4, 0.8, -0.6);
  fill(240, 130, 90);`,
      at: { before: 'box(80);' },
      check: /directionalLight\s*\(/,
    },
    {
      title: 'Three directions', mins: 7,
      say: '`translate(x, y, z)` moves where you draw. `y` goes **down**, and `z` comes **toward you**. `push` and `pop` keep a move from affecting anything else. Add ground above your box.',
      code: `  // ground
  push();
  fill(105, 175, 95);
  translate(0, 46, 0);
  box(340, 12, 340);
  pop();
`,
      at: { before: 'fill(240, 130, 90);' },
      check: /translate\s*\(/,
    },
    {
      title: 'Turn the whole world', mins: 6,
      say: 'Rotating before you draw turns everything after it. Add this above `// ground` to look down and slowly spin.',
      code: `  rotateX(-0.45);
  spin = spin + 0.01;
  rotateY(spin);
`,
      at: { before: '// ground' },
      check: /rotateY\s*\(/,
    },
    {
      title: 'Add a roof', mins: 6,
      reveal: true,
      say: 'Put a wide, flat, dark red box on top of your house, below the first box. Use `push`, `translate`, and `pop`. Remember that up is a **negative** `y`.',
      code: `  // roof
  push();
  fill(170, 70, 70);
  translate(0, -65, 0);
  box(100, 50, 100);
  pop();`,
      at: { after: 'box(80);' },
      check: /(?:translate\s*\([\s\S]*){2,}/,
      hint: 'The house top is at y = -40. Half the roof height above that is -65.',
    },
    {
      title: 'Build your own spot', mins: 5,
      say: 'Add three more shapes to your world. Try `sphere(30)` and `cylinder(20, 80)`. Wrap each one in `push` and `pop`.',
    },
  ],
  stretch: ['Add a chimney that sticks out of the roof.', 'Make the sun move by changing the numbers in `directionalLight` over time.', 'Build a tiny village with a loop.'],
  reflect: 'What goes wrong if you leave out `pop()`? Try it, then explain what you saw.',
});

lesson({
  id: 'd2', title: 'A Low Poly Forest', mins: 38, concepts: ['low poly modeling', 'reusable geometry', 'abstraction'],
  hook: 'Low poly art leaves out almost every detail, and it still looks like a forest. Today you learn which details matter.',
  steps: [
    {
      title: 'Few sides, flat faces', mins: 7,
      say: 'The last numbers in `cone` and `cylinder` set how many sides they have. Fewer sides look more low poly. `rotateX(PI)` flips the cone so its tip points up. Add this at the bottom, then draw one tree at the end of `draw()`.',
      edits: [
        { code: `function makeTree() {
  fill(125, 85, 55);
  cylinder(6, 30, 5, 1);
  translate(0, -38, 0);
  rotateX(PI);
  fill(55, 145, 95);
  cone(24, 54, 6, 1);
}`, at: { end: true } },
        { code: `  push();
  translate(-120, 25, 60);
  makeTree();
  pop();`, at: { endOf: 'function draw' } },
      ],
      check: /function\s+makeTree/,
    },
    {
      title: 'Sharpen the faces', mins: 8,
      say: '`buildGeometry` turns your drawing into one saved shape. `FLAT` makes every face a single shade, which is the low poly look. Add these lines, then draw the saved shape with `model`.',
      edits: [
        { code: 'let treeShape;', at: { after: 'let spin = 0;' } },
        { code: `  treeShape = buildGeometry(makeTree);
  treeShape.computeNormals(FLAT);`, at: { after: 'noStroke();' } },
        { code: 'model(treeShape);', at: { replace: 'makeTree();' } },
      ],
      check: /computeNormals\s*\(\s*FLAT/,
    },
    {
      title: 'Grow a forest', mins: 8,
      say: '`randomSeed` makes `random` give the same numbers every frame, so trees stay still. Replace your one tree with `plantForest();`. Then add this function at the bottom.',
      edits: [
        { code: 'plantForest();', at: { replace: `push();
  translate(-120, 25, 60);
  model(treeShape);
  pop();` } },
        { code: `function plantForest() {
  randomSeed(7);
  for (let i = 0; i < 38; i = i + 1) {
    let x = random(-165, 165);
    let z = random(-165, 165);
    push();
    translate(x, 25, z);
    model(treeShape);
    pop();
  }
}`, at: { end: true } },
      ],
      check: /randomSeed\s*\(/,
    },
    {
      title: 'Clear the yard', mins: 5,
      reveal: true,
      say: 'Trees are growing through the house. Use `dist` so a tree only grows if it is more than 120 away from the center.',
      code: `if (dist(x, z, 0, 0) > 120) {
      push();
      translate(x, 25, z);
      model(treeShape);
      pop();
    }`,
      at: { replace: `push();
    translate(x, 25, z);
    model(treeShape);
    pop();` },
      check: /if\s*\(\s*dist\s*\(\s*x\s*,\s*z/,
      hint: 'Put the push, translate, model, and pop inside the if.',
    },
    {
      title: 'Add your own model', mins: 7,
      reveal: true,
      say: 'Make a second shape, such as a rock from `sphere(18, 5, 3)`. Save it with `buildGeometry` and `FLAT`, then scatter ten of them outside the yard in `plantForest`.',
      edits: [
        { code: 'let rockShape;', at: { after: 'let treeShape;' } },
        { code: `  rockShape = buildGeometry(makeRock);
  rockShape.computeNormals(FLAT);`, at: { after: 'treeShape.computeNormals(FLAT);' } },
        { code: `function makeRock() {
  fill(135, 135, 150);
  sphere(18, 5, 3);
}`, at: { end: true } },
        { code: `  for (let i = 0; i < 10; i = i + 1) {
    let rockX = random(-165, 165);
    let rockZ = random(-165, 165);
    if (dist(rockX, rockZ, 0, 0) > 120) {
      push();
      translate(rockX, 32, rockZ);
      model(rockShape);
      pop();
    }
  }`, at: { endOf: 'function plantForest' } },
      ],
      check: /sphere\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/,
      hint: 'Copy what you did for treeShape. You need a variable, a make function, and the two lines in setup.',
    },
    {
      title: 'Count the faces', mins: 3,
      say: 'Change the cone\'s `6` to `3`, then to `40`. Which still looks like a tree? Pick the smallest number that works.',
    },
  ],
  stretch: ['Add a second kind of tree with a different shape.', 'Make trees different sizes with `scale(random(0.7, 1.4))`.', 'Change the colors to make a fall or snowy forest.'],
  reflect: 'A real tree has thousands of leaves. Which details did your model keep, which did it leave out, and why does it still look like a tree?',
});

lesson({
  id: 'd3', title: 'Walk Through It', mins: 38, concepts: ['trigonometry', 'camera', 'boundaries'],
  hook: 'Spinning a model is cool. Standing inside it is better. Today you step into your world.',
  steps: [
    {
      title: 'Stop the spin', mins: 3,
      say: 'You are about to control the view yourself. Delete the three rotate lines, and replace `spin` with these player variables.',
      edits: [
        { code: '', at: { replace: `  rotateX(-0.45);
  spin = spin + 0.01;
  rotateY(spin);
` } },
        { code: `let playerX = 0;
let playerY = 26;
let playerZ = 72;
let heading = 3.14;
let speed = 2.5;`, at: { replace: 'let spin = 0;' } },
      ],
      check: /let\s+heading/,
    },
    {
      title: 'Make your hero', mins: 7,
      say: 'Your hero is two boxes. The small one shows which way they face. Add this at the bottom, then call `drawPlayer();` at the end of `draw()`.',
      edits: [
        { code: `function drawPlayer() {
  push();
  translate(playerX, playerY, playerZ);
  rotateY(heading);
  fill(245, 200, 70);
  box(18, 28, 18);
  translate(0, -4, 12);
  fill(60, 60, 90);
  box(10, 6, 10);
  pop();
}`, at: { end: true } },
        { code: '  drawPlayer();', at: { endOf: 'function draw' } },
      ],
      check: /function\s+drawPlayer/,
    },
    {
      title: 'Turn and walk', mins: 9,
      say: '`sin` and `cos` split one walking step into an `x` part and a `z` part, based on your heading. Add this at the bottom, and call `movePlayer();` right below `// world`.',
      edits: [
        { code: `function movePlayer() {
  let oldX = playerX;
  let oldZ = playerZ;
  if (keyIsDown(LEFT_ARROW)) {
    heading = heading + 0.04;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    heading = heading - 0.04;
  }
  if (keyIsDown(UP_ARROW)) {
    playerX = playerX + sin(heading) * speed;
    playerZ = playerZ + cos(heading) * speed;
  }
}`, at: { end: true } },
        { code: '  movePlayer();', at: { after: '// world' } },
      ],
      check: /sin\s*\(\s*heading/,
    },
    {
      title: 'A camera that follows', mins: 8,
      say: '`camera` takes three spots: where the camera is, what it looks at, and which way is up. `perspective` sets how wide the lens is. Add the first line in `setup()` and the second below `movePlayer();`.',
      edits: [
        { code: '  perspective(1.1, 1, 5, 1500);', at: { after: 'noStroke();' } },
        { code: '  camera(playerX - sin(heading) * 62, playerY - 85, playerZ - cos(heading) * 62, playerX, playerY, playerZ, 0, 1, 0);', at: { after: 'movePlayer();' } },
      ],
      check: /camera\s*\(/,
    },
    {
      title: 'Stay in the world', mins: 5,
      reveal: true,
      say: 'You can walk off the edge. Use `constrain` at the end of `movePlayer` so both `playerX` and `playerZ` stay between -165 and 165.',
      code: `  playerX = constrain(playerX, -165, 165);
  playerZ = constrain(playerZ, -165, 165);`,
      at: { endOf: 'function movePlayer' },
      check: /constrain\s*\(\s*playerZ/,
      hint: 'playerX = constrain(playerX, low, high);',
    },
    {
      title: 'Bump into the house', mins: 6,
      reveal: true,
      say: 'You can walk through your house. At the end of `movePlayer`, use `dist` to check if you are closer than 62 to the center. If so, go back to `oldX` and `oldZ`.',
      code: `  if (dist(playerX, playerZ, 0, 0) < 62) {
    playerX = oldX;
    playerZ = oldZ;
  }`,
      at: { endOf: 'function movePlayer' },
      check: /dist\s*\(\s*playerX/,
      hint: 'You saved oldX and oldZ at the top of the function for this.',
    },
  ],
  stretch: ['Add the down arrow so you can walk backward.', 'Hold shift to sprint.', 'Make a first-person view by moving the camera into the hero.'],
  reflect: 'Your hero faces straight down the `x` direction. What are `sin(heading)` and `cos(heading)` then? Predict first, then test it with `console.log`.',
});

lesson({
  id: 'd4', title: 'Hills From Numbers', mins: 40, concepts: ['2D arrays', 'nested loops', 'procedural generation', 'triangle meshes'],
  hook: 'Nobody sculpts every hill in a big game. Code does it, with a grid of numbers and a pile of triangles.',
  steps: [
    {
      title: 'A grid of heights', mins: 8,
      say: 'A **list of lists** is a grid. `noise` gives smooth random numbers, so nearby spots get similar heights. `lerp` keeps the yard flat. Add this at the top and bottom, then call `makeHills();` in `setup()`.',
      edits: [
        { code: `let hills = [];
const CELL = 20;
const GRID = 17;`, at: { top: true } },
        { code: `function makeHills() {
  noiseSeed(8);
  for (let row = 0; row <= GRID; row = row + 1) {
    let line = [];
    for (let col = 0; col <= GRID; col = col + 1) {
      let x = col * CELL - 170;
      let z = row * CELL - 170;
      let wild = 75 - noise(col * 0.25, row * 0.25) * 135;
      let edge = constrain((dist(x, z, 0, 0) - 70) / 100, 0, 1);
      line.push(lerp(40, wild, edge));
    }
    hills.push(line);
  }
}`, at: { end: true } },
        { code: '  makeHills();', at: { after: 'noStroke();' } },
      ],
      check: /hills\s*\.\s*push/,
    },
    {
      title: 'Two triangles per square', mins: 10,
      say: 'A flat square has to be two triangles, because three points always make a flat face. Replace your whole `// ground` block with nothing. Then add this function, and call `drawHills();` above `ambientLight`.',
      edits: [
        { code: '', at: { replace: `  // ground
  push();
  fill(105, 175, 95);
  translate(0, 46, 0);
  box(340, 12, 340);
  pop();
` } },
        { code: `function drawHills() {
  beginShape(TRIANGLES);
  for (let row = 0; row < GRID; row = row + 1) {
    for (let col = 0; col < GRID; col = col + 1) {
      let x = col * CELL - 170;
      let z = row * CELL - 170;
      let a = hills[row][col];
      let b = hills[row][col + 1];
      let c = hills[row + 1][col];
      let d = hills[row + 1][col + 1];
      paintFace(a, b, c);
      vertex(x, a, z);
      vertex(x + CELL, b, z);
      vertex(x, c, z + CELL);
      paintFace(b, d, c);
      vertex(x + CELL, b, z);
      vertex(x + CELL, d, z + CELL);
      vertex(x, c, z + CELL);
    }
  }
  endShape();
}

function paintFace(h1, h2, h3) {
  fill(100, 170, 90);
}`, at: { end: true } },
        { code: '  drawHills();', at: { before: 'ambientLight(110);' } },
      ],
      check: /beginShape\s*\(\s*TRIANGLES/,
    },
    {
      title: 'Color by height', mins: 8,
      reveal: true,
      say: 'Press **Add the starter code**, then finish the TODO so low faces are green, middle faces are rock gray, and high faces are snow. Remember that a smaller `y` is higher.',
      code: `function paintFace(h1, h2, h3) {
  let middle = (h1 + h2 + h3) / 3;
  if (middle > 25) {
    fill(105, 180, 95);
  } else if (middle > -15) {
    fill(140, 135, 125);
  } else {
    fill(240, 245, 250);
  }
}`,
      at: { replace: `function paintFace(h1, h2, h3) {
  fill(100, 170, 90);
}` },
      check: /if\s*\(\s*middle\s*>/,
      hint: 'Try middle > 25 for grass and middle > -15 for rock. Anything else is snow.',
      skeleton: [
        { code: `function paintFace(h1, h2, h3) {
  let middle = (h1 + h2 + h3) / 3;
  // TODO: Use if, else if, and else with middle to pick one of three fills.
  fill(100, 170, 90);
}`, at: { replace: `function paintFace(h1, h2, h3) {
  fill(100, 170, 90);
}` } },
      ],
    },
    {
      title: 'Shade every face', mins: 6,
      say: 'Real light makes steep faces darker or brighter. We can fake that with one number. Add `shade` below `middle`, then multiply your colors by it.',
      edits: [
        { code: `let middle = (h1 + h2 + h3) / 3;
  let shade = 1 + (h1 - h2 + h1 - h3) * 0.012;`, at: { replace: 'let middle = (h1 + h2 + h3) / 3;' } },
        { code: 'fill(105 * shade, 180 * shade, 95 * shade);', at: { replace: 'fill(105, 180, 95);' } },
        { code: 'fill(140 * shade, 135 * shade, 125 * shade);', at: { replace: 'fill(140, 135, 125);' } },
        { code: 'fill(240 * shade, 245 * shade, 250 * shade);', at: { replace: 'fill(240, 245, 250);' } },
      ],
      check: /\*\s*shade/,
    },
    {
      title: 'Walk on the hills', mins: 5,
      say: 'Press **Add the finished file** to get `heightAt`, which finds the ground height anywhere. Then add this line at the end of `movePlayer`.',
      provides: { name: 'ground.js', code: `// Finds the height of the ground at any spot by blending the four nearest corners.
function heightAt(x, z) {
  let col = constrain((x + 170) / CELL, 0, GRID - 0.001);
  let row = constrain((z + 170) / CELL, 0, GRID - 0.001);
  let c = floor(col);
  let r = floor(row);
  let top = lerp(hills[r][c], hills[r][c + 1], col - c);
  let bottom = lerp(hills[r + 1][c], hills[r + 1][c + 1], col - c);
  return lerp(top, bottom, row - r);
}
` },
      code: '  playerY = heightAt(playerX, playerZ) - 14;',
      at: { endOf: 'function movePlayer' },
      check: /playerY\s*=\s*heightAt/,
    },
    {
      title: 'Plant on the slopes', mins: 3,
      reveal: true,
      say: 'Your trees and rocks float or sink now. Use `heightAt` in their `translate` lines, so each one sits on the ground.',
      edits: [
        { code: 'translate(x, heightAt(x, z) - 15, z);', at: { replace: 'translate(x, 25, z);' } },
        { code: 'translate(rockX, heightAt(rockX, rockZ) - 6, rockZ);', at: { replace: 'translate(rockX, 32, rockZ);' } },
      ],
      check: /translate\s*\(\s*x\s*,\s*heightAt/,
      hint: 'The tree is 15 above its own base, so subtract 15.',
    },
  ],
  stretch: ['Add blue water where the land is lowest.', 'Change `noiseSeed` until you find a world you love.', 'Make the grid finer. How does that change the look and the speed?'],
  reflect: 'Your land is a model of real terrain. What did you leave out on purpose? When would that missing detail matter?',
});

lesson({
  id: 'd5', title: 'Treasure of the Low Lands', mins: 40, concepts: ['classes in 3D', '3D distance', 'game design'],
  hook: 'You have a world. Now give someone a reason to explore it.',
  steps: [
    {
      title: 'Bake a gem', mins: 4,
      say: 'A sphere with very few sides makes a perfect gem. Add these lines the same way you made your trees.',
      edits: [
        { code: 'let gemShape;', at: { after: 'let treeShape;' } },
        { code: `  gemShape = buildGeometry(makeGem);
  gemShape.computeNormals(FLAT);`, at: { after: 'treeShape.computeNormals(FLAT);' } },
        { code: `function makeGem() {
  fill(90, 220, 230);
  sphere(12, 4, 2);
}`, at: { end: true } },
      ],
      check: /gemShape\s*=\s*buildGeometry/,
    },
    {
      title: 'A Gem class', mins: 9,
      reveal: true,
      say: 'Write a class called `Gem`. Its constructor takes `x` and `z`, and sets `y` to 24 above the ground. Give it a `show()` method that spins the gem, and a `touches()` method that returns whether the hero is closer than 34.',
      code: `class Gem {
  constructor(x, z) {
    this.x = x;
    this.z = z;
    this.y = heightAt(x, z) - 24;
  }

  show() {
    push();
    translate(this.x, this.y, this.z);
    rotateY(frameCount * 0.03);
    model(gemShape);
    pop();
  }

  touches() {
    return dist(playerX, playerY, playerZ, this.x, this.y, this.z) < 34;
  }
}`,
      at: { end: true },
      check: /class\s+Gem/,
      hint: '`dist` works in 3D too. Give it x, y, z for one spot, then x, y, z for the other.',
    },
    {
      title: 'Scatter in a spiral', mins: 5,
      say: 'A spiral spreads gems around the yard without any landing inside the house. Add this at the bottom. Then call `makeGems();` at the end of `setup()`, and `showGems();` at the end of `draw()`.',
      edits: [
        { code: `let gems = [];
let score = 0;`, at: { top: true } },
        { code: `function makeGems() {
  gems = [];
  for (let i = 0; i < 12; i = i + 1) {
    let angle = i * 2.4;
    let far = 72 + i * 7.5;
    gems.push(new Gem(cos(angle) * far, sin(angle) * far));
  }
}

function showGems() {
  for (let i = 0; i < gems.length; i = i + 1) {
    gems[i].show();
  }
}`, at: { end: true } },
        { code: '  makeGems();', at: { endOf: 'function setup' } },
        { code: '  showGems();', at: { endOf: 'function draw' } },
      ],
      check: /new\s+Gem\s*\(/,
    },
    {
      title: 'Collect them', mins: 8,
      reveal: true,
      say: 'Inside `showGems`, remove a gem and add 10 to `score` when the hero touches it. Loop **backward**, because removing from a list shifts everything after it.',
      code: `function showGems() {
  for (let i = gems.length - 1; i >= 0; i = i - 1) {
    gems[i].show();
    if (gems[i].touches()) {
      gems.splice(i, 1);
      score = score + 10;
    }
  }
}`,
      at: { replace: `function showGems() {
  for (let i = 0; i < gems.length; i = i + 1) {
    gems[i].show();
  }
}` },
      check: /gems\s*\.\s*splice/,
      hint: 'You wrote a backward loop with splice on your road. Start at gems.length - 1.',
    },
    {
      title: 'A score you can read', mins: 5,
      say: 'Text is tricky in WEBGL, so we place a normal web element over the game. Add the first line at the top, the next three in `setup()`, and the last at the end of `draw()`.',
      edits: [
        { code: 'let hud;', at: { top: true } },
        { code: `  hud = createDiv("");
  hud.position(10, 10);
  hud.style("color", "white");
  hud.style("font", "bold 20px sans-serif");`, at: { endOf: 'function setup' } },
        { code: '  hud.html("Gems left: " + gems.length + "  Score: " + score);', at: { endOf: 'function draw' } },
      ],
      check: /createDiv\s*\(/,
    },
    {
      title: 'Beat the clock', mins: 6,
      say: 'Now it is a game. You have 90 seconds to find them all, and **R** restarts. Add these pieces, and only move while the game is on.',
      edits: [
        { code: `let timeLeft = 90 * 60;
let won = false;
let lost = false;`, at: { top: true } },
        { code: `function updateClock() {
  if (gems.length === 0) {
    won = true;
  }
  if (!won && !lost) {
    timeLeft = timeLeft - 1;
    if (timeLeft <= 0) {
      lost = true;
    }
  }
}

function resetGame() {
  playerX = 0;
  playerZ = 72;
  heading = 3.14;
  score = 0;
  timeLeft = 90 * 60;
  won = false;
  lost = false;
  makeGems();
}

function keyPressed() {
  if (key === "r") {
    resetGame();
  }
}`, at: { end: true } },
        { code: `if (!won && !lost) {
    movePlayer();
  }`, at: { replace: 'movePlayer();' } },
        { code: '  updateClock();', at: { before: 'hud.html(' } },
        { code: `hud.html("Gems left: " + gems.length + "  Time: " + ceil(timeLeft / 60) + (won ? "  You found them all!" : "") + (lost ? "  Out of time! Press R." : ""));`, at: { replace: 'hud.html("Gems left: " + gems.length + "  Score: " + score);' } },
      ],
      check: /function\s+resetGame/,
    },
    {
      title: 'Make it yours', mins: 3,
      say: 'Change one thing that makes your world feel like **yours**: the colors, the shapes, or the rules. Then let a neighbor explore it.',
    },
  ],
  stretch: ['Add a low poly creature that chases you.', 'Make the sky change color as the clock runs out.', 'Hide one gem somewhere very hard to find, and add a hint.'],
  reflect: 'What was hardest about thinking in 3D? Name one idea from your 2D games that worked the same way here.',
});
