import { NextResponse } from 'next/server';
import { styles } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json({ styles: styles() }); }
  catch { return NextResponse.json({ error: { code: 'STYLES', human: 'The style list could not be read. Refresh in a moment.' } }, { status: 500 }); }
}
