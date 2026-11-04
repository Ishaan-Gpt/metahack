// One edit job, end to end: raw take in, edited MP4 (and a before/after) out. The studio's API starts this as a child
// process per job and reads <job>/status.json; nothing here needs the web app.
//   node engine/run.mjs <job dir>        (the dir holds job.json { engine?, badge, handle, input, render?, regradeOnly?, redirect? })
// Two render engines, Vignesh's templates: card-studio (Card Studio) and creator-mix (Creator Mix, 26 effects, 8 to 16 picked per video). A new job
// gets the other engine from the last one (data/jobs/.engine-turn), so uploads alternate between them.
// Stages: watch (crop to 9:16, transcribe, pauses cut) -> direct (rules + one director plan) -> build (stock, person matte)
// -> render (canvas frames) -> mix -> share. job.rerender (set by engine/edits.mjs after a prompt) skips straight to
// render with the edited plan: no new transcription, no new director call.
// PREVIEW FIRST (5 Nov 2026): a new job runs watch -> direct -> build and STOPS at status.state 'preview' (status.preview,
// clip/preview.json = the merged template; the studio draws the edit live with player/*.js). The MP4 is made only when
// job.json has render: true (the studio's Render button): that run is the old re-render (render -> mix -> share -> 'done').
// job.regradeOnly re-grades graded.mp4 and goes back to 'preview'; job.redirect re-directs from the cached words (engine switch).
// Every failure ends as status.state 'error' with a code and a sentence a creator can act on; the raw log stays in log.txt.
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, loadEnv } from './env.mjs';
import { listStyles, loadStyle } from './styles.mjs';
import { writePreview } from './preview.mjs';

loadEnv();
const JOB = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(JOB, 'job.json'))) { console.error('usage: node engine/run.mjs <job dir with job.json>'); process.exit(1); }
const job = JSON.parse(readFileSync(join(JOB, 'job.json'), 'utf8'));
const CLIP = join(JOB, 'clip'); mkdirSync(CLIP, { recursive: true });
const POLY = job.style === 'polyester';   // Template 3: explicit choice only ("auto" never lands here); photos in, no model call at all
const ENGINES = ['card-studio', 'creator-mix'], LABEL = { 'card-studio': 'Card Studio', 'creator-mix': 'Creator Mix', polyester: 'Polyester' };
const ENGINE0 = job.engine;   // Polyester keeps the talking edit's engine in job.json, so "switch back" finds its plan
if (POLY) job.engine = 'polyester';
else if (!ENGINES.includes(job.engine)) {
  if (ENGINES.includes(job.style)) job.engine = job.style;
  else { const turn = join(JOB, '..', '.engine-turn'); const last = existsSync(turn) ? readFileSync(turn, 'utf8').trim() : ENGINES[1]; job.engine = ENGINES[(ENGINES.indexOf(last) + 1) % ENGINES.length]; try { writeFileSync(turn, job.engine); } catch { /* not writable: still fine */ } }
  writeFileSync(join(JOB, 'job.json'), JSON.stringify(job, null, 1));
}
const ENG = job.engine, MIX = ENG === 'creator-mix', SPEC = join(CLIP, MIX ? 'spec.mix.json' : 'spec.card.json');
const S = loadStyle(ENG);   // the engine's style: grade, card layout (Card Studio's Zoom download crops the card)
const PY = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');   // Windows: python3 is the Store stub
// which run this is: 'render' (the final MP4; job.render from the studio, job.rerender from before preview-first),
// 'regrade' (colour only, back to preview), 'redirect' (engine switch: direct again from the cached words), 'full' (a new take)
const HAVE_SPEC = existsSync(SPEC);
const MODE = POLY ? 'poly' : (job.render || job.rerender) && HAVE_SPEC ? 'render' : job.regradeOnly && HAVE_SPEC ? 'regrade'
  : job.redirect && ['words.json', 'cut.json', 'cut.mp4'].every(f => existsSync(join(CLIP, f))) ? 'redirect' : 'full';
