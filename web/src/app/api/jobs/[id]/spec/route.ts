import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jobDir, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
type Seg = { type: string; t0: number; t1: number; title?: string; word?: string };
type Fx = { name: string; t0: number; t1: number; word?: string };
type Cap = { t0: number; t1: number; words: { w: string; t: number; e?: number; hero?: boolean }[] };

/** the edit's plan as a timeline: beats (layout or effect per span), caption cards, sound effects, duration, engine */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: { code: 'BAD_ID', human: 'That edit link is not valid.' } }, { status: 400 });
  let engine = 'card-studio';
  try { engine = JSON.parse(readFileSync(join(jobDir(id), 'job.json'), 'utf8')).engine ?? engine; } catch { /* old job */ }
  const mixF = join(jobDir(id), 'clip', 'spec.mix.json'), cardF = join(jobDir(id), 'clip', 'spec.card.json');
  const f = engine === 'creator-mix' && existsSync(mixF) ? mixF : cardF;
  if (!existsSync(f)) return NextResponse.json({ error: { code: 'NO_PLAN', human: 'The timeline appears once the edit is planned.' } }, { status: 404 });
  const s = JSON.parse(readFileSync(f, 'utf8'));
  const beats = f === mixF
    ? (s.fx ?? []).map((x: Fx) => ({ type: 'fx', t0: x.t0, t1: x.t1, label: x.name }))
    : (s.segments ?? []).map((g: Seg) => ({ type: g.type, t0: g.t0, t1: g.t1, label: g.title ?? g.word ?? null }));
  return NextResponse.json({
    engine, duration: s.duration, style: s.style, captionPreset: s.captionPreset ?? null, captionsHidden: !!s.captionsHidden, edits: (s.edits ?? []).length,
    segments: beats,
    // words carry their own start (t), optional end (e) and key-word mark, for the word view on the timeline
    captions: (s.captions ?? []).map((c: Cap) => ({ t0: c.t0, t1: c.t1, text: c.words.map(w => w.w).join(' '), hero: c.words.find(w => w.hero)?.w ?? null, words: c.words.map(w => ({ w: w.w, t: w.t, ...(w.e != null ? { e: w.e } : {}), hero: !!w.hero })) })),
    sfx: (s.sfx ?? []).map((x: { t: number; k: string }) => ({ t: x.t, k: x.k })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
