// Lesson ratings: a quick "how was it?" for students after submitting, and totals for the teacher.
// Ratings never affect grades or XP, and the teacher sees them without names.
import { h, clear, debounce } from '../ui.js';
import { app } from '../main.js';
import { getLesson, allLessons } from '../curriculum/engine.js';

export const CONFUSING = [
  ['instructions', 'The instructions'],
  ['where', 'Where the code goes'],
  ['code', 'The code itself'],
  ['errors', 'Error messages'],
  ['questions', 'The check questions'],
  ['nothing', 'Nothing!'],
];
const LABEL = Object.fromEntries(CONFUSING);
const STAR_WORDS = ['Not for me', 'It was OK', 'Pretty good', 'I liked it', 'Loved it!'];

/** The rating box shown after a lesson is submitted. Every tap saves, so there is no button. */
export function ratingBox(lessonId) {
  const lesson = getLesson(lessonId);
  const state = { stars: 0, confusing: [], step: -1, comment: '' };
  const saved = h('span.muted.small', { 'aria-live': 'polite' });
  const save = debounce(async () => {
    if (!state.stars) return;
    try { await app.store.rateLesson(lessonId, state); saved.textContent = 'Saved. Thanks!'; } catch (_) { saved.textContent = "Couldn't save your rating."; }
  }, 500);
  const more = h('div.stack.tight');
  const stars = h('div.rate-stars', { role: 'radiogroup', 'aria-label': 'Stars' });
  const word = h('span.rate-word');

  function drawStars() {
    clear(stars).append(...[1, 2, 3, 4, 5].map((n) => h('button.rate-star', {
      type: 'button', role: 'radio', 'aria-checked': state.stars === n ? 'true' : 'false', 'aria-label': `${n} star${n === 1 ? '' : 's'}: ${STAR_WORDS[n - 1]}`,
      class: n <= state.stars ? 'on' : '',
      onclick: () => { state.stars = n; drawStars(); drawMore(); save(); },
    }, '★')));
    word.textContent = state.stars ? STAR_WORDS[state.stars - 1] : '';
  }
  function drawMore() {
    if (!state.stars) return;
    const confused = state.confusing.some((k) => k !== 'nothing');
    const comment = h('input', { maxlength: 200, value: state.comment, placeholder: 'Anything else? (optional)', 'aria-label': 'Anything else you want your teacher to know',
      oninput: (e) => { state.comment = e.target.value; save(); } });
    clear(more).append(...[
      h('p.rate-q', 'Was anything confusing?'),
      h('div.rate-chips', CONFUSING.map(([key, label]) => h('button.rate-chip', {
        type: 'button', 'aria-pressed': state.confusing.includes(key) ? 'true' : 'false',
        onclick: () => {
          if (key === 'nothing') state.confusing = state.confusing.includes('nothing') ? [] : ['nothing'];
          else state.confusing = state.confusing.includes(key) ? state.confusing.filter((k) => k !== key) : [...state.confusing.filter((k) => k !== 'nothing'), key];
          if (!state.confusing.some((k) => k !== 'nothing')) state.step = -1;
          drawMore();
          save();
        },
      }, label))),
      confused && h('label.field.small', h('span', 'Which step?'),
        h('select', { onchange: (e) => { state.step = Number(e.target.value); save(); } },
          h('option', { value: -1 }, 'Not sure'), lesson.steps.map((s, i) => h('option', { value: i, selected: state.step === i }, `${i + 1}. ${s.title}`)))),
      comment,
    ].filter(Boolean));
  }
  drawStars();
  return h('div.rate',
    h('p.rate-q', 'How was this lesson?'),
    h('div.row', stars, word),
    more,
    h('p.muted.small', 'Your teacher sees ratings without names. ', saved));
}

/** The class's Feedback tab: what students thought of each lesson. */
export async function feedbackTab(cls) {
  const ratings = await app.store.lessonRatings(cls.id);
  if (!ratings.length) {
    return h('section.card.stack', h('h2', 'No ratings yet'),
      h('p', 'After submitting a lesson, students can give it 1 to 5 stars and say what was confusing. Their answers add up here, without names.'));
  }
  const order = allLessons().map((l) => l.id);
  ratings.sort((a, b) => order.indexOf(a.lesson_id) - order.indexOf(b.lesson_id));
  const total = ratings.reduce((a, r) => a + r.count, 0);
  const overall = ratings.reduce((a, r) => a + r.average * r.count, 0) / total;
  const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const row = (r) => {
    const lesson = getLesson(r.lesson_id);
    const reasons = top(r.confusing).filter(([k]) => k !== 'nothing');
    const steps = top(r.steps);
    const fine = r.confusing.nothing || 0;
    return h('tr',
      h('th', { scope: 'row' }, lesson ? lesson.title : r.lesson_id),
      h('td.num', r.count),
      h('td', h('strong', { class: r.average < 3 ? 'warn' : '' }, `★ ${r.average.toFixed(1)}`),
        h('div.rate-bars', { 'aria-label': `Star counts: ${r.stars.map((n, i) => `${i + 1} star: ${n}`).join(', ')}` },
          r.stars.map((n, i) => h('span', { title: `${i + 1} star${i ? 's' : ''}: ${n}`, style: `height:${4 + Math.round((n / r.count) * 26)}px` })))),
      h('td', reasons.length ? reasons.slice(0, 3).map(([k, n]) => h('div', `${LABEL[k] || k} (${n})`)) : h('span.muted', '—'),
        fine > 0 && h('div.muted.small', `${fine} said nothing was confusing`)),
      h('td', steps.length && lesson ? steps.slice(0, 2).map(([i, n]) => h('div', `${Number(i) + 1}. ${lesson.steps[i] ? lesson.steps[i].title : 'Step'} (${n})`)) : h('span.muted', '—')),
      h('td', r.comments.length ? h('details', h('summary', `${r.comments.length} comment${r.comments.length === 1 ? '' : 's'}`), h('ul.rate-comments', r.comments.map((c) => h('li', c)))) : h('span.muted', '—')));
  };

  return h('div.stack',
    h('section.card.stack',
      h('h2', `★ ${overall.toFixed(1)} average from ${total} rating${total === 1 ? '' : 's'}`),
      h('p.muted.small', 'Students rate a lesson after submitting it. Ratings have no names, and never affect grades or XP. A student who rates again replaces their earlier rating.')),
    h('div.table-wrap', h('table.board',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Lesson'), h('th.num', { scope: 'col' }, 'Ratings'), h('th', { scope: 'col' }, 'Stars'), h('th', { scope: 'col' }, 'What was confusing'), h('th', { scope: 'col' }, 'Which step'), h('th', { scope: 'col' }, 'Comments'))),
      h('tbody', ratings.map(row)))));
}
