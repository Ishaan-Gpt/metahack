import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { jobDir, readStatus, requestRender, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** render the final MP4 from the planned edit (the live preview shows what it will be); the job ends 'done' with outputs */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id) || !existsSync(join(jobDir(id), 'job.json'))) return NextResponse.json({ error: { code: 'NOT_FOUND', human: 'We could not find that edit.' } }, { status: 404 });
  const s = readStatus(id);
  if (s?.state === 'running' || s?.state === 'queued') return NextResponse.json({ error: { code: 'BUSY', human: 'Still working on the last change. Render when it is done.' } }, { status: 409 });
  if (s?.state === 'error') return NextResponse.json({ error: { code: 'NOT_READY', human: 'This edit stopped, so there is nothing to render yet. Press Try again first.' } }, { status: 409 });
  try { requestRender(id); } catch (e) { console.error('[render]', id, (e as Error).message); return NextResponse.json({ error: { code: 'RENDER', human: 'The render could not start. Try again in a moment.' } }, { status: 500 }); }
  return NextResponse.json({ id, rendering: true });
}
