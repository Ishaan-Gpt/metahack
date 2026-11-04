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
export type Style = { id: string; label: string; line: string; ref: string; fundamentals: string; swatch: string[]; order: number };
/** the two render engines (Vignesh's templates). Uploads take turns between them (engine/run.mjs); prompts edit after */
const ENGINES: Style[] = [
  { id: 'card-studio', label: 'Card Studio', line: 'Your take in a clean studio card, a storyboard beside it, serif hero words.', ref: 'engine/templates/card-studio.json', fundamentals: 'cards, photo beats, list, post card, word behind', swatch: ['#efefee', '#cbe65e', '#de7e59'], order: 1 },
  { id: 'creator-mix', label: 'Creator Mix', line: 'Colour-world backgrounds, whip and shatter cuts, number posters, photo strips, and a Before/After with Edited by Meta.', ref: 'engine/templates/creator-mix.json', fundamentals: '22 effects, kinetic words, colour fields', swatch: ['#4b1fa8', '#e5333d', '#f1ece2'], order: 2 },
];
export function styles(): Style[] { return ENGINES; }

const ID = /^[a-z0-9]{10}$/;
export const validId = (id: string) => ID.test(id);
export const jobDir = (id: string) => join(JOBS, id);
export const newId = () => randomBytes(8).toString('base64url').replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(10, '0').slice(0, 10);

