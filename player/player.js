// The live edit player: draws a spec (engine/edit.mjs) over the clip's cut, frame by frame, on a canvas.
// URL: /?clip=data/clips/t1[&view=split][&debug=1]. Person matte and face box: MediaPipe (local, free) for the preview;
// SAM 3.1 masks replace the matte source in step H4 (CONTEXT.md section 12).
import { FilesetResolver, ImageSegmenter, FaceDetector } from '/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs';

const Q = new URLSearchParams(location.search);
const CLIP = '/' + (Q.get('clip') ?? 'data/clips/t1').replace(/^\/|\/$/g, '') + '/';
const SPLIT = Q.get('view') === 'split', DEBUG = Q.has('debug'), BAKE = Q.has('bake'), MFPS = 15;
const W = 1080, H = 1920, SAFE = { x0: 70, x1: 905, y0: 230, y1: 1480 };
const $ = id => document.getElementById(id), status = s => ($('status').textContent = s);

// ---------- load everything behind the gate ----------
status('Loading the edit…');
const SPEC = await (await fetch(CLIP + 'spec.json')).json();
const D = await (await fetch(`/engine/templates/${SPEC.dialect}.json`)).json();
const P = D.palette, TPL = Object.fromEntries(D.templates.map(t => [t.id, t]));
const BEATS = SPEC.beats, END = SPEC.duration, CARD = SPEC.brand ? D.endCard.hold : 0, TOTAL = END + CARD;

status('Loading fonts…');
const fonts = [D.type.display, D.type.companion, D.type.text];
await Promise.all(fonts.map(async f => {
  const ff = new FontFace(f.family, `url(/assets/renderer/fonts/${f.file})`, { style: f.style ?? 'normal', weight: f.file.includes('wght') || f.file.includes('wdth') ? '100 900' : String(f.weight), stretch: f.file.includes('wdth') ? '62.5% 125%' : '100%' });
  document.fonts.add(await ff.load());
}));

status('Loading the clip…');
const vid = src => Object.assign(document.createElement('video'), { src, preload: 'auto', playsInline: true, crossOrigin: 'anonymous' });
const ready = (v, name) => new Promise((ok, no) => { v.oncanplaythrough = ok; v.onerror = () => no(new Error(name + ' failed to load')); v.load(); });
const video = vid(CLIP + 'graded.mp4'), raw = SPLIT ? vid(CLIP + 'cut.mp4') : null;
if (raw) raw.muted = true;
await Promise.all([ready(video, 'graded.mp4'), raw && ready(raw, 'cut.mp4')]);

status('Loading sounds…');
const AC = new AudioContext(), BUF = {};
const loadBuf = async (k, f) => { BUF[k] = await AC.decodeAudioData(await (await fetch('/assets/' + f)).arrayBuffer()); };
await Promise.all([...Object.entries(D.sfx).map(([k, f]) => loadBuf(k, 'sfx-style1/' + f)), loadBuf('bed', D.bed.file)]);
const voice = AC.createMediaElementSource(video); voice.connect(AC.destination);

status('Loading the vision models…');
const fileset = await FilesetResolver.forVisionTasks('/node_modules/@mediapipe/tasks-vision/wasm');
const seg = await ImageSegmenter.createFromOptions(fileset, { baseOptions: { modelAssetPath: '/assets/vision/selfie_segmenter.tflite', delegate: 'GPU' }, runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false });
const faceDet = await FaceDetector.createFromOptions(fileset, { baseOptions: { modelAssetPath: '/assets/vision/blaze_face_short_range.tflite', delegate: 'GPU' }, runningMode: 'VIDEO', minDetectionConfidence: 0.5 });

// a baked matte (engine/matte.mjs, or SAM 3.1 later) replaces live segmentation: smooth playback, same look
let MATTE = null, FACES = null;
if (!BAKE) {
  const head = await fetch(CLIP + 'matte.webm', { method: 'HEAD' });
  if (head.ok) {
    status('Loading the matte…');
    MATTE = vid(CLIP + 'matte.webm'); MATTE.muted = true; await ready(MATTE, 'matte.webm');
    FACES = await (await fetch(CLIP + 'faces.json')).json();
  }
}

