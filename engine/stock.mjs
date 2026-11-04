// Stock media by keyword, no AI and no paid API: Pixabay (free key, photos + videos) first when PIXABAY_API_KEY is set,
// Openverse (no key, openly licensed images) otherwise or as the fallback. Everything is cached on disk under
// data/stock/<query>/ with its licence and credit in meta.json, so a second run never hits the network.
// usage (cli): node engine/stock.mjs "money" [photo|video]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadEnv } from './env.mjs';
import { museImage } from './muse.mjs';   // Muse Image: OFF by default (credit limit), see engine/muse.mjs

const ROOT = resolve(import.meta.dirname, '..', 'data', 'stock');
const UA = 'metahack-card-studio/0.1 (hackathon video editor)';
const slug = q => q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'x';

async function getJson(url, ms = 30000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/key=[^&]+/, 'key=***')}`);
  return r.json();
}
async function download(url, file, ms = 12000) {
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
    ? { url: h.videos?.medium?.url || h.videos?.small?.url, w: h.videos?.medium?.width, h: h.videos?.medium?.height, page: h.pageURL, creator: h.user, license: 'Pixabay Content License', source: 'pixabay', hay: h.tags }
    : { url: h.largeImageURL || h.webformatURL, w: h.imageWidth, h: h.imageHeight, page: h.pageURL, creator: h.user, license: 'Pixabay Content License', source: 'pixabay', hay: h.tags });
}
async function openverse(q, ms = 12000) {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=16&mature=false&license_type=commercial,modification&extension=jpg,jpeg,png`;
  const j = await getJson(u, ms);
  const words = q.toLowerCase().split(/\s+/);
  const on = r => { const hay = ((r.title ?? '') + ' ' + (r.tags ?? []).map(t => t.name).join(' ')).toLowerCase(); return words.filter(w => w.length > 2 && hay.includes(w.replace(/s$/, ''))).length; };
  const rank = r => on(r) * 2 + ((r.width ?? 0) >= 900 ? 1 : 0) - ((r.title ?? '').split('#').length > 3 ? 5 : 0);
  // relevance by plain matching: every query word should be in the title or tags (on-topic), hashtag-spam titles dropped
  return (j.results ?? []).filter(r => r.url && !/\b(meme|memes|rage|advice animal|quickmeme|y u no|demotivational|troll|screenshot|insight|draft|wikipedia|infographic|diagram|logo|icon|banner|poster)\b/i.test((r.title ?? '') + ' ' + (r.tags ?? []).map(x => x.name).join(' ')) && (r.width ?? 999) >= 500 && (r.title ?? '').split('#').length <= 3 && on(r) >= Math.min(2, words.filter(w => w.length > 2).length)).sort((a, b) => rank(b) - rank(a)).map(r => ({
    url: r.url, w: r.width, h: r.height, page: r.foreign_landing_url, creator: r.creator,
    license: `${(r.license ?? '').toUpperCase()} ${r.license_version ?? ''}`.trim(), source: `openverse/${r.provider ?? r.source ?? ''}`,
    attribution: r.attribution, title: (r.title ?? '').slice(0, 80), hay: (r.tags ?? []).map(x => x.name).join(' ') }));
}

// brand and abstract words search badly on open image sites; a small fixed table turns them into picturable queries
export const QUERY_MAP = { 'social media': 'smartphone social media apps', tool: 'tools workshop', palm: 'hand holding smartphone', hand: 'hand holding smartphone', instagram: 'smartphone social media', tiktok: 'smartphone video', youtube: 'video camera creator', facebook: 'social media phone',
  twitter: 'social media phone', ai: 'robot technology', agentic: 'robot technology', agent: 'robot technology', agents: 'robot technology', app: 'smartphone app',
  apps: 'smartphone apps', editor: 'video editing', editing: 'video editing', clips: 'film camera', clip: 'film camera', movie: 'cinema', movies: 'cinema', video: 'video camera', videos: 'video camera',
  animation: 'animation studio', animations: 'animation studio', effects: 'fireworks', results: 'growth chart', views: 'audience crowd',
  followers: 'crowd people', content: 'content creator camera', marketing: 'marketing billboard', business: 'business office', viral: 'crowd phone' };

