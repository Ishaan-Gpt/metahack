import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, jobDir, readStatus, requeueEdit, requeueRegrade, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
const err = (status: number, code: string, human: string) => NextResponse.json({ error: { code, human } }, { status });

/**
 * Change a finished edit by prompt or by exact ops (docs/EDIT-API.md). The prompt is matched against the edit dictionary
 * in engine/edits.mjs (keywords and fuzzy spelling, no model call), the plan is changed, and the job re-renders.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id) || !existsSync(join(jobDir(id), 'job.json'))) return err(404, 'NOT_FOUND', 'We could not find that edit.');
  const s = readStatus(id);
  if (s?.state === 'running' || s?.state === 'queued') return err(409, 'BUSY', 'Still working on the last change. Ask again when it is done.');
  let body: { prompt?: string; ops?: unknown[]; target?: unknown } = {};
  try { body = await req.json(); } catch { return err(400, 'BAD_BODY', 'Send a prompt or a list of changes.'); }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 600) : '';
  // word edits from the timeline can make a long batch; cutting it short would shift card indices, so refuse instead
  // (300 ops stay well inside the Windows command-line limit the --ops argument travels through)
  if (Array.isArray(body.ops) && body.ops.length > 300) return err(400, 'TOO_MANY', 'That is too many changes for one Apply. Apply part of them first.');
  const ops = Array.isArray(body.ops) ? body.ops : null;
  if (!prompt && !ops?.length) return err(400, 'EMPTY', 'Tell me what to change.');
  // a target picked by clicking the preview: { kind: 'caption', i } | { kind: 'word', i, j } | { kind: 'segment', i } | { kind: 'fx', i } | { kind: 'photo', key } | { kind: 'chrome', part }
  const tg = body.target as { kind?: unknown } | undefined;
  const target = tg && typeof tg === 'object' && typeof tg.kind === 'string' && /^(caption|word|segment|fx|photo|chrome)$/.test(tg.kind) ? JSON.stringify(tg).slice(0, 400) : null;
  const args = [join(ROOT, 'engine', 'edits.mjs'), jobDir(id), ...(ops ? ['--ops', JSON.stringify(ops)] : ['--prompt', prompt]), ...(target ? ['--target', target] : [])];
  const out = await new Promise<string>((ok, no) => execFile(process.execPath, args, { cwd: ROOT, timeout: 90000, windowsHide: true, maxBuffer: 1 << 22 }, (e, so, se) => e ? no(new Error(se || e.message)) : ok(so)))
    .catch(e => { console.error('[edit]', id, e.message); return null; });
  if (!out) return err(500, 'EDIT', 'That change could not be applied. Try saying it another way.');
  let r: { applied?: { op: string; said: string }[]; unmatched?: string[]; changed?: boolean; needs?: 'none' | 'regrade' | 'full'; error?: { code: string; human: string } };
  try { r = JSON.parse(out.trim().split('\n').pop() ?? '{}'); } catch { return err(500, 'EDIT', 'That change could not be applied.'); }
  if (r.error) return err(409, r.error.code, r.error.human);
  // the engine says what the change needs: 'none' = the spec and preview.json are already updated (the browser redraws),
  // 'regrade' = the picture's grade changed, 'full' = a new cut. An engine without `needs` gets the old full re-run.
  const needs = !r.changed ? 'none' : r.needs ?? 'full';
  if (needs === 'regrade') requeueRegrade(id);
  else if (needs === 'full') requeueEdit(id);
  return NextResponse.json({ id, applied: r.applied ?? [], unmatched: r.unmatched ?? [], changed: !!r.changed, needs, rendering: needs !== 'none' });
}
