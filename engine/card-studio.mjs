// Card Studio director: transcript + face track -> spec.card.json, by plain rules (no model, no credits).
// usage: node engine/card-studio.mjs <raw.mp4 | clip dir> [--out out.mp4] [--badge "Meta AI"] [--handle "@me"] [--cta1 ..] [--cta2 ..] [--kw WORD] [--no-stock] [--no-music]
// Decides, per sentence: face card (with a jump zoom at sentence boundaries), keyword graphic card (face hidden),
// split (stock image on top, face below), bullet list over the face, or a big-text post card for numbers.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, loadEnv } from './env.mjs';
import { fetchStock } from './stock.mjs';

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
  const T = JSON.parse(readFileSync(join(ROOT, 'engine/templates/card-studio.json'), 'utf8'));
  const R = T.rules, M = T.motion;
  const words = JSON.parse(readFileSync(join(dir, 'words.json'), 'utf8'));
  const cut = JSON.parse(readFileSync(join(dir, 'cut.json'), 'utf8'));
  const D = cut.duration;
  // face track: OpenCV pass on the edit's picture (or the browser bake's faces.json when it exists)
  const facesPath = join(dir, 'faces.cv.json');
  if (!existsSync(facesPath)) {
    try { execFileSync(process.env.PYTHON ?? 'python3', [join(ROOT, 'engine/faces.py'), join(dir, 'cut.mp4'), facesPath, '5'], { stdio: 'inherit', timeout: 600000 }); }
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
  // stock images (cached), plus credits
  const images = {}, credits = [];
  const want = new Set();
  for (const g of segs) { if (g.type === 'graphic') want.add(g.query); if (g.type === 'split') g.shots.forEach(s => want.add(s.query)); }
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

  // transitions: wash into a graphic, wipe out of a hidden-face card, pop into a split, cut between face zooms
  segs.forEach((g, i) => {
    const prev = segs[i - 1];
    g.enter = !prev ? 'none' : g.type === 'graphic' ? 'wash' : (prev.type === 'graphic' || prev.type === 'post' || g.type === 'post') ? 'wipe' : (g.type === 'split' || prev.type === 'orbit') ? 'pop' : 'cut';
  });

  const caps = chunks(words, R);
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
  }
  const spec = {
    version: 1, theme: 'card-studio', duration: D, fps: T.canvas.fps, video: 'graded.mp4', src: 'src.mp4',
    badge: opts.badge ?? D_.badge, handle: opts.handle ?? D_.handle,
    cta: [(opts.cta1 ?? D_.cta1).replace('{KW}', kw), opts.cta2 ?? D_.cta2], ctaWord: kw,
    director: { model: null, note: 'rules only: card-studio uses no AI', faceRatio: +faceRatio.toFixed(2) },
    segments: segs, captions: caps, sfx, images, credits,
    storyboard: Object.values(images).slice(0, 3),
  };
  writeFileSync(join(dir, 'spec.card.json'), JSON.stringify(spec, null, 1));
  const hiddenT = segs.filter(g => g.type === 'graphic').reduce((a, g) => a + g.t1 - g.t0, 0);
  const brollT = segs.filter(g => !['face', 'list', 'topsquare'].includes(g.type)).reduce((a, g) => a + g.t1 - g.t0, 0);
  console.log(`spec.card.json: ${segs.length} segments, ${caps.length} captions, face hidden ${(100 * hiddenT / D).toFixed(0)}%, b-roll layouts ${(100 * brollT / D).toFixed(0)}%, ${Object.keys(images).length} stock images`);
  for (const g of segs) console.log(`${g.t0.toFixed(2).padStart(6)}-${g.t1.toFixed(2).padEnd(6)} ${g.type.padEnd(8)} ${g.enter.padEnd(5)} ${g.zoom ? 'z' + g.zoom[0] : ''} ${g.title ?? g.query ?? ''}${g.shots ? g.shots.map(s => s.query).join(',') : ''}${g.items ? g.items.map(s => s.text).join(' | ') : ''}${g.type === 'orbit' ? '' : ''}${g.words ? g.words.map(w => w.w).join(' ') : ''}`);
  return spec;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // one command, end to end: node engine/card-studio.mjs <raw.mp4 | clip dir> [--out out.mp4] [--badge ..] [--handle ..] [--cta1 ..] [--cta2 ..] [--kw ..] [--no-stock] [--no-music]
  // raw video in: prep (1080x1920, face-aware crop, word timings by Groq or free local Whisper, pauses cut) -> rules director
  // -> stock fetch (cached) -> MP4 render. Deterministic: no random choices anywhere; stock is cached per query on disk.
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : undefined; };
  if (!a[0]) { console.error('usage: node engine/card-studio.mjs <raw.mp4 | clip dir> [--out out.mp4] [--badge ..] [--handle ..] [--cta1 ..] [--cta2 ..] [--kw ..] [--no-stock] [--no-music]'); process.exit(1); }
  const { statSync } = await import('node:fs');
  const { basename, extname, resolve } = await import('node:path');
  let dir = a[0];
  const isFile = existsSync(a[0]) && statSync(a[0]).isFile();
  if (isFile) {
    dir = opt('--dir') ?? join(ROOT, 'data/clips', basename(a[0], extname(a[0])).replace(/[^\w.-]+/g, '-'));
    execFileSync(process.execPath, [join(ROOT, 'engine/prep.mjs'), resolve(a[0]), dir], { stdio: 'inherit', env: { ...process.env, THEME: 'card-studio' } });
  }
  await direct(dir, { badge: opt('--badge'), handle: opt('--handle'), cta1: opt('--cta1'), cta2: opt('--cta2'), kw: opt('--kw'), noStock: a.includes('--no-stock') });
  if (isFile || opt('--out')) {
    const out = resolve(opt('--out') ?? join(dir, 'card-studio.mp4'));
    execFileSync(process.execPath, [join(ROOT, 'tools/render-card.mjs'), dir, out, ...(a.includes('--no-music') ? ['--no-music'] : [])], { stdio: 'inherit' });
    console.log(`done: ${out}`);
  }
}
