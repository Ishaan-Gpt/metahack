import { NextResponse } from 'next/server';
import { position, readStatus, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: { code: 'BAD_ID', human: 'That edit link is not valid.' } }, { status: 400 });
  const s = readStatus(id);
  if (!s) return NextResponse.json({ error: { code: 'NOT_FOUND', human: 'We could not find that edit. It may have been cleared; upload your take again.' } }, { status: 404 });
  return NextResponse.json({ ...s, ahead: s.state === 'queued' ? position(id) : 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
