import { NextResponse } from 'next/server';
import { samples } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** the sample library: id, name, one line, length, shape and the credit for each raw take */
export async function GET() { return NextResponse.json({ samples: samples() }); }
