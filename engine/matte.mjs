// Encode baked matte frames (data/clips/<id>/matte/m00001.png..., alpha = person) into matte.webm (VP9 with alpha,
// 15 fps) that the player reads instead of segmenting live. SAM 3.1 masks (step H4) land in the same file.
// usage: node engine/matte.mjs <clip dir>
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2], frames = join(dir, 'matte');
if (!dir || !existsSync(frames)) { console.error('usage: node engine/matte.mjs <clip dir> (bake first: open the player with &bake=1)'); process.exit(1); }
const n = readdirSync(frames).filter(f => f.endsWith('.png')).length;
const t0 = performance.now();
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '15', '-i', join(frames, 'm%05d.png'), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0', join(dir, 'matte.webm')]);
if (process.argv.includes('--clean')) rmSync(frames, { recursive: true });
console.log(`matte.webm: ${n} frames in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
