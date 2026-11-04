import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { jobDir, validId } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
const ALLOWED = /^(edit\.mp4|before-after\.mp4|card-studio-zoom\.mp4|creator-mix-zoom\.mp4|polyester\.mp4|input\.(mp4|mov|m4v|webm|mkv|avi))$/;
const TYPE: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo' };

/** stream a job's video with byte ranges, so it seeks; ?dl=1 downloads it */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  const { id, name: asked } = await ctx.params; let name = asked;
  if (!validId(id) || !ALLOWED.test(name)) return new Response('not found', { status: 404 });
  // ?dl=1 serves ONLY the job's download file (Card Studio Zoom / Creator Mix Zoom: the edited video alone), whatever name was asked for;
  // the show video (framed / before-after) is for playing, never for downloading.
  let dlName = '';
  const wantsDl = new URL(req.url).searchParams.has('dl');
  if (wantsDl) {
    try { const o = JSON.parse(readFileSync(join(jobDir(id), 'status.json'), 'utf8')).outputs; if (!o?.download) return new Response('not ready', { status: 404 }); name = o.download; dlName = o.downloadName ?? o.download; } catch { return new Response('not ready', { status: 404 }); }
  }
  const f = join(jobDir(id), name);
  if (!existsSync(f)) return new Response('not ready', { status: 404 });
  const size = statSync(f).size, type = TYPE[name.split('.').pop()!] ?? 'application/octet-stream';
  const dl = new URL(req.url).searchParams.has('dl');
  const head: Record<string, string> = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache',
    ...(dl ? { 'Content-Disposition': `attachment; filename="${dlName || `moovi-${id}-${name}`}"` } : {}) };
  const m = req.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (a >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(f, { start: a, end: b })) as ReadableStream, { status: 206, headers: { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(f)) as ReadableStream, { headers: { ...head, 'Content-Length': String(size) } });
}
