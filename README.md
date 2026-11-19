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

## Student view

Press **👀 Student view** in the top bar to use the app as a student would: Home, lessons, the journey map, sprites, sounds, Trail Quest, and the character builder. You become a pretend student of your own who is in no class, so nothing you do appears on a roster, a class board, the gradebook, or the Arcade. On the Character page everything is unlocked so you can try every item; real students still earn them. **Start over** wipes the pretend student's work, and **Back to teacher** returns you.

## Your data and backups

Everything lives in one Google Sheet. On **Your classes**, the teacher who set up the app sees **Your data and backups**: which Sheet is in use, how many classes and students are in it, and links to backups.

- A backup copy is made in your Google Drive each day you open the app, named "Pixel Trail Backup" with the date. **Back up now** makes one on the spot. Delete old ones whenever you like.
- Deploying a new version never touches data.
- If classes or students ever look missing, **do not make them again**. Open the card and check which Sheet the app is using. **Use this Sheet** points the app at a different one, and **Bring in its data** combines another Sheet into the current one: it shows what it would add first, backs up, removes nothing, and each student keeps the best of every lesson.
- If students see "Busy… saving your work" for more than a few seconds at a time, the app is near Google's limit of about 30 requests at once. Their work is kept and sent again by itself. Check **Executions** in the Apps Script editor for failures and long runs.

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

The **Display** button lets each person choose a language, a font (Atkinson Hyperlegible, Lexend, a plain one, or a rounded one), light, dark, or high contrast, an editor style, larger text and code, wider spacing, plain headings, and read aloud. Choices are saved in that browser.

**Português (Brasil)** shows the whole app in Brazilian Portuguese, and read aloud speaks it. The translation is done by Google's translator, so it is a machine translation: good enough to follow, not polished. Each sentence is translated once and kept in the `Translations` tab of your Sheet for everyone, and you can correct a translation there by editing its `text` cell. Code is never translated, since it has to be typed exactly, and the state's standards stay in their official wording.

The **🐞** button next to it lets anyone report a problem with the app. It sends what they wrote plus the page, screen size, browser, and any errors the page just had, never their code. Reports appear on **Your classes** under **Problem reports**, where you can copy them all as one report and mark each done. A student can send five a day.

In a lesson, students can add up to 8 extra code files and upload images, using the buttons above the editor or by dragging them in. Images are shrunk to fit the class Sheet and load with `loadImage(SPRITES.name)`. Sound files aren't supported yet.

## Sounds and celebrations

Finishing a step plays a short chime and the "Done" mark sparkles. A right answer on a check question lights up green with sparks, a word of praise, and a glow round the screen; several right in a row on the first try are called out as a streak. A wrong answer gets a low note and a small shake.

Students carry their XP in a **💰 purse** in the top bar. Submitting a lesson fills the whole screen with "Lesson complete!", a fanfare, and confetti while the XP counts up, and then coins fly into the purse. A new rank and each new badge then take over the screen in turn, each with its own sound; a tap or any key moves on. A badge you give a student, or a rank they reach when you approve work, does the same the next time they open Home. Equipping gear on the character page chimes as well. **Display → Play sounds** turns all of it off for a student, and animations are skipped for anyone whose device is set to reduce motion.

## Moving through a lesson

Every step carries a label so students know what it wants: **✏️ Your turn** (do this in your code), **👀 Just read**, or **❓ Answer this**. A student can't move past a check question until they have answered it correctly: the steps after it are greyed out and can't be clicked. A step they haven't finished can still be skipped, but the button says **Skip for now** instead of **Next**. Teachers looking at a lesson are never locked.

If a student stops, the lesson nudges them. After about 25 seconds with no typing or clicking, the next thing to do pulses gold: where the code goes, the answers to pick from, or the Next button. After about 50 seconds on a step that needs code, the editor jumps to the right line and shows **▼ type this here** with the code to type, and a soft chime plays. Any key or click stops the pulsing. **Show me** does the same thing on request. Nothing is recorded or sent to you about it.

## Feedback and help

**"I'm stuck."** Every lesson has a **✋ I'm stuck: ask for help** button. A student can add a short note, and their request appears within a few seconds on the class page, with a doorbell: their name, the exact step, and the note. On the projected class display it stays private: their character hops and glows, and a small **✋** button in the corner opens the list for you. Press **✓ Helped** to clear it, or the student can press **I figured it out**. The 🔔 button on the display tests the doorbell on that computer.

**Confusing?** Under every step and check question, a student can tap **🤔 Confusing?** and pick a reason: instructions unclear, code didn't work, too hard, too easy, or other, with an optional note.

