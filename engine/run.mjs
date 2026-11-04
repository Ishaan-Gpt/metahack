// One edit job, end to end: raw take in, edited MP4 (and a before/after) out. The studio's API starts this as a child
// process per job and reads <job>/status.json; nothing here needs the web app.
//   node engine/run.mjs <job dir>        (the dir holds job.json { style: 'auto' | <style id>, badge, handle, input })
// Stages: watch (crop to 9:16, Muse Voice Transcribe, pauses cut) -> direct (auto: Muse Spark picks the style; then the
// style's rules + one Muse Spark plan) -> build (stock, person matte) -> render (canvas frames) -> mix -> share.
// Every failure ends as status.state 'error' with a code and a sentence a creator can act on; the raw log stays in log.txt.
import { spawn, execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, loadEnv } from './env.mjs';
import { listStyles, loadStyle } from './styles.mjs';

loadEnv();
const JOB = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(JOB, 'job.json'))) { console.error('usage: node engine/run.mjs <job dir with job.json>'); process.exit(1); }
const job = JSON.parse(readFileSync(join(JOB, 'job.json'), 'utf8'));
const CLIP = join(JOB, 'clip'); mkdirSync(CLIP, { recursive: true });
const LOG = join(JOB, 'log.txt');
const STAGES = [
  ['watch', 'Watching your take', 'Cropping to 9:16, hearing every word, cutting the pauses'],
  ['direct', 'Directing', 'The director reads the take and plans every beat'],
  ['build', 'Building the looks', 'Fetching photos for the nouns, cutting you out for text-behind'],
  ['render', 'Rendering', 'Drawing every frame'],
  ['mix', 'Mixing the sound', 'Voice, effects on every change, a quiet bed, -14 LUFS'],
  ['share', 'Making the before/after', 'Raw take beside the edit, in step'],
];
const status = { id: job.id, pid: process.pid, raw: job.input, state: 'running', stage: 'watch', stages: STAGES.map(([id, label, detail]) => ({ id, label, detail, state: 'pending' })), pct: 0, started: new Date().toISOString(), style: job.style, events: [] };
// atomic: write a temp file and rename it, so the studio never reads a half-written status
const save = () => { const f = join(JOB, 'status.json'); writeFileSync(f + '.tmp', JSON.stringify(status, null, 1)); renameSync(f + '.tmp', f); };
const log = s => appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${s}\n`);
const event = (text, kind = 'info') => { status.events.push({ t: +((Date.now() - T0) / 1000).toFixed(1), kind, text }); status.events = status.events.slice(-40); save(); log(text); };
const T0 = Date.now();
const WEIGHT = { watch: 22, direct: 10, build: 13, render: 40, mix: 8, share: 7 };
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
if (job.style !== 'auto' && !listStyles().some(x => x.id === job.style)) fail(new JobError('BAD_STYLE', `We do not have a style called "${job.style}". Pick one of the styles in the studio, or Auto.`));
status.input = { seconds: +dur.toFixed(1), width: v.width, height: v.height }; save();
event(`Got your take: ${dur.toFixed(1)} s, ${v.width}x${v.height}`);

// which transcriber and which Spark endpoint: the real Meta Model API when a key is set; the TEST stand-in only when
// META_API_BASE points at it (then words come from Whisper on Groq and the run is marked as a test in status.meta)
const claude = (process.env.DIRECTOR ?? '').toLowerCase() === 'claude';   // temporary: Claude Sonnet directs until the Meta key is in
const realMeta = !claude && !!process.env.MODEL_API_KEY?.trim() && !process.env.META_API_BASE;
const standin = !claude && !!process.env.META_API_BASE;
const gem = !claude && !standin && !process.env.MODEL_API_KEY?.trim() && (!!process.env.GEMINI_API_KEY?.trim() || !!(await import('./muse.mjs')).localDirector());   // free Gemini API, BACKUP only (no Meta key)
if (claude && !process.env.ANTHROPIC_API_KEY?.trim()) fail(new JobError('NO_DIRECTOR_KEY', 'The studio is missing its director key, so nothing can plan your edit. This is on our side, not yours: we are on it.'));
if (!claude && !realMeta && !standin && !gem) fail(new JobError('NO_META_KEY', 'The studio is missing its Meta Model API key, so Muse Spark cannot direct. This is on our side, not yours: we are on it.'));
log('Muse model map:\n' + (await import('./muse.mjs')).museTable());
status.meta = { live: realMeta, provider: claude ? 'claude' : realMeta ? 'meta' : (await import('./muse.mjs')).localDirector() ? 'local-open-weights' : gem ? 'gemini' : 'standin', transcriber: realMeta ? 'muse-voice-transcribe-1.0' : 'whisper-large-v3-turbo (Groq)', director: claude ? 'claude-sonnet-5-5' : (await import('./muse.mjs')).localDirector() ? (await import('./muse.mjs')).localDirector().model : gem ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : 'muse-spark-1.3' }; save();

// ---- 1 watch ---------------------------------------------------------------------------------------------------------
stage('watch', 'running');
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
const words = JSON.parse(readFileSync(join(CLIP, 'words.json'), 'utf8'));
if (words.length < 6) fail(new JobError('NO_SPEECH', 'We heard almost nothing in your take. The edit is built from your words, so upload a take where you talk.'));
const cut = JSON.parse(readFileSync(join(CLIP, 'cut.json'), 'utf8'));
stage('watch', 'done'); event(`${words.length} words; pauses cut, ${dur.toFixed(1)} s to ${cut.duration.toFixed(1)} s`);

// ---- 2 direct ----------------------------------------------------------------------------------------------------------
stage('direct', 'running');
const transcript = words.map(w => w.word).join(' ');
let styleId = job.style;
// exactly two templates exist: 'card-studio' and 'creator-mix'. 'auto' (or no choice) means Card Studio, so no extra Meta call is spent on picking.
if (styleId === 'auto') { styleId = 'card-studio'; status.choice = { by: 'default', style: styleId, why: 'Card Studio is the default template; Creator Mix runs when chosen' }; event('Template: Card Studio (default)', 'decision'); }
const MIX = styleId === 'creator-mix';   // template 2: Creator Mix (engine/creator-mix.mjs lays its effects on the same Card Studio plan)
const S = loadStyle(styleId); status.style = styleId; status.styleLabel = S.label; save();
// re-grade the cut with the style's own grade (prep baked Card Studio's)
const G = S.grade;
await step('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-i', join(CLIP, 'cut.mp4'), '-vf', `eq=contrast=${G.contrast}:saturation=${G.saturate}:brightness=${(G.brightness - 1).toFixed(3)},colorbalance=rs=${G.warm}:bs=${-G.warm}:rm=${G.warm / 2}:bm=${-G.warm / 2}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', '15', '-c:a', 'copy', '-movflags', '+faststart', join(CLIP, 'graded.mp4')]);
try {
  const { direct } = await import('./card-studio.mjs');
  const origLog = console.log, origWarn = console.warn;
  console.log = (...x) => { const l = x.join(' '); log(l); if (/^coverage: added/.test(l)) sub(0.6); if (/^build:|stock|matte/i.test(l) && status.stage === 'direct') { stage('direct', 'done'); stage('build', 'running'); } };
  console.warn = (...x) => log('warn: ' + x.join(' '));
  const dog = setTimeout(() => fail(new JobError('DIRECT', 'Directing took far too long (a photo or model service stopped answering). Press Try again.', 'direct watchdog')), 1500 * 1000 * +(process.env.STEP_LIMIT_SCALE ?? 1));
  await direct(CLIP, { style: styleId, mix: false, badge: job.badge || (realMeta ? 'Muse Spark' : 'Moovi'), handle: job.handle || '@moovi', cta1: job.cta1, cta2: job.cta2, kw: job.kw, noStock: job.noStock });
  clearTimeout(dog); console.log = origLog; console.warn = origWarn;
} catch (e) { fail(new JobError('DIRECT', 'The director could not plan this take. Try again; if it repeats, try another style.', e.stack)); }
if (MIX) { const { buildMix } = await import('./creator-mix.mjs'); await buildMix(CLIP, { handle: job.handle || '@moovi', cta1: job.cta1, cta2: job.cta2 }); }
const spec = JSON.parse(readFileSync(join(CLIP, MIX ? 'spec.mix.json' : 'spec.card.json'), 'utf8'));
if (status.stages.find(x => x.id === 'direct').state !== 'done') stage('direct', 'done');
stage('build', 'done');
const usage = existsSync(join(CLIP, 'meta-usage.json')) ? JSON.parse(readFileSync(join(CLIP, 'meta-usage.json'), 'utf8')) : null;
status.plan = { segments: spec.segments.length, layouts: spec.director?.types ?? [], planner: spec.director?.plan, captions: spec.captions.length, photos: Object.keys(spec.images ?? {}).length };
status.meta.calls = usage?.calls?.map(c => ({ call: c.call, model: c.model, ok: c.ok !== false, cache: !!c.cache_hit, seconds: c.seconds ?? null, tokens: c.usage?.total_tokens ?? null, standin: !!c.standin })) ?? [];
event(`${spec.segments.length} beats in ${status.plan.layouts.length} layouts; ${spec.director?.plan ?? ''}`, 'decision');

