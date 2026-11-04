// Word timings on the master's clock: each piece is transcribed on its own (whole-file Whisper drops words at joins),
// then offset. usage: node recreate/ba1/words.mjs [dir=data/clips/ba1c]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = join(import.meta.dirname, '..', '..'), dir = join(ROOT, process.argv[2] ?? 'data/clips/ba1c');
const { pieces } = JSON.parse(readFileSync(join(dir, 'pieces.json'), 'utf8'));
const words = [];
for (const p of pieces) {
  const f = join(dir, `piece${p.i}.words.json`);
  // 1 s of silence each side: Whisper drops a piece's last words when the audio stops abruptly
  const wav = join(dir, `piece${p.i}.pad.wav`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(dir, `piece${p.i}.mp4`), '-vn', '-ac', '1', '-ar', '16000', '-af', 'adelay=1000,apad=pad_dur=1', wav]);
  execFileSync('node', [join(ROOT, 'tools/hear.mjs'), wav, f], { stdio: 'ignore' });
  for (const w of JSON.parse(readFileSync(f, 'utf8')).words) words.push({ word: w.word, t: +(Math.max(0, w.t - 1) + p.at).toFixed(3), end: +(Math.min(w.end - 1, p.dur) + p.at).toFixed(3), piece: p.i });
}
writeFileSync(join(dir, 'words.json'), JSON.stringify(words, null, 1));
console.log(words.map(w => `${w.word}[${w.t.toFixed(2)}-${w.end.toFixed(2)}]`).join(' '));
