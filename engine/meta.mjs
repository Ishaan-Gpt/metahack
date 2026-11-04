// Card Studio's Meta Model API layer: the theme REQUIRES MODEL_API_KEY and makes exactly two Meta calls per video.
//   1. Muse Voice Transcribe (POST {base}/asr/transcribe, multipart: request JSON + WAV) -> transcript + speech turns.
//      Meta returns turn-level times only (no word times, by Meta's docs), so word times inside each turn are placed by
//      plain code (wordsFromTurns: the turn's words spread over its voiced 10 ms frames, weighted by syllables).
//   2. ONE Muse Spark chat call (POST {base}/chat/completions) with a strict json_schema: the whole transcript plus the
//      rule director's segment list in, one plan per segment out (layout, hero word, icons, stock queries, transition).
// One attempt each: no retries, no feedback, no multi-turn. Both answers are cached under <clip dir>/meta/ keyed by
// sha256 of the input audio (and of the transcript + segments for the plan), so a re-run makes zero calls.
// Every call (or cache hit) is written to <clip dir>/meta-usage.json.
// META_API_BASE overrides the base URL (default https://api.meta.ai/v1); tools/meta-standin.mjs is a TEST-ONLY stand-in.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from './env.mjs';

export const KEY_ERROR = 'MODEL_API_KEY is required for the Card Studio theme (Meta Model API)';
export const TRANSCRIBE_MODEL = 'muse-voice-transcribe-1.0';
export const SPARK_MODEL = 'muse-spark-1.3';
export const metaBase = () => (process.env.META_API_BASE || 'https://api.meta.ai/v1').replace(/\/+$/, '');
export const sha256 = b => createHash('sha256').update(b).digest('hex');

/** Exit before any work when the Meta key is missing (read the way engine/env.mjs reads it: env, then .env.local). */
export function requireMetaKey() {
  loadEnv();
  const key = process.env.MODEL_API_KEY;
  if (!key || !key.trim()) { console.error(KEY_ERROR); process.exit(2); }
  return key.trim();
}

// ---- usage log -------------------------------------------------------------------------------------------------
const usagePath = dir => join(dir, 'meta-usage.json');
export function resetUsage(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(usagePath(dir), JSON.stringify({ run_started: new Date().toISOString(), base: metaBase(), calls_made: 0, cache_hits: 0, calls: [] }, null, 1));
}
function recordUsage(dir, entry) {
  let u = existsSync(usagePath(dir)) ? JSON.parse(readFileSync(usagePath(dir), 'utf8')) : null;
  if (!u) { resetUsage(dir); u = JSON.parse(readFileSync(usagePath(dir), 'utf8')); }
  u.calls = u.calls.filter(c => c.call !== entry.call);   // one entry per call kind per run
  u.calls.push(entry);
  u.calls_made = u.calls.filter(c => !c.cache_hit).length;
  u.cache_hits = u.calls.filter(c => c.cache_hit).length;
  const tok = u.calls.map(c => c.usage?.total_tokens ?? 0).reduce((a, b) => a + b, 0);
  u.spark_tokens = tok || null;
  writeFileSync(usagePath(dir), JSON.stringify(u, null, 1));
  return u;
}
export function usageSummary(dir) {
  if (!existsSync(usagePath(dir))) return 'meta: no usage recorded';
  const u = JSON.parse(readFileSync(usagePath(dir), 'utf8'));
  const part = c => `${c.call} ${c.cache_hit ? 'cache hit' : 'called'}${c.usage?.total_tokens ? ` (${c.usage.prompt_tokens} in / ${c.usage.completion_tokens} out tokens)` : c.audio_seconds ? ` (${c.audio_seconds} s audio)` : ''}`;
  return `meta: ${u.calls_made} call${u.calls_made === 1 ? '' : 's'}, ${u.cache_hits} cache hit${u.cache_hits === 1 ? '' : 's'}: ${u.calls.map(part).join('; ')}${u.calls.some(c => c.standin) ? ' [TEST stand-in]' : ''}`;
}

