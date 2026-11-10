# Pixel Trail

A web app that teaches students to make games in p5.js from a blank canvas. Each student builds one game of their own over a whole trail of 30 to 40 minute lessons. It runs on Google Apps Script, with its data in a Google Sheet you own.

## The trail

Everyone starts together, then chooses a road. The roads teach the same concepts through different games and meet again at each Crossing. The core is **15 lessons per student**, sized for a term. Students who finish early continue Beyond the Summit.

| Stage | Lessons | What students learn |
| --- | --- | --- |
| Base Camp (shared) | 5 | Coordinates, color, variables, input, conditionals, a first game |
| First Fork (by road) | 3 | Movement, collision, win and lose |
| First Crossing (shared) | 2 | Functions, sprites |
| Second Fork (by road) | 2 | For loops, arrays, objects |
| Crossings (shared) | 2 | Game states, searching and sorting |
| The Summit (shared) | 1 | Polish, playtest, publish |
| **Beyond the Summit** (optional) | 12 more | Sound effects and music, changing lists, classes, a deep algorithm on each road, then the Low Poly Road: a 3D world you can walk through |

The roads are **The High Road** (platformer), **The Wild Road** (top-down adventure), **The Star Road** (arcade shooter), and **The Mind Road** (AI). Monster Maker is an optional side trail that never holds anyone back.

On the Mind Road, students write rules for a bot, train a Teachable Machine model to steer the game with gestures, then write nearest neighbor themselves. Beyond the Summit, they train an ml5.js neural network on their own gameplay, compare it with their algorithm, and test whether a model is fair.

Lessons are a walkthrough: one short instruction on screen at a time, with the explanation folded under "Why?", and quick check questions that must be answered to move on. Teachers see first-try results when grading.

## Putting it on Apps Script

**Use your school Google account for all of this.** The app relies on Google telling it who is signed in, and that only works for people in the same Workspace domain. Students need school Google accounts on the same domain. It won't work from a personal Gmail account.

The files to upload are in [`dist/`](dist/). If you change anything, run `npm install` once and then `npm run build` to remake them.

### Option A: copy and paste

1. Create a new Google Sheet, name it something like *Pixel Trail Data*, and choose **Extensions → Apps Script**. This Sheet will hold all the data.
2. Replace the contents of `Code.gs` with [`dist/Code.gs`](dist/Code.gs).
3. Add HTML files with the **+** button, named exactly `Index`, `Styles`, `App`, `P5`, and `ML5_0` through `ML5_4`. Paste in the matching file from `dist/`. Several are about 1 MB, so the editor may be slow for a moment. Option B below avoids this pasting.
4. In **Project Settings**, tick **Show "appsscript.json"**, then replace that file with [`dist/appsscript.json`](dist/appsscript.json). Change `timeZone` if you aren't on Eastern time.
5. Press **Save**, then **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone within your school**.
6. Approve the permissions, and copy the web app link. That link is the app, and it's what you give students.

### Option B: with clasp

If your school allows it, Google's command line tool saves all the pasting. First turn on the Apps Script API at https://script.google.com/home/usersettings.

```bash
npm install -g @google/clasp
```

```bash
clasp login
```

```bash
clasp create --type sheets --title "Pixel Trail" --rootDir dist
```

```bash
clasp push
```

Then deploy as in step 5 above.

### After that

Open the link, and you're the teacher automatically because you deployed it. Create a class, then paste in your roster with one student per line:

```
Ari M, ari@yourschool.org
Bea T, bea@yourschool.org
```

To add another teacher, add a row with their email and name to the **Teachers** tab of the Sheet.

To publish changes, use **Deploy → Manage deployments**, edit the deployment, and choose **New version**. The link stays the same. Saving code alone doesn't change what students see.

### Before using this with a class

Work through [PILOT.md](PILOT.md), a step-by-step checklist for the first deployment.

- **Try it with a few students first.** Everyone's activity runs under your account's Google quotas, and only about 30 requests can run at once. Students autosave every 30 seconds and whenever they press Run, to stay well under that. If a class sees "couldn't save" messages, tell me, because this limit is the one most likely to need tuning.
- **Test the Mind Road yourself first.** It needs the camera and teachablemachine.withgoogle.com. If the camera is blocked, arrow keys still work, and the nearest neighbor and neural network lessons need no camera at all.
- **Check with your IT team.** Your Workspace admin may limit Apps Script web apps, or block the Piskel link. The built-in sprite editor doesn't need Piskel. The custom fonts come from Google, and the app falls back to standard fonts if they're blocked.
- **Protect the Sheet.** It holds every student's work and grades, so don't share it with students. They never need access to it, because the app reads it on their behalf.
- **Use first name and last initial.** Classmates see these names on the journey map. They never see emails.

## How it protects students

- Students sign in with their school Google account, so there are no passwords to manage. Anyone not on a roster sees a "not on a class list" page and no data.
- Data stays in your school's Google account. No outside service is involved.
- The server decides who may do what from Google's sign-in, never from anything the browser claims. Students can reach only their own work and what their class is allowed to see.
- Grades, feedback, and reflections are visible only to that student and their teacher. Points, ranks, and badges are public to the class, so they are never calculated from grades.
- Student code runs in a locked-down frame that can't reach this app, the Sheet, or the network. Loops that never end get stopped. AI games can also reach Teachable Machine's model servers, and the frame gets only image frames from the camera, never the camera itself. Playing someone else's game asks before sharing your camera.
- Teachers can remove any shared game or sprite in their class. Sharing is always the student's choice.

