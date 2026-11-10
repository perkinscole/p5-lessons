import { h, clear, toast, attempt, modal } from '../ui.js';
import { readButton, getSettings } from '../settings.js';
import { app, go, refreshSession, render } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, PATH_IDS, currentLesson, coreSequence, isBeyond, stageOf, needsPathChoice, SIDE_TRAILS } from '../curriculum/graph.js';
import { statsFor, RANKS, BADGES, TEACHER_BADGES, badgeById, isDone } from '../game/rules.js';
import { SLOTS, avatarURL, defaultAvatar, isUnlocked, unlockLabel, unlockables, rarityOf, RARITY_NAMES, titleOf, auraColor } from '../game/avatar.js';
import { installSynth } from '../game/synth.js';

// Sound effects for the character maker. The Display setting "Play sound" turns them off.
const sfxSynth = installSynth({}, {});
const sfx = (name) => { if (getSettings().gameSound) { try { sfxSynth.playSound(name); } catch (_) { /* no audio here */ } } };

// Which unlocked items this student has already seen, so new ones can be celebrated once.
// Kept in this browser only; if storage is blocked, there is simply no celebration.
const seenKey = (id) => `pixeltrail.seen.${id}`;
function readSeen(id) { try { const v = localStorage.getItem(seenKey(id)); return v ? new Set(JSON.parse(v)) : null; } catch (_) { return null; } }
function writeSeen(id, keys) { try { localStorage.setItem(seenKey(id), JSON.stringify([...keys])); } catch (_) { /* fine */ } }
/** Unlocked items this student hasn't seen yet. */
export function freshUnlocks(student, stats) {
  const seen = readSeen(student.id);
  if (!seen) return [];
  return unlockables().filter((u) => isUnlocked(u.unlock, stats) && !seen.has(u.key));
}

/** The login ended while the page was open, for example after a teacher made a new passcode. */
export class SessionEnded extends Error {}

/** Everything a student screen needs about the signed-in student. */
export async function loadMe() {
  // Start everything at once using the class we already know, so it all travels as one trip.
  const known = app.session?.class?.id;
  const [, works, knownBoard] = await Promise.all([refreshSession(), app.store.myWorks(), known ? app.store.classBoard(known) : null]);
  if (app.session?.role !== 'student') throw new SessionEnded();
  const { student, class: cls } = app.session;
  const board = known === cls.id ? knownBoard : await app.store.classBoard(cls.id);
  const row = board.find((b) => b.id === student.id) || { works: [], awards: [] };
  const done = new Set(works.filter(isDone).map((w) => w.lesson_id));
  return { student, cls, works, board, row, done, stats: statsFor({ ...row, path: student.path }) };
}

export function xpBar(stats) {
  return h('div.xpbar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': Math.round(stats.toNext * 100), 'aria-label': 'Progress to next rank' },
    h('div.xpfill', { style: `width:${Math.round(stats.toNext * 100)}%` }));
}

export function badgeChip(id, note) {
  const b = badgeById(id);
  if (!b) return null;
  return h('div.badge', { title: note ? `${b.desc}. ${note}` : b.desc }, h('span.badge-icon', b.icon), h('span', b.name));
}

