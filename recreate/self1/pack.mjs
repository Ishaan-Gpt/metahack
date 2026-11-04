// Pack footage and matte side by side so the player can never show them out of sync: 2880x1080 =
// footage 1920x1080 | matte at half res (960x540, top) + the same matte blurred (bottom, for the rim line).
// rembg also keys the set's moon picture and the globe: those regions are masked out first. The matte is smoothed over time 1-2-1 (hair-edge flicker) before packing.
// usage: node recreate/self1/pack.mjs
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const dir = join(import.meta.dirname, '..', '..', 'data/clips/self1');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24000/1001', '-i', join(dir, 'frames', 'f%05d.png'), '-framerate', '24000/1001', '-i', join(dir, 'matte', 'm%05d.png'),
  '-f', 'lavfi', '-i', 'color=white:s=1920x1080:r=24000/1001,format=gray,drawbox=x=0:y=0:w=500:h=1080:color=black:t=fill,drawbox=x=1700:y=740:w=220:h=340:color=black:t=fill',
  '-filter_complex', '[1:v]format=gray[mg];[mg][2:v]blend=all_mode=multiply:shortest=1,tmix=frames=3:weights=1 2 1,scale=960:540:flags=area,split[m0][m1];[m1]gblur=sigma=2.4[ms];[m0]format=yuv420p[m];[ms]format=yuv420p[mb];[0:v]pad=2880:1080:0:0:black[b];[b][m]overlay=1920:0:shortest=1[b2];[b2][mb]overlay=1920:540:shortest=1,format=yuv420p[v]',
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '12', '-movflags', '+faststart', join(dir, 'pack.mp4')], { stdio: 'inherit' });
console.log('pack.mp4 written');
