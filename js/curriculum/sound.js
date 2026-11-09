// Beyond the Summit: Sound. The first two lessons add audio to the student's own game, using only
// names every road shares. The third starts fresh and composes with an algorithm.
import { lesson } from './engine.js';

lesson({
  id: 'e1', title: 'Make Some Noise', mins: 35, concepts: ['sound effects', 'state changes', 'player feedback'],
  hook: 'Turn the sound off in your favorite game and it feels broken. Today your game finds its voice.',
  steps: [
    {
      title: 'Listen first', mins: 4, action: 'sounds',
      say: 'Press **Open Sounds** and listen. Pick one sound for scoring points and one for winning.',
    },
    {
      title: 'Play it once', mins: 8,
      say: 'Your game loop runs 60 times a second, so a sound needs a moment to happen **once**. Comparing `score` to last frame finds that moment. Add the variable at the top, and the check above `// score and messages`.',
      edits: [
        { code: 'let scoreBefore = 0;\nlet overBefore = false;', at: { top: true } },
        { code: `  // sound effects
  if (score > scoreBefore) {
    playSound("coin");
  }
  scoreBefore = score;
`, at: { before: '// score and messages' } },
      ],
      check: /score\s*>\s*scoreBefore/,
    },
    {
      title: 'Break it on purpose', mins: 3,
      say: 'Predict what happens if you remove the `if` and keep only `playSound`. Try it, then put the `if` back.',
    },
    {
      title: 'Win and lose', mins: 8,
      reveal: true,
      say: 'Play a win or lose sound **one time** when the game ends. Use `overBefore` the same way you used `scoreBefore`, and remember to update it every frame.',
      code: `  if ((won || lost) && !overBefore) {
    if (won) {
      playSound("win");
    } else {
      playSound("lose");
    }
  }
  overBefore = won || lost;`,
      at: { after: 'scoreBefore = score;' },
      check: /!\s*overBefore/,
      hint: 'The game just ended if it is over now, and it was not over last frame.',
    },
    {
      title: 'A sound for your road', mins: 8,
      say: 'Find the line where your hero does something big, like jumping, firing, or opening a door. Add a `playSound` there. The **Sounds** button at the top can add the line for you.',
    },
    {
      title: 'Test with sound off', mins: 4,
      say: 'Some players can\'t hear your game. Open **Display**, turn game sound off, and play. Change anything that now only makes sense with sound.',
    },
  ],
  stretch: ['Make the pitch rise with each point using `playNote`.', 'Add a warning sound when the player is almost out of time or lives.', 'Add footsteps that play every 15 frames while the player moves.'],
  reflect: 'Why does a sound in your game loop need an `if`? Which of your sounds tells the player something they could not see?',
});

