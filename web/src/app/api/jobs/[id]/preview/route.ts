import { NextResponse } from 'next/server';
import { previewOf, validId, type Preview } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** what the live preview draws: the engine, its spec and the merged template T (clip/preview.json, or built from the templates) */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: { code: 'BAD_ID', human: 'That edit link is not valid.' } }, { status: 400 });
  let p: Preview | null = null;
  try { p = previewOf(id); } catch (e) { console.error('[preview]', id, (e as Error).message); }
  if (!p) return NextResponse.json({ error: { code: 'NO_PREVIEW', human: 'The live preview is not ready for this edit.' } }, { status: 404 });
  return NextResponse.json(p, { headers: { 'Cache-Control': 'no-store' } });
}
