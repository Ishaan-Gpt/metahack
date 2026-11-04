// Card Studio drawing: one pure Canvas 2D module shared by the browser preview (player/card-studio.html) and the
// Node MP4 renderer (tools/render-card.mjs, @napi-rs/canvas). No AI: every pixel is code.
// drawFrame(ctx, t, spec, T, res) where res = { video, vw, vh, images: {path: img}, layers: {under, over} }.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
export const ease = {
  out: k => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
  inOut: k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: k => { k = clamp(k, 0, 1); const c = 1.5; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};
const font = (T, key, size, weight = 400) => `${T.fonts[key].style === 'italic' ? 'italic ' : ''}${weight} ${size}px "${T.fonts[key].family}"`;

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

/** draw an image to cover the rect, centred on (fx, fy) in 0..1 of the image, at zoom z (>= 1). */
function cover(ctx, img, iw, ih, x, y, w, h, fx = 0.5, fy = 0.5, z = 1, anchorY = 0.5) {
  const a = w / h;
  let ch = Math.min(ih, iw / a) / z, cw = ch * a;
  let sx = fx * iw - cw / 2, sy = fy * ih - anchorY * ch;
  sx = clamp(sx, 0, iw - cw); sy = clamp(sy, 0, ih - ch);
  ctx.drawImage(img, sx, sy, cw, ch, x, y, w, h);
}
/** face framing: zoom limited so the face box (with margin) always stays inside the crop. */
function faceZoom(face, vw, vh, w, h, z) {
  if (!face) return z;
  const a = w / h, ch0 = Math.min(vh, vw / a), fh = face[3] * vh, fw = face[2] * vw;
  const maxZ = Math.min(ch0 / (fh * 2.4), ch0 * a / (fw * 1.9));
  return clamp(z, 1, Math.max(1, maxZ));
}
function drawFace(ctx, res, seg, T, x, y, w, h, z) {
  const f = seg.face ?? [0.5, 0.36, 0.3, 0.17];
  const zz = faceZoom(f, res.vw, res.vh, w, h, z);
  cover(ctx, res.video, res.vw, res.vh, x, y, w, h, f[0], f[1], zz, T.motion.faceAnchorY);
  // where the chin lands on the canvas (captions go below it when the face is large in frame)
  const a = w / h, ch = Math.min(res.vh, res.vw / a) / zz;
  const sy = clamp(f[1] * res.vh - T.motion.faceAnchorY * ch, 0, res.vh - ch);
  res.faceBottom = y + ((f[1] + f[3] * 0.62) * res.vh - sy) / ch * h;
}

export function sparkle(ctx, x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rad = i % 2 === 0 ? r : r * 0.22; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function starburst(ctx, x, y, r, n, color, inner = 0.18) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = a + Math.PI / n * 0.5, c = a - Math.PI / n * 0.5;
    ctx.moveTo(Math.cos(c) * r * inner, Math.sin(c) * r * inner);
    ctx.quadraticCurveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, Math.cos(a) * r, Math.sin(a) * r);
    ctx.quadraticCurveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, Math.cos(b) * r * inner, Math.sin(b) * r * inner);
  }
  ctx.fill(); ctx.restore();
}

