# Making the Apps Script build smaller and faster

Instructions for a future change. Step 1 is done (see below); the rest is not. Do the steps in order: they are sorted by how much they save for how little risk. Stop after any step that gets you where you need to be.

## Where the size is now

Measured on `main` at commit `faa68fb` with `npm run build`.

| File in `dist/` | Size | What is in it |
| --- | --- | --- |
| `P5.html` | 1,410 KB | p5.js, as base64 text |
| `App.html` | 1,165 KB | The app (892 KB as base64) and CodeMirror (272 KB as base64) |
| `ML5_0` to `ML5_4` | 4,473 KB in all | ml5, sent only to lessons that use it |
| `Code.gs` | 124 KB | The server |
| `Styles.html` | 86 KB | CSS |

Three facts that decide what is worth doing:

- **The new 3D map is not the problem.** It added 17 KB to `App.html` (1,147 KB before, 1,165 KB after). `map3d.js` is 29 KB of a 669 KB bundle.
- **Lesson text is the largest part of the app.** `js/curriculum` is 314 KB of the 669 KB minified bundle. Screens (`js/views`) are 194 KB and `js/game` is 70 KB.
- **Base64 costs a third.** Code ships as base64 because Apps Script rewrites inline JavaScript and breaks template literals. Base64 makes every file 33% larger than the code inside it.

What is not known: whether Google compresses these pages on the way to the browser, and what size a single HTML file may be. The app has only been measured locally. Before starting, open the deployed app in Chrome, look at the Network tab, and write down the transferred size and time of the first page load on a school Chromebook. Without that number you cannot tell whether a step helped.

## Step 1: compress before encoding (largest saving, small change)

Compress each library and the app bundle with gzip in `tools/build-gas.mjs`, then base64 the compressed bytes. In the browser, the loader in `App.html` decodes the base64 and inflates it with `DecompressionStream('gzip')`, which Chrome has had since version 80.

Expected sizes, measured with Node's `zlib` at level 9:

| Content | Now (base64) | Gzip, then base64 |
| --- | --- | --- |
| App bundle | 892 KB | about 305 KB |
| p5.js | 1,410 KB | about 334 KB |
| ml5 | 4,473 KB (plain text) | about 1,435 KB |

What to change:

1. In `tools/build-gas.mjs`, add `gz = (text) => zlib.gzipSync(Buffer.from(text, 'utf8'), { level: 9 })` and make `encoded()` base64 those bytes. Mark the tag `data-encoding="gzip-base64"`.
2. The loader is plain ES5 and synchronous today. Inflating is asynchronous, so the loader must wait for CodeMirror to be inflated and run before it runs the app. Keep it ES5-safe apart from the one `DecompressionStream` call.
3. If `DecompressionStream` is missing, show the existing "Pixel Trail could not start" card from `Index.html` with a message naming the browser as too old. Do not fall back silently.
4. `js/sandbox.js` reads p5's text from the `p5-src` tag to write it into each game's page. Inflate it there once and keep the text in memory.
5. ml5 is split into 900,000-character parts and the server strips a script tag from each (`Code.gs`, the function that returns `ML5_${n}`). Compress first, base64, then split, and join and inflate in the browser. `ML5_PARTS` is written by the build, so it will drop from 5 to 2 without a code change. The browser side is in `js/data/appsscript.js`: it joins the parts and keeps ml5 in IndexedDB under `ML5_KEY`. Store the inflated text there, as now, so a returning student does not inflate it again.

How to check it:

- `npm test` and `npm run build`.
- `npm run preview`, sign in with `?as=ari@school.test`, open a lesson, press Run, and open a Mind Road lesson that loads ml5 (`mind/m6`).
- `http://localhost:8080/tests/lessons.html?at=1` still passes with the tab visible.
- Deploy to a copy of the Apps Script project, not the live one, and repeat on a Chromebook.

Risk: this touches how the app starts. A mistake means a blank page for the whole class, so test on a copy first and keep the previous `dist/` to paste back.

