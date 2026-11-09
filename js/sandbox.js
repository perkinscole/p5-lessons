// Runs student code safely. Each game runs in an iframe with no access to this site:
// no same-origin (so no login tokens or database), no navigation, no network.

import { installSynth } from './game/synth.js';
import { getSettings, onSettings } from './settings.js';

const PLACEHOLDER = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    g.fillStyle = (x >> 2) % 2 === (y >> 2) % 2 ? '#ff4fd8' : '#2a2a2a';
    g.fillRect(x, y, 1, 1);
  }
  return c.toDataURL();
})();

/** Add a stop check inside for and while loops, so a loop that never ends can't freeze the tab. */
export function protectLoops(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const isWord = (c) => c && /[\w$]/.test(c);
  const skipTrivia = (j) => {
    for (;;) {
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] === '/' && src[j + 1] === '/') { while (j < n && src[j] !== '\n') j++; continue; }
      if (src[j] === '/' && src[j + 1] === '*') { j += 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j += 2; continue; }
      return j;
    }
  };
  const skipString = (j) => {
    const q = src[j];
    j++;
    while (j < n && src[j] !== q) { if (src[j] === '\\') j++; j++; }
    return j + 1;
  };
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const e = skipString(i); out += src.slice(i, e); i = e; continue; }
    if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) { const e = skipTrivia(i); out += src.slice(i, e); i = e; continue; }
    const word = src.startsWith('for', i) ? 'for' : src.startsWith('while', i) ? 'while' : null;
    if (word && !isWord(src[i - 1]) && src[i - 1] !== '.' && !isWord(src[i + word.length])) {
      let j = skipTrivia(i + word.length);
      if (src[j] === '(') {
        let depth = 0;
        for (; j < n; j++) {
          if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(j) - 1; continue; }
          if (src[j] === '(') depth++;
          else if (src[j] === ')' && --depth === 0) break;
        }
        const k = skipTrivia(j + 1);
        if (src[k] === '{') {
          out += `${src.slice(i, k + 1)}__lp();`;
          i = k + 1;
          continue;
        }
      }
    }
    out += c;
    i++;
  }
  return out;
}

// p5 is written into each game's page rather than requested by it. A locked-down iframe has no
// origin of its own, and some browsers and school filters refuse its script requests outright.
let p5Text = null;
const loadP5 = () => {
  // On Apps Script, the build puts p5 into the page, with its script tags already made safe.
  const packed = document.getElementById('p5-src');
  if (packed) return Promise.resolve(packed.dataset.encoding === 'base64' ? fromBase64(packed.textContent) : packed.textContent);
  if (!p5Text) {
    p5Text = fetch(new URL('../vendor/p5.min.js', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((t) => safeInline(t))
      .catch((e) => { p5Text = null; throw e; });
  }
  return p5Text;
};
/** The build stores p5 as base64, so Apps Script can't rewrite it. */
const fromBase64 = (t) => new TextDecoder().decode(Uint8Array.from(atob(t.replace(/\s+/g, '')), (c) => c.charCodeAt(0)));
// ml5 is large, so it is fetched only when a game actually uses it.
let ml5Text = null;
let ml5Loader = () => fetch(new URL('../vendor/ml5.min.js', import.meta.url)).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); });
export const setMl5Loader = (fn) => { ml5Loader = fn; };
const loadMl5 = () => {
  if (!ml5Text) ml5Text = ml5Loader().then((t) => safeInline(t)).catch((e) => { ml5Text = null; throw e; });
  return ml5Text;
};
/** Only games that use ml5 get the camera and the Teachable Machine model servers. */
export const usesMl5 = (code) => /\bml5\s*\./.test(code);

