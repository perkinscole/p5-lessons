// The one short instruction students see for a step, where it needs saying by hand.
// Anything longer stays folded under "Why?".
import { getLesson } from './engine.js';

const RESET = 'Write a function called `resetGame` at the bottom that puts every starting value back.';

const BRIEFS = {
  't2/Make it yours': 'Add at least **two new features**, and make this monster your own.',
  't3/Why draw() matters': '`setup()` runs once. `draw()` runs 60 times a second. Press Run and watch.',
  't5/Bounce off the right wall': 'Flip the direction when the ball passes the right wall.',
  't5/All four walls': 'Write the other three wall checks yourself.',
  't6/Send another star': 'Send the star back to the top when it passes the bottom.',
  't6/Did we catch it?': 'Add a check for catching the star. Use `&&`, which means **and**.',
  'p1/Land on the ground': 'Stop the player at the ground.',
  'p3/Add a spike': 'Add a spike. Touching it sets `lost`.',
  'p3/Plant the flag': 'Add a flag that only counts once the coin is taken.',
  'p4/Write a resetGame function': RESET,
  'p6/Build the coin list': 'Replace the coin variables with a list called `coins`, filled by a function called `makeCoins()`.',
  'p6/Spread them out': 'Place at least **six** coins, and show how many are left.',
  'p7/A Coin class': 'Write a class called `Coin`, with `show()` and `touches()` methods.',
  'p8/Add a camera': 'Add a camera that follows the player.',
  'p8/Follow the ground': 'Start the ground loop at the camera, snapped to the tile grid with `floor`.',
  'a1/A speed variable': 'Add a variable for the speed.',
  'a2/Remember where you were': 'Save the player\'s position before they move.',
  'a4/Write a resetGame function': RESET,
  'a4/Loop with math': 'Use a for loop to scatter 40 flowers. Try `(i * 97) % 400` for `x`.',
  'a5/Use your helper': 'Replace your bump check so it uses `hitsWall`, one direction at a time.',
  'a7/A Gem class': 'Write a class called `Gem`, with `show()` and `touches()` methods.',
  's1/Stay on the screen': 'Keep the ship on the screen with `constrain`.',
  's2/Pull the trigger': 'Fire a bullet when the player presses space.',
  's2/Count your shots': 'Count your shots, and show the number on screen.',
  's3/Did the bullet hit?': 'Check whether the bullet hit the enemy, using `dist`.',
  's3/Win and lose': 'Add the rules for winning and losing.',
  's4/Write a resetGame function': RESET,
  's4/A scrolling starfield': 'Draw 50 stars with a for loop. Add `frameCount` to `y` to make them move.',
  's5/Check every bullet': 'Rewrite the hit test as a loop over `bullets`.',
  's6/Build a formation': 'Replace the enemy variables with a list called `enemies`, built by `makeEnemies()`.',
  's6/March them all': 'Replace the enemy block with a backward loop over `enemies`. End it with `// HIT CHECK GOES HERE`.',
  's7/An Enemy class': 'Write a class called `Enemy`, with `update()` and `show()` methods.',
  's7/Read the data': 'Make `makeEnemies` read the current wave from your list.',
  's7/Write your own waves': 'Add your own waves, and show the wave number.',
  'c2/Make your sprite': 'Open **Sprites**, draw your hero, and name it exactly `hero`.',
  'c3/Click to add': 'Add a critter wherever the player clicks.',
  'c4/Rename your game loop': 'Rename `draw()` to `playGame`. It will stop working for a moment.',
  'c4/Click to change state': 'Start a fresh round when the player clicks.',
  'c4/Decorate your screens': 'Change "MY GAME" to your real title, and draw your hero on it.',
  'c5/Search for the best': 'Press **Add the starter code**, then finish the TODO.',
  'c6/Name it for real': 'Change MY GAME to your game\'s real name.',
  'c6/Your polish list': 'Pick **two** ways to polish your game. Open "Why?" for ideas.',
  'm1/Stay in the arena': 'Keep the player in the arena with `constrain`.',
  'm2/Playtest for fairness': 'Have a neighbor play with no hints, then adjust `botSpeed`.',
  'm4/Write a resetGame function': RESET,
  'm4/Loop with math': 'Use a for loop to scatter 40 floor dots. Try `(i * 97) % 400` for `x`.',
  'm6/Two ways to learn': 'Predict which will guess your moves better, and write down why.',
  'm6/Keep score for both': 'Count how often each algorithm guesses your move correctly.',
  'm7/A Bot class': 'Write a class called `Bot`, with `update()` and `show()` methods.',
  'm7/Fix the restart': 'In `resetGame`, empty `rivals` and build them again.',
  'm8/Accuracy can hide things': 'Talk with a partner: can a model be 95% accurate and still be unfair?',
};

for (const [key, brief] of Object.entries(BRIEFS)) {
  const [id, title] = key.split('/');
  const step = getLesson(id)?.steps.find((s) => s.title === title);
  if (!step) throw new Error(`No step for brief: ${key}`);
  step.brief = brief;
}
