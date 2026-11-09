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

rmSync(path('dist'), { recursive: true, force: true });
mkdirSync(path('dist'));

const cm = await minifyClassic(['codemirror', 'javascript', 'matchbrackets', 'closebrackets', 'comment'].map((f) => `vendor/codemirror/${f}.js`));
const app = await build({
  entryPoints: [fileURLToPath(path('js/main.js'))],
  bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none',
  define: { 'import.meta.url': '""' },
  logOverride: { 'empty-import-meta': 'silent' },
});
const css = await build({ stdin: { contents: read('vendor/codemirror/codemirror.css') + read('css/app.css'), loader: 'css' }, minify: true, write: false });

// Apps Script rewrites inline JavaScript on its way to the browser, and that breaks some of the
// bundle (template literals holding lesson code). So code ships as base64 text, which nothing
// rewrites, and a short loader in plain ES5 decodes it and runs it.
const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');
const encoded = (t, id) => `<script type="text/plain" id="${id}" data-encoding="base64">${b64(t)}</script>\n`;
const LOADER = `<script>
(function () {
  function text(id) {
    var b = atob(document.getElementById(id).textContent.replace(/\\s+/g, ''));
    var u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new TextDecoder().decode(u);
  }
  ['cm-src', 'app-src'].forEach(function (id) {
    var s = document.createElement('script');
    s.textContent = text(id);
    document.body.appendChild(s);
  });
})();
</script>
`;
writeFileSync(path('dist/App.html'), encoded(cm, 'cm-src') + encoded(app.outputFiles[0].text, 'app-src') + LOADER);
writeFileSync(path('dist/Styles.html'), `<style>${css.outputFiles[0].text}</style>\n`);
// Apps Script rejects an HTML file that is bare script text, so libraries go inside a
// text/plain script tag. The browser reads them out as text.
const asText = (t, id) => `<script type="text/plain"${id ? ` id="${id}"` : ''}>${t}</script>\n`;
writeFileSync(path('dist/P5.html'), encoded(safeInline(read('vendor/p5.min.js')), 'p5-src'));
copyFileSync(path('gas/Index.html'), path('dist/Index.html'));
// ml5 is about 4 MB, so it travels in pieces about the size of the p5 file.
// Made safe before splitting, so no piece can end its script tag early.
const ml5 = safeInline(read('vendor/ml5.min.js'));
const PART = 900000;
const parts = Math.ceil(ml5.length / PART);
for (let i = 0; i < parts; i++) writeFileSync(path(`dist/ML5_${i}.html`), asText(ml5.slice(i * PART, (i + 1) * PART)));
const code = read('gas/Code.gs');
if (!code.includes('const ML5_PARTS = 0;')) throw new Error('ML5_PARTS line is missing from Code.gs');
const pace = ['js/game/pace.js', 'js/game/blame.js'].map((f) => read(f).replace(/^export /gm, '')).join('\n');
writeFileSync(path('dist/Code.gs'), `${code.replace('const ML5_PARTS = 0;', `const ML5_PARTS = ${parts};`)}\n${pace}`);
copyFileSync(path('gas/appsscript.json'), path('dist/appsscript.json'));

for (const f of readdirSync(path('dist'))) console.log(`${String(Math.round(statSync(path(`dist/${f}`)).size / 1024)).padStart(6)} KB  dist/${f}`);
