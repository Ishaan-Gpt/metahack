import { NextResponse } from 'next/server';
import { health } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json(health(), { headers: { 'Cache-Control': 'no-store' } }); }
