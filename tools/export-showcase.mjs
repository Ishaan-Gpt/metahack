// One MP4 of a showcase page (before | after on the light page), frame by frame from the live page + the edit's own mix.
// usage: node tools/export-showcase.mjs url=<showcase url> out=<file.mp4> [fps=30] [dur=<s>]
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const kv = Object.fromEntries(process.argv.slice(2).map(a => a.split(/=(.*)/s).slice(0, 2)));
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
p.on('pageerror', e => console.log('PAGE ERROR', String(e).slice(0, 300)));
const t0 = Date.now();
await p.goto(kv.url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const fps = +(kv.fps || 30), dur = +(kv.dur || await p.evaluate(() => document.getElementById('af').contentWindow.__edit.duration));
const tmp = resolve('data/grabs/_export'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const wav = await p.evaluate(async () => { const a = new Uint8Array(await document.getElementById('af').contentWindow.__mixWav()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); });
writeFileSync(join(tmp, 'mix.wav'), Buffer.from(wav, 'base64'));
const n = Math.round(dur * fps);
for (let i = 0; i < n; i++) {
  await p.evaluate(t => window.__seek(t), i / fps);
  await p.locator('#sc').screenshot({ path: join(tmp, `f${String(i).padStart(5, '0')}.png`) });
  if (i % 60 === 0) console.log(`frame ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
await b.close();
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', join(tmp, 'f%05d.png'), '-i', join(tmp, 'mix.wav'), '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', resolve(kv.out)]);
console.log(`${kv.out}: ${n} frames, ${dur.toFixed(2)} s, in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
