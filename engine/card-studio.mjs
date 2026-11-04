// Card Studio director: transcript + face track -> spec.card.json. The rule director tiles the timeline; then ONE Muse
// Spark call (engine/meta.mjs, required MODEL_API_KEY, cached) picks per segment the layout, hero word, icons, stock
// searches and transition. Rules still enforce every budget on the model's picks; render, timing and zoom stay code.
// usage: node engine/card-studio.mjs <raw.mp4 | clip dir> [--out out.mp4] [--badge "Meta AI"] [--handle "@me"] [--cta1 ..] [--cta2 ..] [--kw WORD] [--no-stock] [--no-music]
// Decides, per sentence: face card (with a jump zoom at sentence boundaries), keyword graphic card (face hidden),
// split (stock image on top, face below), bullet list over the face, or a big-text post card for numbers.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, loadEnv } from './env.mjs';
import { fetchStock, picturable } from './stock.mjs';
import { directorModel, metaPlan, requireMetaKey, resetUsage, usageSummary } from './meta.mjs';
import { loadStyle } from './styles.mjs';
const PY = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');   // Windows: python3 is the Store stub

// what the model may choose from (the theme's own names; the player draws exactly these)
export const LAYOUTS = ['face', 'graphic', 'split', 'list', 'post', 'wide', 'orbit', 'topsquare', 'textbehind'];
export const ICONS = ['ig', 'yt', 'tt', 'fb', 'x', 'heart', 'play', 'chat', 'bell', 'cash', 'chart', 'camera'];
export const TRANSITIONS = ['cut', 'wash', 'wipe', 'pop'];
const BROLL = new Set(['graphic', 'split', 'wide', 'post', 'orbit']);
const TB_MIN = 1.5, TB_MAX = 2.5;   // text-behind holds 1.5 to 2.5 s

const STOP = new Set(`a an the and or but so to of in on at for with from by is are was were be been being am i you he she it we they me
my your our their his her its this that these those there here then than just only not no do does did done doing have has had having will
would can could should shall may might must what which who whom how why when where if as about into out up down over under again very
really also too even still much many more most some any all each every other another same own such both few lot lots thing things something
anything everything nothing stuff way ways kind sort like yeah yes okay ok oh um uh hey well right now today gonna wanna gotta let lets let's
im i'm you're youre it's its we're they're don't dont can't cant didn't won't isn't aren't that's thats there's what's i've you've we've i'll
you'll i'd he's she's because since while though although whether through during before after above below between off once one two
get got getting make makes made making go goes going went gone know knew think thought want wanted need needed say said says see saw seen
look looking use used come came take took give gave find found tell told feel felt try tried call called seem keep kept put mean means meant
start started show showed hear play run move believe bring happen happens sit stand set learn change lead understand watch stop speak read
spend grow open walk win offer remember love consider appear buy wait serve send expect build stay fall cut reach remain actually basically
literally probably maybe sure good great best better big little pretty quite ever never always already yet guys guy people person`.split(/\s+/));
// concrete, picturable nouns get a bonus when choosing B-roll (stock search works best on them)
const VISUAL = new Set(`money cash dollar dollars coin coins bank wallet card phone phones smartphone laptop computer screen app apps website internet
social media instagram youtube tiktok facebook twitter camera video videos photo photos city cities street car cars road traffic house home
office desk meeting team business company brand store shop market marketing billboard magazine newspaper tv television ad ads advert crowd
audience stage concert festival party wedding food coffee restaurant kitchen gym fitness workout running football cricket game games gaming
school college university student students book books library classroom teacher doctor hospital health medicine water ocean beach mountain
mountains forest tree trees nature sun sunset moon space rocket planet earth world map flag plane airport train travel hotel robot ai chip
code coding programmer data server cloud graph chart stock stocks gold diamond fire light lights night rain snow dog cat bird baby family
friends kids children clock time calendar factory energy solar battery electric engine music guitar piano microphone podcast studio
farm shopping delivery package truck ship boat bike bicycle shoes clothes fashion art painting design paper letter email mail chat message
startup founder investor investors growth success award trophy job jobs work career interview salary rent bill bills budget savings
editor editors clip clips animation animations effects film films movie movies cinema creator creators content views followers likes
subscribers channel post posts reel reels upload uploads agent agents tool tools software keyboard results audience`.split(/\s+/));
const BIG = /^(\d[\d,.]*|hundreds?|thousands?|millions?|billions?|trillions?|percent|tens|double|triple)$/i;
const POST = /^(post|posts|posting|upload|uploads|uploading|share|sharing|click|tap|subscribe|download|free|app)$/i;
const ORBIT = /^(market|marketing|business|businesses|brand|audience|followers|everyone|world|reach|platform|platforms|social)$/i;
const TURN = /^(but|however|also|yet|instead)$/i;
const GLUE = /^(of|to|the|a|an|and|for|that|with|in|on|at|by|from|or)$/i;
const clean = w => w.toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, '');

export function heroScore(w) {
  const c = clean(w.word); if (!c || STOP.has(c)) return -9;
  let s = Math.min(c.length, 9) / 3;
  if (BIG.test(c) || /\d/.test(c)) s += 4;
  if (VISUAL.has(c)) s += 1;
  if (/(ly)$/.test(c)) s -= 1.5;
  return s;
}
export function stockScore(w, i, ws) {
  const c = clean(w.word); if (!c || STOP.has(c) || c.length < 3 || /\d/.test(c)) return -9;
  let s = 0;
  if (VISUAL.has(c) || VISUAL.has(c.replace(/s$/, ''))) s += 4;
  if (c.length >= 5) s += 1;
  if (/(ing|ed|ly|ous|ful|ive|able|ible)$/.test(c)) s -= 2;
  if (i > 0 && /^[A-Z]/.test(w.word) && !ws[i - 1].p) s += 1.5; // a capitalised word mid-sentence: a name or a brand
  return s;
}

/** Sentences: split at . ? ! and at long gaps, keep each between 1.2 s and ~6 s by splitting long ones at commas. */
export function sentences(words, D) {
  const out = []; let cur = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]; cur.push({ ...w, i });
    const nx = words[i + 1];
    const dur = w.end - cur[0].t, gap = nx ? nx.t - w.end : 9;
    // with punctuation: sentence ends; without (some speech-to-text output has none): breaths and a 2.5-4.5 s rhythm
    const end = /[.?!]/.test(w.p ?? '') || !nx || gap > 0.6 || (/[,;:]/.test(w.p ?? '') && dur > 3) || (dur > 2.5 && gap > 0.18 && !GLUE.test(nx.word)) || (dur > 3.6 && !GLUE.test(nx.word)) || dur > 5;
    if (end) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out.map((ws, k) => ({ k, words: ws, t0: k === 0 ? 0 : ws[0].t, text: ws.map(w => w.word).join(' ') }))
    .map((s, k, a) => ({ ...s, t1: k + 1 < a.length ? a[k + 1].words[0].t : D }));
}

/** Caption chunks of 1-3 words, each with one hero word (big lime serif) when it has a content word. */
export function chunks(words, R) {
  const out = []; let cur = [];
  const flush = () => { if (cur.length) out.push(cur); cur = []; };
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = cur.at(-1);
    if (prev && (w.t - prev.end > R.chunkGap || cur.length >= R.chunkMaxWords || (cur.map(x => x.word).join(' ') + ' ' + w.word).length > R.chunkMaxChars)) flush();
    cur.push(w);
    if (/[.?!,;:]/.test(w.p ?? '')) flush();
  }
  flush();
  return out.map((ws, k) => {
    let hero = -1, best = 0.9;
    ws.forEach((w, j) => { const s = heroScore(w); if (s > best) { best = s; hero = j; } });
    const t0 = ws[0].t, nextT = out[k + 1]?.[0].t ?? ws.at(-1).end + 0.4;
    return { t0: +t0.toFixed(3), t1: +Math.min(nextT, ws.at(-1).end + 0.7).toFixed(3), words: ws.map((w, j) => ({ w: w.word, t: w.t, hero: j === hero })) };
  });
}

