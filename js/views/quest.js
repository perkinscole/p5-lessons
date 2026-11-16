// Trail Quest: a small adventure students play as their own character, with time earned by
// finishing lessons. The whole game runs here in the browser. The server is only asked when a run
// starts and when it ends, so a class playing at once costs almost nothing.
import { h, clear, toast, attempt, modal } from '../ui.js';
import { app, render, refreshSession } from '../main.js';
import { getSettings } from '../settings.js';
import { avatarURL, defaultAvatar, petURL } from '../game/avatar.js';
import { installSynth } from '../game/synth.js';
import { TILE, W, H, T, generateWorld, regionAt, isSolid, powersFor, POWERS, GHOST_STEP, encodePath, decodePath, ghostAt } from '../game/quest.js';

const synth = installSynth({}, {});
const sfx = (name) => { if (getSettings().gameSound) { try { synth.playSound(name); } catch (_) { /* no audio here */ } } };

const VIEW_W = 480;
const VIEW_H = 304;
const clock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const loadImage = (src) => new Promise((resolve) => { if (!src) { resolve(null); return; } const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src; });

// Drawing ------------------------------------------------------------------------------------------
const FLOOR = { meadow: ['#74c365', '#6cbb5e'], forest: ['#4f9a4a', '#488f44'], cave: ['#4b4560', '#463f59'], ruins: ['#c2b18d', '#b9a883'] };
function drawTile(g, world, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const tile = world.tiles[ty * W + tx];
  const region = regionAt(tx, ty);
  const px = (dx, dy, w, hh, color) => { g.fillStyle = color; g.fillRect(x + dx, y + dy, w, hh); };
  px(0, 0, TILE, TILE, FLOOR[region][(tx + ty) % 2]);
  if (region === 'ruins' && !isSolid(tile)) { px(0, 15, 16, 1, '#a89671'); px(15, 0, 1, 16, '#a89671'); }
  if (tile === T.FLOWER) { px(4, 5, 2, 2, '#ffffff'); px(10, 10, 2, 2, '#ffd84a'); px(11, 3, 2, 2, '#ff8fb8'); }
  if (tile === T.TREE) {
    px(0, 0, 16, 16, region === 'forest' ? '#2d6b38' : FLOOR[region][0]);
    px(7, 10, 3, 6, '#6b4a2b');
    px(2, 2, 12, 9, '#2b7a3d'); px(4, 0, 8, 12, '#2b7a3d'); px(4, 2, 4, 3, '#49a35a');
  }
  if (tile === T.WALL) {
    const [dark, light, line] = region === 'ruins' ? ['#8a7858', '#a39070', '#6e5f44'] : ['#2f2a3d', '#4a435c', '#221e2d'];
    px(0, 0, 16, 16, dark); px(0, 0, 16, 5, light); px(0, 5, 16, 1, line); px(0, 11, 16, 1, line); px(7, 6, 1, 5, line); px(3, 12, 1, 4, line); px(12, 12, 1, 4, line);
  }
  if (tile === T.PILLAR) { px(4, 2, 8, 13, '#8a7858'); px(3, 1, 10, 3, '#a39070'); px(3, 13, 10, 2, '#6e5f44'); px(6, 4, 1, 9, '#6e5f44'); }
  if (tile === T.ROCK) { px(2, 3, 12, 11, '#8d8794'); px(4, 1, 8, 14, '#8d8794'); px(4, 3, 5, 3, '#aaa5b0'); px(8, 4, 1, 5, '#3d3846'); px(6, 8, 3, 1, '#3d3846'); px(9, 9, 1, 4, '#3d3846'); }
}
const SPRITES = {
  coin: (g, x, y, t) => { const b = Math.round(Math.sin(t * 5 + x) * 1.5); g.fillStyle = '#c98a12'; g.fillRect(x - 3, y - 4 + b, 6, 8); g.fillStyle = '#ffd23f'; g.fillRect(x - 2, y - 4 + b, 4, 7); g.fillStyle = '#fff3b0'; g.fillRect(x - 1, y - 3 + b, 1, 3); },
  gem: (g, x, y, t) => { const b = Math.round(Math.sin(t * 4 + y) * 1.5); g.fillStyle = '#1c8fb8'; g.fillRect(x - 4, y - 2 + b, 8, 3); g.fillRect(x - 2, y - 4 + b, 4, 8); g.fillStyle = '#7fe9ff'; g.fillRect(x - 2, y - 3 + b, 3, 3); },
  chest: (g, x, y) => { g.fillStyle = '#5c3a1a'; g.fillRect(x - 6, y - 5, 12, 10); g.fillStyle = '#9a6530'; g.fillRect(x - 5, y - 4, 10, 4); g.fillStyle = '#ffd23f'; g.fillRect(x - 6, y, 12, 1); g.fillRect(x - 1, y - 1, 2, 3); },
  slime: (g, x, y, t) => { const s = Math.round(Math.sin(t * 6 + x) * 1); g.fillStyle = '#2f7fd6'; g.fillRect(x - 6, y - 2 - s, 12, 7 + s); g.fillRect(x - 4, y - 4 - s, 8, 3); g.fillStyle = '#0f1f45'; g.fillRect(x - 3, y - 1 - s, 2, 2); g.fillRect(x + 1, y - 1 - s, 2, 2); },
  bat: (g, x, y, t) => { const f = Math.sin(t * 14) > 0 ? 2 : -1; g.fillStyle = '#8a5fd0'; g.fillRect(x - 2, y - 2, 4, 5); g.fillRect(x - 7, y - 2 + f, 5, 2); g.fillRect(x + 2, y - 2 + f, 5, 2); g.fillStyle = '#ffe14d'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); },
  guard: (g, x, y, t) => { const b = Math.round(Math.sin(t * 3 + x) * 1); g.fillStyle = '#e9e4f5'; g.fillRect(x - 5, y - 6 + b, 10, 10); g.fillRect(x - 5, y + 4 + b, 2, 2); g.fillRect(x - 1, y + 4 + b, 2, 2); g.fillRect(x + 3, y + 4 + b, 2, 2); g.fillStyle = '#3b2f5c'; g.fillRect(x - 3, y - 3 + b, 2, 3); g.fillRect(x + 1, y - 3 + b, 2, 3); },
};

