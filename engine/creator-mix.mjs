// Creator Mix (template 2) director: the Card Studio pipeline gives the transcript, auto-cut, face track and the ONE Muse Spark
// plan (so still exactly 2 Meta calls per video, both cached); this file then lays the template's effects over the timeline in the
// fixed order (templates/creator-mix.json "order"), by plain rules, using only real words from the transcript.
// usage: node engine/creator-mix.mjs <raw.mp4 | clip dir> [--out out.mp4] [--handle ..] [--cta1 ..] [--cta2 ..] [--no-music] [--no-autocut] [--no-ba]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, basename, extname, relative } from 'node:path';
import { ROOT } from './env.mjs';
import { direct, heroScore } from './card-studio.mjs';
import { fetchStock } from './stock.mjs';
import { requireMetaKey, resetUsage, usageSummary } from './meta.mjs';

const SFX = { 2: 'rise', 3: 'split', 6: 'wipe', 7: 'wash', 11: 'rise', 13: 'wipe', 14: 'click', 15: 'rise', 16: 'click', 17: 'wash', 18: 'split', 19: 'wipe', 20: 'split', 21: 'wash', 22: 'rise', 23: 'wash', 24: 'click', 25: 'wash', 26: 'wipe' };
const rnd1 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const clean = w => (w ?? '').replace(/[^\p{L}\p{N}%$'.:]/gu, '').replace(/[.:]+$/g, '');

export async function buildMix(dir, o = {}) {
  const T = JSON.parse(readFileSync(join(ROOT, 'engine/templates/creator-mix.json'), 'utf8'));
  const spec = JSON.parse(readFileSync(join(dir, 'spec.card.json'), 'utf8'));
  const D = spec.duration, HOOK = 1.8, TAIL = 1.2, ENDCARD = 2.2;
  const span = D - TAIL - HOOK - ENDCARD, R = T.reuse ?? { min: 8, target_seconds_per_effect: 3, max: 16 };
  const nSlots = Math.max(1, Math.min(R.max, Math.max(R.min, Math.round(span / R.target_seconds_per_effect))));   // 8+ effects, more on long clips, never fewer than the template's minimum
  const slot = span / nSlots, dur = Math.min(1.9, slot * 0.82);

  // one accent family per video: picked from the picture's own background colour (the accent sits far from it on the colour wheel), no AI
  const pickTheme = () => { try { const fr = join(dir, 'theme.frame.jpg'); execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.min(2, D / 2)), '-i', join(dir, 'graded.mp4'), '-frames:v', '1', '-vf', 'scale=108:-1', fr]);
      const out = execFileSync(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), ['-c', 'import sys,colorsys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");w,h=im.size;px=[im.getpixel((x,y)) for x in range(0,w,3) for y in (2,h//5)]+[im.getpixel((x,y)) for y in range(0,h,3) for x in (2,w-3)];r=sum(p[0] for p in px)/len(px)/255;g=sum(p[1] for p in px)/len(px)/255;b=sum(p[2] for p in px)/len(px)/255;hh,ss,vv=colorsys.rgb_to_hsv(r,g,b);print(round(hh*360),round(ss,2))', fr], { encoding: 'utf8' }).trim().split(' ').map(Number);
      const [hue, sat] = out; let best = 'ember', bd = -1; for (const [nm, th] of Object.entries(T.themeHue)) { const d = Math.min(Math.abs(th - hue), 360 - Math.abs(th - hue)); if (sat < 0.18 ? nm === 'ember' : d > bd) { bd = d; best = nm; if (sat < 0.18) break; } }
      console.log(`theme: ${best} (background hue ${hue}, saturation ${sat})`); return best; } catch (e) { console.warn('theme pick failed, using ember:', String(e.message).split('\n')[0]); return 'ember'; } };
  const themeName = pickTheme(), theme = { name: themeName, ...T.themes[themeName] };
  const palT = [theme.accent, theme.accent2, '#ffffff', theme.accent, theme.accent2];
  const LIB = T.library, IDS = Object.keys(LIB).map(Number).filter(i => i !== 22), counts = {}, lastIds = [];
  const FORCE = (process.env.MIX_FORCE ?? '').split(',').map(Number).filter(Boolean);   // test only: force the first slots
  const choose = (n, inWin, word, phraseWords) => {
    if (FORCE[n]) { counts[FORCE[n]] = (counts[FORCE[n]] ?? 0) + 1; lastIds.push(FORCE[n]); return FORCE[n]; }
    const txt = (phraseWords.join(' ') + ' ' + inWin.map(w => w.w).join(' ')).toLowerCase();
    const hasNum = /\d|percent|million|billion|thousand|hundred|%/.test(txt), q = /\b(why|how|what|who|when|really|ever|can|do)\b/.test(txt), list = /\b(and|then|also|first|second|next|two|three|four|five|every)\b/.test(txt), hero = word.length >= 6;
    let best = IDS[0], bs = -1e9;
    for (const id of IDS) { const tg = LIB[id].tags; let sc = 0;
      if (tg.includes('number')) sc += hasNum ? 5 : -6;
      if (tg.includes('question') && q) sc += 3; if (tg.includes('list') && list) sc += 2; if (tg.includes('hero') && hero) sc += 2; if (tg.includes('word')) sc += 1; if (tg.includes('phrase') && phraseWords.length >= 3) sc += 1.5;
      if (tg.includes('chapter')) sc += (n % 5 === 2) ? 2.5 : -3;
      const u = counts[id] ?? 0; sc += u === 0 ? 4 : -u * 1.5;
      const li = lastIds.lastIndexOf(id); if (li >= 0 && lastIds.length - li <= 3) sc -= 12;
      sc += rnd1(n, id) * 1.2; if (sc > bs) { bs = sc; best = id; } }
    counts[best] = (counts[best] ?? 0) + 1; lastIds.push(best); return best; };
  const words = (spec.captions ?? []).flatMap(c => c.words.map(w => ({ ...w, w: clean(w.w), cap: c }))).filter(w => w.w);
  const near = (t) => { let b = null, bd = 1e9; for (const w of words) { const d = Math.abs(w.t - t); if (d < bd) { bd = d; b = w; } } return b; };
  const fxs = []; let chap = 0, lastFace = null; const used = new Set();
  for (let n = 0; n < nSlots; n++) {
    const t0 = HOOK + n * slot + (slot - dur) / 2, t1 = t0 + dur, mid = (t0 + t1) / 2;
    const seg = spec.segments.find(s => mid >= s.t0 && mid < s.t1) ?? spec.segments.at(-1);
    const inWin = words.filter(w => w.t >= t0 - 0.3 && w.t <= t1);
    const heroes = inWin.filter(w => w.hero && w.w.length > 2); const wide = words.filter(w => w.t >= t0 - 1.4 && w.t <= t1 + 1.0); const good = ws => ws.filter(w => heroScore({ word: w.w }) > 0 && !used.has(w.w.toLowerCase())); const ok = good(inWin).length ? good(inWin) : good(wide); const pickFrom = ok.length ? ok : (heroes.length ? heroes : inWin.filter(w => w.w.length > 3));
    const w0 = (pickFrom.sort((a, b) => heroScore({ word: b.w }) - heroScore({ word: a.w }))[0]) ?? near(mid);
    const word = w0?.w ?? ''; used.add(word.toLowerCase()); const cap = w0?.cap; const phraseWords = (cap?.words ?? []).map(w => clean(w.w)).filter(Boolean).slice(0, 4);
    const phrase = phraseWords.join(' '), hi0 = Math.max(0, phrase.toLowerCase().indexOf(word.toLowerCase())), hi1 = hi0 + word.length;
    const helpers = (cap?.words ?? []).map(w => clean(w.w)).filter(x => x && x.toLowerCase() !== word.toLowerCase() && x.length > 1).slice(0, 2);
    const id = choose(n, inWin, word, phraseWords);
    const face = seg.face ?? lastFace; if (seg.face) lastFace = seg.face;
    const f = { id, name: T.effectNames[id], t0: +t0.toFixed(3), t1: +t1.toFixed(3), word, phrase: phrase || word, hi0, hi1, helpers: helpers.length ? helpers : [''], helper: helpers[0] ?? word, col: palT[n % palT.length],
      side: (face?.[0] ?? 0.5) < 0.5 ? 1 : -1, icon: ['play', 'heart', 'chat', 'chart', 'bell', 'star'][n % 6], hot: (n * 5) % 12 };
    if (id === 14) f.num = String(++chap).padStart(2, '0');
    if (id === 25) f.numStr = (inWin.find(w => /\d/.test(w.w)) ?? inWin.find(w => /^(hundred|thousand|million|billion|percent|double|triple)$/i.test(w.w)))?.w ?? '';
    if (word) fxs.push(f);
  }
  // 22 end card: the last ENDCARD seconds (face stays visible, lower third pill)
  fxs.push({ id: 22, name: T.effectNames[22], t0: +(D - ENDCARD).toFixed(3), t1: +(D - 0.1).toFixed(3), col: theme.accent });
  // pictures (free stock by keyword, cached) for the effects that show photos; the transcript's own words are the queries
  const NEED = { 1: 1, 5: 1, 8: 3, 9: 4, 10: 6, 12: 2, 25: 1, 26: 5 }; const images = {}; const credits = [];
  const heroPool = [...new Set(words.filter(w => heroScore({ word: w.w }) > 0 && w.w.length > 3).sort((a, b) => heroScore({ word: b.w }) - heroScore({ word: a.w })).map(w => w.w.toLowerCase()))].slice(0, 12);
  for (const f of fxs) { const n = NEED[f.id]; if (!n) continue; f.imgs = [];
    for (const q of [f.word, ...heroPool].slice(0, 6)) { if (f.imgs.length >= n) break; try { const got = await fetchStock(q, { want: Math.min(n - f.imgs.length, 3) }); for (const it of [].concat(got ?? [])) { if (f.imgs.length >= n) break; const key = 'img' + Object.keys(images).length; images[key] = relative(dir, it.file); credits.push(it.credit); f.imgs.push(key); } } catch (e) { /* try the next word */ } }
    f.ticker = [f.word, ...heroPool.slice(0, 3)].join('   \u2022   ');
    console.log(`stock for #${f.id}: ${f.imgs.length} of ${n}`); }
  { const pool = Object.keys(images); for (const f of fxs) if (NEED[f.id] && !f.imgs.length && pool.length) { f.imgs = pool.slice(0, Math.min(NEED[f.id], pool.length)); f.borrowed = true; console.log(`#${f.id}: no photo found for its word, borrowed ${f.imgs.length} already fetched`); } }
  // camera shots over the whole timeline: wide / medium / tight, the face off-centre in tight shots and the words in the other half
  const faces = spec.segments.map(s => s.face).filter(Boolean); const fh = faces.length ? faces.reduce((a, f) => a + f[3], 0) / faces.length : 0.14;
  const MINZ = { WIDE: 1.0, MED: 1.15, TIGHT: 1.45 }; const Zf = (target, kind) => Math.min(Math.max(1, Math.min(2.4, target / fh), MINZ[kind] ?? 1), Math.max(1, 0.62 / fh));
  const SH = [['MED', 0.16, 0, 0.5], ['WIDE', 0.11, 0, 0.5], ['TIGHT', 0.24, 1, 0.32], ['MED', 0.16, 0, 0.5], ['TIGHT', 0.24, -1, 0.68], ['WIDE', 0.11, 0, 0.5], ['TIGHT', 0.24, 1, 0.32], ['MED', 0.17, 0, 0.5]];
  const cam = []; let tc = 0, si = 0, wi = 0; const starts = (spec.captions ?? []).map(c => c.t0);
  while (tc < D - 0.05) {
    let te = starts.find(s => s >= tc + 1.7) ?? D; te = Math.min(te, tc + 2.8, D); if (D - te < 1.0) te = D;
    const hook0 = tc < 1.8 || te > D - 1.2; const hook = hook0 ? ['MED', 0.16, 0, 0.5] : SH[si++ % SH.length];
    const seg = spec.segments.find(s => (tc + te) / 2 >= s.t0 && (tc + te) / 2 < s.t1) ?? spec.segments.at(-1);
    const isWorld = !hook0 && hook[0] !== 'WIDE' && (wi++ % 2 === 0);
    cam.push({ world: isWorld ? theme.worlds[(wi >> 1) % theme.worlds.length] : undefined, t0: +tc.toFixed(3), t1: +te.toFixed(3), kind: hook[0], z0: +Zf(hook[1], hook[0]).toFixed(3), drift: hook[0] === 'WIDE' ? 0.04 : 0.1, textSide: hook[2], xo: hook[3], anchorY: hook[0] === 'TIGHT' ? 0.5 : 0.42, face: seg.face ?? faces[0] });
    tc = te;
  }
  console.log('camera shots:', cam.map(c => `${c.kind}@${c.t0}`).join(' '));
  // person matte for the cutout effects (cached per clip; a failure turns those effects into plain-face fallbacks, logged)
  const MATTE = new Set([4, 5, 8, 10, 12, 23, 25, 26]); let matte;
  const ranges = [...fxs.filter(f => MATTE.has(f.id)).map(f => [f.t0, f.t1]), ...cam.filter(x => x.world).map(x => [x.t0, x.t1])].map(([a, b]) => [Math.max(0, a - 0.1), Math.min(D, b + 0.2)]).sort((p, q) => p[0] - q[0]).reduce((acc, r) => { const l = acc.at(-1); if (l && r[0] <= l[1] + 0.05) l[1] = Math.max(l[1], r[1]); else acc.push([...r]); return acc; }, []).map(([a, b]) => `${a.toFixed(3)}-${b.toFixed(3)}`).join(',');
  const _unused = fxs.filter(f => MATTE.has(f.id)).map(f => `${Math.max(0, f.t0 - 0.1).toFixed(3)}-${Math.min(D, f.t1 + 0.2).toFixed(3)}`).join(',');
  if (ranges) { try { const vid = join(dir, 'graded.mp4'); const out = execFileSync(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), [join(ROOT, 'engine/person_matte.py'), vid, '--out', join(dir, 'matte'), '--ranges', ranges, '--fps', String(spec.fps ?? 30)], { encoding: 'utf8', timeout: 900000, stdio: ['ignore', 'pipe', 'inherit'] });
      const info = JSON.parse(out.trim().split('\n').filter(l => l.startsWith('{')).at(-1)); matte = { dir: relative(dir, info.matte_dir), fps: spec.fps ?? 30, model: info.model }; console.log(`matte: ${info.model}, ${info.frames} frames (${info.computed} computed) in ${info.seconds} s`);
    } catch (e) { console.warn('matte failed, cutout effects fall back to the plain picture:', String(e.message).split('\n')[0].slice(0, 160)); } }
  const sfx = fxs.map(f => ({ t: f.t0, k: SFX[f.id] }));
  const mix = { ...spec, theme, template: 'creator-mix', handle: o.handle ?? '@yourhandle', cta: [o.cta1 ?? 'Follow for more', o.cta2 ?? ''], fx: fxs, cam, sfx, images, credits: [...(spec.credits ?? []), ...credits.map(c => ({ text: c }))], storyboard: [], matte };
  writeFileSync(join(dir, 'spec.mix.json'), JSON.stringify(mix, null, 1));
  console.log(`spec.mix.json: ${fxs.length} effects in order: ${fxs.map(f => f.id).join(' ')}`);
  for (const f of fxs) console.log(`${f.t0.toFixed(2).padStart(6)}-${f.t1.toFixed(2).padEnd(6)} #${String(f.id).padEnd(2)} ${f.name.padEnd(30)} ${f.word ?? ''}`);
  return mix;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  requireMetaKey();   // same rule as Card Studio: the Meta Model API key is required
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : undefined; };
  if (!a[0]) { console.error('usage: node engine/creator-mix.mjs <raw.mp4 | clip dir> [--out out.mp4] [--handle ..] [--cta1 ..] [--cta2 ..] [--no-music] [--no-autocut] [--no-ba]'); process.exit(1); }
  let dir = a[0]; const isFile = existsSync(a[0]) && statSync(a[0]).isFile();
  if (isFile) dir = opt('--dir') ?? join(ROOT, 'data/clips', 'mix-' + basename(a[0], extname(a[0])).replace(/[^\w.-]+/g, '-'));
  resetUsage(dir);
  if (isFile) execFileSync(process.execPath, [join(ROOT, 'engine/prep.mjs'), resolve(a[0]), dir], { stdio: 'inherit', env: { ...process.env, THEME: 'card-studio', ...(a.includes('--no-autocut') ? { AUTOCUT: '0' } : {}) } });
  await direct(dir, { handle: opt('--handle'), cta1: opt('--cta1'), cta2: opt('--cta2'), noStock: true });
  await buildMix(dir, { handle: opt('--handle'), cta1: opt('--cta1'), cta2: opt('--cta2') });
  const out = resolve(opt('--out') ?? join(dir, 'creator-mix.mp4')), core = a.includes('--no-ba') ? out : out.replace(/\.mp4$/, '.after.mp4');
  execFileSync(process.execPath, [join(ROOT, 'tools/render-mix.mjs'), dir, core, ...(a.includes('--no-music') ? ['--no-music'] : [])], { stdio: 'inherit' });
  if (core !== out) {   // Before / After layout with the visible "Edited by Meta" line (the raw auto-cut on the left, the finished edit on the right)
    const th = JSON.parse(readFileSync(join(dir, 'spec.mix.json'), 'utf8')).theme ?? {};
    execFileSync(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), [join(ROOT, 'tools/ba-wrap.py'), core, join(dir, 'cut.mp4'), out, '--accent', th.accent ?? '#e5333d'], { stdio: 'inherit' }); }
  console.log(`done: ${out}`); console.log(usageSummary(dir));
}