/** Keep script text from ending its own script tag early. */
const safeInline = (t) => t.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// A locked-down frame is not allowed to open the camera. So createCapture(VIDEO) is replaced with
// a canvas, and the app (outside the frame) opens the camera and passes in plain image frames.
// Student code stays ordinary p5, and the game still can't reach anything else.
const CAMERA_BRIDGE = `
p5.prototype.createCapture = function () {
  var g = this.createGraphics(160, 120);
  g.size = function () { return g; };
  g.hide = function () { return g; };
  window.addEventListener('message', function (e) {
    if (e.data && e.data.ptFrame) { g.drawingContext.drawImage(e.data.ptFrame, 0, 0, g.width, g.height); e.data.ptFrame.close(); }
  });
  parent.postMessage({ pt: 'camera' }, '*');
  return g;
};
`;

/** Only games that use sound get the synth. */
const usesAudio = (code) => /\b(playSound|playNote|playMusic|stopMusic|setVolume)\s*\(/.test(code);

function buildDoc(code, assets, p5Source, ml5Source, files = {}) {
  const models = 'https://teachablemachine.withgoogle.com https://storage.googleapis.com';
  const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:${ml5Source ? ` ${models}` : ''}; connect-src data: blob:${ml5Source ? ` ${models}` : ''}; media-src data: blob: mediastream:; font-src data:; worker-src blob:`;
  // ml5's internals read browser storage, which this frame is forbidden on purpose. An in-memory
  // stand-in lets the library start, and nothing a game stores ever leaves the frame.
  const storageShim = ml5Source ? `
(function () {
  function memory() {
    var data = {};
    return { getItem: function (k) { return k in data ? data[k] : null; }, setItem: function (k, v) { data[k] = String(v); }, removeItem: function (k) { delete data[k]; }, clear: function () { data = {}; }, key: function (i) { return Object.keys(data)[i] || null; }, get length() { return Object.keys(data).length; } };
  }
  Object.defineProperty(window, 'localStorage', { value: memory() });
  Object.defineProperty(window, 'sessionStorage', { value: memory() });
})();
` : '';
  const audio = usesAudio([code, ...Object.values(files)].join('\n'))
    ? `(${installSynth.toString()})(window, { muted: ${!getSettings().gameSound}, warn: function (m) { parent.postMessage({ pt: 'warn', message: m }, '*'); } });`
    : '';
  const boot = `
${storageShim}
${audio}
window.SPRITES = new Proxy(${JSON.stringify(assets || {})}, { get(t, k) {
  if (typeof k === 'symbol') return t[k];
  if (k in t) return t[k];
  parent.postMessage({ pt: 'warn', message: 'There is no sprite named "' + String(k) + '" in this project yet. Showing a pink checkerboard instead.' }, '*');
  return ${JSON.stringify(PLACEHOLDER)};
} });
(function () {
  // Time how long the current task has been looping. A microtask clears the mark once the task
  // returns, so slow or throttled timers can't make a working game look stuck.
  let start = 0; let count = 0; let armed = false;
  window.__lp = function () {
    if (!armed) { armed = true; start = performance.now(); Promise.resolve().then(function () { armed = false; }); }
    if (++count % 2048 === 0 && performance.now() - start > 2500) {
      throw new Error('LOOP_TOO_LONG');
    }
  };
})();
window.addEventListener('error', function (e) {
  parent.postMessage({ pt: 'error', message: e.message, line: e.lineno }, '*');
});
window.addEventListener('unhandledrejection', function (e) {
  // p5 runs setup() inside a promise, so these errors only say where they happened in the stack.
  var stack = String(e.reason && e.reason.stack || '');
  var lines = (stack.match(/:\\d+:\\d+/g) || []).map(function (m) { return Number(m.split(':')[1]); });
  parent.postMessage({ pt: 'error', message: String(e.reason && e.reason.message || e.reason), line: 0, stack: lines }, '*');
});
['log', 'warn', 'error'].forEach(function (m) {
  const orig = console[m].bind(console);
  console[m] = function () {
    orig.apply(null, arguments);
    var text = Array.from(arguments).map(String).join(' ');
    if (m === 'log' && text.indexOf('Thank you for using ml5') === -1) parent.postMessage({ pt: 'log', message: text.slice(0, 400) }, '*');
  };
});
window.addEventListener('keydown', function (e) {
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) e.preventDefault();
});
window.addEventListener('load', function () { parent.postMessage({ pt: 'ready' }, '*'); });
`;
  const head = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>html,body{margin:0;height:100%;background:#14141f;display:flex;align-items:center;justify-content:center;overflow:hidden}canvas{display:block}</style><script>${boot}<\/script><script>${p5Source}<\/script>${ml5Source ? `<script>${ml5Source}<\/script><script>${CAMERA_BRIDGE}ml5.setBackend('webgl');<\/script>` : ''}<script>`;
  // Extra files load first, each as its own script, so students can share code between them.
  // Each one's position is recorded, so an error can name the right file and line.
  const lines = (t) => t.split('\n').length - 1;
  let html = head.replace(/<script>$/, '');
  const ranges = [];
  const addScript = (name, source) => {
    const safe = safeInline(protectLoops(source));
    html += '<script>\n';
    const offset = lines(html);
    html += `${safe}\n<\/script>`;
    ranges.push({ name, offset, last: lines(html) });
  };
  for (const name of Object.keys(files).sort()) addScript(name, files[name]);
  addScript('sketch.js', code);
  return { html: `${html}</head><body></body></html>`, ranges };
}

