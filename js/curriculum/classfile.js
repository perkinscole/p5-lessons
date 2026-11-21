// A whole class as one file: every student, their work, grades and badges. No screen code, so it
// is tested. The file holds real names and school emails, so it belongs on the teacher's own
// computer; the hosted site reads it in the browser and never sends the names anywhere.
export const CLASS_FILE = 'pixel-trail-class';

/**
 * Put a class file together from what the app already loads for a teacher.
 * `full` maps a work's id to its full copy (code, files, grade), from `getWorkFull`.
 */
export function buildClassFile(cls, students, board, works, full, now = new Date()) {
  const awardsOf = new Map(board.map((b) => [b.id, b.awards || []]));
  return {
    format: CLASS_FILE, version: 1, exported_at: now.toISOString(), class: { name: cls.name },
    students: students.map((s) => ({
      name: s.display_name, email: s.email || '', avatar: s.avatar || null, path: s.path || '', game_name: s.game_name || '',
      awards: (awardsOf.get(s.id) || []).map((a) => ({ badge_id: a.badge_id, note: a.note || '', created_at: a.created_at || '' })),
      works: works.filter((w) => w.student_id === s.id).map((w) => {
        const f = full.get(w.id) || {};
        return {
          lesson_id: w.lesson_id, status: w.status, code: f.code || '', assets: f.assets || {}, files: f.files || {},
          reflection: f.reflection ?? w.reflection ?? '', stretch_done: w.stretch_done || 0, quiz_right: w.quiz_right || 0, quiz_total: w.quiz_total || 0,
          quiz_first: f.quiz_first || w.quiz_first || {}, step_at: w.step_at || 0, submitted_at: w.submitted_at || '', updated_at: w.updated_at || '',
          grade: f.grade ? { scores: f.grade.scores || {}, total: f.grade.total || 0, max_total: f.grade.max_total || 0, feedback: f.grade.feedback || '', graded_at: f.grade.graded_at || '' } : null,
        };
      }),
    })),
  };
}

/** Is this a class file we can read? Returns a reason when it is not. */
export function checkClassFile(data) {
  if (!data || data.format !== CLASS_FILE) return 'This is not a Pixel Trail class file.';
  if (data.version !== 1) return 'This class file is from a newer version of Pixel Trail.';
  if (!Array.isArray(data.students) || !data.students.every((s) => s && Array.isArray(s.works))) return 'This class file is damaged.';
  return '';
}

/**
 * What would leave the computer for one student if the file were brought in: everything except
 * who they are. Names and emails are not in it.
 */
export function withoutIdentity(student) {
  return {
    profile: { avatar: student.avatar || null, path: student.path || '', game_name: student.game_name || '' },
    awards: (student.awards || []).map((a) => ({ badge_id: a.badge_id, note: a.note || '' })),
    works: student.works,
  };
}

/** Places where a student's own name appears inside the work that would be sent. */
export function namesInWork(data) {
  const found = [];
  const parts = data.students.flatMap((s) => String(s.name || '').split(/\s+/).concat(String(s.email || '').split('@')[0])).map((p) => p.replace(/[^\p{L}]/gu, '')).filter((p) => p.length >= 4);
  const words = [...new Set(parts.map((p) => p.toLowerCase()))];
  if (!words.length) return found;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
  data.students.forEach((s) => {
    for (const w of s.works) {
      const text = [w.code, w.reflection, s.game_name, ...Object.values(w.files || {}), w.grade ? w.grade.feedback : ''].join('\n');
      const m = text.match(re);
      if (m) found.push({ student: s.name, lesson_id: w.lesson_id, word: m[0] });
    }
  });
  return found;
}

/** Split one student's work into pieces small enough to send, never splitting a lesson. */
export function inPieces(payload, limit = 700000) {
  const pieces = [];
  let now = { profile: payload.profile, awards: payload.awards, works: [] };
  let size = 0;
  for (const w of payload.works) {
    const n = JSON.stringify(w).length;
    if (now.works.length && size + n > limit) { pieces.push(now); now = { works: [] }; size = 0; }
    now.works.push(w);
    size += n;
  }
  pieces.push(now);
  return pieces;
}
