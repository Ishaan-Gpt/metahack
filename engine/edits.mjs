// Prompt editing at near 0 credits: what a user types after the first render ("add a b-roll of a city", "zoom out",
// "captions a little funkier", "fix 'governate' to 'governorate'") is split into clauses, each clause is matched against a
// dictionary of edit functions by keywords, synonyms and fuzzy spelling (no model call), and the matched functions change
// the edit's plan (spec.card.json or spec.mix.json). The job then re-renders picture and sound only (engine/run.mjs with
// job.rerender), so no new transcription and no new director call. docs/EDIT-API.md lists the ops.
// usage: node engine/edits.mjs <job dir> --prompt "..."      or      node engine/edits.mjs <job dir> --ops '[{"op":...}]'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { applyWordOp, WORD_OPS } from './word-ops.mjs';

const ROOT = join(import.meta.dirname, '..');

// ---- text helpers -------------------------------------------------------------------------------------------------
const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}@'%.:\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = s => norm(s).split(' ').filter(Boolean);
function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
  return p[b.length];
}
// a typed word matches a keyword when it is the same, a simple inflection, or a near spelling ("zooom", "captons")
const near = (w, k) => w === k || (k.length > 3 && (w.startsWith(k) || k.startsWith(w) && w.length >= k.length - 2)) || (k.length >= 4 && lev(w, k) <= (k.length >= 8 ? 2 : 1));
const stripWord = w => w.replace(/^[^\p{L}\p{N}%$']+|[^\p{L}\p{N}%$']+$/gu, '');
const caseLike = (src, rep) => src === src.toUpperCase() && /\p{L}/u.test(src) ? rep.toUpperCase() : src[0] && src[0] === src[0].toUpperCase() && /\p{L}/u.test(src[0]) ? rep[0].toUpperCase() + rep.slice(1) : rep;

// ---- amounts: "a little", "a lot", numbers ---------------------------------------------------------------------------
function amount(t, base = 1) {
  const n = t.match(/(\d+(?:\.\d+)?)\s*(%|percent|x)?/);
  if (n && n[2] && /%|percent/.test(n[2])) return +n[1] / 100;
  if (/\b(a lot|much|way|very|really|super|loads)\b/.test(t)) return base * 2;
  if (/\b(a little|slightly|a bit|bit|tad|touch|little)\b/.test(t)) return base * 0.5;
  return base;
}
function timeIn(t) {
  const m = t.match(/\b(?:at|around|near|from)\s+(\d+):(\d{2})\b/) ?? t.match(/\b(?:at|around|near|from)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)?\b/);
  if (!m) return null;
  return m[2] !== undefined && m[0].includes(':') ? +m[1] * 60 + +m[2] : +m[1];
}

