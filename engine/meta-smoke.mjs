// Step H2: prove each Meta model works and measure it before building on it. Writes data/meta-smoke/<model>.json
// (raw answers, seconds) so the SAM output format can be read before the decoder is written.
// usage: node engine/meta-smoke.mjs <clip dir>   (needs MODEL_API_KEY in .env.local)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, ROOT } from './env.mjs';

loadEnv();
const KEY = process.env.MODEL_API_KEY, API = 'https://api.meta.ai/v1', dir = process.argv[2] ?? 'data/clips/t1';
if (!KEY) { console.error('Add MODEL_API_KEY to .env.local (claim the hackathon credits at dev.meta.ai first).'); process.exit(1); }
const OUT = join(ROOT, 'data/meta-smoke'); mkdirSync(OUT, { recursive: true });
const auth = { Authorization: `Bearer ${KEY}` };
const save = (k, v) => writeFileSync(join(OUT, k + '.json'), JSON.stringify(v, null, 1));
const time = async (k, fn) => { const t0 = performance.now(); try { const r = await fn(); const s = +((performance.now() - t0) / 1000).toFixed(2); console.log(`${k}: ok in ${s} s`); return { ok: true, s, r }; } catch (e) { console.log(`${k}: FAILED ${e.message}`); return { ok: false, error: e.message }; } };

// 1. Muse Spark: structured output (the director's call shape)
save('spark', await time('muse-spark-1.3 json_schema', async () => {
  const r = await fetch(`${API}/chat/completions`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({
    model: 'muse-spark-1.3', messages: [{ role: 'user', content: 'For the phrase "94% of purchases happen across many touch points" give the index of the word the frame is about.' }],
    response_format: { type: 'json_schema', json_schema: { name: 'hero', schema: { type: 'object', properties: { hero: { type: 'integer' }, why: { type: 'string' } }, required: ['hero'] } } } }) });
  const j = await r.json(); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`); return j;
}));

// 2. SAM 3.1 on the first 5 s of the clip: upload, then a streamed concept prompt "person"
const five = join(OUT, 'five.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, dir, 'cut.mp4'), '-t', '5', '-vf', 'scale=540:960', '-c:v', 'libx264', '-preset', 'veryfast', '-an', five]);
save('sam', await time('sam-3.1 video (5 s, 150 frames)', async () => {
  const fd = new FormData(); fd.append('purpose', 'user_data'); fd.append('file', new Blob([readFileSync(five)], { type: 'video/mp4' }), 'five.mp4');
  const up = await fetch(`${API}/files`, { method: 'POST', headers: auth, body: fd }); const f = await up.json();
  if (!up.ok) throw new Error(`upload ${up.status} ${JSON.stringify(f).slice(0, 300)}`);
  const r = await fetch(`${API}/responses`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({
    model: 'sam-3.1', stream: false, metadata: { mask_encoding: 'one_bit' },
    input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'person' }, { type: 'input_video', file_id: f.id }] }] }) });
  const text = await r.text(); if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 300)}`);
  return { file: f, bytes: text.length, head: text.slice(0, 4000) };   // the format is read from this before writing the decoder
}));

// 3. Muse Voice Transcribe: speakers and turn times (no word times, by Meta's docs)
save('voice', await time('muse-voice-transcribe-1.0', async () => {
  const wav = join(OUT, 'five.wav'); execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, dir, 'cut.mp4'), '-t', '20', '-ac', '1', '-ar', '16000', wav]);
  const fd = new FormData(); fd.append('request', JSON.stringify({ model: 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', mode: 'DIARIZATION' })); fd.append('audio', new Blob([readFileSync(wav)], { type: 'audio/wav' }), 'five.wav');
  const r = await fetch(`${API}/asr/transcribe`, { method: 'POST', headers: { ...auth, Accept: 'application/json' }, body: fd });
  const text = await r.text(); if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 300)}`); return JSON.parse(text);
}));
console.log(`answers in ${OUT}`);