### Step 1 is done

The build now gzips each library before base64. The teacher tried it on a real deployment and it worked, so it is the only build.

| File | Before | Now |
| --- | --- | --- |
| `App.html` | 1,140 KB | 388 KB |
| `P5.html` | 1,378 KB | 328 KB |
| ml5 | 4,369 KB in 5 files | 1,402 KB in 2 files |

How it works: `b64()` in `tools/build-gas.mjs` gzips first; the loader in `App.html` unpacks the editor library and the app and runs them in order; `js/sandbox.js` unpacks p5 once (`inflateBase64` in `js/pack.js`); ml5 is marked `GZ1:` so `loadMl5Pieces` unpacks it after joining. The app still reads the older uncompressed files too, so an Apps Script project with a mix of old and new files keeps working.

Not measured: the load time on a school Chromebook before and after.

## Step 2: leave out what Apps Script never uses

`js/data/local.js` (26 KB minified) is the demo store. `js/main.js` picks it only when `window.google.script` is missing, which is never true on Apps Script. Give the build a `define` such as `DEMO: false` and import `local.js` behind it so esbuild drops it from the Apps Script bundle. Demo mode (`npm start`) loads modules directly and is not affected.

Saving: about 26 KB of 669 KB. Small, but free.

## Step 3: load lessons a road at a time

A student uses one road: Base Camp, the Crossings, and one of four roads, plus Beyond. Today every road's lessons are in the bundle. Splitting `platformer.js`, `adventure.js`, `arcade.js` and `mind.js` (about 30 KB each) and the Beyond lessons (`lowpoly.js`, `sound.js`, `big.js`) into files fetched when needed would cut roughly 90 to 150 KB from a student's first load.

This is the riskiest step and should only be done if steps 1 and 2 are not enough:

- `engine.js` registers lessons when their module loads, and `graph.js`, `checks.js`, `briefs.js`, `today.js` and `alignment.js` all look lessons up by id. Anything that lists every lesson (the teacher's Lessons page, the journey map, the standards page) needs all of them.
- Each extra file is a trip to Apps Script, about a second, and counts against the teacher's quota. `CLAUDE.md` says opening a page should be one trip. Fetch the student's road in the same batch as the session, never per lesson.
- Teachers need everything, so only students would get the smaller load.

Do not split `checks.js`, `briefs.js` or `today.js` by hand. If lessons are split, split by lesson id inside the build.

## Step 4: the map's first draw

This is speed, not size. On a development machine the 3D map takes about 0.9 seconds to build once per page; it took 0.6 before the rework. A Chromebook will be slower. Scrolling is unchanged.

If it is too slow in class, in this order:

1. Measure first: wrap `buildWorld` in `map3d.js` with `performance.now()` on a real Chromebook.
2. Build the world after the page has painted (`requestAnimationFrame`, then a timeout), showing `loading()` over the map, so the page does not freeze.
3. Keep the built ground picture for the visit: store the finished canvas in a module variable keyed by the class's stops, so going back to the map does not rebuild it. Do not put it in `localStorage`.
4. Only then look at the lighting and far-country passes, which are the new work in `buildWorld`.

Students already have a way out: the **Flat map** button, which remembers the choice.

## What not to do

- Do not load p5, ml5 or CodeMirror from another website. The sandbox writes libraries inline because a frame with no origin cannot reliably load scripts, and the school's network may block other hosts.
- Do not remove the base64 step without replacing it. Apps Script rewrites inline JavaScript.
- Do not lower image quality in the map or shrink sprites to save bytes. They are drawn by code, not stored as images, so there is nothing to gain.
- Do not minify `Code.gs`. Function names without a trailing underscore are the server's public surface, and readable code matters more there than 124 KB.

## When you finish

Record the before and after sizes and the Chromebook load time in this file, update the build section of `CLAUDE.md`, and run `npm run build` so `dist/` matches.
