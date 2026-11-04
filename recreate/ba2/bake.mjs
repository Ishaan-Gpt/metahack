// Bake the person matte for every master frame in headless Chrome (GPU) with bake.html → data/clips/ba2c/matte/mNNNNN.png.
// usage: node recreate/ba2/bake.mjs [dir=data/clips/ba2c]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from 'node:path';
const dir = process.argv[2] ?? 'data/clips/ba2c';
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const p = await (await b.newContext()).newPage();
p.on('pageerror', e => console.log('PAGE ERROR', String(e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await p.goto('http://127.0.0.1:4700/recreate/ba2/bake.html'); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const out = join(dir, 'matte'); mkdirSync(out, { recursive: true });
const frames = readdirSync(join(dir, 'frames')).filter(f => f.endsWith('.png')).sort();
const t0 = Date.now();
for (const f of frames) {
  if (existsSync(join(out, "m" + f.slice(1))) && !process.argv.includes("--all")) continue;
  const d = await p.evaluate(u => window.bake(u), `/${dir}/frames/${f}`);
  writeFileSync(join(out, 'm' + f.slice(1)), Buffer.from(d.split(',')[1], 'base64'));
}
await b.close();
console.log(`${frames.length} mattes in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