// ---- 3 render + 4 mix -------------------------------------------------------------------------------------------------
stage('render', 'running');
const OUT = join(JOB, 'edit.mp4');
const frames = Math.round(spec.duration * (spec.fps ?? 30));
try {
  await step(process.execPath, [join(ROOT, MIX ? 'tools/render-mix.mjs' : 'tools/render-card.mjs'), CLIP, OUT, ...(job.noMusic ? ['--no-music'] : [])], { limit: 2400,
    onLine: l => { const m = l.match(/^frame (\d+)/); if (m) sub(+m[1] / frames); if (/^video:/.test(l)) { stage('render', 'done'); stage('mix', 'running'); event('Every frame drawn'); } },
  });
} catch (e) { fail(new JobError(status.stage === 'mix' ? 'MIX' : 'RENDER', 'Rendering stopped partway. Press Try again; your upload is kept.', (e.tail?.slice(-400) || '') + ' (' + e.message + ')')); }
if (!existsSync(OUT) || statSync(OUT).size < 10000) fail(new JobError('RENDER', 'Rendering finished without a video. Press Try again.'));
if (status.stages.find(x => x.id === 'render').state !== 'done') stage('render', 'done');
stage('mix', 'done'); event('Sound mixed to -14 LUFS');

// ---- 5 share: the before/after, raw small on the left, the edit large on the right, in step ----------------------------
stage('share', 'running');
const BA = join(JOB, 'before-after.mp4');
try {
  if (MIX) await step(process.env.PYTHON ?? 'python3', [join(ROOT, 'tools/ba-wrap.py'), OUT, join(CLIP, 'cut.mp4'), BA, '--accent', spec.theme?.accent ?? '#e5333d']);   // portrait Before / After with the visible "Edited by Meta" line
  else await step('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-i', join(CLIP, 'cut.mp4'), '-i', OUT, '-filter_complex',
    "color=c=0xf4f3f1:s=1920x1080:r=30[bg];[0:v]scale=-2:640,setsar=1[raw];[1:v]scale=-2:1000,setsar=1[ed];[bg][raw]overlay=x=470:y=(H-h)/2+40:shortest=1[a];[a][ed]overlay=x=1920-w-560:y=(H-h)/2[v]",
    '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', BA]);
  stage('share', 'done');
} catch (e) { log('before/after failed (the edit is fine): ' + e.message); status.stages.find(x => x.id === 'share').state = 'skipped'; }

Object.assign(status, { state: 'done', pct: 100, finished: new Date().toISOString(), seconds: +((Date.now() - T0) / 1000).toFixed(1),
  outputs: { edit: 'edit.mp4', beforeAfter: existsSync(BA) ? 'before-after.mp4' : null, raw: job.input }, duration: +spec.duration.toFixed(1) });
event(`Done in ${status.seconds} s`, 'done');
save();
