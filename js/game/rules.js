// Points, ranks, and badges. All derived from a student's record, never stored,
// so changing a rule here updates every student. Grades are deliberately NOT an input:
// everything here is visible to classmates, and grades must stay private.

export const XP = { submit: 50, submitUnchecked: 25, approved: 50, stretch: 10, award: 25 };

export const RANKS = [
  { name: 'Spark', xp: 0 },
  { name: 'Doodler', xp: 100 },
  { name: 'Tinkerer', xp: 300 },
  { name: 'Coder', xp: 600 },
  { name: 'Builder', xp: 1000 },
  { name: 'Engineer', xp: 1400 },
  { name: 'Architect', xp: 1800 },
  { name: 'Game Master', xp: 2300 },
];

const ROAD = { platformer: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], adventure: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'], arcade: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'], mind: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'] };

const any = (...ids) => (r) => ids.some((id) => r.done.has(id));
const all = (ids) => (r) => ids.every((id) => r.done.has(id));

export const BADGES = [
  { id: 'first-draw', icon: '🎨', name: 'First Canvas', desc: 'Finished your first lesson', earned: any('t1') },
  { id: 'memory', icon: '🧠', name: 'Total Recall', desc: 'Learned variables', earned: any('t3') },
  { id: 'decider', icon: '🔀', name: 'The Decider', desc: 'Learned conditionals', earned: any('t5') },
  { id: 'first-game', icon: '⭐', name: 'Game Maker', desc: 'Finished your first full game', earned: any('t6') },
  { id: 'trailblazer', icon: '🥾', name: 'Trailblazer', desc: 'Chose your own road', earned: (r) => !!r.path },
  { id: 'function', icon: '🪄', name: 'Spell Caster', desc: 'Wrote your own functions', earned: any('c1') },
  { id: 'artist', icon: '🖌️', name: 'Pixel Artist', desc: 'Put your own sprite in your game', earned: any('c2') },
  { id: 'loops', icon: '🔁', name: 'Loop Master', desc: 'Used for loops in your game', earned: any('p4', 'a4', 's4', 'm4') },
  { id: 'arrays', icon: '📚', name: 'List Keeper', desc: 'Used arrays and objects', earned: any('p5', 'a5', 's5', 'm5') },
  { id: 'classes', icon: '🏛️', name: 'Blueprint', desc: 'Wrote your own class', earned: any('c3') },
  { id: 'states', icon: '🎬', name: 'The Director', desc: 'Added title and ending screens', earned: any('c4') },
  { id: 'algorithm', icon: '🧩', name: 'Algorithmist', desc: 'Wrote your first real algorithm', earned: any('p8', 'a8', 's8', 'm5', 'c5') },
  { id: 'sorter', icon: '📊', name: 'The Sorter', desc: 'Wrote a sorting algorithm', earned: any('c5') },
  { id: 'high-road', icon: '⛰️', name: 'High Road Hero', desc: 'Finished every High Road lesson', earned: all(ROAD.platformer) },
  { id: 'wild-road', icon: '🌲', name: 'Wild Road Hero', desc: 'Finished every Wild Road lesson', earned: all(ROAD.adventure) },
  { id: 'star-road', icon: '🚀', name: 'Star Road Hero', desc: 'Finished every Star Road lesson', earned: all(ROAD.arcade) },
  { id: 'mind-road', icon: '🤖', name: 'Mind Road Hero', desc: 'Finished every Mind Road lesson', earned: all(ROAD.mind) },
  { id: 'trainer', icon: '📷', name: 'Model Trainer', desc: 'Trained a machine learning model', earned: any('m3') },
  { id: 'beyond', icon: '🌌', name: 'Beyond the Summit', desc: 'Kept going after the Summit', earned: any('p6', 'a6', 's6', 'm6') },
  { id: 'summit', icon: '🏔️', name: 'Summit!', desc: 'Reached the end of the trail', earned: any('c6') },
  { id: 'stretch-5', icon: '💪', name: 'Stretching Out', desc: 'Finished 5 stretch goals', earned: (r) => r.stretch >= 5 },
  { id: 'stretch-20', icon: '🏋️', name: 'Going Further', desc: 'Finished 20 stretch goals', earned: (r) => r.stretch >= 20 },
  { id: 'shared-sprite', icon: '🎁', name: 'Sprite Sharer', desc: 'Shared a sprite with your class', earned: (r) => r.spritesShared > 0 },
  { id: 'published', icon: '🕹️', name: 'Published', desc: 'Shared a game in the Arcade', earned: (r) => r.shared > 0 },
];

/** Badges only a teacher can hand out, for things code can't detect. */
export const TEACHER_BADGES = [
  { id: 'helper', icon: '🤝', name: 'Helping Hand', desc: 'Helped a classmate get unstuck' },
  { id: 'debugger', icon: '🔍', name: 'Bug Detective', desc: 'Tracked down a tricky bug' },
  { id: 'creative', icon: '✨', name: 'Bright Idea', desc: 'Did something creative and surprising' },
  { id: 'persistent', icon: '🧗', name: 'Never Quit', desc: 'Kept going when it got hard' },
  { id: 'teamwork', icon: '🎮', name: 'Great Playtester', desc: 'Gave useful, kind feedback' },
];

export const badgeById = (id) => BADGES.find((b) => b.id === id) || TEACHER_BADGES.find((b) => b.id === id);

/** Turn a student's record into XP, rank, and badges. `s` comes from classBoard(). */
export function statsFor(s) {
  const works = s.works || [];
  const done = new Set(works.filter((w) => w.status === 'submitted' || w.status === 'approved' || w.status === 'returned').map((w) => w.lesson_id));
  let xp = 0;
  let stretch = 0;
  for (const w of works) {
    if (w.status === 'in_progress') continue;
    xp += w.auto_ok ? XP.submit : XP.submitUnchecked;
    if (w.status === 'approved') xp += XP.approved;
    const n = Math.min(w.stretch_done || 0, 3);
    xp += n * XP.stretch;
    stretch += n;
  }
  const awards = s.awards || [];
  xp += awards.length * XP.award;
  const record = { done, path: s.path, stretch, spritesShared: s.sprites_shared || 0, shared: works.filter((w) => w.shared).length };
  const earned = BADGES.filter((b) => b.earned(record)).map((b) => b.id);
  const awarded = awards.map((a) => a.badge_id);
  let rankIndex = 0;
  RANKS.forEach((r, i) => { if (xp >= r.xp) rankIndex = i; });
  const rank = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] || null;
  return {
    xp, rank, rankIndex, next, done,
    badges: [...new Set([...earned, ...awarded])],
    toNext: next ? (xp - rank.xp) / (next.xp - rank.xp) : 1,
  };
}

/** Lessons completed for gating progress. "returned" still counts: students keep moving. */
export const isDone = (w) => w && w.status !== 'in_progress';
