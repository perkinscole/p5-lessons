// What goes into each Google Classroom assignment: which lessons it covers, and the description
// students and families read there. No screen code here, so tests can check every assignment.
//
// The description says where the stop is on the trail, what the lesson is, how to do it, and which
// Massachusetts standards it addresses. Standard text is copied exactly as the state wrote it.
import { getLesson } from './engine.js';
import { PATHS, PATH_IDS, STAGES } from './graph.js';
import { alignmentFor, standardByCode } from './alignment.js';

/** Classroom accepts far more, but a description this long is already more than anyone reads. */
export const DESCRIPTION_MAX = 8000;

/** Lesson numbers, as in the gradebook. Roads share numbers, so a road number lists each road's lesson. */
export function lessonSlots() {
  const slots = [];
  let n = 0;
  for (const st of STAGES) {
    const shared = st.kind === 'shared';
    const count = shared ? st.lessons.length : st.branches[PATH_IDS[0]].length;
    for (let i = 0; i < count; i++) {
      n++;
      const ids = shared ? [st.lessons[i]] : PATH_IDS.map((p) => st.branches[p][i]);
      const slot = {
        key: `L${n}`, n, ids, beyond: !!st.beyond, stage: st.name, theme: st.theme || '',
        title: shared ? getLesson(ids[0]).title : `${st.name} ${i + 1}`,
        detail: shared ? '' : [...new Set(ids.map((id) => getLesson(id).title))].join(' · '),
      };
      slots.push(slot);
    }
  }
  const core = slots.filter((s) => !s.beyond).length;
  for (const slot of slots) slot.description = assignmentDescription(slot, core);
  return slots;
}

const HOW = [
  'How to do this assignment',
  '1. Open the Pixel Trail link below and sign in with your school Google account.',
  '2. Work through the steps in order and answer the check questions.',
  '3. Press "Submit lesson" at the end. Your teacher reviews and grades it in Pixel Trail.',
];

/**
 * Each standard a slot touches. `assessed` is true when any lesson here assesses it, and `roads`
 * names the roads that do. `practiced` names the roads that only practice it. At a stop with one
 * lesson both lists are empty, since there is nothing to tell apart.
 */
export function slotStandards(slot) {
  const found = new Map();
  slot.ids.forEach((id, k) => {
    const a = alignmentFor(id);
    const road = slot.ids.length > 1 ? PATHS[PATH_IDS[k]].road : '';
    for (const [list, assessed] of [[a.anchor, true], [a.support, false]]) {
      for (const code of list) {
        const standard = standardByCode(code);
        if (!standard) continue;
        if (!found.has(code)) found.set(code, { code, text: standard.text, assessed: false, roads: [], practiced: [] });
        const entry = found.get(code);
        if (assessed) entry.assessed = true;
        const into = assessed ? entry.roads : entry.practiced;
        if (road && !into.includes(road)) into.push(road);
      }
    }
  });
  // A road that assesses a standard isn't also listed as only practicing it.
  for (const entry of found.values()) entry.practiced = entry.practiced.filter((r) => !entry.roads.includes(r));
  return [...found.values()].sort((a, b) => Number(b.assessed) - Number(a.assessed) || a.code.localeCompare(b.code));
}

/** The plain text for one assignment. Classroom shows it as written, line breaks and all. */
export function assignmentDescription(slot, coreCount) {
  const lines = [];
  const where = slot.beyond ? `Lesson ${slot.n} (Beyond the Summit, optional)` : `Lesson ${slot.n} of ${coreCount}`;
  lines.push(`Pixel Trail · ${slot.stage} · ${where}`);
  if (slot.theme) lines.push(`This part of the trail: ${slot.theme}.`);
  lines.push('');

  if (slot.ids.length === 1) {
    const lesson = getLesson(slot.ids[0]);
    lines.push(lesson.title, lesson.hook, '');
    lines.push(`You will learn: ${lesson.concepts.join(', ')}.`);
    lines.push(`Time: about ${lesson.mins} minutes.`);
  } else {
    lines.push('Every road has its own lesson at this stop. Do the one on your road.', '');
    slot.ids.forEach((id, k) => {
      const lesson = getLesson(id);
      const path = PATHS[PATH_IDS[k]];
      lines.push(`• ${path.road} (${path.genre}): ${lesson.title}. ${lesson.hook} You will learn: ${lesson.concepts.join(', ')}. About ${lesson.mins} minutes.`);
    });
  }
  lines.push('', ...HOW);

  const standards = slotStandards(slot);
  if (standards.length) {
    const many = slot.ids.length > 1;
    const show = (s, roads) => `• ${s.code}${many && roads.length < slot.ids.length ? ` (${roads.join(', ')})` : ''}: ${s.text}`;
    const assessed = standards.filter((s) => s.assessed);
    // At a fork, a standard one road assesses may only be practiced on another, so it can appear in both lists.
    const practiced = standards.filter((s) => (s.assessed ? s.practiced.length > 0 : true));
    lines.push('', 'Massachusetts Digital Literacy and Computer Science standards (grades 6 to 8)');
    if (assessed.length) lines.push(many ? 'Assessed at this stop:' : 'Assessed in this lesson:', ...assessed.map((s) => show(s, s.roads)));
    if (practiced.length) lines.push(assessed.length ? 'Also practiced:' : 'Practiced in this lesson:', ...practiced.map((s) => show(s, s.practiced)));
  }
  return lines.join('\n').slice(0, DESCRIPTION_MAX);
}

/** The lesson a student should open for an assignment's link: the one on their own road. */
export function lessonForStop(key, path) {
  const slot = lessonSlots().find((s) => s.key === String(key));
  if (!slot) return null;
  if (slot.ids.length === 1) return slot.ids[0];
  const k = PATH_IDS.indexOf(path);
  return k < 0 ? null : slot.ids[k];
}