export async function viewHome() {
  const me = await loadMe();
  const { student, works, stats, done, row } = me;
  const nextId = currentLesson(student.path, done);
  const mustChoose = needsPathChoice(done, student.path);
  const next = nextId && getLesson(nextId);
  const inProgress = next && works.find((w) => w.lesson_id === nextId && w.status === 'in_progress');
  const coreIds = coreSequence(student.path || 'platformer');
  const total = coreIds.length;
  const coreDone = coreIds.filter((id) => done.has(id)).length;
  const sideTrails = SIDE_TRAILS.filter((t) => done.has(t.after) && !done.has(t.id));

  const feedback = works.filter((w) => w.grade && w.grade.feedback).sort((a, b) => (b.grade.graded_at || '').localeCompare(a.grade.graded_at || '')).slice(0, 3);
  const returned = works.filter((w) => w.status === 'returned');

  const nextCard = mustChoose
    ? h('section.card.next.fork', h('p.eyebrow', 'You reached the First Fork'), h('h2', 'Time to choose your road'), h('p', 'Four kinds of game. Same big ideas. Yours to build for the rest of the trail.'), h('a.btn.primary.big', { href: '#/road' }, 'See the roads'))
    : next
      ? h('section.card.next',
        h('p.eyebrow', isBeyond(nextId) ? `${stageOf(nextId).name} · Extra challenge · about ${next.mins} minutes` : `${stageOf(nextId).name} · Lesson ${coreDone + 1} of ${total} · about ${next.mins} minutes`),
        h('h2', next.title),
        h('div.read-row', h('p', next.hook), readButton(() => `${next.title}. ${next.hook}`)),
        h('p.concepts', next.concepts.map((c) => h('span.tag', c))),
        h('a.btn.primary.big', { href: `#/lesson/${nextId}` }, inProgress ? 'Keep going' : 'Start lesson'))
      : h('section.card.next', h('p.eyebrow', 'The Summit'), h('h2', 'You finished the whole trail!'), h('p', 'Your game is in the Arcade. Go play what your classmates built, or keep adding to yours.'), h('a.btn.primary.big', { href: '#/arcade' }, 'Open the Arcade'));

  return h('div.home',
    h('section.card.hero-card',
      h('img.avatar-big', { src: avatarURL(student.avatar || defaultAvatar(student.id), 8), alt: 'Your character' }),
      h('div.hero-info',
        h('h1', student.display_name),
        titleOf(student.avatar) && h('p.char-title', titleOf(student.avatar)),
        student.game_name && h('p.game-name', student.game_name),
        student.path && h('p', h('span.road-dot', { style: `background:${PATHS[student.path].color}` }), PATHS[student.path].road),
        h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)),
        xpBar(stats),
        h('p.muted.small', stats.next ? `${stats.next.xp - stats.xp} XP until ${stats.next.name}` : 'Top rank!'),
        freshUnlocks(student, stats).length > 0
          ? h('a.btn.primary.new-gear', { href: '#/character' }, `🎁 ${freshUnlocks(student, stats).length} new item${freshUnlocks(student, stats).length === 1 ? '' : 's'} to try`)
          : h('a.btn', { href: '#/character' }, 'Customize'),
      ),
    ),
    nextCard,
    sideTrails.length > 0 && h('section.card.stack', h('h2', 'Side trail'), sideTrails.map((t) => h('a.row.linkrow', { href: `#/lesson/${t.id}` }, h('strong', getLesson(t.id).title), h('span.muted', 'Optional. ', getLesson(t.id).hook)))),
    returned.length > 0 && h('section.card.stack.alert', h('h2', 'Your teacher asked for changes'), returned.map((w) => h('a.row.linkrow', { href: `#/lesson/${w.lesson_id}` }, h('strong', getLesson(w.lesson_id).title), h('span', w.grade?.feedback || 'Open it to see what to fix.')))),
    h('section.card.stack',
      h('h2', 'Badges'),
      stats.badges.length ? h('div.badges', stats.badges.map((id) => badgeChip(id, row.awards?.find((a) => a.badge_id === id)?.note))) : h('p.muted', 'Finish your first lesson to earn your first badge.'),
    ),
    feedback.length > 0 && h('section.card.stack', h('h2', 'From your teacher'), feedback.map((w) => h('div.feedback', h('strong', getLesson(w.lesson_id).title), h('p', w.grade.feedback), h('p.muted.small', `Score: ${w.grade.total} of ${w.grade.max_total}`)))),
  );
}

