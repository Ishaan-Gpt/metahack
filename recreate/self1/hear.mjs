// Word timings for a whole source file (Groq Whisper, word granularity). usage: node recreate/self1/hear.mjs <audio> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from '../../engine/env.mjs';
loadEnv();
const [src, out] = process.argv.slice(2);
const fd = new FormData();
fd.append('file', new Blob([readFileSync(src)], { type: 'audio/mpeg' }), 'a.mp3');
fd.append('model', 'whisper-large-v3-turbo'); fd.append('response_format', 'verbose_json');
fd.append('timestamp_granularities[]', 'word'); fd.append('timestamp_granularities[]', 'segment'); fd.append('language', 'en');
const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: fd });
if (!r.ok) { console.error(r.status, (await r.text()).slice(0, 300)); process.exit(1); }
const j = await r.json();
writeFileSync(out, JSON.stringify({ text: j.text, segments: (j.segments ?? []).map(s => ({ a: s.start, b: s.end, text: s.text })), words: (j.words ?? []).map(w => ({ w: w.word.trim(), a: +w.start.toFixed(3), b: +w.end.toFixed(3) })) }, null, 1));
console.log('words', j.words?.length);
