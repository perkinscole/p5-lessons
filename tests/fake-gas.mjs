// A stand-in for Google's services, so gas/Code.gs can run here. It copies the limits that matter
// (50,000 characters a cell, formulas in cells). It is a model: real Apps Script may still differ.
import vm from 'node:vm';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CELL_LIMIT = 50000;

class FakeRange {
  constructor(sheet, row, col, rows, cols) { Object.assign(this, { sheet, row, col, rows, cols }); }
  getValues() {
    if (this.sheet.book.fail.reads) throw new Error('Service Spreadsheets failed while accessing document');
    this.sheet.reads++;
    this.sheet.book.cells += this.rows * this.cols;
    return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.cols }, (_, c) => this.sheet.grid[this.row - 1 + r]?.[this.col - 1 + c] ?? ''));
  }
  setValues(values) {
    values.forEach((vals, r) => vals.forEach((v, c) => this.sheet.setCell(this.row + r, this.col + c, v)));
    return this;
  }
  setNumberFormat() { this.sheet.plain = true; return this; }
  /** Like Sheets' own search: finds matching cells without handing the values to the script. */
  createTextFinder(text) {
    const range = this;
    const finder = {
      matchEntireCell: () => finder,
      matchCase: () => finder,
      findAll: () => {
        if (range.sheet.book.fail.reads) throw new Error('Service Spreadsheets failed while accessing document');
        const out = [];
        for (let r = 0; r < range.rows; r++) for (let c = 0; c < range.cols; c++) {
          if (String(range.sheet.grid[range.row - 1 + r]?.[range.col - 1 + c] ?? '') === String(text)) out.push({ getRow: () => range.row + r });
        }
        return out;
      },
      findNext: () => finder.findAll()[0] || null,
    };
    return finder;
  }
}

class FakeSheet {
  constructor(name, book) { this.name = name; this.book = book; this.grid = []; this.reads = 0; this.plain = false; }
  setCell(row, col, v) {
    if (typeof v === 'string' && v.length > CELL_LIMIT) throw new Error(`Cell over ${CELL_LIMIT} characters in ${this.name}`);
    if (typeof v === 'string' && v.startsWith('=')) throw new Error(`Would become a formula in ${this.name}: ${v.slice(0, 30)}`);
    while (this.grid.length < row) this.grid.push([]);
    this.grid[row - 1][col - 1] = v;
  }
  getRange(row, col, rows = 1, cols = 1) { return new FakeRange(this, row, col, rows, cols); }
  getLastRow() { return this.grid.length; }
  appendRow(vals) { const row = this.grid.length + 1; vals.forEach((v, c) => this.setCell(row, c + 1, v)); }
  deleteRow(row) { this.grid.splice(row - 1, 1); }
  setFrozenRows() {}
}

/** Stands in for the Classroom API. Serves `data` two items per page, to exercise paging. */
function fakeClassroom(data) {
  const page = (items, key, token) => {
    const at = Number(token || 0);
    const out = { [key]: items.slice(at, at + 2) };
    if (at + 2 < items.length) out.nextPageToken = String(at + 2);
    return out;
  };
  return {
    Courses: {
      list: (o) => page(data.courses || [], 'courses', o.pageToken),
      Students: { list: (id, o) => page((data.rosters || {})[id] || [], 'students', o.pageToken) },
      CourseWork: {
        list: (id, o) => page((data.work || {})[id] || [], 'courseWork', o.pageToken),
        // Like the real API: grades can only be written on coursework this app created.
        create: (body, courseId) => {
          data.created = data.created || [];
          if (!body.title || !body.maxPoints) throw new Error('title and maxPoints are required');
          const work = { ...body, id: `made-${data.created.length + 1}`, courseId, alternateLink: 'https://classroom.test/a' };
          data.created.push(work);
          return work;
        },
        StudentSubmissions: {
          list: (id, workId, o) => page(workId === '-' ? (data.subs || {})[id] || [] : ((data.madeSubs || {})[id] || []).filter((x) => !x.courseWorkId || x.courseWorkId === workId), 'studentSubmissions', o.pageToken),
          patch: (body, courseId, workId, subId, opts) => {
            if (!(data.created || []).some((w) => w.id === workId)) throw new Error('ProjectPermissionDenied');
            if (!opts.updateMask.includes('draftGrade') || !opts.updateMask.includes('assignedGrade')) throw new Error('bad mask');
            data.patched = data.patched || [];
            data.patched.push({ courseId, workId, subId, ...body });
            return body;
          },
        },
      },
    },
  };
}

