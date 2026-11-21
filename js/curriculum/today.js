// What each lesson builds and the few ideas it turns on. Shown on the "Today" card when a student
// first opens a lesson, and again behind the "Key ideas" button.
//
// Keep each `build` to one sentence about the thing made, and each idea to one plain sentence a
// student could say back. Two to five ideas a lesson: these are the words worth knowing, not a
// list of everything on the page. Every lesson has an entry, and a test checks it.

const TODAY = {
  t1: {
    build: 'A scene with a sun, the ground, and a character you design.',
    ideas: [
      { term: 'canvas', means: 'The square your code draws on. Yours is 400 dots wide and 400 tall.' },
      { term: 'coordinates (x, y)', means: 'The two numbers for a spot. x is horizontal, across from the left. y is vertical, down from the top.' },
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
      { term: 'make, use, change', means: 'What you do with a variable: let makes it, its name uses it, and = changes it.' },
      { term: 'the draw loop', means: 'setup() runs once. draw() runs about 60 times a second, and each run is one frame.' },
      { term: '= means "becomes"', means: 'saucerX = saucerX + 2 makes saucerX become its old value plus 2.' },
      { term: 'animation', means: 'Changing a variable a little every frame makes a shape look like it moves.' },
    ],
  },
  t4: {
    build: 'A creature that follows your mouse and reacts when you click.',
    ideas: [
      { term: 'input', means: 'Information coming into your program from the player, like the mouse.' },
      { term: 'built-in variable', means: 'A variable p5 makes and changes for you. You made saucerX. p5 makes mouseX.' },
      { term: 'mouseX and mouseY', means: 'Built-in variables that always hold where the mouse is. You only use them.' },
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
  p1: {
    build: 'A hero that falls, lands on the ground, and jumps.',
    ideas: [
      { term: 'velocity', means: 'How fast something is moving. playerVY is how far the player moves down each frame.' },
      { term: 'gravity', means: 'A small number added to the velocity every frame, so falling gets faster.' },
      { term: 'boolean', means: 'A variable that is only true or false, like onGround.' },
      { term: 'keyPressed()', means: 'A function p5 runs once each time a key goes down.' },
    ],
  },
  p2: {
    build: 'A hero that runs left and right and lands on a platform.',
    ideas: [
      { term: 'keyIsDown()', means: 'Checks whether a key is being held right now. Good for moving smoothly.' },
      { term: 'constrain()', means: 'Keeps a number between a lowest and a highest value.' },
      { term: 'compound condition', means: 'Several checks joined with &&. Every one must be true.' },
      { term: 'platform', means: 'A rectangle described by four variables: x, y, width, and height.' },
    ],
  },
  p3: {
    build: 'A level with a coin to grab, a spike to dodge, and a flag to reach.',
    ideas: [
      { term: 'dist()', means: 'Gives the distance between two points. Use it to tell when two things touch.' },
      { term: 'boolean', means: 'A true or false variable. won, lost, and coinTaken remember what has happened.' },
      { term: '! means "not"', means: 'Flips true and false. !coinTaken is true while the coin is still there.' },
      { term: 'win and lose', means: 'Rules that end the game. They give the player something to want and to fear.' },
    ],
  },
  p4: {
    build: 'A restart key, and scenery drawn by loops.',
    ideas: [
      { term: 'function', means: 'A named set of instructions. You write it once and call it whenever you need it.' },
      { term: 'resetGame()', means: 'Your function that puts every starting value back, so the game can begin again.' },
      { term: 'for loop', means: 'Repeats code a set number of times, changing one variable each time around.' },
      { term: 'loop variable', means: 'The variable a loop counts with, often i or x. Use it in math to space things out.' },
    ],
  },
  p5: {
    build: 'A level with many platforms, kept in one list.',
    ideas: [
      { term: 'object', means: 'Values bundled under one name, like { x: 10, y: 20 }. Read one with a dot: p.x.' },
      { term: 'array', means: 'A list of values in order. Yours holds every platform.' },
      { term: 'index', means: "An item's position in an array. Counting starts at 0." },
      { term: '.length', means: 'How many items an array holds. Loops use it to know when to stop.' },
    ],
  },
  p6: {
    build: 'A trail of coins that vanish when you collect them.',
    ideas: [
      { term: 'push()', means: 'Adds an item to the end of an array.' },
      { term: 'splice()', means: 'Removes an item from an array at a position you choose.' },
      { term: 'looping backward', means: 'Going from the last item to the first, so removing one never skips the next.' },
      { term: 'return', means: 'Hands a value back from a function. makeCoins() returns a fresh list.' },
    ],
  },
  p7: {
    build: 'A level you paint with letters, built by your code.',
    ideas: [
      { term: 'class', means: 'A blueprint for making many objects that all work the same way.' },
      { term: 'method', means: 'A function that belongs to an object, called with a dot: c.show().' },
      { term: '2D data', means: 'Rows and columns, like a grid. Your level is a list of rows of letters.' },
      { term: 'nested loops', means: "A loop inside a loop. One walks the rows, the other walks each row's letters." },
    ],
  },
  p8: {
    build: 'An endless level that your code invents as you run.',
    ideas: [
      { term: 'algorithm', means: 'A set of exact steps that solves a problem. Yours builds a level.' },
      { term: 'procedural generation', means: 'Making a world with rules and random numbers instead of placing each piece by hand.' },
      { term: 'camera', means: 'A variable that slides the whole world sideways, so the view follows the player.' },
      { term: 'constraint', means: 'A rule your generator must keep, like never making a gap too wide to jump.' },
    ],
  },
  a1: {
    build: 'A hero you walk around a world with a pond.',
    ideas: [
      { term: 'keyIsDown()', means: 'Checks whether a key is being held right now. Good for moving smoothly.' },
      { term: 'speed variable', means: 'One variable for how far to move each frame. Change it once and all movement changes.' },
      { term: 'constrain()', means: 'Keeps a number between a lowest and a highest value.' },
      { term: 'dist()', means: 'Gives the distance between two points, like the player and the pond.' },
    ],
  },
  a2: {
    build: 'A solid wall your hero cannot walk through.',
    ideas: [
      { term: 'collision detection', means: 'Checking whether two shapes overlap.' },
      { term: 'overlap check', means: 'Four comparisons joined with &&. Two rectangles touch only when all four are true.' },
      { term: 'undo the move', means: 'Save the old position first. If the new spot hits a wall, go back to it.' },
      { term: 'compound condition', means: 'Several checks joined with &&. Every one must be true.' },
    ],
  },
  a3: {
    build: 'A puzzle with a key, a locked door, lava, and treasure.',
    ideas: [
      { term: 'boolean', means: 'A true or false variable. hasKey remembers whether the key was picked up.' },
      { term: 'game state', means: 'What has happened so far, stored in variables like hasKey, won, and lost.' },
      { term: '! means "not"', means: 'Flips true and false. !hasKey is true until you have the key.' },
      { term: 'win and lose', means: 'Rules that end the game. They give the player something to want and to fear.' },
    ],
  },
  a4: {
    build: 'A restart key, and scenery drawn by loops.',
    ideas: [
      { term: 'function', means: 'A named set of instructions. You write it once and call it whenever you need it.' },
      { term: 'resetGame()', means: 'Your function that puts every starting value back, so the game can begin again.' },
      { term: 'for loop', means: 'Repeats code a set number of times, changing one variable each time around.' },
      { term: '% (remainder)', means: 'What is left over after dividing. It wraps big numbers back onto the canvas.' },
    ],
  },
  a5: {
    build: 'A maze with many walls, kept in one list.',
    ideas: [
      { term: 'object', means: 'Values bundled under one name, like { x: 10, y: 20 }. Read one with a dot: w.x.' },
      { term: 'array', means: 'A list of values in order. Yours holds every wall.' },
      { term: '.length', means: 'How many items an array holds. Loops use it to know when to stop.' },
      { term: 'return', means: 'Hands an answer back from a function. hitsWall() returns true or false.' },
    ],
  },
  a6: {
    build: 'Gems scattered around the world that vanish when you collect them.',
    ideas: [
      { term: 'push()', means: 'Adds an item to the end of an array.' },
      { term: 'splice()', means: 'Removes an item from an array at a position you choose.' },
      { term: 'looping backward', means: 'Going from the last item to the first, so removing one never skips the next.' },
      { term: 'return', means: 'Hands a value back from a function. makeGems() returns a fresh list.' },
    ],
  },
  a7: {
    build: 'A map you paint with letters, built by your code.',
    ideas: [
      { term: 'class', means: 'A blueprint for making many objects that all work the same way.' },
      { term: 'method', means: 'A function that belongs to an object, called with a dot: g.show().' },
      { term: '2D data', means: 'Rows and columns, like a grid. Your map is a list of rows of letters.' },
      { term: 'nested loops', means: "A loop inside a loop. One walks the rows, the other walks each row's letters." },
    ],
  },
  a8: {
    build: 'An enemy that finds the shortest way to you through any maze.',
    ideas: [
      { term: 'algorithm', means: 'A set of exact steps that solves a problem. Yours finds a path.' },
      { term: 'breadth-first search', means: 'Checks every tile one step away, then two steps, then three, until it reaches the goal.' },
      { term: 'queue', means: 'A waiting line. The first tile added is the first one checked.' },
      { term: 'shortest path', means: 'The route with the fewest steps. Breadth-first search always finds one.' },
    ],
  },
  s1: {
    build: 'A ship you fly left and right, with a flickering engine.',
    ideas: [
      { term: 'keyIsDown()', means: 'Checks whether a key is being held right now. Good for moving smoothly.' },
      { term: 'speed variable', means: 'One variable for how far to move each frame. Change it once and all movement changes.' },
      { term: 'constrain()', means: 'Keeps a number between a lowest and a highest value.' },
      { term: 'random()', means: 'Gives a different number each time. Used every frame, it makes things flicker.' },
    ],
  },
  s2: {
    build: 'A ship that fires a bullet when you press space.',
    ideas: [
      { term: 'boolean', means: 'A variable that is only true or false, like bulletActive.' },
      { term: 'keyPressed()', means: 'A function p5 runs once each time a key goes down. Good for firing.' },
      { term: 'lifecycle', means: 'The stages something goes through. A bullet is created, travels, and is removed.' },
      { term: 'counter', means: 'A variable you add 1 to each time something happens.' },
    ],
  },
  s3: {
    build: 'An enemy to shoot, a score, and a way to win or lose.',
    ideas: [
      { term: 'dist()', means: 'Gives the distance between two points. Use it to tell when two things touch.' },
      { term: 'collision', means: 'Two things touching. Here, a bullet close enough to the enemy.' },
      { term: 'win and lose', means: 'Rules that end the game. They give the player something to want and to fear.' },
      { term: 'balance', means: 'Tuning the numbers until the game is neither too easy nor too hard.' },
    ],
  },
  s4: {
    build: 'A restart key, and a sky of moving stars drawn by a loop.',
    ideas: [
      { term: 'function', means: 'A named set of instructions. You write it once and call it whenever you need it.' },
      { term: 'resetGame()', means: 'Your function that puts every starting value back, so the game can begin again.' },
      { term: 'for loop', means: 'Repeats code a set number of times, changing one variable each time around.' },
      { term: 'frameCount', means: 'A variable p5 raises by 1 every frame. Add it to a position to make things move.' },
    ],
  },
  s5: {
    build: 'A ship that fires as many bullets as you like.',
    ideas: [
      { term: 'array', means: 'A list of values in order. Yours holds every bullet on screen.' },
      { term: 'object', means: 'Values bundled under one name, like { x: 10, y: 20 }. Read one with a dot: b.x.' },
      { term: 'push()', means: 'Adds an item to the end of an array. Each shot pushes a new bullet.' },
      { term: 'splice()', means: 'Removes an item from an array at a position you choose.' },
      { term: 'looping backward', means: 'Going from the last item to the first, so removing one never skips the next.' },
    ],
  },
  s6: {
    build: 'A whole formation of enemies to clear.',
    ideas: [
      { term: 'array of objects', means: 'A list where every item is an object. Each enemy has its own x and y.' },
      { term: 'nested loops', means: 'A loop inside a loop. Here, every bullet is checked against every enemy.' },
      { term: '.length', means: 'How many items an array holds. When it is 0, the list is empty.' },
      { term: 'return', means: 'Hands a value back from a function. makeEnemies() returns a fresh formation.' },
    ],
  },
  s7: {
    build: 'Waves of enemies that come from a list you write.',
    ideas: [
      { term: 'class', means: 'A blueprint for making many objects that all work the same way.' },
      { term: 'method', means: 'A function that belongs to an object, called with a dot: e.update().' },
      { term: 'data-driven design', means: 'Describing levels as data the game reads, so a new wave is one new line.' },
      { term: 'index', means: 'A position in an array. The wave variable picks which wave to read.' },
    ],
  },
  s8: {
    build: 'A boss that patrols, aims at you, fires, and rests.',
    ideas: [
      { term: 'algorithm', means: 'A set of exact steps that solves a problem. Yours decides what the boss does.' },
      { term: 'state machine', means: 'A thing that is in one state at a time, with rules for when to switch.' },
      { term: 'state', means: 'What something is doing right now, like "patrol", "aim", or "rest".' },
      { term: 'atan2()', means: 'Gives the angle from one point to another. The boss uses it to aim.' },
    ],
  },
  c1: {
    build: 'A forest of trees drawn by one function you write.',
    ideas: [
      { term: 'function', means: 'A named set of instructions. You write it once and call it whenever you need it.' },
      { term: 'parameter', means: "A variable in the function's ( ). It takes a different value on each call." },
      { term: 'argument', means: 'The value you put in the ( ) when you call a function.' },
      { term: 'return', means: 'Hands a value back to the line that called the function.' },
    ],
  },
  c2: {
    build: 'Your own hero, drawn by you and animated in your game.',
    ideas: [
      { term: 'sprite', means: 'A picture used for a character or object in a game.' },
      { term: 'preload()', means: 'A function p5 runs before setup(), so pictures are ready before the game starts.' },
      { term: 'image()', means: 'Draws a picture on the canvas at a position and size you choose.' },
      { term: 'sprite sheet', means: 'One picture holding several frames. Showing them in turn makes an animation.' },
      { term: '% (remainder)', means: 'What is left over after dividing. It makes a counter loop back to 0.' },
    ],
  },
  c3: {
    build: 'A zoo of critters that each move by themselves.',
    ideas: [
      { term: 'class', means: 'A blueprint for making many objects that all work the same way.' },
      { term: 'constructor', means: 'The part of a class that runs once to set up each new object.' },
      { term: 'property', means: 'A value that belongs to one object, like this.x.' },
      { term: 'method', means: 'A function that belongs to an object, called with a dot, like .show() or .move().' },
      { term: 'new', means: 'Makes a fresh object from a class: new Critter().' },
    ],
  },
  c4: {
    build: 'A title screen and an ending screen for your game.',
    ideas: [
      { term: 'game state', means: 'Which screen the game is on: the title, playing, or the ending.' },
      { term: 'state variable', means: 'One variable that holds the state as a word, like "title" or "play".' },
      { term: '=== means "equals"', means: 'Compares two values. state === "play" is true only while playing.' },
      { term: 'mousePressed()', means: 'A function p5 runs once each time the mouse is clicked.' },
    ],
  },
  c5: {
    build: 'A leaderboard that sorts itself while you watch.',
    ideas: [
      { term: 'algorithm', means: 'A set of exact steps that solves a problem. Today it puts scores in order.' },
      { term: 'linear search', means: 'Looking at every item in turn to find the one you want.' },
      { term: 'swap', means: 'Trading the places of two items in a list.' },
      { term: 'selection sort', means: 'Find the best item left, swap it into place, and repeat.' },
      { term: 'efficiency', means: 'How much work an algorithm does. Doubling the list here makes about four times the work.' },
    ],
  },
  c6: {
    build: 'Your finished game, polished and published to the class Arcade.',
    ideas: [
      { term: 'polish', means: 'Small touches, like sparks and sound, that make a game feel good to play.' },
      { term: 'particles', means: 'Many tiny shapes that fly out and fade, like sparks.' },
      { term: 'plan', means: 'Writing down what a feature needs before you code it.' },
      { term: 'playtest', means: 'Watching someone else play your game to find what confuses them.' },
    ],
  },
  m1: {
    build: 'A bot that chases you by following rules you write.',
    ideas: [
      { term: 'rule-based AI', means: 'A program that looks smart because it follows if-rules a person wrote.' },
      { term: 'conditional', means: "An if statement. Each of the bot's rules is one." },
      { term: 'dist()', means: 'Gives the distance between two points, like the bot and the player.' },
      { term: 'limits of rules', means: 'Rules only cover what their writer thought of. Players find the gaps.' },
    ],
  },
  m2: {
    build: 'A chase game with coins to grab and a bot to dodge.',
    ideas: [
      { term: 'dist()', means: 'Gives the distance between two points. Use it to tell when two things touch.' },
      { term: 'boolean', means: 'A true or false variable. won and lost remember how the game ended.' },
      { term: 'win and lose', means: 'Rules that end the game. They give the player something to want and to fear.' },
      { term: 'fairness', means: 'A game is fair when a new player has a real chance to win.' },
    ],
  },
  m3: {
    build: 'A game you steer with gestures, using a model you train.',
    ideas: [
      { term: 'machine learning', means: 'Teaching a computer with examples instead of writing rules.' },
      { term: 'training data', means: 'The examples a model learns from. Better examples make a better model.' },
      { term: 'model', means: 'What training produces. It takes an input and gives its best guess.' },
      { term: 'classification', means: 'Sorting an input into one of a few named groups, like "left" or "up".' },
      { term: 'label', means: 'The name of the group the model picked.' },
    ],
  },
  m4: {
    build: 'A restart key, and scenery drawn by loops.',
    ideas: [
      { term: 'function', means: 'A named set of instructions. You write it once and call it whenever you need it.' },
      { term: 'resetGame()', means: 'Your function that puts every starting value back, so the game can begin again.' },
      { term: 'for loop', means: 'Repeats code a set number of times, changing one variable each time around.' },
      { term: '% (remainder)', means: 'What is left over after dividing. It wraps big numbers back onto the canvas.' },
    ],
  },
  m5: {
    build: 'A bot that remembers your moves and guesses your next one.',
    ideas: [
      { term: 'array', means: 'A list of values in order. Yours holds every memory the bot has saved.' },
      { term: 'object', means: 'Values bundled under one name. Each memory holds a position and a move.' },
      { term: 'nearest neighbor', means: 'Guessing by finding the saved example most like what is happening now.' },
      { term: 'prediction', means: 'A guess about what will happen, made from past data.' },
    ],
  },
  m6: {
    build: 'A neural network trained on how you play, tested against your bot.',
    ideas: [
      { term: 'neural network', means: 'A model that learns by adjusting many numbers until its guesses fit the examples.' },
      { term: 'training', means: 'Showing a model examples again and again so it improves.' },
      { term: 'accuracy', means: "How often a model's guesses are right." },
      { term: 'comparing algorithms', means: 'Testing two methods on the same job to see which does better.' },
    ],
  },
  m7: {
    build: 'A team of rival bots, some simple and some that learn.',
    ideas: [
      { term: 'class', means: 'A blueprint for making many objects that all work the same way.' },
      { term: 'method', means: 'A function that belongs to an object, called with a dot, like .update() or .show().' },
      { term: 'abstraction', means: 'Hiding the details inside something simple to use. You just call update().' },
      { term: 'array of objects', means: 'A list where every item is an object. Yours holds every rival.' },
    ],
  },
  m8: {
    build: 'A table that shows where your model gets things wrong.',
    ideas: [
      { term: 'accuracy', means: "How often a model's guesses are right. One number can hide a lot." },
      { term: 'confusion matrix', means: 'A table of what really happened against what the model guessed.' },
      { term: '2D array', means: 'A list of lists, read by row and then column.' },
      { term: 'bias', means: 'When a model works worse for some people or cases than for others.' },
    ],
  },
  d1: {
    build: 'A small house in a 3D world you can spin.',
    ideas: [
      { term: 'WEBGL', means: 'The p5 mode for drawing in 3D.' },
      { term: 'z axis', means: 'The third direction, toward you and away from you. x and y are still there.' },
      { term: 'translate()', means: 'Moves where the next shape will be drawn.' },
      { term: 'push() and pop()', means: 'push() saves your place and pop() returns to it, so one move does not shift everything.' },
    ],
  },
  d2: {
    build: 'A forest of low poly trees around your house.',
    ideas: [
      { term: 'low poly', means: '3D art made from few flat faces, with almost no detail.' },
      { term: 'face', means: 'One flat piece of a 3D shape. Fewer faces draw faster.' },
      { term: 'model', means: 'A 3D shape saved once and drawn again and again.' },
      { term: 'abstraction', means: 'Keeping the details that matter and leaving out the rest.' },
    ],
  },
  d3: {
    build: 'A hero you walk through your 3D world, with a camera that follows.',
    ideas: [
      { term: 'angle', means: 'Which way the hero is facing. Turning changes it.' },
      { term: 'sin() and cos()', means: 'Turn an angle into how far to move in x and in z.' },
      { term: 'camera()', means: 'Sets where the viewer stands and what they look at.' },
      { term: 'boundary', means: 'A limit on where the player can go, like the edge of the world.' },
    ],
  },
  d4: {
    build: 'Hills your code makes from a grid of numbers.',
    ideas: [
      { term: '2D array', means: 'A list of lists, read by row and then column. Yours holds a height for each spot.' },
      { term: 'nested loops', means: 'A loop inside a loop. Together they visit every square in the grid.' },
      { term: 'noise()', means: 'Gives numbers that change smoothly, so hills roll instead of jumping.' },
      { term: 'triangle mesh', means: 'A surface built from many triangles joined at their corners.' },
    ],
  },
  d5: {
    build: 'A treasure hunt across your hills, with a score and a timer.',
    ideas: [
      { term: 'class', means: 'A blueprint for making many objects. Every gem comes from your Gem class.' },
      { term: '3D distance', means: 'dist() with x, y, and z for both points. It tells when the hero touches a gem.' },
      { term: 'timer', means: 'A countdown that ends the game when it reaches 0.' },
      { term: 'game design', means: 'Choosing rules and goals that give players a reason to explore.' },
    ],
  },
  e1: {
    build: 'Sound effects for scoring, winning, and losing in your game.',
    ideas: [
      { term: 'sound effect', means: 'A short sound that tells the player something just happened.' },
      { term: 'state change', means: 'The moment a value becomes different, like the score going up.' },
      { term: 'play it once', means: 'Remember the old value and play only when it changes. If not, the sound repeats every frame.' },
      { term: 'feedback', means: 'How a game tells the player what their action did.' },
    ],
  },
  e2: {
    build: 'A theme song you compose, playing in your game.',
    ideas: [
      { term: 'beat', means: 'A steady pattern of drum hits that the rest of the music follows.' },
      { term: 'melody', means: 'The tune: the notes you would hum.' },
      { term: 'music as data', means: 'A song stored as text. Each word is a note and each . is silence.' },
      { term: 'tempo', means: 'How fast the music plays.' },
      { term: 'license', means: 'A note that tells others what they may do with your work.' },
    ],
  },
  e3: {
    build: 'Music that your code composes while the game runs.',
    ideas: [
      { term: 'frequency', means: 'How fast a sound vibrates. A bigger number is a higher note.' },
      { term: 'note', means: 'A named frequency. A4 is 440.' },
      { term: 'random walk', means: 'Moving up or down a little from the last value, instead of jumping anywhere.' },
      { term: 'bits', means: 'How many levels a sound can have. Fewer bits sound rougher, like old game consoles.' },
    ],
  },
};

/** { build, ideas } for a lesson, or null when nothing has been written for it yet. */
export const todayFor = (lessonId) => TODAY[lessonId] || null;
export const todayLessons = () => Object.keys(TODAY);
