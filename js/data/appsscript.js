import { setMl5Loader } from '../sandbox.js';
import { createQueue } from './queue.js';
import { inflateBase64, PACKED_MARK } from '../pack.js';
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

// Every trip to Apps Script costs about a second, whatever it carries, and the whole class shares
// one account's limit. queue.js sends one trip at a time and retries quietly when Google is busy.
const { call, once, direct } = createQueue(send, {
  onBusy: (on) => window.dispatchEvent(new CustomEvent('app-busy', { detail: on })),
});

// Reads that are safe to reuse for a few seconds. Anything else might change data, so it clears them.
const READS = new Set(['session', 'listClasses', 'getClass', 'listStudents', 'classBoard', 'myWorks', 'classWork', 'getClassPlan',
  'classroomWork', 'classAlerts', 'alertSummary', 'getPace', 'getDigest', 'arcade', 'listSprites', 'mySprites', 'listSongs', 'mySongs',
  'listTeams', 'gradeSyncStatus', 'worldState', 'worldGhosts', 'lessonRatings', 'dataInfo', 'bugReports']);
const FRESH_MS = 15000;
const cache = new Map();
let generation = 0;
// Checked every few seconds, so they skip the cache both ways: never reused, and never clearing it.
const LIVE = new Set(['helpRequests', 'myHelp', 'translate']);
const ONCE = new Set(['saveWork']);
// Student view: a teacher's calls are run on the server as their pretend student.
let preview = false;
const PREVIEW_OWN = new Set(['previewStart', 'previewReset', 'translate']);
function cachedCall(method, ...args) {
  if (preview && !PREVIEW_OWN.has(method)) return cachedFor('asStudent', [method, args], method, `student ${method}`);
  return cachedFor(method, args, method, method);
}
/** `kind` decides how it is cached; `sent` and `sentArgs` are what travels. */
function cachedFor(sent, sentArgs, kind, label) {
  const method = sent;
  const args = sentArgs;
  if (LIVE.has(kind)) return call(method, ...args);
  if (!READS.has(kind)) {
    generation++;
    cache.clear();
    // An autosave that meets a busy server gives way at once; the lesson page saves again shortly.
    return (ONCE.has(kind) ? once : call)(method, ...args).finally(() => { generation++; cache.clear(); });
  }
  const key = `${label} ${JSON.stringify(args)}`;
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
  'getClassPlan', 'saveClassPlan', 'listGoogleCourses', 'importCourses', 'classroomWork', 'classAlerts', 'alertSummary', 'getPace', 'savePace', 'getDigest', 'setDigest', 'giveAward', 'arcade', 'teacherUnshare', 'listSprites', 'mySprites', 'listSongs', 'mySongs', 'saveSong', 'deleteSong', 'teamFor', 'takeKeyboard', 'passKeyboard', 'listTeams', 'saveTeams', 'gradeSyncStatus', 'pushGrades', 'createAssignments', 'updateAssignments', 'setMusicOpen', 'setWorld', 'worldState', 'worldEnter', 'worldRun', 'worldGhosts', 'rateLesson', 'lessonRatings', 'flagStep', 'myFlags', 'askHelp', 'cancelHelp', 'myHelp', 'helpRequests', 'markHelped', 'saveSprite', 'deleteSprite', 'dataInfo', 'backupNow', 'dataSwitch', 'dataCombine', 'translate', 'reportBug', 'bugReports', 'closeBug', 'previewStart', 'previewReset',
];

// ml5 is about 4 MB and only changes when the app is redeployed, so each device keeps its own copy.
const ML5_KEY = `ml5-${typeof BUILD_ID === 'undefined' ? 'dev' : BUILD_ID}`;
const idb = (mode, work) => new Promise((resolve, reject) => {
  const open = indexedDB.open('pixel-trail', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('files');
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const tx = open.result.transaction('files', mode);
    const req = work(tx.objectStore('files'));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  };
});

/** ml5 is stored in pieces, because Apps Script files can't comfortably hold it whole. */
async function loadMl5Pieces() {
  try {
    const kept = await idb('readonly', (files) => files.get(ML5_KEY));
    if (typeof kept === 'string' && kept.length > 1000000) return kept;
  } catch (_) { /* No storage here: download it. */ }
  // One piece at a time, in line with everything else, so a class starting together doesn't flood the server.
  let text = '';
  for (let k = 0; ; k++) {
    const part = await direct('libraryPart', [k]);
    if (!part) break;
    text += part;
  }
  // The small build sends ml5 compressed. Unpack it here, so what is kept on the device is ready to use.
  if (text.startsWith(PACKED_MARK)) text = await inflateBase64(text.slice(PACKED_MARK.length));
  try { await idb('readwrite', (files) => { files.clear(); return files.put(text, ML5_KEY); }); } catch (_) { /* It still works, just not kept. */ }
  return text;
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
    /** Turn student view on or off. While it is on, the session is the pretend student's. */
    setPreview(on) { preview = !!on; generation++; cache.clear(); },
    async session() {
      if (preview) return cachedCall('previewStart');
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