/** Create a server. `server.as(email)` returns a function that calls api() as that person. */
export function createServer({ owner = 'teacher@school.test', bound = true, codeFile = '../gas/Code.gs', htmlDir = null, classroom = null } = {}) {
  // Every spreadsheet that exists in this pretend Drive, by id.
  const books = new Map();
  const fail = { open: false, reads: false, busyLock: false };
  const makeBook = (id, name) => {
    const tabs = new Map();
    const book = {
      tabs, fail, cells: 0,
      getId: () => id,
      getName: () => name,
      getUrl: () => `https://docs.google.com/spreadsheets/d/${id}/edit`,
      getSheetByName: (n) => tabs.get(n) || null,
      insertSheet: (n) => { const s = new FakeSheet(n, book); tabs.set(n, s); return s; },
      copy: (newName) => {
        const twin = makeBook(`fake-copy-${String(books.size).padStart(4, '0')}-abcdefghij`, newName);
        for (const [n, sh] of tabs) twin.insertSheet(n).grid = sh.grid.map((r) => r.slice());
        return twin;
      },
    };
    books.set(id, book);
    return book;
  };
  const spreadsheet = makeBook('fake-sheet-000000000000000', 'Pixel Trail Data');
  const sheets = spreadsheet.tabs;
  const cacheStore = new Map();
  const translated = [];
  let activeEmail = '';
  const mail = [];
  const triggers = [];
  const props = new Map();
  let created = 0;
  let opens = 0;
  const sandbox = {
    console: { error() {}, log() {}, warn() {} },
    Session: { getActiveUser: () => ({ getEmail: () => activeEmail }), getEffectiveUser: () => ({ getEmail: () => owner }), getScriptTimeZone: () => 'America/New_York' },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => (bound ? spreadsheet : null),
      openById: (id) => {
        opens++;
        if (fail.open) throw new Error('Service Spreadsheets failed while accessing document with id ' + id);
        if (!books.has(id)) throw new Error('Document ' + id + ' is missing (perhaps it was deleted?)');
        return books.get(id);
      },
      create: (name) => { created++; return created === 1 && !bound ? spreadsheet : makeBook(`fake-new-${created}-abcdefghijklmnop`, name); },
      flush() {},
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() { if (fail.busyLock) throw new Error('Lock timeout: another process was holding the lock for too long.'); }, releaseLock() {} }) },
    Utilities: {
      getUuid: () => randomUUID(), sleep() {}, formatDate: (d) => d.toISOString().slice(0, 10),
      DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, text) => [...createHash(alg).update(text, 'utf8').digest()],
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
    },
    // A pretend translator: it marks the text so tests can see it went through, and keeps the tags.
    LanguageApp: { translate: (text, from, to, opts) => {
      translated.push(text);
      if (fail.translate) throw new Error('Service invoked too many times for one day: translate.');
      if (!opts || opts.contentType !== 'html') throw new Error('expected html');
      return `[${to}] ${text}`;
    } },
    // Like the real cache: text only, under 100 KB a value, gone after its time.
    CacheService: { getScriptCache: () => ({
      get: (k) => { const hit = cacheStore.get(k); return hit && hit.until > Date.now() ? hit.value : null; },
      put: (k, v, seconds = 600) => { if (String(v).length > 100000) throw new Error('Argument too large: value'); cacheStore.set(k, { value: String(v), until: Date.now() + seconds * 1000 }); },
      remove: (k) => { cacheStore.delete(k); },
      getAll: (keys) => Object.fromEntries(keys.map((k) => [k, cacheStore.get(k)]).filter(([, hit]) => hit && hit.until > Date.now()).map(([k, hit]) => [k, hit.value])),
      putAll: (values, seconds = 600) => { for (const [k, v] of Object.entries(values)) cacheStore.set(k, { value: String(v), until: Date.now() + seconds * 1000 }); },
    }) },
    Classroom: fakeClassroom(classroom || {}),
    MailApp: { sendEmail: (to, subject, body) => mail.push({ to, subject, body }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.test/exec' }),
      getProjectTriggers: () => triggers,
      deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: (fn) => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create: () => triggers.push({ getHandlerFunction: () => fn }) }) }) }) }),
    },
    HtmlService: { createHtmlOutputFromFile: (name) => {
      const text = readFileSync(new URL(`${htmlDir}/${name}.html`, import.meta.url), 'utf8');
      // Real Apps Script refuses a file that starts as bare text, such as raw JavaScript.
      if (!/^\s*</.test(text)) throw new Error(`Malformed HTML content: ${text.slice(0, 40)}`);
      return { getContent: () => text };
    } },
  };
  vm.createContext(sandbox);
  let source = readFileSync(new URL(codeFile, import.meta.url), 'utf8');
  if (codeFile === '../gas/Code.gs') {
    for (const f of ['pace', 'blame']) source += `\n${readFileSync(new URL(`../js/game/${f}.js`, import.meta.url), 'utf8').replace(/^export /gm, '')}`;
  }
  vm.runInContext(source, sandbox, { filename: 'Code.gs' });

  const raw = (email, method, args = []) => {
    activeEmail = email;
    // Each real request is a fresh run, so nothing found in an earlier one is remembered.
    vm.runInContext('spreadsheet_ = null', sandbox);
    return JSON.parse(sandbox.api(method, JSON.stringify(args)));
  };
  return {
    sheets,
    mail,
    triggers,
    run: (email, fn, ...args) => { activeEmail = email; return sandbox[fn](...args); },
    createdCount: () => created,
    books,
    props,
    /** Every text the pretend translator was asked for. */
    translated,
    /** Another spreadsheet in the same Drive. */
    newBook: (name) => makeBook(`fake-other-${String(books.size).padStart(3, '0')}-abcdefghijklmn`, name),
    fail,
    /** The spreadsheet the app is using right now. */
    current: () => books.get(props.get('DATA_SHEET_ID')),
    /** Cells handed to the script by getValues since the last call to this. */
    cellsRead: () => { let n = 0; for (const b of books.values()) { n += b.cells; b.cells = 0; } return n; },
    clearCache: () => cacheStore.clear(),
    raw,
    as: (email) => (method, ...args) => {
      const r = raw(email, method, args);
      if (!r.ok) throw new Error(r.error);
      return JSON.parse(JSON.stringify(r.data));
    },
    /** Names a browser could call: every top-level function without a trailing underscore. */
    publicFunctions: () => Object.keys(sandbox).filter((k) => typeof sandbox[k] === 'function' && !k.endsWith('_')),
  };
}
