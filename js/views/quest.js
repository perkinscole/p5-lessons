// Trail Quest: a small adventure students play as their own character, with time earned by
// finishing lessons. The whole game runs here in the browser. The server is only asked when a run
// starts and when it ends, so a class playing at once costs almost nothing.
import { h, clear, toast, attempt, modal } from '../ui.js';
import { app, render, refreshSession } from '../main.js';
import { getSettings } from '../settings.js';
import { avatarURL, defaultAvatar, petURL } from '../game/avatar.js';
import { installSynth } from '../game/synth.js';
import { TILE, W, H, T, generateWorld, regionAt, isSolid, powersFor, POWERS } from '../game/quest.js';

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
/** Play one run on `canvas`. Calls onHud as things change and onEnd({ seconds, coins }) once. Returns stop(). */
function startRun({ canvas, avatar, heroImg, petImg, seconds, onHud, onEnd }) {
  const world = generateWorld(Math.floor(Math.random() * 1e9));
  const powers = powersFor(avatar);
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

  const p = { x: world.start.x, y: world.start.y, hearts: powers.hearts, safe: 0, dashT: 0, dashCd: 0, fx: 0, fy: 1 };
  const pet = { x: p.x - 12, y: p.y };
  const floats = [];
  let coins = 0;
  let left = seconds;
  let dark = 0;
  let time = 0;
  let over = false;
  let hinted = false;
  let note = '';
  let noteT = 0;
  const say = (text) => { note = text; noteT = 2.6; };
  const hud = () => onHud({ coins, hearts: p.hearts, maxHearts: powers.hearts, left, note: noteT > 0 ? note : '', dashReady: powers.dash && p.dashCd <= 0 });

  const tileAt = (x, y) => { const tx = Math.floor(x / TILE); const ty = Math.floor(y / TILE); return tx < 0 || ty < 0 || tx >= W || ty >= H ? T.WALL : world.tiles[ty * W + tx]; };
  const blocked = (x, y, r) => [[-r, -r], [r, -r], [-r, r], [r, r]].some(([dx, dy]) => isSolid(tileAt(x + dx, y + dy)));
  /** Move on each axis separately, so you slide along walls. Returns the rock you bumped, if any. */
  function move(body, dx, dy, r) {
    let rock = null;
    for (const [mx, my] of [[dx, 0], [0, dy]]) {
      if (!mx && !my) continue;
      if (!blocked(body.x + mx, body.y + my, r)) { body.x += mx; body.y += my; continue; }
      for (const [cx, cy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (tileAt(body.x + mx + cx, body.y + my + cy) === T.ROCK) rock = [Math.floor((body.x + mx + cx) / TILE), Math.floor((body.y + my + cy) / TILE)];
      body.hit = true;
    }
    return rock;
  }

  const keys = new Set();
  const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd', ' ': 'dash' };
  const onDown = (e) => { const k = KEYMAP[e.key]; if (!k || e.target.closest?.('input, textarea')) return; e.preventDefault(); keys.add(k); };
  const onUp = (e) => { const k = KEYMAP[e.key]; if (k) keys.delete(k); };
  const onBlur = () => keys.clear();
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);

  function hurt(from) {
    if (p.safe > 0) return;
    p.hearts -= 1;
    p.safe = 1.3;
    sfx('hurt');
    const d = Math.hypot(p.x - from.x, p.y - from.y) || 1;
    move(p, ((p.x - from.x) / d) * 10, ((p.y - from.y) / d) * 10, 5);
    if (p.hearts <= 0) {
      const lost = Math.min(coins, 10);
      coins -= lost;
      p.x = world.start.x;
      p.y = world.start.y;
      p.hearts = powers.hearts;
      p.safe = 2;
      say(lost ? `Knocked out! You dropped ${lost} coins.` : 'Knocked out! Back to camp.');
      sfx('lose');
    }
    hud();
  }

  function update(dt) {
    time += dt;
    left -= dt;
    if (noteT > 0) { noteT -= dt; if (noteT <= 0) hud(); }
    p.safe = Math.max(0, p.safe - dt);
    const wasReady = p.dashCd <= 0;
    p.dashCd = Math.max(0, p.dashCd - dt);
    if (!wasReady && p.dashCd <= 0) hud();

    let ix = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
    let iy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    if (ix && iy) { ix *= 0.707; iy *= 0.707; }
    if (ix || iy) { p.fx = ix; p.fy = iy; }
    if (keys.has('dash') && powers.dash && p.dashCd <= 0) { p.dashT = 0.18; p.dashCd = 1.5; sfx('dash'); hud(); }
    keys.delete('dash');
    let rock;
    if (p.dashT > 0) { p.dashT -= dt; const n = Math.hypot(p.fx, p.fy) || 1; rock = move(p, (p.fx / n) * 240 * dt, (p.fy / n) * 240 * dt, 5); } else rock = move(p, ix * 78 * dt, iy * 78 * dt, 5);
    if (rock) {
      if (powers.smash) {
        world.tiles[rock[1] * W + rock[0]] = T.OPEN;
        drawTile(mg, world, rock[0], rock[1]);
        sfx('explode');
        floats.push({ x: rock[0] * TILE + 8, y: rock[1] * TILE + 4, text: 'Smash!', t: 0.9 });
      } else if (!hinted) { hinted = true; say('Cracked rock! Hold an item to smash it.'); hud(); }
    }

    for (const it of world.items) {
      if (it.taken) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (powers.magnet && it.kind !== 'chest' && d < 46 && d > 1) { it.x += ((p.x - it.x) / d) * 150 * dt; it.y += ((p.y - it.y) / d) * 150 * dt; }
      if (d < 10) {
        it.taken = true;
        coins += it.value;
        sfx(it.kind === 'coin' ? 'coin' : it.kind === 'gem' ? 'gem' : 'powerup');
        floats.push({ x: it.x, y: it.y - 6, text: `+${it.value}`, t: 0.7 });
        hud();
      }
    }

    const here = regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    for (const e of world.enemies) {
      e.hit = false;
      if (e.kind === 'slime') {
        e.wait -= dt;
        if (e.wait <= 0) { e.wait = 0.8 + Math.random() * 1.4; const a = Math.random() * 6.28; const go = Math.random() < 0.75 ? 22 : 0; e.vx = Math.cos(a) * go; e.vy = Math.sin(a) * go; }
        move(e, e.vx * dt, e.vy * dt, 5);
        if (e.hit) e.wait = 0;
      } else if (e.kind === 'bat') {
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        // A bat that has just bitten flies off for a moment, so one bat can't take every heart.
        if (e.flee > 0) e.flee -= dt;
        else if (here === 'cave' && d < 76) { e.vx = ((p.x - e.x) / d) * 40; e.vy = ((p.y - e.y) / d) * 40; } else {
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
      if (Math.hypot(p.x - e.x, p.y - e.y) < 11) {
        hurt(e);
        if (e.kind === 'bat') { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; e.flee = 1.6; e.vx = ((e.x - p.x) / d) * 60; e.vy = ((e.y - p.y) / d) * 60; }
      }
    }

    pet.x += (p.x - p.fx * 14 - pet.x) * Math.min(1, dt * 6);
    pet.y += (p.y - p.fy * 14 - pet.y) * Math.min(1, dt * 6);
    for (const f of floats) { f.t -= dt; f.y -= 22 * dt; }
    while (floats.length && floats[0].t <= 0) floats.shift();
    dark += ((here === 'cave' ? 1 : 0) - dark) * Math.min(1, dt * 4);
  }

  function draw() {
    const cx = Math.round(Math.max(0, Math.min(W * TILE - VIEW_W, p.x - VIEW_W / 2)));
    const cy = Math.round(Math.max(0, Math.min(H * TILE - VIEW_H, p.y - VIEW_H / 2)));
    g.drawImage(map, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    const on = (o) => o.x > cx - 12 && o.x < cx + VIEW_W + 12 && o.y > cy - 12 && o.y < cy + VIEW_H + 12;
    for (const it of world.items) if (!it.taken && on(it)) SPRITES[it.kind](g, Math.round(it.x - cx), Math.round(it.y - cy), time);
    for (const e of world.enemies) if (on(e)) SPRITES[e.kind](g, Math.round(e.x - cx), Math.round(e.y - cy), time);
    if (petImg) g.drawImage(petImg, Math.round(pet.x - cx - 4), Math.round(pet.y - cy - 2 + Math.sin(time * 6) * 1));
    if (p.safe <= 0 || Math.floor(time * 12) % 2) {
      const bob = keys.size ? Math.round(Math.abs(Math.sin(time * 10))) : 0;
      if (heroImg) g.drawImage(heroImg, 0, 0, 16, 16, Math.round(p.x - cx - 8), Math.round(p.y - cy - 11 - bob), 16, 16);
      else { g.fillStyle = '#ffd23f'; g.fillRect(p.x - cx - 5, p.y - cy - 8, 10, 12); }
    }
    if (dark > 0.02) {
      sg.globalCompositeOperation = 'source-over';
      sg.clearRect(0, 0, VIEW_W, VIEW_H);
      sg.fillStyle = `rgba(6, 4, 18, ${0.95 * dark})`;
      sg.fillRect(0, 0, VIEW_W, VIEW_H);
      const r = powers.light * TILE * (1 + Math.sin(time * 3) * 0.03);
      const hole = sg.createRadialGradient(p.x - cx, p.y - cy - 4, r * 0.35, p.x - cx, p.y - cy - 4, r);
      hole.addColorStop(0, 'rgba(0,0,0,1)');
      hole.addColorStop(1, 'rgba(0,0,0,0)');
      sg.globalCompositeOperation = 'destination-out';
      sg.fillStyle = hole;
      sg.fillRect(0, 0, VIEW_W, VIEW_H);
      g.drawImage(shade, 0, 0);
    }
    g.font = 'bold 8px monospace';
    g.textAlign = 'center';
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
    onEnd({ seconds: Math.round(seconds - Math.max(0, left)), coins });
  }
  hud();
  draw();
  raf = requestAnimationFrame(frame);
  return { stop, finish };
}

// The page -------------------------------------------------------------------------------------------
export async function viewQuest() {
  const [, state] = await Promise.all([refreshSession(), app.store.worldState()]);
  const student = app.session.student;
  const avatar = { ...defaultAvatar(student.id), ...(student.avatar || {}) };
  const powers = powersFor(avatar);
  const has = (slot) => avatar[slot] && avatar[slot] !== 'none';
  const root = h('div.quest');
  let run = null;
  app.cleanup = () => { if (run) run.stop(); };

  const powerList = () => h('ul.quest-powers', POWERS.map((pw) => h('li', { class: has(pw.slot) ? 'on' : 'off' },
    h('span.quest-power-icon', pw.icon), h('span', h('strong', pw.name), ` ${pw.does}`), !has(pw.slot) && h('span.quest-lock', '🔒'))));

  function lobby(s) {
    const earned = s.mode === 'earned';
    const canPlay = s.mode === 'free' || (earned && s.seconds_left >= 5);
    const start = h('button.btn.primary.big', { disabled: !canPlay, onclick: play }, canPlay ? '▶ Start a run' : 'No play time yet');
    clear(root).append(
      h('div.quest-lobby',
        h('section.card.stack.quest-me',
          h('img.avatar-big', { src: avatarURL(avatar, 8), alt: 'Your character' }),
          !s.mode ? h('p', h('strong', '🔒 Trail Quest is closed. '), 'Your teacher opens it.')
            : earned ? h('p.quest-time', h('strong', clock(s.seconds_left)), ' of play time')
              : h('p.quest-time', h('strong', 'Open play'), ` · ${clock(s.run_max)} runs`),
          s.mode && start,
          earned && !canPlay && h('p.small', `Submit a lesson to earn ${s.mins} minutes. `, h('a', { href: '#/' }, 'Go to your lesson')),
          earned && canPlay && h('p.muted.small', `Each lesson you submit earns ${s.mins} minutes.`),
          h('p.muted.small', 'Move with the arrow keys or WASD. Collect coins, and watch out for slimes, bats, and ghosts.')),
        h('section.card.stack',
          h('h2', 'Your powers'),
          powerList(),
          POWERS.some((pw) => !has(pw.slot)) && h('a.btn.small', { href: '#/character' }, 'Get more gear')),
        h('section.card.stack',
          h('h2', 'Best runs'),
          s.board.length ? h('ol.quest-board', s.board.map((b) => h('li', { class: b.id === student.id ? 'me' : '' },
            h('img', { src: avatarURL(b.avatar || defaultAvatar(b.id), 2), alt: '' }), h('span', b.display_name), h('strong', `${b.best} 🪙`)))) : h('p.muted', 'Nobody has played yet. Be the first!'),
          s.runs > 0 && h('p.small', `Your best: ${s.best} · All your coins: ${s.total}`),
          h('h3', `Class treasure · Level ${s.chest.level}`),
          h('div.xpbar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(s.chest.goal), 'aria-valuenow': String(s.chest.have), 'aria-label': 'Class treasure' }, h('div.xpfill', { style: `width:${Math.round((s.chest.have / s.chest.goal) * 100)}%` })),
          h('p.muted.small', `${s.chest.have} of ${s.chest.goal} coins. Everyone's coins count.`))),
    );
  }

  async function play() {
    const entry = await attempt(() => app.store.worldEnter());
    if (!entry) { const fresh = await attempt(() => app.store.worldState()); if (fresh) lobby(fresh); return; }
    const [heroImg, petImg] = await Promise.all([loadImage(avatarURL({ ...avatar, pet: 'none' }, 1)), loadImage(petURL(avatar.pet, 1))]);
    const canvas = h('canvas.quest-canvas', { width: VIEW_W, height: VIEW_H, tabindex: '0', 'aria-label': 'Trail Quest game' });
    const hearts = h('span.quest-hearts');
    const coinBox = h('strong', '0');
    const timeBox = h('strong', clock(entry.run_seconds));
    const dashBox = h('span.quest-chip', '🦸 Dash: Space');
    const note = h('div.quest-note', { 'aria-live': 'polite' });
    const end = h('button.btn.small', { onclick: () => run && run.finish() }, 'End run');
    clear(root).append(h('div.quest-play',
      h('div.quest-hud', hearts, h('span', '🪙 ', coinBox), h('span', '⏱ ', timeBox), powers.dash && dashBox, end),
      h('div.quest-stage', canvas, note)));
    canvas.focus();
    run = startRun({
      canvas, avatar, heroImg, petImg, seconds: entry.run_seconds,
      onHud: (v) => {
        hearts.textContent = '❤️'.repeat(v.hearts) + '🖤'.repeat(v.maxHearts - v.hearts);
        coinBox.textContent = v.coins;
        timeBox.textContent = clock(Math.ceil(v.left));
        timeBox.className = v.left <= 20 ? 'warn' : '';
        dashBox.className = `quest-chip ${v.dashReady ? 'ready' : ''}`;
        note.textContent = v.note;
      },
      onEnd: async (result) => {
        run = null;
        sfx('win');
        const before = state.best;
        const after = await attempt(() => app.store.worldRun(result));
        if (after) { state.best = after.best; lobby(after); } else render();
        modal((close) => h('div.stack.celebrate',
          h('p.eyebrow', 'Run complete'),
          h('h2', `${result.coins} 🪙`),
          after && result.coins > before && result.coins > 0 && h('p.rankup', 'New personal best!'),
          h('p', after && after.mode === 'earned' ? `${clock(after.seconds_left)} of play time left.` : ''),
          h('div.row.end', h('button.btn.primary', { onclick: close }, 'OK'))));
      },
    });
  }

  if (!state) { toast('Trail Quest could not load.', 'error'); return h('p.muted', 'Trail Quest could not load.'); }
  lobby(state);
  return h('div.stack', h('div', h('h1', '🗺️ Trail Quest'), h('p.muted', 'Explore as your character. Your gear gives you powers.')), root);
}