// ---------- canvases ----------
const out = $('out');
out.width = SPLIT ? 1920 : W; out.height = SPLIT ? 1080 : H;
const octx = out.getContext('2d');
const mk = (w, h) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d', { willReadFrequently: false })]; };
const [B, bx] = mk(W, H);          // the finished frame
const [S, sx] = mk(W, H);          // the subject (person) layer
const [SM, smx] = mk(270, 480);    // small frame for the vision models
const [M, mx] = mk(270, 480);      // the matte (alpha = person)
const mImg = mx.createImageData(270, 480);
const GRAIN = [0, 1, 2].map(() => {   // three full-frame grain layers, made once
  const [g, gx] = mk(W / 2, H / 2), d = gx.createImageData(W / 2, H / 2);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  gx.putImageData(d, 0, 0); return g;
});

// ---------- vision each frame ----------
let face = { x: W / 2, y: H * 0.36, w: 300, h: 360 }, haveFace = false, frameN = 0, lastVt = -1, vts = 0;
function see(now) {
  if (MATTE) return seeBaked();
  if (video.currentTime === lastVt) return; lastVt = video.currentTime;
  if (playing && (frameN++ & 1)) return;
  now = vts = Math.max(vts + 1, now);   // MediaPipe needs strictly increasing timestamps
  smx.drawImage(video, 0, 0, 270, 480);
  const r = seg.segmentForVideo(SM, now);
  const conf = r.confidenceMasks?.[0]?.getAsFloat32Array();
  if (conf) {
    const d = mImg.data;
    for (let i = 0; i < conf.length; i++) { const c = conf[i], a = c < 0.3 ? 0 : c > 0.7 ? 1 : (c - 0.3) / 0.4; d[i * 4 + 3] = a * a * (3 - 2 * a) * 255; }
    mx.putImageData(mImg, 0, 0);
  }
  r.close?.();
  if (frameN++ % 4 === 0) {
    const f = faceDet.detectForVideo(SM, now).detections?.[0]?.boundingBox;
    if (f) {
      const k = W / 270, nf = { x: (f.originX + f.width / 2) * k, y: (f.originY + f.height / 2) * k, w: f.width * k, h: f.height * k };
      const a = haveFace ? 0.25 : 1; haveFace = true;
      for (const key of ['x', 'y', 'w', 'h']) face[key] += (nf[key] - face[key]) * a;
    }
  }
}

function seeBaked() {
  if (Math.abs(MATTE.currentTime - video.currentTime) > (playing ? 0.1 : 0.001)) MATTE.currentTime = video.currentTime;
  mx.clearRect(0, 0, 270, 480); mx.drawImage(MATTE, 0, 0, 270, 480);
  const f = FACES.faces[Math.min(FACES.faces.length - 1, Math.round(video.currentTime * MFPS))];
  if (f) { const a = haveFace ? 0.3 : 1; haveFace = true; const nf = { x: f[0], y: f[1], w: f[2], h: f[3] }; for (const key of ['x', 'y', 'w', 'h']) face[key] += (nf[key] - face[key]) * a; }
}