const ERROR_HELP = [
  [/NotAllowedError|Permission denied|NotFoundError.*device/i, () => 'The camera is blocked. Allow the camera in your browser, or ask your teacher. The arrow keys still work.'],
  [/Failed to fetch|NetworkError|model\.json/i, () => 'Your model could not be loaded. Check that the whole Teachable Machine link is pasted between the quotes, and that it ends with a slash.'],
  [/LOOP_TOO_LONG/, () => 'A loop ran for too long, so I stopped it. Check that your loop\'s counter really changes and that the condition can become false.'],
  [/(\S+) is not defined/, (m) => `The computer doesn't know what \`${m[1]}\` is. Check the spelling (capital letters matter), and make sure you created it with \`let\`.`],
  [/Identifier '(\S+)' has already been declared/, (m) => `You used \`let ${m[1]}\` twice. Each variable only gets one \`let\`. Remove the extra one.`],
  [/(\S+) is not a function/, (m) => `\`${m[1]}\` isn't something that can be called. Check the spelling, or whether you overwrote it with a variable.`],
  [/Cannot read propert\w+ of (undefined|null)(?: \(reading '(\S+)'\))?/, (m) => `You asked for \`.${m[2] || 'something'}\` on something that doesn't exist yet. Often an array position is past the end, or a variable hasn't been given a value.`],
  [/Unexpected end of input/, () => 'A `{` or `(` was never closed. Check that each opening has a matching closing one.'],
  [/missing \) after argument list/, () => 'A `)` is missing, or a comma is missing between arguments.'],
  [/Unexpected token '?([^'\s]+)'?/, (m) => `The computer got confused at \`${m[1]}\`. Look on this line and the one above for a missing bracket, comma, or quote.`],
  [/Invalid or unexpected token/, () => 'There is a stray character or an unclosed quote on this line.'],
  [/Assignment to constant/, () => 'You tried to change a `const`. Use `let` if the value needs to change.'],
];

/** Turn a browser error message into something a beginner can act on. */
export function friendlyError(message) {
  for (const [re, fn] of ERROR_HELP) {
    const m = String(message).match(re);
    if (m) return fn(m);
  }
  return String(message).replace(/^Uncaught\s+/, '');
}

/**
 * Create a game player. onEvent receives {type:'error'|'log'|'warn'|'ready', message, line}.
 * Returns { el, run(code, assets), stop(), destroy() }.
 */
