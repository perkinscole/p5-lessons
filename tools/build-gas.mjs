import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
// Packs the app into the only kinds of file Apps Script accepts: .gs and .html.
// Run: npm run build. The result in dist/ is what goes into the Apps Script project.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const path = (p) => new URL(p, root);
const read = (p) => readFileSync(path(p), 'utf8');

/** Keep library text from closing its own script tag or opening an HTML comment. */
const safeInline = (t) => t.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const minifyClassic = async (files) => {
  const r = await build({ stdin: { contents: files.map(read).join('\n;\n'), loader: 'js' }, bundle: false, minify: true, write: false, legalComments: 'inline', target: 'es2019' });
  return r.outputFiles[0].text;
};

// Each library is gzipped before it is turned into base64 (docs/APPS_SCRIPT_COMPRESSION.md, step 1),
// which makes the files about a third of the size to paste and to send.
const OUT = 'dist';
rmSync(path(OUT), { recursive: true, force: true });
mkdirSync(path(OUT));

const cm = await minifyClassic(['codemirror', 'javascript', 'matchbrackets', 'closebrackets', 'comment'].map((f) => `vendor/codemirror/${f}.js`));
const app = await build({
  entryPoints: [fileURLToPath(path('js/main.js'))],
  bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none',
  // BUILD_ID names this copy of ml5, so each device downloads it once and again only when it changes.
  // DEMO: false drops js/data/local.js, the demo store, which Apps Script never uses (see main.js).
  define: { 'import.meta.url': '""', DEMO: 'false', BUILD_ID: JSON.stringify(createHash('sha1').update(read('vendor/ml5.min.js')).digest('hex').slice(0, 12)) },
  logOverride: { 'empty-import-meta': 'silent' },
});
// The demo store must really be gone: if a later change to main.js brings it back, say so here.
if (app.outputFiles[0].text.includes('pixeltrail.demo.v1')) throw new Error('The demo store (js/data/local.js) is in the Apps Script bundle. Check the DEMO test in js/main.js.');
const css = await build({ stdin: { contents: read('vendor/codemirror/codemirror.css') + read('css/app.css'), loader: 'css' }, minify: true, write: false });

// Apps Script rewrites inline JavaScript on its way to the browser, and that breaks some of the
// bundle (template literals holding lesson code). So code ships as base64 text, which nothing
// rewrites, and a short loader in plain ES5 decodes it and runs it.
const b64 = (t) => gzipSync(Buffer.from(t, 'utf8'), { level: 9 }).toString('base64');
const ENCODING = 'gzip-base64';
// These files are pasted into the Apps Script editor by hand, and a paste has twice arrived cut
// short, which left the app silently not starting. So: the text is wrapped into short lines (one
// line a megabyte long is what editors and clipboards handle worst), and each file opens with a
// small check that knows how long its contents should be and says so on screen when they are not.
const wrap = (t) => t.replace(/(.{4000})/g, '$1\n');
const CHECK = (file, sizes) => `<script>
(function () {
  var want = ${JSON.stringify(sizes)};
  function look() {
    for (var id in want) {
      var el = document.getElementById(id);
      var got = el ? el.textContent.replace(/\\s+/g, '').length : 0;
      if (got === want[id]) continue;
      window.__ptStarted = true;
      var old = document.querySelector('.boot-screen');
      if (old) old.remove();
      var box = document.createElement('div');
      box.style.cssText = 'max-width:640px;margin:40px auto;padding:20px;border:3px solid #c43f29;background:#fff;color:#2b2350;font:16px/1.5 system-ui,sans-serif';
      var h = document.createElement('h2');
      h.textContent = 'The ${file} file was not pasted completely.';
      var p = document.createElement('p');
      p.textContent = 'It has ' + got.toLocaleString() + ' of ' + want[id].toLocaleString() + ' characters. In the Apps Script editor, open ${file}, select everything, delete it, and paste the whole ${file}.html file from the zip again. Then publish a new version.';
      var q = document.createElement('p');
      q.textContent = 'Students: this is not your fault. Tell your teacher.';
      box.appendChild(h); box.appendChild(p); box.appendChild(q);
      document.body.insertBefore(box, document.body.firstChild);
      return;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', look); else look();
})();
</script>
`;
const sizeOf = (t) => b64(t).length;
const encoded = (t, id) => `<script type="text/plain" id="${id}" data-encoding="${ENCODING}">\n${wrap(b64(t))}\n</script>\n`;
// The loader. Unpacking takes a moment and happens off to the side, so it waits for
// the editor library to be unpacked and run before it runs the app. If the browser can't unpack,
// the error reaches Index.html's "could not start" card with the reason.
const LOADER = `<script>
(function () {
  function unpack(id) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('This browser is too old to open Pixel Trail. Update Chrome and reload.'));
    var b = atob(document.getElementById(id).textContent.replace(/\\s+/g, ''));
    var u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function run(text) {
    var s = document.createElement('script');
    s.textContent = text;
    document.body.appendChild(s);
  }
  var app = unpack('app-src');
  unpack('cm-src').then(function (cm) { run(cm); return app; }).then(run);
})();
</script>
`;
writeFileSync(path(`${OUT}/App.html`), CHECK('App', { 'cm-src': sizeOf(cm), 'app-src': sizeOf(app.outputFiles[0].text) }) + encoded(cm, 'cm-src') + encoded(app.outputFiles[0].text, 'app-src') + LOADER);
writeFileSync(path(`${OUT}/Styles.html`), `<style>${css.outputFiles[0].text}</style>\n`);
// Apps Script rejects an HTML file that is bare script text, so libraries go inside a
// text/plain script tag. The browser reads them out as text.
const asText = (t, id) => `<script type="text/plain"${id ? ` id="${id}"` : ''}>${t}</script>\n`;
writeFileSync(path(`${OUT}/P5.html`), CHECK('P5', { 'p5-src': sizeOf(safeInline(read('vendor/p5.min.js'))) }) + encoded(safeInline(read('vendor/p5.min.js')), 'p5-src'));
copyFileSync(path('gas/Index.html'), path(`${OUT}/Index.html`));
// ml5 is about 4 MB, so it travels in pieces about the size of the p5 file.
// Made safe before splitting, so no piece can end its script tag early.
// Compressed, it is marked so the browser knows to unpack it once the pieces are joined (PACKED_MARK in js/pack.js).
const ml5 = `GZ1:${b64(safeInline(read('vendor/ml5.min.js')))}`;
const PART = 900000;
const parts = Math.ceil(ml5.length / PART);
for (let i = 0; i < parts; i++) writeFileSync(path(`${OUT}/ML5_${i}.html`), asText(wrap(ml5.slice(i * PART, (i + 1) * PART))));
const code = read('gas/Code.gs');
if (!code.includes('const ML5_PARTS = 0;')) throw new Error('ML5_PARTS line is missing from Code.gs');
const pace = ['js/game/pace.js', 'js/game/blame.js'].map((f) => read(f).replace(/^export /gm, '')).join('\n');
writeFileSync(path(`${OUT}/Code.gs`), `${code.replace('const ML5_PARTS = 0;', `const ML5_PARTS = ${parts};`)}\n${pace}`);
copyFileSync(path('gas/appsscript.json'), path(`${OUT}/appsscript.json`));

for (const f of readdirSync(path(OUT))) console.log(`${String(Math.round(statSync(path(`${OUT}/${f}`)).size / 1024)).padStart(6)} KB  ${OUT}/${f}`);
