// Static server for the player with byte ranges (so video seeks). usage: node serve.mjs [port]
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';

const ROOT = import.meta.dirname, PORT = +(process.argv[2] ?? 4700);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webm': 'video/webm' };
createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // local only: the player posts frame sheets here (data/grabs/<name>) so they can be judged without screenshots
  if (req.method === 'POST' && url === '/__save') {
    // ?name=<file> saves into data/grabs; ?path=data/... saves there (bake writes matte frames this way)
    const sp = new URL(req.url, 'http://x').searchParams, chunks = [];
    const rel = sp.get('path') ? normalize(sp.get('path')).replace(/\\/g, '/') : 'data/grabs/' + (sp.get('name')?.replace(/[^\w.-]/g, '') || 'grab.jpg');
    if (!rel.startsWith('data/') || rel.includes('..')) { res.writeHead(400); return res.end('only under data/'); }
    req.on('data', c => chunks.push(c)).on('end', () => { const f = join(ROOT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, Buffer.concat(chunks)); res.end('saved ' + rel); });
    return;
  }
  const p = normalize(join(ROOT, url === '/' ? 'player/index.html' : url));
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  const size = statSync(p).size, type = TYPES[extname(p)] ?? 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  if (range) {
    const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : size - 1;
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
    return createReadStream(p, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { ...head, 'Content-Length': size });
  createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`player: http://127.0.0.1:${PORT}/?clip=data/clips/t1`));