/** List items in a sentence ("a magazine, a billboard" / "X, Y and Z"), plain rules. */
export function listItems(ws) {
  const commas = ws.filter((w, j) => /,/.test(w.p ?? '') && j < ws.length - 1).length;
  // lists: "a magazine, a billboard" / "X, Y and Z": a comma followed by the same determiner, or 2+ commas of short parts
  const DET = /^(a|an|the|your|my|our|their|his|her)$/i;
  let items = [];
  for (let j = 0; j < ws.length - 1; j++) {
    if (!/,/.test(ws[j].p ?? '') || !DET.test(ws[j + 1].word)) continue;
    const d0 = [j - 1, j - 2, j - 3].find(m => m >= 0 && ws[m].word.toLowerCase() === ws[j + 1].word.toLowerCase());
    if (d0 == null) continue;
    const first = ws.slice(d0 + 1, j + 1).filter(w => !STOP.has(clean(w.word)));
    const nxt = []; for (let m = j + 2; m < Math.min(ws.length, j + 5); m++) { if (STOP.has(clean(ws[m].word)) && nxt.length) break; if (!STOP.has(clean(ws[m].word))) nxt.push(ws[m]); if (/[,.]/.test(ws[m].p ?? '')) break; }
    if (first.length && nxt.length) { if (!items.length) items.push({ text: first.map(w => w.word).join(' '), t: ws[d0].t }); items.push({ text: nxt.map(w => w.word).join(' '), t: ws[j + 1].t }); }
  }
  if (!items.length && commas >= 2) {
    const parts = []; let cur = [];
    for (const w of ws) { cur.push(w); if (/,/.test(w.p ?? '')) { parts.push(cur); cur = []; } }
    if (cur.length) parts.push(cur);
    if (parts.every(p => p.length <= 4)) items = parts.map(p => { const c = p.filter(w => !STOP.has(clean(w.word))); return { text: c.map(w => w.word).join(' '), t: p[0].t }; }).filter(x => x.text.length > 1).slice(0, 4);
  }
  return items;
}

function phraseAround(ws, j) {
  // "social media": take the content word before the keyword when it is adjacent and not a stop word
  const a = ws[j - 1], c = ws[j];
  const ok = w => w && !STOP.has(clean(w.word)) && clean(w.word).length > 2 && !/(ly|ing)$/.test(clean(w.word));
  if (ok(a) && !a.p) return `${a.word} ${c.word}`;
  const b = ws[j + 1];
  if (ok(b) && !c.p && (VISUAL.has(clean(b.word)) || VISUAL.has(clean(c.word)))) return `${c.word} ${b.word}`;
  return c.word;
}

