// Who needs a check-in. This one file runs in the browser (demo mode) and on the server: the build
// strips "export" and adds it to Code.gs. So it can't import anything, and helper names end in _
// to keep them from being callable from the browser on Apps Script.

const DAY_MS_ = 86400000;
const CORE_LESSONS_ = 15;

/** Beyond the Summit and side trail lessons don't count toward keeping up. */
export function isCoreLesson_(id) {
  return !/^[pasm][678]$/.test(id) && id !== 'c3' && id !== 't2';
}

/** School days between two dates, not counting weekends. */
export function weekdaysBetween_(from, to) {
  let days = 0;
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const end = new Date(to);
  end.setHours(12, 0, 0, 0);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  return days;
}

/** How many core lessons a student should have finished by now, or null with no term dates. */
export function expectedLessons_(pace, now) {
  if (!pace || !pace.term_start || !pace.term_end) return null;
  const start = new Date(`${pace.term_start}T00:00:00`).getTime();
  const end = new Date(`${pace.term_end}T23:59:59`).getTime();
  if (!(end > start)) return null;
  const share = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  return Math.floor(CORE_LESSONS_ * share);
}

/**
 * Check each student. students: [{ id, display_name, works: [{ lesson_id, status, updated_at, submitted_at }] }].
 * Returns one entry per student, most urgent first. level is 'behind', 'watch', or 'ok'.
 */
export function paceAlerts_(students, pace, now = new Date()) {
  const expected = expectedLessons_(pace, now);
  const termStarted = pace && pace.term_start && new Date(`${pace.term_start}T00:00:00`) <= now;
  const rank = { behind: 0, watch: 1, ok: 2 };
  return students.map((s) => {
    const works = s.works || [];
    const finished = works.filter((w) => w.status !== 'in_progress' && isCoreLesson_(w.lesson_id));
    const done = finished.length;
    const reasons = [];
    let level = 'ok';
    const raise = (to, text) => {
      reasons.push(text);
      if (rank[to] < rank[level]) level = to;
    };

    if (expected !== null) {
      const gap = expected - done;
      if (gap >= 3) raise('behind', `${gap} lessons behind`);
      else if (gap === 2) raise('watch', '2 lessons behind');
    }

    const times = works.map((w) => Date.parse(w.updated_at)).filter((t) => !Number.isNaN(t));
    if (times.length) {
      const idle = weekdaysBetween_(new Date(Math.max(...times)), now);
      if (idle >= 10) raise('behind', `No work in ${idle} school days`);
      else if (idle >= 5) raise('watch', `No work in ${idle} school days`);
    } else if (termStarted && weekdaysBetween_(new Date(`${pace.term_start}T00:00:00`), now) >= 3) {
      raise('behind', 'Has not started');
    }

    for (const w of works) {
      if (w.status !== 'returned' || !w.updated_at) continue;
      const waiting = weekdaysBetween_(new Date(w.updated_at), now);
      if (waiting >= 3) { raise('watch', 'Has work to fix and resubmit'); break; }
    }

    return { id: s.id, display_name: s.display_name, done, expected, level, reasons };
  }).sort((a, b) => rank[a.level] - rank[b.level] || a.done - b.done || a.display_name.localeCompare(b.display_name));
}