const RERENDER = MODE === 'render';
const prev = MODE !== 'full' && existsSync(join(JOB, 'status.json')) ? (() => { try { return JSON.parse(readFileSync(join(JOB, 'status.json'), 'utf8')); } catch { return null; } })() : null;
const LOG = join(JOB, 'log.txt');
const STAGES = POLY ? [
  ['cutout', 'Cutting you out', 'Local cut-outs of every photo, nothing leaves this machine'],
  ['render', 'Rendering', 'Frame-accurate Polyester: flashes, glitch frames and splits on the beat'],
  ['share', 'Making the download', 'The finished edit'],
] : MODE === 'render' ? [
  ['render', 'Rendering', 'Drawing every frame'],
  ['mix', 'Mixing the sound', 'Voice, effects on every change, a quiet bed, -14 LUFS'],
  ['share', 'Making the download', 'The show video and the Zoom download'],
] : MODE === 'regrade' ? [
  ['grade', 'Re-grading the colour', 'Your new colour on the whole take'],
] : [
  ['watch', 'Watching your take', 'Cropping to 9:16, hearing every word, cutting the pauses'],
  ['direct', 'Directing', 'The director reads the take and plans every beat'],
  ['build', 'Building the looks', 'Fetching photos for the nouns, cutting you out for text-behind'],
];
const status = { id: job.id, pid: process.pid, raw: job.input ?? job.polyester?.people?.[0]?.photos?.[0], state: 'running', stage: STAGES[0][0], stages: STAGES.map(([id, label, detail]) => ({ id, label, detail, state: 'pending' })), pct: 0, started: new Date().toISOString(), style: ENG, styleLabel: LABEL[ENG], engine: ENG, events: MODE !== 'full' && MODE !== 'poly' ? (prev?.events ?? []) : [] };
// keep what an earlier run found (and the last final render's outputs, so a download stays offered while the preview changes)
if (prev && MODE !== 'full') for (const k of ['input', 'plan', 'meta', 'choice', 'raw', 'outputs', 'finished', 'duration', 'preview', 'renderedEdits']) if (prev[k] != null) status[k] = prev[k];
if (MODE === 'poly') delete status.preview;
// atomic: write a temp file and rename it, so the studio never reads a half-written status
const save = () => { const f = join(JOB, 'status.json'); writeFileSync(f + '.tmp', JSON.stringify(status, null, 1)); renameSync(f + '.tmp', f); };
const log = s => appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${s}\n`);
const event = (text, kind = 'info') => { status.events.push({ t: +((Date.now() - T0) / 1000).toFixed(1), kind, text }); status.events = status.events.slice(-40); save(); log(text); };
const T0 = Date.now();
const WEIGHT = POLY ? { cutout: 30, render: 62, share: 8 } : MODE === 'render' ? { render: 75, mix: 12, share: 13 } : MODE === 'regrade' ? { grade: 100 } : { watch: 50, direct: 25, build: 25 };
function stage(id, state, extra = {}) {
  const s = status.stages.find(x => x.id === id); Object.assign(s, { state, ...extra });
  if (state === 'running') { status.stage = id; s.startedAt = Date.now(); }
  if (state === 'done') { if (!s.startedAt) s.startedAt = Date.now(); s.seconds = +((Date.now() - s.startedAt) / 1000).toFixed(1); }
  status.pct = Math.round(status.stages.filter(x => x.state === 'done').reduce((a, x) => a + WEIGHT[x.id], 0));
  save();
}
const sub = (k) => { const s = status.stages.find(x => x.id === status.stage); status.pct = Math.round(status.stages.filter(x => x.state === 'done').reduce((a, x) => a + WEIGHT[x.id], 0) + WEIGHT[s.id] * Math.min(1, k)); save(); };

// errors a creator can act on: the code says where, the sentence says what to do
class JobError extends Error { constructor(code, human, detail) { super(detail ?? human); this.code = code; this.human = human; } }
function fail(e) {
  const code = e.code && typeof e.code === 'string' && e.human ? e.code : 'ENGINE';
  const human = e.human ?? 'Something in the edit engine broke. Your upload is safe; try again, and if it repeats, send us the job id.';
  log(`ERROR ${code}: ${e.stack ?? e.message}`);
  const s = status.stages.find(x => x.id === status.stage); if (s) s.state = 'error';
  Object.assign(status, { state: 'error', error: { code, human, detail: String(e.message ?? '').slice(0, 400) }, finished: new Date().toISOString() });
  save(); process.exit(1);
}
process.on('uncaughtException', fail); process.on('unhandledRejection', fail);

/** run a node/python/ffmpeg step, stream its output to the log, call onLine for progress */
function step(cmd, args, { env = {}, onLine, limit = 1200 } = {}) {
  return new Promise((ok, no) => {
    log(`$ ${cmd} ${args.join(' ')}`);
    const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    // never a hang: a step that runs past its limit (seconds; STEP_LIMIT_SCALE stretches all of them) is killed and fails
    const kill = setTimeout(() => { tail += `
