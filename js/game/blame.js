// Who wrote what in a group project. This one file runs in the browser (demo mode) and on the server:
// the build strips "export" and adds it to Code.gs. So it can't import anything, and names end in _.
//
// Each file keeps one author number per line: 0 is starter code, and 1, 2, 3 are group members.
// Authors are stored as runs ([author, count]), since long stretches usually share one author.

const MAX_COMPARE_ = 4000000;
const clean_ = (line) => line.trim();
const splitLines_ = (text) => (text === '' ? [] : String(text).split('\n'));

/** For each new line, the index of the old line it matches, or -1. Moving spaces doesn't count as a change. */
export function matchLines_(oldLines, newLines) {
  const a = oldLines.map(clean_);
  const b = newLines.map(clean_);
  const match = new Array(b.length).fill(-1);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) { match[start] = start; start++; }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; match[endB] = endA; }
  const n = endA - start;
  const m = endB - start;
  if (n === 0 || m === 0 || n * m > MAX_COMPARE_) return match;
  // Longest common subsequence of the part that changed.
  const table = [];
  for (let i = 0; i <= n; i++) table.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[start + i] === b[start + j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[start + i] === b[start + j]) { match[start + j] = start + i; i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return match;
}

export function unpackAuthors_(runs) {
  const out = [];
  (runs || []).forEach((run) => { for (let i = 0; i < run[1]; i++) out.push(run[0]); });
  return out;
}

export function packAuthors_(authors) {
  const runs = [];
  authors.forEach((who) => {
    const last = runs[runs.length - 1];
    if (last && last[0] === who) last[1]++;
    else runs.push([who, 1]);
  });
  return runs;
}

/**
 * Credit one save. prev and next map file names to text, prevBlame maps file names to runs, and `who`
 * is the author number. Blank lines count for no one. Returns { blame, added, removed }.
 */
export function attribute_(prev, prevBlame, next, who) {
  const blame = {};
  let added = 0;
  let removed = 0;
  Object.keys(next).forEach((name) => {
    const oldLines = splitLines_(prev[name] === undefined ? '' : prev[name]);
    const newLines = splitLines_(next[name]);
    const oldAuthors = unpackAuthors_(prevBlame[name]);
    const match = matchLines_(oldLines, newLines);
    const kept = new Set(match.filter((m) => m !== -1));
    oldLines.forEach((line, i) => { if (!kept.has(i) && clean_(line)) removed++; });
    const authors = newLines.map((line, i) => {
      if (match[i] !== -1) return oldAuthors[match[i]] === undefined ? who : oldAuthors[match[i]];
      if (clean_(line)) added++;
      return who;
    });
    blame[name] = packAuthors_(authors);
  });
  Object.keys(prev).forEach((name) => {
    if (next[name] === undefined) splitLines_(prev[name]).forEach((line) => { if (clean_(line)) removed++; });
  });
  return { blame, added, removed };
}

/** How many lines of the finished code each author number wrote. */
export function lineShares_(blame) {
  const totals = {};
  Object.keys(blame || {}).forEach((name) => {
    blame[name].forEach((run) => { totals[run[0]] = (totals[run[0]] || 0) + run[1]; });
  });
  return totals;
}
