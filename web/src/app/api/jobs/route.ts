import { NextResponse } from 'next/server';
import { createWriteStream, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { enqueue, jobDir, newId, styles, writeJob } from '@/lib/server/jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const MAX_BYTES = 400 * 1024 * 1024;
const EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
const err = (status: number, code: string, human: string) => NextResponse.json({ error: { code, human } }, { status });

/** upload a take: the raw body is the file; x-file-name, x-style, x-handle carry the options */
export async function POST(req: Request) {
  const name = decodeURIComponent(req.headers.get('x-file-name') ?? '');
  const style = req.headers.get('x-style') ?? 'auto';
  const size = +(req.headers.get('content-length') ?? 0);
  if (!EXT.test(name)) return err(415, 'NOT_VIDEO', 'That file is not a video. Upload an MP4, MOV or WEBM.');
  if (size > MAX_BYTES) return err(413, 'TOO_BIG', 'That file is over 400 MB. Export a shorter or smaller version (1080p is plenty).');
  if (style !== 'auto' && !styles().some(s => s.id === style)) return err(400, 'BAD_STYLE', 'That style does not exist. Pick one from the list.');
  if (!req.body) return err(400, 'EMPTY', 'The upload arrived empty. Try again.');
  const id = newId(), dir = jobDir(id); mkdirSync(dir, { recursive: true });
  const input = 'input' + (name.match(EXT)?.[0] ?? '.mp4').toLowerCase();
  try {
    let bytes = 0;
    const counted = Readable.fromWeb(req.body as never);
    counted.on('data', (c: Buffer) => { bytes += c.length; if (bytes > MAX_BYTES) counted.destroy(new Error('too big')); });
    await pipeline(counted, createWriteStream(join(dir, input)));
  } catch {
    rmSync(dir, { recursive: true, force: true });
    return err(400, 'UPLOAD', 'The upload was cut off. Check your connection and try again.');
  }
  writeJob(id, input, { style, handle: req.headers.get('x-handle') ?? undefined, split: req.headers.get('x-split') === '1' });
  enqueue(id);
  return NextResponse.json({ id });
}
