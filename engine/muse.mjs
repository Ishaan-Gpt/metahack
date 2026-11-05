// Muse model map: every Meta Muse model this project is built to use, in one place, with an on/off switch each.
//
// STATUS TODAY (read this first): the project runs on ordinary API keys, used minimally, because Meta Model API credits
// are low. Every Muse path below is WRITTEN and WIRED, and every one that costs credits is switched OFF by default
// ("OFF: credit limit"). Flip one with an environment variable (MUSE_<NAME>=on) and the pipeline uses it; with it off the
// pipeline falls back to the local / free route named in `fallback`. Nothing here is hidden: `node engine/muse.mjs`
// prints this table, and run.mjs / creator-mix.mjs print it at the start of every job.
//
// What has actually been exercised: the Spark + Voice Transcribe wire code was tested against a local TEST stand-in
// (tools/meta-standin.mjs), never against Meta's live API (no key yet). The other paths are untested against the real services;
// where we could not confirm the exact request shape from Meta's public pages the comment says UNVERIFIED.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const OFF = 'OFF: credit limit';
/** model id as listed on dev.meta.ai/products/meta-model-api (ids marked "page" come from the model page, not the price table) */
export const MUSE = {
  spark:      { model: 'muse-spark-1.3',               role: 'Director: style pick + one plan call per video (strict JSON schema)', where: 'engine/meta.mjs metaPlan / metaChooseStyle', live: 'with MODEL_API_KEY', fallback: 'free Gemini API, then plain-rules director' },
  transcribe: { model: 'muse-voice-transcribe-1.0',    role: 'Hears the take: every word and speech turn', where: 'engine/meta.mjs metaTranscribe', live: 'with MODEL_API_KEY', fallback: 'local faster-whisper (free)' },
  wonder:     { model: 'muse-wonder-1.0',              role: 'Plan critic: reads the finished plan and flags beats that contradict the transcript before rendering', where: 'engine/muse.mjs museCritique (function written; not hooked into a job yet)', live: OFF, fallback: 'the plain-code validators (validateItem)' },
  image:      { model: 'muse-image',                   role: 'Makes the photo for a noun when stock search finds nothing relevant ($0.01 an image)', where: 'engine/muse.mjs museImage (hooked in engine/stock.mjs fetchStock)', live: OFF, fallback: 'Openverse / Wikimedia Commons stock' },
  sam:        { model: 'sam-3-1',                      role: 'Cuts the speaker out (and tracks them) for text-behind and colour worlds', where: 'engine/muse.mjs museSam (function written; mask-to-matte conversion not written yet)', live: OFF, fallback: 'local u2net person matte (engine/person_matte.py)' },
  glimmer:    { model: 'muse-glimmer (open weights, 30B, Apache 2.0)', role: 'Local director: the same two calls served from your own GPU through an OpenAI-compatible server', where: 'engine/meta.mjs postChat (MUSE_LOCAL=glimmer)', live: OFF, fallback: 'Meta API, Gemini, or rules' },
  sparkopen:  { model: 'muse-spark-open (open weights)', role: 'Local director, same slot as Glimmer, for take-heavy jobs', where: 'engine/meta.mjs postChat (MUSE_LOCAL=sparkopen)', live: OFF, fallback: 'Meta API, Gemini, or rules' },
  code:       { model: 'Muse Code (coding agent)',      role: 'Development tool, not a runtime dependency: nothing in the pipeline calls it', where: 'n/a', live: 'not used at runtime', fallback: 'n/a' },
};
export const museOn = name => (process.env['MUSE_' + name.toUpperCase()] ?? '').toLowerCase() === 'on';
export const museBase = () => (process.env.META_API_BASE || 'https://api.meta.ai/v1').replace(/\/+$/, '');
const skipped = name => ({ skipped: true, why: `${MUSE[name].model}: ${OFF} (set MUSE_${name.toUpperCase()}=on to use it)`, fallback: MUSE[name].fallback });
const key = () => { const k = (process.env.MODEL_API_KEY ?? '').trim(); if (!k) throw new Error('MODEL_API_KEY is required for Muse paths'); return k; };
const post = async (path, body) => {
  const r = await fetch(museBase() + path, { method: 'POST', headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(+(process.env.META_TIMEOUT_MS ?? 120000)) });
  const t = await r.text(); if (!r.ok) throw new Error(`${path} answered ${r.status}: ${t.slice(0, 200)}`); return JSON.parse(t);
};

