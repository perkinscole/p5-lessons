// The journey map in 3D: real terrain seen at an angle, so the high roads climb away into the
// distance and the low roads drop toward you. Trees and tents stand up in it, and every lesson
// stop and character is a sign facing the camera, always in front, so nothing hides a student.
// Roads are paved and kerbed, each stop's building stands back from its road on a plot of its
// own, and the characters stand on the road in front of it.
//
// It is drawn the way old flight games drew landscapes: for each strip of ground from near to far,
// each column of the screen looks up how high the land is there and paints from that height down
// to whatever is already drawn. No 3D library, and it only redraws when the map is scrolled.
import { h } from '../ui.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, STAGES, mapLayout, currentLesson, sequence } from '../curriculum/graph.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { COL_W, MARGIN, place } from '../game/world.js';
import { paintGround, spritePixels, FLAT, SHAPED, landFor } from '../game/overworld.js';
import { buildHeights, grain, lumps, CASTLE, TOWER } from '../game/terrain.js';
import { critterArt, canLive, HABITATS } from '../game/critters.js';
import { stopArt, stopKind, crowdSlots, STOP_SIZE } from '../game/stops.js';
import { standingOn, showCrowd, pointsAlong } from './map.js';

const ART = 3; // page pixels per art pixel of the ground picture
const PX = 2; // page pixels per pixel of the 3D picture, which is drawn small and scaled up
const VIEW_H = 730; // room above the land for mountains to loom
const OFF = 300; // the ground picture has this much extra land behind the furthest road
const LAND_H = 940;
const EDGE = 660; // open country before the first stop and after the last, so the trail never runs off the end of the world
// The camera stands well back and high up and looks through a long lens. Standing back keeps a far
// road from shrinking to nothing beside a near one. Height matters most: the top of a high mesa
// is seen from above, not edge-on, so the road along it shows as a road and not a thin line.
const HORIZON = 64;
const CAM_H = 466;
const ZOOM = 1.483; // the long lens: how much bigger everything is drawn than 1 / distance
const STRETCH = 1.45; // the world is widened, so far-off stops still have room for their names
// How far away each lane is. Lane 0 is the shared trail down the middle.
const MID = 1.8415;
const PER_LANE = 0.33; // the bigger this is, the more a far road shrinks next to a near one
const DEEPER = PER_LANE / 120; // how much further away one page pixel of ground is
const depthOf = (t) => MID - (t - OFF - 282) * DEEPER;
const rowOf = (z) => OFF + 282 + (MID - z) / DEEPER;
// How high each road runs. The land is a giant staircase: the high roads climb away from you,
// step above step, and the low roads drop toward you, a shelf and then the floor of a gorge.
const LIFT = { '-1.5': 216, '-0.5': 96, '0.5': -48, '1.5': -84 };
// How far each road's terrace reaches behind and in front of it, in page pixels.
const BAND = { '-1.5': [-72, 60], '-0.5': [-60, 50], '0.5': [-52, 76], '1.5': [-44, 110] };
// The land is built from blocks, like a block-building game: this many ground cells wide, this tall.
const BLOCK = 4;
const STEP = 12;
const NEAR = depthOf(LAND_H - 1);
const FAR = 7.6;
const BACK = 96; // rows of the ground picture, at the back, where the land climbs away
// Beyond the ground picture the far country carries on, a block to a cell, as far as the eye goes.
const FAR_ROWS = Math.ceil((-rowOf(FAR) / ART + 8) / BLOCK);
const sizeOf = (z) => Math.max(0.58, Math.min(1.5, (1.08 * ZOOM) / z));

/** A road's colour may be written as a style variable. A canvas needs the colour itself. */
function solid(color) {
  const m = /^var\((--[\w-]+)\)$/.exec(String(color).trim());
  return m ? (getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#888888') : color;
}

// A jagged line of summits: sharp-pointed waves of different sizes added together.
const crag = (v) => 1 - Math.abs((((v % 1) + 1) % 1) - 0.5) * 2;
const peaks = (u, range) => range.base + range.waves.reduce((a, [tall, wide, shift]) => a + tall * crag(u / wide + shift), 0);
const broad = (u, range) => range.waves.slice(0, 2).reduce((a, [tall, wide, shift]) => a + tall * crag(u / wide + shift), 0);
const RANGES = [
  { slide: 0.035, base: 54, haze: 0.5, snow: true, waves: [[92, 610, 0.1], [48, 257, 0.55], [22, 97, 0.3], [9, 41, 0.8]], lit: [150, 165, 196], dark: [120, 136, 172], snowLit: [255, 255, 255], snowDark: [228, 235, 246] },
  { slide: 0.085, base: 26, haze: 0.45, snow: false, waves: [[44, 380, 0.6], [26, 149, 0.15], [10, 53, 0.4]], lit: [118, 142, 150], dark: [94, 118, 130] },
];

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const cap = (v) => (v > 255 ? 255 : v < 0 ? 0 : v);
const pack = (r, g, b) => (255 << 24) | (cap(b) << 16) | (cap(g) << 8) | cap(r);
const packed = (c) => pack(c[0], c[1], c[2]);
const blend = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Stronger colour and contrast, for land that would otherwise look washed out. */
function vivid(c, sat, con) {
  const r = c & 255;
  const g = (c >> 8) & 255;
  const b = (c >> 16) & 255;
  const grey = (r + g + b) / 3;
  const ch = (v) => Math.max(0, Math.min(255, (grey + (v - grey) * sat - 128) * con + 128));
  return pack(ch(r), ch(g), ch(b));
}
const tone = (c, k) => pack((c & 255) * k, ((c >> 8) & 255) * k, ((c >> 16) & 255) * k);
/**
 * A colour in the light it stands in. `k` is how bright the spot is and `sh` how far it is in
 * shadow (1 is none). Shadow takes the red out faster than the blue, the way a shadow under a
 * clear sky is cool, so shaded land is deeper without going grey or muddy.
 */
function lit(c, k, sh, tint) {
  let r = (c & 255) * k * sh;
  let g = ((c >> 8) & 255) * k * Math.min(1, sh * 1.04);
  let b = ((c >> 16) & 255) * k * Math.min(1, sh * 1.2);
  if (tint) { r *= tint[0]; g *= tint[1]; b *= tint[2]; }
  return pack(r, g, b);
}

// Every land's own look in 3D. The ground colours are stronger and further apart than the flat
// map's, so each stage of the trail is plainly a different country:
//   ground: base, light speck, dark speck      rough: how hilly it is between the roads
//   side:   what its blocks are made of just under the top, and `deep` lower down
//   dots:   how much lies on the ground, and in what colours
//   light:  a tint over everything there
//   far:    the country behind: how tall, how much of it is flat-topped (mesa), how wooded, in
//           what colours its woods are, and how high bare rock and snow begin
const EARTH = [146, 104, 68];
const STONE = [132, 128, 126];
const LOOK = {
  camp: { ground: ['#aed581', '#c0e094', '#99c56c'], rough: 0.5, dots: [0.03, [[255, 255, 255], [255, 216, 74], [255, 150, 190]]], far: { tall: 0.8, mesa: 0, woods: 0.45, tree: [[86, 152, 84], [104, 168, 96]], rock: 190, snow: 999 } },
  forest: { ground: ['#74ad68', '#84ba76', '#629c58'], rough: 1.1, dots: [0.06, [[52, 112, 66], [96, 160, 92]]], light: [0.94, 1, 0.94], far: { tall: 1.05, mesa: 0, woods: 0.82, tree: [[46, 104, 70], [60, 122, 78], [38, 92, 66]], rock: 210, snow: 999 } },
  lake: { ground: ['#9bd9a6', '#afe4b6', '#86c994'], rough: 0.35, dots: [0.03, [[255, 255, 255], [255, 170, 204]]], far: { tall: 0.6, mesa: 0, woods: 0.4, tree: [[84, 160, 110], [100, 176, 122]], rock: 200, snow: 999, water: 14 } },
  autumn: { ground: ['#e0c670', '#ead486', '#cfb25c'], rough: 1, side: [150, 102, 62], dots: [0.11, [[226, 120, 44], [200, 70, 48], [238, 178, 62]]], light: [1.04, 0.99, 0.9], far: { tall: 0.9, mesa: 0.35, woods: 0.7, tree: [[226, 122, 46], [202, 76, 50], [240, 176, 60]], rock: 200, snow: 999 } },
  highland: { ground: ['#b1b78f', '#c0c69f', '#9fa67f'], rough: 1.7, side: [138, 130, 118], deep: [112, 110, 116], dots: [0.07, [[150, 150, 158], [176, 176, 184], [168, 120, 170]]], far: { tall: 1.35, mesa: 0.5, woods: 0.3, tree: [[70, 116, 86], [58, 100, 78]], rock: 72, snow: 216 } },
  snow: { ground: ['#eef3f7', '#ffffff', '#d9e4eb'], rough: 1.4, side: [146, 152, 170], deep: [118, 124, 146], dots: [0.07, [[196, 224, 244], [255, 255, 255]]], light: [1.03, 1.04, 1.07], far: { tall: 1.45, mesa: 0.15, woods: 0.4, tree: [[70, 122, 102], [238, 244, 248], [86, 138, 116]], rock: 999, snow: 0 } },
  alpine: { ground: ['#8fd689', '#a3e19b', '#7bc577'], rough: 0.9, dots: [0.12, [[255, 255, 255], [255, 216, 74], [255, 140, 190], [170, 140, 255]]], far: { tall: 1.15, mesa: 0.1, woods: 0.5, tree: [[58, 116, 84], [72, 132, 92]], rock: 132, snow: 204 } },
  grove: { ground: ['#cdb2e8', '#dbc4f0', '#ba9cdb'], rough: 0.8, side: [128, 92, 146], deep: [98, 74, 122], dots: [0.06, [[120, 240, 230], [250, 150, 220]]], light: [0.96, 0.9, 1], far: { tall: 0.9, mesa: 0.2, woods: 0.7, tree: [[198, 128, 226], [234, 150, 212], [170, 104, 206]], rock: 220, snow: 999 } },
  crystal: { ground: ['#a6c6ee', '#bcd6f5', '#8fb2e2'], rough: 1.1, side: [104, 118, 170], deep: [82, 92, 146], dots: [0.06, [[160, 244, 255], [226, 196, 255]]], light: [0.92, 0.97, 1.06], far: { tall: 1.15, mesa: 0.6, woods: 0.45, tree: [[136, 226, 230], [206, 172, 248], [250, 184, 214]], rock: 150, snow: 999 } },
  dusk: { ground: ['#b79dd0', '#c7b0dc', '#a389c0'], rough: 0.9, side: [112, 86, 128], deep: [84, 66, 104], dots: [0.07, [[120, 240, 230], [255, 220, 120]]], light: [0.76, 0.7, 0.94], far: { tall: 1, mesa: 0.3, woods: 0.6, tree: [[150, 96, 190], [96, 206, 204], [120, 80, 166]], rock: 170, snow: 999 } },
  desert: { ground: ['#f0d68e', '#f7e3a6', '#e2c479'], rough: 1.25, side: [214, 164, 92], deep: [196, 128, 80], dots: [0.04, [[250, 232, 180], [206, 170, 110]]], light: [1.05, 1, 0.9], far: { tall: 0.95, mesa: 0.95, woods: 0.12, tree: [[120, 164, 96], [104, 150, 90]], rock: 60, snow: 999, rockIs: [226, 150, 92] } },
};
const lookOf = (land) => LOOK[land] || LOOK.camp;
const GROUNDS = Object.fromEntries(Object.entries(LOOK).map(([name, look]) => [name, look.ground]));

// Roads are paved: cobbles in the road's own colour, mortar between them, and a dark kerb.
// The trail everyone shares is slate, the colour it has in the key: pale stone would be lost on
// snow and on sand, and every land it crosses is lighter than slate.
const SHARED_ROAD = [122, 124, 164];
const KERB = [62, 48, 40];
/** Half a road's width in ground cells. A far road is laid wider, so it is still a road from here. */
const roadHalf = (mine, row) => (mine ? 5 : 3.3) * Math.max(0.74, Math.min(1.75, (depthOf(row * ART) / MID) ** 2.2));

/**
 * Lay every trail on the grid. For each cell of road: which trail it belongs to, how far across
 * it is (0 on the centre line, 1 at the kerb) and how far along. Your own road goes over others.
 */
function layRoads({ w, rows, edges, lines, myPath }) {
  const road = new Uint16Array(w * rows);
  const across = new Float32Array(w * rows);
  const along = new Float32Array(w * rows);
  const rank = new Uint8Array(w * rows);
  const info = edges.map((e) => {
    const mine = !e.path || !myPath || e.path === myPath;
    // A road keeps its own colour, brought up to full strength so it is the brightest thing on the land.
    const own = e.path ? rgb(solid(PATHS[e.path].color)) : SHARED_ROAD;
    const full = 228 / Math.max(...own, 1);
    let body = e.path ? blend(own.map((v) => v * full), [255, 255, 255], 0.12) : SHARED_ROAD;
    // Other people's roads are still roads, but quieter and narrower than yours.
    if (!mine) body = blend(body, [168, 164, 150], 0.5);
    const pale = blend(body, [252, 244, 220], e.path ? 0.66 : 0.8);
    return { mine, dotted: !!(e.beyond || e.side), body, pale, mortar: blend(body, KERB, e.path ? 0.26 : 0.3), kerb: blend(KERB, body, mine ? 0.1 : 0.3), gap: blend(blend(body, KERB, 0.5), [150, 126, 96], 0.4) };
  });
  edges.forEach((e, n) => {
    const { mine } = info[n];
    const line = lines[n];
    let gone = 0;
    for (let k = 0; k + 1 < line.length; k++) {
      const ax = line[k].x / ART;
      const ay = line[k].y / ART;
      const dx = line[k + 1].x / ART - ax;
      const dy = line[k + 1].y / ART - ay;
      const len2 = dx * dx + dy * dy || 1;
      const half = roadHalf(mine, ay + dy / 2);
      const reach = Math.ceil(half) + 1;
      for (let y = Math.max(0, Math.floor(Math.min(ay, ay + dy)) - reach); y <= Math.min(rows - 1, Math.ceil(Math.max(ay, ay + dy)) + reach); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(ax, ax + dx)) - reach); x <= Math.min(w - 1, Math.ceil(Math.max(ax, ax + dx)) + reach); x++) {
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
          const d = Math.hypot(x - ax - t * dx, y - ay - t * dy) / half;
          if (d > 1) continue;
          const i = y * w + x;
          const r = mine ? 2 : 1;
          if (r < rank[i] || (r === rank[i] && d >= across[i])) continue;
          rank[i] = r; road[i] = n + 1; across[i] = d; along[i] = gone + t * Math.sqrt(len2);
        }
      }
      gone += Math.sqrt(len2);
    }
  });
  return { road, across, along, info };
}

