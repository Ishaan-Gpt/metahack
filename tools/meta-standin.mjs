// TEST-ONLY stand-in for the two Meta Model API endpoints Card Studio calls. NOT Meta, NOT a model.
// It exists because there is no real MODEL_API_KEY on the build box: it takes the exact request shapes and answers in
// the exact response shapes of
//   POST /v1/asr/transcribe       (Muse Voice Transcribe: multipart `request` JSON + `audio` WAV -> transcript + turns)
//   POST /v1/chat/completions     (Muse Spark with response_format json_schema -> choices[0].message.content JSON)
// Transcription runs local faster-whisper (engine/hear_local.py) and returns only what Meta returns (turn times, no word
// times). The "plan" is a deterministic keyword heuristic, so a run through the stand-in proves the plumbing, caching and
// rule checks, not Meta's judgement. Every answer carries the header `x-meta-standin: 1`, and engine/meta.mjs records
// `standin: true` in meta-usage.json. Token counts in its usage block are estimates (characters / 4).
// usage: node tools/meta-standin.mjs [port=8799]   then   META_API_BASE=http://127.0.0.1:8799/v1 MODEL_API_KEY=standin node engine/card-studio.mjs ...
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PORT = +(process.argv[2] ?? process.env.META_STANDIN_PORT ?? 8799);
const ROOT = join(import.meta.dirname, '..');
const WORK = process.env.STANDIN_TMP ?? (process.platform === 'linux' ? '/dev/shm' : tmpdir());
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'x-meta-standin': '1' }); res.end(JSON.stringify(obj)); };
const err = (res, code, message) => send(res, code, { error: { message, type: 'invalid_request_error', code } });
const body = req => new Promise((ok, no) => { const b = []; req.on('data', d => b.push(d)); req.on('end', () => ok(Buffer.concat(b))); req.on('error', no); });

