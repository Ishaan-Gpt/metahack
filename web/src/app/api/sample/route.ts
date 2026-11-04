import { NextResponse } from 'next/server';
import { startSample, styles } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** start a job on a take from the sample library (?id=<sample>; credited raw Wikimedia Commons footage) */
export async function POST(req: Request) {
  const q = new URL(req.url).searchParams, style = q.get('style') ?? 'auto';
  if (style !== 'auto' && !styles().some(s => s.id === style)) return NextResponse.json({ error: { code: 'BAD_STYLE', human: 'That style does not exist.' } }, { status: 400 });
  const id = startSample(style, q.get('id') ?? undefined);
  if (!id) return NextResponse.json({ error: { code: 'NO_SAMPLE', human: 'That sample take is missing on this server. Upload your own take instead.' } }, { status: 404 });
  return NextResponse.json({ id });
}