// Wikimedia Commons: second keyless source (freely licensed), used when Openverse is slow or empty
async function commons(q, ms = 12000) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrlimit=12&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280`;
  const j = await getJson(u, ms);
  const strip = h => String(h ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 60);
  return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index).map(p => p.imageinfo?.[0] && { ...p.imageinfo[0], descriptionurl: (p.imageinfo[0].descriptionurl ?? '') + ' ' + (p.title ?? '') }).filter(i => i && i.width >= 600 && !/\.svg/i.test(i.url) && !/\((1[4-9]\d\d)\)|\(\d{10,12}\)/.test(decodeURIComponent(String(i.url).split('?')[0].split('/').pop())) &&   // scanned old-book pages (Internet Archive uploads) are text, not pictures
      !/(wikipedia|wikimedia|logo|icon|banner|screenshot|diagram|flag of|map of|poster|edit count|user box|userbox|button|template)/i.test(decodeURIComponent(String(i.url).split('?')[0].split('/').pop()) + ' ' + String(i.descriptionurl ?? '').split(' ').slice(1).join(' ')))
    .map(i => ({ url: i.thumburl || i.url, w: i.width, h: i.height, page: i.descriptionurl, creator: strip(i.extmetadata?.Artist?.value), license: strip(i.extmetadata?.LicenseShortName?.value) || 'see page', source: 'wikimedia commons', title: strip(i.extmetadata?.ObjectName?.value), hay: String(i.extmetadata?.ImageDescription?.value ?? '').replace(/<[^>]+>/g, ' ').slice(0, 400) + ' ' + String(i.extmetadata?.Categories?.value ?? '') }));
}

// relevance: a missing photo is better than a wrong one. The query's MAIN words are what is left after dropping filler and
// photo words ("assyrians close up photo" -> assyrians); a candidate must name one of them in its title, file name, page or
// tags, or it is dropped (the elephant for "themselves close up photo", gravel for "Assyrians"). A query whose main words
// are only pronouns or vague words gets no photo at all (the layout falls back to its title card or the face).
const GENERIC = new Set('close up closeup photo photos photograph image images picture pictures shot shots view views detail details stock scene background portrait photography the and with from for into over under of on in at by an'.split(' '));
const VAGUE = new Set('themselves itself myself yourself ourselves himself herself them they their it its this that these those something everything anything nothing thing things one ones someone everyone people person same other others way ways kind lot lots part'.split(' '));
export const mainWords = q => String(q).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !GENERIC.has(w));
/** true when the query names something a photo can show (not only pronouns, vague or photo words) */
export const picturable = q => mainWords(q).some(w => !VAGUE.has(w));
const stem = w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
function relevant(c, words) {
  const hay = [c.title, c.page, c.hay, String(c.url ?? '').split('?')[0].split('/').pop()].map(x => decodeURIComponent(String(x ?? '')).toLowerCase().replace(/[_-]+/g, ' ')).join(' ');
  return words.some(w => hay.includes(stem(w)));
}

/** Return { file, kind, credit, license, source, page } for the best cached or fetched match, or null. */
export async function fetchStock(query, { kind = 'photo', orientation = '', want = 1 } = {}) {
  loadEnv();
  const dir = join(ROOT, slug(query) + (kind === 'video' ? '--video' : ''));
  const metaFile = join(dir, 'meta.json');
  if (existsSync(metaFile)) {
    const m = JSON.parse(readFileSync(metaFile, 'utf8'));
    const items = m.items.filter(i => existsSync(i.file));
    if (m.v === 2 && items.length >= want) return want === 1 ? items[0] : items;   // caches from before the relevance check are re-fetched
    if (m.v === 2 && !items.length && m.empty && Date.now() - Date.parse(m.fetched) < 6 * 3600e3) return want === 1 ? null : [];   // a checked miss is remembered for 6 h
  }
  mkdirSync(dir, { recursive: true });
  const key = process.env.PIXABAY_API_KEY;
  query = QUERY_MAP[query.toLowerCase()] ?? query;
  const MW = mainWords(query).filter(w => !VAGUE.has(w));
  if (!MW.length) { writeFileSync(metaFile, JSON.stringify({ v: 2, query, kind, tried: ['no picturable word in the query'], empty: true, fetched: new Date().toISOString(), items: [] }, null, 1)); return want === 1 ? null : []; }
  // on-topic only; a candidate naming the word in its title or file name ranks above one that names it only in its description
  const strong = c => relevant({ title: c.title, url: c.url, page: c.page }, MW);
  const keep = list => kind === 'photo' ? list.filter(c => relevant(c, MW)).map((c, i) => ({ c, i, k: strong(c) ? 0 : 1 })).sort((x, y) => x.k - y.k || x.i - y.i).map(x => x.c) : list;
  let cands = [];
  const tried = [];
  if (key) { try { cands = keep(await pixabay(query, kind, key, orientation)); tried.push('pixabay'); } catch (e) { tried.push('pixabay failed: ' + e.message); } }
  // keyless fallbacks, each tried with the full query and then its last word ("smartphone social media" -> "media")
  const FILL = /^(on|of|with|in|a|an|the|at|for|and|to|by|from)$/i;
  const cw = query.split(' ').filter(w => !FILL.test(w) && !GENERIC.has(w.toLowerCase()));   // photo words only add noise to a search
  // full query, then content words, then the first pair, last pair and last word ("video editing timeline on monitor" -> "video editing")
  const variants = [...new Set([query, cw.join(' '), cw.slice(0, 2).join(' '), cw.slice(-2).join(' '), cw.at(-1), cw[0]].filter(Boolean))];
  // one query never costs more than STOCK_BUDGET_MS (default 25 s): a source that fails at the network level (timeout,
  // 5xx, no route) is dropped for the rest of this query instead of being retried with every variant (Openverse answered
  // 500 after 16 s on the build box and each query took minutes). Commons first: it is the faster keyless source.
  const deadline = Date.now() + +(process.env.STOCK_BUDGET_MS ?? 25000);
  for (const [name, fn] of [['commons', commons], ['openverse', openverse]]) {
    for (const v of variants) {
      if (cands.length || kind !== 'photo' || Date.now() > deadline) break;
      try { const raw = await fn(v, Math.max(3000, Math.min(12000, deadline - Date.now()))); cands = keep(raw); tried.push(`${name}:${v}:${cands.length}/${raw.length} on-topic`); }
      catch (e) { tried.push(`${name}:${v} failed: ${e.message}`); break; }
    }
  }
  const items = [];
  for (const [i, c] of cands.entries()) {
    if (items.length >= want || i >= want + 3 || Date.now() > deadline + 15000) break;
    if (!c.url) continue;
    const ext = kind === 'video' ? 'mp4' : 'jpg';
    const file = join(dir, `${items.length}.${ext}`);
    try {
      if (kind === 'video') await download(c.url, file, 60000);
      else { await download(c.url, file + '.raw'); normalise(file + '.raw', file); }
      items.push({ file, kind, query, ...c, credit: `${c.title ? '"' + c.title + '" ' : ''}by ${c.creator || 'unknown'} (${c.license}, via ${c.source})` });
    } catch (e) { rmSync(file + '.raw', { force: true }); rmSync(file, { force: true }); }
  }
  if (!items.length && kind === 'photo') {   // nothing on-topic in stock: Muse Image makes the picture, but only when MUSE_IMAGE=on (OFF: credit limit)
    const g = await museImage(query, join(dir, '0.png')).catch(e => ({ error: e.message }));
    if (g.ok) { normalise(g.file, join(dir, '0.jpg')); items.push({ file: join(dir, '0.jpg'), kind, query, title: query, creator: 'Muse Image', license: 'generated', source: 'muse-image', credit: 'generated by Muse Image' }); tried.push('muse-image'); }
    else tried.push(g.skipped ? `muse-image skipped (${g.why})` : `muse-image failed: ${g.error}`);
  }
  writeFileSync(metaFile, JSON.stringify({ v: 2, query, kind, tried, empty: !items.length && !tried.some(x => /failed/.test(x)), fetched: new Date().toISOString(), items }, null, 1));
  if (!items.length) return want === 1 ? null : [];
  return want === 1 ? items[0] : items;
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const [q, kind = 'photo'] = process.argv.slice(2);
  console.log(JSON.stringify(await fetchStock(q, { kind }), null, 1));
}
