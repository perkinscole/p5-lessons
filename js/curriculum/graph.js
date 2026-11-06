// The shape of the journey: one trunk that forks into three roads, which meet again
// at each Crossing and split again, up to one shared Summit.
import './trunk.js';
import './platformer.js';
import './adventure.js';
import './arcade.js';
import './crossings.js';
import { getLesson, setPreviousResolver } from './engine.js';

export const PATHS = {
  platformer: { id: 'platformer', road: 'The High Road', genre: 'Platformer', color: 'var(--road-high)', blurb: 'Run, jump, and climb. You will write gravity, level maps, and a generator that invents endless levels.', algo: 'Procedural generation' },
  adventure: { id: 'adventure', road: 'The Wild Road', genre: 'Top-down adventure', color: 'var(--road-wild)', blurb: 'Explore mazes, unlock doors, and hunt treasure. You will write collision, tile maps, and an enemy that finds its way to you.', algo: 'Pathfinding (BFS)' },
  arcade: { id: 'arcade', road: 'The Star Road', genre: 'Arcade shooter', color: 'var(--road-star)', blurb: 'Fly, fire, and survive. You will write swarms, waves as data, and a boss that thinks with a state machine.', algo: 'State machines' },
};
export const PATH_IDS = Object.keys(PATHS);

// Each stage is either shared (lessons) or split by road (branches, same concepts on each).
export const STAGES = [
  { id: 'camp', name: 'Base Camp', kind: 'shared', theme: 'First steps: shapes, variables, input, and decisions', lessons: ['t1', 't2', 't3', 't4', 't5', 't6'] },
  { id: 'fork1', name: 'First Fork', kind: 'branch', theme: 'Movement, collision, and win or lose', branches: { platformer: ['p1', 'p2', 'p3'], adventure: ['a1', 'a2', 'a3'], arcade: ['s1', 's2', 's3'] } },
  { id: 'cross1', name: 'First Crossing', kind: 'shared', theme: 'Functions and sprites', lessons: ['c1', 'c2'] },
  { id: 'fork2', name: 'Second Fork', kind: 'branch', theme: 'Loops, arrays, and objects', branches: { platformer: ['p4', 'p5', 'p6'], adventure: ['a4', 'a5', 'a6'], arcade: ['s4', 's5', 's6'] } },
  { id: 'cross2', name: 'Second Crossing', kind: 'shared', theme: 'Classes and game states', lessons: ['c3', 'c4'] },
  { id: 'fork3', name: 'Third Fork', kind: 'branch', theme: 'Data structures and your first algorithm', branches: { platformer: ['p7', 'p8'], adventure: ['a7', 'a8'], arcade: ['s7', 's8'] } },
  { id: 'cross3', name: 'Last Crossing', kind: 'shared', theme: 'Searching and sorting', lessons: ['c5'] },
  { id: 'summit', name: 'The Summit', kind: 'shared', theme: 'Polish and publish', lessons: ['c6'] },
];

const TRUNK_END = 't6';

/** All lessons in order for a road. With no road chosen, ends at the fork. */
export function sequence(path) {
  const out = [];
  for (const st of STAGES) {
    if (st.kind === 'shared') out.push(...st.lessons);
    else if (path) out.push(...st.branches[path]);
    else break;
  }
  return out;
}

/** Lessons in these stages or with a `path` extend the student's own game. */
const GAME_SHARED = new Set(['c2', 'c4', 'c6']);
const isGameLesson = (id) => GAME_SHARED.has(id) || !!getLesson(id).path;

/** The lesson whose code this one carries forward, or null if it starts fresh. */
export function previousGameLesson(id, path) {
  const l = getLesson(id);
  if (l.starter !== undefined) return null;
  const seq = sequence(path || l.path || 'platformer');
  const i = seq.indexOf(id);
  for (let j = i - 1; j >= 0; j--) if (isGameLesson(seq[j])) return seq[j];
  return null;
}
setPreviousResolver(previousGameLesson);

export const needsPathChoice = (doneIds, path) => !path && doneIds.has(TRUNK_END);

/** Status of each lesson on a road: done, current, or locked. */
export function lessonStates(path, doneIds) {
  const seq = sequence(path);
  const states = {};
  let open = true;
  for (const id of seq) {
    if (doneIds.has(id)) states[id] = 'done';
    else if (open) { states[id] = 'current'; open = false; } else states[id] = 'locked';
  }
  return states;
}

export function currentLesson(path, doneIds) {
  return sequence(path).find((id) => !doneIds.has(id)) || null;
}

/** Which stage a lesson sits in. */
export function stageOf(id) {
  return STAGES.find((st) => (st.kind === 'shared' ? st.lessons.includes(id) : Object.values(st.branches).some((b) => b.includes(id))));
}

/** Map layout: each lesson gets a column (left to right) and a lane (-1, 0, +1). */
export function mapLayout() {
  const nodes = [];
  const edges = [];
  const LANES = { platformer: -1, adventure: 0, arcade: 1 };
  let col = 0;
  let tails = [];
  for (const st of STAGES) {
    if (st.kind === 'shared') {
      for (const id of st.lessons) {
        nodes.push({ id, col, lane: 0, stage: st.id });
        for (const t of tails) edges.push({ from: t.id, to: id, path: t.path || null });
        tails = [{ id }];
        col++;
      }
    } else {
      const startCol = col;
      const heads = tails;
      const nextTails = [];
      let maxLen = 0;
      for (const p of PATH_IDS) {
        const ids = st.branches[p];
        maxLen = Math.max(maxLen, ids.length);
        ids.forEach((id, i) => {
          nodes.push({ id, col: startCol + i, lane: LANES[p], stage: st.id, path: p });
          if (i === 0) for (const h of heads) edges.push({ from: h.id, to: id, path: p });
          else edges.push({ from: ids[i - 1], to: id, path: p });
        });
        nextTails.push({ id: ids[ids.length - 1], path: p });
      }
      col = startCol + maxLen;
      tails = nextTails;
    }
  }
  return { nodes, edges, cols: col };
}
