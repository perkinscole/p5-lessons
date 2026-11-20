// How the browser talks to Apps Script without overloading it. Every student's request counts
// against the teacher's Google account, which allows about 30 at the same moment. So each browser
// sends one trip at a time, calls made while a trip is out travel together on the next one, and a
// "too busy" answer is retried quietly after a growing, randomly spread wait.
//
// No DOM and no Google here, so tests can drive it with a pretend server.

/** Errors that mean the request did not run, so sending it again is safe. */
export const BUSY = /^BUSY:|simultaneous invocations|too many simultaneous/i;
export const BUSY_MESSAGE = 'Pixel Trail is very busy right now. Your work is safe. Wait a few seconds and try again.';

/**
 * send(method, args) makes one trip and resolves with the answer. Returns { call, direct }:
 * call(method, ...args) joins the next trip; direct(method, args) takes a trip of its own, in turn.
 */
export function createQueue(send, { maxBatch = 12, tries = 5, onBusy = () => {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), random = Math.random } = {}) {
  let waiting = [];
  let flying = false;
  let scheduled = false;
  let busy = false;
  const setBusy = (on) => { if (busy !== on) { busy = on; onBusy(on); } };
  const backoff = (n) => sleep(1200 * 1.8 ** n + random() * 1500);

  /** One trip, retried while the server says it is busy. */
  async function trip(method, args, most = tries) {
    for (let n = 0; ; n++) {
      try {
        return await send(method, args);
      } catch (e) {
        if (!BUSY.test(e.message)) throw e;
        if (n >= most) throw new Error(BUSY_MESSAGE);
        setBusy(true);
        await backoff(n);
      }
    }
  }

  async function runGroup(group) {
    if (group.length === 1 && group[0].alone) return group[0].resolve(await trip(group[0].method, group[0].args));
    let jobs = group;
    for (let n = 0; jobs.length; n++) {
      const results = jobs.length === 1
        ? [await trip(jobs[0].method, jobs[0].args, jobs[0].tries === undefined ? tries : jobs[0].tries).then((data) => ({ ok: true, data }), (e) => ({ ok: false, error: e.message }))]
        : await trip('batch', [jobs.map((j) => [j.method, j.args])]);
      const again = [];
      jobs.forEach((j, k) => {
        const r = results[k];
        if (r.ok) j.resolve(r.data);
        // Inside a batch, only the calls that were told "busy" go round again.
        else if (BUSY.test(r.error) && n < (j.tries === undefined ? tries : j.tries)) again.push(j);
        else j.reject(new Error(BUSY.test(r.error) || r.error === BUSY_MESSAGE ? BUSY_MESSAGE : r.error));
      });
      jobs = again;
      if (jobs.length) { setBusy(true); await backoff(n); }
    }
    return undefined;
  }

  async function pump() {
    scheduled = false;
    if (flying) return;
    flying = true;
    while (waiting.length) {
      // A call that travels alone goes by itself; the rest go together, up to maxBatch.
      const group = waiting[0].alone ? [waiting.shift()] : [];
      while (!group.length || (!group[0].alone && waiting.length && !waiting[0].alone && group.length < maxBatch)) group.push(waiting.shift());
      try { await runGroup(group); } catch (e) { group.forEach((j) => j.reject(e)); }
    }
    flying = false;
    setBusy(false);
  }

  const add = (job) => new Promise((resolve, reject) => {
    waiting.push({ ...job, resolve, reject });
    if (!scheduled) { scheduled = true; setTimeout(pump, 0); }
  });
  return {
    call: (method, ...args) => add({ method, args }),
    // For work that tries again by itself later, like an autosave: one go, so it never holds up what is behind it.
    once: (method, ...args) => add({ method, args, tries: 0 }),
    direct: (method, args) => add({ method, args, alone: true }),
  };
}
