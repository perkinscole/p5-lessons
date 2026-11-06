// The class Arcade: games students chose to share, playable right here.
import { h, clear, modal, attempt, toast, confirmBox } from '../ui.js';
import { app, render } from '../main.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS } from '../curriculum/graph.js';
import { createPlayer } from '../sandbox.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';

function playGame(g) {
  let player;
  modal((close) => {
    player = createPlayer();
    const name = g.student.game_name || getLesson(g.lesson_id).title;
    const box = h('div.stack',
      h('div.row.between', h('div', h('h2', name), h('p.muted', `by ${g.student.display_name}`)), h('button.btn', { onclick: close }, 'Close')),
      h('div.game-frame', player.el),
      h('p.muted.small', 'Click the game so it can hear your keyboard.'),
    );
    setTimeout(() => player.run(g.code, g.assets || {}), 0);
    return box;
  }, { wide: true, onClose: () => player && player.destroy() });
}

export async function viewArcade(_main, classIdParam) {
  const isStudent = app.session.role === 'student';
  const classId = isStudent ? app.session.class.id : classIdParam;
  const games = await app.store.arcade(classId);
  const list = h('div.arcade-grid', games.map((g) => h('article.card.arcade-card', { style: g.student.path ? `--road:${PATHS[g.student.path].color}` : null },
    h('img', { src: avatarURL(g.student.avatar || defaultAvatar(g.student_id), 5), alt: '' }),
    h('h2', g.student.game_name || getLesson(g.lesson_id).title),
    h('p.muted', `by ${g.student.display_name}`),
    h('p.small', g.student.path ? PATHS[g.student.path].genre : 'Base Camp game', ' · ', getLesson(g.lesson_id).title),
    h('div.row',
      h('button.btn.primary', { onclick: () => playGame(g) }, 'Play'),
      !isStudent && h('button.btn', {
        onclick: async () => {
          if (await confirmBox('Remove this game from the Arcade?', 'The student keeps their work. It just stops being shared.', 'Remove')) {
            await attempt(() => app.store.teacherUnshare(g.id));
            toast('Removed from the Arcade.');
            render();
          }
        },
      }, 'Remove'),
    ),
  )));
  return h('div.stack',
    h('div', h('h1', 'The Arcade'), h('p.muted', 'Games your class chose to share. Press Share to Arcade in a lesson to add yours.')),
    games.length ? list : h('div.card', h('p', 'No games yet. Be the first to share one!')),
  );
}

export { clear };
