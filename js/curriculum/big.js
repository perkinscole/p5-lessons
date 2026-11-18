// One big question per lesson: the idea that lasts after the code is forgotten. The class display
// shows it as the question of the day, so it should invite discussion, not have one right answer.
const REUSE = 'Why do programmers name a chunk of code and reuse it, instead of copying it?';

export const BIG_QUESTIONS = {
  t1: 'Why does a computer need such exact instructions, when a person could guess what you mean?',
  t2: 'Why does the order of instructions change the result?',
  t3: 'How does a program remember something that keeps changing?',
  t4: 'How can a program respond to the person using it?',
  t5: 'How do programs make decisions?',
  t6: 'What turns a drawing into a game?',

  p1: 'How can a few numbers pretend to be real-world physics?',
  p2: 'Why does a game check the same rules over and over, many times a second?',
  p3: 'What makes a challenge feel fair to a player?',
  p4: REUSE,
  p5: 'How can one set of instructions take care of many things at once?',
  p6: 'What can go wrong when you change something while you are still using it?',
  p7: 'Why do game makers store levels as data instead of as code?',
  p8: 'How can a computer make something new every time and still keep it playable?',

  a1: 'How does a game turn key presses into movement through a world?',
  a2: 'How does a computer know that two things have bumped into each other?',
  a3: 'How does a program remember what has already happened?',
  a4: REUSE,
  a5: 'How can one set of instructions take care of many things at once?',
  a6: 'What can go wrong when you change something while you are still using it?',
  a7: 'Why do game makers store levels as data instead of as code?',
  a8: 'How can a computer find the shortest way through a maze?',

  s1: 'How do tiny changes, many times a second, add up to smooth motion?',
  s2: 'How do things in a game get created, used, and cleaned up?',
  s3: 'How does a game decide when you have won or lost?',
  s4: REUSE,
  s5: 'How can a program keep track of many things that come and go?',
  s6: 'How can a few lines of code make a whole crowd move?',
  s7: 'How can describing a game as data make it easier to design and balance?',
  s8: 'How can we make a computer character seem like it has a plan?',

  m1: 'If a computer follows rules we wrote, is it really intelligent?',
  m2: 'How do clear rules for winning and losing make a game feel fair?',
  m3: 'How can a computer learn from examples instead of rules?',
  m4: REUSE,
  m5: 'How can remembering past examples help a computer make a good guess?',
  m6: 'When is it better to train a model than to write the rules yourself?',
  m7: 'How can different bots share one design but behave differently?',
  m8: 'Who could an AI model treat unfairly, and how would we know?',

  c1: 'How do big programs get built out of small, reusable pieces?',
  c2: 'How does a series of still pictures become motion?',
  c3: 'How can one blueprint make many objects that each act on their own?',
  c4: 'Why do programs need different modes, like a title screen and a game over?',
  c5: 'Why does the way you organize information decide how fast you can use it?',
  c6: 'How does feedback from real players make a game better?',

  e1: 'How does sound tell a player what just happened?',
  e2: 'Who owns music, and when can we use someone else\'s?',
  e3: 'How can numbers become a sound we can hear?',

  d1: 'How does a flat screen show a world with depth?',
  d2: 'How can simple shapes build something that looks complex?',
  d3: 'How does a game decide what you see as you move through it?',
  d4: 'How can a grid of numbers become a landscape?',
  d5: 'What makes exploring a world feel rewarding?',
};

export const bigQuestionFor = (id) => BIG_QUESTIONS[id] || '';
