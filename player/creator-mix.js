// Creator Mix drawing (template 2): one pure Canvas 2D module, no AI. Full-bleed talking head with a dark grade, a fixed
// order of effects taken from two reels (see engine/templates/creator-mix.json "order"), our own caption style.
// drawFrame(ctx, t, spec, T, res)  res = { video: canvas of the prepped picture, vw, vh }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const eio = k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const eb = k => { k = clamp(k, 0, 1); const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const F = (T, key, size, w = 400) => `${T.fonts[key].style === 'italic' ? 'italic ' : ''}${w} ${size}px "${T.fonts[key].family}"`;
const rnd = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const W = 1080, H = 1920;

const segAt = (spec, t) => spec.segments.find(s => t >= s.t0 && t < s.t1) ?? spec.segments[spec.segments.length - 1];
const fxAt = (spec, t) => (spec.fx ?? []).find(f => t >= f.t0 && t < f.t1) ?? null;
const scratch = new Map();
const getScratch = (res, key, w, h) => { let c = scratch.get(key); if (!c || c.width !== w || c.height !== h) { c = res.make(w, h); scratch.set(key, c); } return c; };

/** crop of the picture around the face at zoom z; returns [sx, sy, cw, ch] */
function crop(res, face, z, anchorY = 0.42, dx = 0) {
  const f = face ?? [0.5, 0.32, 0.2, 0.14];
  const cw = res.vw / z, ch = res.vh / z;
  const sx = clamp(f[0] * res.vw - cw / 2 + dx * cw, 0, res.vw - cw), sy = clamp(f[1] * res.vh - anchorY * ch, 0, res.vh - ch);
  return [sx, sy, cw, ch];
}
function base(ctx, res, face, z, anchorY = 0.42, dx = 0) {
  const [sx, sy, cw, ch] = crop(res, face, z, anchorY, dx);
  ctx.drawImage(res.video, sx, sy, cw, ch, 0, 0, W, H);
}
function grade(ctx, T) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(190,196,230,1)'; ctx.fillRect(0, 0, W, H);   // cool, slightly dark
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.28, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(3,4,16,0.62)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const b = ctx.createLinearGradient(0, H * 0.62, 0, H); b.addColorStop(0, 'rgba(3,4,16,0)'); b.addColorStop(1, 'rgba(3,4,16,0.55)'); ctx.fillStyle = b; ctx.fillRect(0, H * 0.62, W, H * 0.38);
  ctx.restore();
}
function blurInto(ctx, res, w, h, px) {   // cheap strong blur: down then up, twice
  const s1 = getScratch(res, 'b1', Math.round(W / px), Math.round(H / px)), c1 = s1.getContext('2d');
  c1.imageSmoothingEnabled = true; c1.clearRect(0, 0, s1.width, s1.height); c1.drawImage(ctx.canvas, 0, 0, s1.width, s1.height);
  const s2 = getScratch(res, 'b2', Math.round(W / (px * 2)), Math.round(H / (px * 2))), c2 = s2.getContext('2d');
  c2.imageSmoothingEnabled = true; c2.clearRect(0, 0, s2.width, s2.height); c2.drawImage(s1, 0, 0, s2.width, s2.height);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(s2, 0, 0, W, H);
}
function text(ctx, s, x, y, size, fam, fill, o = {}) {
  ctx.save(); ctx.font = fam.replace('SIZE', size); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.base ?? 'middle';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 40; }
  if (o.stroke) { ctx.lineWidth = o.lw ?? 6; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (fill) { ctx.fillStyle = fill; ctx.fillText(s, x, y); }
  ctx.restore();
}
function fitSize(ctx, s, fam, maxW, size) { ctx.save(); ctx.font = fam.replace('SIZE', size); const w = ctx.measureText(s).width; ctx.restore(); return w > maxW ? size * maxW / w : size; }
const famOf = (T, key, w = 400) => `${T.fonts[key].style === 'italic' ? 'italic ' : ''}${w} SIZEpx "${T.fonts[key].family}"`;

function icon(ctx, kind, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * 0.12; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'play') { ctx.beginPath(); ctx.moveTo(-s * .28, -s * .36); ctx.lineTo(s * .4, 0); ctx.lineTo(-s * .28, s * .36); ctx.closePath(); ctx.fill(); }
  else if (kind === 'heart') { ctx.beginPath(); ctx.moveTo(0, s * .38); ctx.bezierCurveTo(-s * .6, -s * .05, -s * .3, -s * .5, 0, -s * .18); ctx.bezierCurveTo(s * .3, -s * .5, s * .6, -s * .05, 0, s * .38); ctx.fill(); }
  else if (kind === 'chat') { ctx.beginPath(); ctx.roundRect(-s * .42, -s * .34, s * .84, s * .56, s * .14); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * .1, s * .2); ctx.lineTo(-s * .26, s * .42); ctx.lineTo(s * .06, s * .2); ctx.fill(); }
  else if (kind === 'chart') { for (let i = 0; i < 3; i++) { const h = s * (0.25 + i * 0.22); ctx.fillRect(-s * .36 + i * s * .26, s * .36 - h, s * .18, h); } }
  else if (kind === 'bell') { ctx.beginPath(); ctx.arc(0, -s * .06, s * .3, Math.PI, 0); ctx.lineTo(s * .38, s * .26); ctx.lineTo(-s * .38, s * .26); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, s * .36, s * .08, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .18 : s * .42, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

/* ---------- theme (one accent family per video, picked by the director) ---------- */
const themeCol = (spec, n = 0) => { const th = spec.theme && spec.theme.accent ? spec.theme : null; return th ? (n % 2 ? th.accent : th.accent2) : '#22e6ff'; };
const ICONSET = ['play', 'heart', 'chat', 'chart', 'bell', 'star'];

function arcText(ctx, s, cx, cy, R, size, fam, fill, hi, hiFill, spread = 1) {   // text along an arc (centre top), hero letters in hiFill
  ctx.save(); ctx.font = fam.replace('SIZE', size); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const widths = [...s].map(c => ctx.measureText(c).width * spread), total = widths.reduce((a, b) => a + b, 0), span = total / R;
  let a = -Math.PI / 2 - span / 2;
  for (let i = 0; i < s.length; i++) {
    const w = widths[i], ang = a + w / R / 2; a += w / R;
    ctx.save(); ctx.translate(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); ctx.rotate(ang + Math.PI / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.fillStyle = i >= hi[0] && i < hi[1] ? hiFill : fill; ctx.fillText(s[i], 0, 0); ctx.restore();
  }
  ctx.restore();
}
function sticker(ctx, T, s, x, y, rot, bg, fg, size = 56) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = F(T, 'marker', size); const w = ctx.measureText(s).width + 44;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, -size * .78, w, size * 1.56, 16); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 2); ctx.restore();
}

