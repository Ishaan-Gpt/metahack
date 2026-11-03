// Frame sheets of the live edit player without exporting: headless Chrome seeks the page (window.__seek) and shoots the
// composed #stage (video element + canvases + DOM devices), then ffmpeg tiles the shots into one sheet.
// usage: node tools/shoot.mjs url=<player url> out=<sheet.jpg> times=1,2.5,8 [w=270]
// needs: the player served (node serve.mjs 4700), Chrome installed, playwright-core (borrowed from the Moovi checkout)
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const kv = Object.fromEntries(process.argv.slice(2).map(a => a.split(/=(.*)/s).slice(0, 2)));
if (!kv.url || !kv.out || !kv.times) { console.log('usage: node tools/shoot.mjs url=<player url> out=<sheet.jpg> times=1,2.5 [w=270]'); process.exit(2); }
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1125, height: 2070 } })).newPage();
p.on('pageerror', e => console.log('PAGE ERROR', String(e).slice(0, 300)));
const t0 = Date.now();
await p.goto(kv.url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await p.evaluate(() => { const g = document.getElementById('gate'); if (g) g.style.display = 'none'; });
const tmp = resolve('data/grabs/_shots'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const times = kv.times.split(',').map(Number), w = +(kv.w || 270);
for (const [i, t] of times.entries()) {
  await p.evaluate(t => window.__seek(t), t); await p.waitForTimeout(120);
  await p.locator('#stage').screenshot({ path: join(tmp, `s${String(i).padStart(3, '0')}.png`) });
}
await b.close();
const cols = Math.min(8, times.length), rows = Math.ceil(times.length / cols);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(tmp, 's%03d.png'), '-vf', `scale=${w}:-2,tile=${cols}x${rows}:padding=4:color=0x111111`, '-frames:v', '1', resolve(kv.out)]);
writeFileSync(resolve(kv.out) + '.txt', times.join(', '));
console.log(`${times.length} frames → ${kv.out} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