// One run -------------------------------------------------------------------------------------------
// Solo, every movement key drives the one player. With two players on one Chromebook, the left hand
// side of the keyboard is player 1 and the arrow keys are player 2.
const SOLO_KEYS = { ArrowLeft: '0l', a: '0l', ArrowRight: '0r', d: '0r', ArrowUp: '0u', w: '0u', ArrowDown: '0d', s: '0d', ' ': '0dash' };
const DUO_KEYS = { a: '0l', d: '0r', w: '0u', s: '0d', ' ': '0dash', ArrowLeft: '1l', ArrowRight: '1r', ArrowUp: '1u', ArrowDown: '1d', Enter: '1dash' };
const MARKS = ['#ffd23f', '#5cd3ff'];

/**
 * Play one run on `canvas`.
 *   team:   one or two players, each { name, avatar, heroImg, petImg }
 *   ghosts: classmates' recorded runs in this same world, each { name, img, points }
 * Calls onHud as things change and onEnd({ seconds, coins, seed, path }) once. Returns { stop, finish }.
 */
function startRun({ canvas, seed, team, ghosts, seconds, onHud, onEnd }) {
  const world = generateWorld(seed);
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const map = document.createElement('canvas');
  map.width = W * TILE;
  map.height = H * TILE;
  const mg = map.getContext('2d');
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) drawTile(mg, world, tx, ty);
  const shade = document.createElement('canvas');
  shade.width = VIEW_W;
  shade.height = VIEW_H;
  const sg = shade.getContext('2d');

  const players = team.map((m, i) => {
    const powers = powersFor(m.avatar);
    const x = world.start.x + i * 16;
    return { ...m, n: i, powers, x, y: world.start.y, hearts: powers.hearts, safe: 0, dashT: 0, dashCd: 0, fx: 0, fy: 1, pet: { x: x - 12, y: world.start.y } };
  });
  const duo = players.length > 1;
  const floats = [];
  const trail = [];
  let coins = 0;
  let left = seconds;
  let dark = 0;
  let time = 0;
  let over = false;
  let hinted = false;
  let note = '';
  let noteT = 0;
  const say = (text) => { note = text; noteT = 2.6; };
  const hud = () => onHud({ coins, left, note: noteT > 0 ? note : '', players: players.map((pl) => ({ hearts: pl.hearts, max: pl.powers.hearts, dash: pl.powers.dash, dashReady: pl.dashCd <= 0 })) });

  const tileAt = (x, y) => { const tx = Math.floor(x / TILE); const ty = Math.floor(y / TILE); return tx < 0 || ty < 0 || tx >= W || ty >= H ? T.WALL : world.tiles[ty * W + tx]; };
  const CORNERS = (r) => [[-r, -r], [r, -r], [-r, r], [r, r]];
  const blocked = (x, y, r) => CORNERS(r).some(([dx, dy]) => isSolid(tileAt(x + dx, y + dy)));
  /** Move on each axis separately, so you slide along walls. Returns the rock you bumped, if any. */
  function move(body, dx, dy, r) {
    let rock = null;
    for (const [mx, my] of [[dx, 0], [0, dy]]) {
      if (!mx && !my) continue;
      if (!blocked(body.x + mx, body.y + my, r)) { body.x += mx; body.y += my; continue; }
      for (const [cx, cy] of CORNERS(r)) if (tileAt(body.x + mx + cx, body.y + my + cy) === T.ROCK) rock = [Math.floor((body.x + mx + cx) / TILE), Math.floor((body.y + my + cy) / TILE)];
      body.hit = true;
    }
    return rock;
  }
  const regionOf = (o) => regionAt(Math.floor(o.x / TILE), Math.floor(o.y / TILE));
  const nearest = (o) => players.reduce((a, b) => (Math.hypot(a.x - o.x, a.y - o.y) <= Math.hypot(b.x - o.x, b.y - o.y) ? a : b));

  const keys = new Set();
  const KEYMAP = duo ? DUO_KEYS : SOLO_KEYS;
  const keyOf = (e) => KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  const onDown = (e) => { const k = keyOf(e); if (!k || e.target.closest?.('input, textarea, select')) return; e.preventDefault(); keys.add(k); };
  const onUp = (e) => { const k = keyOf(e); if (k) keys.delete(k); };
  const onBlur = () => keys.clear();
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);

  function hurt(pl, from) {
    if (pl.safe > 0) return;
    pl.hearts -= 1;
    pl.safe = 1.3;
    sfx('hurt');
    const d = Math.hypot(pl.x - from.x, pl.y - from.y) || 1;
    move(pl, ((pl.x - from.x) / d) * 10, ((pl.y - from.y) / d) * 10, 5);
    if (pl.hearts <= 0) {
      const lost = Math.min(coins, 10);
      coins -= lost;
      // Alone, you wake up back at camp. With a partner, you wake up beside them.
      const mate = players.find((o) => o !== pl);
      pl.x = mate ? mate.x : world.start.x;
      pl.y = mate ? mate.y : world.start.y;
      pl.hearts = pl.powers.hearts;
      pl.safe = 2;
      say(lost ? `Knocked out! You dropped ${lost} coins.` : 'Knocked out!');
      sfx('lose');
    }
    hud();
  }

  function stepPlayer(pl, dt) {
    pl.safe = Math.max(0, pl.safe - dt);
    const wasReady = pl.dashCd <= 0;
    pl.dashCd = Math.max(0, pl.dashCd - dt);
    if (!wasReady && pl.dashCd <= 0) hud();
    const on = (k) => keys.has(`${pl.n}${k}`);
    let ix = (on('r') ? 1 : 0) - (on('l') ? 1 : 0);
    let iy = (on('d') ? 1 : 0) - (on('u') ? 1 : 0);
    if (ix && iy) { ix *= 0.707; iy *= 0.707; }
    if (ix || iy) { pl.fx = ix; pl.fy = iy; }
    pl.moving = !!(ix || iy);
    if (on('dash') && pl.powers.dash && pl.dashCd <= 0) { pl.dashT = 0.18; pl.dashCd = 1.5; sfx('dash'); hud(); }
    keys.delete(`${pl.n}dash`);
    let dx = ix * 78 * dt;
    let dy = iy * 78 * dt;
    if (pl.dashT > 0) { pl.dashT -= dt; const n = Math.hypot(pl.fx, pl.fy) || 1; dx = (pl.fx / n) * 240 * dt; dy = (pl.fy / n) * 240 * dt; }
    // Partners share one screen, so neither can walk off it.
    const mate = players.find((o) => o !== pl);
    if (mate) {
      if (Math.abs(pl.x + dx - mate.x) > VIEW_W - 56 && Math.abs(pl.x + dx - mate.x) > Math.abs(pl.x - mate.x)) dx = 0;
      if (Math.abs(pl.y + dy - mate.y) > VIEW_H - 56 && Math.abs(pl.y + dy - mate.y) > Math.abs(pl.y - mate.y)) dy = 0;
    }
    const rock = move(pl, dx, dy, 5);
    if (rock) {
      if (pl.powers.smash) {
        world.tiles[rock[1] * W + rock[0]] = T.OPEN;
        drawTile(mg, world, rock[0], rock[1]);
        sfx('explode');
        floats.push({ x: rock[0] * TILE + 8, y: rock[1] * TILE + 4, text: 'Smash!', t: 0.9 });
      } else if (!hinted) { hinted = true; say(mate && mate.powers.smash ? 'Cracked rock! Your partner can smash it.' : 'Cracked rock! Hold an item to smash it.'); hud(); }
    }
    pl.pet.x += (pl.x - pl.fx * 14 - pl.pet.x) * Math.min(1, dt * 6);
    pl.pet.y += (pl.y - pl.fy * 14 - pl.pet.y) * Math.min(1, dt * 6);
  }

  function update(dt) {
    time += dt;
    left -= dt;
    if (noteT > 0) { noteT -= dt; if (noteT <= 0) hud(); }
    players.forEach((pl) => stepPlayer(pl, dt));
    // Player 1's path becomes the ghost classmates can race.
    while (trail.length * GHOST_STEP <= time) trail.push([players[0].x, players[0].y]);

    for (const it of world.items) {
      if (it.taken) continue;
      const pl = nearest(it);
      const d = Math.hypot(it.x - pl.x, it.y - pl.y);
      const puller = it.kind === 'chest' ? null : players.filter((o) => o.powers.magnet).find((o) => Math.hypot(it.x - o.x, it.y - o.y) < 46);
      if (puller) { const pd = Math.hypot(it.x - puller.x, it.y - puller.y); if (pd > 1) { it.x += ((puller.x - it.x) / pd) * 150 * dt; it.y += ((puller.y - it.y) / pd) * 150 * dt; } }
      if (d < 10) {
        it.taken = true;
        coins += it.value;
        sfx(it.kind === 'coin' ? 'coin' : it.kind === 'gem' ? 'gem' : 'powerup');
        floats.push({ x: it.x, y: it.y - 6, text: `+${it.value}`, t: 0.7 });
        hud();
      }
    }

    for (const e of world.enemies) {
      e.hit = false;
      if (e.kind === 'slime') {
        e.wait -= dt;
        if (e.wait <= 0) { e.wait = 0.8 + Math.random() * 1.4; const a = Math.random() * 6.28; const go = Math.random() < 0.75 ? 22 : 0; e.vx = Math.cos(a) * go; e.vy = Math.sin(a) * go; }
        move(e, e.vx * dt, e.vy * dt, 5);
        if (e.hit) e.wait = 0;
      } else if (e.kind === 'bat') {
        const pl = nearest(e);
        const d = Math.hypot(pl.x - e.x, pl.y - e.y) || 1;
        // A bat that has just bitten flies off for a moment, so one bat can't take every heart.
        if (e.flee > 0) e.flee -= dt;
        else if (regionOf(pl) === 'cave' && d < 76) { e.vx = ((pl.x - e.x) / d) * 40; e.vy = ((pl.y - e.y) / d) * 40; } else {
          e.wait -= dt;
          if (e.wait <= 0) { e.wait = 1 + Math.random(); const a = Math.random() * 6.28; e.vx = Math.cos(a) * 18; e.vy = Math.sin(a) * 18; }
        }
        // Bats fly over cave walls, but never leave the caves.
        e.x = Math.max(33 * TILE + 6, Math.min(63 * TILE - 6, e.x + e.vx * dt));
        e.y = Math.max(TILE + 6, Math.min(20 * TILE - 6, e.y + e.vy * dt));
      } else {
        if (!e.vx) e.vx = 40;
        move(e, e.vx * dt, 0, 6);
        if (e.hit) e.vx = -e.vx;
      }
      for (const pl of players) {
        if (Math.hypot(pl.x - e.x, pl.y - e.y) >= 11) continue;
        hurt(pl, e);
        if (e.kind === 'bat') { const d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; e.flee = 1.6; e.vx = ((e.x - pl.x) / d) * 60; e.vy = ((e.y - pl.y) / d) * 60; }
      }
    }

    for (const f of floats) { f.t -= dt; f.y -= 22 * dt; }
    while (floats.length && floats[0].t <= 0) floats.shift();
    dark += ((players.some((pl) => regionOf(pl) === 'cave') ? 1 : 0) - dark) * Math.min(1, dt * 4);
  }

  function draw() {
    const mx = players.reduce((a, pl) => a + pl.x, 0) / players.length;
    const my = players.reduce((a, pl) => a + pl.y, 0) / players.length;
    const cx = Math.round(Math.max(0, Math.min(W * TILE - VIEW_W, mx - VIEW_W / 2)));
    const cy = Math.round(Math.max(0, Math.min(H * TILE - VIEW_H, my - VIEW_H / 2)));
    g.drawImage(map, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    const on = (o) => o.x > cx - 12 && o.x < cx + VIEW_W + 12 && o.y > cy - 12 && o.y < cy + VIEW_H + 12;
    for (const it of world.items) if (!it.taken && on(it)) SPRITES[it.kind](g, Math.round(it.x - cx), Math.round(it.y - cy), time);
    for (const e of world.enemies) if (on(e)) SPRITES[e.kind](g, Math.round(e.x - cx), Math.round(e.y - cy), time);
    g.font = 'bold 8px monospace';
    g.textAlign = 'center';
    // Ghosts: classmates' best runs in this same world, see-through, with a name tag.
    for (const gh of ghosts) {
      const at = ghostAt(gh.points, time);
      if (!at || !on(at)) continue;
      g.globalAlpha = at.done ? 0.25 : 0.5;
      if (gh.img) g.drawImage(gh.img, 0, 0, 16, 16, Math.round(at.x - cx - 8), Math.round(at.y - cy - 11), 16, 16);
      g.globalAlpha = at.done ? 0.4 : 0.8;
      g.fillStyle = '#1b1530'; g.fillText(gh.name, at.x - cx + 1, at.y - cy - 13);
      g.fillStyle = '#ffffff'; g.fillText(gh.name, at.x - cx, at.y - cy - 14);
      g.globalAlpha = 1;
    }
    for (const pl of players) {
      if (pl.petImg) g.drawImage(pl.petImg, Math.round(pl.pet.x - cx - 4), Math.round(pl.pet.y - cy - 2 + Math.sin(time * 6) * 1));
      if (pl.safe > 0 && !(Math.floor(time * 12) % 2)) continue;
      const bob = pl.moving ? Math.round(Math.abs(Math.sin(time * 10))) : 0;
      if (pl.heroImg) g.drawImage(pl.heroImg, 0, 0, 16, 16, Math.round(pl.x - cx - 8), Math.round(pl.y - cy - 11 - bob), 16, 16);
      else { g.fillStyle = MARKS[pl.n]; g.fillRect(pl.x - cx - 5, pl.y - cy - 8, 10, 12); }
      if (duo) { g.fillStyle = MARKS[pl.n]; g.fillRect(Math.round(pl.x - cx - 2), Math.round(pl.y - cy - 16 - bob), 4, 2); g.fillRect(Math.round(pl.x - cx - 1), Math.round(pl.y - cy - 14 - bob), 2, 1); }
    }
    if (dark > 0.02) {
      sg.globalCompositeOperation = 'source-over';
      sg.clearRect(0, 0, VIEW_W, VIEW_H);
      sg.fillStyle = `rgba(6, 4, 18, ${0.95 * dark})`;
      sg.fillRect(0, 0, VIEW_W, VIEW_H);
      sg.globalCompositeOperation = 'destination-out';
      for (const pl of players) {
        const r = pl.powers.light * TILE * (1 + Math.sin(time * 3) * 0.03);
        const hole = sg.createRadialGradient(pl.x - cx, pl.y - cy - 4, r * 0.35, pl.x - cx, pl.y - cy - 4, r);
        hole.addColorStop(0, 'rgba(0,0,0,1)');
        hole.addColorStop(1, 'rgba(0,0,0,0)');
        sg.fillStyle = hole;
        sg.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      g.drawImage(shade, 0, 0);
    }
    for (const f of floats) { g.fillStyle = '#1b1530'; g.fillText(f.text, f.x - cx + 1, f.y - cy + 1); g.fillStyle = '#fff6c2'; g.fillText(f.text, f.x - cx, f.y - cy); }
  }

  let raf = 0;
  let last = performance.now();
  let shownLeft = -1;
  function frame(now) {
    if (over) return;
    // A hidden tab pauses the run, since a frame never counts for more than a tenth of a second.
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (Math.ceil(left) !== shownLeft) { shownLeft = Math.ceil(left); hud(); }
    if (left <= 0) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    over = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', onBlur);
  }
  function finish() {
    if (over) return;
    stop();
    onEnd({ seconds: Math.round(seconds - Math.max(0, left)), coins, seed, path: encodePath(trail) });
  }
  hud();
  draw();
  raf = requestAnimationFrame(frame);
  return { stop, finish };
}

// The page -------------------------------------------------------------------------------------------
export async function viewQuest() {
  const classId = app.session?.class?.id;
  const [, state, board] = await Promise.all([refreshSession(), app.store.worldState(), classId ? app.store.classBoard(classId).catch(() => []) : []]);
  if (!state) { toast('Trail Quest could not load.', 'error'); return h('p.muted', 'Trail Quest could not load.'); }
  const student = app.session.student;
  const lookOf = (s) => ({ ...defaultAvatar(s.id), ...(s.avatar || {}) });
  const avatar = lookOf(student);
  const has = (slot) => avatar[slot] && avatar[slot] !== 'none';
  const mates = board.filter((s) => s.id !== student.id);
  let partnerId = '';
  const root = h('div.quest');
  let run = null;
  app.cleanup = () => { if (run) run.stop(); };

  const powerList = () => h('ul.quest-powers', POWERS.map((pw) => h('li', { class: has(pw.slot) ? 'on' : 'off' },
    h('span.quest-power-icon', pw.icon), h('span', h('strong', pw.name), ` ${pw.does}`), !has(pw.slot) && h('span.quest-lock', '🔒'))));

  function lobby(s) {
    const earned = s.mode === 'earned';
    const canPlay = s.mode === 'free' || (earned && s.seconds_left >= 5);
    const start = h('button.btn.primary.big', { disabled: !canPlay, onclick: () => play(0) }, canPlay ? '▶ Start a run' : 'No play time yet');
    const keysHint = h('p.muted.small');
    const drawHint = () => { keysHint.textContent = partnerId ? 'You: W A S D to move, Space to dash. Player 2: arrow keys to move, Enter to dash.' : 'Move with the arrow keys or WASD. Dash with Space if you have a cape.'; };
    const partner = mates.length > 0 && h('label.field.small', h('span', 'Player 2 on this Chromebook'),
      h('select', { onchange: (e) => { partnerId = e.target.value; drawHint(); } }, h('option', { value: '' }, 'Just me'), mates.map((m) => h('option', { value: m.id, selected: m.id === partnerId }, m.display_name))));
    drawHint();
    clear(root).append(
      h('div.quest-lobby',
        h('section.card.stack.quest-me',
          h('img.avatar-big', { src: avatarURL(avatar, 8), alt: 'Your character' }),
          !s.mode ? h('p', h('strong', '🔒 Trail Quest is closed. '), 'Your teacher opens it.')
            : earned ? h('p.quest-time', h('strong', clock(s.seconds_left)), ' of play time')
              : h('p.quest-time', h('strong', 'Open play'), ` · ${clock(s.run_max)} runs`),
          s.mode && canPlay && partner,
          s.mode && start,
          earned && !canPlay && h('p.small', `Submit a lesson to earn ${s.mins} minutes. `, h('a', { href: '#/' }, 'Go to your lesson')),
          keysHint),
        h('section.card.stack',
          h('h2', 'Your powers'),
          powerList(),
          POWERS.some((pw) => !has(pw.slot)) && h('a.btn.small', { href: '#/character' }, 'Get more gear')),
        h('section.card.stack',
          h('h2', 'Best runs'),
          s.board.length ? h('ol.quest-board', s.board.map((b) => h('li', { class: b.id === student.id ? 'me' : '' },
            h('img', { src: avatarURL(b.avatar || defaultAvatar(b.id), 2), alt: '' }), h('span', b.display_name), h('strong', `${b.best} 🪙`),
            canPlay && b.seed > 0 && h('button.btn.small', { 'aria-label': `Race ${b.display_name}'s ghost`, onclick: () => play(b.seed) }, '👻 Race')))) : h('p.muted', 'Nobody has played yet. Be the first!'),
          s.board.some((b) => b.seed > 0) && h('p.muted.small', 'Race a ghost: play the same world, with their best run beside you.'),
          s.runs > 0 && h('p.small', `Your best: ${s.best} · All your coins: ${s.total}`),
          h('h3', `Class treasure · Level ${s.chest.level}`),
          h('div.xpbar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(s.chest.goal), 'aria-valuenow': String(s.chest.have), 'aria-label': 'Class treasure' }, h('div.xpfill', { style: `width:${Math.round((s.chest.have / s.chest.goal) * 100)}%` })),
          h('p.muted.small', `${s.chest.have} of ${s.chest.goal} coins. Everyone's coins count.`))),
    );
  }

  /** Start a run. With a seed, it is a race: that world, with the ghosts recorded in it. */
  async function play(raceSeed) {
    const got = await attempt(() => Promise.all([app.store.worldEnter(), raceSeed ? app.store.worldGhosts(raceSeed) : []]));
    if (!got) { const fresh = await attempt(() => app.store.worldState()); if (fresh) lobby(fresh); return; }
    const [entry, raced] = got;
    const seed = raceSeed || 1 + Math.floor(Math.random() * 999999998);
    const partner = mates.find((m) => m.id === partnerId);
    const member = async (s, look) => ({ name: s.display_name, avatar: look, heroImg: await loadImage(avatarURL({ ...look, pet: 'none' }, 1)), petImg: await loadImage(petURL(look.pet, 1)) });
    const team = await Promise.all([member(student, avatar), ...(partner ? [member(partner, lookOf(partner))] : [])]);
    const ghosts = await Promise.all(raced.map(async (gh) => ({
      name: gh.id === student.id ? 'You' : gh.display_name.split(' ')[0], best: gh.best, mine: gh.id === student.id,
      img: await loadImage(avatarURL({ ...lookOf(gh), pet: 'none', aura: 'none' }, 1)), points: decodePath(gh.path),
    })));

    const canvas = h('canvas.quest-canvas', { width: VIEW_W, height: VIEW_H, tabindex: '0', 'aria-label': 'Trail Quest game' });
    const hearts = team.map((m, i) => h('span.quest-hearts', { style: team.length > 1 ? `border-bottom:3px solid ${MARKS[i]}` : null }));
    const dashes = team.map((m, i) => h('span.quest-chip', `🦸 ${team.length > 1 && i === 1 ? 'Enter' : 'Space'}`));
    const coinBox = h('strong', '0');
    const timeBox = h('strong', clock(entry.run_seconds));
    const note = h('div.quest-note', { 'aria-live': 'polite' });
    const end = h('button.btn.small', { onclick: () => run && run.finish() }, 'End run');
    clear(root).append(h('div.quest-play',
      h('div.quest-hud', team.map((m, i) => h('span.quest-player', team.length > 1 && h('span.small', `${m.name.split(' ')[0]} `), hearts[i], ' ', powersFor(m.avatar).dash && dashes[i])),
        h('span', '🪙 ', coinBox), h('span', '⏱ ', timeBox), ghosts.length > 0 && h('span.small', `👻 ${ghosts.map((gh) => `${gh.name} ${gh.best}`).join(' · ')}`), end),
      h('div.quest-stage', canvas, note)));
    canvas.focus();
    run = startRun({
      canvas, seed, team, ghosts, seconds: entry.run_seconds,
      onHud: (v) => {
        v.players.forEach((pl, i) => {
          hearts[i].textContent = '❤️'.repeat(pl.hearts) + '🖤'.repeat(pl.max - pl.hearts);
          dashes[i].className = `quest-chip ${pl.dashReady ? 'ready' : ''}`;
        });
        coinBox.textContent = v.coins;
        timeBox.textContent = clock(Math.ceil(v.left));
        timeBox.className = v.left <= 20 ? 'warn' : '';
        note.textContent = v.note;
      },
      onEnd: async (result) => {
        run = null;
        sfx('win');
        const before = state.best;
        const after = await attempt(() => app.store.worldRun(result));
        if (after) { state.best = after.best; lobby(after); } else render();
        const rivals = ghosts.filter((gh) => !gh.mine);
        const beaten = rivals.filter((gh) => result.coins > gh.best);
        modal((close) => h('div.stack.celebrate',
          h('p.eyebrow', ghosts.length ? 'Race complete' : 'Run complete'),
          h('h2', `${result.coins} 🪙`),
          after && result.coins > before && result.coins > 0 && h('p.rankup', 'New personal best!'),
          rivals.length > 0 && h('ul.quest-race', rivals.map((gh) => h('li', result.coins > gh.best ? '🏆 ' : '👻 ', `${gh.name}'s ghost: ${gh.best}`))),
          rivals.length > 0 && h('p', beaten.length === rivals.length ? 'You beat every ghost!' : beaten.length ? `You beat ${beaten.length} of ${rivals.length} ghosts.` : 'The ghosts won this time. Race again?'),
          h('p', after && after.mode === 'earned' ? `${clock(after.seconds_left)} of play time left.` : ''),
          h('div.row.end', h('button.btn.primary', { onclick: close }, 'OK'))));
      },
    });
  }

  lobby(state);
  return h('div.stack', h('div', h('h1', '🗺️ Trail Quest'), h('p.muted', 'Explore as your character. Your gear gives you powers.')), root);
}
