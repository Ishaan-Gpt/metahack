import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { jobDir, readStatus, retry, styles, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** try again from the same upload, optionally in another style (cached Meta answers make a retry cost no new calls) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id) || !existsSync(join(jobDir(id), 'job.json'))) return NextResponse.json({ error: { code: 'NOT_FOUND', human: 'We could not find that edit. Upload your take again.' } }, { status: 404 });
  const s = readStatus(id);
  if (s?.state === 'running' || s?.state === 'queued') return NextResponse.json({ error: { code: 'BUSY', human: 'This edit is still being made.' } }, { status: 409 });
  const style = new URL(req.url).searchParams.get('style') ?? undefined;
  if (style && style !== 'auto' && !styles().some(x => x.id === style)) return NextResponse.json({ error: { code: 'BAD_STYLE', human: 'That style does not exist.' } }, { status: 400 });
  const q = new URL(req.url).searchParams, music = q.get('music');
  retry(id, style, { music: music == null ? undefined : music === '1', handle: q.get('handle') ?? undefined });
  return NextResponse.json({ id });
}
