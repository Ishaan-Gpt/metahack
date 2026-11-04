// Pack footage frames and matte frames side by side (2025x1620, the 1800x2160 window at 0.75: footage | matte | blurred matte;
// every proportion is the 2700x2160 layout's, so the player's UVs do not change) so the player can
// never show them out of sync; also the plain "before" (centre 9:16 of the footage, ungraded). Repairs first: source
// frames that are not the speaker (the interview's question cards at piece joins) hold their neighbour, in both.
// usage: node recreate/ba1/pack.mjs [dir=data/clips/ba1c]
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = join(import.meta.dirname, '..', '..', process.argv[2] ?? 'data/clips/ba1c');
const REPAIR = { 128: 127, 129: 127, 130: 127, 131: 132 };   // frame index → the frame it holds (cards at 5.30-5.42 s)
const n5 = i => String(i).padStart(5, '0');
for (const [to, from] of Object.entries(REPAIR)) {
  copyFileSync(join(dir, 'frames', `f${n5(from)}.png`), join(dir, 'frames', `f${n5(to)}.png`));
  copyFileSync(join(dir, 'matte', `m${n5(from)}.png`), join(dir, 'matte', `m${n5(to)}.png`));
}
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
ff(['-framerate', '24000/1001', '-i', join(dir, 'frames', 'f%05d.png'), '-framerate', '24000/1001', '-i', join(dir, 'matte', 'm%05d.png'),
  '-filter_complex', '[1:v]format=gray,scale=675:810:flags=area,split[m0][m1];[m1]gblur=sigma=2.6[ms];[m0]format=yuv420p[m];[ms]format=yuv420p[mb];[0:v]scale=1350:1620:flags=lanczos,pad=2025:1620:0:0:black[b];[b][m]overlay=1350:0:shortest=1[b2];[b2][mb]overlay=1350:810:shortest=1,format=yuv420p[v]',
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-g', '12', '-movflags', '+faststart', join(dir, 'pack.mp4')]);
ff(['-framerate', '24000/1001', '-i', join(dir, 'frames', 'f%05d.png'), '-i', join(dir, 'voice.m4a'), '-map', '0:v', '-map', '1:a',
  '-vf', 'crop=1216:2160:292:0,scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '12', '-c:a', 'copy', '-movflags', '+faststart', join(dir, 'before.mp4')]);
console.log('pack.mp4 + before.mp4 written');