// ---- /v1/asr/transcribe ----
async function transcribe(req, res, url) {
  const raw = await body(req);
  if (raw.length > 32 * 1024 * 1024) return err(res, 413, 'Request body exceeds 32 MB');
  let form; try { form = await new Request('http://x', { method: 'POST', headers: { 'content-type': req.headers['content-type'] ?? '' }, body: raw }).formData(); } catch (e) { return err(res, 400, 'expected multipart/form-data with parts request and audio'); }
  let request; try { const r = form.get('request'); request = JSON.parse(typeof r === 'string' ? r : await r.text()); } catch { return err(res, 400, 'request part must be JSON'); }
  if (request.model !== 'muse-voice-transcribe-1.0') return err(res, 400, `unknown model ${request.model}`);
  if (request.audioEncoding !== 'WAV') return err(res, 400, 'audioEncoding must be WAV');
  const mode = request.mode ?? 'ENDPOINTING';
  if (!['ENDPOINTING', 'DIARIZATION', 'PUSH_TO_TALK'].includes(mode)) return err(res, 400, `unknown mode ${mode}`);
  const audio = form.get('audio'); if (!audio || typeof audio === 'string') return err(res, 400, 'audio part missing');
  const wav = Buffer.from(await audio.arrayBuffer());
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') return err(res, 400, 'Audio is not a supported WAV file');
  const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22), bits = wav.readUInt16LE(34);
  if (ch !== 1 || bits !== 16 || ![16000, 24000].includes(rate)) return err(res, 400, 'Convert it to mono, 16-bit PCM WAV at 16 kHz or 24 kHz.');
  const dur = (wav.length - 44) / (rate * 2);
  if (dur > 600) return err(res, 400, 'Audio exceeds 10 minutes');
  const dir = mkdtempSync(join(WORK, 'meta-standin-'));
  try {
    writeFileSync(join(dir, 'a.wav'), wav);
    await new Promise((ok, no) => execFile(process.env.PYTHON ?? 'python3', [join(ROOT, 'engine/hear_local.py'), join(dir, 'a.wav'), join(dir, 'w.json'), process.env.WHISPER_MODEL ?? 'small'], { timeout: 900000 }, (e, so, se) => e ? no(new Error(se || e.message)) : ok()));
    const words = JSON.parse(readFileSync(join(dir, 'w.json'), 'utf8'));
    // endpointing, imitated: a turn ends at a sentence mark or a pause over 0.45 s
    const turns = []; let cur = [];
    words.forEach((w, i) => { cur.push(w); const nx = words[i + 1]; if (!nx || /[.?!]/.test(w.p ?? '') || nx.t - w.end > 0.45) { turns.push(cur); cur = []; } });
    const out = mode === 'PUSH_TO_TALK' ? [] : turns.map((ws, k) => ({ turnId: k + 1, startMs: Math.round(ws[0].t * 1000), endMs: Math.round(ws.at(-1).end * 1000), transcript: ws.map(w => w.word + (w.p ?? '')).join(' '), ...(mode === 'DIARIZATION' ? { speaker: 'A' } : {}) }));
    send(res, 200, { sessionId: url.searchParams.get('sessionId') ?? createHash('sha256').update(wav).digest('hex').slice(0, 16), transcript: words.map(w => w.word + (w.p ?? '')).join(' '), audioDurationMs: Math.round(dur * 1000), turns: out });
  } catch (e) { err(res, 500, 'Processing exceeds the server budget: ' + e.message.slice(0, 200)); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---- /v1/chat/completions (the Card Studio plan only) ----
const STOP = new Set('because completely entire actually really very also a an the and or but so to of in on at for with from by is are was were be been am i you he she it we they me my your our this that these those there here then than just only not no do does did have has had will would can could should what which who how why when where if as about into out up down over very really also too even still much many more most some any all each every other just like yeah okay oh um uh hey well right now gonna im its it\'s dont don\'t thats that\'s going get got make made know think want need say see look use come take give find tell thing things stuff way guys people hello hi'.split(' '));
// concrete, photographable searches for words that search badly on their own (the stand-in's stand-in for judgement)
const CONCEPTS = [
  [/^(movie|movies|film|films|cinema|filmmaking)$/, 'film camera on set'],
  [/^(editor|editors|editing|edit|edits|edited)$/, 'person editing video on laptop'],
  [/^(video|videos|clip|clips|footage)$/, 'video editing timeline on monitor'],
  [/^(animation|animations|animated|effects|vfx)$/, 'animator drawing on graphics tablet'],
  [/^(social|media|instagram|tiktok|reel|reels|feed)$/, 'hands holding phone scrolling social media'],
  [/^(youtube|youtuber|channel|vlog)$/, 'youtuber filming at desk with camera'],
  [/^(marketing|brand|brands|business|businesses|company|startup)$/, 'marketing team planning at whiteboard'],
  [/^(ai|agent|agents|model|models|automation|automatic|automatically)$/, 'laptop screen with ai chatbot'],
  [/^(money|cash|dollar|dollars|salary|income|paid|pay)$/, 'stack of dollar bills on table'],
  [/^(views|followers|audience|crowd|viral|fans)$/, 'crowd cheering at concert'],
  [/^(code|coding|software|tool|tools|app|apps|program|programmer|developer)$/, 'programmer typing code on laptop'],
  [/^(phone|smartphone|mobile)$/, 'hand holding smartphone close up'],
  [/^(camera|shoot|shooting|record|recording)$/, 'camera on tripod filming'],
  [/^(content|creator|creators|influencer)$/, 'content creator filming with phone'],
  [/^(hackathon|hackathons|build|building|project)$/, 'developers working on laptops at hackathon'],
  [/^(meta|facebook)$/, 'person using facebook on laptop'],
  [/^(time|minutes|hours|fast|quick|quickly)$/, 'stopwatch close up'],
];
const ICONS = [[/^instagram|^reels?$/, 'ig'], [/^youtube/, 'yt'], [/^tiktok/, 'tt'], [/^facebook$|^meta$/, 'fb'], [/^twitter$/, 'x'], [/^(like|likes|love)$/, 'heart'], [/^(video|videos|watch|watching)$/, 'play'],
  [/^(comment|comments|chat|message|messages)$/, 'chat'], [/^(subscribe|notification|notifications)$/, 'bell'], [/^(money|cash|paid|salary|dollars?)$/, 'cash'], [/^(growth|views|results|grow)$/, 'chart'], [/^(camera|film|movie|shoot|editor|editing)$/, 'camera']];
const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, '');
function planFor(segments) {
  const fits = [];
  const BR = new Set(['graphic', 'split', 'wide', 'post', 'orbit']);
  const out = segments.map((s, k) => {
    const toks = String(s.text).split(/\s+/).filter(Boolean), ws = toks.map(norm).filter(Boolean);
    const content = ws.filter(w => !STOP.has(w) && w.length > 2);
    const hero = (toks.find(t => /\d/.test(t)) ? norm(toks.find(t => /\d/.test(t))) : null) ?? [...content].sort((a, b) => b.length - a.length || ws.indexOf(a) - ws.indexOf(b))[0] ?? ws[0] ?? 'this';
    const heroTok = toks.find(t => norm(t) === hero) ?? toks[0] ?? 'the';
    const queries = [];
    for (const w of ws) for (const [re, q] of CONCEPTS) if (re.test(w) && !queries.includes(q)) queries.push(q);
    if (!queries.length) queries.push(`${hero} close up photo`);
    const icons = []; for (const w of ws) for (const [re, ic] of ICONS) if (re.test(w) && !icons.includes(ic)) icons.push(ic);
    if (ws.includes('social') && ws.includes('media') && !icons.length) icons.push('ig', 'tt');
    let layout = s.rule;
    const dur = s.t1 - s.t0, matched = queries[0] && !queries[0].endsWith('close up photo');
    fits.push({ k, ws, toks, matched, dur });
    return { i: s.i, layout: 'face', hero: heroTok.replace(/[.?!,;:"]+$/, ''), icons: icons.slice(0, 2), queries: queries.slice(0, 2), transition: 'cut' };
  });
  // deterministic layout assignment (stand-in heuristic): first and last segment face; every other layout goes to the
  // segment whose words fit it best, so a plan aims at all 8 layouts the way the real prompt asks
  const n = out.length, RX = {
    wide: ws => ws.some(w => /\d|^(hundreds?|thousands?|millions?|billions?|percent|double|triple)$/.test(w)) ? 4 : 0,
    post: ws => ws.some(w => /^(post|posts|posting|upload|share|sharing|click|tap|subscribe|download|free|app)$/.test(w)) ? 4 : 0,
    orbit: ws => ws.some(w => /^(market|marketing|business|brand|audience|followers|everyone|world|reach|platform|platforms|social)$/.test(w)) ? 4 : 0,
    topsquare: ws => ws.some(w => /^(but|however|also|yet|instead|not)$/.test(w)) ? 3 : 0,
    list: ws => Math.min(3, ws.filter(w => !STOP.has(w) && w.length > 2).length * 0.4),
    split: (ws, f) => f.matched ? 3 + f.dur * 0.2 : -1,
    graphic: (ws, f) => f.matched ? 2.5 + (f.dur < 2.8 ? 0.5 : 0) : -1,
  };
  const taken = new Set([0, n - 1]);
  for (const lay of ['wide', 'post', 'list', 'orbit', 'topsquare', 'split', 'graphic']) {
    let best = -1, bs = -0.5;
    fits.forEach((f, k) => { if (taken.has(k)) return; const sc = RX[lay](f.ws, f) + 0.01 * (k % 3); if (sc > bs) { bs = sc; best = k; } });
    if (best >= 0) { out[best].layout = lay; taken.add(best); }
  }
  out.forEach((it, k) => {
    const prev = out[k - 1];
    it.transition = k === 0 ? 'cut' : it.layout === 'graphic' ? 'wash' : prev && ['graphic', 'post'].includes(prev.layout) ? 'wipe' : ['split', 'orbit', 'wide'].includes(it.layout) ? 'pop' : 'cut';
  });
  return out;
}
async function chat(req, res) {
  let j; try { j = JSON.parse((await body(req)).toString('utf8')); } catch { return err(res, 400, 'body must be JSON'); }
  if (!/^muse-spark/.test(j.model ?? '')) return err(res, 400, `unknown model ${j.model}`);
  if (!Array.isArray(j.messages) || !j.messages.length) return err(res, 400, 'messages required');
  if (j.response_format?.type !== 'json_schema' || !j.response_format.json_schema?.schema) return err(res, 400, 'this stand-in only answers the Card Studio json_schema plan');
  if (j.reasoning_effort === 'none') return err(res, 400, 'reasoning_effort "none" is not supported by Muse Spark');
  const userMsg = j.messages.filter(m => m.role === 'user').at(-1)?.content ?? '';
  let input; try { input = JSON.parse(userMsg); } catch { return err(res, 400, 'stand-in expects the Card Studio user message (JSON transcript + segments)'); }
  const plan = { segments: planFor(input.segments ?? []) };
  if (process.env.STANDIN_BREAK != null) for (const n of String(process.env.STANDIN_BREAK).split(',')) { const it = plan.segments[+n]; if (it) it.layout = 'not-a-layout'; }   // to test the per-segment fallback
  const content = JSON.stringify(plan);
  const promptChars = j.messages.reduce((a, m) => a + String(m.content).length, 0) + JSON.stringify(j.response_format).length;
  const prompt_tokens = Math.ceil(promptChars / 4), completion_tokens = Math.ceil(content.length / 4);
  if (j.max_tokens && completion_tokens > j.max_tokens) return send(res, 200, { id: 'chatcmpl-standin', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: j.model, choices: [{ index: 0, message: { role: 'assistant', content: content.slice(0, j.max_tokens * 4) }, finish_reason: 'length' }], usage: { prompt_tokens, completion_tokens: j.max_tokens, total_tokens: prompt_tokens + j.max_tokens } });
  send(res, 200, { id: 'chatcmpl-standin-' + createHash('sha256').update(userMsg).digest('hex').slice(0, 12), object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: j.model,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }], usage: { prompt_tokens, completion_tokens, total_tokens: prompt_tokens + completion_tokens } });
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  console.log(new Date().toISOString(), req.method, url.pathname);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, standin: true });
  if (!/^Bearer \S+/.test(req.headers.authorization ?? '')) return err(res, 401, 'missing Authorization: Bearer <MODEL_API_KEY>');
  try {
    if (req.method === 'POST' && url.pathname === '/v1/asr/transcribe') return await transcribe(req, res, url);
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') return await chat(req, res);
    err(res, 404, 'not served by the Card Studio test stand-in');
  } catch (e) { err(res, 500, e.message); }
}).listen(PORT, '127.0.0.1', () => console.log(`meta stand-in (TEST ONLY) on http://127.0.0.1:${PORT}/v1`));