/**
 * Build the world once: ground colours, heights, and everything that stands up.
 * It takes seconds on a Chromebook, so it is written to be done a piece at a time: each `yield`
 * is a place where the page may draw and answer a click before the next piece (`prepareWorld`).
 * The pieces do the same work in the same order however they are run.
 */
function* buildWorld(myPath) {
  const { nodes, edges, cols } = mapLayout();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const width = EDGE * 2 + MARGIN * 2 + (cols - 1) * COL_W;
  const at = (n) => { const p = place(n); return { x: p.x + EDGE, y: p.y + OFF }; };
  const w = Math.ceil(width / ART);
  const rows = Math.ceil(LAND_H / ART);
  const zRow = Float32Array.from({ length: rows }, (_, y) => depthOf(y * ART));

  const spans = STAGES.map((st) => {
    const ids = st.kind === 'shared' ? st.lessons : Object.values(st.branches).flat();
    const colsHere = ids.map((id) => byId.get(id).col);
    return { st, ids, x0: EDGE + MARGIN + Math.min(...colsHere) * COL_W - COL_W / 2, x1: EDGE + MARGIN + Math.max(...colsHere) * COL_W + COL_W / 2 };
  });
  spans[0].x0 = 0;
  spans.forEach((sp, i) => { if (spans[i + 1]) { const mid = (sp.x1 + spans[i + 1].x0) / 2; sp.x1 = mid; spans[i + 1].x0 = mid; } else sp.x1 = width; });
  const landAt = (x) => { let i = 0; while (i + 1 < spans.length && x * ART >= spans[i + 1].x0) i++; return landFor(i); };
  const lands = Array.from({ length: w }, (_, x) => landAt(x));
  const looks = lands.map(lookOf);

  // Each run of stops on one road is a terrace: a mesa if the road is high, a canyon if it is low.
  const runs = new Map();
  spans.forEach(({ ids }, i) => { for (const id of ids) { const n = byId.get(id); if (n.lane) { const key = `${i}:${n.lane}`; if (!runs.has(key)) runs.set(key, []); runs.get(key).push(n); } } });
  const terraces = [...runs.values()].map((list) => {
    const xs = list.map((n) => at(n).x);
    const { y } = at(list[0]);
    const [up, down] = BAND[String(list[0].lane)] || [-60, 60];
    return { x0: (Math.min(...xs) - 22) / ART, x1: (Math.max(...xs) + 22) / ART, y0: (y + up) / ART, y1: (y + down) / ART, height: LIFT[String(list[0].lane)] || 0, ramp: 26, lane: list[0].lane, stops: list };
  });
  // A side trail climbs straight up to its own lookout.
  for (const n of nodes) if (n.side && n.lane) { const p = at(n); terraces.push({ x0: (p.x - 44) / ART, x1: (p.x + 44) / ART, y0: (p.y - 72) / ART, y1: (p.y + 46) / ART, height: LIFT[String(n.lane)] || 100, ramp: 14, soft: true }); }
  const inTerrace = (x, y) => terraces.some((t) => x >= t.x0 - t.ramp - 2 && x <= t.x1 + t.ramp + 2 && y >= t.y0 - 8 && y <= t.y1 + 8);

  const stops = nodes.map(at);
  const lines = edges.map((e) => pointsAlong(at(byId.get(e.from)), at(byId.get(e.to))));
  const { road, across, along, info: roads } = layRoads({ w, rows, edges, lines, myPath });

  // Every stop's building stands back from the road, not on it: far enough that the whole road
  // passes in front of its door. A cave is further back still, against the canyon wall.
  const sites = nodes.map((n) => {
    const p = at(n);
    const half = roadHalf(true, p.y / ART) * ART;
    const low = n.lane > 0 && !n.side;
    return { n, x: p.x, y: p.y, cx: Math.round(p.x / ART), cy: Math.round(p.y / ART), half, back: half + 16, low };
  });

  // Nothing is planted on the edge of a terrace, where it would stand half on a cliff.
  const avoid = terraces.flatMap((t) => [
    { x0: (t.x0 - t.ramp) * ART, x1: (t.x1 + t.ramp) * ART, y0: t.y0 * ART - 14, y1: t.y0 * ART + 14 },
    { x0: (t.x0 - t.ramp) * ART, x1: (t.x1 + t.ramp) * ART, y0: t.y1 * ART - 14, y1: t.y1 * ART + 14 },
  ]);
  yield;
  const { canvas, plan } = paintGround({ width, height: LAND_H, stops, trails: lines, stages: spans, avoid, signs: false, grounds: GROUNDS, skip: new Set(['pond']) });
  yield;
  const g = canvas.getContext('2d');
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < rows;

  // Mountains, pyramids, and some of the crystals are made of land, not drawn on it.
  const spire = (t) => t.kind === 'crystal' && grain(t.x, t.y, 12) < 0.55;
  const bumps = [
    ...plan.things.filter((t) => SHAPED.has(t.kind)),
    ...plan.things.filter(spire).map((t) => ({ kind: 'spire', x: t.x, y: t.y, tall: 48 + Math.floor(grain(t.x, t.y, 13) * 6) * STEP, tint: Math.floor(grain(t.x, t.y, 14) * 3) })),
  ];
  // Hills roll everywhere except along the roads and round the stops, which stay level. `shut` is
  // where nothing may stand or grow: the roads themselves and each stop's own plot.
  const calm = new Uint8Array(w * rows);
  const shut = new Uint8Array(w * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) if (road[y * w + x]) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inside(x + dx, y + dy)) { calm[(y + dy) * w + x + dx] = 1; if (Math.abs(dx) < 2 && Math.abs(dy) < 2) shut[(y + dy) * w + x + dx] = 1; } }
  const plot = new Uint8Array(w * rows);
  for (const s of sites) {
    const deep = Math.ceil((s.low ? 56 : s.back + 22) / ART);
    for (let dy = -deep; dy <= 6; dy++) for (let dx = -13; dx <= 13; dx++) if (inside(s.cx + dx, s.cy + dy)) { const i = (s.cy + dy) * w + s.cx + dx; calm[i] = 1; if (dy <= 2) { if (!shut[i]) plot[i] = 1; shut[i] = 1; } }
  }
  // Buildings: a castle in the highlands and a dark one in the dusk land, with watchtowers in the
  // woods. Each goes on the first clear patch of its land, behind the trail where it can be seen.
  const taken = (x0, y0, size) => { for (let y = y0 - 6; y < y0 + size + 6; y += 2) for (let x = x0 - 6; x < x0 + size + 6; x += 2) { if (x < 0 || y < 0 || x >= w || y >= rows || calm[y * w + x]) return true; } return terraces.some((t) => x0 + size > t.x0 - t.ramp && x0 < t.x1 + t.ramp && y0 + size > t.y0 - 8 && y0 < t.y1 + 8); };
  const SITES = [['castle', 'highland', CASTLE, 128], ['castle', 'dusk', CASTLE, 232], ['tower', 'forest', TOWER, 150], ['tower', 'autumn', TOWER, 236], ['tower', 'alpine', TOWER, 140], ['castle', 'desert', CASTLE, 120]];
  for (const [kind, land, blocks, rowWanted] of SITES) {
    const size = blocks * BLOCK;
    let done = false;
    for (let dy = 0; dy < 60 && !done; dy += BLOCK) for (const y0 of [rowWanted - dy, rowWanted + dy]) {
      for (let x0 = 0; x0 + size < w && !done; x0 += BLOCK) {
        if (lands[x0] !== land || lands[x0 + size] !== land || y0 < 100 || y0 + size >= rows - 4) continue;
        const ax = Math.floor(x0 / BLOCK) * BLOCK;
        const ay = Math.floor(y0 / BLOCK) * BLOCK;
        if (taken(ax, ay, size)) continue;
        bumps.push({ kind, x: ax, y: ay, land });
        for (let y = ay - 2; y < ay + size + 2; y++) for (let x = ax - 2; x < ax + size + 2; x++) { calm[y * w + x] = 1; shut[y * w + x] = 1; }
        done = true;
      }
      if (done) break;
    }
  }

  // The country behind the trail. It climbs away in ridges with valleys between them, each land
  // in its own way: tall crags behind the highlands, flat-topped buttes behind the desert, low
  // wooded hills behind the camp. The same rule shapes the back of the ground picture and the far
  // country beyond it, so the two join without a seam. Lands blend into each other along the way.
  const spread = (pick) => {
    const raw = Float32Array.from(looks, pick);
    const sums = new Float32Array(w + 1);
    for (let x = 0; x < w; x++) sums[x + 1] = sums[x] + raw[x];
    return Float32Array.from({ length: w }, (_, x) => { const a = Math.max(0, x - 24); const b = Math.min(w, x + 25); return (sums[b] - sums[a]) / (b - a); });
  };
  const tallAt = spread((look) => look.far.tall);
  const mesaAt = spread((look) => look.far.mesa);
  const backLand = (x, y) => {
    const d = BACK - y;
    if (d <= 0) return 0;
    const xi = Math.max(0, Math.min(w - 1, x | 0));
    const wander = (lumps(x / 55, d / 70, 31) - 0.5) * 100;
    const ridge = crag((d + wander) / 150 + 0.25) ** 1.4;
    const mass = lumps(x / 80, d / 60, 32);
    const fine = lumps(x / 21, d / 19, 33);
    let tall = smooth(0, 150, d) * tallAt[xi] * (0.72 + d / 900) * (8 + 135 * ridge * (0.3 + 0.7 * mass) + 84 * mass * mass + 28 * fine);
    const flat = mesaAt[xi];
    if (flat > 0.02) { const tier = STEP * 4; tall += (Math.round(tall / tier) * tier - tall) * flat; }
    return 290 * (1 - Math.exp(-tall / 290));
  };
  yield;
  const H = buildHeights({ w, h: rows, terraces, bumps: bumps.filter((b) => b.kind !== 'castle' && b.kind !== 'tower'), calm, hills: 50, hillScale: (x) => looks[x].rough, lift: (x, y) => (y < BACK ? backLand(x, y) : 0), step: STEP, block: BLOCK });

  yield;
  // Nothing between you and a road may stand in the way of seeing it. Hills and mountains in front
  // of a road are held below the line from your eye to the road, a whole block at a time.
  for (let bx = 0; bx < w; bx += BLOCK) {
    let need = 0;
    let level = 0;
    for (let by = 0; by < rows; by += BLOCK) {
      let paved = false;
      for (let y = by; y < Math.min(rows, by + BLOCK) && !paved; y++) for (let x = bx; x < Math.min(w, bx + BLOCK); x++) if (road[y * w + x]) { paved = true; break; }
      const i = by * w + bx;
      if (paved) { const now = (CAM_H - H[i] + 4) / zRow[Math.min(rows - 1, by + BLOCK - 1)]; if (now > need) { need = now; level = H[i]; } continue; }
      if (!need || inTerrace(bx, by)) continue;
      // Never lower than the road itself, or every road would run along a ditch.
      const most = Math.max(level, Math.floor((CAM_H - need * zRow[by]) / STEP) * STEP);
      if (H[i] > most) for (let y = by; y < Math.min(rows, by + BLOCK); y++) for (let x = bx; x < Math.min(w, bx + BLOCK); x++) H[y * w + x] = most;
    }
  }

  yield;
  // Water. A river runs through the lake land from the hills to the front, and the trail crosses
  // it on a plank bridge. The lake land is half pools, the alpine meadow has tarns, the desert an
  // oasis or two, and every pond the ground plan asked for is dug as real water. Water always
  // lies a block below level ground, never on a slope, and never touches a road.
  const deck = new Uint8Array(w * rows);
  const wet = new Uint8Array(w * rows);
  const eachCell = (bx, by, fn) => { for (let y = by; y < Math.min(rows, by + BLOCK); y++) for (let x = bx; x < Math.min(w, bx + BLOCK); x++) fn(y * w + x); };
  const flood = (bx, by) => eachCell(bx, by, (i) => { H[i] -= STEP; wet[i] = 1; });
  const nearRoad = (bx, by) => { let hit = false; eachCell(bx, by, (i) => { if (shut[i] && !plot[i]) hit = true; }); return hit; };
  const lakeSpan = spans.find((sp, i) => landFor(i) === 'lake');
  if (lakeSpan) {
    const mid = (lakeSpan.x0 + lakeSpan.x1) / 2 / ART;
    const lakeRow = (OFF + 282) / ART + 44;
    for (let by = BACK; by < rows; by += BLOCK) for (let bx = 0; bx < w; bx += BLOCK) {
      const bank = mid + Math.sin(by / 13) * 7 + Math.sin(by / 5.1) * 2;
      // In front of the trail the river opens into a lake, wide enough to sail on.
      const lake = Math.hypot((bx + BLOCK / 2 - mid) / 34, (by - lakeRow) / 13) < 1 + (lumps(bx / 9, by / 7, 12) - 0.5) * 0.5;
      // Only level ground floods. Where the low roads' canyons cut in, the water stops at their rim.
      if ((Math.abs(bx + BLOCK / 2 - bank) > 7 && !lake) || H[by * w + bx] > STEP * 2 || H[by * w + bx] < 0) continue;
      let trail = false;
      eachCell(bx, by, (i) => { if (shut[i] || calm[i]) trail = true; });
      if (trail && !nearRoad(bx, by)) continue;
      eachCell(bx, by, (i) => { if (trail) { deck[i] = 1; H[i] = 0; } else { H[i] = -STEP; wet[i] = 1; } });
    }
  }
  const nearCalm = (bx, by, gap) => { for (let dy = -gap; dy <= BLOCK + gap; dy += 2) for (let dx = -gap; dx <= BLOCK + gap; dx += 2) { const x = bx + dx; const y = by + dy; if (inside(x, y) && calm[y * w + x]) return true; } return false; };
  const POOLS = { lake: 0.46, alpine: 0.72, desert: 0.8, camp: 0.8 };
  for (let by = 0; by < rows; by += BLOCK) for (let bx = 0; bx < w; bx += BLOCK) {
    const want = POOLS[lands[bx]];
    const i = by * w + bx;
    if (!want || wet[i] || by < BACK || H[i] > STEP || H[i] < 0 || lumps(bx / 21, by / 15, 11) < want || nearCalm(bx, by, 6)) continue;
    flood(bx, by);
  }
  for (const t of plan.things) if (t.kind === 'pond') {
    const cx = Math.floor(t.x / BLOCK);
    const cy = Math.floor((t.y - 3) / BLOCK);
    const level = H[Math.min(rows - 1, cy * BLOCK) * w + Math.min(w - 1, cx * BLOCK)];
    const pool = [];
    let good = true;
    for (let j = -2; j <= 2 && good; j++) for (let k = -3; k <= 3; k++) {
      const bx = (cx + k) * BLOCK;
      const by = (cy + j) * BLOCK;
      if (!inside(bx, by) || !inside(bx + BLOCK, by + BLOCK)) { good = false; break; }
      const i = by * w + bx;
      const lake = (k / 2.4) ** 2 + (j / 1.4) ** 2 <= 1;
      // The pond needs a level bank all the way round it, clear of roads and buildings.
      if ((wet[i] ? H[i] + STEP : H[i]) !== level || nearCalm(bx, by, 2) || deck[i]) { good = false; break; }
      if (lake && !wet[i]) pool.push([bx, by]);
    }
    if (good) for (const [bx, by] of pool) flood(bx, by);
  }
  // A block of water with lower land beside it would pour away, so it goes back to being ground.
  for (let by = 0; by < rows; by += BLOCK) for (let bx = 0; bx < w; bx += BLOCK) {
    const i = by * w + bx;
    if (!wet[i]) continue;
    const spills = [[-BLOCK, 0], [BLOCK, 0], [0, -BLOCK], [0, BLOCK]].some(([dx, dy]) => inside(bx + dx, by + dy) && !wet[i + dy * w + dx] && !deck[i + dy * w + dx] && H[i + dy * w + dx] < H[i]);
    if (spills) eachCell(bx, by, (j) => { wet[j] = 0; });
  }

  yield;
  // Then the buildings, block by block, on top of the finished ground.
  const built = bumps.filter((b) => b.kind === 'castle' || b.kind === 'tower');
  if (built.length) {
    const stamped = buildHeights({ w, h: rows, bumps: built, step: STEP, block: BLOCK });
    for (const b of built) { const size = (b.kind === 'castle' ? CASTLE : TOWER) * BLOCK; for (let y = b.y; y < b.y + size; y++) for (let x = b.x; x < b.x + size; x++) H[y * w + x] = stamped[y * w + x]; }
  }

  // Each stop's plot: a paved yard for the building to stand on, a few stones from its door to the
  // road, and the shadow the building throws across them. On a low road the building is a cave or
  // a cabin against the canyon wall, so first find where the wall is.
  const yard = new Uint8Array(w * rows); // 1 paving, 2 its rim, 3 the path to the door
  const shade = new Float32Array(w * rows).fill(1);
  const darken = (x, y, k) => { if (inside(x, y) && shade[y * w + x] > k) shade[y * w + x] = k; };
  const hole = new Uint8Array(w * rows); // how tall a cave mouth is cut into the cliff here
  const wallBehind = (cx, cy, floor, rise = STEP * 2) => { for (let dy = 2; dy < 34; dy++) { if (cy - dy < 0) return 0; if (H[(cy - dy) * w + cx] >= floor + rise) return dy; } return 0; };
  for (const s of sites) {
    const floor = H[s.cy * w + s.cx];
    if (s.low) { const far = wallBehind(s.cx, s.cy, floor); if (far) s.back = Math.max(s.half + 10, Math.min(s.back + 14, (far - 1) * ART - 3)); }
    const by = Math.round((s.y - s.back) / ART);
    s.baseRow = by;
    for (let dy = -4; dy <= 3; dy++) for (let dx = -11; dx <= 11; dx++) {
      const x = s.cx + dx;
      const y = by + dy;
      if (!inside(x, y) || road[y * w + x] || H[y * w + x] !== floor) continue;
      yard[y * w + x] = Math.abs(dx) === 11 || dy === -4 || dy === 3 ? 2 : 1;
    }
    for (let y = by + 4; y < s.cy; y++) for (let dx = -1; dx <= 1; dx++) if (inside(s.cx + dx, y) && !road[y * w + s.cx + dx]) yard[y * w + s.cx + dx] = 3;
    // The sun is low in the north-west, so the shadow lies to the south-east: toward you, and right.
    for (let dy = -3; dy <= 9; dy++) for (let dx = -7; dx <= 8; dx++) darken(s.cx + dx + Math.round(Math.max(0, dy) * 1.4), by + dy, dy > 6 ? 0.8 : 0.66);
  }
  // Caves: on a low road, a dark mouth is cut into the canyon wall between each pair of stops. The
  // wall is made sheer there first, so the mouth has a whole cliff to open in.
  for (const t of terraces) {
    if (!(t.lane > 0) || !t.stops) continue;
    const xs = t.stops.map((n) => at(n).x / ART).sort((a, b) => a - b);
    const mouths = xs.length > 1 ? xs.slice(1).map((x, k) => (x + xs[k]) / 2) : [xs[0] - 17];
    const cy = Math.round(at(t.stops[0]).y / ART);
    for (const mx of mouths) {
      const centre = Math.round(mx / BLOCK) * BLOCK;
      for (let x = centre - 8; x < centre + 8; x++) {
        if (x < 0 || x >= w) continue;
        const floor = H[cy * w + x];
        const far = wallBehind(x, cy, floor, STEP * 3);
        if (!far) continue;
        for (let y = cy - far + 1; y < cy; y++) if (H[y * w + x] > floor && !road[y * w + x]) H[y * w + x] = floor;
        const top = Math.floor((cy - far) / BLOCK) * BLOCK;
        const tall = Math.round(10 + 28 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - centre) / 7.8) ** 2)));
        for (let y = top; y < top + BLOCK; y++) hole[y * w + x] = tall;
      }
    }
  }

  yield;
  // Anything standing throws a shadow the same way.
  for (const t of plan.things) if (!FLAT.has(t.kind) && !SHAPED.has(t.kind) && !spire(t)) for (let dy = 0; dy <= 3; dy++) for (let dx = -2; dx <= 4; dx++) darken(t.x + dx + dy, t.y + dy, 0.74);

  const C = new Uint32Array(g.getImageData(0, 0, w, rows).data.buffer.slice(0));
  // S is what each block's sides are made of just under the top, and D lower down: earth then
  // stone under grass, stone in the mountains, sandstone in the desert.
  const S = new Uint32Array(w * rows);
  const D = new Uint32Array(w * rows);
  const SPIRE = [[[150, 236, 232], [86, 178, 190]], [[214, 180, 250], [150, 112, 206]], [[255, 190, 216], [214, 124, 164]]];
  const made = new Uint8Array(w * rows); // 1 mountain, 2 pyramid, 3 to 5 a crystal spire, 6 a castle, 7 a dark castle
  for (const b of bumps) for (let y = Math.max(0, b.y - 16); y <= Math.min(rows - 1, b.y + 16); y++) for (let x = Math.max(0, b.x - 16); x <= Math.min(w - 1, b.x + 16); x++) {
    const d = b.kind === 'pyramid' ? Math.max(Math.abs(x - b.x), Math.abs(y - b.y)) : Math.hypot(x - b.x, y - b.y);
    if (b.kind === 'castle' || b.kind === 'tower') { const size = (b.kind === 'castle' ? CASTLE : TOWER) * BLOCK; if (x >= b.x && y >= b.y && x < b.x + size && y < b.y + size) made[y * w + x] = b.land === 'dusk' ? 7 : 6; } else if (b.kind === 'spire') { if (d < 5 && H[y * w + x] >= b.tall) made[y * w + x] = 3 + b.tint; } else if (d < (b.kind === 'peak' ? 15 : 13) && H[y * w + x] > 30) made[y * w + x] = b.kind === 'peak' ? 1 : 2;
  }

  // The colour of a road cell: a cobble, the mortar round it, or the kerb. Cobbles are bigger on
  // a far road, so they are still stones from here and not a haze.
  const paving = (x, y, i) => {
    const r = roads[road[i] - 1];
    const half = roadHalf(r.mine, y);
    const kerb = Math.max(1.2, half * 0.2);
    if (across[i] > 1 - kerb / half) return r.kerb;
    // Inside the kerb runs a line of pale edging stones, so even a blue road is plainly a road
    // and not a river.
    if (across[i] > 1 - (kerb + Math.max(1, half * 0.16)) / half) return r.pale;
    if (r.dotted && along[i] % 9 > 5) return r.gap;
    const z = zRow[y];
    const cw = Math.max(4, Math.round(2.2 * z));
    const ch = Math.max(3, Math.round(1.3 * z * z));
    const cy = (y / ch) | 0;
    const xx = x + (cy & 1 ? cw >> 1 : 0);
    if (xx % cw === 0 || y % ch === 0) return r.mortar;
    const stone = grain((xx / cw) | 0, cy, 71);
    if (stone > 0.86) return blend(r.body, r.pale, 0.55);
    const k = 0.9 + stone * 0.22;
    return [r.body[0] * k, r.body[1] * k, r.body[2] * k];
  };
  const YARD = [[0, 0, 0], [204, 196, 180], [124, 114, 108], [222, 208, 174]];
  // What the top of a block is, by how high it stands in the back country: woods and meadow low
  // down, bare rock above, snow on the tops.
  const crown = (look, tall, x, y) => {
    const far = look.far;
    const jitter = (grain(x >> 2, y >> 2, 37) - 0.5) * 30;
    if (tall >= far.snow + jitter) return [246, 249, 253];
    if (tall >= far.rock + jitter) return far.rockIs || blend(look.deep || STONE, [200, 198, 200], 0.45);
    return null;
  };

  for (let y = 0; y < rows; y++) { if (y % 16 === 0) yield; for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const land = lands[x];
    const look = looks[x];
    const bx = (x / BLOCK) | 0;
    const by = (y / BLOCK) | 0;
    const tall = H[i];
    const side = deck[i] ? [112, 78, 48] : made[i] === 6 ? [150, 150, 160] : made[i] === 7 ? [86, 70, 108] : made[i] === 1 ? [136, 140, 154] : made[i] === 2 ? [222, 174, 96] : made[i] >= 3 ? SPIRE[made[i] - 3][1] : (look.side || EARTH);
    const deep = made[i] || deck[i] ? side : (look.deep || STONE);
    const paved = road[i] && !deck[i];
    let flat = false; // true for anything laid by hand, which has no speckle or block texture
    if (paved) { C[i] = packed(paving(x, y, i)); flat = true; } else if (yard[i] && !wet[i] && !made[i]) {
      C[i] = packed(yard[i] === 1 && (x + (y & 1) * 2) % 4 === 0 ? [186, 178, 164] : YARD[yard[i]]);
      flat = true;
    } else if (made[i] === 1) C[i] = tall > 96 || land === 'snow' ? pack(250, 252, 255) : pack(164, 168, 182);
    else if (made[i] === 2) C[i] = pack(244, 206, 120);
    else if (made[i] >= 6) {
      // Castle stone, with slate on the keep, red caps on the towers, and a worn courtyard.
      const dark = made[i] === 7;
      C[i] = tall >= 132 ? pack(96, 110, 150) : tall >= 100 ? (dark ? pack(150, 90, 190) : pack(196, 78, 70)) : tall <= STEP ? (dark ? pack(96, 84, 110) : pack(176, 160, 132)) : (dark ? pack(120, 104, 146) : pack(188, 188, 198));
    } else if (deck[i]) C[i] = (x + y) % 3 === 0 ? pack(150, 108, 68) : pack(178, 132, 86);
    else if (made[i] >= 3) C[i] = packed(SPIRE[made[i] - 3][0]);
    else if (wet[i]) {
      // Water: deep blue with a slow pattern of lighter ripples, and paler where it meets a bank.
      const ripple = lumps(x / 3 + y / 7, y / 2.2, 15);
      const shore = (x >= BLOCK && !wet[i - BLOCK]) || (x + BLOCK < w && !wet[i + BLOCK]) || (y >= BLOCK && !wet[i - BLOCK * w]) || (y + BLOCK < rows && !wet[i + BLOCK * w]);
      C[i] = land === 'snow' ? pack(190, 226, 244) : ripple > 0.72 ? pack(190, 232, 248) : shore ? pack(96, 184, 226) : ripple > 0.45 ? pack(66, 154, 214) : pack(46, 128, 196);
    } else {
      // Rock and snow on the high ground behind, and bare stone on the highlands' tops.
      const top = y < BACK + 8 ? crown(look, tall, x, y) : land === 'highland' && tall >= 60 + (grain(bx, by, 24) - 0.5) * 30 ? [158, 156, 160] : null;
      const dots = look.dots;
      if (top) C[i] = packed(top);
      else if (dots && grain(x, y, 20) < dots[0]) C[i] = packed(dots[1][Math.floor(grain(x, y, 21) * dots[1].length)]);
      else C[i] = vivid(C[i], 1.1, 1.04);
      // A beach where land meets water.
      if (!top && (land === 'lake' || land === 'desert') && tall <= STEP && lumps(bx / 3, by / 3, 23) > 0.45 && ((x >= BLOCK && wet[i - BLOCK]) || (x + BLOCK < w && wet[i + BLOCK]) || (y >= BLOCK && wet[i - BLOCK * w]) || (y + BLOCK < rows && wet[i + BLOCK * w]))) C[i] = grain(x, y, 22) < 0.2 ? pack(214, 200, 150) : pack(236, 224, 176);
    }
    const tint = look.light;
    S[i] = tint ? pack(side[0] * tint[0], side[1] * tint[1], side[2] * tint[2]) : packed(side);
    D[i] = tint ? pack(deep[0] * tint[0], deep[1] * tint[1], deep[2] * tint[2]) : packed(deep);

    // Light. The sun is low in the north-west. A block is in shadow when something taller stands
    // that way, and deeper in shadow the closer it is to the foot of what shades it. Ground at the
    // foot of a cliff is dimmer, the lip of a cliff catches the light, slopes that face the sun
    // are brighter than slopes that face away, and high ground is brighter than low.
    let sh = shade[i];
    for (let d = 1; d <= 14; d++) {
      const xx = x - d * 2;
      const yy = y - d;
      if (xx < 0 || yy < 0) break;
      const over = H[yy * w + xx] - tall;
      if (over > d * 5.2) { const dim = 0.52 + 0.36 * ((d * 5.2) / over); if (dim < sh) sh = dim; }
    }
    // A road keeps its full colour in any land's light, and is never lost in a shadow.
    if (flat) { C[i] = lit(C[i], 1, Math.max(paved ? 0.72 : 0.62, sh), paved ? null : tint); continue; }
    let k = 1;
    const north = y > 0 ? H[i - w] : tall;
    const south = y + 1 < rows ? H[i + w] : tall;
    if (north > tall) k *= 0.82; else if (y > 1 && H[i - 2 * w] > tall) k *= 0.91;
    if (south > tall || (x > 0 && H[i - 1] > tall)) k *= 0.9;
    if (south < tall) k *= 1.07;
    const west = x >= BLOCK ? H[i - BLOCK] : tall;
    const up = y >= BLOCK ? H[i - BLOCK * w] : tall;
    k *= 1 + Math.max(-0.1, Math.min(0.1, ((2 * tall - west - up) / STEP) * 0.035));
    k *= 1 + Math.max(-0.1, Math.min(0.14, tall / 520));
    // Texture: every block is a slightly different shade, each cell is speckled, and a line marks
    // where one block meets the next, brighter on the lit edge and darker on the far one.
    k *= 0.93 + grain(bx, by, 3) * 0.14 + (grain(x, y, 4) - 0.5) * 0.08;
    if (x % BLOCK === 0 || y % BLOCK === 0) k *= 1.04; else if (x % BLOCK === BLOCK - 1 || y % BLOCK === BLOCK - 1) k *= 0.9;
    C[i] = lit(C[i], k, sh, tint);
  } }

  yield;
  // The far country, a block to a cell. Its woods are blocks too: dark, a step or two taller than
  // the ground they grow on, so a wooded ridge has a ragged top and a tree line where rock begins.
  const fw = Math.ceil(w / BLOCK);
  const FH = new Float32Array(fw * FAR_ROWS);
  const FC = new Uint32Array(fw * FAR_ROWS);
  const FS = new Uint32Array(fw * FAR_ROWS);
  const kinds = new Uint8Array(fw * FAR_ROWS); // 1 water, 2 woods
  for (let fr = 0; fr < FAR_ROWS; fr++) for (let fx = 0; fx < fw; fx++) {
    const x = Math.min(w - 1, fx * BLOCK + 2);
    const y = -(fr * BLOCK + 2);
    const far = looks[Math.max(0, Math.min(w - 1, x + Math.round((grain(fx, fr, 36) - 0.5) * 20)))].far;
    let tall = Math.round(backLand(x, y) / STEP) * STEP;
    const i = fr * fw + fx;
    if (far.water && tall <= far.water + lumps(fx / 9, fr / 5, 38) * 30) { tall = 0; kinds[i] = 1; } else if (tall < Math.min(far.rock, far.snow || 999) - 12 && lumps(fx / 6, fr / 4, 34) + lumps(fx / 23, fr / 11, 39) * 0.6 > 1.45 - far.woods && grain(fx, fr, 35) < 0.82) { tall += STEP * (1 + (grain(fx, fr, 40) < 0.45 ? 1 : 0)); kinds[i] = 2; }
    FH[i] = tall;
  }
  yield;
  for (let fr = 0; fr < FAR_ROWS; fr++) for (let fx = 0; fx < fw; fx++) {
    const i = fr * fw + fx;
    const x = Math.min(w - 1, fx * BLOCK + 2);
    const look = looks[Math.max(0, Math.min(w - 1, x + Math.round((grain(fx, fr, 36) - 0.5) * 20)))];
    const tall = FH[i];
    let c;
    let side = look.side || EARTH;
    if (kinds[i] === 1) { c = lumps(fx / 2.5, fr / 1.5, 15) > 0.62 ? [150, 214, 240] : [70, 156, 214]; side = c; } else if (kinds[i] === 2) { c = look.far.tree[Math.floor(grain(fx, fr, 41) * look.far.tree.length)]; side = blend(c, [40, 50, 50], 0.4); } else {
      const top = crown(look, tall, fx * 4, fr * 4 + 4000);
      if (top) { c = top; side = look.deep || STONE; } else {
        // Meadows and fields in broad patches, so open ground is not one flat colour either.
        const patch = lumps(fx / 13, fr / 7, 42);
        c = rgb(look.ground[patch > 0.62 ? 1 : patch < 0.36 ? 2 : 0]);
        if (patch < 0.36) c = blend(c, look.far.tree[0], 0.22);
        if (tall >= STEP * 5) side = look.deep || STONE;
      }
    }
    // The same sun: shadow behind what is taller to the north-west, and brighter on top.
    let sh = 1;
    for (let d = 1; d <= 6; d++) {
      const xx = fx - d;
      const rr = fr + ((d + 1) >> 1);
      if (xx < 0 || rr >= FAR_ROWS) break;
      const over = FH[rr * fw + xx] - tall;
      if (over > d * 10.4) { const dim = 0.56 + 0.34 * ((d * 10.4) / over); if (dim < sh) sh = dim; }
    }
    let k = 0.94 + grain(fx, fr, 3) * 0.12;
    const west = fx > 0 ? FH[i - 1] : tall;
    const north = fr + 1 < FAR_ROWS ? FH[i + fw] : tall;
    const south = fr > 0 ? FH[i - fw] : tall;
    k *= 1 + Math.max(-0.12, Math.min(0.12, ((2 * tall - west - north) / STEP) * 0.04));
    if (south < tall) k *= 1.06;
    FC[i] = lit(vivid(packed(c), 1.08, 1.03), k, sh, look.light);
    FS[i] = look.light ? pack(side[0] * look.light[0], side[1] * look.light[1], side[2] * look.light[2]) : packed(side);
  }

  yield;
  const heightAt = (x, t) => H[Math.max(0, Math.min(rows - 1, Math.round(t / ART))) * w + Math.max(0, Math.min(w - 1, Math.round(x / ART)))];
  // Some things stand bigger than their drawing: a giant mushroom should tower, a tent should be a tent.
  const GROW = { bigshroom: 1.9, oak: 1.25, maple: 1.3, pine: 1.3, snowpine: 1.25, cabin: 1.4, tent: 1.4, palm: 1.4, crystal: 1.3, flag: 1.5, boulder: 1.2, cactus: 1.15 };
  // Where each thing may stand. Nothing stands in water or on a road or a stop's plot. Anything
  // built or broad needs level ground under the whole of it, so it never hangs over a ledge or
  // sinks into a slope. Nothing tall grows just in front of a road, where it would hide the road.
  // Reeds only grow at the water's edge.
  const BROAD = { cabin: 5, tent: 6, igloo: 5, windmill: 4, well: 3, haystack: 3, boulder: 4, bigshroom: 2, snowman: 2, fire: 2, sign: 1, flag: 1, pumpkin: 2 };
  const SMALL = new Set(['rock', 'mushroom', 'pumpkin', 'reeds', 'fire', 'sign', 'haystack']);
  const roadBehind = (x, y) => { for (let dy = 1; dy <= 9; dy++) if (y - dy >= 0 && road[(y - dy) * w + x]) return true; return false; };
  const waterNear = (x, y) => { for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) if (inside(x + dx, y + dy) && wet[(y + dy) * w + x + dx]) return true; return false; };
  const mayStand = (kind, x, y) => {
    if (!inside(x, y)) return false;
    const i = y * w + x;
    if (wet[i] || shut[i] || yard[i] || made[i] || deck[i]) return false;
    const half = BROAD[kind] || 0;
    for (let dy = 0; dy <= (half ? 1 : 0); dy++) for (let dx = -half; dx <= half; dx++) { const j = i + dy * w + dx; if (!inside(x + dx, y + dy) || H[j] !== H[i] || wet[j] || shut[j] || yard[j]) return false; }
    // Nothing stands on the lip of a cliff or at its very foot: the ground a few cells round it
    // is within a step of its own.
    for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) if (!inside(x + dx, y + dy) || Math.abs(H[i + dy * w + dx] - H[i]) > STEP) return false;
    if (!SMALL.has(kind) && roadBehind(x, y)) return false;
    return kind !== 'reeds' || waterNear(x, y);
  };
  const standing = plan.things.filter((t) => !FLAT.has(t.kind) && !SHAPED.has(t.kind) && !spire(t) && mayStand(t.kind, Math.min(w - 1, t.x), Math.min(rows - 1, t.y)))
    .map((t) => ({ x: t.x * ART, z: depthOf(t.y * ART), lift: heightAt(t.x * ART, t.y * ART), grow: GROW[t.kind] || 1, art: spritePixels(t.kind, (t.x + t.y) % 3) }));
  yield;
  // Woods fill the foothills along the back, each land with its own kind of tree, up to where the
  // rock begins.
  const WOODS = { camp: 'oak', forest: 'pine', lake: 'oak', autumn: 'maple', highland: 'pine', snow: 'snowpine', alpine: 'pine', grove: 'bigshroom', crystal: 'crystal', dusk: 'bigshroom', desert: 'palm' };
  for (let k = 0; k < Math.round(w * 1.3); k++) {
    const x = Math.floor(grain(k, 1, 40) * w);
    const y = 3 + Math.floor(grain(k, 2, 41) * (BACK + 14));
    const far = looks[x].far;
    const kind = grain(k, 3, 42) < 0.8 ? WOODS[lands[x]] : 'rock';
    if (!mayStand(kind, x, y)) continue;
    if (kind !== 'rock' && (H[y * w + x] >= Math.min(far.rock, far.snow || 999) || grain(k, 4, 43) > far.woods + 0.35)) continue;
    standing.push({ x: x * ART, z: depthOf(y * ART), lift: H[y * w + x], grow: Math.min(1.5, (GROW[kind] || 1) * 1.15), art: spritePixels(kind, k % 3) });
  }
  // A flag flies from each keep.
  for (const b of built) if (b.kind === 'castle') { const cx = b.x + (CASTLE * BLOCK) / 2; const cy = b.y + (CASTLE * BLOCK) / 2; standing.push({ x: cx * ART, z: depthOf(cy * ART), lift: H[cy * w + cx], grow: 1.6, art: spritePixels('flag', 0) }); }
  standing.sort((a, b) => a.z - b.z);

  yield;
  // Animals. Each needs room in its own land: water under the whole of a boat or a duck wherever
  // it drifts, dry level ground the whole way a sheep walks. None is hidden behind higher land.
  const critters = [];
  const hidden = (x, y) => { const z0 = depthOf(y * ART); const mine = (CAM_H - H[y * w + x] - 10) / z0; for (let yy = y + 2; yy < rows; yy += 2) if ((CAM_H - H[yy * w + x]) / depthOf(yy * ART) < mine) return true; return false; };
  // An animal standing just in front of a road would cover it, so it keeps as far back as it is tall.
  const front = new Uint8Array(w * rows);
  for (let x = 0; x < w; x++) { let since = 99; for (let y = 0; y < rows; y++) { since = road[y * w + x] ? 0 : since + 1; if (since <= 9) front[y * w + x] = 1; } }
  const ground = { w, h: rows, wet: (i) => wet[i], high: (i) => H[i], shut: (i) => shut[i] || yard[i] || made[i] || deck[i] || front[i] };
  spans.forEach((sp, i) => {
    const list = HABITATS[landFor(i)] || [];
    const x0 = Math.ceil(sp.x0 / ART);
    const wide = Math.floor((sp.x1 - sp.x0) / ART) - 1;
    list.forEach(([kind, count, wanted, where], n) => {
      let placed = 0;
      const here = [];
      // An animal that walks or drifts needs a clear run. Where the land gives it none, it stays
      // where it is and only shifts on its feet, which needs no more room than it stands on.
      for (const move of wanted === 'roam' || wanted === 'hop' || wanted === 'bob' ? [wanted, 'idle'] : [wanted]) {
        for (let k = 0; k < count * 500 && placed < count; k++) {
          const x = x0 + Math.floor(grain(k, i * 10 + n, 50) * wide);
          const y = BACK + 6 + Math.floor(grain(k, i * 10 + n, 51) * (rows - BACK - 14));
          if (!canLive(kind, move, where, x, y, ground) || hidden(x, y)) continue;
          // Two of a kind keep apart, so they never walk through each other.
          if (here.some((o) => Math.abs(o.x - x) < 40 && Math.abs(o.y - y) < 8)) continue;
          here.push({ x, y });
          critters.push({ kind, move, x: x * ART, z: depthOf(y * ART), lift: H[y * w + x] + (move === 'flit' || move === 'twinkle' ? 10 + grain(k, n, 52) * 16 : 0), beat: grain(k, n, 53) });
          placed++;
        }
      }
    });
  });
  const stopsAt = new Map(sites.map((s) => [s.n.id, { back: s.back, half: s.half, lift: H[Math.max(0, s.baseRow) * w + s.cx] }]));
  return { nodes, byId, spans, width, w, rows, H, C, S, D, hole, fw, FH, FC, FS, heightAt, standing, critters, at, stopsAt };
}

