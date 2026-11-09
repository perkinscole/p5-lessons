# First deployment checklist

Pixel Trail has been tested against a model of Apps Script, not the real thing. This list covers what only a real deployment can show, in the order to try it. Set it up using [README.md](README.md#putting-it-on-apps-script) first.

## 1. On your own, before any students (about 30 minutes)

Use your school account on a school Chromebook, the same kind students use.

- [ ] Open the web app link. You should land on **Your classes** as the teacher.
- [ ] Create a test class and add yourself under a second school account if you have one, or a colleague who agrees to help.
- [ ] As that student, open **Hello, Canvas**, finish it, and submit. The game should draw when you press Run.
- [ ] As the teacher, grade it, approve it, and check that the student sees the score and feedback.
- [ ] Open a Low Poly lesson (Beyond the Summit, `d1`) from the **Lessons** page and press Run. It should show a 3D scene with no "loop ran too long" message.
- [ ] Share the test game to the Arcade, and play it from the other account.
- [ ] **Mind Road:** open a Mind Road lesson and allow the camera. If the camera is blocked inside the app, note it. Arrow keys still work, and only the Teachable Machine lesson needs a camera.
- [ ] **Classroom:** press **Import from Google Classroom**. If it asks for permissions or says the API is off, your Workspace admin may need to allow the Classroom API for Apps Script.
- [ ] **Grades to Classroom:** on a test course, send one grade. Check that it shows in the Classroom gradebook, then press Return there so the student can see it.
- [ ] **Daily email:** turn on the morning email in **Keeping up** and check it arrives on the next school morning, or doesn't if no one needs a check-in.

## 2. A small group (one class period, 3 to 5 students)

- [ ] Add 3 to 5 students and have them all work through lesson 1 at the same time.
- [ ] Watch for "couldn't save" or "The class is saving a lot right now" messages, and note how often they happen.
- [ ] Afterwards, open the Apps Script editor and choose **Executions** on the left. Each row is one request. Note the typical duration of `api` calls.
- [ ] Search the Executions log for `LOCK_SLOW` or `LOCK_TIMEOUT`. Their presence means saves are queuing behind each other.

## 3. A full class

- [ ] Run one full period with everyone signed in.
- [ ] Check **Executions** again for errors, `LOCK_SLOW`, and `LOCK_TIMEOUT`.
- [ ] If more than one class runs at the same time, everyone shares your account's quota. Try that overlap only after a single class runs cleanly.

## What to report back

If something goes wrong, these details make it fixable:

- What the student or you saw, word for word, and which lesson they were on.
- How many students were signed in at the time.
- From **Executions**: any failed rows (open one to see the error), the typical duration of `api` calls, and how many `LOCK_SLOW` or `LOCK_TIMEOUT` lines appeared.
- Whether it happened on a Chromebook, and in which browser.

The setting most likely to need tuning is how often students autosave (`saveDelay`, 30 seconds now). A slow log tells us whether to raise it.
