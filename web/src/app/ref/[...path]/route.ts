import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import { ROOT } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';

/**
 * Serves the reference recreations' live code players for /styles (next.config rewrites /recreate, /assets and
 * /data/clips here, the absolute paths the players were written with). Only the players, the shared assets they load
 * and their own raw Commons takes are reachable: never data/jobs, data/refs (the third-party reference reels) or source.
 */
const REFS = '(ba1|ba2|ba3|ba4|ba5|self1)';
const ALLOW = [new RegExp(`^recreate/${REFS}/(?!compare\\.html$)[^]+$`), /^assets\/[^]+$/, new RegExp(`^data/clips/${REFS.replace(/(ba\d)/g, '$1c')}/[^]+$`)];
const TYPE: Record<string, string> = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json', css: 'text/css',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml',
  webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg',
};

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const rel = (await ctx.params).path.map(decodeURIComponent).join('/');
  const ext = rel.split('.').pop()?.toLowerCase() ?? '';
  if (rel.includes('..') || !TYPE[ext] || !ALLOW.some(r => r.test(rel))) return new Response('not found', { status: 404 });
  const f = normalize(join(ROOT, rel));
  if (!f.startsWith(normalize(ROOT) + sep) || !existsSync(f) || !statSync(f).isFile()) return new Response('not found', { status: 404 });
  const size = statSync(f).size;
  const head: Record<string, string> = { 'Content-Type': TYPE[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': /^(html|js|mjs|json|css)$/.test(ext) ? 'no-cache' : 'public, max-age=600' };
  const m = req.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (a >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(f, { start: a, end: b })) as ReadableStream, { status: 206, headers: { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(f)) as ReadableStream, { headers: { ...head, 'Content-Length': String(size) } });
}
