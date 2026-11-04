import { NextResponse } from 'next/server';
import { refSamples, samples } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** the sample library: raw takes (id, name, one line, length, shape, credit) and the reference edits made once in code (refs) */
export async function GET() { return NextResponse.json({ samples: samples(), refs: refSamples() }); }
