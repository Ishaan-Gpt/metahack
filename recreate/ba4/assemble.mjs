// Cut the Commons interview into the edit's raw on the reference's clock: master.mp4 (1080x1920 9:16 "raw", each piece
// framed like the reference raw's medium or close-up camera), voice.m4a (voice pieces placed at their 'at', 12 ms fades),
// before.mp4 (the raw with its voice: the plain "before"). usage: node recreate/ba4/assemble.mjs [out=data/clips/ba4c]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = join(import.meta.dirname, '..', '..'), out = join(ROOT, process.argv[2] ?? 'data/clips/ba4c');
const P = JSON.parse(readFileSync(join(import.meta.dirname, 'pieces.json'), 'utf8'));
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const SRC = join(ROOT, P.source), K = { medium: 1080 / 607.5, close: 1080 / 607.5 * 1.107 }, FACE = { medium: [480, 533], close: [660, 628] };
const FPS = '24000/1001', f2 = x => x.toFixed(3);
const vids = [];
for (const [i, p] of P.pieces.entries()) {
  const k = K[p.shot], cw = 1080 / k, ch = 1920 / k;
  let x0 = p.fx - FACE[p.shot][0] / k, y0 = p.shot === 'medium' ? 0 : p.fy - FACE[p.shot][1] / k;
  x0 = Math.max(0, Math.min(1920 - cw, x0)); y0 = Math.max(0, Math.min(1080 - ch, y0));
  const ss = p.src + (p.va - p.at), d = p.vb - p.va, f = join(out, `v${i}.mp4`);
  ff(['-ss', f2(ss), '-i', SRC, '-t', f2(d), '-an', '-vf', `crop=${f2(cw)}:${f2(ch)}:${f2(x0)}:${f2(y0)},scale=1080:1920:flags=lanczos,fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', f]);
  vids.push(f); p.crop = [+cw.toFixed(1), +ch.toFixed(1), +x0.toFixed(1), +y0.toFixed(1)];
}
writeFileSync(join(out, 'list.txt'), vids.map(v => `file '${v.split(String.fromCharCode(92)).join('/')}'`).join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', join(out, 'list.txt'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, 'master.mp4')]);
// voice: each piece's words at its 'at' on the edit clock
const ins = [], fl = [];
for (const [i, p] of P.pieces.entries()) {
  const d = p.srcEnd - p.src; ins.push('-ss', f2(p.src), '-t', f2(d), '-i', SRC);
  fl.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=mono,asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${f2(d - 0.03)}:d=0.03,adelay=${Math.round(p.at * 1000)}[a${i}]`);
}
fl.push(`${P.pieces.map((_, i) => `[a${i}]`).join('')}amix=inputs=${P.pieces.length}:normalize=0,apad,atrim=0:${P.duration},loudnorm=I=-16:TP=-1.5:LRA=11[v]`);
ff([...ins, '-filter_complex', fl.join(';'), '-map', '[v]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', join(out, 'voice.m4a')]);
ff(['-i', join(out, 'master.mp4'), '-i', join(out, 'voice.m4a'), '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', join(out, 'before.mp4')]);
writeFileSync(join(out, 'pieces.json'), JSON.stringify(P, null, 1));
console.log('master', execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(out, 'master.mp4')]).toString().trim());
