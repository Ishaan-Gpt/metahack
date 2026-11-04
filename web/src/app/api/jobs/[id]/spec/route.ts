import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jobDir, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** the edit's plan as a timeline: beats (layout per span), caption cards, sound effects, duration */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const f = join(jobDir(id), 'clip', 'spec.card.json');
  if (!validId(id) || !existsSync(f)) return NextResponse.json({ error: { code: 'NO_PLAN', human: 'The timeline appears once Muse Spark has planned the edit.' } }, { status: 404 });
  const s = JSON.parse(readFileSync(f, 'utf8'));
  return NextResponse.json({
    duration: s.duration, style: s.style,
    segments: (s.segments ?? []).map((g: { type: string; t0: number; t1: number; title?: string; word?: string }) => ({ type: g.type, t0: g.t0, t1: g.t1, label: g.title ?? g.word ?? null })),
    captions: (s.captions ?? []).map((c: { t0: number; t1: number; words: { w: string; hero?: boolean }[] }) => ({ t0: c.t0, t1: c.t1, text: c.words.map(w => w.w).join(' '), hero: c.words.find(w => w.hero)?.w ?? null })),
    sfx: (s.sfx ?? []).map((x: { t: number; k: string }) => ({ t: x.t, k: x.k })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