step timed out after ${limit} s`; try { p.kill(); } catch {} }, limit * 1000 * +(process.env.STEP_LIMIT_SCALE ?? 1));
    p.on('close', () => clearTimeout(kill));
    const take = d => { const s = d.toString(); appendFileSync(LOG, s); tail = (tail + s).slice(-3000); if (onLine) for (const l of s.split(/\r?\n/)) if (l.trim()) onLine(l); };
    p.stdout.on('data', take); p.stderr.on('data', take);
    p.on('error', e => no(Object.assign(e, { tail })));
    p.on('close', c => c === 0 ? ok(tail) : no(Object.assign(new Error(`${cmd} exited ${c}`), { tail })));
  });
}
const has = (s, re) => re.test(s ?? '');


// ---- Template 3 "Polyester": photos in, a 19.3 s edit out. Zero model/API calls; everything runs on this machine. ------------------
if (POLY) {
  const cfg = job.polyester ?? {};
  if ((job.render || job.rerender) && existsSync(join(JOB, 'polyester.mp4')) && prev?.outputs?.template === 'polyester') {   // the Polyester MP4 is already final
    job.render = false; job.rerender = false; writeFileSync(join(JOB, 'job.json'), JSON.stringify({ ...job, engine: ENGINE0 }, null, 1));
    for (const s of status.stages) s.state = 'skipped';
    Object.assign(status, { outputs: prev.outputs, duration: prev.duration, state: 'done', pct: 100, finished: new Date().toISOString(), seconds: 0 }); save(); process.exit(0);
  }
  const abs = f => resolve(JOB, f);
  const people = (cfg.people ?? []).map(p => ({ name: String(p.name ?? '').slice(0, 12), photos: (p.photos ?? []).map(abs).filter(existsSync) })).filter(p => p.photos.length);
  if (!people.length) fail(new JobError('NO_PHOTOS', 'Template 3 needs photos of you. Upload at least two, ideally 8 to 12 (face close-ups, half body, full body).'));
  if (people.reduce((n, p) => n + p.photos.length, 0) < 2) fail(new JobError('FEW_PHOTOS', 'Upload at least two photos for Polyester; 8 to 12 gives the best result.'));
  const PD = join(JOB, 'poly'); mkdirSync(join(PD, 'out'), { recursive: true }); mkdirSync(join(PD, 'reference'), { recursive: true });
  writeFileSync(join(PD, 'poly.json'), JSON.stringify({ people, videos: (cfg.videos ?? []).map(abs).filter(existsSync) }));
  const names = people.map(p => p.name || 'YOU').join('|');
  stage('cutout', 'running'); event(`Cutting out ${people.reduce((n, p) => n + p.photos.length, 0)} photos on this machine`);
  try { await step(PY, [join(ROOT, 'tools/polyester/prep.py'), PD], { limit: 900 }); }
  catch (e) { fail(new JobError('CUTOUT', 'The cut-out step could not read those photos. Use JPG or PNG photos where you are clearly visible.', e.tail ?? e.message)); }
  stage('cutout', 'done');
  stage('render', 'running'); event('Rendering 579 frames');
  try {
    await step(PY, [join(ROOT, 'tools/polyester/render.py'), 'video'], {
      env: { POLY_DIR: PD, POLY_NAMES: names, ...(cfg.audio && existsSync(abs(cfg.audio)) ? { POLY_AUDIO: abs(cfg.audio) } : {}) }, limit: 1800,
      onLine: l => { const m = /^frame (\d+)/.exec(l); if (m) sub(+m[1] / 579); } });
  } catch (e) { fail(new JobError('RENDER', 'The render stopped part way. Your photos are safe; try again.', e.tail ?? e.message)); }
  stage('render', 'done');
  stage('share', 'running');
  copyFileSync(join(PD, 'out/polyester.mp4'), join(JOB, 'polyester.mp4')); stage('share', 'done');
  job.render = false; job.rerender = false; job.regradeOnly = false; job.redirect = false; writeFileSync(join(JOB, 'job.json'), JSON.stringify({ ...job, engine: ENGINE0 }, null, 1));
  Object.assign(status, { state: 'done', pct: 100, finished: new Date().toISOString(), seconds: +((Date.now() - T0) / 1000).toFixed(1),
    outputs: { edit: 'polyester.mp4', beforeAfter: null, raw: status.raw, template: 'polyester', show: 'polyester.mp4', download: 'polyester.mp4', downloadName: 'Polyester.mp4' }, duration: 19.3 });
  event(`Done in ${status.seconds} s`, 'done'); save(); process.exit(0);
}

// ---- preflight: the input is a video with sound, of a length we can edit -------------------------------------------
const input = join(JOB, job.input);
let probe;
try { probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', input], { encoding: 'utf8' })); }
catch (e) { fail(new JobError('NOT_VIDEO', 'That file is not a video we can read. Upload an MP4, MOV or WEBM straight from your phone or camera.', e.message)); }
const dur = +probe.format?.duration || 0, v = probe.streams?.find(s => s.codec_type === 'video'), a = probe.streams?.find(s => s.codec_type === 'audio');
if (!v) fail(new JobError('NO_PICTURE', 'This file has no picture. Upload the video itself, not just its sound.'));
if (!a) fail(new JobError('NO_SOUND', 'This video has no sound. The edit follows what you say, so upload a take where you talk.'));
if (dur < 5) fail(new JobError('TOO_SHORT', `Your take is ${dur.toFixed(1)} s. Give us at least 5 seconds of talking.`));
const MAX = +(process.env.MAX_SECONDS ?? 75);
if (dur > MAX) fail(new JobError('TOO_LONG', `Your take is ${Math.round(dur)} s; the studio edits up to ${MAX} s right now. Trim it to your best ${MAX} seconds and upload again.`));
status.input = { seconds: +dur.toFixed(1), width: v.width, height: v.height }; save();
event(`Got your take: ${dur.toFixed(1)} s, ${v.width}x${v.height}`);

// which transcriber and which Spark endpoint: the real Meta Model API when a key is set; the TEST stand-in only when
// META_API_BASE points at it (then words come from Whisper on Groq and the run is marked as a test in status.meta)
const claude = (process.env.DIRECTOR ?? '').toLowerCase() === 'claude';   // temporary: Claude Sonnet directs until the Meta key is in
const realMeta = !claude && !!process.env.MODEL_API_KEY?.trim() && !process.env.META_API_BASE;
const standin = !claude && !!process.env.META_API_BASE;
const gem = !claude && !standin && !process.env.MODEL_API_KEY?.trim() && (!!process.env.GEMINI_API_KEY?.trim() || !!(await import('./muse.mjs')).localDirector());   // free Gemini API, BACKUP only (no Meta key)
const NEEDS_MODEL = MODE === 'full' || MODE === 'redirect';
if (NEEDS_MODEL && claude && !process.env.ANTHROPIC_API_KEY?.trim()) fail(new JobError('NO_DIRECTOR_KEY', 'The studio is missing its director key, so nothing can plan your edit. This is on our side, not yours: we are on it.'));
if (NEEDS_MODEL && !claude && !realMeta && !standin && !gem) fail(new JobError('NO_META_KEY', 'The studio is missing its Meta Model API key, so Muse Spark cannot direct. This is on our side, not yours: we are on it.'));
if (NEEDS_MODEL) {
  log('Muse model map: ' + (await import('./muse.mjs')).museTable());
  const local = (await import('./muse.mjs')).localDirector();
  status.meta = { live: realMeta, provider: claude ? 'claude' : realMeta ? 'meta' : local ? 'local-open-weights' : gem ? 'gemini' : 'standin', transcriber: realMeta ? 'muse-voice-transcribe-1.0' : 'whisper-large-v3-turbo (Groq)', director: claude ? 'claude-sonnet-5-5' : local ? local.model : gem ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : 'muse-spark-1.3' }; save();
}

// ---- the final render (the studio's Render button, or a re-render from before preview-first) --------------------------
if (RERENDER) {
  event('Rendering your final video', 'decision');
  await renderAndShare();
  process.exit(0);
}

// ---- colour only: re-grade graded.mp4 and go back to the live preview -------------------------------------------------
if (MODE === 'regrade') {
  stage('grade', 'running'); event('Re-grading the colour');
  try { await regrade(); } catch (e) { fail(new JobError('GRADE', 'The colour change did not go through. Press Try again; your edit is kept.', (e.tail ?? '').slice(-400) || e.message)); }
  stage('grade', 'done');
  finishPreview('New colour is in the preview');
  process.exit(0);
}

// ---- 1 watch (skipped on an engine switch: the words, the cut and the framing are already here) ---------------------
if (MODE === 'redirect') { status.stages.find(x => x.id === 'watch').state = 'skipped'; event('Re-directing from the words already heard', 'decision'); }
else { stage('watch', 'running');
try {
  await step(process.execPath, [join(ROOT, 'engine/prep.mjs'), input, CLIP], {
    env: { HEAR: realMeta || (gem && !(await import('./muse.mjs')).localDirector()) ? 'meta' : 'groq', DIALECT: 'card-studio', PREP_GRADE: '0' },   // test runs: Whisper on Groq for the words
    onLine: l => { if (/^ingest/.test(l)) { sub(0.35); event('Framed for 9:16 around your face'); } if (/^hear/.test(l)) { sub(0.7); event(realMeta ? 'Muse Voice Transcribe heard every word' : 'Words timed'); } if (/^clean/.test(l)) { sub(0.95); } },
  });
} catch (e) {
  const t = e.tail ?? '';
  if (has(t, /Muse Voice Transcribe answered 4(01|03)/)) fail(new JobError('META_AUTH', 'Meta turned down the studio\'s key. This is on our side; we are fixing it.', t.slice(-400)));
  if (has(t, /Muse Voice Transcribe answered (429|5\d\d)/)) fail(new JobError('META_BUSY', 'Meta\'s speech model is busy right now. Wait a minute and press Try again.', t.slice(-400)));
  if (has(t, /unreachable \(network\)|fetch failed|ECONNRESET|ENOTFOUND/)) fail(new JobError('NETWORK', 'The studio lost its connection to the speech model for a moment. Press Try again.', t.slice(-400)));
  if (has(t, /no words|0 words/i)) fail(new JobError('NO_SPEECH', 'We could not hear any words in your take. Check the mic was on and you speak in the first seconds.', t.slice(-400)));
  fail(new JobError('PREP', 'We could not prepare your video. Try exporting it again from your phone (MP4, H.264) and upload once more.', t.slice(-400)));
}
}
const words = JSON.parse(readFileSync(join(CLIP, 'words.json'), 'utf8'));
if (words.length < 6) fail(new JobError('NO_SPEECH', 'We heard almost nothing in your take. The edit is built from your words, so upload a take where you talk.'));
const cut = JSON.parse(readFileSync(join(CLIP, 'cut.json'), 'utf8'));
if (MODE !== 'redirect') stage('watch', 'done'); event(`${words.length} words; pauses cut, ${dur.toFixed(1)} s to ${cut.duration.toFixed(1)} s`);

// ---- 2 direct ----------------------------------------------------------------------------------------------------------
stage('direct', 'running');
status.style = ENG; status.styleLabel = LABEL[ENG]; save();
event(`Editing in ${LABEL[ENG]}`, 'decision');
// grade the cut with the engine's own grade (prep leaves it ungraded)
await regrade();
try {
  const { direct } = await import('./card-studio.mjs');
  const origLog = console.log, origWarn = console.warn;
  console.log = (...x) => { const l = x.join(' '); log(l); if (/^coverage: added/.test(l)) sub(0.6); if (/^build:|stock|matte/i.test(l) && status.stage === 'direct') { stage('direct', 'done'); stage('build', 'running'); } };
  console.warn = (...x) => log('warn: ' + x.join(' '));
  const dog = setTimeout(() => fail(new JobError('DIRECT', 'Directing took far too long (a photo or model service stopped answering). Press Try again.', 'direct watchdog')), 1500 * 1000 * +(process.env.STEP_LIMIT_SCALE ?? 1));
  // each engine plans with its own style (engine/styles/<engine>.json); Creator Mix then lays its effects on that plan
  await direct(CLIP, { style: ENG, mix: false, badge: job.badge || (realMeta ? 'Muse Spark' : 'Edit Easy'), handle: job.handle || '@editeasy', cta1: job.cta1, cta2: job.cta2, kw: job.kw, noStock: job.noStock });
  if (MIX) { const { buildMix } = await import('./creator-mix.mjs'); await buildMix(CLIP, { handle: job.handle || '@editeasy', cta1: job.cta1, cta2: job.cta2 }); }
  clearTimeout(dog); console.log = origLog; console.warn = origWarn;
} catch (e) { fail(new JobError('DIRECT', 'The director could not plan this take. Press Try again.', e.stack)); }
const spec = JSON.parse(readFileSync(join(CLIP, 'spec.card.json'), 'utf8')), mixSpec = MIX && existsSync(SPEC) ? JSON.parse(readFileSync(SPEC, 'utf8')) : null;
if (status.stages.find(x => x.id === 'direct').state !== 'done') stage('direct', 'done');
stage('build', 'done');
const usage = existsSync(join(CLIP, 'meta-usage.json')) ? JSON.parse(readFileSync(join(CLIP, 'meta-usage.json'), 'utf8')) : null;
status.plan = { engine: ENG, effects: mixSpec?.fx?.length ?? null, segments: spec.segments.length, layouts: mixSpec ? mixSpec.fx.map(f => f.name) : spec.director?.types ?? [], planner: spec.director?.plan, captions: spec.captions.length, photos: Object.keys(spec.images ?? {}).length };
status.meta.calls = usage?.calls?.map(c => ({ call: c.call, model: c.model, ok: c.ok !== false, cache: !!c.cache_hit, seconds: c.seconds ?? null, tokens: c.usage?.total_tokens ?? null, standin: !!c.standin })) ?? [];
event(`${spec.segments.length} beats in ${status.plan.layouts.length} layouts; ${spec.director?.plan ?? ''}`, 'decision');

// preview first: stop here; the MP4 is made only when the studio sets job.render (its Render button)
finishPreview('Preview ready: change anything, then render');
process.exit(0);

/** end a run at the live preview: clip/preview.json + status.preview, state 'preview' (outputs of an earlier render kept) */
function finishPreview(said) {
  const sp = JSON.parse(readFileSync(SPEC, 'utf8'));
  status.preview = writePreview(CLIP, ENG, sp);
  job.regradeOnly = false; job.regrade = false; job.redirect = false; job.rerender = false; job.render = false;
  writeFileSync(join(JOB, 'job.json'), JSON.stringify(job, null, 1));
  Object.assign(status, { state: 'preview', pct: 100, finished: new Date().toISOString(), seconds: +((Date.now() - T0) / 1000).toFixed(1), duration: +sp.duration.toFixed(1), edits: (sp.edits ?? []).length });
  event(said, 'done'); save();
}

// ---- 3 render + 4 mix + 5 share: also the whole of a re-render after a prompt edit ------------------------------------
async function regrade() {
  const d = existsSync(SPEC) ? (JSON.parse(readFileSync(SPEC, 'utf8')).gradeDelta ?? {}) : {};
  const G = S.grade ?? { contrast: 1, saturate: 1, brightness: 1, warm: 0 };
  const c = +(G.contrast + (d.contrast ?? 0)).toFixed(3), sat = +Math.max(0, G.saturate + (d.sat ?? 0)).toFixed(3), br = +((G.brightness - 1) + (d.bright ?? 0)).toFixed(3), w = +((G.warm ?? 0) + (d.warm ?? 0)).toFixed(3);
  await step('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-i', join(CLIP, 'cut.mp4'), '-vf', `eq=contrast=${c}:saturation=${sat}:brightness=${br},colorbalance=rs=${w}:bs=${-w}:rm=${w / 2}:bm=${-w / 2}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', '15', '-c:a', 'copy', '-movflags', '+faststart', join(CLIP, 'graded.mp4')]);
}
async function renderAndShare() {
  const spec = JSON.parse(readFileSync(SPEC, 'utf8'));
  if (RERENDER && job.regrade) { stage('render', 'running'); event('Re-grading the colour'); await regrade(); }
  stage('render', 'running');
  const OUT = join(JOB, 'edit.mp4'), TMP = join(JOB, 'edit.next.mp4');
  const frames = Math.round(spec.duration * (spec.fps ?? 30));
  const tool = ENG === 'creator-mix' ? 'tools/render-mix.mjs' : 'tools/render-card.mjs';
  try {
    // render to a new file and swap it in at the end, so the last good edit keeps playing while a change renders
    await step(process.execPath, [join(ROOT, tool), CLIP, TMP, ...(job.noMusic ? ['--no-music'] : [])], { limit: 2400,
      onLine: l => { const m = l.match(/^frame (\d+)/); if (m) sub(+m[1] / frames); if (/^video:/.test(l)) { stage('render', 'done'); stage('mix', 'running'); event('Every frame drawn'); } },
    });
  } catch (e) { fail(new JobError(status.stage === 'mix' ? 'MIX' : 'RENDER', 'Rendering stopped partway. Press Try again; your upload is kept.', (e.tail?.slice(-400) || '') + ' (' + e.message + ')')); }
  if (!existsSync(TMP) || statSync(TMP).size < 10000) fail(new JobError('RENDER', 'Rendering finished without a video. Press Try again.'));
  renameSync(TMP, OUT);
  if (status.stages.find(x => x.id === 'render').state !== 'done') stage('render', 'done');
  stage('mix', 'done'); event('Sound mixed to -14 LUFS');
  // ---- 5 share: what the user SEES and what the user DOWNLOADS (Vignesh, docs/TEMPLATES.md) ----
  //   Card Studio : show = edit.mp4 (the full frame)               download = "Card Studio Zoom" (only the card's video)
  //   Creator Mix : show = before-after.mp4 ("Edited by Meta")     download = "Creator Mix Zoom" (only the After video)
  stage('share', 'running');
  const BA = join(JOB, 'before-after.mp4');
  const ZOOM = MIX ? 'creator-mix-zoom.mp4' : 'card-studio-zoom.mp4', ZOOM_NAME = MIX ? 'Creator Mix Zoom.mp4' : 'Card Studio Zoom.mp4';
  try {
    if (MIX) {
      copyFileSync(OUT, join(JOB, ZOOM));   // the edit before the Before/After wrapper IS the After video
      await step(PY, [join(ROOT, 'tools/ba-wrap.py'), OUT, join(CLIP, 'cut.mp4'), BA, '--accent', spec.theme?.accent ?? '#e5333d']);
    } else {
      // cut the card's own video out of the frame (inset past the rounded corners, 9:16), scaled to 1080x1920
      const c = S.layout?.card ?? { x: 380, y: 422, w: 540, h: 956, r: 30 }, inset = Math.ceil((c.r ?? 30) * 0.33), w = c.w - 2 * inset, h = Math.min(c.h - 2 * inset, Math.round(w * 16 / 9)), x = c.x + inset, y = c.y + Math.round((c.h - h) / 2);
      await step('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-i', OUT, '-vf', `crop=${w - (w % 2)}:${h - (h % 2)}:${x}:${y},scale=1080:1920:flags=lanczos,setsar=1`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', join(JOB, ZOOM)]);
    }
    stage('share', 'done');
  } catch (e) { log('share step failed (the edit is fine): ' + e.message); status.stages.find(x => x.id === 'share').state = 'skipped'; }
  job.rerender = false; job.render = false; job.regrade = false; job.regradeOnly = false; writeFileSync(join(JOB, 'job.json'), JSON.stringify(job, null, 1));
  Object.assign(status, { state: 'done', pct: 100, finished: new Date().toISOString(), seconds: +((Date.now() - T0) / 1000).toFixed(1), edits: (spec.edits ?? []).length, renderedEdits: (spec.edits ?? []).length,
    outputs: { edit: 'edit.mp4', beforeAfter: MIX && existsSync(BA) ? 'before-after.mp4' : null, raw: job.input,
      template: ENG, show: MIX && existsSync(BA) ? 'before-after.mp4' : 'edit.mp4', download: existsSync(join(JOB, ZOOM)) ? ZOOM : null, downloadName: ZOOM_NAME },
    duration: +spec.duration.toFixed(1) });
  try { status.preview = writePreview(CLIP, ENG, spec); } catch (e) { log('preview.json not refreshed: ' + e.message); }
  event(`Final video rendered in ${status.seconds} s`, 'done');
  save();
}
