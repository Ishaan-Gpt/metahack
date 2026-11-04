// Full-resolution frames of the live recreation, seeked in headless Chrome and read straight off the canvas (no encode).
// usage: node recreate/ba1/grab.mjs times=0.5,1,2 [out=data/grabs/ba1] [url=http://127.0.0.1:4700/recreate/ba1/index.html]
// writes <out>/ours_<t>.png; with sbs=1 also <out>/sbs_<t>.png (reference after panel | ours, same time, 540 px each)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const kv = Object.fromEntries(process.argv.slice(2).map(a => a.split(/=(.*)/s).slice(0, 2)));
const url = kv.url ?? 'http://127.0.0.1:4700/recreate/ba1/index.html?mute=1&grab=1', outDir = resolve(kv.out ?? 'data/grabs/ba1');
const times = (kv.times ?? '1').split(',').map(Number);
mkdirSync(outDir, { recursive: true });
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 600, height: 1100 } })).newPage();
p.on('pageerror', e => console.log('PAGE ERROR', String(e).slice(0, 400)));
p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const files = [];
for (const t of times) {
  const data = await p.evaluate(async t => { await window.__seek(t); return document.getElementById('out').toDataURL('image/png'); }, t);
  const f = join(outDir, `ours_${t.toFixed(2)}.png`); writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); files.push([t, f]);
}
await b.close();
if (kv.sbs) {
  const ref = resolve('data/refs/edit-ba1/after1080.mp4');
  for (const [t, f] of files) {
    const rt = (kv.map ? eval(kv.map)(t) : t);  // optional ours → ref time mapping
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(rt), '-i', ref, '-i', f, '-filter_complex', '[0:v]scale=540:960,setsar=1[a];[1:v]scale=540:960,setsar=1[b];[a][b]hstack', '-frames:v', '1', join(outDir, `sbs_${t.toFixed(2)}.png`)]);
  }
}
console.log(files.map(f => f[1]).join('\n'));