## Google Classroom

On your Classes page, press **Import from Google Classroom** to bring in courses and students. Import again any time to add new students. It only reads from Classroom and never changes anything there. Only the teacher who deployed the app can use the connection.

A class's **Classroom grades** tab makes named assignments in that section's Classroom: tick lessons, edit their names, set points and an optional due date, and post them now or save them as drafts. Each assignment matches a lesson number in the gradebook, so one covers all four roads. After grading in the app, **Send grades** sends every approved score that changed, scaled to the assignment's points. Then press Return in Classroom. The **Assignments** tab shows every Classroom assignment and each student's status. **Keeping up** flags students who are behind the pace for your term dates, have gone quiet, have work to fix, or have missing Classroom work. You can turn on an email on school mornings, sent only when someone needs a check-in.

After updating to this version, open the Apps Script editor, run any function once, and approve the new Classroom and email permissions. Then publish a new version. Your Workspace admin may need to allow the Classroom API.

## Display and project files

The **Display** button lets each person choose light, dark, or high contrast, an editor style, larger text and code, wider spacing, plain headings, and read aloud. Choices are saved in that browser.

In a lesson, students can add up to 8 extra code files and upload images, using the buttons above the editor or by dragging them in. Images are shrunk to fit the class Sheet and load with `loadImage(SPRITES.name)`. Sound files aren't supported yet.

## Projecting a class

On a class page, press **Project this class** for a display to leave up during student-led work. It shows the lesson most of the class is on as a race, with each student at the step they've reached and anyone who submits today at the finish, then where everyone is on the trail, the question of the day, time left, recent achievements, and the day's standards for visitors and administrators. **Set up today** lets you type your own items. Anything left blank fills in from where students are, and a blank question is the big question for the lesson most students are on, about why the day's idea matters. It never shows scores or feedback.

## Grading and points

Students keep moving after submitting: they don't wait for approval to unlock the next lesson. Teachers score a rubric of 1 to 4 on three rows, write feedback, then approve the work or send it back. Approved work is locked.

| Earned for | XP |
| --- | --- |
| Submitting with all checks passing | 50 (25 if not) |
| Teacher approves | 50 more |
| Each stretch goal (self-reported, up to 3) | 10 |
| Each badge a teacher gives | 25 |

Automatic checks look for code patterns. They guide students, and they can't tell if a game is good, or spot every valid approach. A student can always submit anyway, and you'll see how many checks passed. Rules live in [`js/game/rules.js`](js/game/rules.js).

## Standards

Every lesson is aligned to the Massachusetts Grades 6-8 Digital Literacy and Computer Science standards. Each lesson lists its standards under the title, for students and teachers. The **Standards** tab shows the overall map, a by-lesson view, and progress: students see their own, and teachers see their class. Teachers also see the standards on the **Lessons** page and beside the rubric while grading. Progress counts lesson status, never scores. An *anchor* lesson produces work you can assess against a standard, and a *supporting* lesson practices it. The alignment lives in [`js/curriculum/alignment.js`](js/curriculum/alignment.js), and the standards' exact wording in [`js/curriculum/standards.js`](js/curriculum/standards.js).

## Changing lessons

Lessons are plain data in [`js/curriculum/`](js/curriculum/). Each step's `code` and `at` say what to show and where it goes, and the app applies those same edits to build the answer key, so instructions and answers can't drift apart.

```js
{
  title: 'Add a sun', mins: 5,
  say: 'Add this inside `draw()`, below `background`:',
  code: '  ellipse(340, 60, 70, 70);',
  at: { after: 'background(135, 206, 235);' },  // or before, replace, endOf, top, end
  check: /ellipse\s*\(/,                          // what counts as done
  hint: 'It goes between the { and } of draw().', // optional
  // reveal: true hides the code behind a "Show me an example" button
}
```

Lessons with no `starter` continue the student's own game. If you edit one, keep the names that later lessons rely on: `playerX`, `playerY`, `playerSize`, `score`, `won`, `lost`, and `resetGame()`.

## Running it on your computer

| Command | What it does |
| --- | --- |
| `npm start` | Demo mode at http://localhost:8080, with sample students and data kept in that browser |
| `npm run preview` | The packed app at http://localhost:8081/?as=teacher@school.test, with the real server code on a fake Sheet. Change the address to sign in as anyone |
| `npm test` | Checks every lesson, and attacks the server's access rules |
| `npm run build` | Remakes `dist/` |

To run every lesson's answer key in the real sandbox, run `npm start` and open http://localhost:8080/tests/lessons.html with the tab visible. Add `?only=t1,mind/m6` to run just those lessons, or `?at=1` to run one at a time on a slow machine.

`tests/fake-gas.mjs` imitates Google's services, including the cell size limit and formula behavior. It is a model of Apps Script, so a real deployment can still behave differently.

## Credits

Built on [p5.js](https://p5js.org) (LGPL) and [CodeMirror 5](https://codemirror.net/5/) (MIT), both in [`vendor/`](vendor/). [Piskel](https://www.piskelapp.com) is linked as an outside tool. All lessons, characters, and starter sprites are original to this project.
