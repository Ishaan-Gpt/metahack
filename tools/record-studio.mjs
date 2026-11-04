// Records a real studio run for the demo video: headless Chrome at 1440x900 with video capture, from an empty studio to
// the finished edit playing and the before/after. Nothing is staged: it uploads the take, presses Edit, waits for the
// engine, then plays the result. Output: <out dir>/studio.webm + marks.json (seconds into the recording of each moment,
// so the demo cut can speed up the waits honestly and label the real clock).
// usage: node tools/record-studio.mjs <take.mp4> <out dir> [--url http://localhost:3000] [--style auto]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [take, outDir] = process.argv.slice(2);
const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
if (!take || !outDir) { console.error('usage: node tools/record-studio.mjs <take.mp4> <out dir> [--url ..] [--style auto]'); process.exit(1); }
const URL_ = opt('--url', 'http://localhost:3000'), STYLE = opt('--style', 'auto');
const req = createRequire(resolve('C:/Ishaan GPT/hackthons/moovi/package.json'));
const pw = req(resolve('C:/Ishaan GPT/hackthons/moovi/node_modules/.pnpm/playwright-core@1.56.1/node_modules/playwright-core'));
mkdirSync(outDir, { recursive: true });
const b = await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: outDir, size: { width: 1440, height: 900 } } });
const p = await ctx.newPage();
const t0 = Date.now(), marks = {}, mark = k => { marks[k] = +((Date.now() - t0) / 1000).toFixed(2); console.log(k, marks[k]); };
// --open <job id>: record an existing edit's page (the result playing, then the before/after) and stop
const OPEN = opt('--open', null);
if (OPEN) {
  await p.goto(`${URL_}/studio?job=${OPEN}`); await p.waitForLoadState('networkidle'); mark('open');
  await p.waitForSelector('.ed__screen video[src*="edit.mp4"]', { timeout: 30000 }); mark('done');
  await p.waitForTimeout(18000); mark('played');
  const s2 = p.locator('.ed__seg button').filter({ hasText: /before/i });
  if (await s2.count()) { await s2.first().click(); mark('beforeafter'); await p.waitForTimeout(12000); }
  mark('end'); marks.job = OPEN;
  await ctx.close(); await b.close();
  const v2 = readdirSync(outDir).filter(f => f.endsWith('.webm') && f !== 'studio.webm').map(f => join(outDir, f)).sort().at(-1);
  if (v2) renameSync(v2, join(outDir, 'result.webm'));
  writeFileSync(join(outDir, 'result-marks.json'), JSON.stringify(marks, null, 1));
  console.log('recorded', join(outDir, 'result.webm')); process.exit(0);
}
await p.goto(`${URL_}/studio`); await p.waitForLoadState('networkidle'); mark('open');
await p.waitForTimeout(1500);
// the take goes in through the real file input, the style through the real radio
await p.locator('input[type=file]').setInputFiles(resolve(take)); mark('picked');
await p.waitForTimeout(2000);
const styleBtn = p.locator('[role=radiogroup][aria-label=Style] [role=radio]').filter({ hasText: STYLE === 'auto' ? 'Auto' : STYLE });
if (await styleBtn.count()) { await styleBtn.first().click(); }
await p.waitForTimeout(1200);
await p.locator('button.ed__go').click(); mark('edit');
// wait for the engine (status polled by the page itself); log each stage as it starts
let last = '';
for (;;) {
  await p.waitForTimeout(1000);
  const id = new URL(p.url()).searchParams.get('job');
  if (!id) continue;
  const s = await (await fetch(`${URL_}/api/jobs/${id}`)).json();
  if (s.stage && s.stage !== last) { last = s.stage; mark('stage:' + s.stage); }
  if (s.state === 'done') { mark('done'); marks.job = id; marks.seconds = s.seconds; break; }
  if (s.state === 'error') { mark('error'); marks.job = id; marks.error = s.error; break; }
}
await p.waitForTimeout(16000); mark('played');
const seg = p.locator('.ed__seg button').filter({ hasText: /before/i });
if (await seg.count()) { await seg.first().click(); mark('beforeafter'); await p.waitForTimeout(12000); }
mark('end');
await ctx.close(); await b.close();
const vid = readdirSync(outDir).filter(f => f.endsWith('.webm')).map(f => join(outDir, f)).sort().at(-1);
if (vid) renameSync(vid, join(outDir, 'studio.webm'));
writeFileSync(join(outDir, 'marks.json'), JSON.stringify(marks, null, 1));
console.log('recorded', join(outDir, 'studio.webm'));
