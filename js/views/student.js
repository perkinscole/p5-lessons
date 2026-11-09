import { h, clear, toast, attempt, modal } from '../ui.js';
import { readButton } from '../settings.js';
import { app, go, refreshSession, render } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, PATH_IDS, currentLesson, coreSequence, isBeyond, stageOf, needsPathChoice, SIDE_TRAILS } from '../curriculum/graph.js';
import { statsFor, RANKS, BADGES, TEACHER_BADGES, badgeById, isDone } from '../game/rules.js';
import { SLOTS, avatarURL, defaultAvatar, isUnlocked, unlockLabel } from '../game/avatar.js';

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
        student.game_name && h('p.game-name', student.game_name),
        student.path && h('p', h('span.road-dot', { style: `background:${PATHS[student.path].color}` }), PATHS[student.path].road),
        h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)),
        xpBar(stats),
        h('p.muted.small', stats.next ? `${stats.next.xp - stats.xp} XP until ${stats.next.name}` : 'Top rank!'),
        h('a.btn', { href: '#/character' }, 'Customize'),
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
  const preview = h('img.avatar-big', { alt: 'Your character' });
  const updatePreview = () => { preview.src = avatarURL(av, 10); };
  updatePreview();
  const save = h('button.btn.primary', {
    onclick: async () => {
      const ok = await attempt(() => app.store.updateProfile({ avatar: { ...av } }));
      if (ok) { await refreshSession(); toast('Saved. Your classmates can see your new look on the map.'); }
    },
  }, 'Save my character');

  const badgeName = (id) => badgeById(id)?.name || id;
  const panes = Object.entries(SLOTS).map(([slot, def]) => {
    const box = h('div.options');
    const draw = () => {
      clear(box);
      if (def.swatches) {
        def.swatches.forEach((color, i) => {
          const lock = def.locks && def.locks[i];
          const open = isUnlocked(lock, stats);
          box.append(h('button.swatch', {
            style: `background:${color}`, disabled: !open, 'aria-pressed': av[slot] === i ? 'true' : 'false',
            'aria-label': `${def.label} ${i + 1}${open ? '' : ' (locked)'}`,
            title: open ? '' : `Unlocks at ${unlockLabel(lock, badgeName)}`,
            onclick: () => { av[slot] = i; updatePreview(); draw(); },
          }, open ? '' : '🔒'));
        });
      } else {
        Object.entries(def.items).forEach(([id, item]) => {
          const open = isUnlocked(item.unlock, stats);
          box.append(h('button.item', {
            disabled: !open, 'aria-pressed': av[slot] === id ? 'true' : 'false',
            onclick: () => { av[slot] = id; updatePreview(); draw(); },
          }, item.name, !open && h('small', `🔒 ${unlockLabel(item.unlock, badgeName)}`)));
        });
      }
    };
    draw();
    return h('section', h('h2.subhead', def.label), box);
  });

  const earned = new Set(stats.badges);
  return h('div.character',
    h('section.card.stack.char-preview', preview, h('p.rank', stats.rank.name, h('span.xp', `${stats.xp} XP`)), xpBar(stats), save),
    h('section.card.stack.char-options', h('h1', 'Your character'), h('p.muted', 'Earn XP and badges to unlock more.'), panes),
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
