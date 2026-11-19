// The journey chart: every student's character standing where they are on the branching trail.
import { h, svg, modal } from '../ui.js';
import { app, go } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, STAGES, mapLayout, currentLesson, sequence, isSideTrail, sideTrailOpen } from '../curriculum/graph.js';
import { statsFor } from '../game/rules.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { BOX, COL_W, MARGIN, place } from '../game/world.js';

const MAP_H = 540;

/**
 * A trail between two stops. Along a lane it runs straight; between lanes it leaves level, bends,
 * and arrives level, so roads fan out of a fork and fold back into a crossing like real paths.
 */
function routePath(a, b) {
  if (a.y === b.y) return `M${a.x},${a.y} H${b.x}`;
  if (a.x === b.x) return `M${a.x},${a.y} V${b.y}`;
  const k = (b.x - a.x) * 0.55;
  return `M${a.x},${a.y} C${a.x + k},${a.y} ${b.x - k},${b.y} ${b.x},${b.y}`;
}

const plate = (cx, cy, w, h, cls) => svg('rect', { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), width: Math.round(w), height: h, rx: 4, class: cls });

/** Where a student is standing: their next lesson, or the fork, or the summit. */
export function standingOn(s) {
  const done = new Set(s.works.filter((w) => w.status !== 'in_progress').map((w) => w.lesson_id));
  return currentLesson(s.path, done) || sequence(s.path).at(-1);
}

