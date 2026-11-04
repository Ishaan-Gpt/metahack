// Cut the Commons source into the edit's raw: master.mp4 (full 1920x1080 frame, the player crops every shot from it),
// before.mp4 (the plain 9:16 "before" centred on the face, ungraded), voice.m4a (-16 LUFS), frames/ for the matte.
// usage: node recreate/self1/assemble.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = join(import.meta.dirname, '..', '..'), out = join(ROOT, 'data/clips/self1');
const P = JSON.parse(readFileSync(join(import.meta.dirname, 'pieces.json'), 'utf8'));
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const parts = []; let t = 0;
for (const [i, p] of P.pieces.entries()) {
  const d = p.b - p.a, f = join(out, `piece${i}.mkv`);
  ff(['-ss', String(p.a), '-i', join(ROOT, P.source), '-t', d.toFixed(3), '-vf', 'format=yuv420p',
    '-af', `asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=${(d - 0.02).toFixed(3)}:d=0.02`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-r', '24000/1001', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1', f]);
  parts.push({ ...p, i, at: +t.toFixed(3), dur: +d.toFixed(3) }); t += d;
}
writeFileSync(join(out, 'list.txt'), P.pieces.map((_, i) => `file 'piece${i}.mkv'`).join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', join(out, 'list.txt'), '-c', 'copy', join(out, 'joined.mkv')]);
ff(['-i', join(out, 'joined.mkv'), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-g', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, 'master.mp4')]);
ff(['-i', join(out, 'joined.mkv'), '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', join(out, 'voice.m4a')]);
ff(['-i', join(out, 'master.mp4'), '-i', join(out, 'voice.m4a'), '-map', '0:v', '-map', '1:a', '-vf', 'crop=608:1080:702:0,scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '12', '-c:a', 'copy', '-movflags', '+faststart', join(out, 'before.mp4')]);
mkdirSync(join(out, 'frames'), { recursive: true });
ff(['-i', join(out, 'master.mp4'), join(out, 'frames', 'f%05d.png')]);
writeFileSync(join(out, 'pieces.json'), JSON.stringify({ duration: +t.toFixed(3), pieces: parts }, null, 1));
console.log(`master: ${parts.length} pieces, ${t.toFixed(2)} s`);
