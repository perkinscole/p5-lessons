// Which MA DLCS standards each lesson addresses.
//   anchor:  the lesson produces work a teacher can assess against this standard.
//   support: students meet or practice the idea here, but this lesson alone isn't evidence of it.
//   evidence: what a teacher would actually look at.
// A standard is only listed where the lesson's steps or reflection really do it.
import { STANDARDS } from './standards.js';

const CT = (s) => `6-8.CT.${s}`;
const DTC = (s) => `6-8.DTC.${s}`;
const CS = (s) => `6-8.CS.${s}`;
const CAS = (s) => `6-8.CAS.${s}`;

export const ALIGNMENT = {
  t1: { anchor: [CT('d.6')], support: [], evidence: 'Builds a character by guessing, running, and adjusting; breaks a line on purpose and reads the error.' },
  t2: { anchor: [], support: [CT('d.5'), CT('d.6')], evidence: 'Moves a line to see that order changes the result, then explains how the computer reads code. Foundational.' },
  t3: { anchor: [], support: [CT('b.2'), CT('d.4')], evidence: 'Reflection predicts what happens if the variable is created inside draw(). Foundational.' },
  t4: { anchor: [], support: [CT('b.2'), CT('d.4')], evidence: 'Output changes with mouse input; first if statement and expressions. Foundational.' },
  t5: { anchor: [CT('b.5')], support: [CT('b.1'), CT('b.2')], evidence: 'Writes all four wall checks, then fixes the check so the edge of the ball, not its center, is the boundary.' },
  t6: { anchor: [CT('b.1')], support: [CT('b.3'), CT('d.4'), CT('d.6')], evidence: 'A working game built from the draw loop, compound conditions, and a difficulty rule of the student\'s own.' },

  p1: { anchor: [CT('e.2')], support: [CT('e.1'), CT('d.6')], evidence: 'Changes gravity and jump values to explore the simulation, then explains how gravity, velocity, and position connect.' },
  p2: { anchor: [CT('b.1')], support: [CT('b.5'), CT('b.2')], evidence: 'Compound landing condition checked every frame; reflection predicts what breaks if one line is removed.' },
  p3: { anchor: [CT('d.6')], support: [CT('b.1'), CT('b.3')], evidence: 'Adjusts the level after a playtest by a neighbor, and reports what the playtester did.' },
  p4: { anchor: [CT('a.2'), CT('d.4')], support: [CT('b.1')], evidence: 'resetGame() is defined once and reused; the program now has loops, conditionals, expressions, variables, and functions.' },
  p5: { anchor: [CT('b.1')], support: [CT('a.1'), CT('d.4')], evidence: 'Loops over a list of platforms with a condition for each; platforms are described by their attributes.' },
  p6: { anchor: [CT('b.5')], support: [CT('b.1'), CT('d.5'), CT('a.2')], evidence: 'Removes items while looping and explains on paper why looping backward stays within correct bounds.' },
  p7: { anchor: [CT('d.2')], support: [CT('a.1'), CT('b.1'), CT('d.6')], evidence: 'Coin class and buildLevel() hide detail, so the level can be redesigned by changing only letters.' },
  p8: { anchor: [CT('d.3'), CT('b.5')], support: [CT('b.2'), CT('d.6')], evidence: 'Random-walk level generator; reflection tests what breaks when the constraints that keep jumps possible are removed.' },

  a1: { anchor: [CT('b.1')], support: [CT('b.5'), CT('d.4')], evidence: 'Movement and pond rules are conditionals repeated every frame; the map edge is handled with constrain().' },
  a2: { anchor: [CT('b.1')], support: [CT('b.2'), CT('b.5'), CT('d.6')], evidence: 'Four-part overlap check, a bug found and fixed (sticking to walls), and a reflection predicting the effect of changing && to ||.' },
  a3: { anchor: [CT('d.6')], support: [CT('b.1'), CT('b.3')], evidence: 'Moves walls until the puzzle works, and reports how a playtester handled it.' },
  a4: { anchor: [CT('a.2'), CT('d.4')], support: [CT('b.1')], evidence: 'resetGame() is defined once and reused; the program now has loops, conditionals, expressions, variables, and functions.' },
  a5: { anchor: [CT('d.2')], support: [CT('a.2'), CT('a.1'), CT('b.1')], evidence: 'hitsWall() hides a long overlap check so the bump code can be read aloud; reflection explains the benefit.' },
  a6: { anchor: [CT('b.5')], support: [CT('b.1'), CT('d.5'), CT('a.2')], evidence: 'Removes items while looping and explains on paper why looping backward stays within correct bounds.' },
  a7: { anchor: [CT('d.2')], support: [CT('a.1'), CT('b.1'), CT('d.6')], evidence: 'Gem class and buildMap() hide detail, so the map can be redesigned by changing only letters.' },
  a8: { anchor: [CT('d.3'), CT('b.5')], support: [CT('b.2'), CT('b.4'), CT('d.1')], evidence: 'Breadth-first search with an isOpen() boundary check; reflection tries .pop() in place of .shift() and compares.' },

  s1: { anchor: [CT('b.1')], support: [CT('b.5'), CT('d.4')], evidence: 'Flying controls are conditionals repeated every frame; the screen edge is handled with constrain().' },
  s2: { anchor: [CT('b.1')], support: [CT('b.5'), CT('b.2')], evidence: 'Bullet lifecycle uses a boolean and off-screen check; reflection predicts the effect of removing a condition.' },
  s3: { anchor: [CT('d.6')], support: [CT('b.1'), CT('b.3'), CT('b.5')], evidence: 'Tunes speeds and goals after a neighbor playtests the balance.' },
  s4: { anchor: [CT('a.2'), CT('d.4')], support: [CT('b.1')], evidence: 'resetGame() is defined once and reused; the program now has loops, conditionals, expressions, variables, and functions.' },
  s5: { anchor: [CT('b.5')], support: [CT('b.1'), CT('a.1')], evidence: 'Removes bullets while looping backward, and explains why bullets must leave the list.' },
  s6: { anchor: [CT('b.1')], support: [CT('a.2'), CT('b.2'), CT('d.5')], evidence: 'Nested loops test every bullet against every enemy; reflection counts the checks per frame for given inputs.' },
  s7: { anchor: [CT('d.2')], support: [CT('a.1'), CT('b.1'), CT('d.6')], evidence: 'Enemy class hides behavior; waves are described by attributes in a list the student extends.' },
  s8: { anchor: [CT('d.3')], support: [CT('d.2'), CT('b.1'), CT('b.5')], evidence: 'Finite state machine and aiming; student diagrams the states and what causes each switch.' },

  m1: { anchor: [CT('b.1'), CS('b.1')], support: [CT('d.4'), CT('d.6')], evidence: 'Writes the rules that drive a bot, finds where they fail, and explains what is easy for people versus computers.' },
  m2: { anchor: [CT('d.6')], support: [CT('b.1'), CT('b.3'), CT('b.5')], evidence: 'Tunes the game after a neighbor playtests it, and names a rule the playtest revealed.' },
  m3: { anchor: [CT('e.1'), CS('b.2')], support: [CS('b.1'), CT('b.1'), DTC('a.1')], evidence: 'Trains a model and tests it on another person; explains what it noticed or ignored, and what only the human could do.' },
  m4: { anchor: [CT('a.2'), CT('d.4')], support: [CT('b.1')], evidence: 'resetGame() is defined once and reused; the program now has loops, conditionals, expressions, variables, and functions.' },
  m5: { anchor: [CT('d.3'), CT('a.1')], support: [CT('b.1'), CT('b.5')], evidence: 'Writes nearest neighbor; reflection names the attributes recorded and left out of each memory.' },
  m6: { anchor: [CT('b.4'), CT('d.1')], support: [CT('d.3'), CT('b.2')], evidence: 'Predicts, then measures, how often two algorithms guess correctly on the same data, and weighs their trade-offs.' },
  m7: { anchor: [CT('d.2')], support: [CT('a.1'), CT('b.1')], evidence: 'Bot class hides behavior; compares rule-based and learning bots when the player changes habits.' },
  m8: { anchor: [CAS('c.1')], support: [CAS('c.4'), CT('b.1'), CT('d.3')], evidence: 'Builds a confusion table, tests on another person, and argues who could be harmed if such a model made real decisions.' },

  c1: { anchor: [CT('a.2')], support: [CT('d.2'), CT('d.4')], evidence: 'Writes a function with parameters, reuses it, then writes a second function of their own.' },
  c2: { anchor: [DTC('a.3'), CT('d.2')], support: [DTC('a.4')], evidence: 'Brings a PNG sprite sheet into a program; drawPlayer() hides the drawing detail.' },
  c3: { anchor: [CT('a.1')], support: [CT('d.2'), CT('b.1')], evidence: 'Chooses a new property for a class; reflection lists the properties and methods for something in their own game.' },
  c4: { anchor: [CT('d.2')], support: [CT('b.3'), CT('b.1')], evidence: 'draw() becomes a controller that hides each game state behind a function.' },
  c5: { anchor: [CT('d.3'), CT('b.2')], support: [CT('b.4'), CT('d.1'), CT('c.4')], evidence: 'Writes selection sort, predicts comparisons for 32 bars, tests the prediction, and explains the growth.' },
  c6: { anchor: [CT('d.4'), CT('d.6'), DTC('b.1')], support: [CT('b.3'), DTC('a.4')], evidence: 'Complete game using all required constructs, revised after a cross-road playtest, and published to the class.' },

  e1: { anchor: [CT('b.1')], support: [CT('b.2'), CT('d.6')], evidence: 'Uses conditionals to detect the moment a value changes; predicts and tests what happens without the if; revises the game so it still works with sound off.' },
  e2: { anchor: [DTC('a.4'), CAS('b.9')], support: [CAS('b.1'), DTC('a.2'), CT('a.1')], evidence: 'Composes an original theme and brings it into a game; licenses it; explains why a pop song can\'t be published in a game, and what an MP3 stores that the song text does not.' },
  e3: { anchor: [CT('d.3'), CT('b.4')], support: [CT('d.1'), CT('c.2'), CT('b.1')], evidence: 'Implements and compares two melody algorithms with a listener; explains how the number of bits changes stored sound.' },

  d1: { anchor: [CT('b.2')], support: [CT('d.5'), CT('d.6')], evidence: 'Predicts where shapes land from x, y, z and transformation order; explains what happens without pop().' },
  d2: { anchor: [CT('e.1'), CT('d.2')], support: [CT('a.2'), CT('b.1')], evidence: 'Models a tree in a few flat faces, reuses it with a loop, and explains which details were kept or left out.' },
  d3: { anchor: [CT('b.5')], support: [CT('b.1'), CT('b.2')], evidence: 'Keeps the player inside the world and out of the house; predicts sin and cos for a heading and tests the prediction.' },
  d4: { anchor: [CT('d.3'), CT('e.1')], support: [CT('b.1'), CT('a.2')], evidence: 'Implements terrain generation with a 2D array and nested loops; explains what the terrain model leaves out and when that matters.' },
  d5: { anchor: [CT('d.4'), CT('d.6')], support: [CT('a.1'), CT('b.3')], evidence: 'Complete 3D game with a class, loops, conditionals, variables, and functions, revised after a neighbor plays it.' },
};

export const alignmentFor = (lessonId) => ALIGNMENT[lessonId] || { anchor: [], support: [], evidence: '' };
export const standardByCode = (code) => STANDARDS.find((s) => s.code === code);

/** For each standard, the lessons that anchor or support it. */
export function coverage() {
  return STANDARDS.map((s) => {
    const anchor = [];
    const support = [];
    for (const [id, a] of Object.entries(ALIGNMENT)) {
      if (a.anchor.includes(s.code)) anchor.push(id);
      if (a.support.includes(s.code)) support.push(id);
    }
    return { ...s, anchor, support };
  });
}
