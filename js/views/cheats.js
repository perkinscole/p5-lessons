// The code cheat sheet a student can open at any time: the commands they have met so far, grouped
// by the lesson that taught each one. It asks the server for nothing.
import { h, clear, modal } from '../ui.js';
import { cheatSheet } from '../curriculum/cheats.js';
import { sequence } from '../curriculum/graph.js';
import { loadMe } from './student.js';

/** The lessons a sheet covers: the student's road up to `currentId`, plus anything else they finished. */
export function lessonsSoFar(path, done, currentId) {
  const road = sequence(path || 'platformer');
  const upTo = currentId && road.includes(currentId) ? road.indexOf(currentId) : -1;
  const ids = road.filter((id, i) => done.has(id) || i <= upTo);
  for (const id of done) if (!ids.includes(id)) ids.push(id);
  if (currentId && !ids.includes(currentId)) ids.push(currentId);
  return ids;
}

/** The sheet itself. The newest lesson is open; a search opens everything that matches. */
export function cheatSheetBody(ids, currentId) {
  const sheet = cheatSheet(ids);
  const total = sheet.reduce((a, s) => a + s.items.length, 0);
  const list = h('div.cheat-list');
  const find = h('input.cheat-find', { type: 'search', placeholder: 'Find a command, like rect or if', 'aria-label': 'Find a command' });
  const open = currentId && sheet.some((s) => s.lesson_id === currentId) ? currentId : (sheet[sheet.length - 1] || {}).lesson_id;
  const draw = () => {
    const want = find.value.trim().toLowerCase();
    const hit = (i) => !want || i.form.toLowerCase().includes(want) || i.does.toLowerCase().includes(want);
    const shown = sheet.map((s) => ({ ...s, items: s.items.filter(hit) })).filter((s) => s.items.length);
    clear(list).append(...(shown.length ? shown.map((s) => h('details.cheat-lesson', { open: !!want || s.lesson_id === open },
      h('summary', h('strong', s.title), h('span.muted.small', ` · ${s.items.length} new`), s.lesson_id === currentId && h('span.cheat-now', 'This lesson')),
      h('dl.cheat-items', s.items.map((i) => h('div',
        h('dt', h('code', i.form)),
        h('dd', i.does, i.example && i.example !== i.form && h('span.cheat-example', h('span.muted.small', 'Like this: '), h('code', i.example)))))),
    )) : [h('p.muted', 'Nothing matches that. Try a shorter word.')]));
  };
  find.addEventListener('input', draw);
  draw();
  return h('div.stack.cheat-sheet',
    h('p.eyebrow', 'Your code so far'),
    h('h2', '📒 Cheat sheet'),
    total
      ? h('p', `${total} piece${total === 1 ? '' : 's'} of code you have met, with what each one does. It grows with every lesson.`)
      : h('p', 'Your cheat sheet fills in as you finish lessons.'),
    total > 8 && find,
    list);
}

export function openCheatSheet(ids, currentId) {
  modal((close) => h('div.stack', cheatSheetBody(ids, currentId), h('div.row.end', h('button.btn.primary', { type: 'button', onclick: close }, 'Close'))), { wide: true });
}

/** The same sheet as a page, from the Tools menu when no lesson is open. */
export async function viewCheats() {
  const me = await loadMe();
  const path = me.student.path;
  const road = sequence(path || 'platformer');
  const next = road.find((id) => !me.done.has(id));
  return h('div.card.stack', cheatSheetBody(lessonsSoFar(path, me.done, next), next));
}
