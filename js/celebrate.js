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

// Pop-up cards for badges and ranks. They queue, so three badges arrive one after another.
let waiting = 0;
function card(kind, icon, eyebrow, title, detail, sound) {
  const delay = waiting * 1500;
  waiting++;
  setTimeout(() => {
    const el = h(`button.fx-card.is-${kind}`, { type: 'button', 'aria-label': `${eyebrow}: ${title}. Dismiss` },
      h('span.fx-card-icon', icon), h('span.fx-card-text', h('span.fx-card-eyebrow', eyebrow), h('strong', title), detail && h('span.fx-card-detail', detail)));
    const close = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); };
    el.onclick = close;
    layer().querySelectorAll('.fx-card').forEach((old) => old.click()); // one card at a time
    layer().append(el);
    chime(sound);
    setTimeout(() => sparkle(el.querySelector('.fx-card-icon'), 14), 250);
    setTimeout(close, 4200);
    waiting = Math.max(0, waiting - 1);
  }, delay);
}
export function popBadge(id, note) {
  const b = badgeById(id);
  if (b) card('badge', b.icon, 'Badge earned!', b.name, note || b.desc, 'badge');
}
export function popRank(name) {
  card('rank', '⬆️', 'Rank up!', name, 'Keep going!', 'rank');
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
    if (stats.rankIndex > seen.rank || stats.badges.some((b) => !seen.badges.includes(b))) confetti(40);
  }
  markCelebrated(studentId, stats);
}
