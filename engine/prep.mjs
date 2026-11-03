// Step 0-2 of the pipeline (CONTEXT.md section 6): ingest, hear, clean.
// usage: node engine/prep.mjs <before.mp4> <clip dir>
// Writes into <clip dir>: src.mp4 (1080x1920 H.264, the raw "before"), voice.wav, words.raw.json (source clock),
// cut.mp4 (pauses removed, the edit's picture), cut.json (piece map), words.json (cut clock), prep.json (timings).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from './env.mjs';

loadEnv();
const [src, dir] = process.argv.slice(2);
if (!src || !dir) { console.error('usage: node engine/prep.mjs <before.mp4> <clip dir>'); process.exit(1); }
mkdirSync(dir, { recursive: true });
const t0 = performance.now(), log = {}, lap = k => { log[k] = +((performance.now() - t0) / 1000).toFixed(2); console.log(`${k}: ${log[k]} s`); };
const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });

// 0 ingest: cover-crop to 9:16 and scale to 1080x1920 (landscape is centre-cropped for now; SAM reframing is H4)
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', src], { encoding: 'utf8' }));
const { width: W, height: H } = probe.streams[0];
const crop = W / H > 9 / 16 ? `crop=ih*9/16:ih` : `crop=iw:iw*16/9`;
if (!existsSync(join(dir, 'src.mp4'))) ff(['-i', src, '-vf', `${crop},scale=1080:1920:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-g', '15', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', join(dir, 'src.mp4')]);
ff(['-i', join(dir, 'src.mp4'), '-vn', '-ac', '1', '-ar', '16000', join(dir, 'voice.wav')]);
lap('ingest');

// 1 hear: word timings. Whisper on Groq (word timestamps). Muse Voice Transcribe has no word-level times, so it is used
// for speakers only (later); a local transformers.js Whisper is the no-key fallback (to port from Moovi local-stt).
let words;
const rawPath = join(dir, 'words.raw.json');
if (existsSync(rawPath)) words = JSON.parse(readFileSync(rawPath, 'utf8'));
else {
  const key = process.env.GROQ_API_KEY;
  if (!key) { console.error('No GROQ_API_KEY in .env.local: add one (word timings), or port the local Whisper.'); process.exit(2); }
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(join(dir, 'voice.wav'))], { type: 'audio/wav' }), 'voice.wav');
  fd.append('model', 'whisper-large-v3-turbo');
  fd.append('response_format', 'verbose_json');
  fd.append('timestamp_granularities[]', 'word');
  fd.append('timestamp_granularities[]', 'segment');
  fd.append('language', 'en');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
  if (!r.ok) { console.error('speech-to-text answered', r.status, (await r.text()).slice(0, 300)); process.exit(3); }
  const j = await r.json();
  // the segment text carries punctuation; give each word its trailing mark so sentences can be read
  const segs = j.segments ?? [];
  words = (j.words ?? []).map(w => ({ word: w.word.trim(), t: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
  punctuate(words, segs);
  writeFileSync(rawPath, JSON.stringify(words, null, 1));
}
lap('hear');

// 2 clean: drop pauses. A gap between words over GAP is cut down to PAD on each side.
const GAP = 0.42, PAD = 0.1, D = +probe.format.duration;
const removed = [];
let prevEnd = 0;
for (const w of words) {
  if (w.t - prevEnd > GAP) removed.push([prevEnd === 0 ? 0 : prevEnd + PAD, w.t - PAD]);
  prevEnd = Math.max(prevEnd, w.end);
}
if (D - prevEnd > PAD + 0.3) removed.push([prevEnd + PAD + 0.25, D]);
const keep = []; let cur = 0;
for (const [a, b] of removed) { if (a > cur + 0.02) keep.push([cur, a]); cur = Math.max(cur, b); }
if (D > cur + 0.02) keep.push([cur, D]);
let o = 0; const map = keep.map(([a, b]) => { const m = [+a.toFixed(3), +b.toFixed(3), +o.toFixed(3)]; o += b - a; return m; });
const v = keep.map(([a, b], i) => `[0:v]trim=${a.toFixed(3)}:${b.toFixed(3)},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, b - a - 0.012).toFixed(3)}:d=0.012[a${i}]`).join(';');
const cat = keep.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${keep.length}:v=1:a=1[v][a]`;
ff(['-i', join(dir, 'src.mp4'), '-filter_complex', `${v};${cat}`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', '15', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', join(dir, 'cut.mp4')]);
const toCut = t => { for (const [a, b, s] of map) if (t >= a - 1e-3 && t <= b + 1e-3) return +(s + Math.min(t, b) - a).toFixed(3); const nx = map.find(([a]) => a > t); return nx ? nx[2] : o; };
const cutWords = words.map(w => ({ ...w, t: toCut(w.t), end: Math.max(toCut(w.t) + 0.05, toCut(w.end)) }));
// the dialect's base grade baked into a second file, so the player draws the after with no per-frame colour filter
const G = JSON.parse(readFileSync(join(import.meta.dirname, 'templates', (process.env.DIALECT ?? 'kinetic-brand') + '.json'), 'utf8')).grade;
ff(['-i', join(dir, 'cut.mp4'), '-vf', `eq=contrast=${G.contrast}:saturation=${G.saturate}:brightness=${(G.brightness - 1).toFixed(3)},colorbalance=rs=${G.warm}:bs=${-G.warm}:rm=${G.warm / 2}:bm=${-G.warm / 2}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', '15', '-c:a', 'copy', '-movflags', '+faststart', join(dir, 'graded.mp4')]);
writeFileSync(join(dir, 'cut.json'), JSON.stringify({ map, duration: +o.toFixed(3), source: D }, null, 1));
writeFileSync(join(dir, 'words.json'), JSON.stringify(cutWords, null, 1));
lap('clean');
writeFileSync(join(dir, 'prep.json'), JSON.stringify({ seconds: log, source: D, cut: +o.toFixed(2), pieces: keep.length, words: words.length }, null, 1));
console.log(`cut: ${D.toFixed(1)} s → ${o.toFixed(1)} s in ${keep.length} pieces, ${words.length} words`);

/** Give each word the punctuation that follows it in its segment's text (sentence ends, commas, question marks). */
function punctuate(ws, segs) {
  for (const s of segs) {
    const toks = s.text.trim().split(/\s+/);
    const inSeg = ws.filter(w => w.t >= s.start - 0.05 && w.t < s.end + 0.05 && !w.p);
    let k = 0;
    for (const tok of toks) {
      const bare = tok.replace(/[^\p{L}\p{N}%$']/gu, '').toLowerCase();
      for (let j = k; j < Math.min(inSeg.length, k + 3); j++) {
        if (inSeg[j].word.replace(/[^\p{L}\p{N}%$']/gu, '').toLowerCase() === bare) {
          const m = tok.match(/[.?!,;:]+$/); if (m) inSeg[j].p = m[0]; k = j + 1; break;
        }
      }
    }
  }
  for (const w of ws) { w.word = w.word.replace(/[.?!,;:]+$/, ''); if (!w.p) delete w.p; }
}