const CROWD = 8; // how many characters are drawn at one stop
/**
 * Times the slow parts, so they can be read on a real Chromebook: in DevTools' Performance panel,
 * or in the console with performance.getEntriesByType('measure').
 */
function timed(name, work) {
  const from = performance.now();
  const out = work();
  note(name, from, performance.now());
  return out;
}
function note(name, start, end, detail = null) {
  try { performance.measure(`map3d ${name}`, { start, end, detail }); } catch (_) { /* an older browser: no timing */ }
}
// A built world is kept for the visit, one for each road it can be drawn for (the road is all it
// depends on), so coming back to the map does not build it again. It is far too big for storage.
const worlds = new Map();
const building = new Map();
/** Whether the world for this road is already built, so the map can be made without a wait. */
export const worldBuilt = (myPath = null) => worlds.has(myPath || '');
const worldFor = (myPath) => {
  const key = myPath || '';
  if (!worlds.has(key)) worlds.set(key, timed('buildWorld', () => { const steps = buildWorld(myPath); let step = steps.next(); while (!step.done) step = steps.next(); return step.value; }));
  return worlds.get(key);
};
const SLICE = 30; // milliseconds of building before the page gets a turn
/**
 * Build the world for this road without freezing the page: a slice of work, then a pause in which
 * the page can draw and answer a click, until it is done. Resolves when `buildMap3d` will be quick.
 */
