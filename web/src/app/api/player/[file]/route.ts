import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** the shared Canvas 2D drawing modules (player/*.js, the same code the MP4 renderers use), for the studio's live preview */
const FILES = new Set(['card-studio.js', 'creator-mix.js']);
export async function GET(_: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!FILES.has(file)) return new Response('not found', { status: 404 });
  try { return new Response(readFileSync(join(ROOT, 'player', file), 'utf8'), { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' } }); }
  catch { return new Response('not found', { status: 404 }); }
}
