// Cut the commons source into the edit's raw: master.mp4 (a 1800x2160 window of the 4K source, the player crops every
// shot from it), before.mp4 (the plain 9:16 "before", 1080x1920, ungraded) and voice.wav. Joins get 12 ms audio fades.
// usage: node recreate/ba1/assemble.mjs [out dir=data/clips/ba1c]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = join(import.meta.dirname, '..', '..'), out = join(ROOT, process.argv[2] ?? 'data/clips/ba1c');
const P = JSON.parse(readFileSync(join(import.meta.dirname, 'pieces.json'), 'utf8')), C = P.crop;
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const parts = [];
let t = 0;
for (const [i, p] of P.pieces.entries()) {
  const d = p.b - p.a, f = join(out, `piece${i}.mp4`);
  ff(['-ss', String(p.a), '-i', join(ROOT, P.source), '-t', d.toFixed(3),
    '-vf', `crop=${C.w}:${C.h}:${C.x}:${C.y},format=yuv420p`, '-af', `asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(d - 0.012).toFixed(3)}:d=0.012`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', '24000/1001', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1', f]);
  parts.push({ ...p, i, at: +t.toFixed(3), dur: +d.toFixed(3) }); t += d;
}
writeFileSync(join(out, 'list.txt'), P.pieces.map((_, i) => `file 'piece${i}.mp4'`).join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', join(out, 'list.txt'), '-c', 'copy', join(out, 'joined.mkv')]);
// master: short GOP so the player seeks fast; voice loudness to -16 LUFS (the edit's sound bed sits around it)
ff(['-i', join(out, 'joined.mkv'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-g', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', join(out, 'master.mp4')]);
// before: the raw as a plain vertical clip, subject centred (x 1930 in the source = 900 in the window)
ff(['-i', join(out, 'master.mp4'), '-vf', `crop=1216:2160:${900 - 608}:0,scale=1080:1920:flags=lanczos`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '12', '-movflags', '+faststart', '-c:a', 'copy', join(out, 'before.mp4')]);
ff(['-i', join(out, 'master.mp4'), '-vn', '-ac', '1', '-ar', '16000', join(out, 'voice.wav')]);
writeFileSync(join(out, 'pieces.json'), JSON.stringify({ duration: +t.toFixed(3), pieces: parts }, null, 1));
console.log(`master: ${parts.length} pieces, ${t.toFixed(2)} s`);