/* ---------- effects: each is {pre, over}; pre draws the whole picture itself, over paints on top ---------- */
const FX = {
  // 2 glow hero word with tiny helper words (reel A)
  2: { over(ctx, t, k, fx, spec, T, res) {
    const a = eo(k * 4) * (1 - eo((k - 0.8) * 5)), pop = 0.7 + 0.3 * eb(k * 3), col = fx.col;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(3,4,16,0.35)'; ctx.fillRect(0, H * .45, W, H * .22); ctx.globalAlpha = a;
    const sz = fitSize(ctx, fx.word, famOf(T, 'serifItalic'), W * 0.86, 250 * pop);
    ctx.save(); ctx.translate(W / 2, H * .56); ctx.scale(1, 1);
    for (const [bl, al] of [[90, 0.6], [40, 0.9]]) text(ctx, fx.word, 0, 0, sz, famOf(T, 'serifItalic'), col, { glow: col, glowBlur: bl });
    text(ctx, fx.word, 0, 0, sz, famOf(T, 'serifItalic'), '#fff');
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.beginPath(); ctx.ellipse(0, 0, sz * fx.word.length * 0.27 + 70, sz * 0.62, -0.05, 0, Math.PI * 2 * eo(k * 2.2)); ctx.stroke();
    ctx.restore();
    (fx.helpers ?? []).forEach((h, i) => text(ctx, h.toUpperCase(), i ? W * .78 : W * .22, H * (i ? .66 : .47), 40, famOf(T, 'ui', 800), '#fff', { glow: col, glowBlur: 14 }));
    ctx.restore(); } },
  // 3 defocus punch (reel B): the frame blurs while one word lands
  3: { over(ctx, t, k, fx, spec, T, res) {
    const a = eo(k * 5) * (1 - eo((k - 0.82) * 6)); ctx.save(); ctx.globalAlpha = a; blurInto(ctx, res, W, H, 18); ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    const pop = 0.6 + 0.4 * eb(k * 3.5), sz = fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'anton'), W * 0.9, 330 * pop);
    ctx.globalAlpha = a; text(ctx, fx.word.toUpperCase(), W / 2, H * .5, sz, famOf(T, 'anton'), '#fff', { glow: '#fff', glowBlur: 30 }); ctx.restore(); } },
  // 6 curved arc caption (reel B)
  6: { over(ctx, t, k, fx, spec, T, res) {
    const a = eo(k * 5) * (1 - eo((k - 0.85) * 7)), s = fx.phrase.toUpperCase();
    ctx.save(); ctx.globalAlpha = a;
    const size = Math.min(120, 1500 / Math.max(6, s.length) * 1.3), R = 760;
    arcText(ctx, s, W / 2, H * .46 + 790 - eo(k * 3) * 0, R, size, famOf(T, 'anton'), '#fff', [fx.hi0, fx.hi1], T.palette.red, 1.06);
    ctx.restore(); } },
  // 7 colour field card (reel A): the colour ground changes with the meaning, the speaker sits in a rounded card
  7: { pre(ctx, t, k, fx, spec, T, res, seg) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, fx.col); g.addColorStop(1, '#05060f'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.arc(W * rnd(i, 1), H * rnd(i, 2), 180 + 220 * rnd(i, 3), 0, 7); ctx.fill(); }
    const s = eo(k * 4) * 0.12 + 0.88, cw = 800 * s, ch = 1180 * s, x = (W - cw) / 2, y = 330;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 44); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 44); ctx.clip();
    const [sx, sy, cwp, chp] = crop(res, seg.face, 1.25, 0.4); const ar = cw / ch, cc = Math.min(chp, cwp / ar); ctx.drawImage(res.video, sx + (cwp - cc * ar) / 2, sy, cc * ar, cc, x, y, cw, ch); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 44); ctx.stroke(); },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5); ctx.save(); ctx.globalAlpha = a; text(ctx, fx.word.toUpperCase(), W / 2, 215, fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'anton'), W * .84, 190), famOf(T, 'anton'), '#fff', { glow: fx.col, glowBlur: 30 }); ctx.restore(); } },
  // 11 rounded picture window with script captions (reel B)
  11: { pre(ctx, t, k, fx, spec, T, res, seg) {
    base(ctx, res, seg.face, 1.5); blurInto(ctx, res, W, H, 22); ctx.fillStyle = 'rgba(5,6,15,0.55)'; ctx.fillRect(0, 0, W, H);
    const s = eb(k * 3) * 0.1 + 0.9, cw = 700 * s, ch = 930 * s, x = (W - cw) / 2, y = 250;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 60); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 60); ctx.clip();
    const [sx, sy, cwp, chp] = crop(res, seg.face, 1.2, 0.4); const ar = cw / ch, cc = Math.min(chp, cwp / ar); ctx.drawImage(res.video, sx + (cwp - cc * ar) / 2, sy, cc * ar, cc, x, y, cw, ch); ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 60); ctx.stroke(); },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 4); ctx.save(); ctx.globalAlpha = a;
      text(ctx, fx.phrase, W / 2, 1380, fitSize(ctx, fx.phrase, famOf(T, 'script'), W * .86, 96), famOf(T, 'script'), '#fff', { glow: 'rgba(0,0,0,.8)', glowBlur: 20 });
      sticker(ctx, T, fx.word.toUpperCase(), W * .5, 1510, -0.05, T.palette.red, '#fff', 64); ctx.restore(); } },
  // 13 face push-in, text on the opposite side (reel A)
  13: { pre(ctx, t, k, fx, spec, T, res, seg) { const z = lerp(1.25, 1.7, eio(k)); base(ctx, res, seg.face, z, 0.42, fx.side * 0.12); grade(ctx, T); },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 4) * (1 - eo((k - 0.85) * 6)); ctx.save(); ctx.globalAlpha = a;
      const x = fx.side > 0 ? W * 0.78 : W * 0.22; const ws = fx.word.toUpperCase().split(/\s+/).slice(0, 2);
      ws.forEach((w, i) => text(ctx, w, x, H * .42 + i * 190, fitSize(ctx, w, famOf(T, 'anton'), W * .38, 160), famOf(T, 'anton'), i ? fx.col : '#fff', { glow: fx.col, glowBlur: 24 }));
      ctx.restore(); } },
  // 14 chapter card (reel A): ghost numeral, glowing icon, label
  14: { pre(ctx, t, k, fx, spec, T, res, seg) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#101a52'); g.addColorStop(1, '#05071c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    text(ctx, fx.num, W / 2, H * .5, 1250, famOf(T, 'anton'), 'rgba(255,255,255,0.07)'); },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 4) * (1 - eo((k - 0.88) * 8)); ctx.save(); ctx.globalAlpha = a;
      const s = eb(k * 3), cx = W / 2, cy = H * .44; ctx.translate(cx, cy); ctx.rotate(Math.PI / 4); ctx.scale(s, s);
      ctx.shadowColor = fx.col; ctx.shadowBlur = 70; ctx.fillStyle = fx.col; ctx.beginPath(); ctx.roundRect(-150, -150, 300, 300, 44); ctx.fill(); ctx.shadowBlur = 0; ctx.rotate(-Math.PI / 4); icon(ctx, fx.icon, 0, 0, 190, '#fff'); ctx.restore();
      ctx.save(); ctx.globalAlpha = a; text(ctx, fx.word.toUpperCase(), W / 2, H * .62, fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'anton'), W * .84, 150), famOf(T, 'anton'), '#fff', { glow: fx.col, glowBlur: 26 }); ctx.restore(); } },
  // 15 icon tiles popping over the speaker (reel A)
  15: { over(ctx, t, k, fx, spec, T, res) { ctx.save();
    [[W * .2, H * .3, 'play'], [W * .5, H * .22, 'heart'], [W * .8, H * .3, 'chat']].forEach(([x, y, ic], i) => { const kk = clamp((k - i * 0.14) * 3.2, 0, 1), o = 1 - eo((k - 0.82) * 6); if (kk <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(kk, 0, 1) * o; ctx.translate(x, y + Math.sin(t * 3 + i) * 8); ctx.rotate(Math.PI / 4 + 0.08 * Math.sin(t * 2 + i)); ctx.scale(eb(kk), eb(kk));
      ctx.shadowColor = fx.col; ctx.shadowBlur = 40; ctx.fillStyle = i === 1 ? fx.col : 'rgba(255,255,255,0.14)'; ctx.strokeStyle = fx.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-92, -92, 184, 184, 34); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.rotate(-Math.PI / 4 - 0.08 * Math.sin(t * 2 + i)); icon(ctx, ic, 0, 0, 100, '#fff'); ctx.restore(); });
    ctx.restore(); } },
  // 16 progress ring with the big word (reel B)
  16: { over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5) * (1 - eo((k - 0.86) * 7)); ctx.save(); ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#05060f'; ctx.fillRect(0, H * .42, W, H * .5); ctx.globalAlpha = a;
    const cx = W / 2, cy = H * .64, R = 300; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = T.palette.red; ctx.shadowColor = T.palette.red; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eio(k * 1.1)); ctx.stroke(); ctx.shadowBlur = 0;
    text(ctx, fx.word.toUpperCase(), cx, cy, fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'anton'), R * 1.5, 190), famOf(T, 'anton'), T.palette.red, { glow: '#000', glowBlur: 20 }); ctx.restore(); } },
  // 17 giant outlined type crossing the body (reel B)
  17: { over(ctx, t, k, fx, spec, T, res) { const s = fx.word.toUpperCase(), a = eo(k * 6) * (1 - eo((k - 0.85) * 7)); ctx.save(); ctx.globalAlpha = a;
    ctx.font = famOf(T, 'anton').replace('SIZE', 380); const w = ctx.measureText(s).width, x = lerp(W * .65 + w * .2, W * .35 - w * .2, k);
    text(ctx, s, x, H * .6, 380, famOf(T, 'anton'), null, { stroke: '#fff', lw: 7, glow: T.palette.red, glowBlur: 20, rot: -0.06 }); ctx.restore(); } },
  // 18 film strip frame with a prop and sticker words (reel B)
  18: { pre(ctx, t, k, fx, spec, T, res, seg) {
    ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H); const sw = 760, sx0 = (W - sw) / 2;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.04 + 0.01 * Math.sin(t * 2)); ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = '#151515'; ctx.fillRect(sx0 - 70, -100, sw + 140, H + 200);
    for (let y = -60 - (t * 90) % 120; y < H + 100; y += 120) { for (const x of [sx0 - 52, sx0 + sw + 14]) { ctx.fillStyle = '#e9e5da'; ctx.beginPath(); ctx.roundRect(x, y, 38, 62, 9); ctx.fill(); } }
    ctx.save(); ctx.beginPath(); ctx.rect(sx0, 150, sw, H - 340); ctx.clip(); const [cx, cy, cw, ch] = crop(res, seg.face, 1.15, 0.4), ar = sw / (H - 340), cc = Math.min(ch, cw / ar); ctx.drawImage(res.video, cx + (cw - cc * ar) / 2, cy, cc * ar, cc, sx0, 150, sw, H - 340); ctx.restore(); ctx.restore(); },
    over(ctx, t, k, fx, spec, T, res) { const a = eb(k * 3); ctx.save(); ctx.globalAlpha = clamp(a, 0, 1) * (1 - eo((k - 0.88) * 8));
      sticker(ctx, T, fx.word.toUpperCase(), W * .3, H * .18, -0.12, '#f5e642', '#111', 70); sticker(ctx, T, fx.helper.toUpperCase(), W * .72, H * .83, 0.08, T.palette.red, '#fff', 56); ctx.restore(); } },
  // 19 black and white mosaic with a red tint (reel B)
  19: { pre(ctx, t, k, fx, spec, T, res, seg) {
    ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H); const cols = 3, rows = 4, g = 14, tw = (W - g * (cols + 1)) / cols, th = (H - g * (rows + 1)) / rows;
    const f = seg.face ?? [0.5, 0.32, 0.2, 0.14];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c, x = g + c * (tw + g), y = g + r * (th + g), z = 1.15 + 0.7 * rnd(i, 4), kk = clamp((k * 1.6 - i * 0.05) * 4, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, tw, th); ctx.clip(); ctx.globalAlpha = kk;
      const cw = res.vw / z, ch = res.vh / z, ar = tw / th, cc = Math.min(ch, cw / ar); const sx = clamp(f[0] * res.vw - cc * ar / 2 + (rnd(i, 5) - 0.5) * 120, 0, res.vw - cc * ar), sy = clamp(f[1] * res.vh - 0.4 * cc + (rnd(i, 6) - 0.5) * 200, 0, res.vh - cc);
      ctx.drawImage(res.video, sx, sy, cc * ar, cc, x, y, tw, th);
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(x, y, tw, th);
      if (i === fx.hot) { ctx.globalCompositeOperation = 'color'; ctx.fillStyle = T.palette.red; ctx.fillRect(x, y, tw, th); }
      ctx.restore(); }
    ctx.fillStyle = T.palette.red; ctx.shadowColor = T.palette.red; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(W * .82, H * .1, 70 * eo(k * 3), 0, 7); ctx.fill(); ctx.shadowBlur = 0; },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5) * (1 - eo((k - 0.85) * 7)); ctx.save(); ctx.globalAlpha = a; text(ctx, fx.word.toUpperCase(), W / 2, H * .5, fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'anton'), W * .86, 250), famOf(T, 'anton'), '#fff', { stroke: '#000', lw: 10, glow: '#000', glowBlur: 20 }); ctx.restore(); } },
  // 20 stripe glitch with a flash (reel B)
  20: { over(ctx, t, k, fx, spec, T, res) {
    const n = 14, sh = H / n, snap = getScratch(res, 'gl', W, H), sc = snap.getContext('2d'); sc.clearRect(0, 0, W, H); sc.drawImage(ctx.canvas, 0, 0);
    const amp = (1 - k) * 90 + 10, ff = Math.floor(t * 24);
    for (let i = 0; i < n; i++) { const dx = (rnd(i, ff) - 0.5) * 2 * amp * (rnd(i, 9) > 0.45 ? 1 : 0); if (!dx) continue; ctx.drawImage(snap, 0, i * sh, W, sh, dx, i * sh, W, sh); }
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i++) { const y = H * rnd(i, ff + 3), hh = 20 + 70 * rnd(i, 7); ctx.fillStyle = i % 2 ? 'rgba(20,230,230,0.55)' : 'rgba(229,51,61,0.55)'; ctx.fillRect(0, y, W, hh); }
    ctx.restore(); const fl = 1 - clamp(k / 0.18, 0, 1); if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${0.85 * fl})`; ctx.fillRect(0, 0, W, H); } } },
  // 21 face slice split with stacked type (reel B)
  21: { pre(ctx, t, k, fx, spec, T, res, seg) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H); const [sx, sy, cw, ch] = crop(res, seg.face, 1.35, 0.4), n = 3, sw = W / n, e = eo(k * 3);
    for (let i = 0; i < n; i++) { const off = (i % 2 ? 1 : -1) * (1 - e) * H * 0.5 + (i % 2 ? 1 : -1) * 70 * e; ctx.save(); ctx.beginPath(); ctx.rect(i * sw + 6, 0, sw - 12, H); ctx.clip(); ctx.drawImage(res.video, sx + cw * i / n, sy, cw / n, ch, i * sw, off, sw, H); ctx.restore(); } },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5) * (1 - eo((k - 0.86) * 7)); ctx.save(); ctx.globalAlpha = a; const ws = fx.word.toUpperCase().split(/\s+/).slice(0, 2);
      ws.forEach((w, i) => text(ctx, w, W / 2, H * (0.42 + i * 0.12), fitSize(ctx, w, famOf(T, 'anton'), W * .9, 300), famOf(T, 'anton'), i ? T.palette.red : '#fff', { stroke: '#000', lw: 12 })); ctx.restore(); } },
  // 22 end card: name pill and call to action over the last seconds
  22: { over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 4); ctx.save(); ctx.globalAlpha = a; const y = H * .915 - (1 - a) * 40;
    ctx.fillStyle = 'rgba(5,6,15,0.78)'; ctx.beginPath(); ctx.roundRect(W * .1, y - 110, W * .8, 220, 40); ctx.fill(); ctx.strokeStyle = fx.col; ctx.lineWidth = 4; ctx.stroke();
    text(ctx, spec.handle ?? '', W / 2, y - 52, 56, famOf(T, 'sans', 800), '#fff'); text(ctx, spec.cta?.[0] ?? '', W / 2, y + 12, 42, famOf(T, 'sans', 700), fx.col); text(ctx, spec.cta?.[1] ?? '', W / 2, y + 68, 36, famOf(T, 'sans', 500), 'rgba(255,255,255,0.8)'); ctx.restore(); } },
};

/* ---------- picture and cutout effects (stock photos by keyword, person matte from engine/person_matte.py) ---------- */
function personCut(res, t) {
  const m = res.matteAt?.(t); if (!m) return null;
  const c = res.pc.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, res.vw, res.vh); c.drawImage(res.video, 0, 0, res.vw, res.vh);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(m, 0, 0, res.vw, res.vh); c.globalCompositeOperation = 'source-over'; return res.pc;
}
function drawPerson(ctx, res, t, face, z, anchorY = 0.42, dx = 0, shadow = true) {
  const pc = personCut(res, t); if (!pc) { base(ctx, res, face, z, anchorY, dx); return false; }
  const [sx, sy, cw, ch] = crop(res, face, z, anchorY, dx);
  ctx.save(); if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12; } ctx.drawImage(pc, sx, sy, cw, ch, 0, 0, W, H); ctx.restore(); return true;
}
const imgOf = (spec, res, fx, i) => { const k = fx.imgs?.[i % Math.max(1, fx.imgs?.length ?? 1)]; const p = k && spec.images?.[k]; return p ? res.images?.[p] ?? null : null; };
function photo(ctx, im, x, y, w, h, r = 18, tint = null) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  if (im) { const a = w / h, s = Math.max(w / im.width, h / im.height); ctx.drawImage(im, (im.width - w / s) / 2, (im.height - h / s) / 2, w / s, h / s, x, y, w, h); }
  else { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#3a3f6a'); g.addColorStop(1, '#161a38'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  if (tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
function halftone(ctx, res, im, x, y, w, h, step, col, bg) {   // dots sized by the picture's darkness
  const s = getScratch(res, 'ht', Math.ceil(w / step), Math.ceil(h / step)); const c = s.getContext('2d');
  c.clearRect(0, 0, s.width, s.height); if (im) { const sc = Math.max(s.width / im.width, s.height / im.height); c.drawImage(im, (im.width - s.width / sc) / 2, (im.height - s.height / sc) / 2, s.width / sc, s.height / sc, 0, 0, s.width, s.height); }
  const d = c.getImageData(0, 0, s.width, s.height).data; ctx.save(); ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); ctx.fillStyle = col;
  for (let j = 0; j < s.height; j++) for (let i = 0; i < s.width; i++) { const o = (j * s.width + i) * 4, lum = (d[o] * .3 + d[o + 1] * .59 + d[o + 2] * .11) / 255, r = (1 - lum) * step * 0.62 + 0.4; ctx.beginPath(); ctx.arc(x + (i + .5) * step, y + (j + .5) * step, r, 0, 7); ctx.fill(); }
  ctx.restore();
}
function torn(ctx, x, y, w, h, seed) { ctx.beginPath(); const n = 26; for (let i = 0; i <= n; i++) { const px = x + w * i / n, py = y + (rnd(i, seed) - .5) * 18; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  for (let i = 0; i <= n; i++) ctx.lineTo(x + w + (rnd(i, seed + 1) - .5) * 18, y + h * i / n); for (let i = n; i >= 0; i--) ctx.lineTo(x + w * i / n, y + h + (rnd(i, seed + 2) - .5) * 18); for (let i = n; i >= 0; i--) ctx.lineTo(x + (rnd(i, seed + 3) - .5) * 18, y + h * i / n); ctx.closePath(); }

Object.assign(FX, {
  // 1 poster collage card (reel B): halftone photo, giant outlined word, red flower, ticker words
  1: { pre(ctx, t, k, fx, spec, T, res) {
    ctx.fillStyle = '#efe6d6'; ctx.fillRect(0, 0, W, H); const im = imgOf(spec, res, fx, 0), e = eo(k * 3);
    ctx.save(); ctx.translate(W / 2, H * .46); ctx.rotate(-0.04); ctx.beginPath(); ctx.roundRect(-400, -520 * e, 800, 1040 * e, 30); ctx.clip(); ctx.translate(-W / 2, -H * .46); halftone(ctx, res, im, W / 2 - 400, H * .46 - 520, 800, 1040, 12, '#1a1a1a', '#efe6d6'); ctx.restore();
    ctx.save(); ctx.translate(W * .82, H * .2); ctx.rotate(t * .6); ctx.fillStyle = T.palette.red; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.ellipse(0, -70, 34, 72, 0, 0, 7); ctx.fill(); } ctx.restore();
    ctx.fillStyle = '#111'; ctx.font = famOf(T, 'ui', 800).replace('SIZE', 30); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const tk = (fx.ticker ?? fx.word).toUpperCase() + '   \u2022   '; const off = -(t * 140) % (ctx.measureText(tk).width);
    for (let x = off; x < W; x += ctx.measureText(tk).width) ctx.fillText(tk, x, H * .93); },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5) * (1 - eo((k - 0.88) * 8)); ctx.save(); ctx.globalAlpha = a; const s = fx.word.toUpperCase();
      text(ctx, s, W / 2, H * .46, fitSize(ctx, s, famOf(T, 'anton'), W * .9, 420), famOf(T, 'anton'), null, { stroke: '#fff', lw: 10 }); text(ctx, s, W / 2, H * .46, fitSize(ctx, s, famOf(T, 'anton'), W * .9, 420), famOf(T, 'anton'), null, { stroke: T.palette.red, lw: 3 }); ctx.restore(); } },
  // 4 white void cutout (reel B)
  4: { pre(ctx, t, k, fx, spec, T, res, seg) { ctx.fillStyle = '#f5f5f2'; ctx.fillRect(0, 0, W, H); const s = fx.word.toUpperCase();
      text(ctx, s, W / 2, H * .3, fitSize(ctx, s, famOf(T, 'anton'), W * .92, 520), famOf(T, 'anton'), '#111');
      drawPerson(ctx, res, t, seg.face, lerp(1.1, 1.22, eio(k))); }, over() {} },
  // 5 cutout on a colour field with a giant slanted word (reel B)
  5: { pre(ctx, t, k, fx, spec, T, res, seg) { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, T.palette.red); g.addColorStop(1, '#7a1020'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      photo(ctx, imgOf(spec, res, fx, 0), W * .08, H * .12, 360, 480, 20); const s = fx.word.toUpperCase();
      ctx.save(); ctx.translate(W / 2, H * .42); ctx.rotate(-0.16); text(ctx, s, lerp(80, 0, eo(k * 2)), 0, fitSize(ctx, s, famOf(T, 'anton'), W * 1.0, 640), famOf(T, 'anton'), 'rgba(255,255,255,0.92)'); ctx.restore();
      drawPerson(ctx, res, t, seg.face, lerp(1.15, 1.25, eio(k))); }, over() {} },
  // 8 photo cards fanned behind the speaker (reel B)
  8: { pre(ctx, t, k, fx, spec, T, res, seg) { ctx.fillStyle = '#0a0f2e'; ctx.fillRect(0, 0, W, H); const e = eb(k * 2.5);
      [-1, 0, 1].forEach((i, n) => { ctx.save(); ctx.translate(W / 2 + i * 300 * Math.min(1, e), H * .5 + Math.abs(i) * 50); ctx.rotate(i * 0.22 * Math.min(1, e)); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 36;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-250, -380, 500, 760, 24); ctx.fill(); ctx.shadowBlur = 0; photo(ctx, imgOf(spec, res, fx, n), -232, -362, 464, 724, 14); ctx.restore(); });
      drawPerson(ctx, res, t, seg.face, 1.2); }, over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5) * (1 - eo((k - 0.86) * 7)); ctx.save(); ctx.globalAlpha = a; text(ctx, fx.word.toUpperCase(), W / 2, H * .88, fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'script'), W * .8, 180), famOf(T, 'script'), T.palette.red, { glow: '#000', glowBlur: 18, stroke: '#fff', lw: 4 }); ctx.restore(); } },
  // 9 falling polaroids with a red string (reel B)
  9: { pre(ctx, t, k, fx, spec, T, res, seg) { base(ctx, res, seg.face, 1.2); blurInto(ctx, res, W, H, 20); ctx.fillStyle = 'rgba(5,6,15,0.7)'; ctx.fillRect(0, 0, W, H);
      const pts = []; for (let i = 0; i < 4; i++) { const kk = clamp(k * 1.5 - i * 0.12, 0, 1), x = W * (0.2 + 0.2 * i + 0.08 * Math.sin(i * 2)), y = lerp(-420, H * (0.2 + 0.17 * (i % 2) + 0.12 * i / 2), eo(kk)), rot = (i - 1.5) * 0.18 + Math.sin(t * 2 + i) * 0.03; pts.push([x, y - 330 * 0.9]);
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = '#f7f4ec'; ctx.beginPath(); ctx.rect(-190, -250, 380, 470); ctx.fill(); ctx.shadowBlur = 0; photo(ctx, imgOf(spec, res, fx, i), -165, -225, 330, 330, 4); ctx.restore(); }
      ctx.strokeStyle = T.palette.red; ctx.lineWidth = 7; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.quadraticCurveTo((pts[i - 1][0] + x) / 2, Math.max(y, pts[i - 1][1]) + 70, x, y) : ctx.moveTo(x, y)); ctx.stroke(); },
    over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 4) * (1 - eo((k - 0.88) * 8)); ctx.save(); ctx.globalAlpha = a; sticker(ctx, T, fx.word.toUpperCase(), W / 2, H * .82, -0.04, '#f5e642', '#111', 90); ctx.restore(); } },
  // 10 TV wall behind the speaker (reel B)
  10: { pre(ctx, t, k, fx, spec, T, res, seg) { ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H); const cols = 3, rows = 4, g = 16, tw = (W - g * (cols + 1)) / cols, th = (H * .78 - g * (rows + 1)) / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c, x = g + c * (tw + g), y = H * .06 + g + r * (th + g), on = clamp((k * 2.2 - i * 0.07) * 5, 0, 1); ctx.fillStyle = '#16181f'; ctx.beginPath(); ctx.roundRect(x - 6, y - 6, tw + 12, th + 12, 14); ctx.fill(); ctx.save(); ctx.globalAlpha = on; photo(ctx, imgOf(spec, res, fx, i), x, y, tw, th, 8, 'rgba(150,170,255,1)'); ctx.restore(); }
      drawPerson(ctx, res, t, seg.face, 1.25, 0.42); }, over(ctx, t, k, fx, spec, T, res) { const a = eo(k * 5) * (1 - eo((k - 0.86) * 7)); ctx.save(); ctx.globalAlpha = a; text(ctx, fx.word.toUpperCase(), W / 2, H * .9, fitSize(ctx, fx.word.toUpperCase(), famOf(T, 'anton'), W * .86, 190), famOf(T, 'anton'), '#fff', { stroke: '#000', lw: 12 }); ctx.restore(); } },
  // 12 torn paper collage with typewriter captions (reel B)
  12: { pre(ctx, t, k, fx, spec, T, res, seg) { ctx.fillStyle = '#e8dfcc'; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(90,70,40,${0.03 * rnd(i, 1)})`; ctx.fillRect(W * rnd(i, 2), H * rnd(i, 3), 2, 2); }
      const sp = [[W * .08, H * .08, 520, 640, -0.05, 0], [W * .46, H * .2, 470, 560, 0.06, 1]]; sp.forEach(([x, y, w, h, rot, n], i) => { const kk = eo(clamp(k * 2.2 - i * 0.2, 0, 1)); ctx.save(); ctx.translate(x + w / 2, y + h / 2 + (1 - kk) * 200); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2); ctx.globalAlpha = kk;
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; torn(ctx, -14, -14, w + 28, h + 28, i * 7); ctx.fill(); ctx.shadowBlur = 0; ctx.save(); torn(ctx, 0, 0, w, h, i * 7 + 1); ctx.clip(); photo(ctx, imgOf(spec, res, fx, i), 0, 0, w, h, 0); ctx.restore(); ctx.restore(); });
      const pc = personCut(res, t); const fk = clamp(k * 2.5 - 0.3, 0, 1); if (pc) { ctx.save(); ctx.globalAlpha = fk; const dw = W * .72, dh = H * .6, [sx, sy, cw, ch] = crop(res, seg.face, 1.5, 0.35), ar = dw / dh, cc = Math.min(ch, cw / ar); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.drawImage(pc, sx + (cw - cc * ar) / 2, sy, cc * ar, cc, W * .28, H * .4, dw, dh); ctx.restore(); } },
    over(ctx, t, k, fx, spec, T, res) { const n = Math.floor(clamp(k * 1.6, 0, 1) * fx.phrase.length), s = fx.phrase.toUpperCase().slice(0, n) + (Math.floor(t * 4) % 2 ? '|' : ''); ctx.save(); text(ctx, s, W / 2, H * .88, fitSize(ctx, fx.phrase.toUpperCase() + '|', famOf(T, 'ui', 700).replace(/"Inter"/, '"JetBrains Mono"'), W * .9, 70), famOf(T, 'ui', 700).replace(/"Inter"/, '"JetBrains Mono"'), '#111'); ctx.restore(); } },
});

