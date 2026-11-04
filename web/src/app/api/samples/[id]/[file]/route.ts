import { createReadStream, existsSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { sampleFile } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
/** a sample's video (byte ranges, so it seeks) or its poster: /api/samples/<id>/video or /api/samples/<id>/poster */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await ctx.params;
  const ext = file === 'video' ? 'mp4' : file === 'poster' ? 'jpg' : null;
  const f = ext && sampleFile(id, ext);
  if (!f || !existsSync(f)) return new Response('not found', { status: 404 });
  const size = statSync(f).size, type = ext === 'mp4' ? 'video/mp4' : 'image/jpeg';
  const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' };
  const m = req.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    return new Response(Readable.toWeb(createReadStream(f, { start: a, end: b })) as ReadableStream, { status: 206, headers: { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(f)) as ReadableStream, { headers: { ...head, 'Content-Length': String(size) } });
}