// bake: segment every 1/15 s of the clip once, post the matte frames and the face boxes to the clip folder
async function bake() {
  const n = Math.floor(END * MFPS), faces = [], posts = [], rel = CLIP.slice(1);
  for (let i = 0; i < n; i++) {
    await new Promise(ok => { video.onseeked = ok; video.currentTime = i / MFPS + 0.001; });
    smx.drawImage(video, 0, 0, 270, 480);
    vts = Math.max(vts + 1, performance.now());
    const r = seg.segmentForVideo(SM, vts), conf = r.confidenceMasks?.[0]?.getAsFloat32Array(), d = mImg.data;
    for (let j = 0; j < conf.length; j++) { const c = conf[j], a = c < 0.3 ? 0 : c > 0.7 ? 1 : (c - 0.3) / 0.4; d[j * 4] = d[j * 4 + 1] = d[j * 4 + 2] = 255; d[j * 4 + 3] = a * a * (3 - 2 * a) * 255; }
    r.close?.(); mx.putImageData(mImg, 0, 0);
    const fb = faceDet.detectForVideo(SM, vts + 0.5).detections?.[0]?.boundingBox, k = W / 270;
    faces.push(fb ? [(fb.originX + fb.width / 2) * k, (fb.originY + fb.height / 2) * k, fb.width * k, fb.height * k].map(v => Math.round(v)) : null);
    const blob = await M.convertToBlob({ type: 'image/png' });
    posts.push(fetch(`/__save?path=${rel}matte/m${String(i + 1).padStart(5, '0')}.png`, { method: 'POST', body: blob }));
    if (i % 30 === 0) status(`Baking the matte: ${i} / ${n} frames`);
  }
  // a frame with no face takes its nearest neighbour's box
  for (let i = 0; i < faces.length; i++) if (!faces[i]) faces[i] = faces.slice(0, i).reverse().find(Boolean) ?? faces.slice(i).find(Boolean) ?? null;
  await Promise.all(posts);
  await fetch(`/__save?path=${rel}faces.json`, { method: 'POST', body: JSON.stringify({ fps: MFPS, by: 'mediapipe selfie_segmenter + blaze_face', faces }) });
  status(`Baked ${n} frames. Now run: node engine/matte.mjs ${rel.replace(/\/$/, '')}`);
  window.__baked = n;
}

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = u => 1 - Math.pow(1 - clamp(u), 3);
const spring = u => u <= 0 ? 0 : 1 - Math.exp(-11 * u) * Math.cos(15 * u);   // Premium Caption 1's settle
const beatAt = t => { for (let k = BEATS.length - 1; k >= 0; k--) if (t >= BEATS[k].t0 - 0.05) return k; return 0; };
const fontOf = (f, px) => `${f.style === 'italic' ? 'italic ' : ''}${f.weight} ${px}px "${f.family}"`;
const bare = s => s.replace(/[^\p{L}\p{N}%$'&+#]/gu, '');   // never punctuation on screen
const NUM = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', hundred: '100', thousand: '1,000', million: '1M', billion: '1B', twice: '2x', double: '2x', half: '½' };

// the shot for a beat: crop scale and where the face should sit (computed once per beat, the face followed smoothly)
const shot = { s: 1, ox: 0, oy: 0 };
function shotFor(b, u) {
  const t = TPL[b.template], size = t.shot?.size ?? 1;
  const side = b.side ?? (b.side = face.x > W / 2 ? 'right' : (b.i % 2 ? 'left' : 'right'));
  let tx = W / 2, ty = H * 0.41;
  if (t.shot?.place === 'side') tx = side === 'left' ? W * 0.36 : W * 0.64;
  if (t.shot?.place === 'low') ty = H * 0.56;
  const s = size * (1 + 0.035 * clamp(u / Math.max(1, b.t1 - b.t0)));     // a slow push through the beat
  let ox = tx - face.x * s, oy = ty - (face.y - face.h * 0.1) * s;
  if (size <= 1.0 && t.shot?.place !== 'low') { ox = (W - W * s) / 2; oy = (H - H * s) * 0.4; }
  if (t.subject === 'void') {
    // on a void nothing has to be covered: the person shrinks and sits low, the number gets the top of the frame
    const vs = 0.8; shot.s = vs; shot.ox = W / 2 - face.x * vs; shot.oy = H * 0.6 - face.y * vs; return;
  }
  shot.s = s; shot.ox = clamp(ox, W - W * s, 0); shot.oy = clamp(oy, H - H * s, 0);
}
const faceBox = () => ({ x0: shot.ox + (face.x - face.w * 0.75) * shot.s, x1: shot.ox + (face.x + face.w * 0.75) * shot.s, y0: shot.oy + (face.y - face.h * 0.95) * shot.s, y1: shot.oy + (face.y + face.h * 0.75) * shot.s });
const drawVideo = (c, filter) => { c.filter = filter; c.drawImage(video, shot.ox, shot.oy, W * shot.s, H * shot.s); c.filter = 'none'; };
const gradeF = (extra = '') => extra || 'none';   // the base grade is baked into graded.mp4 by prep
function subjectLayer(filter, rim) {
  sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, W, H);
  drawVideo(sx, filter);
  sx.globalCompositeOperation = 'destination-in';
  sx.imageSmoothingQuality = 'high';
  sx.drawImage(M, shot.ox, shot.oy, W * shot.s, H * shot.s);
  sx.globalCompositeOperation = 'source-over';
  if (rim) { bx.save(); bx.shadowColor = 'rgba(255,250,240,.95)'; bx.shadowBlur = 10; bx.drawImage(S, 0, 0); bx.restore(); }
  bx.drawImage(S, 0, 0);
}

// ---------- text systems ----------
function glowText(c, text, x, y, font, fill, glow, blur = 34, align = 'center') {
  c.save(); c.font = font; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fontKerning = 'normal';
  if (glow) { c.shadowColor = glow; c.shadowBlur = blur; c.fillStyle = glow; c.fillText(text, x, y); c.shadowBlur = blur * 0.4; c.fillText(text, x, y); }
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 12; c.shadowOffsetY = 4; c.fillStyle = fill; c.fillText(text, x, y); c.restore();
}
const fitPx = (c, text, font, px, maxW) => { c.font = font(px); const w = c.measureText(text).width; return w > maxW ? Math.floor(px * maxW / w) : px; };

/** words visible at t, each with its entry progress */
const shown = (b, t) => b.words.map((w, k) => ({ ...w, k, u: (t - w.t + 0.04) / 0.26 })).filter(w => w.u > 0);

function subtitle(b, t, y) {
  const ws = shown(b, t); if (!ws.length) return;
  const f = D.type.text, px = 46; bx.font = fontOf(f, px);
  // one or two lines of at most ~24 characters, centred under the chin
  const lines = [[]]; let len = 0;
  for (const w of b.words) { const L = bare(w.w).length + 1; if (len + L > 24 && lines.at(-1).length) { lines.push([]); len = 0; } lines.at(-1).push(w); len += L; }
  lines.forEach((line, li) => {
    const txt = line.map(w => bare(w.w)).join(' '), full = bx.measureText(txt).width; let x = W / 2 - full / 2;
    for (const w of line) {
      const s = ws.find(v => v.t === w.t && v.w === w.w), word = bare(w.w), ww = bx.measureText(word + ' ').width;
      if (s) { bx.globalAlpha = clamp(s.u * 3); glowText(bx, word, x, y + li * 58 + 10 * (1 - spring(s.u * 0.26)), fontOf(f, px), P.paper, null, 0, 'left'); bx.globalAlpha = 1; }
      x += ww;
    }
  });
}

function heroLine(b, t, y, color) {
  const hero = b.words[b.hero]; if (!hero) return;
  const helpers = b.words.filter((_, k) => k !== b.hero).map(w => bare(w.w).toLowerCase()).join(' ');
  const ws = shown(b, t), hu = (t - hero.t + 0.04) / 0.3;
  if (ws.length) { bx.globalAlpha = clamp(ws.length / b.words.length * 2) * 0.8; glowText(bx, helpers, W / 2, y - 140, fontOf(D.type.companion, 52), P.paper, null); bx.globalAlpha = 1; }
  if (hu > 0) {
    const word = bare(hero.w).toUpperCase(), font = px => fontOf(D.type.display, px), px = fitPx(bx, word, font, 190, W * 0.82);
    bx.save(); bx.translate(W / 2, y); const sc = 1.22 - 0.22 * spring(hu * 0.3); bx.scale(sc, sc); bx.globalAlpha = clamp(hu * 4);
    glowText(bx, word, 0, 0, font(px), P.paper, P[color] ?? P.warm, 46); bx.restore();
  }
}

function stack(b, t, region, color) {
  // the phrase as a stacked block: the hero in big display caps, the rest alternating companion italic and display caps
  const items = b.words.map((w, k) => {
    const word = bare(w.w); if (!word) return null;
    const hero = k === b.hero, small = !hero && (word.length <= 3 || k % 2 === 0);
    return { w, k, hero, text: hero || !small ? word.toUpperCase() : word.toLowerCase(), font: hero ? D.type.display : small ? D.type.companion : D.type.display, px: hero ? 150 : small ? 64 : 78 };
  }).filter(Boolean);
  const maxW = region.x1 - region.x0, lines = [[]]; let lw = 0;
  for (const it of items) {
    bx.font = fontOf(it.font, it.px); it.px = Math.min(it.px, Math.floor(it.px * maxW / Math.max(1, bx.measureText(it.text).width)));
    bx.font = fontOf(it.font, it.px); it.width = bx.measureText(it.text + ' ').width;
    if ((it.hero || lw + it.width > maxW) && lines.at(-1).length) { lines.push([]); lw = 0; }
    lines.at(-1).push(it); lw += it.width; if (it.hero) { lines.push([]); lw = 0; }
  }
  const rows = lines.filter(l => l.length), heights = rows.map(l => Math.max(...l.map(i => i.px)) * 0.98);
  const total = heights.reduce((a, b) => a + b, 0);
  let y = clamp(region.cy - total / 2, SAFE.y0, SAFE.y1 - total);
  rows.forEach((row, ri) => {
    y += heights[ri]; let x = region.align === 'right' ? region.x1 - row.reduce((a, i) => a + i.width, 0) : region.x0;
    for (const it of row) {
      const u = (t - it.w.t + 0.04) / 0.24;
      if (u > 0) {
        bx.save(); bx.globalAlpha = clamp(u * 4); bx.translate(x, y + 18 * (1 - spring(u * 0.24)));
        glowText(bx, it.text, 0, 0, fontOf(it.font, it.px), it.hero && color === 'hot' ? P.paper : P.paper, it.hero ? (P[color] ?? P.warm) : null, it.hero ? 40 : 0, 'left');
        bx.restore();
      }
      x += it.width;
    }
  });
}

function stat(b, t, fb) {
  const hero = b.words[b.hero]; if (!hero) return;
  const hu = (t - hero.t + 0.06) / 0.3; if (hu <= 0) return;
  const raw = bare(hero.w).toLowerCase(), num = NUM[raw] ?? bare(hero.w);
  const rest = b.words.slice(b.hero + 1).map(w => bare(w.w).toUpperCase()).filter(Boolean).join(' ');
  const top = SAFE.y0 + (rest ? 110 : 0), bottom = Math.max(top + 260, fb.y0 + 60);    // may tuck a little behind the hair
  const font = px => fontOf(D.type.display, px);
  const px = Math.min(fitPx(bx, num, font, 640, W * 0.86), Math.floor((bottom - top) / 0.74));
  bx.save(); bx.translate(W / 2, bottom); const sc = 1.25 - 0.25 * spring(hu * 0.3); bx.scale(sc, sc); bx.globalAlpha = clamp(hu * 3);
  glowText(bx, num, 0, 0, font(px), P.hot, P.hotGlow, 60); bx.restore();
  if (rest) {
    const ru = (t - (b.words[b.hero + 1]?.t ?? hero.t) + 0.04) / 0.3;
    if (ru > 0) { bx.save(); bx.globalAlpha = clamp(ru * 3); bx.font = font(fitPx(bx, rest, font, 96, W * 0.8)); bx.textAlign = 'center'; bx.lineWidth = 3; bx.strokeStyle = P.hot; bx.shadowColor = P.hotGlow; bx.shadowBlur = 24; bx.strokeText(rest, W / 2, SAFE.y0 + 80); bx.restore(); }
  }
}

function chapterCard(b, t, u) {
  const n = b.chapter ?? 1, label = b.words.map(w => bare(w.w)).filter(w => !/^(first|second|third|fourth|fifth|lastly|finally|thing|step|number|then|now|one|two|three|four|five)$/i.test(w)).slice(0, 5).join(' ').toLowerCase();
  const g = bx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.void); g.addColorStop(1, P.ink); bx.fillStyle = g; bx.fillRect(0, 0, W, H);
  const e = easeOut(u / 0.5);
  bx.save(); bx.globalAlpha = 0.16 * e; bx.font = fontOf(D.type.display, 1100); bx.textAlign = 'center'; bx.fillStyle = P.paper; bx.fillText(String(n || ''), W / 2, H * 0.62 + 40 * (1 - e)); bx.restore();
  const du = clamp((u - 0.15) / 0.35), dsc = spring(du * 0.35);
  bx.save(); bx.translate(W / 2, H * 0.44); bx.rotate(Math.PI / 4); bx.scale(dsc, dsc);
  bx.shadowColor = P.hotGlow; bx.shadowBlur = 40; bx.strokeStyle = P.paper; bx.lineWidth = 8; bx.strokeRect(-95, -95, 190, 190);
  bx.fillStyle = P.hot; bx.fillRect(-70, -70, 140, 140); bx.restore();
  if (du > 0) glowText(bx, String(n || '•'), W / 2, H * 0.44 + 44, fontOf(D.type.display, 120), P.paper, null);
  const lu = clamp((u - 0.35) / 0.3); bx.globalAlpha = lu; if (label) glowText(bx, label, W / 2, H * 0.44 + 260, fontOf(D.type.companion, 84), P.paper, 'rgba(255,240,225,.35)', 18); bx.globalAlpha = 1;
}

