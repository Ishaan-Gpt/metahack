import { NextResponse } from 'next/server';
import { startSample, styles } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** start a job on the bundled sample take (CC BY-SA footage, credited in the studio) */
export async function POST(req: Request) {
  const style = new URL(req.url).searchParams.get('style') ?? 'auto';
  if (style !== 'auto' && !styles().some(s => s.id === style)) return NextResponse.json({ error: { code: 'BAD_STYLE', human: 'That style does not exist. Pick one from the list.' } }, { status: 400 });
  const id = startSample(style);
  if (!id) return NextResponse.json({ error: { code: 'NO_SAMPLE', human: 'The sample take is missing on this server. Upload your own take instead.' } }, { status: 404 });
  return NextResponse.json({ id });
}