**Rating.** After submitting a lesson, students give it 1 to 5 stars and can say what was hardest and what would make it better. Rating earns 10 XP whatever they say.

**The Feedback tab** on a class adds this up per lesson: the rating, how many started and finished, the steps most often marked confusing or needing help (with reasons and notes), and check questions that 30% or more missed on the first try. **Copy report for Claude** and **Download .md** produce a report that names each lesson's source file and numbers steps the way students see them, so you can paste it to Claude and ask it to improve the lessons. Feedback is shown without names. Notes students typed are included as written, so read the report before sharing it. Feedback never affects grades.

## Trail Quest

Trail Quest is a fast arcade game students play as their own character. A run is a race through rooms that never end. Each room fills the screen: grab the **key**, then run to the **exit**. The next room is new and harder. Rooms come as meadows, mazes, caverns, and chambers joined by halls, and by room 10 they are crowded: slimes, bats from room 2, marching guards from 3, spitters that shoot from 4, hunters that chase from 5, plus spikes from room 3 and some dark rooms from 4. Finishing a room before the ⚡ bar runs out pays a speed bonus, and fast rooms in a row pay more. Losing every heart ends the run; the coins are kept.

Everyone can **dash** with Space, which slips safely through enemies and over spikes. Gear makes it stronger. A held item turns the dash into a strike that defeats enemies and smashes the cracked rocks that seal treasure vaults. A cape dashes further and twice as often, a hat adds a heart, a pet pulls in coins, and a glow lights dark rooms.

Rooms also hold **boosts** that are strong but short (⚡ speed, ⭐ unstoppable, 💣 a bomb that clears nearby enemies) and, less often, **relics** that last the rest of the run: swift boots, a lantern, a magnet, a blade, a feather, a lucky clover, a shield, and a heart stone. So a student with little gear can still get lucky, and a student with good gear gets further.

It starts closed. On a class page, press **Trail Quest** and choose **Earned** (each lesson a student submits earns play time, 5 minutes unless you change it) or **Open** (everyone can play with no time used up, for a reward day). Students see a class board of best runs and furthest rooms, and a class treasure that everyone's coins fill. Coins and play time never come from grades.

Two ways to play together: **two players on one Chromebook** (choose Player 2 from the class list; one uses W A S D and Space, the other the arrow keys and Enter), and **ghost races** (press **Race** beside a classmate on the board to play the same rooms in the same order, with their best run replayed beside you). A two-player run uses the signed-in student's play time and counts on their record.

The game runs in the student's browser and only contacts the server when a run starts and ends, so it barely touches the class's quota. Classmates don't see each other moving; the shared parts are the board and the treasure.

## Group projects

On a class's **Groups** tab, put 2 or 3 students together for a lesson. They share one project and can work on it at the same time, one person per file: a student presses **Edit** on a file, or makes a new one, and teammates see their changes within about 15 seconds. Splitting a game into files like `enemies.js` or `levels.js` lets the whole group build at once. Nobody can overwrite a file a teammate is editing. The **Groups** tab shows who wrote each line, and each student still writes their own reflection and gets their own grade.

## Projecting a class

On a class page, press **Project this class** for a display to leave up during student-led work. It shows the lesson most of the class is on as a race, with each student at the step they've reached and anyone who submits today at the finish, set in the scenery of the stage they're in, then the question of the day, time left, recent achievements, and the day's standards for visitors and administrators. **Set up today** lets you type your own items. Anything left blank fills in from where students are, and a blank question is the big question for the lesson most students are on, about why the day's idea matters. It never shows scores or feedback.

## Grading and points

Students keep moving after submitting: they don't wait for approval to unlock the next lesson. Teachers score a rubric of 1 to 4 on three rows, write feedback, then approve the work or send it back. Approved work is locked.

| Earned for | XP |
| --- | --- |
| Submitting with all checks passing | 50 (25 if not) |
| Teacher approves | 50 more |
| Each stretch goal (self-reported, up to 3) | 10 |
| Each badge a teacher gives | 25 |

Students spend XP and badges on their character: hats, capes, glows, pets, held items, outfits, and earned titles, each marked Common, Rare, Epic, or Legendary. Many unlock through badges for experiences, like sharing a game, writing a theme song, or a badge you give for helping a classmate, not only through XP. New gear gets a celebration the first time a student sees it, and the character page shows what to aim for next. Glows are part of the character picture, so classmates see them on the map. Sound effects there follow the Display setting for sound.

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