export function prepareWorld(myPath = null) {
  const key = myPath || '';
  if (worlds.has(key)) return Promise.resolve();
  if (!building.has(key)) {
    const steps = buildWorld(myPath);
    const began = performance.now();
    let worked = 0;
    let longest = 0;
    building.set(key, new Promise((resolve, reject) => {
      const more = () => {
        const from = performance.now();
        try {
          let step = steps.next();
          while (!step.done && performance.now() - from < SLICE) step = steps.next();
          const took = performance.now() - from;
          worked += took;
          if (took > longest) longest = took;
          if (!step.done) { setTimeout(more, 0); return; }
          if (!worlds.has(key)) worlds.set(key, step.value);
          note('buildWorld', began, performance.now(), { worked: Math.round(worked), longest: Math.round(longest) });
          building.delete(key);
          resolve();
        } catch (e) { building.delete(key); reject(e); }
      };
      setTimeout(more, 0);
    }));
  }
  return building.get(key);
}

/** The 3D map. Returns the element to put on the page. */
export function buildMap3d({ board, meId = null, myPath = null, myDone = new Set(), onNode }) {
  const world = worldFor(myPath);
  const { nodes, byId, spans, width, w, rows, H, C, S, D, hole, fw, FH, FC, FS, heightAt, standing, critters, at, stopsAt } = world;
  const canvas = h('canvas.map3d-canvas', { 'aria-hidden': 'true' });
  const overlay = h('div.map3d-overlay');
  const stage = h('div.map3d-stage', canvas, overlay);
  // Scrolling moves the camera. The middle trail moves at the speed of the scroll bar.
  const SPEED = (STRETCH * ZOOM) / MID;
  const spacer = h('div.map3d-spacer', { style: `width:${Math.round((width - EDGE * 2) * SPEED + 200)}px` });
  const scroller = h('div.map-scroll.map3d', { tabindex: 0, role: 'group', 'aria-label': 'Journey map in 3D, scrollable. Details are in the table below.' }, stage, spacer);

  // Stops and characters are ordinary page elements placed over the picture, so they stay sharp,
  // can be clicked and tabbed to, and are never hidden behind a hill.
  const myOrder = [...(myPath ? sequence(myPath) : sequence(null)), ...nodes.filter((n) => n.side).map((n) => n.id)];
  const myCurrent = meId ? currentLesson(myPath, myDone) : null;
  const groups = new Map();
  for (const s of board) { const id = standingOn(s); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(s); }
  const landOf = (x) => { let i = 0; while (i + 1 < spans.length && x >= spans[i + 1].x0) i++; return landFor(i); };
  const counts = new Map();
  const lastCore = sequence(null).filter((id) => { const n = byId.get(id); return n && !n.beyond; }).at(-1);
  const pins = nodes.map((n) => {
    const lesson = getLesson(n.id);
    // Every stop is a little building: which one depends on its land and its road.
    const land = landOf(at(n).x);
    const turn = `${land}:${n.lane}`;
    counts.set(turn, (counts.get(turn) || 0) + 1);
    const building = stopKind({ lane: n.lane, side: n.side, land, k: counts.get(turn) - 1, summit: n.id === lastCore });
    const onMyRoad = myOrder.includes(n.id);
    const state = myDone.has(n.id) ? 'done' : n.id === myCurrent ? 'current' : 'todo';
    const clickable = !!(onNode && onNode.can(n.id, onMyRoad, state));
    const people = groups.get(n.id) || [];
    // Up to eight stand here, in two rows once there are more than three. You are always one of
    // them, at the front and nearest the stop. The count opens the full list of names.
    const others = people.filter((s) => s.id !== meId);
    const me = people.find((s) => s.id === meId);
    const shown = [...others.slice(0, me ? CROWD - 1 : CROWD), ...(me ? [me] : [])];
    const { slots, first } = crowdSlots(shown.length);
    const places = me ? [...slots.filter((_, k) => k !== first), slots[first]] : slots;
    const crowd = shown.map((s, k) => ({ s, ...places[k] })).sort((a, b) => a.row - b.row || a.x - b.x);
    const rows = Math.max(0, ...crowd.map((c) => c.row)) + 1;
    // Far-off stops are closer together on screen, so their names are cut shorter.
    const room = n.lane < -1 ? 12 : n.lane < 0 ? 14 : 17;
    const name = lesson.title.length > room ? `${lesson.title.slice(0, room - 1)}…` : lesson.title;
    const el = h('div.pin', { class: `${state}${onMyRoad || !meId ? '' : ' offroad'}` },
      h(clickable ? 'button.pin-stop' : 'div.pin-stop', {
        type: clickable ? 'button' : null, title: `${lesson.title} · about ${lesson.mins} minutes · ${lesson.concepts.join(', ')}`,
        'aria-label': `${lesson.title}${state === 'done' ? ', done' : state === 'current' ? ', your next lesson' : ''}`,
        onclick: clickable ? () => onNode.go(n.id) : null,
      },
        h('img', { src: stopArt(building), alt: '', width: STOP_SIZE * 3, height: STOP_SIZE * 3 }),
        // A small disc in the road's colour says where you stand with it: done, next, or not yet.
        h('span.pin-badge', { style: n.path ? `border-color:${PATHS[n.path].color}` : null }, state === 'done' ? '✓' : n.id === myCurrent ? '▶' : '')),
      // Characters stand on the road in front of their stop, each with a shadow at their feet.
      crowd.length > 0 && h('div.pin-people', { translate: 'no', class: crowd.length > 3 ? 'crowd' : '' },
        crowd.map(({ s, x, y, row }) => h('span.pin-person', { class: `${s.id === meId ? 'me' : ''}${row < rows - 1 ? ' behind' : ''}`, title: s.display_name, style: `left:${x}px;top:${y}px;z-index:${row + (s.id === meId ? 1 : 0)}` },
          h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 3), alt: '' }),
          s.id === meId && h('span.pin-you', 'YOU'))),
        people.length > 1 && h('button.pin-count', { type: 'button', style: `left:${Math.round((Math.max(...crowd.map((c) => c.x)) + Math.min(...crowd.map((c) => c.x))) / 2)}px;top:${-64 - rows * 5}px`, 'aria-label': `${people.length} people here. Show names.`, onclick: (e) => { e.stopPropagation(); showCrowd(n.id, people); } }, String(people.length))),
      h('div.pin-name', name));
    const p = at(n);
    const z = depthOf(p.y);
    const lift = heightAt(p.x, p.y);
    const stop = stopsAt.get(n.id);
    // The name hangs just below the road, clear of its kerb, however far away the road is.
    el.style.setProperty('--drop', `${Math.round((stop.half * (CAM_H - lift) * ZOOM * DEEPER) / (z * z) / sizeOf(z) + 3)}px`);
    return { el, x: p.x, z, lift, bz: depthOf(p.y - stop.back), blift: stop.lift, busy: crowd.length > 0 || state === 'current' };
  });
  // Each stage's name hangs over the middle of its own stops.
  const signs = spans.map(({ st, ids }) => { const xs = ids.map((id) => at(byId.get(id)).x); return { el: h('div.map3d-sign', st.mapName || st.name), x: (Math.min(...xs) + Math.max(...xs)) / 2 }; });
  // Animals are small page elements too, each with its own slow movement.
  const beasts = critters.map((c) => {
    const art = critterArt(c.kind);
    const el = h('div.critter', { class: c.move, 'aria-hidden': 'true' }, h('img', { src: art.url, alt: '', style: `animation-delay:${(-c.beat * 9).toFixed(1)}s;animation-duration:${(5 + c.beat * 6).toFixed(1)}s` }));
    return { ...c, el, art };
  });
  // Flocks of birds hang at fixed places in the sky. They belong to the world, not
  // the screen: scrolling slides them past, slower than the land, so they read as far away.
  const SKY_SLIDE = 0.3;
  const skyWide = Math.round((width - EDGE * 2) * SPEED * SKY_SLIDE) + 1600;
  const sky2 = h('div.map3d-sky', { 'aria-hidden': 'true', style: `width:${skyWide}px` },
    Array.from({ length: Math.ceil(skyWide / 480) }, (_, k) => h('div.flock', { style: `left:${90 + k * 480 + Math.round(grain(k, 5, 64) * 160)}px;top:${62 + Math.round(grain(k, 6, 65) * 40)}px;animation-delay:${(-grain(k, 7, 66) * 30).toFixed(1)}s` },
      [0, 1, 2, 3].map((b) => h('img.bird', { src: critterArt('bird').url, alt: '', style: `left:${b * 17}px;top:${(b % 2) * 9 + b * 2}px` })))));
  overlay.append(sky2, ...beasts.map((b) => b.el), ...signs.map((s) => s.el), ...pins.map((p) => p.el));

  let W = 0;
  let HI = 0;
  let image = null;
  let buf = null;
  let ybuf = null;
  let taken = null;
  let before = null;
  let sky = null;
  const g = canvas.getContext('2d');
  const FOG = [222, 234, 242];
  const CAVE = pack(30, 24, 44);
  const CAVE_FLOOR = pack(64, 50, 70);

  function resize() {
    const wide = Math.max(320, scroller.clientWidth);
    W = Math.ceil(wide / PX);
    HI = VIEW_H / PX;
    canvas.width = W;
    canvas.height = HI;
    image = g.createImageData(W, HI);
    buf = new Uint32Array(image.data.buffer);
    ybuf = new Int32Array(W);
    taken = new Uint8Array(W * HI);
    before = new Float32Array(W);
    // The sky is the same every frame: pale at the horizon, bluer above.
    sky = new Uint32Array(HI);
    for (let y = 0; y < HI; y++) { const k = Math.min(1, y / (HORIZON / PX + 30)); sky[y] = pack(138 + 88 * k, 190 + 46 * k, 234 + 6 * k); }
  }

  function draw() {
    if (!W) resize();
    const cx = (W * PX) / 2;
    const camX = EDGE + (scroller.scrollLeft + cx) / SPEED;
    for (let y = 0; y < HI; y++) buf.fill(sky[y], y * W, (y + 1) * W);
    // Mountains loom behind the land in two ranges. The far one is tall, pale, and capped with snow;
    // the near one is lower and darker. Each slides at its own speed as you scroll, which is what
    // makes them feel a long way off.
    const foot = Math.round((HORIZON + (CAM_H * ZOOM) / FAR) / PX) + 2;
    for (let i = 0; i < W; i++) {
      for (const range of RANGES) {
        const u = i * PX + camX * range.slide;
        const tall = Math.round(peaks(u, range) / PX);
        // Light comes from one side: a slope is bright or shaded by the big shapes only, so each
        // mountain has two broad faces. The snow line dips and rises a little along the range.
        const lit = broad(u + 6, range) > broad(u, range);
        const snow = range.snow ? Math.round(tall * 0.3 + crag(u / 61) * 6 + crag(u / 19) * 2 - 3) : 0;
        const top = foot - tall;
        for (let y = Math.max(0, top); y < foot; y++) {
          // Haze thickens toward the foot, so the range seems to rise out of the distance.
          const haze = Math.max(0, (y - top) / Math.max(1, tall)) * range.haze;
          // Snow thins out in a ragged edge where it meets the rock.
          const white = y - top < snow - ((i + y) % 3 === 0 && y - top > snow - 4 ? 3 : 0);
          const c = white ? (lit ? range.snowLit : range.snowDark) : (lit ? range.lit : range.dark);
          buf[y * W + i] = pack(c[0] + (FOG[0] - c[0]) * haze, c[1] + (FOG[1] - c[1]) * haze, c[2] + (FOG[2] - c[2]) * haze);
        }
      }
    }
    ybuf.fill(HI);
    taken.fill(0);

    // What stands up, nearest first, and only what is on screen.
    const seen = standing.filter((s) => { const sx = cx + ((s.x - camX) * STRETCH * ZOOM) / s.z; return sx > -80 && sx < W * PX + 80; });
    let next = 0;
    const plant = (s) => {
      const scale = (ART * 1.25 * s.grow * ZOOM) / s.z / PX;
      const dw = Math.round(s.art.w * scale);
      const dh = Math.round(s.art.h * scale);
      const left = Math.round((cx + ((s.x - camX) * STRETCH * ZOOM) / s.z) / PX - s.art.ox * scale);
      const top = Math.round((HORIZON + ((CAM_H - s.lift) * ZOOM) / s.z) / PX - s.art.oy * scale);
      for (let yy = 0; yy < dh; yy++) {
        const py = top + yy;
        if (py < 0 || py >= HI) continue;
        const from = Math.min(s.art.h - 1, Math.floor(yy / scale)) * s.art.w;
        for (let xx = 0; xx < dw; xx++) {
          const px = left + xx;
          if (px < 0 || px >= W || py >= ybuf[px]) continue;
          const c = s.art.data[from + Math.min(s.art.w - 1, Math.floor(xx / scale))];
          if ((c >>> 24) < 200) continue;
          const i = py * W + px;
          if (!taken[i]) { buf[i] = c; taken[i] = 1; }
        }
      }
    };

    before.fill(1e9);
    // One strip of ground for each row of the picture or each pixel of the screen, whichever is
    // coarser, so near ground is not drawn twice and far ground is not skipped.
    for (let z = NEAR; z < FAR; z += Math.max(0.0075, (1.7 * z * z) / (CAM_H * ZOOM))) {
      while (next < seen.length && seen[next].z <= z) plant(seen[next++]);
      let row = Math.floor(rowOf(z) / ART);
      if (row >= rows) continue;
      // Past the back of the picture is the far country, which is kept a block to a cell.
      const far = row < 0;
      if (far) row = Math.min(FAR_ROWS - 1, (-row - 1) >> 2);
      const heights = far ? FH : H;
      const tops = far ? FC : C;
      const sides = far ? FS : S;
      const deeps = far ? FS : D;
      const shift = far ? 2 : 0;
      const base = row * (far ? fw : w);
      const s = ZOOM / z;
      const perCol = PX / (s * STRETCH) / ART;
      let ax = (camX + (1 - cx) / (s * STRETCH)) / ART;
      // Distance pales the land a little, but never so much that its shapes are lost.
      const fog = z > 2.9 ? Math.min(0.5, (z - 2.9) / 7.5) : 0;
      const lift = HORIZON / PX;
      const k = s / PX;
      for (let i = 0; i < W; i++, ax += perCol) {
        // Past either end of the trail the land carries on, as a mirror image of what is there.
        let a = ax | 0;
        if (a < 0) a = -a; else if (a >= w) a = 2 * w - 1 - a;
        if (a < 0) a = 0; else if (a >= w) a = w - 1;
        const cell = base + (a >> shift);
        const tall = heights[cell];
        let y = (lift + (CAM_H - tall) * k) | 0;
        if (y < 0) y = 0;
        const stop = ybuf[i];
        // `before` remembers how high the ground was at the last strip, just nearer the camera.
        const rise = tall - before[i];
        before[i] = tall;
        if (y >= stop) continue;
        let c = tops[cell];
        // Where this ground stands higher than the ground in front of it, the lower part of what
        // shows is the side of a block. It gets earth or stone, with a line at every block.
        const face = rise > 1 ? Math.min(stop - y, Math.round(rise * k)) : 0;
        if (fog) c = pack((c & 255) + (FOG[0] - (c & 255)) * fog, ((c >> 8) & 255) + (FOG[1] - ((c >> 8) & 255)) * fog, ((c >> 16) & 255) + (FOG[2] - ((c >> 16) & 255)) * fog);
        const top = stop - face;
        let at2 = y * W + i;
        for (let yy = y; yy < top; yy++, at2 += W) if (!taken[at2]) buf[at2] = c;
        if (face) {
          const side = sides[cell];
          const deep = deeps[cell];
          const seam = a % BLOCK === 0 ? 0.76 : 1;
          const grassy = c;
          const mouth = far ? 0 : hole[cell];
          for (let yy = top; yy < stop; yy++, at2 += W) {
            if (taken[at2]) continue;
            // How far down the side this pixel is, in world height: darker at each block line,
            // lighter just under the lip, and shaded more toward the bottom. Under the first
            // few blocks of earth the side is stone.
            const down = (yy - top) / k;
            const line = down % STEP < 1.6 ? 0.7 : 1;
            let px;
            if (mouth && rise - down < mouth) px = rise - down > mouth - 3 ? tone(deep, 0.5) : rise - down < 5 ? CAVE_FLOOR : CAVE;
            else if (down < 2.2) px = tone(grassy, 0.78);
            else px = tone(down > STEP * 3 ? deep : side, seam * line * (0.9 - Math.min(0.34, down / 300)) * (0.93 + grain(a, (down / 3) | 0, 6) * 0.14));
            if (fog) px = pack((px & 255) + (FOG[0] - (px & 255)) * fog, ((px >> 8) & 255) + (FOG[1] - ((px >> 8) & 255)) * fog, ((px >> 16) & 255) + (FOG[2] - ((px >> 16) & 255)) * fog);
            buf[at2] = px;
          }
        }
        ybuf[i] = y;
      }
    }
    while (next < seen.length) plant(seen[next++]);
    g.putImageData(image, 0, 0);

    // Put each stop where its piece of ground landed, sized by how far away it is.
    const wide = W * PX;
    for (const p of pins) {
      // A pin is placed where its building is, across the screen, and where its road is, down it.
      // The building is a little further away than the road, so at the edges of the view the two
      // are not quite in line; following the building keeps it on its own plot, with its people
      // and its name in front of it.
      const sx = cx + ((p.x - camX) * STRETCH * ZOOM) / p.bz;
      if (sx < -120 || sx > wide + 120) { p.el.style.display = 'none'; continue; }
      const sy = HORIZON + ((CAM_H - p.lift) * ZOOM) / p.z;
      // A stop on the far road is well under half the size of one on the near road.
      const size = sizeOf(p.z);
      p.el.style.display = '';
      // The building stands on its own piece of ground, a little behind the road.
      const bsize = sizeOf(p.bz) / size;
      p.el.style.setProperty('--by', `${((HORIZON + ((CAM_H - p.blift) * ZOOM) / p.bz - sy) / size).toFixed(1)}px`);
      p.el.style.setProperty('--bs', bsize.toFixed(3));
      p.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) scale(${size.toFixed(3)})`;
      // Nearer stops sit in front of further ones, and anyone standing on one comes to the front.
      p.el.style.zIndex = String(Math.round(300 - p.z * 100) + (p.busy ? 200 : 0));
      // Names would be too small to read at that distance, so they shrink less than the stop does.
      p.el.style.setProperty('--name', (size < 0.86 ? 0.86 / size : 1).toFixed(3));
    }
    sky2.style.transform = `translateX(${-Math.round(scroller.scrollLeft * SKY_SLIDE)}px)`;
    for (const b of beasts) {
      const sx = cx + ((b.x - camX) * STRETCH * ZOOM) / b.z;
      if (sx < -60 || sx > wide + 60) { b.el.style.display = 'none'; continue; }
      const sy = HORIZON + ((CAM_H - b.lift) * ZOOM) / b.z;
      const size = (ART * 1.25 * ZOOM) / b.z;
      b.el.style.display = '';
      b.el.style.width = `${Math.round(b.art.w * size)}px`;
      b.el.style.transform = `translate(${Math.round(sx - (b.art.w * size) / 2)}px, ${Math.round(sy - b.art.h * size)}px)`;
      b.el.style.zIndex = String(Math.round(90 - b.z * 30));
    }
    for (const s of signs) {
      const sx = cx + ((s.x - camX) * STRETCH * ZOOM) / MID;
      s.el.style.display = sx < -100 || sx > wide + 100 ? 'none' : '';
      s.el.style.transform = `translate(${Math.round(sx)}px, 0) translateX(-50%)`;
    }
  }

  let queued = false;
  const redraw = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; if (scroller.isConnected) draw(); }); };
  scroller.addEventListener('scroll', redraw, { passive: true });
  const watcher = new ResizeObserver(() => { resize(); redraw(); });
  watcher.observe(scroller);
  // Arrow keys move along the trail when the map has the keyboard.
  scroller.addEventListener('keydown', (e) => { if (e.target !== scroller) return; if (e.key === 'ArrowRight') scroller.scrollLeft += 120; if (e.key === 'ArrowLeft') scroller.scrollLeft -= 120; });

  /** Bring a stop to the middle of the view. */
  scroller.centerOn = (id) => { const n = byId.get(id); if (n) scroller.scrollLeft = (at(n).x - EDGE) * SPEED - scroller.clientWidth / 2; };
  requestAnimationFrame(() => { resize(); timed('first draw', draw); });
  return scroller;
}