// ---- call 1: Muse Voice Transcribe ---------------------------------------------------------------------------
/** wav: mono 16-bit PCM WAV at 16 kHz (prep writes voice.wav that way). Returns Meta's JSON answer (cached). */
export async function metaTranscribe(dir, wavPath, { key = requireMetaKey() } = {}) {
  const wav = readFileSync(wavPath), h = sha256(wav);
  const cdir = join(dir, 'meta'); mkdirSync(cdir, { recursive: true });
  const cache = join(cdir, `transcribe.${h.slice(0, 16)}.json`);
  if (existsSync(cache)) {
    const c = JSON.parse(readFileSync(cache, 'utf8'));
    recordUsage(dir, { call: 'transcribe', model: TRANSCRIBE_MODEL, cache_hit: true, audio_sha256: h, cache: 'meta/' + cache.split('/').pop(), standin: !!c.standin });
    return c.response;
  }
  const request = { model: TRANSCRIBE_MODEL, audioEncoding: 'WAV', mode: 'ENDPOINTING' };
  const fd = new FormData();
  fd.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  fd.append('audio', new Blob([wav], { type: 'audio/wav' }), 'voice.wav');
  const t0 = performance.now();
  const r = await fetch(`${metaBase()}/asr/transcribe?sessionId=card-studio-${h.slice(0, 12)}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, body: fd });
  const text = await r.text();
  const seconds = +((performance.now() - t0) / 1000).toFixed(2);
  if (!r.ok) {
    recordUsage(dir, { call: 'transcribe', model: TRANSCRIBE_MODEL, cache_hit: false, ok: false, status: r.status, seconds });
    throw new Error(`Muse Voice Transcribe answered ${r.status}: ${text.slice(0, 300)}`);
  }
  const response = JSON.parse(text);
  if (typeof response.transcript !== 'string' || !Array.isArray(response.turns)) throw new Error('Muse Voice Transcribe answer has no transcript/turns');
  const standin = r.headers.get('x-meta-standin') === '1';
  writeFileSync(cache, JSON.stringify({ audio_sha256: h, request, response, standin, at: new Date().toISOString() }, null, 1));
  recordUsage(dir, { call: 'transcribe', model: TRANSCRIBE_MODEL, cache_hit: false, ok: true, seconds, audio_sha256: h, audio_seconds: +((response.audioDurationMs ?? 0) / 1000).toFixed(1), turns: response.turns.length, usage: null, standin });
  return response;
}

/** Plain code: Meta's turns (text + start/end ms) -> [{word, t, end, p?}] on the audio clock. Inside a turn each word
 *  gets a share of the turn's VOICED frames (10 ms RMS above an adaptive floor) in proportion to its syllables, so
 *  pauses inside a turn get no words. Deterministic. */
export function wordsFromTurns(turns, wavPath) {
  const pcm = readPcm16(wavPath), sr = pcm.rate, hop = Math.round(sr / 100);
  const n = Math.floor(pcm.data.length / hop), rms = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = i * hop; j < (i + 1) * hop; j++) s += pcm.data[j] * pcm.data[j]; rms[i] = Math.sqrt(s / hop); }
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.1)] ?? 0, loud = sorted[Math.floor(n * 0.95)] ?? 1;
  const thr = floor + (loud - floor) * 0.08;
  const syl = w => Math.max(1, (w.toLowerCase().replace(/[^a-z0-9]/g, '').match(/[aeiouy]+/g) ?? []).length) + (/\d/.test(w) ? w.replace(/\D/g, '').length * 0.6 : 0);
  const out = [];
  for (const turn of turns) {
    const toks = String(turn.transcript ?? '').trim().split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    const a = Math.max(0, Math.floor(turn.startMs / 10)), b = Math.min(n, Math.ceil(turn.endMs / 10));
    let voiced = []; for (let i = a; i < b; i++) if (rms[i] > thr) voiced.push(i);
    if (voiced.length < toks.length * 3) voiced = Array.from({ length: Math.max(1, b - a) }, (_, k) => a + k);
    const wts = toks.map(syl), total = wts.reduce((x, y) => x + y, 0);
    let acc = 0;
    toks.forEach((tok, k) => {
      const i0 = Math.min(voiced.length - 1, Math.floor(acc / total * voiced.length));
      acc += wts[k];
      const i1 = Math.min(voiced.length - 1, Math.max(i0, Math.ceil(acc / total * voiced.length) - 1));
      const m = tok.match(/[.?!,;:]+$/), word = tok.replace(/[.?!,;:]+$/, '').replace(/^["'(]+|["')]+$/g, '');
      if (!word) { if (m && out.length) out.at(-1).p = m[0]; return; }
      const t = +(voiced[i0] / 100).toFixed(3), end = +Math.max(t + 0.05, (voiced[i1] + 1) / 100).toFixed(3);
      const e = { word, t, end }; if (m) e.p = m[0]; out.push(e);
    });
  }
  return out;
}
function readPcm16(p) {
  const b = readFileSync(p);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file: ' + p);
  let o = 12, rate = 16000, ch = 1, bits = 16;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === 'data') {
      if (bits !== 16) throw new Error('WAV must be 16-bit PCM');
      const len = Math.min(size, b.length - o - 8) >> 1, data = new Float32Array(Math.floor(len / ch));
      for (let i = 0; i < data.length; i++) data[i] = b.readInt16LE(o + 8 + i * 2 * ch) / 32768;
      return { rate, data };
    }
    o += 8 + size + (size & 1);
  }
  throw new Error('WAV has no data chunk');
}

// ---- call 2: ONE Muse Spark plan -----------------------------------------------------------------------------
export function planSchema({ layouts, icons, transitions }) {
  return {
    type: 'object', additionalProperties: false, required: ['segments'],
    properties: { segments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['i', 'layout', 'hero', 'icons', 'queries', 'transition'], properties: {
      i: { type: 'integer', description: 'segment index, as given' },
      layout: { type: 'string', enum: layouts },
      hero: { type: 'string', description: 'ONE word copied from this segment text: the word the caption highlights' },
      icons: { type: 'array', items: { type: 'string', enum: icons }, description: '0 to 2 icons, only when the words name or clearly imply them' },
      queries: { type: 'array', items: { type: 'string' }, description: '1 to 2 stock photo searches: concrete, visible things (3 to 6 words), e.g. "film camera on set"' },
      transition: { type: 'string', enum: transitions },
      background: { type: 'string', enum: ['blur', 'pale', 'warm'], description: 'only for layout textbehind: the backdrop behind the big word (blur = darkened copy of the video, pale = the theme pale card, warm = dark warm gradient); leave blur otherwise' },
    } } } },
  };
}
const SYSTEM = L => `You plan a short vertical talking-head video in the "Card Studio" style. You get the full transcript and a numbered list of segments (start, end, text, and the layout the rule director chose). For EVERY segment return exactly one plan item:
- layout: one of ${L.layouts.join(', ')}. face = speaker in the card (default, most segments). graphic = face hidden, a full stock photo (short, for one concrete noun). split = stock photo on top, face below (a concrete thing being explained). list = items listed over the face (only when the words list 2 to 4 things). post = big words with a button tap (posting, sharing, apps, calls to action). wide = face left with big words right (numbers, a strong claim). orbit = small face with platform icons around it (social media, reach, audience). topsquare = face square on top with the caption below (a turn: "but", "not just"). textbehind = ONE huge word behind the speaker's head and shoulders (the code cuts the person out), for a segment with one strong short keyword (a noun, number or verb of 3 to 8 letters); use it on exactly one segment of 1.5 s or more, not the first or last. Keep the first and last segment as face. HARD RULE: use every one of the layouts at least once across the video when there are enough segments (the code checks this afterwards and fixes any you missed), give each layout to the segment whose words fit it best, never two graphic in a row, and change layout between neighbouring segments where you can.
- hero: ONE word copied exactly from the segment text, the word the frame is about.
- icons: 0 to 2 from ${L.icons.join(', ')}, only when the words name or clearly imply them (ig instagram, yt youtube, tt tiktok, fb facebook, x twitter/x).
- queries: 1 to 2 stock photo searches of concrete, photographable things that match the meaning (not the literal word): "film camera on set", "person editing video on laptop", never abstract words.
- background: for textbehind only, blur, pale or warm (vary it); blur for every other layout.
- transition: into this segment, one of ${L.transitions.join(', ')} (cut between face segments; wash into graphic; pop into split; wipe out of graphic or post).
Answer only with the JSON object.`;

/** One Spark call (cached). Returns { plan, valid: Map(i -> item), invalid: [{i, why}], cache_hit }. */
export async function metaPlan(dir, { transcript, segments, layouts, icons, transitions }, { key = requireMetaKey() } = {}) {
  const user = JSON.stringify({ transcript, segments });
  const schema = planSchema({ layouts, icons, transitions });
  const h = sha256(JSON.stringify({ user, schema, model: SPARK_MODEL, system: SYSTEM({ layouts, icons, transitions }) }));
  const cdir = join(dir, 'meta'); mkdirSync(cdir, { recursive: true });
  const cache = join(cdir, `plan.${h.slice(0, 16)}.json`);
  let response, cacheHit = false, standin = false, seconds = 0, status = 200;
  // output budget: about 70 tokens of JSON per segment + the wrapper, plus headroom for the minimal reasoning pass
  // (Meta counts reasoning tokens inside max_tokens)
  const maxTokens = Math.min(8192, 1024 + 160 + 70 * segments.length);
  const body = { model: SPARK_MODEL, messages: [{ role: 'system', content: SYSTEM({ layouts, icons, transitions }) }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: { name: 'card_studio_plan', strict: true, schema } }, temperature: 0, reasoning_effort: 'minimal', max_tokens: maxTokens };
  if (existsSync(cache)) {
    const c = JSON.parse(readFileSync(cache, 'utf8')); response = c.response; cacheHit = true; standin = !!c.standin;
  } else {
    const t0 = performance.now();
    const r = await fetch(`${metaBase()}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    seconds = +((performance.now() - t0) / 1000).toFixed(2); status = r.status; standin = r.headers.get('x-meta-standin') === '1';
    const text = await r.text();
    if (!r.ok) {
      recordUsage(dir, { call: 'plan', model: SPARK_MODEL, cache_hit: false, ok: false, status, seconds, max_tokens: maxTokens });
      console.warn(`Muse Spark answered ${status}: ${text.slice(0, 200)} (one attempt only; the rule director plans every segment)`);
      return { plan: null, valid: new Map(), invalid: segments.map(s => ({ i: s.i, why: `call failed ${status}` })), cache_hit: false };
    }
    response = JSON.parse(text);
    writeFileSync(cache, JSON.stringify({ key_sha256: h, request: { ...body, messages: '(system + transcript + segments; see meta/plan.request.json)' }, response, standin, at: new Date().toISOString() }, null, 1));
    writeFileSync(join(cdir, 'plan.request.json'), JSON.stringify(body, null, 1));
  }
  const usage = response.usage ?? null;
  recordUsage(dir, { call: 'plan', model: SPARK_MODEL, cache_hit: cacheHit, ok: true, seconds, max_tokens: maxTokens, usage, finish_reason: response.choices?.[0]?.finish_reason ?? null, cache: 'meta/' + cache.split('/').pop(), standin });
  let plan = null; const invalid = [], valid = new Map();
  try { const txt = response.choices?.[0]?.message?.content ?? ''; plan = JSON.parse(txt); } catch (e) { plan = null; }
  if (!plan || !Array.isArray(plan.segments)) {
    for (const s of segments) invalid.push({ i: s.i, why: 'answer is not the schema object' });
    return { plan, valid, invalid, cache_hit: cacheHit };
  }
  const byI = new Map(); for (const it of plan.segments) if (it && Number.isInteger(it.i) && !byI.has(it.i)) byI.set(it.i, it);
  for (const s of segments) {
    const it = byI.get(s.i), why = validateItem(it, s, { layouts, icons, transitions });
    if (why) invalid.push({ i: s.i, why }); else valid.set(s.i, it);
  }
  return { plan, valid, invalid, cache_hit: cacheHit };
}
/** Schema check for one plan item (the server constrains decoding, but a stand-in or a proxy might not). */
export function validateItem(it, seg, { layouts, icons, transitions }) {
  if (!it || typeof it !== 'object') return 'missing';
  const keys = ['i', 'layout', 'hero', 'icons', 'queries', 'transition'];
  if (Object.keys(it).some(k => ![...keys, 'background'].includes(k)) || keys.some(k => !(k in it))) return 'keys differ from the schema';
  if ('background' in it && !['blur', 'pale', 'warm'].includes(it.background)) return `background "${it.background}" not allowed`;
  if (!layouts.includes(it.layout)) return `layout "${it.layout}" not in the menu`;
  if (!transitions.includes(it.transition)) return `transition "${it.transition}" not allowed`;
  if (!Array.isArray(it.icons) || it.icons.length > 2 || it.icons.some(x => !icons.includes(x))) return 'icons not from the list (0 to 2)';
  if (!Array.isArray(it.queries) || it.queries.length < 1 || it.queries.length > 2 || it.queries.some(q => typeof q !== 'string' || q.trim().length < 3 || q.length > 60)) return 'queries must be 1 to 2 short strings';
  const norm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, '');
  if (typeof it.hero !== 'string' || !seg.text.split(/\s+/).some(w => norm(w) === norm(it.hero) && norm(w))) return `hero "${it.hero}" is not a word of the segment`;
  return null;
}