export type JobOpts = { style: string; handle?: string; badge?: string; split?: boolean; sample?: boolean };
export function writeJob(id: string, input: string, o: JobOpts) {
  const job = { id, style: o.style, input, handle: (o.handle ?? '').slice(0, 30) || '@editeasy', badge: (o.badge ?? '').slice(0, 24), split: !!o.split, sample: !!o.sample, created: new Date().toISOString() };
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

/** the sample library: raw Wikimedia Commons takes anyone can edit without uploading (data/samples/samples.json) */
export type Sample = { id: string; name: string; line: string; seconds: number; shape: string; credit: string; licence: string; source: string };
const SAMPLES = join(ROOT, 'data', 'samples');
export function samples(): Sample[] {
  try { return (JSON.parse(readFileSync(join(SAMPLES, 'samples.json'), 'utf8')) as Sample[]).filter(s => existsSync(join(SAMPLES, `${s.id}.mp4`))); } catch { return []; }
}
export const sampleFile = (id: string, ext: 'mp4' | 'jpg') => /^[a-z0-9-]{2,40}$/.test(id) ? join(SAMPLES, `${id}.${ext}`) : null;
export function startSample(style: string, sampleId?: string) {
  const list = samples(), pick = list.find(s => s.id === sampleId) ?? list[0];
  const src = pick && sampleFile(pick.id, 'mp4');
  if (!src || !existsSync(src)) return null;
  const id = newId(); mkdirSync(jobDir(id), { recursive: true });
  copyFileSync(src, join(jobDir(id), 'input.mp4'));
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

/** queue a re-render after a prompt edit; the old status stays readable (plan, Meta calls, events) until the new run starts */
export function requeueEdit(id: string) {
  const s = readStatus(id) ?? { id };
  writeFileSync(join(jobDir(id), 'status.json'), JSON.stringify({ ...s, state: 'queued', pct: 0, error: undefined }, null, 1));
  enqueue(id);
}

function setJob(id: string, k: string) {
  const f = join(jobDir(id), 'job.json'), job = JSON.parse(readFileSync(f, 'utf8'));
  job[k] = true;
  writeFileSync(f, JSON.stringify(job, null, 1));
}
/** ask for the final MP4: the next run renders + shares from the planned edit and ends 'done' (engine/run.mjs, job.render) */
export function requestRender(id: string) { setJob(id, 'render'); requeueEdit(id); }
/** a prompt that only changes the grade: the engine re-grades and rebuilds the preview, nothing else */
export function requeueRegrade(id: string) { setJob(id, 'regradeOnly'); requeueEdit(id); }

/** the reference edits recreated once in code (recreate/<id>, served by app/ref); their raw take is data/clips/<clip>/before.mp4.
 *  ba5 is not listed: it is the Storyboard card behind Card Studio, which the engines already make. */
export type RefSample = { id: string; name: string; line: string; clip: string; before: string; player: string };
const REFS: Omit<RefSample, 'before' | 'player'>[] = [
  { id: 'ba1', name: 'Brand ad', line: 'A product ad edit', clip: 'ba1c' },
  { id: 'ba2', name: 'Creator studio', line: 'A creator talking-head edit', clip: 'ba2c' },
  { id: 'ba3', name: '$10 vs $80', line: 'A side-by-side comparison', clip: 'ba3c' },
  { id: 'ba4', name: 'Interview desk', line: 'An interview at a desk', clip: 'ba4c' },
  { id: 'self1', name: 'Our own edit', line: 'A take we edited ourselves', clip: 'self1' },
];
export function refSamples(): RefSample[] {
  return REFS.filter(r => existsSync(join(ROOT, 'data', 'clips', r.clip, 'before.mp4')) && existsSync(join(ROOT, 'recreate', r.id, 'index.html')))
    .map(r => ({ ...r, before: `/data/clips/${r.clip}/before.mp4`, player: `/recreate/${r.id}/index.html?embed=1` }));
}
/** a prompt on a reference sample: its raw take goes through a real engine like any sample, then the prompt is applied */
export function startRefSample(style: string, refId: string) {
  const r = REFS.find(x => x.id === refId); if (!r) return null;
  const src = join(ROOT, 'data', 'clips', r.clip, 'before.mp4');
  if (!existsSync(src)) return null;
  const id = newId(); mkdirSync(jobDir(id), { recursive: true });
  copyFileSync(src, join(jobDir(id), 'input.mp4'));
  writeJob(id, 'input.mp4', { style, sample: true });
  enqueue(id);
  return id;
}

/** what the live preview draws: clip/preview.json (the merged T written by engine/preview.mjs) or, for jobs made before it,
 *  the same merge done here (engine template + style for Card Studio); the spec's own overrides always go on top (a no-op twice) */
type O = Record<string, unknown>;
const isObj = (v: unknown): v is O => !!v && typeof v === 'object' && !Array.isArray(v);
function merge(a: O, b: unknown): O {
  const o: O = { ...a };
  if (isObj(b)) for (const [k, v] of Object.entries(b)) o[k] = isObj(v) && isObj(a?.[k]) ? merge(a[k] as O, v) : v;
  return o;
}
const readJson = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
export type Preview = { engine: string; spec: O; T: O; specFile: string; video: string; from: 'preview.json' | 'template'; t: string | null };
export function previewOf(id: string): Preview | null {
  const dir = jobDir(id), clip = join(dir, 'clip');
  let job: O = {}; try { job = readJson(join(dir, 'job.json')); } catch { /* old job */ }
  const st = readStatus(id) as { preview?: { engine?: string; spec?: string; video?: string; t?: string } } | null;
  const engine = st?.preview?.engine ?? (job.engine as string | undefined) ?? (job.style === 'creator-mix' ? 'creator-mix' : 'card-studio');
  const specFile = st?.preview?.spec ?? (engine === 'creator-mix' ? 'spec.mix.json' : 'spec.card.json');
  if (!/^[\w.-]+\.json$/.test(specFile) || !existsSync(join(clip, specFile))) return null;
  const spec = readJson(join(clip, specFile)) as O;
  let T: O | null = null, from: Preview['from'] = 'template';
  if (existsSync(join(clip, 'preview.json'))) { try { T = readJson(join(clip, 'preview.json')); from = 'preview.json'; } catch { T = null; } }
  if (!T) {
    if (engine === 'creator-mix') T = readJson(join(ROOT, 'engine', 'templates', 'creator-mix.json')) as O;
    else {
      const base = readJson(join(ROOT, 'engine', 'templates', 'card-studio.json')), sid = String(spec.style ?? 'card-studio');
      const f = /^[\w-]+$/.test(sid) ? [join(ROOT, 'engine', 'styles', `${sid}.json`), join(ROOT, 'engine', 'styles', 'retired', `${sid}.json`)].find(x => existsSync(x)) : undefined;
      T = { ...merge(base, f ? readJson(f) : {}), name: sid };
    }
  }
  return { engine, spec, T: merge(T, spec.overrides), specFile, video: st?.preview?.video ?? String(spec.video ?? 'graded.mp4'), from, t: st?.preview?.t ?? null };
}