// ---- the dictionary: each edit function, the words that ask for it, and how to read its parameters -----------------
// kw: single words (fuzzy) or phrases (exact, worth more); need: at least one of these must be present; deny: never match
const DICT = [
  { op: 'caption.hide', kw: ['no captions', 'remove captions', 'hide captions', 'without captions', 'captions off', 'turn off captions', 'delete captions', 'no subtitles', 'remove subtitles'], need: ['caption', 'captions', 'subtitle', 'subtitles', 'text'], must: ['no', 'remove', 'hide', 'without', 'off', 'delete', 'kill', 'drop'], read: () => ({}) },
  { op: 'caption.show', kw: ['show captions', 'captions on', 'bring back captions', 'add captions', 'put captions back', 'turn on captions'], need: ['caption', 'captions', 'subtitle', 'subtitles'], must: ['show', 'on', 'back', 'bring', 'restore', 'add'], read: () => ({}) },
  { op: 'caption.preset', kw: ['funky', 'funkier', 'fun', 'playful', 'crazy', 'wild', 'quirky', 'cool', 'clean', 'cleaner', 'minimal', 'simple', 'bold', 'bolder', 'elegant', 'classy', 'serif', 'handwritten', 'script', 'marker', 'karaoke', 'highlight', 'neon', 'glow', 'retro', 'style', 'font', 'look', 'premium', 'cinematic', 'modern', 'loud', 'subtle', 'pop'],
    need: ['caption', 'captions', 'subtitle', 'subtitles', 'text', 'font', 'words', 'type', 'typography', 'lettering', 'funky', 'funkier', 'karaoke', 'handwritten', 'neon'], read: (t, c) => ({ name: pickPreset(t, c) }) },
  { op: 'caption.size', kw: ['bigger', 'larger', 'smaller', 'tinier', 'size', 'huge', 'tiny', 'enlarge', 'shrink', 'increase', 'decrease'], need: ['caption', 'captions', 'text', 'subtitle', 'subtitles', 'words', 'font', 'bigger', 'smaller'],
    read: t => ({ scale: /\b(smaller|tinier|tiny|shrink|decrease|less big)\b/.test(t) ? 1 - 0.15 * amount(t) : 1 + 0.15 * amount(t) }) },
  { op: 'caption.position', kw: ['higher', 'lower', 'move up', 'move down', 'raise', 'drop', 'up', 'down', 'top', 'bottom', 'position'], need: ['caption', 'captions', 'text', 'subtitle', 'subtitles', 'words'],
    read: t => ({ dy: (/\b(higher|raise|up|top)\b/.test(t) ? -1 : 1) * 0.05 * amount(t) }) },
  { op: 'caption.spacing', kw: ['spacing', 'space', 'spaced', 'gap', 'tighter', 'looser', 'spread', 'breathing room', 'cramped', 'airy'], need: ['spacing', 'space', 'spaced', 'gap', 'tighter', 'looser', 'cramped', 'airy', 'spread'],
    read: t => ({ line: (/\b(tight|tighter|less|closer|cramp|squeeze|space in)\b/.test(t) ? -1 : 1) * 6 * amount(t) }) },
  { op: 'caption.case', kw: ['caps', 'uppercase', 'capital', 'capitals', 'all caps', 'lowercase', 'sentence case', 'small letters'], need: ['caps', 'uppercase', 'capital', 'capitals', 'lowercase', 'case', 'letters'],
    read: t => ({ upper: !/\b(lowercase|lower case|sentence case|small letters|no caps|not caps)\b/.test(t) }) },
  { op: 'zoom', kw: ['zoom', 'zoomed', 'punch', 'closer', 'tighter shot', 'wider', 'wide', 'pull back', 'push in', 'crop', 'close up', 'closeup', 'face bigger'], need: ['zoom', 'zoomed', 'punch', 'closer', 'wider', 'wide', 'pull', 'push', 'crop', 'close', 'closeup', 'frame'],
    read: t => ({ scale: /\b(out|wider|wide|pull back|back|further|less)\b/.test(t) ? 1 - 0.08 * amount(t) : 1 + 0.1 * amount(t) }) },
  { op: 'broll.remove', kw: ['remove', 'delete', 'drop', 'without', 'fewer', 'less', 'no', 'take out', 'get rid'], need: ['broll', 'b-roll', 'roll', 'photos', 'photo', 'images', 'image', 'pictures', 'picture', 'footage', 'stock'], deny: ['add', 'insert', 'show'], must: ['remove', 'delete', 'drop', 'without', 'fewer', 'less', 'no', 'take', 'rid'],
    read: t => ({ at: timeIn(t) }) },
  { op: 'broll.add', kw: ['b-roll', 'broll', 'b roll', 'cutaway', 'photo', 'picture', 'image', 'stock', 'footage', 'visual', 'insert', 'overlay', 'show a', 'show an', 'show some'], need: ['broll', 'b-roll', 'roll', 'cutaway', 'photo', 'picture', 'image', 'stock', 'footage', 'visual', 'insert', 'overlay', 'show'],
    deny: ['remove', 'no', 'fewer', 'less', 'without'], read: (t, c) => ({ query: brollQuery(t, c), at: timeIn(t) }) },
  { op: 'music', kw: ['music', 'song', 'track', 'bed', 'background music', 'soundtrack', 'beat'], need: ['music', 'song', 'track', 'bed', 'soundtrack', 'beat', 'bgm'],
    read: t => /\b(no|remove|off|mute|without|kill|drop|stop)\b/.test(t) ? { on: false } : /\b(add|back|on|put|bring)\b/.test(t) && !/\b(louder|quieter|softer|lower|higher|down|up)\b/.test(t) ? { on: true } : { db: (/\b(quieter|softer|lower|down|less|reduce)\b/.test(t) ? -1 : 1) * 4 * amount(t) } },
  { op: 'sfx', kw: ['sound effects', 'sfx', 'whoosh', 'whooshes', 'effects sound', 'pops', 'swoosh', 'clicks', 'transitions sound'], need: ['sfx', 'effects', 'effect', 'whoosh', 'whooshes', 'pops', 'swoosh', 'clicks', 'sound'],
    read: t => /\b(no|remove|off|mute|without|kill|drop)\b/.test(t) ? { on: false } : /\b(add|back|on|bring)\b/.test(t) && !/\b(louder|quieter|softer)\b/.test(t) ? { on: true } : { db: (/\b(quieter|softer|lower|down|less)\b/.test(t) ? -1 : 1) * 4 * amount(t) } },
  { op: 'grade', kw: ['warmer', 'warm', 'cooler', 'cool', 'colder', 'brighter', 'bright', 'darker', 'dark', 'moody', 'punchier', 'contrast', 'saturated', 'vibrant', 'colourful', 'colorful', 'muted', 'desaturated', 'grade', 'colour', 'color', 'black and white', 'faded'], need: ['warmer', 'warm', 'cooler', 'colder', 'brighter', 'bright', 'darker', 'dark', 'moody', 'punchier', 'contrast', 'saturated', 'vibrant', 'colourful', 'colorful', 'muted', 'desaturated', 'grade', 'colour', 'color', 'faded', 'white'],
    deny: ['caption', 'captions', 'text', 'font'], read: t => gradeFrom(t) },
  { op: 'text.handle', kw: ['handle', 'username', 'my name', '@', 'put', 'add', 'tag'], need: ['handle', 'username', '@'], read: t => ({ text: (t.match(/@[\w.]+/) ?? [null])[0] }) },
  { op: 'engine', kw: ['creator mix', 'studio card', 'other style', 'different style', 'another style', 'switch style', 'change style', 'other engine', 'new look', 'different look'], need: ['mix', 'card', 'style', 'engine', 'look'],
    read: (t, c) => ({ name: /\bcreator|mix\b/.test(t) ? 'creator-mix' : /\bstudio|card\b/.test(t) ? 'card-studio' : (c.engine === 'creator-mix' ? 'card-studio' : 'creator-mix') }) },
];