export async function viewChooseRoad() {
  const me = await loadMe();
  if (me.student.path) { go('/'); return null; }
  if (!me.done.has('t6')) {
    return h('div.card.stack', h('h2', 'Not yet!'), h('p', 'Finish Base Camp first. The roads open after Catch the Star.'), h('a.btn', { href: '#/' }, 'Back home'));
  }
  let chosen = null;
  const gameName = h('input', { maxlength: 60, placeholder: 'You can change this later' });
  const cards = h('div.roads');
  const confirm = h('button.btn.primary.big', {
    disabled: true,
    onclick: async () => {
      const ok = await attempt(() => app.store.updateProfile({ path: chosen, game_name: gameName.value.trim() || null }));
      if (ok) { await refreshSession(); toast(`Welcome to ${PATHS[chosen].road}!`); go('/'); }
    },
  }, 'Choose a road first');
  const draw = () => {
    clear(cards).append(...PATH_IDS.map((id) => {
      const p = PATHS[id];
      return h('button.road-card', { 'aria-pressed': chosen === id ? 'true' : 'false', style: `--road:${p.color}`, onclick: () => { chosen = id; confirm.disabled = false; confirm.textContent = `Take ${p.road}`; draw(); } },
        h('p.eyebrow', p.genre), h('h2', p.road), h('p', p.blurb), h('p.small', h('strong', 'Algorithm you will write: '), p.algo));
    }));
  };
  draw();
  return h('div.stack.narrow',
    h('h1', 'The First Fork'),
    h('p.lede', 'Every road teaches the same big ideas, and they meet again at each Crossing. The difference is what you build. You will keep building one game the whole way, so pick the one you most want to make.'),
    cards,
    h('label.field', h('span', 'What will you call your game?'), gameName),
    h('p', confirm),
    h('p.muted.small', 'Changed your mind later? Your teacher can move you to another road.'),
  );
}

