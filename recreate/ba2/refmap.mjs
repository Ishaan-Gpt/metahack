// The reference after panel re-timed onto our clock for the side-by-side (compare.html): each reference shot plays from its
// start, then holds its own last frame (never the next shot's first frame) until our shot ends; audio padded with silence.
// usage: node recreate/ba2/refmap.mjs  → data/refs/edit-ba2/ref_mapped.mp4
import { execFileSync } from 'node:child_process';
import { SHOTS } from './map.mjs';
let f = '', a = '', L = '';
for (let i = 0; i < SHOTS.length - 1; i++) {
  const [o0, r0] = SHOTS[i], [o1, r1] = SHOTS[i + 1], re = r1 - 0.05, pad = Math.max(0, (o1 - o0) - (re - r0));
  f += `[0:v]trim=${r0}:${re},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}[v${i}];`;
  a += `[0:a]atrim=${r0}:${re},asetpts=PTS-STARTPTS,apad=pad_dur=${pad.toFixed(3)}[a${i}];`; L += `[v${i}][a${i}]`;
}
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'data/refs/edit-ba2/after1080.mp4', '-filter_complex', `${f}${a}${L}concat=n=${SHOTS.length - 1}:v=1:a=1[v][a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-g', '15', '-r', '30000/1001', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'data/refs/edit-ba2/ref_mapped.mp4'], { stdio: 'inherit' });
console.log('ref_mapped.mp4 written');
