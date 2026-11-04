// Word timings for any audio/video file (Groq Whisper, GROQ_API_KEY in .env.local). Used to pick a stretch of a long
// source before prep. usage: node tools/hear.mjs <media> <out.json>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEnv } from '../engine/env.mjs';

loadEnv();
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('usage: node tools/hear.mjs <media> <out.json>'); process.exit(1); }
const key = process.env.GROQ_API_KEY;
if (!key) { console.error('No GROQ_API_KEY in .env.local'); process.exit(2); }
const mp3 = join(mkdtempSync(join(tmpdir(), 'hear-')), 'a.mp3');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', mp3]);
const fd = new FormData();
fd.append('file', new Blob([readFileSync(mp3)], { type: 'audio/mpeg' }), 'a.mp3');
fd.append('model', 'whisper-large-v3-turbo');
fd.append('response_format', 'verbose_json');
fd.append('timestamp_granularities[]', 'word');
fd.append('timestamp_granularities[]', 'segment');
fd.append('language', 'en');
const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
if (!r.ok) { console.error('speech-to-text answered', r.status, (await r.text()).slice(0, 300)); process.exit(3); }
const j = await r.json();
writeFileSync(out, JSON.stringify({ text: j.text, segments: (j.segments ?? []).map(s => ({ t: +s.start.toFixed(2), end: +s.end.toFixed(2), text: s.text.trim() })), words: (j.words ?? []).map(w => ({ word: w.word.trim(), t: +w.start.toFixed(3), end: +w.end.toFixed(3) })) }, null, 1));
for (const s of j.segments ?? []) console.log(`[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text.trim()}`);
