// Cuts the demo video from real material only: a finished before/after, the recorded studio run (the wait is sped up
// and labelled with the real clock), the five styles from one take, the kill-switch page, a close card. On-screen text,
// no narration (the voice is Ishaan's call; drop a voice.wav in data/demo/ and it is mixed under everything).
// usage: node tools/cut-demo.mjs [--rec data/demo/rec2] [--ba data/jobs/<id>/before-after.mp4] [--out data/demo/demo.mp4]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const REC = opt('--rec', 'data/demo/rec2'), OUT = opt('--out', 'data/demo/demo.mp4');
const marks = JSON.parse(readFileSync(join(REC, 'marks.json'), 'utf8'));
const BA = opt('--ba', `data/jobs/${marks.job}/before-after.mp4`);
const T = 'data/demo/parts'; rmSync(T, { recursive: true, force: true }); mkdirSync(T, { recursive: true });
const FONT = 'assets/fonts/Poppins-SemiBold.ttf', INK = '0x3F6E9F', BG = '0xF4F6F9';
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', '-nostdin', ...a], { stdio: 'inherit' });
const V = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30'], A = ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2'];
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\u2019").replace(/:/g, '\\:').replace(/,/g, '\\,');
const text = (s, y, size = 56, color = INK) => `drawtext=fontfile=${FONT}:text='${esc(s)}':fontsize=${size}:fontcolor=${color}:x=(w-tw)/2:y=${y}`;
const silence = d => ['-f', 'lavfi', '-t', String(d), '-i', 'anullsrc=r=48000:cl=stereo'];
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// 1 hook: the raw take beside the finished edit, in step, with sound (6 s)
ff(['-t', '6', '-i', BA, '-vf', `scale=1920:1080,${text('Raw take in. A pro editor\u2019s cut out.', 52, 58)}`, ...V, ...A, '-shortest', join(T, '1.mp4')]);
// 2 the studio, real time from opening to pressing Edit
const r = join(REC, 'studio.webm'), fit = 'scale=1728:1080,pad=1920:1080:96:0:color=' + BG;
const e0 = marks.edit + 2.5;
ff(['-ss', '0', '-t', String(e0), '-i', r, ...silence(e0), '-vf', `${fit},${text('Drop a raw take. Pick a style, or Auto.', 1000, 40)}`, '-map', '0:v', '-map', '1:a', ...V, ...A, '-shortest', join(T, '2.mp4')]);
// 3 the wait, sped up to 12 s and labelled with the real clock
const wait = marks.done - e0, k = wait / 12;
ff(['-ss', String(e0), '-t', String(wait), '-i', r, ...silence(12), '-vf', `setpts=PTS/${k.toFixed(4)},${fit},${text(`Muse plans every beat, code draws every frame (real time ${mmss(wait)}, shown ${k.toFixed(0)}x)`, 1000, 34)}`, '-map', '0:v', '-map', '1:a', ...V, ...A, '-t', '12', join(T, '3.mp4')]);
// 4 the result plays in the studio, then the before/after tab (real time)
// (recorded by opening the finished job's own link: tools/record-studio.mjs --open <job>; falls back to the run's tail)
const RM = existsSync(join(REC, 'result-marks.json')) ? JSON.parse(readFileSync(join(REC, 'result-marks.json'), 'utf8')) : null;
const rr = RM ? join(REC, 'result.webm') : r, p0 = RM ? RM.done + 0.3 : marks.done, p1 = (RM ? RM.end : marks.end) - 0.5;
ff(['-ss', String(p0), '-t', String(p1 - p0), '-i', rr, '-i', join('data/jobs', marks.job, 'edit.mp4'), '-vf', `${fit},${text('The cut, the timeline, and why', 1000, 40)}`, '-map', '0:v', '-map', '1:a', ...V, ...A, '-shortest', join(T, '4.mp4')]);
// 5 one take, five editors (the five styles side by side, with sound)
ff(['-i', 'data/demo/five-styles.mp4', '-t', '14', '-vf', 'scale=1920:1080', ...V, ...A, join(T, '5.mp4')]);
// 6 the kill switch: the studio's real page for a job run with no Meta key
ff(['-loop', '1', '-t', '5', '-i', 'data/demo/shots/shot-1440x900.jpg', ...silence(5), '-vf', `${fit},${text('No Meta key, no edit. Muse is load-bearing.', 1000, 44)}`, '-map', '0:v', '-map', '1:a', ...V, ...A, '-shortest', join(T, '6.mp4')]);
// 7 close
ff(['-f', 'lavfi', '-t', '5', '-i', `color=c=${BG}:s=1920x1080:r=30`, ...silence(5), '-vf', [text('Moovi', 380, 150), text('Raw take in. A pro editor\u2019s cut out. Directed by Meta Muse.', 600, 46), text('github.com/Ishaan-Gpt/metahack', 700, 36, '0x5B6B80')].join(','), '-map', '0:v', '-map', '1:a', ...V, ...A, '-shortest', join(T, '7.mp4')]);

// join, with a quiet bed under the parts that have no voice
writeFileSync(join(T, 'list.txt'), [1, 2, 3, 4, 5, 6, 7].map(i => `file '${i}.mp4'`).join('\n'));   // paths relative to the list file
ff(['-f', 'concat', '-safe', '0', '-i', join(T, 'list.txt'), '-c', 'copy', join(T, 'joined.mp4')]);
const voice = 'data/demo/voice.wav';
const ins = ['-i', join(T, 'joined.mp4'), '-stream_loop', '-1', '-i', 'assets/music/bed.mp3', ...(existsSync(voice) ? ['-i', voice] : [])];
const mix = existsSync(voice) ? '[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.18[m];[m][2:a]amix=inputs=2:duration=first:weights=1 1.4[a]' : '[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.18[a]';
ff([...ins, '-filter_complex', `${mix};[a]loudnorm=I=-14:TP=-1.5[ao]`, '-map', '0:v', '-map', '[ao]', '-c:v', 'copy', ...A, '-shortest', '-movflags', '+faststart', OUT]);
console.log('demo ->', OUT);
