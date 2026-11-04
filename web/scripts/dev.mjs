// Local studio server for development and the demo: next dev (or start with --prod) on :3000 with its own build dir.
// Uses the TEST Meta stand-in only when META_API_BASE is already set or --standin is passed (and starts it if needed).
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { loadEnv } from '../../engine/env.mjs';
loadEnv();   // .env.local keys (MODEL_API_KEY, GEMINI_API_KEY...) so the choice below sees them
const web = join(import.meta.dirname, '..'), prod = process.argv.includes('--prod'), port = process.env.PORT ?? '3000';
const env = { ...process.env, NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? (prod ? '.next' : '.next-dev') };
if (process.argv.includes('--claude')) env.DIRECTOR = 'claude';   // temporary: Claude Sonnet directs (needs ANTHROPIC_API_KEY in .env.local)
// --standin = the TEST stand-in, ONLY when there is no real key to use: a real MODEL_API_KEY (or GEMINI_API_KEY backup) always wins,
// otherwise a deployed studio with a real Meta key would still talk to the stand-in (META_API_BASE set makes engine/run.mjs treat the run as a test).
const realKey = !!(process.env.MODEL_API_KEY ?? '').trim() && process.env.MODEL_API_KEY !== 'standin', gemKey = !!(process.env.GEMINI_API_KEY ?? '').trim();
if (process.argv.includes('--standin') && !realKey && !gemKey && !process.env.META_API_BASE) {
  env.META_API_BASE ??= 'http://127.0.0.1:8799/v1'; env.MODEL_API_KEY ??= 'standin';
  try { await fetch('http://127.0.0.1:8799/v1/health'); } catch { spawn(process.execPath, [join(web, '..', 'tools/meta-standin.mjs'), '8799'], { stdio: 'inherit', env }); }
}
const next = join(web, 'node_modules/next/dist/bin/next');
spawn(process.execPath, [next, prod ? 'start' : 'dev', '-p', port], { cwd: web, stdio: 'inherit', env }).on('close', c => process.exit(c ?? 0));