function listPills(b, t) {
  const items = b.list ?? []; let y = 560;
  items.forEach((txt, k) => {
    const first = txt.split(' ')[0].toLowerCase(), w = b.words.find(w => bare(w.w).toLowerCase() === bare(first)) ?? b.words[0];
    const u = (t - w.t + 0.04) / 0.3; if (u <= 0) return;
    const sc = spring(u * 0.3); bx.save(); bx.globalAlpha = clamp(u * 4); bx.translate(W / 2, y); bx.scale(sc, sc);
    bx.font = fontOf(D.type.text, 56); const tw = bx.measureText(txt).width + 90;
    bx.shadowColor = P.hotGlow; bx.shadowBlur = 24; bx.strokeStyle = P.paper; bx.lineWidth = 3; bx.beginPath(); bx.roundRect(-tw / 2, -50, tw, 100, 22); bx.stroke();
    bx.shadowBlur = 0; bx.fillStyle = 'rgba(20,14,12,.55)'; bx.fill(); bx.restore();
    glowText(bx, txt.toLowerCase(), W / 2, y + 20, fontOf(D.type.text, 56), P.paper, null);
    y += 130;
  });
}

function oneWord(b, t, y) {
  const w = [...b.words].reverse().find(w => t >= w.t - 0.03); if (!w) return;
  glowText(bx, bare(w.w).toLowerCase(), W / 2, y, fontOf(D.type.text, 40), 'rgba(250,246,240,.92)', null);
}

