// Render the code-built brain to alpha PNG sprites (served page recreate/ba4/props/brain.html, headless Chrome).
// usage: node recreate/ba4/props/render.mjs [out=data/clips/ba4c/props] [views=yaw:pitch,...]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const kv = Object.fromEntries(process.argv.slice(2).map(a => a.split(/=(.*)/s).slice(0, 2)));
const out = resolve(kv.out ?? 'data/clips/ba4c/props'); mkdirSync(out, { recursive: true });
const views = (kv.views ?? '0:-28,-30:-60,-60:-75,10:-20').split(',').map(v => v.split(':').map(Number));
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const p = await (await b.newContext({ viewport: { width: 1024, height: 1024 } })).newPage();
p.on('pageerror', e => console.log('PAGE ERROR', String(e)));
await p.goto('http://127.0.0.1:4700/recreate/ba4/props/brain.html?size=1024'); await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
for (const [yaw, pitch, roll] of views) { const d = await p.evaluate(([y, pt, r]) => window.__shot(y, pt, r || 0), [yaw, pitch, roll]); const f = join(out, `brain_${yaw}_${pitch}.png`); writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); console.log(f); }
await b.close();