let PRESETS = null;
function presets() { if (!PRESETS) { const f = join(ROOT, 'engine/caption-presets.json'); PRESETS = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}; } return PRESETS; }
function pickPreset(t, c) {
  const P = presets(), names = Object.keys(P);
  if (!names.length) return null;
  const STOPW = new Set(['make', 'more', 'less', 'captions', 'caption', 'subtitles', 'text', 'style', 'look', 'font', 'with', 'little', 'bit', 'please', 'them', 'into', 'like', 'want', 'words', 'word', 'change', 'give', 'turn']);
  const ts = tokens(t).filter(w => w.length > 3 && !STOPW.has(w));
  // a preset named in the prompt, or whose label/line shares a word with it ("funkier" ~ "funky")
  let best = null, bs = 0;
  for (const n of names) {
    const words = tokens(`${n.replace(/[-_]/g, ' ')} ${P[n].label ?? ''} ${P[n].line ?? ''}`);
    const s = ts.reduce((a, w) => a + (words.some(k => near(w, k)) ? (names.includes(w) ? 3 : 1) : 0), 0);
    if (s > bs) { bs = s; best = n; }
  }
  if (best) return best;
  // mood words with no preset name: map to the closest family, else the next preset after the current one
  const cur0 = c.spec?.captionPreset;
  const fam = [[/\b(funk|fun|playful|crazy|wild|quirky|pop|loud)/, /funk|fun|play|pop|marker|wild/], [/\b(clean|minimal|simple|subtle|modern)/, /clean|minimal|simple|modern/], [/\b(bold|strong|loud|impact)/, /bold|impact|heavy/], [/\b(elegant|classy|serif|premium|cinematic)/, /elegant|serif|classic|cinema|premium/], [/\b(neon|glow)/, /neon|glow/], [/\b(karaoke|highlight)/, /karaoke|highlight/], [/\b(hand|script|marker)/, /hand|script|marker/]];
  for (const [q, p] of fam) if (q.test(t)) { const hit = names.find(n => n !== cur0 && p.test(`${n} ${P[n].label ?? ''} ${P[n].line ?? ''}`.toLowerCase())); if (hit) return hit; }
  const cur = c.spec.captionPreset, i = names.indexOf(cur);
  return names[(i + 1) % names.length];
}
function brollQuery(t, c) {
  const m = t.match(/\b(?:of|showing|with|about)\s+(?:a |an |the |some )?([\p{L}\p{N}\s'-]{3,40}?)(?:\s+(?:at|around|near|here|there|please|now)\b|$)/u);
  if (m) return m[1].trim();
  // no subject named: the strongest noun spoken around that moment
  const at = timeIn(t) ?? 0, words = (c.spec.captions ?? []).flatMap(cp => cp.words);
  const cand = words.filter(w => Math.abs(w.t - at) < 6 && stripWord(w.w).length > 4).sort((a, b) => stripWord(b.w).length - stripWord(a.w).length)[0];
  return cand ? stripWord(cand.w) : 'city skyline';
}
function gradeFrom(t) {
  const k = amount(t), g = {};
  if (/\bwarm/.test(t)) g.warm = 0.04 * k; if (/\b(cool|cold)/.test(t)) g.warm = -0.04 * k;
  if (/\bbright/.test(t)) g.bright = 0.05 * k; if (/\b(dark|moody)/.test(t)) g.bright = -0.05 * k;
  if (/\b(punch|contrast|moody)/.test(t)) g.contrast = 0.08 * k; if (/\bfaded\b/.test(t)) g.contrast = -0.08 * k;
  if (/\b(saturated|vibrant|colou?rful)/.test(t)) g.sat = 0.15 * k; if (/\b(muted|desaturated)/.test(t)) g.sat = -0.2 * k; if (/black and white/.test(t)) g.sat = -1;
  return g;
}

// a clause asking to change text: "change X to Y", "replace X with Y", "fix X to Y", "spell X as Y", "X -> Y"
const NOT_TEXT = /^(the )?(captions?|subtitles?|text|font|style|look|music|song|zoom|colou?r|grade|handle|engine|size|position)\b/;
function textChange(raw) {
  const q = raw.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const pats = [
    /^(?:please\s+)?(?:change|replace|fix|correct|rename|swap|update|edit|make)\s+(?:the\s+)?(?:word\s+|text\s+|caption\s+|title\s+|spelling\s+(?:of\s+)?)?["']?(.+?)["']?\s+(?:to|with|into|as|->|=>)\s+["']?(.+?)["']?\s*\.?$/i,
    /^(?:please\s+)?(?:spell|write|say)\s+["']?(.+?)["']?\s+as\s+["']?(.+?)["']?\s*\.?$/i,
    /^["'](.+?)["']\s*(?:->|=>|→|should be|is)\s*["'](.+?)["']\s*\.?$/i,
    /^(?:it'?s|its|it is|should be|spell it)\s+["']?(.+?)["']?\s*,?\s*(?:not|instead of)\s+["']?(.+?)["']?\s*\.?$/i,   // "it's governorate, not governate" (find/replace swapped)
  ];
  for (const [n, p] of pats.entries()) {
    const m = q.match(p); if (!m) continue;
    let [find, rep] = [m[1].trim(), m[2].trim()];
    if (n === 3) [find, rep] = [rep, find];
    if (NOT_TEXT.test(find.toLowerCase()) && !/["']/.test(q)) return null;   // "change the captions to funkier" is a look, not a text fix
    if (!find || !rep || find.length > 60 || rep.length > 80) return null;
    return { op: 'caption.text', find, replace: rep };
  }
  return null;
}

/** prompt -> ops (no model call). Each clause is matched on its own; unmatched clauses are returned so the studio can say so. */
export function parse(prompt, ctx) {
  prompt = prompt.replace(/,\s*(not|instead of)\s+/gi, ' $1 ');   // "it's governorate, not governate" stays one clause
  const clauses = prompt.replace(/\s+(?:and then|then|also|plus)\s+/gi, ' , ').split(/\s*(?:[,;\n]|\.(?:\s|$)|\band\b(?=\s+(?:(?:a bit|a little|slightly|much)\s+)?(?:add|make|change|replace|fix|remove|zoom|put|turn|give|take|move|use|switch|bring|no|less|more|bigger|smaller|larger|higher|lower|louder|quieter|softer|warmer|cooler|brighter|darker|up|down|faster|slower|tighter|wider|funkier|cleaner|bolder|simpler|punchier|fancier|calmer)\b))\s*/i).map(s => s.trim()).filter(s => s.length > 1);
  const ops = [], unmatched = [];
  // the caption presets' own names are words that ask for that look ("hormozi captions", "like a terminal")
  const pe = DICT.find(d => d.op === 'caption.preset');
  if (!pe.named) { pe.named = true; for (const n of Object.keys(presets())) { pe.kw.push(...n.split('-').filter(w => w.length > 3)); pe.need.push(...n.split('-').filter(w => w.length > 3)); } }
  let subject = '';
  for (let c of clauses) {
    const sub = c.match(/\b(captions?|subtitles?|text|music|b-?roll|photos?|zoom|colou?rs?)\b/i);
    if (sub) subject = sub[1]; else if (subject && /\b(them|it|those|these|that)\b/i.test(c)) c = `${c} ${subject}`;
    const tc = textChange(c);
    if (tc) { ops.push(tc); continue; }
    const match = cl => {
      const t = norm(cl), ts = tokens(cl);
      let best = null, bs = 0;
      for (const d of DICT) {
        if (d.deny?.some(w => ts.includes(w))) continue;
        if (d.need && !d.need.some(k => k.includes(' ') ? t.includes(k) : ts.some(w => near(w, k)) || (k === '@' && t.includes('@')))) continue;
        if (d.must && !d.must.some(k => ts.includes(k))) continue;
        const s = 0.5 + d.kw.reduce((a, k) => a + (k === '@' ? (t.includes('@') ? 2 : 0) : k.includes(' ') ? (t.includes(k) ? 3 : 0) : (ts.some(w => near(w, k)) ? 1 : 0)), 0);
        if (s > bs) { bs = s; best = d; }
      }
      return best && { best, t };
    };
    // "bigger and higher": a clause with no subject of its own takes the one before it
    const m = match(c) ?? (!sub && subject ? match(`${c} ${subject}`) : null);
    if (!m) { unmatched.push(c); continue; }
    const { best, t } = m;
    const p = best.read(t, ctx);
    if (best.op === 'caption.preset' && !p.name) { unmatched.push(c); continue; }
    if (best.op === 'text.handle' && !p.text) { unmatched.push(c); continue; }
    ops.push({ op: best.op, ...p });
  }
  return { ops, unmatched };
}

// ---- appliers: each op changes the plan, and says what it did in plain words ------------------------------------------
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => { const o = { ...(a ?? {}) }; for (const [k, v] of Object.entries(b)) o[k] = isObj(v) && isObj(o[k]) ? merge(o[k], v) : v; return o; };
const setPath = (o, path, v) => { const ks = path.split('.'); let x = o; ks.slice(0, -1).forEach(k => { x[k] = isObj(x[k]) ? x[k] : {}; x = x[k]; }); x[ks.at(-1)] = v; };
const getPath = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);

/** the template the renderer starts from, so relative changes (bigger, higher) have a base */
function baseTemplate(engine, spec) {
  if (engine === 'creator-mix') return JSON.parse(readFileSync(join(ROOT, 'engine/templates/creator-mix.json'), 'utf8'));
  const base = JSON.parse(readFileSync(join(ROOT, 'engine/templates/card-studio.json'), 'utf8'));
  const f = join(ROOT, 'engine/styles', `${spec.style ?? 'card-studio'}.json`);
  return existsSync(f) ? merge(base, JSON.parse(readFileSync(f, 'utf8'))) : base;
}
const eff = (ctx, path) => getPath(ctx.spec.overrides ?? {}, path) ?? getPath(ctx.T, path);
const over = (ctx, path, v) => { ctx.spec.overrides = ctx.spec.overrides ?? {}; setPath(ctx.spec.overrides, path, v); };

/** every on-screen string a word can live in, for find/replace */
function* textSlots(spec) {
  for (const c of spec.captions ?? []) for (const w of c.words ?? []) yield { o: w, k: 'w' };
  for (const s of spec.segments ?? []) { for (const k of ['title', 'word']) if (typeof s[k] === 'string') yield { o: s, k }; for (const w of s.words ?? []) yield { o: w, k: 'w' }; for (const it of s.items ?? []) yield { o: it, k: 'text' }; }
  for (const f of spec.fx ?? []) { for (const k of ['word', 'phrase', 'helper']) if (typeof f[k] === 'string') yield { o: f, k }; if (Array.isArray(f.helpers)) for (let i = 0; i < f.helpers.length; i++) yield { o: f.helpers, k: i }; }
  if (Array.isArray(spec.cta)) for (let i = 0; i < spec.cta.length; i++) yield { o: spec.cta, k: i };
}
function replaceText(spec, find, rep) {
  const F = find.trim(), fl = F.toLowerCase(), single = !/\s/.test(F);
  let n = 0;
  const allWords = new Set([...textSlots(spec)].flatMap(s => String(s.o[s.k]).split(/\s+/).map(w => stripWord(w).toLowerCase())).filter(Boolean));
  // a misspelled find ("governate") still finds the word on screen ("Governorate") when it is the only close one
  let target = fl;
  if (single && !allWords.has(fl)) { const c = [...allWords].filter(w => lev(w, fl) <= Math.max(1, Math.floor(fl.length / 4))); if (c.length === 1) target = c[0]; }
  const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${esc})(?=$|[^\\p{L}\\p{N}])`, 'giu');
  for (const s of textSlots(spec)) {
    const v = String(s.o[s.k]);
    const nv = v.replace(re, (m, pre, hit) => { n++; return pre + caseLike(hit, rep); });
    if (nv !== v) s.o[s.k] = nv;
  }
  // a phrase across caption words ("going to" -> "gonna"): match over each caption's joined words
  if (!n && !single) for (const c of spec.captions ?? []) {
    const ws = c.words ?? [], joined = ws.map(w => stripWord(w.w).toLowerCase());
    const ft = fl.split(/\s+/);
    for (let i = 0; i + ft.length <= joined.length; i++) if (ft.every((f, j) => joined[i + j] === f)) {
      const rt = rep.split(/\s+/); ws[i].w = caseLike(ws[i].w, rt.join(' ')); for (let j = 1; j < ft.length; j++) ws[i + j].w = ''; n++;
    }
    c.words = ws.filter(w => w.w !== '');
  }
  return { n, target };
}

async function apply(op, ctx) {
  const S = ctx.spec, mix = ctx.engine === 'creator-mix';
  // word-level edits from the studio timeline (engine/word-ops.mjs, ported from Captions Easy's caption engine)
  if (WORD_OPS.includes(op.op)) return applyWordOp(S.captions ?? [], op, S.duration);
  switch (op.op) {
    case 'caption.text': { const r = replaceText(S, op.find, op.replace); return r.n ? `Changed “${r.target}” to “${op.replace}” in ${r.n} place${r.n > 1 ? 's' : ''}.` : `I could not find “${op.find}” on screen.`; }
    case 'caption.word': { const c = S.captions?.[op.i]; if (!c) return 'That caption is not there.'; const ws = String(op.text).split(/\s+/).filter(Boolean), d = (c.t1 - c.t0) / Math.max(1, ws.length); const hero = c.words.find(w => w.hero)?.w; c.words = ws.map((w, k) => ({ w, t: +(c.t0 + k * d).toFixed(3), hero: !!hero && stripWord(w).toLowerCase() === stripWord(hero).toLowerCase() })); if (!c.words.some(w => w.hero) && c.words.length) c.words.sort((a, b) => b.w.length - a.w.length)[0].hero = true, c.words.sort((a, b) => a.t - b.t); return `Caption ${op.i + 1} now reads “${op.text}”.`; }
    case 'caption.timing': { const c = S.captions?.[op.i]; if (!c) return 'That caption is not there.'; const t0 = Math.max(0, +op.t0), t1 = Math.min(S.duration, +op.t1); if (!(t1 > t0 + 0.2)) return 'A caption needs at least a fifth of a second.'; const k = (t1 - t0) / (c.t1 - c.t0); c.words.forEach(w => { w.t = +(t0 + (w.t - c.t0) * k).toFixed(3); }); c.t0 = +t0.toFixed(3); c.t1 = +t1.toFixed(3); return `Caption ${op.i + 1} now runs ${c.t0.toFixed(1)}–${c.t1.toFixed(1)} s.`; }
    case 'caption.delete': { if (!S.captions?.[op.i]) return 'That caption is not there.'; S.captions.splice(op.i, 1); return `Removed caption ${op.i + 1}.`; }
    case 'caption.hide': { if (S.captions?.length) { S.captionsHidden = S.captions; S.captions = []; } return 'Captions are off.'; }
    case 'caption.show': { if (S.captionsHidden) { S.captions = S.captionsHidden; delete S.captionsHidden; return 'Captions are back.'; } return 'Captions are already on.'; }
    case 'caption.preset': {
      const P = presets()[op.name]; if (!P) return `There is no caption look called “${op.name}”.`;
      if (mix) { // Creator Mix draws captions in its serif face with cyan/magenta hero words: carry the preset over to those keys
        const o = P.overrides ?? {}; if (o.fonts?.hero) over(ctx, 'fonts.serifItalic', o.fonts.hero); if (o.palette?.hero) { over(ctx, 'palette.cyan', o.palette.hero); over(ctx, 'palette.magenta', o.palette.heroStroke ?? o.palette.hero); }
      } else S.overrides = merge(S.overrides, P.overrides ?? {});
      S.captionPreset = op.name; return `Captions now use the ${P.label ?? op.name} look.`;
    }
    case 'caption.size': { for (const k of ['layout.caption.heroSize', 'layout.caption.smallSize']) { const v = eff(ctx, k); if (typeof v === 'number') over(ctx, k, Math.round(Math.min(v * 2.2, Math.max(v * 0.45, v * op.scale)))); } return op.scale > 1 ? 'Captions are bigger.' : 'Captions are smaller.'; }
    case 'caption.position': { const v = eff(ctx, 'layout.caption.yFrac') ?? 0.66; over(ctx, 'layout.caption.yFrac', +Math.min(0.86, Math.max(0.2, v + op.dy)).toFixed(3)); return op.dy < 0 ? 'Captions moved up.' : 'Captions moved down.'; }
    case 'caption.spacing': { const v = eff(ctx, 'layout.caption.lineGap') ?? 6; over(ctx, 'layout.caption.lineGap', Math.round(Math.max(-10, Math.min(40, v + (op.line ?? 0))))); return (op.line ?? 0) < 0 ? 'Caption lines sit closer together.' : 'Caption lines have more room.'; }
    case 'caption.case': { over(ctx, 'caption.heroUpper', !!op.upper); return op.upper ? 'Hero words are in caps.' : 'Hero words are in sentence case.'; }
    case 'zoom': {
      if (mix) { let changed = 0; for (const c of S.cam ?? []) { const z = Math.max(1, +(c.z0 * op.scale).toFixed(3)); if (z !== c.z0) changed++; c.z0 = z; } return changed ? (op.scale < 1 ? 'Zoomed out on every shot.' : 'Zoomed in on every shot.') : 'This is already as wide as the footage goes.'; }
      let changed = 0; for (const s of S.segments ?? []) if (Array.isArray(s.zoom)) { const z = s.zoom.map(v => Math.max(1, +(v * op.scale).toFixed(3))); if (z.join() !== s.zoom.join()) changed++; s.zoom = z; }
      const zl = eff(ctx, 'motion.zoomLevels'); if (Array.isArray(zl)) over(ctx, 'motion.zoomLevels', zl.map(v => Math.max(1, +(v * op.scale).toFixed(3))));
      return changed ? (op.scale < 1 ? 'Zoomed out on the speaker.' : 'Zoomed in on the speaker.') : 'This is already as wide as the footage goes.';
    }
    case 'broll.add': {
      if (mix) return 'Creator Mix places its photos itself; switch to Studio Card to add a photo where you want one.';
      const segs = S.segments ?? [], at = op.at;
      const fit = s => s.type === 'face' && s.t1 - s.t0 >= 1.4;
      let g = at != null ? segs.find(s => at >= s.t0 && at < s.t1 && s.type === 'face') : null;
      if (!g) g = (at != null ? segs.filter(fit).sort((a, b) => Math.abs((a.t0 + a.t1) / 2 - at) - Math.abs((b.t0 + b.t1) / 2 - at)) : segs.filter((s, i) => fit(s) && i > 0 && i < segs.length - 1))[0];
      if (!g) return 'There is no stretch of just you left to put a photo over.';
      let img = null;
      try { const { fetchStock } = await import('./stock.mjs'); const r = await fetchStock(op.query.toLowerCase()); if (r?.file) { img = relative(ctx.clip, r.file).replace(/\\/g, '/'); S.credits = [...(S.credits ?? []), { query: op.query, credit: r.credit, page: r.page, license: r.license }]; } } catch (e) { img = null; }
      if (img) { S.images = S.images ?? {}; S.images[op.query] = img; Object.assign(g, { type: 'split', shots: [{ query: op.query, t: g.t0, img }], enter: 'pop' }); return `Added a photo of “${op.query}” at ${g.t0.toFixed(1)} s.`; }
      Object.assign(g, { type: 'graphic', title: op.query, query: op.query, img: null, enter: 'wash' }); return `No photo of “${op.query}” came back, so I put it up as a title card at ${g.t0.toFixed(1)} s.`;
    }
    case 'broll.remove': {
      const hit = (S.segments ?? []).filter(s => ['graphic', 'split'].includes(s.type) && (op.at == null || (op.at >= s.t0 - 0.5 && op.at < s.t1 + 0.5)));
      for (const s of hit) { s.type = 'face'; s.zoom = s.zoom ?? [1, 1.04]; delete s.shots; delete s.img; s.enter = 'cut'; }
      return hit.length ? `Took out ${hit.length} photo${hit.length > 1 ? 's' : ''}.` : 'There are no photos there.';
    }
    case 'music': { if (op.on === false) { ctx.job.noMusic = true; return 'Music is off.'; } if (op.on === true) { ctx.job.noMusic = false; return 'Music is back.'; } ctx.job.noMusic = false; const v = eff(ctx, 'music.gainDb') ?? -27; over(ctx, 'music.gainDb', Math.max(-40, Math.min(-12, v + op.db))); return op.db > 0 ? 'Music is louder.' : 'Music is quieter.'; }
    case 'sfx': { const v = eff(ctx, 'sfx.gainDb') ?? -15; if (op.on === false) { over(ctx, 'sfx.gainDb', -99); return 'Sound effects are off.'; } if (op.on === true) { over(ctx, 'sfx.gainDb', -15); return 'Sound effects are back.'; } over(ctx, 'sfx.gainDb', Math.max(-40, Math.min(-4, (v < -60 ? -15 : v) + op.db))); return op.db > 0 ? 'Sound effects are louder.' : 'Sound effects are quieter.'; }
    case 'grade': { const g = S.gradeDelta ?? {}; for (const k of ['warm', 'bright', 'contrast', 'sat']) if (op[k]) g[k] = +((g[k] ?? 0) + op[k]).toFixed(3); S.gradeDelta = g; ctx.regrade = true; return 'Colour changed.'; }
    case 'text.handle': { S.handle = op.text; return `The handle is now ${op.text}.`; }
    case 'text.cta': { S.cta = [op.line1 ?? S.cta?.[0] ?? '', op.line2 ?? S.cta?.[1] ?? '']; return 'The call to action is updated.'; }
    case 'engine': { if (op.name === ctx.engine) return `It is already ${op.name === 'creator-mix' ? 'Creator Mix' : 'Studio Card'}.`; ctx.job.engine = op.name; ctx.fullRerun = true; return `Re-editing it as ${op.name === 'creator-mix' ? 'Creator Mix' : 'Studio Card'}.`; }
    default: return null;
  }
}

/** apply a prompt or ops to a finished job; writes the plan and job.json; returns what changed and what was not understood */
export async function editJob(jobDir, { prompt, ops } = {}) {
  const job = JSON.parse(readFileSync(join(jobDir, 'job.json'), 'utf8'));
  const clip = join(jobDir, 'clip'), engine = job.engine ?? 'card-studio';
  const specFile = join(clip, engine === 'creator-mix' ? 'spec.mix.json' : 'spec.card.json');
  if (!existsSync(specFile)) return { error: { code: 'NOT_READY', human: 'This edit has not finished its first render yet.' } };
  const spec = JSON.parse(readFileSync(specFile, 'utf8'));
  const ctx = { job, spec, engine, clip, T: baseTemplate(engine, spec), regrade: false, fullRerun: false };
  let parsed = { ops: ops ?? [], unmatched: [] };
  if (prompt) parsed = parse(prompt, ctx);
  const applied = [];
  for (const op of parsed.ops) { const said = await apply(op, ctx); if (said) applied.push({ op: op.op, said }); }
  if (!applied.length) return { applied, unmatched: parsed.unmatched, changed: false };
  spec.edits = [...(spec.edits ?? []), { at: new Date().toISOString(), prompt: prompt ?? null, ops: parsed.ops }];
  writeFileSync(specFile, JSON.stringify(spec, null, 1));
  job.rerender = !ctx.fullRerun; job.regrade = ctx.regrade || !!job.regrade;
  writeFileSync(join(jobDir, 'job.json'), JSON.stringify(job, null, 1));
  return { applied, unmatched: parsed.unmatched, changed: true, full: ctx.fullRerun };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const [dir] = process.argv.slice(2), a = process.argv, opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : undefined; };
  if (!dir) { console.error('usage: node engine/edits.mjs <job dir> --prompt "..." | --ops \'[...]\' | --parse "..."'); process.exit(1); }
  if (opt('--parse')) { console.log(JSON.stringify(parse(opt('--parse'), { spec: { captions: [] }, engine: 'card-studio' }), null, 1)); process.exit(0); }
  const r = await editJob(dir, { prompt: opt('--prompt'), ops: opt('--ops') ? JSON.parse(opt('--ops')) : undefined });
  console.log(JSON.stringify(r));
}
