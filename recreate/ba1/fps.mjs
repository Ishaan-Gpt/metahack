// Real-time playback check of the ba1 recreation: plays from the start for the whole edit in headless Chrome (GPU),
// reports rAF fps, frame-gap percentiles, the longest stall, and how far the footage drifted from the edit clock.
// usage: node recreate/ba1/fps.mjs [secs=22.8] [url=...]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const kv = Object.fromEntries(process.argv.slice(2).map(a => a.split(/=(.*)/s).slice(0, 2)));
const url = kv.url ?? 'http://127.0.0.1:4700/recreate/ba1/index.html?mute=1';
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 540, height: 984 } })).newPage();
p.on('pageerror', e => console.log('PAGE ERROR', String(e).slice(0, 300)));
await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const secs = +(kv.secs || 22.8);
const r = await p.evaluate(async secs => {
  document.getElementById('gate').click();
  await new Promise(r => setTimeout(r, 300));
  const w0 = performance.now(), gaps = [], drift = []; let last = w0;
  const v = document.querySelector('video') ?? null;
  await new Promise(done => { const f = ts => { gaps.push(ts - last); last = ts; const T = window.__T(); const vid = window.__vt?.(); if (vid != null && T < 19.7) drift.push(Math.abs(vid - T)); if (performance.now() - w0 < secs * 1000) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  gaps.shift(); gaps.sort((a, b) => a - b); drift.sort((a, b) => a - b);
  return { fps: +(gaps.length / secs).toFixed(1), p50: +gaps[Math.floor(gaps.length * .5)].toFixed(1), p95: +gaps[Math.floor(gaps.length * .95)].toFixed(1), p99: +gaps[Math.floor(gaps.length * .99)].toFixed(1), max: +gaps.at(-1).toFixed(1), clockAt: +window.__T().toFixed(2), wall: secs, prof: window.__prof(), driftP95: drift.length ? +drift[Math.floor(drift.length * .95)].toFixed(3) : null };
}, secs);
console.log(JSON.stringify(r));
await b.close();
