// The shape of the journey: one trunk that forks into three roads, which meet again
// at each Crossing and split again, up to one shared Summit.
import './trunk.js';
import './platformer.js';
import './adventure.js';
import './arcade.js';
import './crossings.js';
import './mind.js';
import './lowpoly.js';
import './sound.js';
import './briefs.js';
import { getLesson, setPreviousResolver } from './engine.js';

export const PATHS = {
  platformer: { id: 'platformer', road: 'The High Road', genre: 'Platformer', color: 'var(--road-high)', blurb: 'Run, jump, and climb. You will write gravity, level maps, and a generator that invents endless levels.', algo: 'Procedural generation' },
  adventure: { id: 'adventure', road: 'The Wild Road', genre: 'Top-down adventure', color: 'var(--road-wild)', blurb: 'Explore mazes, unlock doors, and hunt treasure. You will write collision, tile maps, and an enemy that finds its way to you.', algo: 'Pathfinding (BFS)' },
  arcade: { id: 'arcade', road: 'The Star Road', genre: 'Arcade shooter', color: 'var(--road-star)', blurb: 'Fly, fire, and survive. You will write swarms, waves as data, and a boss that thinks with a state machine.', algo: 'State machines' },
  mind: { id: 'mind', road: 'The Mind Road', genre: 'AI game', color: 'var(--road-mind)', blurb: 'Build a game that learns. You will train a model to read your gestures with Teachable Machine, then write the algorithm that lets a bot predict your moves.', algo: 'Nearest neighbor and neural networks' },
};
export const PATH_IDS = Object.keys(PATHS);

// Each stage is either shared (lessons) or split by road (branches, same concepts on each).
// The core is the term-length trail. Stages marked beyond are for students who finish early.
export const STAGES = [
  { id: 'camp', name: 'Base Camp', kind: 'shared', theme: 'First steps: shapes, variables, input, and decisions', lessons: ['t1', 't3', 't4', 't5', 't6'] },
  { id: 'fork1', name: 'First Fork', kind: 'branch', theme: 'Movement, collision, and win or lose', branches: { platformer: ['p1', 'p2', 'p3'], adventure: ['a1', 'a2', 'a3'], arcade: ['s1', 's2', 's3'], mind: ['m1', 'm2', 'm3'] } },
  { id: 'cross1', name: 'First Crossing', kind: 'shared', theme: 'Functions and sprites', lessons: ['c1', 'c2'] },
  { id: 'fork2', name: 'Second Fork', kind: 'branch', theme: 'Loops, arrays, and objects', branches: { platformer: ['p4', 'p5'], adventure: ['a4', 'a5'], arcade: ['s4', 's5'], mind: ['m4', 'm5'] } },
  { id: 'cross2', mapName: 'Game States', name: 'Second Crossing', kind: 'shared', theme: 'Game states', lessons: ['c4'] },
  { id: 'cross3', mapName: 'Sorting', name: 'Last Crossing', kind: 'shared', theme: 'Searching and sorting', lessons: ['c5'] },
  { id: 'summit', mapName: 'Summit', name: 'The Summit', kind: 'shared', theme: 'Polish and publish', lessons: ['c6'] },
  { id: 'sound', mapName: 'Sound', name: 'Beyond: Sound Studio', beyond: true, kind: 'shared', theme: 'Sound effects, music, and code that composes', lessons: ['e1', 'e2', 'e3'] },
  { id: 'beyond1', mapName: 'Lists', name: 'Beyond: Lists in Motion', beyond: true, kind: 'branch', theme: 'Changing lists while the game runs', branches: { platformer: ['p6'], adventure: ['a6'], arcade: ['s6'], mind: ['m6'] } },
  { id: 'beyond2', mapName: 'Classes', name: 'Beyond: Blueprints', beyond: true, kind: 'shared', theme: 'Classes', lessons: ['c3'] },
  { id: 'beyond3', mapName: 'Beyond: Algorithms', name: 'Beyond: Deep Algorithms', beyond: true, kind: 'branch', theme: 'Data structures and algorithms', branches: { platformer: ['p7', 'p8'], adventure: ['a7', 'a8'], arcade: ['s7', 's8'], mind: ['m7', 'm8'] } },
  { id: 'lowpoly', mapName: 'Low Poly 3D', name: 'Beyond: Low Poly Worlds', beyond: true, kind: 'shared', theme: 'A 3D world you can walk through', lessons: ['d1', 'd2', 'd3', 'd4', 'd5'] },
];

/** Optional detours: open once `after` is done, and never hold anyone back. */
export const SIDE_TRAILS = [{ id: 't2', after: 't1' }];
export const isSideTrail = (id) => SIDE_TRAILS.some((t) => t.id === id);
export const sideTrailOpen = (id, doneIds) => SIDE_TRAILS.some((t) => t.id === id && doneIds.has(t.after));

const stageHas = (st, id) => (st.kind === 'shared' ? st.lessons.includes(id) : Object.values(st.branches).some((b) => b.includes(id)));
export const isBeyond = (id) => !!STAGES.find((st) => stageHas(st, id))?.beyond;

const TRUNK_END = 't6';

/** The term-length trail for a road: 10 to 15 lessons. */
export function coreSequence(path) {
  return sequence(path).filter((id) => !isBeyond(id));
}

/** All lessons in order for a road, core then Beyond. With no road chosen, ends at the fork. */
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
const GAME_SHARED = new Set(['c2', 'c4', 'c6', 'e1', 'e2', 'd1', 'd2', 'd3', 'd4', 'd5']);
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
  return STAGES.find((st) => stageHas(st, id)) || { id: 'side', name: 'Side Trail', kind: 'side', theme: 'An optional detour' };
}

/** Map layout: each lesson gets a column (left to right) and a lane. Shared lessons sit in the middle. */
export function mapLayout() {
  const nodes = [];
  const edges = [];
  const LANES = { platformer: -1.5, adventure: -0.5, arcade: 0.5, mind: 1.5 };
  let col = 0;
  let tails = [];
  for (const st of STAGES) {
    if (st.kind === 'shared') {
      for (const id of st.lessons) {
        nodes.push({ id, col, lane: 0, stage: st.id, beyond: !!st.beyond });
        for (const t of tails) edges.push({ from: t.id, to: id, path: t.path || null, beyond: !!st.beyond });
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
          nodes.push({ id, col: startCol + i, lane: LANES[p], stage: st.id, path: p, beyond: !!st.beyond });
          if (i === 0) for (const h of heads) edges.push({ from: h.id, to: id, path: p, beyond: !!st.beyond });
          else edges.push({ from: ids[i - 1], to: id, path: p, beyond: !!st.beyond });
        });
        nextTails.push({ id: ids[ids.length - 1], path: p });
      }
      col = startCol + maxLen;
      tails = nextTails;
    }
  }
  for (const t of SIDE_TRAILS) {
    const from = nodes.find((n) => n.id === t.after);
    nodes.push({ id: t.id, col: from.col, lane: -1.5, stage: 'side', side: true });
    edges.push({ from: t.after, to: t.id, path: null, side: true });
  }
  return { nodes, edges, cols: col };
}
