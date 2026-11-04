// Card Studio MP4 export, no browser: ffmpeg decodes the edit's picture, @napi-rs/canvas draws each frame with the same
// module the browser preview uses (player/card-studio.js), ffmpeg encodes; then the audio gets the theme's SFX, a quiet
// music bed and loudness normalisation (about -14 LUFS). All code, no AI.
// usage: node tools/render-card.mjs <clip dir> [out.mp4] [--fps 30] [--crf 23] [--no-music]
//        node tools/render-card.mjs <clip dir> --frames 1,2.5,8 --out sheet_dir     (single frames as PNG, for checks)
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createCanvas, loadImage, GlobalFonts, ImageData } from '@napi-rs/canvas';
import { buildLayers, drawFrame } from '../player/card-studio.js';
import { loadStyle } from '../engine/styles.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const dir = a[0];
if (!dir || !existsSync(join(dir, 'spec.card.json'))) { console.error('usage: node tools/render-card.mjs <clip dir> [out.mp4]  (run engine/card-studio.mjs first)'); process.exit(1); }
const spec = JSON.parse(readFileSync(join(dir, 'spec.card.json'), 'utf8'));
const isObj_ = v => v && typeof v === 'object' && !Array.isArray(v), merge_ = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b ?? {})) o[k] = isObj_(v) && isObj_(a?.[k]) ? merge_(a[k], v) : v; return o; };
// the style the director used (engine/styles.mjs), plus any changes asked for after the first render (engine/edits.mjs)
const T = merge_(loadStyle(spec.style), spec.overrides);
for (const f of Object.values(T.fonts)) GlobalFonts.registerFromPath(join(ROOT, 'assets/renderer/fonts', f.file), f.family);
// a caption restyled on its own (a targeted edit) carries its font file
for (const c of spec.captions ?? []) if (c.font && c.fontFile && existsSync(join(ROOT, 'assets/renderer/fonts', c.fontFile))) GlobalFonts.registerFromPath(join(ROOT, 'assets/renderer/fonts', c.fontFile), c.font);
const W = T.canvas.w, H = T.canvas.h, FPS = +opt('--fps', spec.fps ?? 30);
const video = join(dir, spec.video);
const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', video], { encoding: 'utf8' })).streams[0];
const vw = pr.width, vh = pr.height;
const images = {};
for (const p of new Set([...Object.values(spec.images ?? {}), ...(spec.storyboard ?? [])])) { try { images[p] = await loadImage(join(dir, p)); } catch (e) { console.warn('image failed', p, e.message); } }
const src = createCanvas(vw, vh), sctx = src.getContext('2d');
const res = { video: src, vw, vh, images };
res.layers = buildLayers(spec, T, res, (w, h) => createCanvas(w, h));
// text-behind: the person matte frames (RGBA PNG, alpha = person) cut by engine/person_matte.py; loaded one frame ahead of the draw
const matteSet = new Set(), matteCache = new Map();
if (spec.matte) { try { for (const n of JSON.parse(readFileSync(join(dir, spec.matte.dir, 'index.json'), 'utf8')).frames) matteSet.add(n); } catch (e) { console.warn('matte index unreadable, text-behind falls back to face:', e.message); } }
const mIdx = t => Math.round(t * (spec.matte?.fps ?? FPS));
async function prepMatte(t) {
  const n = mIdx(t); if (!matteSet.has(n) || matteCache.has(n)) return;
  try { matteCache.set(n, await loadImage(join(dir, spec.matte.dir, `m${String(n).padStart(5, '0')}.png`))); } catch (e) { matteCache.set(n, null); }
  if (matteCache.size > 8) matteCache.delete(matteCache.keys().next().value);
}
res.matteAt = t => matteCache.get(mIdx(t)) ?? null;
const out = createCanvas(W, H), ctx = out.getContext('2d');
const setFrame = buf => sctx.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, vw * vh * 4), vw, vh), 0, 0);

if (a.includes('--frames')) {
  const times = opt('--frames').split(',').map(Number), od = resolve(opt('--out', join(dir, 'frames')));
  mkdirSync(od, { recursive: true });
  for (const [i, t] of times.entries()) {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-ss', String(t), '-i', video, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
    if (raw.length >= vw * vh * 4) setFrame(raw);
    await prepMatte(t);
    drawFrame(ctx, t, spec, T, res);
    writeFileSync(join(od, `f${String(i).padStart(3, '0')}.png`), out.toBuffer('image/png'));
  }
  console.log(`${times.length} frames -> ${od}`); process.exit(0);
}

