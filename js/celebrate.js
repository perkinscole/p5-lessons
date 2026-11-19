// Little rewards: a chime and a bit of animation when a student finishes something or earns
// something. Sounds follow the Display setting for sound, and animations are skipped for anyone who
// has asked their device to reduce motion. Nothing here is tied to grades.
import { h } from './ui.js';
import { getSettings } from './settings.js';
import { installSynth } from './game/synth.js';
import { badgeById } from './game/rules.js';

const synth = installSynth({}, {});
const quiet = () => !getSettings().gameSound;
const still = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** One of the built-in game sound effects. */
export function sfx(name) {
  if (quiet()) return;
  try { synth.playSound(name); } catch (_) { /* no audio here */ }
}

// Short rising phrases: [note, seconds]. Bigger moments get longer, higher phrases.
const CHIMES = {
  step: [['E5', 0.08], ['A5', 0.18]],
  right: [['C5', 0.07], ['E5', 0.07], ['G5', 0.18]],
  wrong: [['E3', 0.16]],
  equip: [['A5', 0.06], ['E6', 0.16]],
  submit: [['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.3]],
  badge: [['G5', 0.08], ['C6', 0.08], ['E6', 0.08], ['G6', 0.32]],
  doorbell: [['E5', 0.38], ['C5', 0.55]],
  rank: [['C5', 0.12], ['C5', 0.07], ['G5', 0.12], ['C6', 0.12], ['E6', 0.42]],
};
export function chime(kind, delay = 0) {
  if (quiet() || !CHIMES[kind]) return;
  let at = delay;
  for (const [note, seconds] of CHIMES[kind]) {
    setTimeout(() => { try { synth.playNote(note, seconds, 'triangle'); } catch (_) { /* no audio here */ } }, at * 1000);
    at += seconds * 0.9;
  }
}

const COLORS = ['#ffd84a', '#ff7a3d', '#5cd3ff', '#6ff0b4', '#c89bff', '#e4619f'];
const layer = () => {
  let el = document.getElementById('fx-layer');
  if (!el) { el = h('div', { id: 'fx-layer', 'aria-hidden': 'true' }); document.body.append(el); }
  return el;
};

/** A burst of sparks out of an element, for small wins. */
export function sparkle(target, count = 12) {
  if (still() || !target || !target.getBoundingClientRect) return;
  const r = target.getBoundingClientRect();
  const box = h('div.fx-burst', { style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px` });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const far = 34 + (i % 3) * 14;
    box.append(h('span', { style: `--dx:${Math.round(Math.cos(a) * far)}px;--dy:${Math.round(Math.sin(a) * far)}px;background:${COLORS[i % COLORS.length]}` }));
  }
  layer().append(box);
  setTimeout(() => box.remove(), 800);
}

/** Confetti across the whole page, for big wins. */
export function confetti(count = 60) {
  if (still()) return;
  const box = h('div.fx-confetti');
  for (let i = 0; i < count; i++) {
    box.append(h('span', { style: `left:${(i * 37) % 100}%;animation-delay:${((i % 12) * 0.07).toFixed(2)}s;animation-duration:${(1.8 + (i % 5) * 0.25).toFixed(2)}s;background:${COLORS[i % COLORS.length]}` }));
  }
  layer().append(box);
  setTimeout(() => box.remove(), 3600);
}

/** Bounce an element once. */
export function pop(el) {
  if (still() || !el) return;
  el.classList.remove('fx-pop');
  void el.offsetWidth;
  el.classList.add('fx-pop');
  setTimeout(() => el.classList.remove('fx-pop'), 500); // so it doesn't replace the element's own animation for good
}

/** Count a number up on screen, like a score filling in. */
export function countUp(el, from, to, format = (n) => String(n), ms = 900) {
  if (still() || from === to) { el.textContent = format(to); return; }
  const start = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - start) / ms);
    el.textContent = format(Math.round(from + (to - from) * (1 - (1 - k) * (1 - k))));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// The XP purse -------------------------------------------------------------------------------------
// A student's XP sits in the top bar. When they earn some, coins fly across the screen into it.
let purseXp = null;
let gainedAt = 0;
const purseText = (n) => `${n} XP`;
/** The purse for the top bar. It shows the last total known, so it doesn't flicker between pages. */
export function xpPurse() {
  return h('span.xp-purse', { id: 'xp-purse', title: 'Your XP', translate: 'no', hidden: purseXp === null }, h('span.xp-purse-icon', '💰'), h('strong', purseText(purseXp || 0)));
}
/** Set what the purse shows, with no animation. */
export function setPurse(xp) {
  // Just after coins have flown in, the server may still report the older total. Don't count back down.
  if (purseXp !== null && xp < purseXp && Date.now() - gainedAt < 120000) return;
  purseXp = xp;
  const el = document.getElementById('xp-purse');
  if (el) { el.hidden = false; el.querySelector('strong').textContent = purseText(xp); }
}
/** Send coins from an element into the purse, then count the purse up to its new total. */
export function flyXP(from, total) {
  const el = document.getElementById('xp-purse');
  const before = purseXp === null ? total : purseXp;
  const gained = total - before;
  purseXp = total;
  if (gained > 0) gainedAt = Date.now();
  if (!el) return;
  el.hidden = false;
  const number = el.querySelector('strong');
  if (gained <= 0 || still() || !from || !from.getBoundingClientRect) { number.textContent = purseText(total); return; }
  const a = from.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  const coins = Math.max(5, Math.min(16, Math.round(gained / 8)));
  for (let i = 0; i < coins; i++) {
    const coin = h('span.fx-coin', { style: `left:${a.left + a.width / 2 + ((i * 53) % 60) - 30}px;top:${a.top + a.height / 2 + ((i * 31) % 40) - 20}px` }, '🪙');
    layer().append(coin);
    const wait = 80 + i * 70;
    setTimeout(() => { coin.style.transform = `translate(${b.left + b.width / 2 - parseFloat(coin.style.left)}px, ${b.top + b.height / 2 - parseFloat(coin.style.top)}px) scale(.5)`; coin.style.opacity = '.9'; }, wait);
    setTimeout(() => { coin.remove(); sfx('coin'); pop(el); }, wait + 620);
  }
  setTimeout(() => countUp(number, before, total, purseText, 300 + coins * 70), 700);
  setTimeout(() => { sparkle(el, 16); el.classList.add('gained'); setTimeout(() => el.classList.remove('gained'), 1600); }, 700 + coins * 70);
}

/** Add to the purse right now, with coins from an element. For XP earned mid-lesson. */
export function gainXP(from, amount) {
  if (purseXp === null || amount <= 0) return;
  gainedAt = Date.now();
  flyXP(from, purseXp + amount);
}

// Right and wrong answers ---------------------------------------------------------------------------
const PRAISE = ['Correct!', 'Nice!', 'You got it!', 'Exactly!', 'Yes!'];
/** A right answer: the choice lights up, sparks fly, words rise, and the screen edge glows green. */
export function correct(target, streak = 1) {
  chime('right');
  if (streak >= 2) chime('step', 0.3);
  if (!target) return;
  target.classList.add('fx-right');
  if (still()) return;
  sparkle(target, 20);
  const r = target.getBoundingClientRect();
  const words = streak >= 2 ? `🔥 ${streak} in a row!` : `✓ ${PRAISE[Math.floor(Math.random() * PRAISE.length)]}`;
  const rise = h('div.fx-rise', { style: `left:${r.left + r.width / 2}px;top:${r.top}px` }, words);
  const flash = h('div.fx-flash');
  layer().append(rise, flash);
  setTimeout(() => { rise.remove(); flash.remove(); }, 1300);
}
/** A wrong answer: a low note and a quick shake, nothing more. */
export function incorrect(target) {
  chime('wrong');
  if (!target || still()) return;
  target.classList.remove('fx-shake');
  void target.offsetWidth;
  target.classList.add('fx-shake');
}

// Full-screen moments -----------------------------------------------------------------------------
// A badge, a new rank, or a finished lesson takes over the whole screen for a moment. They queue,
// so three badges arrive one after another, and a tap or any key moves on.
let line = Promise.resolve();
/** Show one full-screen moment. Resolves when it has gone. `onShow(el)` runs as it appears. */
export function splash({ kind = 'badge', icon, eyebrow, title, detail, sound = 'badge', seconds = 3.6, onShow }) {
  const show = () => new Promise((resolve) => {
    let done = false;
    const el = h(`div.fx-splash.is-${kind}`, { role: 'status', 'aria-live': 'assertive' },
      h('div.fx-rays', { 'aria-hidden': 'true' }),
      h('div.fx-splash-icon', { 'aria-hidden': 'true' }, icon),
      h('p.fx-splash-eyebrow', eyebrow),
      h('h2.fx-splash-title', title),
      detail && h('p.fx-splash-detail', detail),
      h('p.fx-splash-hint', 'Tap to continue'));
    const close = () => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', close, true);
      el.classList.add('leaving');
      setTimeout(() => { el.remove(); resolve(); }, still() ? 0 : 280);
    };
    el.onclick = close;
    document.body.append(el);
    // A key pressed a moment after it appears moves on. Not at once, or typing would skip it unseen.
    setTimeout(() => { if (!done) window.addEventListener('keydown', close, true); }, 600);
    chime(sound);
    if (!still()) { confetti(kind === 'lesson' ? 80 : 50); setTimeout(() => sparkle(el.querySelector('.fx-splash-icon'), 22), 350); }
    if (onShow) onShow(el);
    setTimeout(close, seconds * 1000);
  });
  line = line.then(show, show);
  return line;
}
export function popBadge(id, note) {
  const b = badgeById(id);
  return b ? splash({ kind: 'badge', icon: b.icon, eyebrow: 'Badge earned!', title: b.name, detail: note || b.desc, sound: 'badge' }) : Promise.resolve();
}
export function popRank(name) {
  return splash({ kind: 'rank', icon: '⬆️', eyebrow: 'Rank up!', title: name, detail: 'Keep going!', sound: 'rank' });
}

// What has already been celebrated, kept in this browser, so a badge pops up once. A badge a
// teacher gives while the student is away pops up the next time they open Home.
const seenKey = (id) => `pixeltrail.celebrated.${id}`;
function readSeen(id) { try { const v = localStorage.getItem(seenKey(id)); return v ? JSON.parse(v) : null; } catch (_) { return null; } }
export function markCelebrated(studentId, stats) {
  try { localStorage.setItem(seenKey(studentId), JSON.stringify({ badges: stats.badges, rank: stats.rankIndex })); } catch (_) { /* fine */ }
}
/** Pop up anything earned since the last time this student was celebrated. */
export function celebrateNew(studentId, stats, notes = {}) {
  const seen = readSeen(studentId);
  if (seen) {
    if (stats.rankIndex > seen.rank) popRank(stats.rank.name);
    stats.badges.filter((b) => !seen.badges.includes(b)).slice(0, 4).forEach((b) => popBadge(b, notes[b]));
  }
  markCelebrated(studentId, stats);
}