lesson({
  id: 'e2', title: 'Write a Theme Song', mins: 40, concepts: ['composing', 'music as data', 'copyright and licensing'],
  hook: 'Every great game has a tune you can hum. Today you write yours, and you own it.',
  steps: [
    {
      title: 'Lay down a beat', mins: 6, action: 'music',
      say: 'Press **Open Music Maker**. Start with the drums: put a Kick on steps 1 and 9, and a Snare on steps 5 and 13. Press Play.',
    },
    {
      title: 'Write a melody', mins: 8, action: 'music',
      say: 'Add bass, then a melody. Every note in a Mood fits with the others, so experiment. Leave some empty squares, because silence is part of music. Name it `theme`, and press **Add to my game**.',
    },
    {
      title: 'Bring it in', mins: 5,
      say: 'If you do not have a `theme.js` file yet, press **Add the finished file** for a starter tune. You can replace it with your own any time.',
      provides: { name: 'theme.js', code: `let theme = {
  tempo: 132,
  lead: "E5 . G5 A5 . G5 E5 . D5 . E5 G5 . E5 C5 .",
  bass: "C3 . C3 . G3 . G3 . A3 . A3 . G3 . G3 .",
  drums: "k . h . s . h . k . h . s . h h",
};
` },
    },
    {
      title: 'Start the music', mins: 6,
      say: '`resetGame` runs when a new round begins, so it is the right place to start. Add this at the end of `resetGame`.',
      code: '  playMusic(theme);',
      at: { endOf: 'function resetGame' },
      check: /playMusic\s*\(\s*theme/,
    },
    {
      title: 'Stop when it is over', mins: 5,
      reveal: true,
      say: 'The music keeps going after the game ends. Find where you play the win or lose sound, and stop the music there with `stopMusic()`.',
      code: '    stopMusic();',
      at: { after: 'if ((won || lost) && !overBefore) {' },
      check: /stopMusic\s*\(/,
      hint: 'It belongs inside the same if as your win and lose sounds.',
    },
    {
      title: 'Read your song', mins: 5,
      say: 'Open `theme.js`. Your song is just text: each word is one step, and `.` is silence. Change `tempo`, and change one note. Run it.',
    },
    {
      title: 'Whose music is it?', mins: 5,
      say: 'You wrote this, so you hold its copyright. Add a comment at the top of `theme.js` with your name and a license, like `// Theme by Sam. CC BY 4.0`.',
    },
  ],
  stretch: ['Write a second song for your title screen.', 'Make the music speed up when time is almost out.', 'Share your song with the class from the Sound Studio.'],
  reflect: 'Your song is a few lines of text, while an MP3 of it would be far larger. What does an MP3 store that your file does not? Why can\'t you just put your favorite pop song in a game you publish?',
});

lesson({
  id: 'e3', title: 'Music From Code', mins: 40, concepts: ['frequency', 'algorithms', 'digital audio'],
  hook: 'Some games never play the same tune twice, because code composes it. Today yours does too.',
  starter: `let notes = ["C4", "D4", "E4", "G4", "A4", "C5"];
let playing = false;
let heard = [];

function setup() {
  createCanvas(400, 400);
  noStroke();
  textSize(16);
}

function draw() {
  background(24, 22, 56);
  fill(255);
  text("Click to start", 20, 30);
  // music goes here
}
`,
  steps: [
    {
      title: 'One note', mins: 5,
      say: 'Browsers only allow sound after a click or key press. Add this at the bottom, then click the game.',
      code: `function mousePressed() {
  playNote("C4", 0.3);
  playing = true;
}`,
      at: { end: true },
      check: /playNote\s*\(/,
    },
    {
      title: 'A note is a number', mins: 5,
      say: 'A pitch is how many times the air shakes each second. Change `"C4"` to `440`, click, then try `880`. Doubling the number gives the same note, one octave higher.',
      code: 'playNote(880, 0.3);',
      at: { replace: 'playNote("C4", 0.3);' },
      check: /playNote\s*\(\s*\d+/,
    },
    {
      title: 'Pick from a list', mins: 7,
      say: 'A scale is a list, so `random` can choose from it. `%` keeps a steady beat. Add this below `// music goes here`.',
      code: `  if (playing && frameCount % 15 === 0) {
    let spot = floor(random(notes.length));
    playNote(notes[spot], 0.2);
    heard.push(spot);
  }`,
      at: { after: '// music goes here' },
      check: /heard\s*\.\s*push/,
    },
    {
      title: 'Draw what you hear', mins: 6,
      say: 'Your list remembers every note, so you can draw the melody. Add this at the end of `draw()`.',
      code: `  for (let i = 0; i < heard.length; i = i + 1) {
    fill(110, 200, 255);
    rect(i * 8, 340 - heard[i] * 40, 7, 20);
  }
  if (heard.length > 49) {
    heard.shift();
  }`,
      at: { endOf: 'function draw' },
      check: /heard\.length/,
    },
    {
      title: 'A smarter melody', mins: 8,
      reveal: true,
      say: 'Random jumps sound messy, because real tunes mostly move to nearby notes. Keep a `walk` variable outside `draw`, move it up or down by at most 1, and use `constrain` to stay on the list.',
      edits: [
        { code: 'let walk = 2;', at: { after: 'let heard = [];' } },
        { code: `walk = constrain(walk + floor(random(-1, 2)), 0, notes.length - 1);
    let spot = walk;`, at: { replace: 'let spot = floor(random(notes.length));' } },
      ],
      check: /constrain\s*\(/,
      hint: '`floor(random(-1, 2))` gives -1, 0, or 1.',
    },
    {
      title: 'Which sounds better?', mins: 4,
      say: 'Two algorithms solved the same problem. Have a neighbor listen to each with eyes closed, and write down which one they prefer and why.',
    },
    {
      title: 'What does 8-bit mean?', mins: 5,
      say: 'Computers store sound as a list of numbers. With 8 bits, each number has only 256 choices. Add this at the end of `draw()`, then change `bits` to 1, 2, and 8.',
      code: `  let bits = 2;
  let levels = pow(2, bits) - 1;
  fill(255, 210, 90);
  for (let x = 0; x < 400; x = x + 4) {
    let wave = (sin(x * 0.05) + 1) / 2;
    let stored = round(wave * levels) / levels;
    rect(x, 180 - stored * 90, 4, 4);
  }`,
      at: { endOf: 'function draw' },
      check: /pow\s*\(\s*2\s*,\s*bits/,
    },
  ],
  stretch: ['Add a second voice that plays a bass note every four beats.', 'Let the mouse position choose the scale.', 'Use the arrow keys to play your list like an instrument.'],
  reflect: 'Your random walk and the pure random picker both made music. Which did you prefer, and how would you measure "better"? Why does using fewer bits make a sound rougher?',
});
