// Real-time playback check of the live player in headless Chrome: plays from the start for N seconds, reports rAF fps,
// the 95th-percentile frame gap and whether the video clock kept up. usage: node tools/fps.mjs url=<player url> [secs=8]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const kv = Object.fromEntries(process.argv.slice(2).map(a => a.split(/=(.*)/s).slice(0, 2)));
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1125, height: 2070 } })).newPage();
await p.goto(kv.url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const secs = +(kv.secs || 8);
const r = await p.evaluate(async secs => {
  document.getElementById('gate').click();
  await new Promise(r => setTimeout(r, 400));
  const v = document.getElementById('v'), v0 = v.currentTime, w0 = performance.now(), gaps = []; let last = w0;
  await new Promise(done => { const f = ts => { gaps.push(ts - last); last = ts; if (performance.now() - w0 < secs * 1000) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  gaps.sort((a, b) => a - b);
  return { fps: +(gaps.length / secs).toFixed(1), p95: +gaps[Math.floor(gaps.length * .95)].toFixed(1), max: +gaps.at(-1).toFixed(1), videoAdvanced: +(v.currentTime - v0).toFixed(2), wall: secs };
}, secs);
console.log(JSON.stringify(r));
await b.close();