// ---------- the frame ----------
let prevKey = -1;
function frame(t) {
  bx.save(); bx.clearRect(0, 0, W, H);
  if (t >= END) return endCard(t - END);
  const k = beatAt(t), b = BEATS[k], tpl = TPL[b.template], u = t - b.t0;
  shotFor(b, u);
  const fb = faceBox();
  const below = Math.min(SAFE.y1 - 60, Math.max(fb.y1 + 120, H * 0.66));
  const behind = tpl.text?.behind;

  // background + subject
  const sub = tpl.subject;
  if (sub === 'card' && u < Math.min(tpl.cardFor ?? 1.4, (b.t1 - b.t0) * 0.75)) { chapterCard(b, t, u); }
  else {
    if (sub === 'void' || sub === 'field') {
      if (sub === 'void') { bx.fillStyle = P.void; bx.fillRect(0, 0, W, H); }
      else { const g = bx.createRadialGradient(W / 2, H * 0.4, 60, W / 2, H * 0.5, H * 0.75); g.addColorStop(0, P.field[0]); g.addColorStop(1, P.field[1]); bx.fillStyle = g; bx.fillRect(0, 0, W, H); }
      if (behind) stat(b, t, fb);
      subjectLayer(gradeF(), true);
    } else if (sub === 'dim-bg') {
      drawVideo(bx, gradeF('brightness(.42) saturate(.35) blur(3px)'));
      subjectLayer(gradeF(), true);
    } else if (sub === 'mono') {
      drawVideo(bx, 'grayscale(1) contrast(1.25) brightness(.92)');
    } else if (sub === 'dim') {
      drawVideo(bx, gradeF('brightness(.38) blur(7px)'));
    } else {
      drawVideo(bx, gradeF());
      if (behind) { heroLine(b, t, Math.max(below, H * 0.7), tpl.text.color); subjectLayer(gradeF(), false); }
    }
    // the grade's frame: bottom fall-off and vignette
    const fall = bx.createLinearGradient(0, H * 0.55, 0, H); fall.addColorStop(0, 'rgba(10,8,7,0)'); fall.addColorStop(1, `rgba(10,8,7,${D.grade.fall})`);
    bx.fillStyle = fall; bx.fillRect(0, 0, W, H);
    const vg = bx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${D.grade.vignette})`);
    bx.fillStyle = vg; bx.fillRect(0, 0, W, H);

    // text on top (one text layer per frame)
    const sys = tpl.text?.system;
    if (sub === 'card') subtitle(b, t, below);
    else if (sys === 'subtitle') subtitle(b, t, below);
    else if (sys === 'stack') {
      const side = b.side === 'left' ? 'right' : 'left';
      const region = side === 'left' ? { x0: SAFE.x0, x1: Math.max(SAFE.x0 + 300, fb.x0 - 50), cy: (fb.y0 + fb.y1) / 2, align: 'left' } : { x0: Math.min(SAFE.x1 - 300, fb.x1 + 50), x1: SAFE.x1, cy: (fb.y0 + fb.y1) / 2, align: 'left' };
      stack(b, t, region, tpl.text.color);
    } else if (sys === 'hero-glow' && !behind) heroLine(b, t, Math.max(below, H * 0.7), tpl.text.color);
    else if (sys === 'one-word') oneWord(b, t, below);
    else if (sys === 'list') listPills(b, t);
  }
  // grain
  bx.globalAlpha = D.grade.grain; bx.globalCompositeOperation = 'overlay';
  bx.drawImage(GRAIN[frameN % 3], 0, 0, W, H);
  bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';

  // transitions into this beat
  const tr = b.transition, tu = u / 0.38;
  if (tr !== 'cut' && tu < 1) {
    if (tr === 'flash') { bx.globalCompositeOperation = 'lighter'; const g = bx.createRadialGradient(W * 0.6, H * 0.3, 0, W * 0.6, H * 0.3, H); g.addColorStop(0, `rgba(255,236,210,${0.95 * (1 - tu)})`); g.addColorStop(1, `rgba(255,190,140,${0.5 * (1 - tu)})`); bx.fillStyle = g; bx.fillRect(0, 0, W, H); bx.globalCompositeOperation = 'source-over'; }
    if (tr === 'line-wipe') { const ly = easeOut(tu) * H; bx.fillStyle = P.void; bx.fillRect(0, ly, W, H - ly); bx.fillStyle = 'rgba(255,248,236,.95)'; bx.shadowColor = P.hotGlow; bx.shadowBlur = 30; bx.fillRect(0, ly - 3, W, 6); bx.shadowBlur = 0; }
    if (tr === 'blur-through' || tr === 'whip') { const c = new OffscreenCanvas(W, H), cx = c.getContext('2d'); cx.drawImage(B, 0, 0); bx.clearRect(0, 0, W, H); bx.filter = tr === 'whip' ? 'none' : `blur(${(1 - tu) * 26}px)`; if (tr === 'whip') { for (let i = 0; i < 6; i++) { bx.globalAlpha = 0.22; bx.drawImage(c, (1 - tu) * 140 * (i - 3), 0); } bx.globalAlpha = 1; } else bx.drawImage(c, 0, 0); bx.filter = 'none'; }
  }
  if (DEBUG) { bx.strokeStyle = '#0f0'; bx.lineWidth = 3; bx.strokeRect(fb.x0, fb.y0, fb.x1 - fb.x0, fb.y1 - fb.y0); bx.strokeStyle = '#ff0'; bx.strokeRect(SAFE.x0, SAFE.y0, SAFE.x1 - SAFE.x0, SAFE.y1 - SAFE.y0); bx.drawImage(M, 20, 20, 135, 240); bx.fillStyle = '#fff'; bx.font = '28px monospace'; bx.fillText(`${b.template} ${b.transition} ${b.role}`, 20, H - 40); }
  bx.restore();
  if (k !== prevKey) prevKey = k;
}

function endCard(u) {
  bx.fillStyle = P.void; bx.fillRect(0, 0, W, H);
  const name = (SPEC.brand ?? '').toUpperCase(), n = Math.ceil(clamp(u / 0.6) * name.length), fade = 1 - clamp((u - (CARD - 0.5)) / 0.5);
  bx.globalAlpha = fade; glowText(bx, name.slice(0, n), W / 2, H / 2 + 40, fontOf(D.type.display, fitPx(bx, name, px => fontOf(D.type.display, px), 150, W * 0.8)), P.paper, P.hotGlow, 30);
  bx.fillStyle = P.hot; bx.beginPath(); bx.arc(W / 2, H / 2 + 110, 10 * clamp(u / 0.8), 0, Math.PI * 2); bx.fill(); bx.globalAlpha = 1; bx.restore();
}

// ---------- sound: events from the spec ----------
const EV = [];
for (const b of BEATS) {
  const tpl = TPL[b.template];
  if (b.transition !== 'cut') EV.push({ t: b.t0 - 0.12, k: b.transition === 'whip' ? 'whip' : 'whoosh', g: 0.5 });
  if (b.template === 'kb.chapter') { EV.push({ t: b.t0 - 0.55, k: 'riser', g: 0.35 }); EV.push({ t: b.t0 + 0.15, k: 'pop', g: 0.6 }); }
  if (b.template === 'kb.void-stat' && b.words[b.hero]) EV.push({ t: b.words[b.hero].t, k: 'hit', g: 0.8 });
  if (tpl.loud && tpl.text?.system === 'stack') for (const w of b.words) EV.push({ t: w.t, k: 'word', g: 0.18 });
  if (tpl.text?.system === 'hero-glow' && b.words[b.hero]) EV.push({ t: b.words[b.hero].t, k: 'pop', g: 0.35 });
  if (b.template === 'kb.list') for (const w of b.words) EV.push({ t: w.t, k: 'pop', g: 0.3 });
}
if (CARD) EV.push({ t: END + 0.1, k: 'chime', g: 0.5 });
EV.sort((a, b) => a.t - b.t);
const fire = (k, g) => { const s = AC.createBufferSource(), v = AC.createGain(); s.buffer = BUF[k]; v.gain.value = g; s.connect(v).connect(AC.destination); s.start(); };
let bed = null;
function startBed(at) { stopBed(); const s = AC.createBufferSource(), v = AC.createGain(); s.buffer = BUF.bed; s.loop = true; v.gain.value = D.bed.gain; s.connect(v).connect(AC.destination); s.start(0, at % BUF.bed.duration); bed = s; }
function stopBed() { try { bed?.stop(); } catch { } bed = null; }

// ---------- clock and loop ----------
let clock = 0, playing = false, lastT = 0, cardStart = 0;
function now() { return video.ended || clock >= END ? END + (performance.now() - cardStart) / 1000 : video.currentTime; }
function loop(ts) {
  if (!video.ended && video.currentTime < END) see(ts);
  let t = playing ? now() : clock;
  if (playing && t >= TOTAL) { playing = false; stopBed(); t = TOTAL - 0.001; $('pp').textContent = 'Play'; }
  if (playing) for (const e of EV) if (e.t > lastT && e.t <= t) fire(e.k, e.g);
  lastT = t; clock = t;
  frame(t); blit(t);
  requestAnimationFrame(loop);
}
function blit(t) {
  if (SPLIT) {
    octx.fillStyle = '#100d0b'; octx.fillRect(0, 0, 1920, 1080);
    const bw = 540, bh = 960, y = 80;
    if (raw && Math.abs(raw.currentTime - video.currentTime) > 0.08) raw.currentTime = video.currentTime;
    octx.drawImage(raw ?? video, 330, y, bw, bh); octx.drawImage(B, 1050, y, bw, bh);
    octx.font = '600 30px "Inter Tight"'; octx.fillStyle = '#efe7dc'; octx.textAlign = 'center';
    octx.fillText('Before', 330 + bw / 2, 56); octx.fillText('After', 1050 + bw / 2, 56);
  } else octx.drawImage(B, 0, 0);
  $('info').textContent = `${t.toFixed(2)} / ${TOTAL.toFixed(2)} s · ${BEATS[beatAt(Math.min(t, END - 0.01))].template}`;
  if (!$('seek').matches(':active')) $('seek').value = String(Math.round(t / TOTAL * 1000));
}
video.onended = () => { cardStart = performance.now(); };
async function play() {
  await AC.resume();
  if (clock >= TOTAL - 0.05) { video.currentTime = 0; clock = 0; }
  if (clock < END) { await video.play(); raw?.play(); MATTE?.play(); startBed(video.currentTime); } else cardStart = performance.now() - (clock - END) * 1000;
  playing = true; lastT = clock; $('pp').textContent = 'Pause';
}
function pause() { video.pause(); raw?.pause(); MATTE?.pause(); playing = false; stopBed(); $('pp').textContent = 'Play'; }
$('pp').onclick = () => playing ? pause() : play();
$('seek').oninput = e => { const t = +e.target.value / 1000 * TOTAL; pause(); clock = t; if (t < END) video.currentTime = t; };
// for frame grabs: window.__seek(t) resolves when that frame is drawn
window.__seek = async t => {
  pause(); clock = t;
  if (t < END) { if (raw) raw.currentTime = t; if (MATTE) await new Promise(ok => { MATTE.onseeked = ok; MATTE.currentTime = t; }); await new Promise(ok => { video.onseeked = ok; video.currentTime = t; }); lastVt = -1; see(performance.now()); lastVt = -1; frameN = 0; haveFace = false; see(performance.now() + 1); }
  frame(t); blit(t);
};
window.__state = { BEATS, TOTAL };

if (BAKE) { $('play').textContent = 'Bake the matte'; $('play').disabled = false; $('play').onclick = () => bake(); window.__bake = bake; status('Ready to bake'); throw 'bake mode'; }
status(MATTE ? 'Ready' : 'Ready (live matte: bake it for smooth playback)'); $('play').disabled = false;
$('play').onclick = () => { $('gate').remove(); play(); };
requestAnimationFrame(loop);
// cost of one frame (vision + draw + blit) at time t, averaged over n runs, in ms: window.__bench(29.6, 20)
window.__bench = async (t, n = 20) => {
  await window.__seek(t); const r = { see: 0, draw: 0 };
  for (let i = 0; i < n; i++) {
    lastVt = -1; let a = performance.now(); see(performance.now()); r.see += performance.now() - a;
    a = performance.now(); frame(t); blit(t); r.draw += performance.now() - a;
  }
  return { see: +(r.see / n).toFixed(1), draw: +(r.draw / n).toFixed(1), template: BEATS[beatAt(t)].template };
};
