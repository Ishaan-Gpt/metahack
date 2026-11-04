// Cut the Commons source into the ba3 edit's raw: aroll.mp4 (1080x1920 at 29.97 fps, the host cropped to the reference
// raw's framing and graded toward its dark warm room), before.mp4 (same crop, ungraded) and voice.wav. Joins sit on the
// reference's own cuts; each join gets 12 ms audio fades. usage: node recreate/ba3/assemble.mjs [out=data/clips/ba3c]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = join(import.meta.dirname, '..', '..'), out = join(ROOT, process.argv[2] ?? 'data/clips/ba3c');
const P = JSON.parse(readFileSync(join(import.meta.dirname, 'pieces.json'), 'utf8')), C = P.crop;
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const parts = []; let t = 0;
for (const [i, p] of P.pieces.entries()) {
  const d = p.b - p.a;
  for (const [tag, vf] of [['g', `crop=${C.w}:${C.h}:${C.x}:${C.y},scale=1080:1920:flags=lanczos,${P.grade},format=yuv420p`], ['r', `crop=${C.w}:${C.h}:${C.x}:${C.y},scale=1080:1920:flags=lanczos,format=yuv420p`]])
    ff(['-ss', String(p.a), '-i', join(ROOT, P.source), '-t', d.toFixed(3), '-vf', `fps=30000/1001,${vf}`,
      '-af', `asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(d - 0.012).toFixed(3)}:d=0.012`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '15', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1', join(out, `p${tag}${i}.mkv`)]);
  parts.push({ ...p, i, at: +t.toFixed(3), dur: +d.toFixed(3) }); t += d;
}
for (const [tag, name] of [['g', 'aroll.mp4'], ['r', 'before.mp4']]) {
  writeFileSync(join(out, `list${tag}.txt`), P.pieces.map((_, i) => `file 'p${tag}${i}.mkv'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', join(out, `list${tag}.txt`), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-g', '10',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', join(out, name)]);
}
ff(['-i', join(out, 'aroll.mp4'), '-vn', '-ac', '1', '-ar', '16000', join(out, 'voice.wav')]);
writeFileSync(join(out, 'pieces.json'), JSON.stringify({ duration: +t.toFixed(3), pieces: parts }, null, 1));
console.log(`aroll: ${parts.length} pieces, ${t.toFixed(3)} s`);
