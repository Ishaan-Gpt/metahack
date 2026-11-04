import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import { ROOT, jobDir, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
const TYPE: Record<string, string> = { json: 'application/json', mp4: 'video/mp4', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** one file of a job's clip folder for the live preview (?p=<path as the spec writes it>): specs, graded.mp4, matte frames,
 *  and the stock photos the spec points at (data/stock). Nothing else is reachable. Videos stream with byte ranges. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params, p = new URL(req.url).searchParams.get('p') ?? '';
  const ext = p.split('.').pop()?.toLowerCase() ?? '';
  if (!validId(id) || !p || !TYPE[ext]) return new Response('not found', { status: 404 });
  const clip = normalize(join(jobDir(id), 'clip')), stock = normalize(join(ROOT, 'data', 'stock'));
  const f = normalize(join(clip, p.replace(/\\/g, '/')));
  if (!(f.startsWith(clip + sep) || f.startsWith(stock + sep)) || !existsSync(f) || !statSync(f).isFile()) return new Response('not found', { status: 404 });
  const size = statSync(f).size;
  const head: Record<string, string> = { 'Content-Type': TYPE[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': ext === 'json' || ext === 'mp4' ? 'no-cache' : 'public, max-age=600' };
  const m = req.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (a >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(f, { start: a, end: b })) as ReadableStream, { status: 206, headers: { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(f)) as ReadableStream, { headers: { ...head, 'Content-Length': String(size) } });
}