export async function direct(dir, opts = {}) {
  loadEnv();
  if (!opts.noModel) requireMetaKey();
  const T = loadStyle(opts.style);   // the chosen style: Card Studio's template + its overrides (engine/styles.mjs)
  // auto mode mixes the styles' fundamentals: the chosen style's look (frame, type, colours, grade, sound) with every
  // layout any style uses, so each beat gets the device that fits its words best
  if (opts.mix) delete T.allow;
  const ALLOW = t => !T.allow || T.allow.includes(t);
  const R = { ...T.rules }, M = T.motion;
  const words = JSON.parse(readFileSync(join(dir, 'words.json'), 'utf8'));
  const cut = JSON.parse(readFileSync(join(dir, 'cut.json'), 'utf8'));
  const D = cut.duration;
  // short clips (< 20 s): shorter holds so all 9 edit types still fit with a change every 2-3 s
  const SHORT = D < 20, MINHOLD = SHORT ? 1.2 : 1.35, TARGET = SHORT ? 2.1 : 2.6;
  if (SHORT) Object.assign(R, { graphicMin: 1.1, splitMin: 1.3, bigtextMin: 1.2, graphicMax: 2.0, splitMax: 3.0, bigtextMax: 2.4 });
  // face track: OpenCV pass on the edit's picture (or the browser bake's faces.json when it exists)
  const facesPath = join(dir, 'faces.cv.json');
  if (!existsSync(facesPath)) {
    try { execFileSync(PY, [join(ROOT, 'engine/faces.py'), join(dir, 'cut.mp4'), facesPath, '5'], { stdio: 'inherit', timeout: 600000 }); }
    catch (e) { console.warn('face pass failed, framing on the centre:', e.message); }
  }
  let faces = existsSync(facesPath) ? JSON.parse(readFileSync(facesPath, 'utf8')) : null;
  if (!faces && existsSync(join(dir, 'faces.json'))) {
    const b = JSON.parse(readFileSync(join(dir, 'faces.json'), 'utf8')); // browser bake: px boxes in 1080x1920
    faces = { fps: b.fps, w: 1080, h: 1920, boxes: b.faces.map((f, i) => f ? [i / b.fps, f[0] / 1080, f[1] / 1920, f[2] / 1080, f[3] / 1920] : [i / b.fps, null]) };
  }
  const faceAt = (t0, t1) => { // median face box over a window: one static framing per segment = no jitter
    const v = (faces?.boxes ?? []).filter(b => b[1] != null && b[0] >= t0 - 0.2 && b[0] <= t1 + 0.2).map(b => b.slice(1));
    const all = v.length >= 2 ? v : (faces?.boxes ?? []).filter(b => b[1] != null).map(b => b.slice(1));
    if (!all.length) return faces?.median ?? [0.5, 0.36, 0.3, 0.17];
    const med = k => { const s = all.map(x => x[k]).sort((a, b) => a - b); return +s[s.length >> 1].toFixed(4); };
    return [med(0), med(1), med(2), med(3)];
  };
  const faceRatio = faces ? faces.boxes.filter(b => b[1] != null).length / Math.max(1, faces.boxes.length) : 0;

  const S = sentences(words, D);
  // merge very short sentences into the next so zooms never flicker
  for (let k = 0; k < S.length - 1; k++) if (S[k].t1 - S[k].t0 < R.minSentence) { S[k + 1].words = [...S[k].words, ...S[k + 1].words]; S[k + 1].t0 = S[k].t0; S[k + 1].text = S[k].text + ' ' + S[k + 1].text; S.splice(k, 1); k--; }

  // candidates for B-roll, scored
  const cands = [];
  for (const s of S) {
    const ws = s.words;
    const bigIdx = ws.findIndex(w => BIG.test(clean(w.word)) || /\d/.test(w.word));
    const commas = ws.filter((w, j) => /,/.test(w.p ?? '') && j < ws.length - 1).length;
    const kws = ws.map((w, j) => ({ j, w, s: stockScore(w, j, ws) })).filter(x => x.s >= 1).sort((a, b) => b.s - a.s);
    if (bigIdx >= 0) {
      // numbers: the wide card, face left, the words on the right as they are spoken
      const a = Math.max(s.t0, ws[Math.max(0, bigIdx - 1)].t - 0.1);
      const inWin = ws.filter(w => w.t >= a - 0.01).slice(0, 6);
      const b = Math.min(s.t1, a + R.bigtextMax, inWin.at(-1).end + 0.5);
      cands.push({ type: 'wide', s, score: 6, t0: a, t1: b, words: inWin.filter(w => w.t < b).map(w => ({ w: w.word, t: w.t, big: BIG.test(clean(w.word)) || /\d/.test(w.word) })) });
    }
    const postIdx = ws.findIndex(w => POST.test(clean(w.word)));
    if (postIdx >= 0) {
      // posting / sharing / apps: the post card, the words below the face, a cursor taps the button
      const a = Math.max(s.t0, ws[Math.max(0, postIdx - 2)].t - 0.1);
      const inWin = ws.filter(w => w.t >= a - 0.01).slice(0, 7);
      const b = Math.min(s.t1, a + R.bigtextMax, inWin.at(-1).end + 0.6);
      cands.push({ type: 'post', s, score: 5.5, t0: a, t1: b, words: inWin.filter(w => w.t < b).map(w => ({ w: w.word, t: w.t })) });
    }
    const orbIdx = ws.findIndex(w => ORBIT.test(clean(w.word)));
    if (orbIdx >= 0) {
      // reach / business / social: face shrinks to a small landscape card, platform icons orbit it, the line as a title
      const a = s.t0, b = Math.min(s.t1, a + R.bigtextMax);
      const title = ws.filter(w => w.t < b).map(w => w.word).slice(0, 6).join(' ');
      cands.push({ type: 'orbit', s, score: 5, t0: a, t1: b, title });
    }
    const turnIdx = ws.findIndex((w, j) => TURN.test(w.word) && (j === 0 || /,/.test(ws[j - 1].p ?? '') || /^(but|however)$/i.test(w.word)));
    const notIdx = ws.findIndex((w, j) => /^not$/i.test(w.word) && /^(just|only)$/i.test(ws[j + 1]?.word ?? ''));
    const ti = turnIdx >= 0 ? turnIdx : notIdx;
    if (ti >= 0) {
      // a turn in the argument ("but also", "not just"): face in a top square, the caption on the pale lower half
      const a = ti === 0 ? s.t0 : Math.max(s.t0, ws[ti].t - 0.1);
      cands.push({ type: 'topsquare', s, score: 4.8, t0: a, t1: Math.min(s.t1, a + 3.5) });
    }
    const items = listItems(ws);
    if (items.length >= 2) {
      const a = Math.max(s.t0, items[0].t - 0.6);
      cands.push({ type: 'list', s, score: 7, t0: s.t0, t1: s.t1, items: items.slice(0, 4) });
    }
    if (kws.length && kws[0].s >= R.stockScoreMin) {
      cands.push({ type: 'visual', s, score: kws[0].s, kws: kws.filter(k => k.s >= R.stockScoreMin - 1) });
    }
  }
  // choose greedily by score under the budgets
  const brollMax = R.brollMaxFrac * D, hiddenMax = R.hiddenMaxFrac * D;
  let broll = 0, hidden = 0, visualCount = 0;
  const chosen = [];
  const free = (a, b) => a >= R.hookFace && b <= D - R.tailFace && chosen.every(c => b + R.faceBetween <= c.t0 || a >= c.t1 + R.faceBetween);
  // pick the best candidate, then make every other candidate of the same layout less attractive (variety: each edit type shows up)
  const used = {};
  const pool = [...cands];
  while (pool.length) {
    pool.sort((x, y) => (y.score - 2.5 * (used[y.type] ?? 0)) - (x.score - 2.5 * (used[x.type] ?? 0)) || x.s.t0 - y.s.t0);
    const c = pool.shift();
    const n0 = chosen.length;
    pick(c);
    if (chosen.length > n0) used[c.type] = (used[c.type] ?? 0) + 1;
  }
  function pick(c) {
    if (chosen.some(x => x.s === c.s)) return;
    if (c.type === 'visual') {
      // alternate the two visual layouts: graphic card (face hidden, short) and split (face stays, longer)
      const asGraphic = visualCount % 2 === 0 && c.kws[0].w.t + 0.0 < c.s.t1;
      const k0 = c.kws[0];
      if (asGraphic) {
        const a = Math.max(c.s.t0, k0.w.t - 0.25), b = Math.min(c.s.t1, a + R.graphicMax);
        if (b - a < R.graphicMin || !free(a, b) || hidden + (b - a) > hiddenMax || broll + (b - a) > brollMax) return;
        const title = phraseAround(c.s.words, k0.j);
        chosen.push({ type: 'graphic', s: c.s, t0: a, t1: b, query: stockScore(c.s.words[k0.j - 1] ?? { word: '' }, 0, [{}]) >= 1 && title.includes(' ') ? title : k0.w.word, title });
        hidden += b - a; broll += b - a; visualCount++;
      } else {
        const a = c.s.t0, b = Math.min(c.s.t1, a + R.splitMax);
        if (b - a < R.splitMin || !free(a, b) || broll + (b - a) * 0.5 > brollMax) return;
        const ks0 = c.kws.filter(k => k.w.t < b).sort((x, y) => x.j - y.j), ks = [];
        for (const k of ks0) { const last = ks.at(-1); if (last && k.j === last.j2 + 1) { last.q += ' ' + k.w.word; last.j2 = k.j; } else ks.push({ q: k.w.word, j2: k.j, t: k.w.t }); }
        chosen.push({ type: 'split', s: c.s, t0: a, t1: b, shots: ks.slice(0, 3).map((k, n) => ({ query: k.q, t: n === 0 ? a : k.t - 0.1 })) });
        broll += (b - a) * 0.5; visualCount++;
      }
    } else if (['wide', 'post', 'orbit', 'topsquare'].includes(c.type)) {
      if (c.t1 - c.t0 < R.bigtextMin || !free(c.t0, c.t1) || broll + (c.t1 - c.t0) * 0.5 > brollMax) return;
      chosen.push({ ...c }); broll += (c.t1 - c.t0) * 0.5;
    } else if (c.type === 'list') {
      if (!free(c.t0, c.t1)) return;
      chosen.push({ ...c });
    }
    }
  chosen.sort((a, b) => a.t0 - b.t0);

  // tile the timeline: face segments per sentence between the chosen ones, alternating zoom levels
  const segs = [];
  let zi = 0;
  const pushFace = (a, b, type = 'face', extra = {}) => {
    if (b - a < 0.05) return;
    const z = M.zoomLevels[zi++ % M.zoomLevels.length];
    segs.push({ type, t0: +a.toFixed(3), t1: +b.toFixed(3), zoom: [z, z + M.pushPerSegment], face: faceAt(a, b), ...extra });
  };
  let t = 0;
  for (const c of chosen) {
    // face sentences up to c.t0
    for (const s of S) {
      const a = Math.max(t, s.t0), b = Math.min(c.t0, s.t1);
      if (b - a > 0.05) pushFace(a, b);
    }
    if (c.type === 'list') pushFace(c.t0, c.t1, 'list', { items: c.items });
    else if (c.type === 'graphic') segs.push({ type: 'graphic', t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), query: c.query, title: c.title });
    else if (c.type === 'split') segs.push({ type: 'split', t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), shots: c.shots, face: faceAt(c.t0, c.t1) });
    else if (c.type === 'wide' || c.type === 'post') segs.push({ type: c.type, t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), words: c.words, face: faceAt(c.t0, c.t1) });
    else if (c.type === 'orbit') segs.push({ type: 'orbit', t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), title: c.title, face: faceAt(c.t0, c.t1) });
    else if (c.type === 'topsquare') segs.push({ type: 'topsquare', t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), face: faceAt(c.t0, c.t1) });
    t = c.t1;
  }
  for (const s of S) { const a = Math.max(t, s.t0), b = s.t1; if (b - a > 0.05) pushFace(a, b); }
  // merge slivers (< 0.6 s face pieces) into their neighbour so there is never a flash
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i];
    if (g.type === 'face' && g.t1 - g.t0 < 0.6 && segs.length > 1) {
      const nb = segs[i - 1]?.type === 'face' ? segs[i - 1] : segs[i + 1]?.type === 'face' ? segs[i + 1] : (segs[i - 1] ?? segs[i + 1]);
      if (nb === segs[i - 1]) nb.t1 = g.t1; else nb.t0 = g.t0;
      segs.splice(i, 1); i--;
    }
  }
  // ---- cadence: a change every 2 to 3 s like the reference. Face segments longer than ~1.4 x TARGET are cut at word
  // boundaries into pieces of about TARGET s (each piece gets the next zoom level = a jump zoom). Plain code. ----
  {
    const out = [];
    for (const g of segs) {
      const len = g.t1 - g.t0;
      if (g.type !== 'face' || len <= TARGET * 1.2) { out.push(g); continue; }
      const n = Math.max(2, Math.round(len / TARGET));
      const starts = words.map(w => w.t).filter(t => t > g.t0 + MINHOLD * 0.8 && t < g.t1 - MINHOLD * 0.8);
      const cuts = [g.t0];
      for (let k = 1; k < n; k++) {
        const ideal = g.t0 + (len * k) / n;
        const c = starts.filter(t => t - cuts.at(-1) >= MINHOLD && g.t1 - t >= MINHOLD).sort((x, y) => Math.abs(x - ideal) - Math.abs(y - ideal))[0];
        if (c != null) cuts.push(c);
      }
      cuts.push(g.t1);
      for (let k = 0; k + 1 < cuts.length; k++) out.push({ ...g, t0: +cuts[k].toFixed(3), t1: +cuts[k + 1].toFixed(3), face: faceAt(cuts[k], cuts[k + 1]) });
    }
    segs.length = 0; segs.push(...out);
  }
  // ---- Meta call 2 of 2: ONE Muse Spark plan over the rule director's segments (cached; one attempt, no retries) ----
  const wordsIn = (a, b) => words.filter(w => w.t >= a - 1e-3 && w.t < b - 1e-3);
  const asFace = (g, a = g.t0, b = g.t1) => ({ type: 'face', t0: +a.toFixed(3), t1: +b.toFixed(3), zoom: g.type === 'face' && g.zoom ? g.zoom : [M.zoomLevels[0], M.zoomLevels[0] + M.pushPerSegment], face: faceAt(a, b) });
  const build = (layout, g, it) => {
    const ws = wordsIn(g.t0, g.t1), dur = g.t1 - g.t0, a = g.t0;
    const norm = w => clean(w);
    const hj = Math.max(0, ws.findIndex(w => norm(w.word) === norm(it.hero)));
    const cut = (max) => { const b = Math.min(g.t1, a + max); return [{ b }, g.t1 - b > 0.05 ? asFace(g, b, g.t1) : null]; };
    if (layout === 'face') return { main: asFace(g) };
    // a photo query that names nothing picturable ("themselves close up photo") is replaced by the stretch's best stock noun
    const kwBest = () => { const k = ws.map((w, j) => ({ j, s: stockScore(w, j, ws) })).sort((x, y) => y.s - x.s)[0]; return k && k.s > 0 ? phraseAround(ws, k.j) : null; };
    const q0 = picturable(it.queries[0] ?? '') ? it.queries[0] : (kwBest() ?? it.queries[0]), q1 = it.queries[1] && picturable(it.queries[1]) ? it.queries[1] : null;
    if (layout === 'graphic') {
      if (dur < R.graphicMin) return { why: 'too short for a graphic' };
      const [{ b }, rest] = cut(R.graphicMax);
      const t0 = phraseAround(ws, hj);   // a card titled with a pronoun ("Themselves.") says nothing: the stretch's best noun instead
      return { main: { type: 'graphic', t0: a, t1: b, query: q0, title: picturable(t0) ? t0 : (kwBest() ?? t0) }, rest };
    }
    if (layout === 'split') {
      if (dur < R.splitMin) return { why: 'too short for a split' };
      const [{ b }, rest] = cut(R.splitMax);
      const shots = [{ query: q0, t: a }];
      if (q1 && b - a > 2.4) { const w2 = ws.find(w => w.t > a + 1.1 && w.t < b - 1.0 && (VISUAL.has(norm(w.word)) || stockScore(w, 0, [w]) >= 1)) ?? ws.find(w => w.t >= a + (b - a) / 2); if (w2 && w2.t < b - 0.9) shots.push({ query: q1, t: +(w2.t - 0.1).toFixed(3) }); }
      return { main: { type: 'split', t0: a, t1: b, shots, face: faceAt(a, b) }, rest };
    }
    if (layout === 'wide' || layout === 'post') {
      if (dur < R.bigtextMin) return { why: `too short for ${layout}` };
      const [{ b }, rest] = cut(R.bigtextMax);
      const inWin = ws.filter(w => w.t < b).slice(0, layout === 'wide' ? 6 : 7);
      return { main: { type: layout, t0: a, t1: b, words: inWin.map((w, j) => layout === 'wide' ? { w: w.word, t: w.t, big: j === hj || BIG.test(clean(w.word)) || /\d/.test(w.word) } : { w: w.word, t: w.t }), face: faceAt(a, b) }, rest };
    }
    if (layout === 'orbit') {
      if (dur < R.bigtextMin) return { why: 'too short for orbit' };
      const [{ b }, rest] = cut(R.bigtextMax);
      return { main: { type: 'orbit', t0: a, t1: b, title: ws.filter(w => w.t < b).map(w => w.word).slice(0, 6).join(' '), orbitIcons: it.icons.length ? it.icons : null, face: faceAt(a, b) }, rest };
    }
    if (layout === 'topsquare') { const [{ b }, rest] = cut(3.5); return { main: { type: 'topsquare', t0: a, t1: b, face: faceAt(a, b) }, rest }; }
    if (layout === 'textbehind') {
      // ONE huge word behind the person (the matte is cut by engine/person_matte.py after the tiling is final)
      if (dur < TB_MIN) return { why: 'too short for text-behind' };
      const word = String(ws[hj]?.word ?? it.hero).replace(/[^\p{L}\p{N}%$']/gu, '');
      if (word.length < 2 || word.length > 10 || STOP.has(clean(word))) return { why: 'hero word is not a strong short keyword' };
      const wt = ws[hj]?.t ?? a;
      const a2 = g.type === 'x' ? a : Math.min(Math.max(a, wt - 0.35), g.t1 - TB_MIN);   // appear as the word is spoken
      const b2 = Math.min(g.t1, a2 + TB_MAX);
      if (b2 - a2 < TB_MIN - 1e-6) return { why: 'no room for 1.5 s around the word' };
      const rest = g.t1 - b2 > 0.05 ? asFace(g, b2, g.t1) : null;
      const pre = a2 - a > 0.05 ? asFace(g, a, a2) : null;
      return { pre, main: { type: 'textbehind', t0: +a2.toFixed(3), t1: +b2.toFixed(3), word, wordT: +wt.toFixed(3), bg: T.textBehindBg ?? it.background ?? 'blur', zoom: [1, 1.04], face: faceAt(a2, b2) }, rest };
    }
    if (layout === 'list') {
      const items = listItems(ws);
      if (items.length < 2) return { why: 'no list in these words' };
      return { main: { ...asFace(g), type: 'list', items: items.slice(0, 4) } };
    }
    return { why: 'unknown layout' };
  };
  const segList = segs.map((g, i) => ({ i, t0: g.t0, t1: g.t1, text: wordsIn(g.t0, g.t1).map(w => w.word + (w.p ?? '')).join(' '), rule: g.type }));
  const transcript = words.map(w => w.word + (w.p ?? '')).join(' ');
  const sp = opts.noModel ? { plan: null, valid: new Map(), invalid: [], cache_hit: false, skipped: true }
    : await metaPlan(dir, { transcript, segments: segList, layouts: LAYOUTS.filter(ALLOW), icons: ICONS, transitions: TRANSITIONS });   // the director only chooses from this style's layouts
  for (const x of sp.invalid) console.warn(`plan: segment ${x.i} invalid (${x.why}), rule director kept for it`);
  const planLog = [];
  const planOf = new WeakMap();
  const heroPicks = [];
  if (sp.valid.size) {
    const out = [];
    const brollMax2 = R.brollMaxFrac * D, hiddenMax2 = R.hiddenMaxFrac * D;
    let brollT2 = 0, hiddenT2 = 0;
    const weight = g => g.type === 'graphic' ? g.t1 - g.t0 : BROLL.has(g.type) ? (g.t1 - g.t0) * 0.5 : 0;
    // code checks on any B-roll layout: not in the hook or the tail, budgets, and never two B-roll back to back over 3 s
    const maxTB = D < 28 ? 1 : D < 50 ? 2 : 3;
    const allowed = (g) => {
      if (g.type === 'textbehind') {
        if (g.t0 < R.hookFace - 0.05 || g.t1 > D - R.tailFace + 0.05) return 'inside the face-only hook or tail';
        if (out.filter(x => x.type === 'textbehind').length >= maxTB) return `only ${maxTB} text-behind for a ${D.toFixed(0)} s clip`;
        return null;
      }
      if (!BROLL.has(g.type)) return null;
      if (g.t0 < R.hookFace - 0.05 || g.t1 > D - R.tailFace + 0.05) return 'inside the face-only hook or tail';
      if (brollT2 + weight(g) > brollMax2 + 1e-6) return 'b-roll budget';
      if (g.type === 'graphic' && hiddenT2 + (g.t1 - g.t0) > hiddenMax2 + 1e-6) return 'face-hidden budget';
      const prev = out.at(-1);
      if (prev && prev.type === 'graphic' && g.type === 'graphic') return 'two face-hidden cards in a row';
      return null;
    };
    segs.forEach((g, i) => {
      const it = sp.valid.get(i);
      if (!it) { const why = allowed(g); out.push(why ? asFace(g) : g); brollT2 += weight(out.at(-1)); hiddenT2 += out.at(-1).type === 'graphic' ? g.t1 - g.t0 : 0; planLog.push({ i, rule: g.type, used: out.at(-1).type, by: 'rules (plan item invalid)' }); return; }
      const ws = wordsIn(g.t0, g.t1), hw = ws.find(w => clean(w.word) === clean(it.hero));
      if (hw) heroPicks.push(hw.t);
      let r = build(it.layout, g, it), why = r.why ?? allowed(r.main), by = 'spark';
      if (why) {
        // the model's pick breaks a rule: keep the rule director's own choice for this segment if it passes, else face
        const keep = allowed(g) ? asFace(g) : g;
        r = { main: keep }; by = `rules (${it.layout} refused: ${why})`;
      }
      const m = r.main;
      if (r.pre && by === 'spark') { planOf.set(r.pre, it); out.push({ ...r.pre, enter: 'cut' }); }
      if (by === 'spark') {
        m.enter = i === 0 ? 'none' : m.type === 'graphic' ? (it.transition === 'wipe' ? 'wipe' : 'wash') : it.transition;
        if (it.icons.length && ['face', 'split', 'topsquare', 'list'].includes(m.type)) { m.icons = it.icons.slice(0, 2); m.iconT = hw ? hw.t : m.t0 + 0.3; }
      }
      planOf.set(m, it); out.push(m); brollT2 += weight(m); hiddenT2 += m.type === 'graphic' ? m.t1 - m.t0 : 0;
      if (r.rest) { planOf.set(r.rest, it); out.push({ ...r.rest, enter: 'cut' }); }
      planLog.push({ i, rule: g.type, model: it.layout, used: m.type, by, hero: it.hero, queries: it.queries, icons: it.icons, transition: it.transition });
    });
    // after the model's layouts: the segment after a hidden-face card always wipes back to the face (the reference does)
    out.forEach((g, i) => { if (i && (out[i - 1].type === 'graphic' || out[i - 1].type === 'post') && g.type !== 'graphic') g.enter = 'wipe'; });
    segs.length = 0; segs.push(...out);
    // the alternating zoom levels again, and slivers merged, over the new tiling
    let zj = 0; for (const g of segs) if (g.type === 'face') { const z = M.zoomLevels[zj++ % M.zoomLevels.length]; g.zoom = [z, z + M.pushPerSegment]; }
    for (let i = 0; i < segs.length; i++) {
      const g = segs[i];
      if (g.type === 'face' && g.t1 - g.t0 < 0.6 && segs.length > 1) {
        const nb = segs[i - 1]?.type === 'face' ? segs[i - 1] : segs[i + 1]?.type === 'face' ? segs[i + 1] : (segs[i - 1] ?? segs[i + 1]);
        if (nb === segs[i - 1]) nb.t1 = g.t1; else nb.t0 = g.t0;
        segs.splice(i, 1); i--;
      }
    }
    // a split whose second shot no longer fits after the merge keeps its first shot only
    for (const g of segs) if (g.type === 'split') g.shots = g.shots.filter((s, n) => n === 0 || s.t < g.t1 - 0.9);
  }
  // ---- HARD RULE: every video uses all 9 edit types (the 8 reference ones plus text-behind). Coverage pass in plain code, AFTER the Spark plan: any
  // missing layout goes to the best-fitting stretch of the transcript (carved from a face segment, or from a duplicate
  // layout when no face room is left). Face-only hook and tail are never touched. ----
  const ALL9 = ['face', 'graphic', 'orbit', 'topsquare', 'split', 'list', 'post', 'wide', 'textbehind'];
  const coverageLog = []; let matteInfo = null;
  {
    const fit = (m, ws) => {
      const c = ws.map(w => clean(w.word));
      if (m === 'wide') return (c.some(x => BIG.test(x) || /\d/.test(x)) ? 4 : 0) + Math.max(0, ...ws.map(heroScore)) * 0.2;
      if (m === 'post') return c.some(x => POST.test(x)) ? 4 : 0;
      if (m === 'orbit') return (c.some(x => ORBIT.test(x)) ? 4 : 0) + (c.some(x => /^(instagram|youtube|tiktok|facebook|twitter|social)$/.test(x)) ? 2 : 0);
      if (m === 'topsquare') return c.some(x => TURN.test(x)) ? 3 : 0;
      if (m === 'textbehind') return Math.max(0, ...ws.map(w => { const x = clean(w.word); return x.length >= 3 && x.length <= 8 && !STOP.has(x) ? 2 + (/\d/.test(x) ? 2 : 0) + Math.max(0, heroScore(w)) * 0.3 : 0; }));
      if (m === 'list') return (listItems(ws).length >= 2 ? 4 : 0) + Math.min(2, c.filter(x => x && !STOP.has(x)).length * 0.3);
      return Math.max(0, ...ws.map((w, j) => stockScore(w, j, ws)));
    };
    const FIRST = ['wide', 'post', 'list', 'orbit', 'topsquare', 'split', 'graphic', 'textbehind'].filter(ALLOW);
    const maxLen = m => m === 'textbehind' ? TB_MAX : m === 'graphic' ? R.graphicMax : m === 'split' ? Math.min(R.splitMax, 3.2) : m === 'topsquare' ? 3.0 : Math.min(R.bigtextMax, 3.0);
    const minLen = m => m === 'textbehind' ? TB_MIN : m === 'graphic' ? R.graphicMin : m === 'split' ? R.splitMin : MINHOLD;
    const capLong = (maxL, cutAfter) => {
      for (let i = 0; i < segs.length; i++) {
        const g = segs[i], len = g.t1 - g.t0;
        if (g.type === 'face' || len <= maxL) continue;
        const cutT = +(g.t0 + cutAfter).toFixed(3);
        if (g.type === 'list' && (g.items ?? []).filter(x => x.t < cutT - 0.3).length < 2) continue;
        const rest = { type: 'face', t0: cutT, t1: g.t1, zoom: [1, 1.04], face: faceAt(cutT, g.t1), enter: 'cut' };
        g.t1 = cutT;
        if (g.words) g.words = g.words.filter(w => w.t < cutT);
        if (g.items) g.items = g.items.filter(x => x.t < cutT - 0.3);
        if (g.shots) g.shots = g.shots.filter((x, n) => n === 0 || x.t < cutT - 0.9);
        segs.splice(i + 1, 0, rest);
      }
    };
    const mergeFaces = () => { for (let i = 1; i < segs.length; i++) if (segs[i].type === 'face' && segs[i - 1].type === 'face') { segs[i - 1].t1 = segs[i].t1; segs.splice(i, 1); i--; } };
    const splitFaces = () => {   // a face run longer than ~1.5 x TARGET is cut at word starts into pieces of about TARGET s (jump zooms)
      for (let i = 0; i < segs.length; i++) {
        const g = segs[i], len = g.t1 - g.t0;
        if (g.type !== 'face' || len <= TARGET * 1.5) continue;
        const n = Math.max(2, Math.round(len / TARGET)), starts = words.map(w => w.t).filter(t => t > g.t0 + MINHOLD * 0.8 && t < g.t1 - MINHOLD * 0.8), cuts = [g.t0];
        for (let k = 1; k < n; k++) { const ideal = g.t0 + (len * k) / n; const c = starts.filter(t => t - cuts.at(-1) >= MINHOLD && g.t1 - t >= MINHOLD).sort((x, y) => Math.abs(x - ideal) - Math.abs(y - ideal))[0]; if (c != null) cuts.push(c); }
        cuts.push(g.t1);
        const pcs = []; for (let k = 0; k + 1 < cuts.length; k++) pcs.push({ ...g, t0: +cuts[k].toFixed(3), t1: +cuts[k + 1].toFixed(3), face: faceAt(cuts[k], cuts[k + 1]), enter: k ? 'cut' : g.enter });
        segs.splice(i, 1, ...pcs); i += pcs.length - 1;
      }
    };
    if (SHORT) { capLong(2.0, 1.8); mergeFaces(); }   // short clips: room for all 9 types (a long layout hands its tail back to the face)
    for (let guard = 0; guard < 12; guard++) {
      const have = {}; for (const g of segs) have[g.type] = (have[g.type] ?? 0) + 1;
      const miss = FIRST.filter(m => !have[m]);
      if (!miss.length) break;
      let best = null;
      for (const m of miss) for (let i = 0; i < segs.length; i++) {
        const g = segs[i];
        if (g.type !== 'face' && (have[g.type] ?? 0) < 2) continue;                  // never remove the only copy of a layout
        const lo = Math.max(g.t0, R.hookFace), hi = Math.min(g.t1, D - R.tailFace);
        if (hi - lo < minLen(m) - 1e-6) continue;
        // window inside [lo, hi]: start at the best-fitting word, length up to maxLen
        const len = Math.min(maxLen(m), m === 'textbehind' && SHORT ? 1.7 : TARGET, hi - lo), cand = [];
        for (const a0 of [lo, ...words.map(w => w.t - 0.1).filter(t => t > lo && t < hi - minLen(m))]) {
          const a = Math.max(lo, a0), b = Math.min(hi, a + len);
          if (b - a < minLen(m) - 1e-6) continue;
          const ws = wordsIn(a, b); if (!ws.length) continue;
          cand.push({ a, b, sc: fit(m, ws) + (g.type === 'face' ? 1.5 : 0) + (b - a) * 0.1 - (m === 'graphic' && g.zoom ? 0 : 0) });
        }
        for (const c of cand) if (!best || c.sc > best.sc) best = { ...c, m, i };
      }
      if (!best) { coverageLog.push({ missing: miss, why: 'no stretch long enough for any missing layout' }); break; }
      const g = segs[best.i], donorPlan = planOf.get(g);
      const ws = wordsIn(best.a, best.b);
      const hw = [...ws].sort((x, y) => best.m === 'textbehind' ? fit('textbehind', [y]) - fit('textbehind', [x]) : heroScore(y) - heroScore(x))[0] ?? ws[0];
      const kwq = [...ws].map((w, j) => ({ j, w, s: stockScore(w, j, ws) })).sort((x, y) => y.s - x.s)[0];
      const it = { hero: hw?.word ?? '', queries: donorPlan?.queries?.filter(picturable).length ? donorPlan.queries.filter(picturable) : [kwq && kwq.s > 0 ? phraseAround(ws, kwq.j) : (hw?.word ?? 'people')], icons: donorPlan?.icons ?? [], transition: 'cut' };
      let r = build(best.m, { t0: best.a, t1: best.b, type: 'x' }, it);
      if (r.why && best.m === 'list') {   // no list in the words: bullet the content words of the stretch (code, no model)
        const items = ws.filter(w => !STOP.has(clean(w.word)) && clean(w.word).length > 2).slice(0, 4).map(w => ({ text: w.word.replace(/[.,;:!?]+$/, ''), t: w.t }));
        if (items.length >= 2) r = { main: { ...asFace({ t0: best.a, t1: best.b }), type: 'list', items } };
      }
      if (r.why) { coverageLog.push({ layout: best.m, why: r.why }); break; }
      const pieces = [];
      if (best.a - g.t0 > 0.05) {
        if (best.a - g.t0 < 0.5 && segs[best.i - 1]) segs[best.i - 1].t1 = +best.a.toFixed(3);   // thin leftover: the previous segment simply runs on
        else pieces.push({ ...g, t1: +best.a.toFixed(3), face: g.type === 'face' ? faceAt(g.t0, best.a) : g.face });
      }
      const main = r.main; main.enter = main.type === 'graphic' ? 'wash' : 'pop'; main.cov = true;
      let tailStart = main.t1;
      pieces.push(main);
      if (r.rest) pieces.push({ ...r.rest, enter: 'cut' }), tailStart = r.rest.t1;
      if (g.t1 - tailStart > 0.05) pieces.push({ ...g, t0: +tailStart.toFixed(3), face: g.type === 'face' ? faceAt(tailStart, g.t1) : g.face, enter: 'cut' });
      // a thin leftover before/after the carve joins the new segment's neighbour instead of flashing
      const fix = pieces.filter(Boolean);
      for (let k = 0; k < fix.length; k++) if (fix[k] !== main && fix[k].type === 'face' && fix[k].t1 - fix[k].t0 < 0.5 && fix.length > 1) { const nb = fix[k + 1] ?? fix[k - 1]; if (k > 0 && nb === fix[k - 1]) nb.t1 = fix[k].t1; else nb.t0 = fix[k].t0; fix.splice(k, 1); k--; }
      segs.splice(best.i, 1, ...fix);
      coverageLog.push({ layout: best.m, at: [+main.t0.toFixed(2), +main.t1.toFixed(2)], from: g.type, fit: +best.sc.toFixed(1) });
      console.log(`coverage: added ${best.m} at ${main.t0.toFixed(2)}-${main.t1.toFixed(2)} (carved from ${g.type})`);
    }
    // cadence cap: a non-face layout never holds longer than ~3.2 s (about 2 s on short clips); the rest of its time goes back to the face (jump zoom)
    capLong(3.05, 2.7);
    splitFaces();
    // final tidy: close gaps, merge adjacent short face pieces, give a thin face sliver to its neighbours (never a flash)
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < segs.length; i++) segs[i].t0 = segs[i - 1].t1;
      for (let i = 0; i < segs.length; i++) {
        const g = segs[i], prev = segs[i - 1], next = segs[i + 1], len = g.t1 - g.t0;
        if (g.type === 'face' && prev?.type === 'face' && (len < MINHOLD || prev.t1 - prev.t0 < MINHOLD) && prev.t0 >= R.hookFace - 0.05) { prev.t1 = g.t1; segs.splice(i, 1); i--; continue; }
        if (g.type === 'face' && next?.type === 'face' && (len < MINHOLD) && g.t0 >= R.hookFace - 0.05) { next.t0 = g.t0; segs.splice(i, 1); i--; continue; }
        if (g.type === 'face' && len < 0.9 && prev && next && g.t0 >= R.hookFace - 0.05 && g.t1 <= D - R.tailFace + 0.05) { const m = +(g.t0 + len / 2).toFixed(3); prev.t1 = m; next.t0 = m; segs.splice(i, 1); i--; }
      }
    }
    // a layout squeezed under the minimum hold borrows the missing time from a neighbour that can spare it (never the face-only hook or tail)
    for (let i = 1; i < segs.length - 1; i++) {
      const g = segs[i], len = g.t1 - g.t0, need = MINHOLD - len;
      if (need <= 0.05 || g.type === 'face') continue;
      const cand = [[i - 1, 'prev'], [i + 1, 'next']].filter(([k]) => k > 0 && k < segs.length - 1 && segs[k].type !== 'face' || (k > 0 && k < segs.length - 1 && segs[k].type === 'face'))
        .map(([k, side]) => ({ k, side, spare: (segs[k].t1 - segs[k].t0) - MINHOLD })).filter(x => x.spare >= need).sort((x, y) => y.spare - x.spare)[0];
      if (!cand) continue;
      if (cand.side === 'prev') { segs[cand.k].t1 = +(segs[cand.k].t1 - need).toFixed(3); g.t0 = segs[cand.k].t1; }
      else { segs[cand.k].t0 = +(segs[cand.k].t0 + need).toFixed(3); g.t1 = segs[cand.k].t0; }
    }
    for (const g of segs) if (g.type === 'face') g.face = faceAt(g.t0, g.t1);
    // the alternating zoom levels over the final tiling, sliver merge, split without a second shot fits
    let zj = 0; for (const g of segs) if (g.type === 'face') { const z = M.zoomLevels[zj++ % M.zoomLevels.length]; g.zoom = [z, z + M.pushPerSegment]; }
    // ---- text-behind needs a person matte: engine/person_matte.py cuts it for the frames of these segments only (cached per
    // clip). If that fails for any reason the segments fall back to the plain face layout and the fallback is logged;
    // a matte failure never stops the render. ----
    console.log('build: the plan is final; person matte and stock photos next');
    const tbs = segs.filter(g => g.type === 'textbehind' && ALLOW('textbehind'));   // a style without text-behind never pays for a matte
    if (tbs.length) {
      const fps = +(process.env.MATTE_FPS ?? 15), vid = join(dir, 'cut.mp4');   // 15 fps: the renderer holds each mask two frames (half the CPU, no visible step at this speed)   // the ungraded cut: the person's outline is the same in every style's grade, so one matte serves all styles (cached by the cut's hash)
      const ranges = tbs.map(g => `${Math.max(0, g.t0 - 0.1).toFixed(3)}-${Math.min(D, g.t1 + 0.7).toFixed(3)}`).join(',');
      try {
        if (process.env.CARD_FORCE_MATTE_FAIL) throw new Error('forced failure (test)');
        const out = execFileSync(PY, [join(ROOT, 'engine/person_matte.py'), vid, '--out', join(dir, 'matte'), '--ranges', ranges, '--fps', String(fps)], { encoding: 'utf8', timeout: 900000, stdio: ['ignore', 'pipe', 'inherit'] });
        const info = JSON.parse(out.trim().split('\n').filter(l => l.startsWith('{')).at(-1));
        const idx = JSON.parse(readFileSync(join(info.matte_dir, 'index.json'), 'utf8'));
        if (!idx.frames.length || !idx.frames.every(n => existsSync(join(info.matte_dir, `m${String(n).padStart(5, '0')}.png`)))) throw new Error('matte frames missing');
        matteInfo = { dir: relative(dir, info.matte_dir), fps, model: info.model, frames: idx.frames.length, seconds: info.seconds, computed: info.computed };
        console.log(`matte: ${info.model}, ${info.frames} frames (${info.computed} computed) in ${info.seconds} s`);
      } catch (e) {
        const why = String(e.message).split('\n')[0].slice(0, 160);
        for (const g of tbs) { g.type = 'face'; g.zoom = [1, 1.04]; delete g.word; delete g.wordT; delete g.bg; g.face = faceAt(g.t0, g.t1); coverageLog.push({ layout: 'textbehind', at: [g.t0, g.t1], fallback: 'face', why }); }
        console.warn(`coverage: text-behind matte failed (${why}), fell back to face`);
        let zj2 = 0; for (const g of segs) if (g.type === 'face') { const z = M.zoomLevels[zj2++ % M.zoomLevels.length]; g.zoom = [z, z + M.pushPerSegment]; }
      }
    }
    const have = new Set(segs.map(g => g.type)); const still = ALL9.filter(m => !have.has(m));
    if (still.length) console.warn(`coverage: STILL MISSING ${still.join(', ')} (clip too short or too little speech for them)`);
  }
  // stock images (cached), plus credits
  const images = {}, credits = [];
  const want = new Set();
  for (const g of segs) { if (g.type === 'graphic' && ALLOW('graphic')) want.add(g.query); if (g.type === 'split' && ALLOW('split')) g.shots.forEach(s => want.add(s.query)); }
  for (const q of want) {
    let it = opts.noStock ? null : await fetchStock(q.toLowerCase()).catch(e => (console.warn('stock', q, e.message), null));
    if (!it && !opts.noStock) console.warn(`no stock image for "${q}"`);
    if (it) { images[q] = relative(dir, it.file); credits.push({ query: q, credit: it.credit, page: it.page, license: it.license }); }
  }
  // a graphic or split with no image falls back: graphic keeps its title on a lime card, split becomes a face segment
  for (const g of segs) {
    if (g.type === 'graphic') g.img = images[g.query] ?? null;
    if (g.type === 'split') { g.shots = g.shots.map(s => ({ ...s, img: images[s.query] ?? null })).filter(s => s.img); if (!g.shots.length) { g.type = 'face'; g.zoom = [1, 1.04]; } }
  }

  // the style's own grammar: layouts it never uses become the speaker (Kinetic Brand has no post cards, Clean UI no text-behind)
  for (const g of segs) if (!ALLOW(g.type)) { const keep = { t0: g.t0, t1: g.t1, enter: g.enter }; for (const k of Object.keys(g)) delete g[k]; Object.assign(g, keep, { type: 'face', zoom: [1, 1.04], face: faceAt(keep.t0, keep.t1) }); }
  for (let i = segs.length - 1; i > 0; i--) if (segs[i].type === 'face' && segs[i - 1].type === 'face' && segs[i].t1 - segs[i - 1].t0 < 3.2) { segs[i - 1].t1 = segs[i].t1; segs.splice(i, 1); }

  // transitions: wash into a graphic, wipe out of a hidden-face card, pop into a split, cut between face zooms
  segs.forEach((g, i) => {
    const prev = segs[i - 1];
    if (g.enter && prev) return;   // set by the Spark plan (already checked by the rules above)
    g.enter = !prev ? 'none' : g.type === 'graphic' ? 'wash' : (prev.type === 'graphic' || prev.type === 'post' || g.type === 'post') ? 'wipe' : (g.type === 'split' || prev.type === 'orbit') ? 'pop' : 'cut';
  });

  const caps = chunks(words, R);
  // the model's hero word per segment: that caption chunk highlights it (one hero per chunk, as the rules do)
  for (const ht of heroPicks) { const cp = caps.find(cp => cp.words.some(w => Math.abs(w.t - ht) < 1e-3)); if (cp) cp.words.forEach(w => { w.hero = Math.abs(w.t - ht) < 1e-3; }); }
  const kw = opts.kw ?? (() => { const f = {}; for (const w of words) { const c = clean(w.word); if (stockScore(w, 0, [w]) >= 4) f[c] = (f[c] ?? 0) + 1; } return (Object.entries(f).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'guide').toUpperCase(); })();
  const D_ = T.defaults;
  const sfx = [];
  for (const g of segs) {
    if (g.enter === 'wash') sfx.push({ t: Math.max(0, g.t0 - 0.12), k: 'wash' }), g.img && sfx.push({ t: g.t0 + 0.3, k: 'rise' });
    if (g.enter === 'wipe') sfx.push({ t: Math.max(0, g.t0 - 0.08), k: 'wipe' });
    if (g.enter === 'pop') sfx.push({ t: g.t0, k: 'split' });
    if (g.type === 'post') sfx.push({ t: Math.max(g.t0, g.t1 - 0.3), k: 'click' });
    if (g.type === 'orbit') { sfx.push({ t: g.t0, k: 'wash' }); [0.25, 0.4, 0.55].forEach(o => sfx.push({ t: g.t0 + o, k: 'rise' })); }
    if (g.type === 'wide' || (segs[segs.indexOf(g) - 1]?.type === 'wide')) sfx.push({ t: g.t0, k: 'wipe' });
    if (g.type === 'textbehind') { sfx.push({ t: Math.max(0, g.t0 - 0.05), k: 'wipe' }); sfx.push({ t: +Math.max(g.t0 + 0.12, (g.wordT ?? g.t0) - 0.02).toFixed(3), k: 'rise' }); }   // whoosh as the word slams in, pop on the word
  }
  // an SFX on EVERY change (whoosh / pop / click): a boundary with none yet gets a pop (cut) or a soft hit (pop)
  segs.forEach((g, i) => {
    if (!i) return;
    if (sfx.some(x => Math.abs(x.t - g.t0) <= 0.22 || (x.t > g.t0 - 0.3 && x.t < g.t0 + 0.02))) return;
    sfx.push({ t: +g.t0.toFixed(3), k: g.enter === 'cut' ? 'rise' : g.enter === 'pop' ? 'split' : 'wipe' });
  });
  sfx.sort((a, b) => a.t - b.t);
  const spec = {
    version: 1, theme: 'card-studio', style: T.name, mix: !!opts.mix, duration: D, fps: T.canvas.fps, video: 'graded.mp4', src: 'src.mp4',
    badge: opts.badge ?? D_.badge, handle: opts.handle ?? D_.handle,
    cta: [(opts.cta1 ?? D_.cta1).replace('{KW}', kw), opts.cta2 ?? D_.cta2], ctaWord: kw,
    director: { model: sp.skipped ? null : directorModel(), plan: sp.skipped ? 'skipped (--no-model, test only)' : sp.valid.size ? `${sp.valid.size} of ${segList.length} segments planned by ${process.env.META_API_BASE ? 'the test stand-in' : (process.env.DIRECTOR ?? '').toLowerCase() === 'claude' ? 'Claude Sonnet' : 'Muse Spark'}, ${sp.invalid.length} by rules` : 'rules (plan unusable)', planCache: sp.cache_hit, decisions: planLog, faceRatio: +faceRatio.toFixed(2), coverage: coverageLog, types: [...new Set(segs.map(g => g.type))] },
    segments: segs, captions: caps, sfx, images, credits, matte: matteInfo,
    storyboard: Object.values(images).slice(0, 3),
  };
  writeFileSync(join(dir, 'spec.card.json'), JSON.stringify(spec, null, 1));
  const hiddenT = segs.filter(g => g.type === 'graphic').reduce((a, g) => a + g.t1 - g.t0, 0);
  const brollT = segs.filter(g => !['face', 'list', 'topsquare'].includes(g.type)).reduce((a, g) => a + g.t1 - g.t0, 0);
  console.log(`spec.card.json: ${segs.length} segments, ${caps.length} captions, face hidden ${(100 * hiddenT / D).toFixed(0)}%, b-roll layouts ${(100 * brollT / D).toFixed(0)}%, ${Object.keys(images).length} stock images`);
  for (const g of segs) console.log(`${g.t0.toFixed(2).padStart(6)}-${g.t1.toFixed(2).padEnd(6)} ${g.type.padEnd(8)} ${g.enter.padEnd(5)} ${g.zoom ? 'z' + g.zoom[0] : ''} ${g.title ?? g.query ?? ''}${g.shots ? g.shots.map(s => s.query).join(',') : ''}${g.items ? g.items.map(s => s.text).join(' | ') : ''}${g.type === 'orbit' ? '' : ''}${g.words ? g.words.map(w => w.w).join(' ') : ''}`);
  return spec;
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  // one command, end to end: node engine/card-studio.mjs <raw.mp4 | clip dir> [--out out.mp4] [--badge ..] [--handle ..] [--cta1 ..] [--cta2 ..] [--kw ..] [--no-stock] [--no-music]
  // raw video in: prep (1080x1920, face-aware crop, word timings by Groq or free local Whisper, pauses cut) -> rules director
  // -> stock fetch (cached) -> MP4 render. Deterministic: no random choices anywhere; stock is cached per query on disk.
  requireMetaKey();   // the theme needs the Meta Model API key: no key, no work
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : undefined; };
  if (!a[0]) { console.error('usage: node engine/card-studio.mjs <raw.mp4 | clip dir> [--out out.mp4] [--badge ..] [--handle ..] [--cta1 ..] [--cta2 ..] [--kw ..] [--no-stock] [--no-music]'); process.exit(1); }
  const { statSync } = await import('node:fs');
  const { basename, extname, resolve } = await import('node:path');
  let dir = a[0];
  const isFile = existsSync(a[0]) && statSync(a[0]).isFile();
  if (!isFile) dir = opt('--dir') ?? dir;
  if (isFile) dir = opt('--dir') ?? join(ROOT, 'data/clips', basename(a[0], extname(a[0])).replace(/[^\w.-]+/g, '-'));
  resetUsage(dir);
  if (isFile) {
    execFileSync(process.execPath, [join(ROOT, 'engine/prep.mjs'), resolve(a[0]), dir], { stdio: 'inherit', env: { ...process.env, THEME: 'card-studio' } });
  }
  await direct(dir, { badge: opt('--badge'), handle: opt('--handle'), cta1: opt('--cta1'), cta2: opt('--cta2'), kw: opt('--kw'), noStock: a.includes('--no-stock') });
  if (isFile || opt('--out')) {
    const out = resolve(opt('--out') ?? join(dir, 'card-studio.mp4'));
    execFileSync(process.execPath, [join(ROOT, 'tools/render-card.mjs'), dir, out, ...(a.includes('--no-music') ? ['--no-music'] : [])], { stdio: 'inherit' });
    console.log(`done: ${out}`);
  }
  console.log(usageSummary(dir));
}
