// The journey chart: every student's character standing where they are on the branching trail.
import { h, svg, modal } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, STAGES, mapLayout, currentLesson, sequence, isSideTrail, sideTrailOpen } from '../curriculum/graph.js';
import { statsFor } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { BOX, COL_W, MARGIN, place, worldArt } from '../game/world.js';

// Parallel ropes where roads climb between levels, so each road can still be followed.
const ROPE_OFFSET = { platformer: -12, adventure: -4, arcade: 4, mind: 12 };

/** A hard-cornered route between two stops, to suit the blocky world. */
function routePath(a, b, road) {
  if (a.x === b.x || a.y === b.y) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const midX = (a.x + b.x) / 2 + (ROPE_OFFSET[road] || 0);
  return `M${a.x},${a.y} H${midX} V${b.y} H${b.x}`;
}

const plate = (cx, cy, w, h, cls) => svg('rect', { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), width: Math.round(w), height: h, class: cls });

/** Where a student is standing: their next lesson, or the fork, or the summit. */
export function standingOn(s) {
  const done = new Set(s.works.filter((w) => w.status !== 'in_progress').map((w) => w.lesson_id));
  return currentLesson(s.path, done) || sequence(s.path).at(-1);
}

export function buildMap({ board, meId = null, myPath = null, myDone = new Set(), onNode }) {
  const { nodes, edges } = mapLayout();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const art = worldArt();
  const { width, height } = art;
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'map-svg', role: 'group', 'aria-label': 'Class journey map. Details are in the table below.' });

  for (const look of ['day', 'night']) {
    root.append(svg('image', { href: art[look], x: 0, y: 0, width, height, class: `world world-${look}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' }));
  }
  art.clouds.forEach((href, i) => {
    for (let x = 180 + i * 90; x < width; x += 620) {
      root.append(svg('image', { href, x: x + i * 170, y: 44 + i * 30, width: 132, height: 48, class: `world-cloud drift-${i}`, 'aria-hidden': 'true' }));
    }
  });

  // A sign for each stage along the top of the sky.
  for (const st of STAGES) {
    const ids = st.kind === 'shared' ? st.lessons : Object.values(st.branches).flat();
    const colsHere = ids.map((id) => byId.get(id).col);
    const cx = MARGIN + ((Math.min(...colsHere) + Math.max(...colsHere)) / 2) * COL_W;
    const text = st.mapName || st.name;
    root.append(plate(cx, 25, text.length * 8.6 + 18, 30, 'stage-plate'));
    const label = svg('text', { x: cx, y: 32, class: 'stage-name', 'text-anchor': 'middle' });
    label.textContent = text;
    root.append(label);
  }

  for (const e of edges) {
    const a = place(byId.get(e.from));
    const b = place(byId.get(e.to));
    const d = routePath(a, b, e.path);
    const mine = !e.path || !myPath || e.path === myPath;
    const faint = `${mine ? '' : ' faint'}${e.beyond || e.side ? ' extra' : ''}`;
    root.append(svg('path', { d, class: `trail-edge${faint}` }));
    root.append(svg('path', { d, class: `trail${faint}`, style: e.path ? `stroke:${PATHS[e.path].color}` : null }));
  }

  const myOrder = [...(myPath ? sequence(myPath) : sequence(null)), ...nodes.filter((n) => n.side).map((n) => n.id)];
  const myCurrent = meId ? currentLesson(myPath, myDone) : null;

  for (const n of nodes) {
    const { x, y } = place(n);
    const l = getLesson(n.id);
    const onMyRoad = myOrder.includes(n.id);
    const state = myDone.has(n.id) ? 'done' : n.id === myCurrent ? 'current' : 'todo';
    const clickable = onNode && onNode.can(n.id, onMyRoad, state);
    const g = svg('g', {
      class: `node ${state}${onMyRoad || !meId ? '' : ' offroad'}${clickable ? ' clickable' : ''}`,
      transform: `translate(${x},${y})`,
      tabindex: clickable ? 0 : null,
      role: clickable ? 'link' : null,
      'aria-label': `${l.title}${state === 'done' ? ', done' : state === 'current' ? ', your next lesson' : ''}`,
      onclick: clickable ? () => onNode.go(n.id) : null,
      onkeydown: clickable ? (e) => { if (e.key === 'Enter') onNode.go(n.id); } : null,
    });
    const title = svg('title');
    title.textContent = `${l.title}: ${l.concepts.join(', ')}`;
    g.append(title);
    g.append(svg('rect', { x: -BOX, y: -BOX, width: BOX * 2, height: BOX * 2, class: 'node-box' }));
    g.append(svg('rect', { x: -BOX + 2, y: BOX - 5, width: BOX * 2 - 4, height: 3, class: 'node-shade' }));
    if (n.path) g.append(svg('rect', { x: -BOX + 2, y: -BOX + 2, width: BOX * 2 - 4, height: 6, style: `fill:${PATHS[n.path].color}` }));
    const mark = svg('text', { class: 'node-mark', 'text-anchor': 'middle', y: n.path ? 11 : 7 });
    mark.textContent = state === 'done' ? '✓' : n.id === myCurrent ? '▶' : l.mins;
    g.append(mark);
    const shortName = l.title.length > 15 ? `${l.title.slice(0, 14)}…` : l.title;
    g.append(plate(0, BOX + 15, shortName.length * 6.3 + 12, 19, 'node-plate'));
    const name = svg('text', { class: 'node-name', 'text-anchor': 'middle', y: BOX + 19 });
    name.textContent = shortName;
    g.append(name);
    root.append(g);
  }

  // Characters stand above their node. Crowds collapse to a count.
  const groups = new Map();
  for (const s of board) {
    const at = standingOn(s);
    if (!groups.has(at)) groups.set(at, []);
    groups.get(at).push(s);
  }
  const SPRITE_W = 45;
  const SPRITE_H = 30;
  for (const [id, people] of groups) {
    const n = byId.get(id);
    if (!n) continue;
    const { x, y } = place(n);
    const sorted = [...people].sort((a) => (a.id === meId ? 1 : -1));
    const shown = sorted.slice(-4);
    shown.forEach((s, i) => {
      const dx = (i - (shown.length - 1) / 2) * 16;
      const dy = -BOX - SPRITE_H - (i % 2) * 5;
      const img = svg('image', {
        href: avatarURL(s.avatar || defaultAvatar(s.id), 3), x: x + dx - SPRITE_W / 2 + 7, y: y + dy, width: SPRITE_W, height: SPRITE_H,
        class: s.id === meId ? 'me-sprite' : '', style: 'image-rendering:pixelated',
      });
      const t = svg('title');
      t.textContent = s.display_name;
      img.append(t);
      root.append(img);
    });
    const count = svg('g', { class: 'crowd', transform: `translate(${x + 26},${y - 40})`, tabindex: 0, role: 'button', 'aria-label': `${people.length} people here. Show names.`,
      onclick: () => showCrowd(id, people), onkeydown: (e) => { if (e.key === 'Enter') showCrowd(id, people); } });
    if (people.length > 1) {
      count.append(svg('rect', { x: -11, y: -10, width: 22, height: 18, rx: 3 }));
      const c = svg('text', { 'text-anchor': 'middle', y: 4 });
      c.textContent = people.length;
      count.append(c);
      root.append(count);
    }
  }
  return root;
}

function showCrowd(id, people) {
  modal((close) => h('div.stack', h('h2', getLesson(id).title), h('ul.people', people.map((s) => h('li', h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 3), alt: '' }), s.display_name))), h('button.btn', { onclick: close }, 'Close')));
}

export function legend() {
  return h('div.legend',
    Object.values(PATHS).map((p) => h('span', h('i.road-dot', { style: `background:${p.color}` }), `${p.road}: ${p.genre}`)),
    h('span', h('i.road-dot.shared'), 'Everyone together'),
    h('span', h('i.road-dot.beyond'), 'Beyond the Summit: extra challenges'),
    h('span.muted', 'Numbers show lesson minutes.'),
  );
}

export function leaderboard(board, meId) {
  const rows = board.map((s) => ({ s, stats: statsFor(s) })).sort((a, b) => b.stats.done.size - a.stats.done.size || a.s.display_name.localeCompare(b.s.display_name));
  return h('div.table-wrap', h('table.board',
    h('thead', h('tr', h('th', { scope: 'col' }, 'Traveler'), h('th', { scope: 'col' }, 'Road'), h('th', { scope: 'col' }, 'Now on'), h('th.num', { scope: 'col' }, 'Lessons'), h('th', { scope: 'col' }, 'Rank'), h('th.num', { scope: 'col' }, 'XP'), h('th.num', { scope: 'col' }, 'Badges'))),
    h('tbody', rows.map(({ s, stats }) => h('tr', { class: s.id === meId ? 'me' : '' },
      h('td.person', h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 2), alt: '' }), s.display_name),
      h('td', s.path ? PATHS[s.path].road : 'Base Camp'),
      h('td', getLesson(standingOn(s)).title),
      h('td.num', stats.done.size),
      h('td', stats.rank.name),
      h('td.num', stats.xp),
      h('td.num', stats.badges.length),
    ))),
  ));
}

export async function viewMap(_main, classId) {
  const session = app.session;
  const isStudent = session.role === 'student';
  const cid = isStudent ? session.class.id : classId;
  const board = await app.store.classBoard(cid);
  const me = isStudent ? board.find((b) => b.id === session.student.id) : null;
  const myDone = me ? new Set(me.works.filter((w) => w.status !== 'in_progress').map((w) => w.lesson_id)) : new Set();
  const myCurrent = me ? currentLesson(session.student.path, myDone) : null;
  const mapEl = buildMap({
    board, meId: me?.id, myPath: isStudent ? session.student.path : null, myDone,
    onNode: {
      can: (id, onMyRoad, state) => (isStudent ? onMyRoad && (state === 'done' || id === myCurrent || (isSideTrail(id) && sideTrailOpen(id, myDone))) : true),
      go: (id) => go(`/lesson/${id}`),
    },
  });
  const scroller = h('div.map-scroll', { tabindex: 0, 'aria-label': 'Journey map, scrollable' }, mapEl);
  if (me) {
    // Open the map centered on the student, not at the start of a long trail.
    const here = mapLayout().nodes.find((n) => n.id === standingOn({ ...me, path: session.student.path }));
    if (here) requestAnimationFrame(() => { scroller.scrollLeft = place(here).x - scroller.clientWidth / 2; });
  }
  return h('div.stack',
    h('div', h('h1', isStudent ? `${session.class.name}: the journey` : 'Class journey'), h('p.muted', 'Every road meets at each Crossing, then splits again. Scroll sideways to see the whole trail.')),
    legend(),
    scroller,
    h('h2', 'Everyone on the trail'),
    leaderboard(board, me?.id),
  );
}