const outFile = resolve(a[1] && !a[1].startsWith('--') ? a[1] : join(dir, 'card-studio.mp4'));
const tmpV = outFile.replace(/\.mp4$/, '.video.mp4');
const t0 = Date.now();
const dec = spawn('ffmpeg', ['-v', 'error', '-nostdin', '-i', video, '-vf', `fps=${FPS}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', opt('--preset', 'veryfast'), '-crf', opt('--crf', '21'), '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-movflags', '+faststart', tmpV], { stdio: ['pipe', 'inherit', 'inherit'] });
const FB = vw * vh * 4; let acc = Buffer.alloc(0), n = 0, drawMs = 0;
const write = b => new Promise(r => enc.stdin.write(b) ? r() : enc.stdin.once('drain', r));
for await (const chunk of dec.stdout) {
  acc = acc.length ? Buffer.concat([acc, chunk]) : chunk;
  while (acc.length >= FB) {
    const frame = acc.subarray(0, FB);
    await prepMatte(n / FPS);
    const d0 = performance.now(); setFrame(Buffer.from(frame)); drawFrame(ctx, n / FPS, spec, T, res);
    const px = ctx.getImageData(0, 0, W, H).data; drawMs += performance.now() - d0;
    await write(Buffer.from(px.buffer, px.byteOffset, px.byteLength));
    acc = acc.subarray(FB); n++;
    if (n % 150 === 0) console.log(`frame ${n} (${(n / FPS).toFixed(1)} s), ${(drawMs / n).toFixed(1)} ms/frame draw`);
  }
}
enc.stdin.end(); await new Promise(r => enc.on('close', r));
console.log(`video: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s (${(drawMs / n).toFixed(1)} ms/frame draw)`);

// audio: voice + SFX at the transitions + quiet music bed, then loudnorm to the theme's target
const ins = ['-i', tmpV, '-i', video], parts = ['[1:a]aresample=48000,aformat=channel_layouts=stereo[voice]'], mix = ['[voice]'];
let k = 2;
const g = T.sfx.gainDb; if (g < -60) spec.sfx = [];   // sound effects off
for (const s of spec.sfx ?? []) {
  const f = join(ROOT, 'assets', T.sfx[s.k] ?? ''); if (!T.sfx[s.k] || !existsSync(f)) continue;
  ins.push('-i', f); const ms = Math.max(0, Math.round(s.t * 1000));
  parts.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${g}dB,adelay=${ms}|${ms}[s${k}]`); mix.push(`[s${k}]`); k++;
}
if (!a.includes('--no-music') && T.music && existsSync(join(ROOT, 'assets', T.music.file))) {
  ins.push('-stream_loop', '-1', '-i', join(ROOT, 'assets', T.music.file));
  parts.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${T.music.gainDb}dB,atrim=0:${spec.duration.toFixed(3)},afade=t=out:st=${Math.max(0, spec.duration - 1.2).toFixed(3)}:d=1.2[m]`); mix.push('[m]'); k++;
}
// two-pass loudness: mix to a wav, measure, then normalise linearly to the theme's target (single pass undershoots short clips)
const mixWav = outFile.replace(/\.mp4$/, '.mix.wav');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-nostdin', ...ins, '-filter_complex', `${parts.join(';')};${mix.join('')}amix=inputs=${mix.length}:duration=first:normalize=0,aformat=sample_fmts=s16:channel_layouts=stereo[aout]`, '-map', '[aout]', '-ar', '48000', mixWav], { stdio: 'inherit' });
const meas = ''; void execFileSync; //('ffmpeg', ['-hide_banner', '-nostdin', '-i', mixWav, '-af', `loudnorm=I=${T.loudness.lufs}:TP=${T.loudness.tp}:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
let m = null; try { const pr2 = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-i', mixWav, '-af', `loudnorm=I=${T.loudness.lufs}:TP=${T.loudness.tp}:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }); m = JSON.parse(pr2.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)?.[0] ?? 'null'); } catch (e) { m = null; }
void meas;
const ln = m ? `loudnorm=I=${T.loudness.lufs}:TP=${T.loudness.tp}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : `loudnorm=I=${T.loudness.lufs}:TP=${T.loudness.tp}:LRA=11`;
console.log('loudness pass:', ln.slice(0, 160));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-i', tmpV, '-i', mixWav, '-af', ln + ',aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', outFile], { stdio: 'inherit' });
rmSync(mixWav, { force: true });
rmSync(tmpV, { force: true });
console.log(`-> ${outFile} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
