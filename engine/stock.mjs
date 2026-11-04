// Stock media by keyword, no AI and no paid API: Pixabay (free key, photos + videos) first when PIXABAY_API_KEY is set,
// Openverse (no key, openly licensed images) otherwise or as the fallback. Everything is cached on disk under
// data/stock/<query>/ with its licence and credit in meta.json, so a second run never hits the network.
// usage (cli): node engine/stock.mjs "money" [photo|video]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadEnv } from './env.mjs';

const ROOT = resolve(import.meta.dirname, '..', 'data', 'stock');
const UA = 'metahack-card-studio/0.1 (hackathon video editor)';
const slug = q => q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'x';

async function getJson(url, ms = 30000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/key=[^&]+/, 'key=***')}`);
  return r.json();
}
async function download(url, file, ms = 20000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms), redirect: 'follow' });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 8000) throw new Error('too small');
  writeFileSync(file, buf);
}
// normalise any downloaded picture to a JPEG no larger than 1280 px on its long side (also rejects broken files)
function normalise(raw, out) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-nostdin', '-i', raw, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2:flags=lanczos", '-q:v', '3', out], { timeout: 30000 });
  rmSync(raw, { force: true });
}

async function pixabay(q, kind, key, orientation) {
  const base = kind === 'video' ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
  const u = `${base}?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&safesearch=true&per_page=12` +
    (kind === 'video' ? '' : `&image_type=photo${orientation ? `&orientation=${orientation}` : ''}`);
  const j = await getJson(u);
  return (j.hits ?? []).map(h => kind === 'video'
    ? { url: h.videos?.medium?.url || h.videos?.small?.url, w: h.videos?.medium?.width, h: h.videos?.medium?.height, page: h.pageURL, creator: h.user, license: 'Pixabay Content License', source: 'pixabay' }
    : { url: h.largeImageURL || h.webformatURL, w: h.imageWidth, h: h.imageHeight, page: h.pageURL, creator: h.user, license: 'Pixabay Content License', source: 'pixabay' });
}
async function openverse(q) {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=16&mature=false&license_type=commercial,modification&extension=jpg,jpeg,png`;
  const j = await getJson(u);
  const words = q.toLowerCase().split(/\s+/);
  const on = r => { const hay = ((r.title ?? '') + ' ' + (r.tags ?? []).map(t => t.name).join(' ')).toLowerCase(); return words.filter(w => w.length > 2 && hay.includes(w.replace(/s$/, ''))).length; };
  const rank = r => on(r) * 2 + ((r.width ?? 0) >= 900 ? 1 : 0) - ((r.title ?? '').split('#').length > 3 ? 5 : 0);
  // relevance by plain matching: every query word should be in the title or tags (on-topic), hashtag-spam titles dropped
  return (j.results ?? []).filter(r => r.url && (r.width ?? 999) >= 500 && (r.title ?? '').split('#').length <= 3 && on(r) >= Math.min(2, words.filter(w => w.length > 2).length)).sort((a, b) => rank(b) - rank(a)).map(r => ({
    url: r.url, w: r.width, h: r.height, page: r.foreign_landing_url, creator: r.creator,
    license: `${(r.license ?? '').toUpperCase()} ${r.license_version ?? ''}`.trim(), source: `openverse/${r.provider ?? r.source ?? ''}`,
    attribution: r.attribution, title: (r.title ?? '').slice(0, 80) }));
}

// brand and abstract words search badly on open image sites; a small fixed table turns them into picturable queries
export const QUERY_MAP = { 'social media': 'smartphone social media apps', tool: 'tools workshop', palm: 'hand holding smartphone', hand: 'hand holding smartphone', instagram: 'smartphone social media', tiktok: 'smartphone video', youtube: 'video camera creator', facebook: 'social media phone',
  twitter: 'social media phone', ai: 'robot technology', agentic: 'robot technology', agent: 'robot technology', agents: 'robot technology', app: 'smartphone app',
  apps: 'smartphone apps', editor: 'video editing', editing: 'video editing', clips: 'film camera', clip: 'film camera', movie: 'cinema', movies: 'cinema', video: 'video camera', videos: 'video camera',
  animation: 'animation studio', animations: 'animation studio', effects: 'fireworks', results: 'growth chart', views: 'audience crowd',
  followers: 'crowd people', content: 'content creator camera', marketing: 'marketing billboard', business: 'business office', viral: 'crowd phone' };

// Wikimedia Commons: second keyless source (freely licensed), used when Openverse is slow or empty
async function commons(q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrlimit=12&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280`;
  const j = await getJson(u, 20000);
  const strip = h => String(h ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 60);
  return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index).map(p => p.imageinfo?.[0]).filter(i => i && i.width >= 600 && !/\.svg/i.test(i.url))
    .map(i => ({ url: i.thumburl || i.url, w: i.width, h: i.height, page: i.descriptionurl, creator: strip(i.extmetadata?.Artist?.value), license: strip(i.extmetadata?.LicenseShortName?.value) || 'see page', source: 'wikimedia commons', title: strip(i.extmetadata?.ObjectName?.value) }));
}

/** Return { file, kind, credit, license, source, page } for the best cached or fetched match, or null. */
export async function fetchStock(query, { kind = 'photo', orientation = '', want = 1 } = {}) {
  loadEnv();
  const dir = join(ROOT, slug(query) + (kind === 'video' ? '--video' : ''));
  const metaFile = join(dir, 'meta.json');
  if (existsSync(metaFile)) {
    const m = JSON.parse(readFileSync(metaFile, 'utf8'));
    const items = m.items.filter(i => existsSync(i.file));
    if (items.length >= want) return want === 1 ? items[0] : items;
  }
  mkdirSync(dir, { recursive: true });
  const key = process.env.PIXABAY_API_KEY;
  query = QUERY_MAP[query.toLowerCase()] ?? query;
  let cands = [];
  const tried = [];
  if (key) { try { cands = await pixabay(query, kind, key, orientation); tried.push('pixabay'); } catch (e) { tried.push('pixabay failed: ' + e.message); } }
  // keyless fallbacks, each tried with the full query and then its last word ("smartphone social media" -> "media")
  const variants = [...new Set([query, query.split(' ').at(-1), query.split(' ')[0]])];
  for (const [name, fn] of [['openverse', openverse], ['commons', commons]]) {
    for (const v of variants) {
      if (cands.length || kind !== 'photo') break;
      try { cands = await fn(v); tried.push(`${name}:${v}:${cands.length}`); } catch (e) { tried.push(`${name}:${v} failed: ${e.message}`); }
    }
  }
  const items = [];
  for (const [i, c] of cands.entries()) {
    if (items.length >= want) break;
    if (!c.url) continue;
    const ext = kind === 'video' ? 'mp4' : 'jpg';
    const file = join(dir, `${items.length}.${ext}`);
    try {
      if (kind === 'video') await download(c.url, file, 60000);
      else { await download(c.url, file + '.raw'); normalise(file + '.raw', file); }
      items.push({ file, kind, query, ...c, credit: `${c.title ? '"' + c.title + '" ' : ''}by ${c.creator || 'unknown'} (${c.license}, via ${c.source})` });
    } catch (e) { rmSync(file + '.raw', { force: true }); rmSync(file, { force: true }); }
  }
  writeFileSync(metaFile, JSON.stringify({ query, kind, tried, fetched: new Date().toISOString(), items }, null, 1));
  if (!items.length) return want === 1 ? null : [];
  return want === 1 ? items[0] : items;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [q, kind = 'photo'] = process.argv.slice(2);
  console.log(JSON.stringify(await fetchStock(q, { kind }), null, 1));
}
