import { setMl5Loader } from '../sandbox.js';
// Data store for the real app, which runs on Google Apps Script. Same interface as local.js.
// Everything goes through the server's single api() function, which decides who may do what.

/** One trip to the server. */
function send(method, args) {
  return new Promise((resolve, reject) => {
    window.google.script.run
      .withFailureHandler((e) => reject(new Error(e?.message || 'Could not reach the server. Check your connection.')))
      .withSuccessHandler((text) => {
        const res = JSON.parse(text);
        if (res.ok) resolve(res.data);
        else reject(new Error(res.error));
      })
      .api(method, JSON.stringify(args));
  });
}

// Every trip to Apps Script costs about a second, whatever it carries. So calls made at the same
// moment travel together as one batch, and recent answers to read-only calls are reused.
const MAX_BATCH = 12;
let queue = [];
function flush() {
  const jobs = queue;
  queue = [];
  for (let i = 0; i < jobs.length; i += MAX_BATCH) {
    const group = jobs.slice(i, i + MAX_BATCH);
    if (group.length === 1) {
      const [j] = group;
      send(j.method, j.args).then(j.resolve, j.reject);
      continue;
    }
    send('batch', [group.map((j) => [j.method, j.args])]).then(
      (results) => group.forEach((j, k) => (results[k].ok ? j.resolve(results[k].data) : j.reject(new Error(results[k].error)))),
      (e) => group.forEach((j) => j.reject(e)),
    );
  }
}
function call(method, ...args) {
  return new Promise((resolve, reject) => {
    if (!queue.length) setTimeout(flush, 0);
    queue.push({ method, args, resolve, reject });
  });
}

// Reads that are safe to reuse for a few seconds. Anything else might change data, so it clears them.
const READS = new Set(['session', 'listClasses', 'getClass', 'listStudents', 'classBoard', 'myWorks', 'classWork', 'getClassPlan',
  'classroomWork', 'classAlerts', 'alertSummary', 'getPace', 'getDigest', 'arcade', 'listSprites', 'mySprites', 'listSongs', 'mySongs',
  'listTeams', 'gradeSyncStatus']);
const FRESH_MS = 15000;
const cache = new Map();
let generation = 0;
function cachedCall(method, ...args) {
  if (!READS.has(method)) {
    generation++;
    cache.clear();
    return call(method, ...args).finally(() => { generation++; cache.clear(); });
  }
  const key = `${method} ${JSON.stringify(args)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
  const born = generation;
  const promise = call(method, ...args);
  cache.set(key, { at: Date.now(), promise });
  promise.then(
    () => { if (generation !== born) cache.delete(key); },
    () => cache.delete(key),
  );
  return promise;
}

const METHODS = [
  'listClasses', 'createClass', 'deleteClass', 'getClass', 'listStudents', 'addStudents', 'removeStudent', 'setStudentPath',
  'classBoard', 'updateProfile', 'myWorks', 'saveWork', 'submitWork', 'setShared', 'classWork', 'getWorkFull', 'saveGrade',
  'getClassPlan', 'saveClassPlan', 'listGoogleCourses', 'importCourses', 'classroomWork', 'classAlerts', 'alertSummary', 'getPace', 'savePace', 'getDigest', 'setDigest', 'giveAward', 'arcade', 'teacherUnshare', 'listSprites', 'mySprites', 'listSongs', 'mySongs', 'saveSong', 'deleteSong', 'teamFor', 'takeKeyboard', 'passKeyboard', 'listTeams', 'saveTeams', 'gradeSyncStatus', 'pushGrades', 'createAssignments', 'setMusicOpen', 'saveSprite', 'deleteSprite',
];

/** ml5 is stored in pieces, because Apps Script files can't comfortably hold it whole. */
async function loadMl5Pieces() {
  // Pieces travel separately, since a batch of them would be one very large answer, but at the same time.
  let text = '';
  for (let start = 0; ; start += 5) {
    const parts = await Promise.all([0, 1, 2, 3, 4].map((k) => send('libraryPart', [start + k])));
    for (const part of parts) {
      if (!part) return text;
      text += part;
    }
  }
}

export function createAppsScriptStore() {
  setMl5Loader(loadMl5Pieces);
  const store = {
    mode: 'appsscript',
    usesPasscodes: false,
    hasClassroom: true,
    // A whole class shares one script's quota, so students autosave far less often than in the demo.
    saveDelay: 30000,
    lastEmail: '',
    async session() {
      const s = await cachedCall('session');
      if (!s || !s.role) {
        store.lastEmail = s?.email || '';
        return null;
      }
      return s;
    },
    async signOut() { /* Sign-in belongs to the student's Google account. */ },
  };
  for (const m of METHODS) store[m] = (...args) => cachedCall(m, ...args);
  return store;
}