/** Static layers, built once: under = background, starburst, storyboard card, card shadow; over = badge, handle, CTA. */
export function buildLayers(spec, T, res, mk) {
  const { w: W, h: H } = T.canvas, P = T.palette, L = T.layout, C = L.card;
  const under = mk(W, H), u = under.getContext('2d');
  const g = u.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bgTop); g.addColorStop(1, P.bgBottom);
  u.fillStyle = g; u.fillRect(0, 0, W, H);
  const rg = u.createRadialGradient(L.blob.cx, L.blob.cy, 0, L.blob.cx, L.blob.cy, L.blob.r * 1.2);
  rg.addColorStop(0, 'rgba(246,225,210,0.55)'); rg.addColorStop(1, 'rgba(246,225,210,0)');
  u.fillStyle = rg; u.fillRect(0, 0, W, H);
  u.globalAlpha = P.blobAlpha; starburst(u, L.blob.cx, L.blob.cy, L.blob.r, L.blob.petals, P.blob); u.globalAlpha = 1;
  // storyboard card: sketch-like greyscale thumbnails of the clip's own stock images
  const S = L.storyboard;
  u.save(); u.shadowColor = 'rgba(0,0,0,0.12)'; u.shadowBlur = 30; u.shadowOffsetY = 10; u.fillStyle = '#fdfcfa'; rr(u, S.x, S.y, S.w, S.h, S.r); u.fill(); u.restore();
  const thumbs = (spec.storyboard ?? []).map(p => res.images[p]).filter(Boolean);
  const ph = (S.h - 4 * 18) / 3;
  for (let i = 0; i < 3; i++) {
    const y = S.y + 18 + i * (ph + 18), x = S.x + 18, w = S.w - 36 - 120; // panels end before the main card covers them
    u.save(); rr(u, x, y, w, ph, 10); u.clip();
    if (thumbs[i]) { u.filter = 'grayscale(1) contrast(1.5) brightness(1.25)'; cover(u, thumbs[i], thumbs[i].width, thumbs[i].height, x, y, w, ph); u.filter = 'none'; u.fillStyle = 'rgba(253,252,250,0.35)'; u.fillRect(x, y, w, ph); }
    else { u.fillStyle = '#efede9'; u.fillRect(x, y, w, ph); }
    u.restore(); u.strokeStyle = '#3a3a3a'; u.lineWidth = 2.5; rr(u, x, y, w, ph, 10); u.stroke();
  }
  // storyboard pill
  u.font = font(T, 'ui', 32, 500); const sw = u.measureText('Storyboard').width;
  u.fillStyle = '#1d1d1d'; rr(u, S.x, S.pillY, sw + 92, S.pillH, S.pillH / 2); u.fill();
  u.fillStyle = '#e8553e'; u.beginPath(); u.arc(S.x + 36, S.pillY + S.pillH / 2, 9, 0, Math.PI * 2); u.fill();
  u.fillStyle = '#fff'; u.textBaseline = 'middle'; u.fillText('Storyboard', S.x + 60, S.pillY + S.pillH / 2 + 1);
  // main card shadow (the card itself is drawn per frame)
  u.save(); u.shadowColor = C.shadowColor; u.shadowBlur = C.shadowBlur; u.shadowOffsetY = C.shadowY; u.fillStyle = '#ddd'; rr(u, C.x, C.y, C.w, C.h, C.r); u.fill(); u.restore();

  const over = mk(W, H), o = over.getContext('2d');
  // badge pill: dark warm gradient, starburst icon, label
  const B = L.badge; o.font = font(T, 'ui', B.textSize, 300); const bw = o.measureText(spec.badge).width + B.h + 70;
  const bg = o.createLinearGradient(B.x, 0, B.x + bw, 0); bg.addColorStop(0, P.badgeA); bg.addColorStop(1, P.badgeB);
  o.save(); o.shadowColor = 'rgba(0,0,0,0.25)'; o.shadowBlur = 24; o.shadowOffsetY = 8; o.fillStyle = bg; rr(o, B.x, B.y, bw, B.h, B.h / 2); o.fill(); o.restore();
  starburst(o, B.x + B.h * 0.55, B.y + B.h / 2, B.h * 0.34, 10, P.accent, 0.3); o.fillStyle = P.accent; o.beginPath(); o.arc(B.x + B.h * 0.55, B.y + B.h / 2, B.h * 0.08, 0, Math.PI * 2); o.fill();
  o.fillStyle = '#f4efe9'; o.textBaseline = 'middle'; o.fillText(spec.badge, B.x + B.h + 6, B.y + B.h / 2 + 2);
  // handle, top right
  o.font = font(T, 'ui', L.handle.size, 500); o.fillStyle = P.muted; o.textAlign = 'right'; o.textBaseline = 'alphabetic'; o.fillText(spec.handle, L.handle.xRight, L.handle.y); o.textAlign = 'left';
  // CTA, two lines centred, the keyword in the accent colour
  const line = (txt, y, size) => {
    const parts = txt.split(/("[^"]+")/).filter(Boolean);
    const fw = p => (o.font = font(T, 'ui', size, /^"/.test(p) ? 700 : 500), o.measureText(p).width);
    let tw = parts.reduce((s, p) => s + fw(p), 0), sc = Math.min(1, (W - 120) / tw), x = W / 2 - tw * sc / 2;
    for (const p of parts) { o.font = font(T, 'ui', size * sc, /^"/.test(p) ? 700 : 500); o.fillStyle = /^"/.test(p) ? P.accent : P.ink; o.fillText(p, x, y); x += o.measureText(p).width; }
  };
  line(spec.cta[0], L.cta.y1, L.cta.size); line(spec.cta[1], L.cta.y2, L.cta.size);
  return { under, over };
}

function segAt(spec, t) {
  const s = spec.segments; let i = s.findIndex(g => t >= g.t0 && t < g.t1);
  if (i < 0) i = t < s[0].t0 ? 0 : s.length - 1;
  return i;
}

/** the interior of the card for one segment, already clipped to the card rect */
function drawInterior(ctx, t, seg, spec, T, res, C) {
  const P = T.palette, M = T.motion, L = T.layout;
  const k = clamp((t - seg.t0) / Math.max(0.01, seg.t1 - seg.t0), 0, 1);
  if (seg.type === 'face' || seg.type === 'list') {
    const z = lerp(seg.zoom[0], seg.zoom[1], ease.inOut(k));
    drawFace(ctx, res, seg, T, C.x, C.y, C.w, C.h, z);
    // a soft dark gradient at the bottom keeps white captions readable on any background
    const g = ctx.createLinearGradient(0, C.y + C.h * 0.45, 0, C.y + C.h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g; ctx.fillRect(C.x, C.y + C.h * 0.45, C.w, C.h * 0.55);
    if (seg.type === 'list') drawList(ctx, t, seg, T, C);
  } else if (seg.type === 'split') {
    const S = L.split, b = S.border;
    ctx.fillStyle = P.white; ctx.fillRect(C.x, C.y, C.w, C.h);
    const ih = (C.h - 2 * b - S.gap) * S.topFrac, x = C.x + b, w = C.w - 2 * b;
    let shot = seg.shots[0]; for (const s of seg.shots) if (t >= s.t) shot = s;
    const img = res.images[shot.img];
    ctx.save(); rr(ctx, x, C.y + b, w, ih, C.r - 8); ctx.clip();
    if (img) { const kb = 1 + M.kenBurns * ease.inOut((t - shot.t) / 3); cover(ctx, img, img.width, img.height, x, C.y + b, w, ih, 0.5, 0.5, kb); }
    ctx.restore();
    const fy = C.y + b + ih + S.gap, fh = C.h - 2 * b - S.gap - ih;
    ctx.save(); rr(ctx, x, fy, w, fh, C.r - 8); ctx.clip();
    drawFace(ctx, res, seg, T, x, fy, w, fh, 1.25 + 0.04 * ease.inOut(k));
    ctx.restore();
  } else if (seg.type === 'graphic') {
    ctx.fillStyle = P.paper; ctx.fillRect(C.x, C.y, C.w, C.h);
    // title, top left, black heavy sans with a full stop, like a slide
    const G = L.graphic, title = seg.title.charAt(0).toUpperCase() + seg.title.slice(1) + '.';
    const ti = ease.out((t - seg.t0 - 0.1) / 0.3);
    ctx.globalAlpha = ti; let fs = G.titleSize; ctx.font = font(T, 'sans', fs, 800);
    while (ctx.measureText(title).width > C.w - 80 && fs > 30) { fs -= 2; ctx.font = font(T, 'sans', fs, 800); }
    ctx.fillStyle = P.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText(title, C.x + 40, C.y + 70 + fs + (1 - ti) * 20); ctx.globalAlpha = 1;
    // lime block rising from the bottom, the stock picture inside it
    const top = C.y + C.h * G.blockTopFrac, rise = ease.back((t - seg.t0 - 0.15) / M.imageRise);
    const by = lerp(C.y + C.h + 20, top, rise), bx = C.x + 34, bw = C.w - 68, bh = C.y + C.h - 34 - top;
    ctx.fillStyle = P.lime; rr(ctx, bx, by, bw, bh, 26); ctx.fill();
    const img = seg.img ? res.images[seg.img] : null;
    if (img) {
      ctx.save(); rr(ctx, bx + 18, by + 18, bw - 36, bh - 36, 18); ctx.clip();
      cover(ctx, img, img.width, img.height, bx + 18, by + 18, bw - 36, bh - 36, 0.5, 0.5, 1 + 0.06 * ease.inOut(k)); ctx.restore();
    } else {
      ctx.font = font(T, 'serifItalic', 120); ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.fillText(seg.title.toUpperCase(), bx + bw / 2, by + bh / 2, bw - 40); ctx.textAlign = 'left';
    }
    const sp = ease.back((t - seg.t0 - 0.35) / 0.4);
    if (sp > 0) { sparkle(ctx, bx + bw - 30, by - 10, 46 * sp, (t - seg.t0) * 0.8, P.lime); sparkle(ctx, bx + bw - 30, by - 10, 22 * sp, (t - seg.t0) * 0.8, '#ffffff'); }
  } else if (seg.type === 'bigtext') {
    // post card: white card, face on top in a rounded frame, big serif words below, pink button with a cursor tap
    ctx.fillStyle = P.white; ctx.fillRect(C.x, C.y, C.w, C.h);
    const pad = 22, fh = C.h * 0.5;
    ctx.save(); rr(ctx, C.x + pad, C.y + pad, C.w - 2 * pad, fh, 20); ctx.clip();
    drawFace(ctx, res, seg, T, C.x + pad, C.y + pad, C.w - 2 * pad, fh, 1.2 + 0.05 * ease.inOut(k)); ctx.restore();
    // tiny UI row (heart, comment, share dots)
    const uy = C.y + pad + fh + 34; ctx.fillStyle = '#c9c9c9';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(C.x + pad + 18 + i * 44, uy, 11, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e4e4e4'; rr(ctx, C.x + C.w - pad - 120, uy - 10, 120, 20, 10); ctx.fill();
    // words, revealed as they are spoken, serif italic, big words heavier
    const shown = seg.words.filter(w => t >= w.t - 0.05);
    const txt = shown.map(w => w.w.toUpperCase());
    let size = 84; const maxW = C.w - 2 * pad - 20; const lines = [];
    const wrap = s => { lines.length = 0; ctx.font = font(T, 'serifItalic', s); let cur = ''; for (const w of txt) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; } if (cur) lines.push(cur); };
    wrap(size); while (lines.length > 3 && size > 48) { size -= 6; wrap(size); }
    ctx.fillStyle = P.ink; ctx.textBaseline = 'alphabetic';
    lines.forEach((ln, i) => ctx.fillText(ln, C.x + pad + 8, uy + 50 + size * (i + 1) * 0.98));
    // pink button + cursor tap near the end
    const by = C.y + C.h - pad - 74, bw = C.w - 2 * pad;
    const tap = clamp((t - (seg.t1 - 0.55)) / 0.35, 0, 1), press = tap > 0.6 && tap < 1 ? 0.96 : 1;
    ctx.save(); ctx.translate(C.x + pad + bw / 2, by + 37); ctx.scale(press, press);
    ctx.fillStyle = P.pink; rr(ctx, -bw / 2, -37, bw, 74, 37); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(T, 'ui', 30, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Share', 0, 2); ctx.textAlign = 'left'; ctx.restore();
    const cx = lerp(C.x + C.w + 60, C.x + C.w * 0.62, ease.out(tap * 1.4)), cy = lerp(C.y + C.h + 40, by + 44, ease.out(tap * 1.4));
    if (t > seg.t1 - 0.6) cursor(ctx, cx, cy);
  }
}
function cursor(ctx, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(12, 35); ctx.lineTo(22, 56); ctx.lineTo(30, 52); ctx.lineTo(20, 32); ctx.lineTo(36, 32); ctx.closePath();
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawList(ctx, t, seg, T, C) {
  const P = T.palette; let y = C.y + C.h * 0.24;
  for (const it of seg.items) {
    const k = ease.out((t - it.t + 0.05) / 0.22); if (k <= 0) { y += 66; continue; }
    ctx.globalAlpha = k; const x = C.x + 40 - (1 - k) * 30;
    ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(x + 12, y - 12, 12, 0, Math.PI * 2); ctx.fill();
    ctx.font = font(T, 'sans', 38, 800); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14;
    ctx.fillText(it.text.toUpperCase(), x + 38, y, C.w - 110); ctx.shadowBlur = 0; ctx.globalAlpha = 1; y += 66;
  }
}

function drawCaption(ctx, t, spec, T, C, seg, res) {
  if (seg.type === 'graphic' || seg.type === 'bigtext') return;
  if ((seg.enter === 'wipe' && t - seg.t0 < T.motion.wipe) || (seg.enter === 'wash' && t - seg.t0 < T.motion.wash)) return; // no caption over a half-revealed card
  const cap = spec.captions.find(c => t >= c.t0 && t < c.t1); if (!cap) return;
  const L = T.layout.caption, P = T.palette, M = T.motion;
  const hi = cap.words.findIndex(w => w.hero);
  const before = (hi < 0 ? cap.words : cap.words.slice(0, hi)).map(w => w.w).join(' ').toUpperCase();
  const after = hi < 0 ? '' : cap.words.slice(hi + 1).map(w => w.w).join(' ').toUpperCase();
  const hero = hi < 0 ? '' : cap.words[hi].w.toUpperCase();
  const maxW = C.w * L.maxWFrac;
  let cy = seg.type === 'split' ? C.y + T.layout.split.border + (C.h - 2 * T.layout.split.border - T.layout.split.gap) * T.layout.split.topFrac + T.layout.split.gap / 2 : C.y + C.h * L.yFrac;
  // keep the caption off the mouth: below the chin when the face is big, never below the card's lower safe line
  if (seg.type !== 'split' && seg.capY == null && res.faceBottom) cy = clamp(Math.max(cy, res.faceBottom + 110), C.y + C.h * L.yFrac, C.y + C.h * 0.84);
  if (seg.capY != null) cy = C.y + C.h * seg.capY;
  const k = ease.out((t - cap.t0) / M.captionIn), hk = ease.back((t - (hi >= 0 ? cap.words[hi].t : cap.t0)) / M.heroPop);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = k;
  const x = C.x + C.w / 2, dy = (1 - k) * 14;
  const small = (s, y) => { if (!s) return; let fs = L.smallSize; ctx.font = font(T, 'sans', fs, 700); while (ctx.measureText(s).width > maxW && fs > 18) { fs -= 2; ctx.font = font(T, 'sans', fs, 700); }
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14; ctx.fillStyle = '#fff'; ctx.fillText(s, x, y + dy); };
  const heroH = hero ? L.heroSize * 0.9 : 0, sH = L.smallSize + L.lineGap;
  const total = (before ? sH : 0) + heroH + (after ? sH : 0);
  let y = cy - total / 2;
  if (before) { small(before, y + sH / 2); y += sH; }
  if (hero) {
    let fs = L.heroSize; ctx.font = font(T, 'serifItalic', fs); while (ctx.measureText(hero).width > maxW && fs > 40) { fs -= 4; ctx.font = font(T, 'serifItalic', fs); }
    ctx.save(); ctx.translate(x, y + heroH / 2 + dy); const sc = hero ? lerp(0.82, 1, clamp(hk, 0, 1.2)) : 1; ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18; ctx.fillStyle = P.lime; ctx.fillText(hero, 0, 0);
    ctx.shadowBlur = 0; ctx.lineWidth = 1.6; ctx.strokeStyle = P.lime; ctx.strokeText(hero, 0, 0); ctx.restore();
    y += heroH;
  }
  if (after) small(after, y + sH / 2);
  ctx.restore();
}

export function drawFrame(ctx, t, spec, T, res) {
  const C = T.layout.card, M = T.motion;
  ctx.drawImage(res.layers.under, 0, 0);
  res.faceBottom = 0;
  const i = segAt(spec, t), seg = spec.segments[i], prev = spec.segments[i - 1];
  const since = t - seg.t0;
  ctx.save(); rr(ctx, C.x, C.y, C.w, C.h, C.r); ctx.clip();
  if (seg.enter === 'wash' && prev && since < M.wash) {
    const a = 0.33 * M.wash;
    if (since < a) { // white soft wipe sweeping down over the outgoing picture
      drawInterior(ctx, t, prev, spec, T, res, C);
      const p = ease.inOut(since / a), y = C.y + C.h * p * 1.15;
      const g = ctx.createLinearGradient(0, y - 220, 0, y); g.addColorStop(0, 'rgba(250,250,248,0.95)'); g.addColorStop(1, 'rgba(250,250,248,0)');
      ctx.fillStyle = 'rgba(250,250,248,0.95)'; ctx.fillRect(C.x, C.y, C.w, Math.max(0, y - 220 - C.y)); ctx.fillStyle = g; ctx.fillRect(C.x, y - 220, C.w, 220);
    } else { // lime wash fading off the new card, from the bottom up
      drawInterior(ctx, t, seg, spec, T, res, C);
      const p = (since - a) / (M.wash - a);
      const g = ctx.createLinearGradient(0, C.y + C.h, 0, C.y); g.addColorStop(0, `rgba(203,230,94,${0.9 * (1 - p)})`); g.addColorStop(1, `rgba(203,230,94,${0.5 * (1 - p) * (1 - p)})`);
      ctx.fillStyle = g; ctx.fillRect(C.x, C.y, C.w, C.h);
    }
  } else if (seg.enter === 'wipe' && prev && since < M.wipe) { // new picture revealed top-down behind a soft light edge
    drawInterior(ctx, t, prev, spec, T, res, C);
    const p = ease.inOut(since / M.wipe), y = C.y + C.h * p;
    ctx.save(); ctx.beginPath(); ctx.rect(C.x, C.y, C.w, y - C.y); ctx.clip(); drawInterior(ctx, t, seg, spec, T, res, C); ctx.restore();
    const g = ctx.createLinearGradient(0, y - 60, 0, y + 40); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(C.x, y - 60, C.w, 100);
  } else if (seg.enter === 'pop' && since < M.pop) { // hard cut with a small settle
    const s = lerp(1.035, 1, ease.out(since / M.pop));
    ctx.translate(C.x + C.w / 2, C.y + C.h / 2); ctx.scale(s, s); ctx.translate(-(C.x + C.w / 2), -(C.y + C.h / 2));
    drawInterior(ctx, t, seg, spec, T, res, C);
  } else drawInterior(ctx, t, seg, spec, T, res, C);
  ctx.restore();
  drawCaption(ctx, t, spec, T, C, seg, res);
  ctx.drawImage(res.layers.over, 0, 0);
}