/** The same scatter of numbers every time, so the map never rearranges itself. */
function scatter(seed) {
  let a = seed >>> 0;
  return () => { a = (Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return ((a ^ (a >>> 13)) >>> 0) / 4294967296; };
}

export function buildMap({ board, meId = null, myPath = null, myDone = new Set(), onNode }) {
  const { nodes, edges, cols } = mapLayout();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const width = MARGIN * 2 + (cols - 1) * COL_W;
  const height = MAP_H;
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'map-svg', role: 'group', 'aria-label': 'Class journey map. Details are in the table below.' });

  // A white edge and a soft shadow round each character, so they stand out from the map like stickers.
  const filter = svg('filter', { id: 'map-sticker', x: '-30%', y: '-30%', width: '160%', height: '170%' },
    svg('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 2, result: 'edge' }),
    svg('feFlood', { 'flood-color': '#ffffff', result: 'white' }),
    svg('feComposite', { in: 'white', in2: 'edge', operator: 'in', result: 'outline' }),
    svg('feGaussianBlur', { in: 'edge', stdDeviation: 2, result: 'blur' }),
    svg('feOffset', { in: 'blur', dy: 3, result: 'shadow' }),
    svg('feComponentTransfer', { in: 'shadow', result: 'soft' }, svg('feFuncA', { type: 'linear', slope: 0.45 })),
    svg('feMerge', {}, svg('feMergeNode', { in: 'soft' }), svg('feMergeNode', { in: 'outline' }), svg('feMergeNode', { in: 'SourceGraphic' })));
  root.append(svg('defs', {}, filter));

  // The ground: one quiet colour, a soft band behind every other stage, and a few contour lines.
  root.append(svg('rect', { x: 0, y: 0, width, height, class: 'map-ground' }));
  STAGES.forEach((st, i) => {
    const ids = st.kind === 'shared' ? st.lessons : Object.values(st.branches).flat();
    const colsHere = ids.map((id) => byId.get(id).col);
    const x0 = MARGIN + Math.min(...colsHere) * COL_W - COL_W / 2;
    const x1 = MARGIN + Math.max(...colsHere) * COL_W + COL_W / 2;
    if (i % 2 === 0) root.append(svg('rect', { x: x0, y: 0, width: x1 - x0, height, class: 'map-band' }));
    const cx = (x0 + x1) / 2;
    const text = st.mapName || st.name;
    root.append(plate(cx, 25, text.length * 8.6 + 18, 30, 'stage-plate'));
    const label = svg('text', { x: cx, y: 32, class: 'stage-name', 'text-anchor': 'middle' });
    label.textContent = text;
    root.append(label);
  });
  for (let k = 0; k < 4; k++) {
    let d = '';
    for (let x = 0; x <= width; x += 60) d += `${x ? ' L' : 'M'}${x},${Math.round(150 + k * 105 + Math.sin(x / 190 + k * 1.7) * 26 + Math.sin(x / 67 + k) * 8)}`;
    root.append(svg('path', { d, class: 'map-contour' }));
  }
  // A few small pines in the gaps, well clear of every stop and its label.
  const spots = nodes.map(place);
  const random = scatter(77);
  for (let i = 0; i < Math.round(width / 34); i++) {
    const x = 20 + random() * (width - 40);
    const y = 70 + random() * (height - 100);
    const size = 0.8 + random() * 0.7;
    if (spots.some((p) => Math.abs(p.x - x) < 62 && y > p.y - 78 && y < p.y + 52)) continue;
    if (edges.some((e) => { const a = place(byId.get(e.from)); const b = place(byId.get(e.to)); return x > Math.min(a.x, b.x) - 14 && x < Math.max(a.x, b.x) + 14 && y > Math.min(a.y, b.y) - 26 && y < Math.max(a.y, b.y) + 14; })) continue;
    root.append(svg('g', { class: 'map-tree', transform: `translate(${Math.round(x)},${Math.round(y)}) scale(${size.toFixed(2)})` },
      svg('rect', { x: -1.5, y: 4, width: 3, height: 6, class: 'map-trunk' }),
      svg('polygon', { points: '0,-14 8,-2 -8,-2' }), svg('polygon', { points: '0,-7 10,6 -10,6' })));
  }

  // Trails. Other students' roads are drawn first and faintly, so your own road sits on top.
  const drawn = edges.map((e) => ({ e, mine: !e.path || !myPath || e.path === myPath })).sort((a, b) => a.mine - b.mine);
  for (const { e, mine } of drawn) {
    const d = routePath(place(byId.get(e.from)), place(byId.get(e.to)));
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
    if (state === 'current') g.append(svg('rect', { x: -BOX - 6, y: -BOX - 6, width: BOX * 2 + 12, height: BOX * 2 + 12, rx: 12, class: 'node-ring' }));
    // A stop is a rounded tile edged in its road's colour.
    g.append(svg('rect', { x: -BOX, y: -BOX, width: BOX * 2, height: BOX * 2, rx: 8, class: 'node-box', style: n.path ? `stroke:${PATHS[n.path].color}` : null }));
    const mark = svg('text', { class: 'node-mark', 'text-anchor': 'middle', y: 6 });
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
  const SPRITE_W = 72;
  const SPRITE_H = 48;
  for (const [id, people] of groups) {
    const n = byId.get(id);
    if (!n) continue;
    const { x, y } = place(n);
    const sorted = [...people].sort((a) => (a.id === meId ? 1 : -1));
    const shown = sorted.slice(-4);
    shown.forEach((s, i) => {
      const dx = (i - (shown.length - 1) / 2) * 24;
      const dy = -BOX - SPRITE_H - 5 - (i % 2) * 6;
      const img = svg('image', {
        href: avatarURL(s.avatar || defaultAvatar(s.id), 3), x: x + dx - SPRITE_W / 2 + 11, y: y + dy, width: SPRITE_W, height: SPRITE_H,
        class: `map-person ${s.id === meId ? 'me-sprite' : ''}`, filter: 'url(#map-sticker)', style: 'image-rendering:pixelated',
      });
      const t = svg('title');
      t.textContent = s.display_name;
      img.append(t);
      root.append(img);
    });
    const count = svg('g', { class: 'crowd', transform: `translate(${x + 40},${y - 66})`, tabindex: 0, role: 'button', 'aria-label': `${people.length} people here. Show names.`,
      onclick: () => showCrowd(id, people), onkeydown: (e) => { if (e.key === 'Enter') showCrowd(id, people); } });
    if (people.length > 1) {
      count.append(svg('rect', { x: -12, y: -11, width: 24, height: 20, rx: 10 }));
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