/** Muse Image: one picture for a noun. OFF by default. UNVERIFIED: the OpenAI-style /images/generations path and the b64_json reply are
 *  assumed from "point your OpenAI SDK compatible client at Meta Model API"; check Meta's API docs before turning it on. */
export async function museImage(prompt, outFile) {
  if (!museOn('image')) return skipped('image');
  const j = await post('/images/generations', { model: 'muse-image', prompt, n: 1, response_format: 'b64_json' });
  const b64 = j.data?.[0]?.b64_json; if (!b64) throw new Error('Muse Image answered without an image');
  mkdirSync(dirname(outFile), { recursive: true }); writeFileSync(outFile, Buffer.from(b64, 'base64')); return { ok: true, file: outFile, model: 'muse-image' };
}

/** SAM 3.1: box + mask for a noun phrase in one frame ("person"). OFF by default. UNVERIFIED: the request shape; Meta's SAM page only says
 *  "give SAM 3.1 a short noun phrase naming one thing, and it returns a box and a mask for every match". */
export async function museSam(imageB64Png, phrase = 'person') {
  if (!museOn('sam')) return skipped('sam');
  return { ok: true, model: 'sam-3-1', response: await post('/segment', { model: 'sam-3-1', image: imageB64Png, prompt: phrase }) };
}

/** Muse Wonder as a plan critic: one chat call, JSON back. OFF by default. The chat shape is the same one engine/meta.mjs already uses for Spark. */
export async function museCritique(transcript, planSummary) {
  if (!museOn('wonder')) return skipped('wonder');
  const j = await post('/chat/completions', { model: 'muse-wonder-1.0', temperature: 0, messages: [
    { role: 'system', content: 'You check an edit plan against the transcript. Answer JSON {"problems":[{"beat":number,"why":string}]}; empty list when fine.' },
    { role: 'user', content: JSON.stringify({ transcript, plan: planSummary }) }] });
  return { ok: true, model: 'muse-wonder-1.0', problems: JSON.parse(j.choices?.[0]?.message?.content ?? '{"problems":[]}').problems };
}

/** Open-weight local director (Glimmer / Spark Open): any OpenAI-compatible server you run (llama.cpp, vLLM). MUSE_LOCAL=glimmer|sparkopen,
 *  MUSE_LOCAL_BASE=http://127.0.0.1:8080/v1, MUSE_LOCAL_MODEL=<served model name>. Returns null when off. */
export const localDirector = () => {
  // test fallback while there is no real Meta key: an OpenAI-compatible director; shown everywhere as the test director
  const mk = (process.env.MODEL_API_KEY ?? '').trim(), standin = /127\.0\.0\.1|localhost/.test(process.env.META_API_BASE ?? '');
  if (!process.env.MUSE_LOCAL && (process.env.DIRECTOR ?? '').toLowerCase() !== 'claude' && (process.env.GROQ_API_KEY ?? '').trim() && (!mk || mk === 'standin' || standin))
    return { which: 'groq', base: 'https://api.groq.com/openai/v1', model: process.env.GROQ_DIRECTOR_MODEL || 'openai/gpt-oss-120b', key: process.env.GROQ_API_KEY.trim(), label: 'test' };
  const w = (process.env.MUSE_LOCAL ?? '').toLowerCase();
  if (!['glimmer', 'sparkopen'].includes(w)) return null;
  return { which: w, base: (process.env.MUSE_LOCAL_BASE ?? 'http://127.0.0.1:8080/v1').replace(/\/+$/, ''), model: process.env.MUSE_LOCAL_MODEL ?? (w === 'glimmer' ? 'muse-glimmer' : 'muse-spark-open') };
};

/** the table, as text (printed at the start of every job and by `node engine/muse.mjs`) */
export function museTable() {
  const on = n => n === 'spark' || n === 'transcribe' ? (process.env.MODEL_API_KEY ? 'LIVE (Meta key set)' : 'ready, no key: ' + MUSE[n].fallback) : n === 'code' ? MUSE[n].live : (museOn(n) || (localDirector()?.which === n) ? 'ON' : OFF);
  return Object.entries(MUSE).map(([n, m]) => `  ${n.padEnd(10)} ${m.model.padEnd(34)} ${on(n)}`).join('\n');
}
if (import.meta.url === `file://${process.argv[1]}`) console.log('Muse model map (engine/muse.mjs)\n' + museTable());