/**
 * Create a game player. Pass askCamera for other people's games (Arcade, grading), so the viewer
 * must choose to share their camera each time. A student's own lesson starts it directly.
 */
export function createPlayer(onEvent = () => {}, { askCamera = false } = {}) {
  const el = document.createElement('div');
  el.className = 'player';
  let frame = null;
  let ranges = [];
  const listener = (e) => {
    if (!frame || e.source !== frame.contentWindow || !e.data || !e.data.pt) return;
    const d = e.data;
    if (d.pt === 'error') {
      const inFile = (n) => ranges.find((r) => n > r.offset && n <= r.last);
      const at = d.line || (d.stack || []).find(inFile) || 0;
      const range = at ? inFile(at) : null;
      onEvent({ type: 'error', message: friendlyError(d.message), raw: d.message, line: range ? at - range.offset : null, file: range ? range.name : null });
    } else if (d.pt === 'camera') {
      if (askCamera) showCameraPrompt();
      else startCamera();
    } else onEvent({ type: d.pt, message: d.message });
  };
  let stream = null;
  let timer = null;
  let prompt = null;
  const stopCamera = () => {
    clearInterval(timer);
    timer = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (prompt) prompt.remove();
    prompt = null;
  };
  const startCamera = async () => {
    const token = runToken;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (token !== runToken) { media.getTracks().forEach((t) => t.stop()); return; }
      stream = media;
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = media;
      await video.play();
      timer = setInterval(async () => {
        if (!frame || video.readyState < 2) return;
        const bitmap = await createImageBitmap(video, { resizeWidth: 160, resizeHeight: 120 });
        if (frame && frame.contentWindow) frame.contentWindow.postMessage({ ptFrame: bitmap }, '*', [bitmap]);
        else bitmap.close();
      }, 100);
    } catch (e) {
      onEvent({ type: 'error', message: friendlyError(`${e.name}: ${e.message}`), raw: e.message, line: null });
    }
  };
  const showCameraPrompt = () => {
    if (prompt) return;
    prompt = document.createElement('button');
    prompt.className = 'camera-prompt btn primary';
    prompt.textContent = 'This game wants your camera. Allow it';
    prompt.addEventListener('click', () => { prompt.remove(); prompt = null; startCamera(); });
    el.appendChild(prompt);
  };
  window.addEventListener('message', listener);
  // A teacher can silence a whole set of games from Display, even while one is playing.
  const stopWatching = onSettings((s) => { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ ptMute: !s.gameSound }, '*'); });
  let runToken = 0;
  const stop = () => {
    runToken++;
    stopCamera();
    if (frame) frame.remove();
    frame = null;
  };
  return {
    el,
    async run(code, assets, files = {}) {
      stop();
      const token = ++runToken;
      let source;
      let ml5Source = null;
      const needsMl5 = usesMl5([code, ...Object.values(files)].join('\n'));
      try {
        if (needsMl5) onEvent({ type: 'status', message: 'Loading the machine learning library...' });
        [source, ml5Source] = await Promise.all([loadP5(), needsMl5 ? loadMl5() : null]);
      } catch (e) {
        onEvent({ type: 'error', message: 'A code library could not load. Check your connection and press Run again.', raw: e.message, line: null });
        return;
      }
      if (token !== runToken) return; // A newer Run or Stop arrived while waiting.
      const doc = buildDoc(code, assets, source, ml5Source, files);
      ranges = doc.ranges;
      frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('allow', 'autoplay');
      frame.setAttribute('title', 'Game canvas');
      frame.srcdoc = doc.html;
      el.appendChild(frame);
      frame.addEventListener('load', () => { try { frame.focus(); } catch (_) { /* cross-origin frames may refuse */ } });
    },
    stop,
    focus() { if (frame) frame.focus(); },
    destroy() { stop(); stopWatching(); window.removeEventListener('message', listener); },
  };
}
