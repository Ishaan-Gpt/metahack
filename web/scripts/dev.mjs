// Local studio server for development and the demo: next dev (or start with --prod) on :3000 with its own build dir.
// Uses the TEST Meta stand-in only when META_API_BASE is already set or --standin is passed (and starts it if needed).
import { spawn } from 'node:child_process';
import { join } from 'node:path';
const web = join(import.meta.dirname, '..'), prod = process.argv.includes('--prod'), port = process.env.PORT ?? '3000';
const env = { ...process.env, NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? (prod ? '.next' : '.next-dev') };
if (process.argv.includes('--claude')) env.DIRECTOR = 'claude';   // temporary: Claude Sonnet directs (needs ANTHROPIC_API_KEY in .env.local)
if (process.argv.includes('--standin')) {
  env.META_API_BASE ??= 'http://127.0.0.1:8799/v1'; env.MODEL_API_KEY ??= 'standin';
  try { await fetch('http://127.0.0.1:8799/v1/health'); } catch { spawn(process.execPath, [join(web, '..', 'tools/meta-standin.mjs'), '8799'], { stdio: 'inherit', env }); }
}
const next = join(web, 'node_modules/next/dist/bin/next');
spawn(process.execPath, [next, prod ? 'start' : 'dev', '-p', port], { cwd: web, stdio: 'inherit', env }).on('close', c => process.exit(c ?? 0));