export async function viewCharacter() {
  const me = await loadMe();
  const { student, stats, row } = me;
  const av = { ...defaultAvatar(student.id), ...(student.avatar || {}) };
  const badgeName = (id) => badgeById(id)?.name || id;
  const all = unlockables();
  const owned = all.filter((u) => isUnlocked(u.unlock, stats));

  // New since last visit: celebrated once, then tagged NEW until tried.
  const seen = readSeen(student.id);
  const fresh = new Set(seen ? owned.filter((u) => !seen.has(u.key)).map((u) => u.key) : []);
  writeSeen(student.id, owned.map((u) => u.key));

  const howToUnlock = (unlock) => {
    if (unlock.xp !== undefined) return `${Math.max(0, unlock.xp - stats.xp)} more XP`;
    const b = badgeById(unlock.badge);
    return b ? `earn the ${b.name} badge: ${b.desc.toLowerCase()}` : 'a badge';
  };

  // Preview -------------------------------------------------------------------------------------
  const preview = h('img.avatar-big', { alt: 'Your character' });
  const stage = h('div.char-stage', preview, h('span.char-burst', { 'aria-hidden': 'true' }));
  const titleLine = h('p.char-title');
  const updatePreview = () => {
    preview.src = avatarURL(av, 10);
    const glow = auraColor(av);
    stage.className = `char-stage ${glow ? 'glowing' : ''} ${glow === 'rainbow' ? 'rainbow' : ''}`;
    stage.style.setProperty('--aura', glow && glow !== 'rainbow' ? glow : '#ffffff');
    titleLine.textContent = titleOf(av);
  };
  const save = h('button.btn.primary', {
    onclick: async () => {
      const ok = await attempt(() => app.store.updateProfile({ avatar: { ...av } }));
      if (ok) {
        sfx('powerup');
        stage.classList.remove('saved');
        void stage.offsetWidth;
        stage.classList.add('saved');
        await refreshSession();
        toast('Saved! Your classmates can see your new look on the map.');
      }
    },
  }, 'Save my character');
  const surprise = h('button.btn', {
    onclick: () => {
      for (const [slot, def] of Object.entries(SLOTS)) {
        if (slot === 'title') continue;
        const open = def.swatches ? def.swatches.map((_, i) => i).filter((i) => isUnlocked(def.locks && def.locks[i], stats))
          : Object.entries(def.items).filter(([, it]) => isUnlocked(it.unlock, stats)).map(([id]) => id);
        av[slot] = open[Math.floor(Math.random() * open.length)];
      }
      sfx('magic');
      updatePreview();
      drawPanes();
    },
  }, '🎲 Surprise me');

  const collection = h('div.collection',
    h('div.row.between', h('strong', 'Collection'), h('span', `${owned.length} of ${all.length}`)),
    h('div.xpbar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(all.length), 'aria-valuenow': String(owned.length), 'aria-label': 'Items collected' },
      h('div.xpfill', { style: `width:${Math.round((owned.length / all.length) * 100)}%` })));

  // What to aim for next: the closest XP unlocks, and badges that open the most gear.
  const xpNext = all.filter((u) => u.unlock.xp !== undefined && !isUnlocked(u.unlock, stats)).sort((a, b) => a.unlock.xp - b.unlock.xp).slice(0, 3);
  const byBadge = new Map();
  for (const u of all) if (u.unlock.badge && !stats.badges.includes(u.unlock.badge)) byBadge.set(u.unlock.badge, [...(byBadge.get(u.unlock.badge) || []), u]);
  const badgeNext = [...byBadge.entries()].filter(([id]) => badgeById(id)).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  const nextCard = h('section.card.stack.char-next',
    h('h2', 'Next unlocks'),
    xpNext.length ? h('ul.next-list', xpNext.map((u) => h('li', { class: `r-${rarityOf(u.unlock)}` },
      h('div.row.between', h('strong', u.name), h('span.rarity', RARITY_NAMES[rarityOf(u.unlock)])),
      h('div.xpbar', h('div.xpfill', { style: `width:${Math.min(100, Math.round((stats.xp / u.unlock.xp) * 100))}%` })),
      h('span.small.muted', `${u.unlock.xp - stats.xp} XP to go`)))) : h('p.muted', 'You have every XP unlock!'),
    badgeNext.length > 0 && h('h3', 'Earn a badge to unlock'),
    badgeNext.length > 0 && h('ul.next-list', badgeNext.map(([id, items]) => {
      const b = badgeById(id);
      return h('li', h('strong', `${b.icon} ${b.name}`), h('span.small', `${b.desc}. Unlocks ${items.map((x) => x.name).join(', ')}.`));
    })),
  );

  // Options ---------------------------------------------------------------------------------------
  const paneBox = h('div.stack');
  function drawPanes() {
    clear(paneBox).append(...Object.entries(SLOTS).map(([slot, def]) => {
      const box = h('div.options');
      if (def.swatches) {
        (def.order || def.swatches.map((_, i) => i)).forEach((i) => {
          const color = def.swatches[i];
          const lock = def.locks && def.locks[i];
          const open = isUnlocked(lock, stats);
          const isNew = fresh.has(`${slot}:${i}`);
          box.append(h('button.swatch', {
            style: `background:${color}`, class: `${open ? '' : 'locked'} ${isNew ? 'new' : ''}`, 'aria-pressed': av[slot] === i ? 'true' : 'false',
            'aria-label': `${def.label} ${i + 1}${open ? '' : ' (locked)'}`,
            title: open ? '' : `Unlocks at ${unlockLabel(lock, badgeName)}`,
            onclick: () => {
              if (!open) { sfx('hit'); toast(`🔒 Unlock this with ${howToUnlock(lock)}.`); return; }
              av[slot] = i; fresh.delete(`${slot}:${i}`); sfx('select'); updatePreview(); drawPanes();
            },
          }, open ? '' : '🔒'));
        });
      } else {
        Object.entries(def.items).forEach(([id, item]) => {
          const open = isUnlocked(item.unlock, stats);
          const rarity = rarityOf(item.unlock);
          const isNew = fresh.has(`${slot}:${id}`);
          box.append(h('button.item', {
            class: `r-${rarity} ${open ? '' : 'locked'} ${isNew ? 'new' : ''}`, 'aria-pressed': av[slot] === id ? 'true' : 'false',
            'aria-label': `${item.name}${rarity === 'common' ? '' : `, ${RARITY_NAMES[rarity]}`}${open ? '' : ', locked'}`,
            onclick: () => {
              if (!open) { sfx('hit'); toast(`🔒 ${item.name}: ${howToUnlock(item.unlock)}.`); return; }
              av[slot] = id; fresh.delete(`${slot}:${id}`); sfx(slot === 'aura' && id !== 'none' ? 'magic' : 'select'); updatePreview(); drawPanes();
            },
          }, h('span', item.name),
          rarity !== 'common' && h('small.rarity', RARITY_NAMES[rarity]),
          !open && h('small', `🔒 ${unlockLabel(item.unlock, badgeName)}`),
          isNew && h('span.new-tag', 'NEW')));
        });
      }
      return h('section', h('h2.subhead', def.label), box);
    }));
  }
  updatePreview();
  drawPanes();

  // A celebration for gear unlocked since the last visit.
  if (fresh.size) {
    const RANK = { legendary: 0, epic: 1, rare: 2, common: 3 };
    const items = all.filter((u) => fresh.has(u.key)).sort((a, b) => RANK[rarityOf(a.unlock)] - RANK[rarityOf(b.unlock)]).slice(0, 6);
    sfx('win');
    modal((close) => h('div.stack.unlock-party',
      h('div.confetti', { 'aria-hidden': 'true' }, Array.from({ length: 36 }, (_, k) => h('span', { style: `left:${(k * 37) % 100}%;animation-delay:${(k % 9) * 0.12}s;background:${['#ffd84a', '#ff7a3d', '#5cd3ff', '#6ff0b4', '#c89bff', '#e4619f'][k % 6]}` }))),
      h('h2', fresh.size === 1 ? '🎉 New gear unlocked!' : `🎉 ${fresh.size} new items unlocked!`),
      h('div.unlock-grid', items.map((u) => h('div.unlock-card', { class: `r-${rarityOf(u.unlock)}` },
        h('img', { src: avatarURL({ ...av, [u.slot]: u.id }, 4), alt: '' }),
        h('strong', u.name),
        h('span.rarity', RARITY_NAMES[rarityOf(u.unlock)]),
        h('button.btn.small', { onclick: () => { av[u.slot] = u.id; fresh.delete(u.key); sfx('select'); updatePreview(); drawPanes(); close(); } }, u.slot === 'title' ? 'Use it' : 'Try it on')))),
      fresh.size > items.length && h('p.muted', `Plus ${fresh.size - items.length} more, marked NEW below.`),
      h('div.row.end', h('button.btn.primary', { onclick: close }, 'Awesome!')),
    ));
  }

  const earned = new Set(stats.badges);
  return h('div.character',
    h('div.stack',
      h('section.card.stack.char-preview', stage,
        h('p.char-name', student.display_name), titleLine,
        h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)), xpBar(stats), collection,
        h('div.row', save, surprise)),
      nextCard),
    h('section.card.stack.char-options', h('h1', 'Your character'), h('p.muted', 'Earn XP and badges to unlock more. Tap a locked item to see how.'), paneBox),
    h('section.card.stack.char-ranks', h('h2', 'Ranks'),
      h('ol.ranks', RANKS.map((r, i) => h('li', { class: i === stats.rankIndex ? 'now' : i < stats.rankIndex ? 'past' : '' }, h('span', r.name), h('span.muted', `${r.xp} XP`)))),
      h('h3', 'How to earn XP'),
      h('ul.small', h('li', 'Submit a lesson with all checks passing: 50 XP'), h('li', 'Your teacher approves it: 50 XP more'), h('li', 'Each stretch goal: 10 XP'), h('li', 'A badge from your teacher: 25 XP')),
    ),
    h('section.card.stack.char-badges', h('h2', `Badges (${earned.size} of ${BADGES.length + TEACHER_BADGES.length})`),
      h('div.badges', [...BADGES, ...TEACHER_BADGES].map((b) => h(`div.badge${earned.has(b.id) ? '' : '.locked'}`, { title: b.desc }, h('span.badge-icon', earned.has(b.id) ? b.icon : '🔒'), h('span', b.name), row && h('small', b.desc))))),
  );
}

export { modal, render };