/* ---------- new in this version: 23 bokeh glow word, 24 highlighter phrase ---------- */
Object.assign(FX, {
  23: { pre(ctx, t, k, fx, spec, T, res, seg) {
      const th = spec.theme ?? {}; base(ctx, res, seg.face, 1.25, 0.42); blurInto(ctx, res, W, H, 14);
      ctx.fillStyle = (th.dark ?? '#10061c') + 'cc'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) { const x = (W * rnd(i, 7) + Math.sin(t * 0.7 + i) * 90 + W) % W, y = (H * rnd(i, 8) - t * (20 + 30 * rnd(i, 9)) + H * 2) % H, r = 40 + 120 * rnd(i, 10);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r); const col = i % 3 ? (th.accent ?? '#e5333d') : (th.accent2 ?? '#ff9aa2'); g.addColorStop(0, col + '88'); g.addColorStop(0.7, col + '22'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.restore();
      const pc = personCut(res, t); if (pc) { const [sx, sy, cw, ch] = crop(res, seg.face, 1.25, 0.42); ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(pc, sx, sy, cw, ch, 0, 0, W, H); ctx.restore(); }
    },
    over(ctx, t, k, fx, spec, T, res) {
      const th = spec.theme ?? {}, a = eo(k * 5) * (1 - eo((k - 0.88) * 8)), s = fx.word.toUpperCase(), z = 0.9 + 0.1 * eb(k * 3), sz = fitSize(ctx, s, famOf(T, 'ui', 800), W * 0.84, 250 * z);
      ctx.save(); ctx.globalAlpha = a; text(ctx, s, W / 2, H * 0.5, sz, famOf(T, 'ui', 800), '#fff', { glow: th.accent ?? '#e5333d', glowBlur: 90 });
      text(ctx, s, W / 2, H * 0.5, sz, famOf(T, 'ui', 800), '#fff', { glow: th.accent2 ?? '#fff', glowBlur: 30 });
      text(ctx, fx.helper.toLowerCase(), W / 2, H * 0.5 - sz * 0.78, 64, famOf(T, 'serifItalic'), 'rgba(255,255,255,0.92)', { glow: 'rgba(0,0,0,0.6)', glowBlur: 14 }); ctx.restore(); } },
  24: { over(ctx, t, k, fx, spec, T, res) {
      const th = spec.theme ?? {}, words = (fx.phrase || fx.word).toUpperCase().split(' ').slice(0, 4), a = 1 - eo((k - 0.9) * 10);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      let y = H * 0.66; words.forEach((wd, i) => { const hero = wd.toLowerCase() === fx.word.toLowerCase(), size = fitSize(ctx, wd, famOf(T, 'ui', 800), W * 0.86 - 64, hero ? 130 : 78), fam = famOf(T, 'ui', 800).replace('SIZE', size);
        ctx.font = fam; const w = ctx.measureText(wd).width + 64, kk = eo((k * 4 - i * 0.35)), x = W * 0.5 - w / 2 + (i % 2 ? 40 : -40), rot = (i % 2 ? 0.02 : -0.025);
        ctx.save(); ctx.translate(W / 2 + (i % 2 ? 40 : -40), y); ctx.rotate(rot); ctx.fillStyle = hero ? (th.accent ?? '#e5333d') : '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.roundRect(-w / 2, -size * 0.72, w * kk, size * 1.44, 14); ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.rect(-w / 2, -size, w * kk, size * 2); ctx.clip(); ctx.fillStyle = hero ? '#fff' : '#101010'; ctx.fillText(wd, -w / 2 + 32, 4); ctx.restore(); y += size * 1.5 + 6; });
      ctx.restore(); } },
});

/* ---------- new in this version: 25 number poster (red duotone, giant outlined number), 26 vertical photo strips with a sun ---------- */
function duo(ctx, im, x, y, w, h, col, amt = 1) {   // grey the photo, then multiply the accent into it (the red-tinted B&W look of the reel)
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (im) { const sc = Math.max(w / im.width, h / im.height); ctx.drawImage(im, (im.width - w / sc) / 2, (im.height - h / sc) / 2, w / sc, h / sc, x, y, w, h); } else { ctx.fillStyle = '#777'; ctx.fillRect(x, y, w, h); }
  ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = amt; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.restore();
}
Object.assign(FX, {
  25: { pre(ctx, t, k, fx, spec, T, res, seg) {
      const th = spec.theme ?? {}, e = eo(k * 3), im = imgOf(spec, res, fx, 0);
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.accent ?? '#e5333d'); g.addColorStop(1, th.dark ?? '#14060a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.85 * e; duo(ctx, im, W * 0.08, H * 0.12, W * 0.84, H * 0.62, th.accent ?? '#e5333d', 1); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000'; for (let j = 0; j < 30; j++) for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc(i * 72 + (j % 2) * 36 + 20, j * 66 + 20, 8 + 8 * rnd(i, j), 0, 7); ctx.fill(); } ctx.restore();
      const pc = personCut(res, t); if (pc) { const [sx, sy, cw, ch] = crop(res, seg.face, 1.35, 0.42); ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.drawImage(pc, sx, sy, cw, ch, 0, H * 0.16 * (1 - e), W, H); ctx.restore(); } },
    over(ctx, t, k, fx, spec, T, res) {
      const th = spec.theme ?? {}, a = eo(k * 5) * (1 - eo((k - 0.88) * 8)), n = (fx.numStr || fx.word).toUpperCase(), fam = famOf(T, 'anton'), sz = fitSize(ctx, n, fam, W * 0.98, 460);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.34); ctx.rotate(-0.07); text(ctx, n, 0, 0, sz * (0.9 + 0.1 * eb(k * 3)), fam, null, { stroke: '#fff', lw: 9 });
      text(ctx, n, 6, 10, sz * (0.9 + 0.1 * eb(k * 3)), fam, 'rgba(0,0,0,0.0)', {}); ctx.restore();
      ctx.save(); ctx.globalAlpha = a; text(ctx, fx.helper.toLowerCase(), W * 0.5, H * 0.34 + sz * 0.52, 120, famOf(T, 'serifItalic'), '#fff', { glow: 'rgba(0,0,0,0.5)', glowBlur: 16, rot: -0.05 }); ctx.restore(); } },
  26: { pre(ctx, t, k, fx, spec, T, res, seg) {
      const th = spec.theme ?? {}; ctx.fillStyle = th.dark ?? '#14060a'; ctx.fillRect(0, 0, W, H);
      const cols = 5, gw = W / cols;
      for (let i = 0; i < cols; i++) { const dir = i % 2 ? 1 : -1, off = dir * (1 - eo(k * 2.2 - i * 0.12)) * H * 0.7, im = imgOf(spec, res, fx, i); ctx.save(); ctx.translate(0, off); duo(ctx, im, i * gw + 6, H * 0.06, gw - 12, H * 0.68, th.accent ?? '#e5333d', 1); ctx.restore(); }
      ctx.save(); ctx.fillStyle = th.accent2 ?? '#ff8a80'; ctx.shadowColor = th.accent ?? '#e5333d'; ctx.shadowBlur = 80; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.3, 230 * (0.9 + 0.1 * eb(k * 3)), 0, 7); ctx.fill(); ctx.restore();
      drawPerson(ctx, res, t, seg.face, 1.3, 0.42, 0, true); },
    over(ctx, t, k, fx, spec, T, res) {
      const th = spec.theme ?? {}, a = eo(k * 5) * (1 - eo((k - 0.88) * 8)), s = fx.word.toUpperCase(), sz = fitSize(ctx, s, famOf(T, 'ui', 800), W * 0.86, 150);
      ctx.save(); ctx.globalAlpha = a; ctx.font = famOf(T, 'ui', 800).replace('SIZE', sz); const w = ctx.measureText(s).width + 70; ctx.translate(W / 2, H * 0.84); ctx.rotate(-0.03); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.roundRect(-w / 2, -sz * 0.75, w * eo(k * 4), sz * 1.5, 18); ctx.fill();
      ctx.shadowBlur = 0; ctx.beginPath(); ctx.rect(-w / 2, -sz, w * eo(k * 4), sz * 2); ctx.clip(); ctx.fillStyle = th.accent ?? '#e5333d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 4); ctx.restore(); } },
});
for (const i of [1, 4, 5, 8, 9, 10, 12, 23, 24, 25, 26]) FX[i].over ??= () => {};

export const EFFECT_IDS = Object.keys(FX).map(Number);
const OWNS_CAPTION = new Set([25, 26, 23, 24, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21]);

function captions(ctx, t, spec, T, owned) {
  if (owned) return;
  const c = (spec.captions ?? []).find(c => t >= c.t0 && t < c.t1); if (!c || c.hidden) return;
  const small = c.words.filter(w => !w.hero && w.t <= t), hero = c.words.find(w => w.hero && w.t <= t);
  const S = c.scale ?? 1, HFAM = c.font ?? famOf(T, 'serifItalic');   // per-card overrides from a targeted edit
  const y = H * (0.80 + (c.dy ?? 0)), kk = eo((t - (hero?.t ?? c.t0)) / 0.14);
  ctx.save();
  if (small.length) text(ctx, small.map(w => w.w).join(' ').toUpperCase(), W / 2, y - (hero ? 130 * S : 0), 54 * S, famOf(T, 'ui', 800), '#fff', { glow: 'rgba(0,0,0,0.85)', glowBlur: 16 });
  if (hero) { const col = c.color ?? themeCol(spec, hero.w.length), s = c.upper ? hero.w.toUpperCase() : hero.w, sz = fitSize(ctx, s, HFAM, W * 0.86, 170 * S * (0.8 + 0.2 * eb(kk)));
    text(ctx, s, W / 2, y, sz, HFAM, '#fff', { glow: col, glowBlur: 46 }); }
  ctx.restore();
}


/* ---------- camera: real shot changes (wide / medium / tight with the face off-centre), punch-in on every cut, slow push inside a shot ---------- */
const camAt = (spec, t) => (spec.cam ?? []).find(c => t >= c.t0 && t < c.t1) ?? null;
function cameraDraw(ctx, t, spec, T, res, seg) {
  const c = camAt(spec, t); const face = seg.face ?? spec.cam?.[0]?.face;
  if (!c) { base(ctx, res, face, 1.0); return null; }
  const k = clamp((t - c.t0) / Math.max(0.01, c.t1 - c.t0), 0, 1), kin = clamp((t - c.t0) / 0.22, 0, 1);
  const punch = c.z0 * (0.8 + 0.2 * eb(kin));                    // snap in with a small overshoot at every cut
  const z = Math.max(1, punch * (1 + c.drift * eio(k)));          // then a slow push
  const anchor = c.anchorY ?? 0.42;
  if (c.world && res.matteAt?.(t) && personCut(res, t)) { worldDraw(ctx, t, k, c, spec, T, res, c.face ?? face, z, anchor); return c; }
  base(ctx, res, c.face ?? face, z, anchor, 0.5 - c.xo);
  grade(ctx, T); return c;
}

/* ---------- colour worlds: the background behind the speaker becomes a moving colour scene (like the first reel's wall colours) ---------- */
function worldDraw(ctx, t, k, c, spec, T, res, face, z, anchor) {
  const [c1, c2] = c.world, ph = t * 0.35;
  const g = ctx.createLinearGradient(W * (0.5 + Math.cos(ph) * 0.5), 0, W * (0.5 - Math.cos(ph) * 0.5), H); g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';                                   // soft moving light blobs
  for (let i = 0; i < 4; i++) { const x = W * (0.2 + 0.6 * rnd(i, 3)) + Math.sin(t * 0.8 + i * 2) * 120, y = H * (0.2 + 0.6 * rnd(i, 4)) + Math.cos(t * 0.6 + i) * 140, r = 260 + 140 * rnd(i, 5);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,0.20)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  // giant faint word-less stripes for depth
  ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = '#000'; for (let i = 0; i < 5; i++) ctx.fillRect(((i * 260 + t * 60) % (W + 260)) - 260, 0, 90, H); ctx.restore();
  const pc = personCut(res, t), [sx, sy, cw, ch] = crop(res, face, z, anchor, 0.5 - c.xo);
  ctx.save(); ctx.shadowColor = c2; ctx.shadowBlur = 70; ctx.drawImage(pc, sx, sy, cw, ch, 0, 0, W, H);          // coloured rim glow
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14; ctx.drawImage(pc, sx, sy, cw, ch, 0, 0, W, H); ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.5, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function captionsOnePart(ctx, t, spec, T, c) {
  const cap = (spec.captions ?? []).find(x => t >= x.t0 && t < x.t1); if (!cap || cap.hidden) return;
  const small = cap.words.filter(w => !w.hero && w.t <= t), hero = cap.words.find(w => w.hero && w.t <= t);
  const S = cap.scale ?? 1, HFAM = cap.font ?? famOf(T, 'serifItalic');   // per-card overrides from a targeted edit
  // the text block lives in ONE part of the frame: the half opposite the face in tight shots, the chest/lower area otherwise
  let cx = W / 2, cy = H * 0.74, maxW = W * 0.86, align = 'center';
  if (c && c.textSide) { cx = c.textSide > 0 ? W * 0.74 : W * 0.26; cy = H * 0.5; maxW = W * 0.44; }
  cy += (cap.dy ?? 0) * H;
  const kk = eo((t - (hero?.t ?? cap.t0)) / 0.14);
  ctx.save();
  if (small.length) text(ctx, small.map(w => w.w).join(' ').toUpperCase(), cx, cy - (hero ? 120 * S : 0), (c?.textSide ? 40 : 52) * S, famOf(T, 'ui', 800), '#fff', { glow: 'rgba(0,0,0,0.85)', glowBlur: 16 });
  if (hero) { const col = cap.color ?? themeCol(spec, hero.w.length), s = cap.upper ? hero.w.toUpperCase() : hero.w, sz = fitSize(ctx, s, HFAM, maxW, 170 * S * (0.8 + 0.2 * eb(kk)));
    text(ctx, s, cx, cy, sz, HFAM, '#fff', { glow: col, glowBlur: 46 }); }
  ctx.restore();
}


/* ---------- finishing: handheld drift, whip-blur transition on every cut, light leak, grain ---------- */
let NOISE = null;
function noise(res) { if (NOISE) return NOISE; const c = res.make(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < 256 * 256; i++) { const v = 90 + rnd(i, 1) * 120; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } x.putImageData(d, 0, 0); NOISE = c; return c; }
function cutDistance(spec, t) { let best = 9, bt = 0; for (const c of spec.cam ?? []) if (t >= c.t0 && t - c.t0 < best) { best = t - c.t0; bt = c.t0; } for (const f of spec.fx ?? []) if (t >= f.t0 && t - f.t0 < best) { best = t - f.t0; bt = f.t0; } return { d: best, bt }; }
const TRANS = ['whip', 'radial', 'invert', 'tilt', 'shatter'], TWIN = { whip: 0.16, radial: 0.2, invert: 0.12, tilt: 0.22, shatter: 0.3 };
function transition(ctx, kind, s, t, th, res, bt) {   // s = 1 at the cut, 0 when settled; works on a copy of the finished frame
  const snap = getScratch(res, 'whip', W, H), c2 = snap.getContext('2d'); c2.clearRect(0, 0, W, H); c2.drawImage(ctx.canvas, 0, 0);
  const sgn = rnd(Math.round(bt * 10), 12) > 0.5 ? 1 : -1;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (kind === 'whip') { ctx.clearRect(0, 0, W, H); const N = 9; for (let i = 0; i < N; i++) { const o = (i - (N - 1) / 2) / N, sc = 1 + 0.07 * s * (i / N); ctx.globalAlpha = 1 / (1 + Math.abs(o) * 2.2) / (N / 3.2); ctx.save(); ctx.translate(W / 2 + o * 160 * s * sgn, H / 2); ctx.scale(sc, sc); ctx.drawImage(snap, -W / 2, -H / 2); ctx.restore(); } }
  else if (kind === 'radial') { ctx.clearRect(0, 0, W, H); const N = 11; for (let i = 0; i < N; i++) { const sc = 1 + 0.2 * s * (i / N); ctx.globalAlpha = 1 / (N / 2.4) * (1 - i / N * 0.4); ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc); ctx.drawImage(snap, -W / 2, -H * 0.42); ctx.restore(); } }
  else if (kind === 'invert') { ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = s > 0.45 ? 1 : 0.55 * s * 2; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  else if (kind === 'tilt') { ctx.fillStyle = th.dark ?? '#0b0b10'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.35; ctx.save(); ctx.translate(W / 2 - sgn * W * 0.5 * s, H / 2); ctx.rotate(-sgn * 0.12 * s); ctx.drawImage(snap, -W / 2, -H / 2); ctx.restore();
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(W / 2 + sgn * W * 0.3 * s, H / 2); ctx.rotate(sgn * 0.1 * s); ctx.scale(1 + 0.12 * s, 1 + 0.12 * s); ctx.drawImage(snap, -W / 2, -H / 2); ctx.restore(); }
  else if (kind === 'shatter') { ctx.fillStyle = th.dark ?? '#0b0b10'; ctx.fillRect(0, 0, W, H); const cols = 5, rows = 8, cw = W / cols, ch = H / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) for (let h = 0; h < 2; h++) { const id = (j * cols + i) * 2 + h, ang = rnd(id, 13) * 6.283, dist = (60 + 380 * rnd(id, 14)) * s * s, cx = (i + 0.5) * cw, cy = (j + 0.5) * ch;
        ctx.save(); ctx.translate(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist); ctx.rotate((rnd(id, 15) - 0.5) * 1.4 * s); ctx.translate(-cx, -cy); ctx.beginPath();
        if (h) { ctx.moveTo(i * cw, j * ch); ctx.lineTo((i + 1) * cw, j * ch); ctx.lineTo((i + 1) * cw, (j + 1) * ch); } else { ctx.moveTo(i * cw, j * ch); ctx.lineTo((i + 1) * cw, (j + 1) * ch); ctx.lineTo(i * cw, (j + 1) * ch); }
        ctx.closePath(); ctx.clip(); ctx.drawImage(snap, 0, 0); ctx.restore(); } }
  if (kind !== 'invert') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = th.accent ?? '#e5333d'; ctx.globalAlpha = 0.22 * s; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function finishing(ctx, t, spec, T, res) {
  const th = spec.theme ?? {}, { d, bt } = cutDistance(spec, t);
  const kind = TRANS[Math.floor(rnd(Math.round(bt * 10), 11) * TRANS.length) % TRANS.length], WH = TWIN[kind];
  if (d < WH && t > 0.2) transition(ctx, kind, 1 - d / WH, t, th, res, bt);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (d < 0.5) { const s2 = Math.pow(1 - d / 0.5, 2), g = ctx.createRadialGradient(W * (0.15 + 0.7 * rnd(Math.floor(t * 3), 2)), H * 0.1, 10, W * 0.5, H * 0.3, H * 0.7); g.addColorStop(0, (th.accent2 ?? '#ffb36b') + 'ff'); g.addColorStop(1, '#00000000'); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.33 * s2; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }   // light leak
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.10; const n = noise(res), ox = Math.floor(rnd(Math.floor(t * 24), 5) * 256), oy = Math.floor(rnd(Math.floor(t * 24), 6) * 256);
  for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(n, x, y);                                                                                   // film grain
  ctx.restore();
}

export function drawFrame(ctx, t, spec, T, res) {
  if (spec.theme?.accent) { T._base ??= { ...T.palette }; Object.assign(T.palette, T._base, { red: spec.theme.accent, cyan: spec.theme.accent2, magenta: spec.theme.accent, orange: spec.theme.accent2 }); }   // one accent family per video
  const seg = segAt(spec, t), fx = fxAt(spec, t), k = fx ? (t - fx.t0) / (fx.t1 - fx.t0) : 0;
  const fn = fx ? FX[fx.id] : null; let camUsed = null;
  ctx.save(); ctx.clearRect(0, 0, W, H);
  { const dr = 1.025; ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(t * 1.7) * 0.0035); ctx.scale(dr, dr); ctx.translate(Math.sin(t * 2.3) * 7 - W / 2, Math.cos(t * 1.9) * 6 - H / 2); }   // handheld drift
  if (fn?.pre) fn.pre(ctx, t, k, fx, spec, T, res, seg);
  else camUsed = cameraDraw(ctx, t, spec, T, res, seg);
  if (fn?.over) fn.over(ctx, t, k, fx, spec, T, res);
  if (!(fx && OWNS_CAPTION.has(fx.id) && fx.id !== 22)) captionsOnePart(ctx, t, spec, T, camUsed ?? camAt(spec, t));
  ctx.restore();
  finishing(ctx, t, spec, T, res);
}
