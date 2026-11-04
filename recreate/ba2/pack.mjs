// Pack footage and matte side by side (1440x1080: footage 960x1080 | matte 480x540 over its blurred copy) so the player can
// never show them out of sync (adapted from recreate/ba1/pack.mjs). The matte is smoothed over 3 frames (1-2-1): the
// per-frame selfie matte flickered 21/255 a frame on the hair edge (picture: 5.8).. usage: node recreate/ba2/pack.mjs [dir=data/clips/ba2c]
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const dir = join(import.meta.dirname, '..', '..', process.argv[2] ?? 'data/clips/ba2c');
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
ff(['-framerate', '30000/1001', '-i', join(dir, 'frames', 'f%05d.png'), '-framerate', '30000/1001', '-i', join(dir, 'matte', 'm%05d.png'),
  '-filter_complex', '[1:v]format=gray,tmix=frames=3:weights=1 2 1,scale=480:540:flags=area,split[m0][m1];[m1]gblur=sigma=3[ms];[m0]format=yuv420p[m];[ms]format=yuv420p[mb];[0:v]pad=1440:1080:0:0:black[b];[b][m]overlay=960:0:shortest=1[b2];[b2][mb]overlay=960:540:shortest=1,format=yuv420p[v]',
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-g', '12', '-movflags', '+faststart', join(dir, 'pack.mp4')]);
// the plain "before": centre 9:16 of the window (face at x 482), ungraded
ff(['-i', join(dir, 'master.mp4'), '-vf', 'crop=608:1080:178:0,scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '12', '-c:a', 'copy', '-movflags', '+faststart', join(dir, 'before.mp4')]);
console.log('pack.mp4 + before.mp4 written');
