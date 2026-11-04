import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * The studio's job store and queue. A job is a folder under data/jobs/<id> (job.json, the upload, status.json written by
 * engine/run.mjs, log.txt, edit.mp4, before-after.mp4). One job renders at a time (the renderer uses every core); the rest
 * wait in a queue and say so. The engine is a child process, so a crash in it can never take the site down.
 */
export const ROOT = resolve(process.env.MOOVI_ROOT ?? join(process.cwd(), '..'));
export const JOBS = join(ROOT, 'data', 'jobs');
const STYLES = join(ROOT, 'engine', 'styles');
mkdirSync(JOBS, { recursive: true });

export type Style = { id: string; label: string; line: string; ref: string; fundamentals: string; swatch: string[]; order: number };
export function styles(): Style[] {
  return readdirSync(STYLES).filter(f => f.endsWith('.json')).map(f => {
    const s = JSON.parse(readFileSync(join(STYLES, f), 'utf8'));
    return { id: f.replace(/\.json$/, ''), label: s.label, line: s.line, ref: s.ref, fundamentals: s.fundamentals, swatch: s.swatch ?? [], order: s.order ?? 99 };
  }).sort((a, b) => a.order - b.order);
}

const ID = /^[a-z0-9]{10}$/;
export const validId = (id: string) => ID.test(id);
export const jobDir = (id: string) => join(JOBS, id);
export const newId = () => randomBytes(8).toString('base64url').replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(10, '0').slice(0, 10);

export type JobOpts = { style: string; handle?: string; badge?: string; split?: boolean; sample?: boolean };
export function writeJob(id: string, input: string, o: JobOpts) {
  const job = { id, style: o.style, input, handle: (o.handle ?? '').slice(0, 30) || '@moovi', badge: (o.badge ?? '').slice(0, 24), split: !!o.split, sample: !!o.sample, created: new Date().toISOString() };
  writeFileSync(join(jobDir(id), 'job.json'), JSON.stringify(job, null, 1));
  writeFileSync(join(jobDir(id), 'status.json'), JSON.stringify({ id, state: 'queued', pct: 0, style: o.style, stages: [], events: [] }, null, 1));
}

// ---- queue (module scope survives between requests in `next start`; jobs left "running" by a restart are re-queued) ----
type Q = { queue: string[]; running: string | null };
const g = globalThis as unknown as { __mooviQ?: Q };
const q: Q = g.__mooviQ ?? (g.__mooviQ = { queue: [], running: null });

export function enqueue(id: string) {
  if (!q.queue.includes(id) && q.running !== id) q.queue.push(id);
  pump();
}
/** how many jobs are ahead of this one (0 = it is running or about to) */
export function position(id: string) { if (q.running === id) return 0; const i = q.queue.indexOf(id); return i < 0 ? 0 : i + (q.running ? 1 : 0); }

function pump() {
  if (q.running || !q.queue.length) return;
  const id = q.queue.shift()!; q.running = id;
  const dir = jobDir(id);
  const p = spawn(process.execPath, [join(ROOT, 'engine', 'run.mjs'), dir], { cwd: ROOT, env: process.env, stdio: 'ignore', windowsHide: true });
  const done = () => { q.running = null; pump(); };
  p.on('error', e => { markError(id, 'START', 'The edit engine did not start. This is on our side; try again in a minute.', e.message); done(); });
  p.on('close', code => {
    // the engine writes its own error into status.json; a hard crash (killed, out of memory) leaves "running": say so
    const s = readStatus(id);
    if (s && s.state === 'running') markError(id, 'CRASH', 'The edit engine stopped unexpectedly. Your upload is kept: press Try again.', `exit ${code}`);
    done();
  });
}

export function readStatus(id: string): Record<string, unknown> & { state?: string } | null {
  // two tries: a rename landing mid-read on Windows can fail once
  for (let i = 0; i < 2; i++) { try { return JSON.parse(readFileSync(join(jobDir(id), 'status.json'), 'utf8')); } catch { /* retry once */ } }
  return null;
}
function markError(id: string, code: string, human: string, detail: string) {
  const s = readStatus(id) ?? { id };
  writeFileSync(join(jobDir(id), 'status.json'), JSON.stringify({ ...s, state: 'error', error: { code, human, detail } }, null, 1));
}

/** start over from the same upload (keeps the cached Meta answers, so a retry costs no extra model calls) */
export function retry(id: string, style?: string, opts: { music?: boolean; handle?: string } = {}) {
  const job = JSON.parse(readFileSync(join(jobDir(id), 'job.json'), 'utf8'));
  if (style) job.style = style;
  if (opts.music !== undefined) job.noMusic = !opts.music;
  if (opts.handle) job.handle = opts.handle.slice(0, 30);
  writeFileSync(join(jobDir(id), 'job.json'), JSON.stringify(job, null, 1));
  writeFileSync(join(jobDir(id), 'status.json'), JSON.stringify({ id, state: 'queued', pct: 0, style: job.style, stages: [], events: [] }, null, 1));
  enqueue(id);
}

/** what the studio can tell a visitor before they upload: is Meta live, is the engine's toolchain here */
export function health() {
  const key = !!process.env.MODEL_API_KEY?.trim() || hasEnvKey();
  const standin = !!process.env.META_API_BASE;
  let ffmpeg = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ffmpeg = false; }
  const claude = (process.env.DIRECTOR ?? '').toLowerCase() === 'claude';   // temporary director until the Meta key is in
  return { meta: claude ? 'claude' : standin ? 'test' : key ? 'live' : 'missing', ffmpeg, queue: q.queue.length + (q.running ? 1 : 0) };
}
function hasEnvKey() {
  try { const m = readFileSync(join(ROOT, '.env.local'), 'utf8').match(/^\s*MODEL_API_KEY\s*=\s*(\S+)/m); return !!m?.[1]; } catch { return false; }
}

export const SAMPLE = join(ROOT, 'data', 'samples', 'sample.mp4');
export function startSample(style: string) {
  if (!existsSync(SAMPLE)) return null;
  const id = newId(); mkdirSync(jobDir(id), { recursive: true });
  copyFileSync(SAMPLE, join(jobDir(id), 'input.mp4'));
  writeJob(id, 'input.mp4', { style, sample: true });
  enqueue(id);
  return id;
}

// re-queue jobs that were queued or running when the server last stopped: only in a running server (never while
// `next build` loads this module), and never a job whose engine process is still alive
const alive = (pid: unknown) => { if (typeof pid !== 'number') return false; try { process.kill(pid, 0); return true; } catch { return false; } };
if (process.env.NEXT_PHASE !== 'phase-production-build' && !(globalThis as { __mooviResumed?: boolean }).__mooviResumed) {
  (globalThis as { __mooviResumed?: boolean }).__mooviResumed = true;
  for (const id of existsSync(JOBS) ? readdirSync(JOBS) : []) {
    if (!validId(id)) continue;
    const s = readStatus(id);
    if (s && (s.state === 'queued' || (s.state === 'running' && !alive(s.pid)))) enqueue(id);
  }
}
