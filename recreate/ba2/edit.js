// The ba2 edit as data + drawing. Coordinates are the 1080x1920 after frame; times are OUR clip's clock (the Commons
// host's own words, docs/recreate/ba2/README.md maps each shot to the reference's). "ref" comments cite REF.md numbers.
const W = 1080, H = 1920;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = k => 1 - Math.pow(1 - k, 3), eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const back = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// ---------- our host's words (master clock: Whisper per piece, onsets checked on the voice energy) ----------
const WD = {
  now: .08, there: .32, are: .60, some: .72, obvious: .94, challenges: 1.50, to: 2.12, studying: 2.54, black: 2.84, holes: 3.14,
  theyre: 3.56, far: 3.85, away: 4.12, no: 5.05, light: 5.35, can: 5.58, escape: 5.86, them: 6.13,
  but: 6.60, we: 6.88, managed: 7.0, two: 8.26, main: 8.44, ways: 8.70,
  we2: 9.83, gather: 9.94, observational: 10.18, data: 10.80, like: 11.42, looking: 11.66, through: 11.96, a: 12.20, telescope: 12.28,
  we3: 13.53, can3: 13.68, observe: 13.82, how: 14.12, the: 14.44, stuff: 14.64,
  so: 16.32, and4: 22.31, in4: 22.74, many: 22.90, ways4: 23.10, theyre4: 23.64, just: 23.93, weird: 24.59,
};
// ---------- shots ----------
const CUT = { s2: 3.44, s3: 6.45, cardA: 9.45, cardB: 9.75, s5: 11.35, s6: 13.45, s7: 16.18, s7b: 19.83, s8: 22.26, end: 25.36 };
const FACE = [482, 352];                         // our host's face centre in master px (Haar 215 px wide)
const place = (m, fx, fy) => ({ m, ox: fx - m * FACE[0], oy: fy - m * FACE[1] });
const about = (F, k, p) => [F[0] + k * (p[0] - F[0]), F[1] + k * (p[1] - F[1])];
function camera(T) {
  if (T < CUT.s2) {   // ref 0-1.935: opens 1.134x in, zooms out about (540,958) with a cubic ease-out over 1.05 s, then locked
    const k = 1 + 0.134 * (1 - eo(seg(T, 0, 1.05))); const f = about([540, 958], k, [536, 607]);
    return place(1.97 * k, f[0], f[1]);
  }
  if (T < CUT.s3) return place(3.5, 0, 860);      // ref 1.935-4.171: ECU, face cut by the left edge (nose at x 0), static
  if (T < CUT.s5) {   // ref 4.171-5.6: wide, 1 → 0.948 about (585,918) over 0.8 s
    const k = 1 - 0.052 * eo(seg(T, CUT.s3, CUT.s3 + 0.8)); const f = about([585, 918], k, [557, 698]);
    return place(1.65 * k, f[0], f[1]);
  }
  if (T < CUT.s6) return place(2.08, 484, 590);  // ref 7.5-9.3: medium, closer
  if (T < CUT.s7) return place(2.08, 484, 600);  // ref 9.3-11.35: same framing, shrunk inside the frame (post below)
  if (T < CUT.s7b) return place(1.60, 522, 658); // ref 11.35-15.0
  if (T < CUT.s8) return place(1.89, 563, 649);  // ref 15.0-17.55
  return place(3.5, 975, 915);                  // ref 17.55-20.17: ECU, face cut by the right edge (left cheek at x 600, eyes y 810)
}
// frame-in-frame (ref 9.33 appears at full size, shrinks to (135,290)-(940,1610) by 9.85, then to (175,355)-(900,1555) by 11.3)
function frameRect(T) {
  if (T < CUT.s6 || T >= CUT.s7) return null;
  const a = eo(seg(T, CUT.s6, CUT.s6 + 0.5)), b = seg(T, CUT.s6 + 0.5, CUT.s7);
  const r0 = [0, 0, 1080, 1920], r1 = [135, 290, 940, 1610], r2 = [175, 355, 900, 1555];
  return r0.map((v, i) => b > 0 ? lerp(r1[i], r2[i], b) : lerp(v, r1[i], a));
}
function state(T) {
  let cam = camera(T); const fr = frameRect(T);
  if (fr) {   // the whole shot scales into the frame about the frame's centre
    const s = (fr[2] - fr[0]) / W, cx = (fr[0] + fr[2]) / 2, cy = (fr[1] + fr[3]) / 2;
    cam = { m: cam.m * s, ox: cx + (cam.ox - W / 2) * s, oy: cy + (cam.oy - H / 2) * s };
  }
  const red = T >= CUT.s8 ? eio(seg(T, CUT.s8 + 0.10, CUT.s8 + 0.30)) : 0;   // ref 17.6 violet → 17.8 red
  return { cam, red, frame: fr ? [...fr, 1] : null };
}

// ---------- type ----------
const F = (w, px) => `${w} ${px}px Arimo`;
function glowText(c, s, x, y, o) {
  c.save(); c.font = F(o.w ?? 400, o.size); c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic';
  c.letterSpacing = (o.ls ?? 0) + 'px'; c.globalAlpha = o.alpha ?? 1;
  for (const [blur, col] of o.glow ?? []) { c.shadowColor = col; c.shadowBlur = blur; c.fillStyle = col; c.fillText(s, x, y); }
  c.shadowBlur = 0; c.shadowColor = 'transparent'; c.fillStyle = o.color ?? '#f4f4f0'; c.fillText(s, x, y);
  c.restore();
}
function width(c, s, w, size, ls = 0) { c.save(); c.font = F(w, size); c.letterSpacing = ls + 'px'; const m = c.measureText(s); c.restore(); return m.actualBoundingBoxRight + m.actualBoundingBoxLeft; }
function inkLeft(c, s, w, size, ls = 0) { c.save(); c.font = F(w, size); c.letterSpacing = ls + 'px'; const m = c.measureText(s); c.restore(); return m.actualBoundingBoxLeft; }
// a line of words that appear one by one (each at its onset) and spread across [x0, x1] (ref "at   your   edits")
function spread(c, words, x0, x1, y, T, o) {
  const ws = words.map(([s]) => width(c, s, o.w ?? 400, o.size, o.ls ?? 0));
  const gap = words.length > 1 ? (x1 - x0 - ws.reduce((a, b) => a + b, 0)) / (words.length - 1) : 0;
  let x = x0;
  words.forEach(([s, t], i) => { if (T >= t) glowText(c, s, x - inkLeft(c, s, o.w ?? 400, o.size, o.ls ?? 0), y, o); x += ws[i] + gap; });
}
const SOFT = [[14, 'rgba(255,255,250,0.55)']];
const HERO = { w: 700, color: 'rgba(201,206,173,0.93)', glow: [[70, 'rgba(214,218,196,0.55)'], [26, 'rgba(225,229,208,0.6)']] };
// the hook's glow block (ref 0.07-1.53): helpers 77 px (x-height 40), hero Arimo Bold x-height 137 tracked -0.08 em, fitted
function heroBlock(c, T, g) {
  let size = 264; const ls = s => -0.08 * s;
  let w = width(c, g.hero, 700, size, ls(size)); if (w > g.max) { size *= g.max / w; w = g.max; }
  const x0 = g.cx - w / 2, x1 = g.cx + w / 2;
  if (g.top) spread(c, g.top, x0 + (g.topInset ?? 0), x1, 1198, T, { size: 77, glow: SOFT });
  if (T >= g.ht) glowText(c, g.hero, x0 - inkLeft(c, g.hero, 700, size, ls(size)), 1398, { ...HERO, size, ls: ls(size) });
  if (g.bottom) spread(c, g.bottom, x0, g.bottom.length > 1 ? x1 : x0 + width(c, g.bottom[0][0], 400, 46, 4), 1462, T, { size: 46, ls: 4, color: 'rgba(236,236,230,0.92)', glow: SOFT });
}

// ---------- devices ----------
function diamond(c, x, y, d, sc, inner) {   // the badge: white rounded outline + violet rounded inner tile (ref w00 4.6-5.6)
  c.save(); c.translate(x, y); c.scale(sc, sc); c.rotate(Math.PI / 4);
  const s = d / Math.SQRT2, r = s * 0.16, rr = (q, rad) => { c.beginPath(); c.roundRect(-q / 2, -q / 2, q, q, rad); };
  c.shadowColor = 'rgba(255,255,255,0.9)'; c.shadowBlur = 26; c.lineWidth = d * 0.036; c.strokeStyle = '#fbfbff'; rr(s, r); c.stroke();
  c.shadowBlur = 0;
  const gi = c.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); gi.addColorStop(0, '#8478f5'); gi.addColorStop(1, '#2f22b4');
  c.fillStyle = gi; rr(s * 0.76, r * 0.7); c.fill();
  c.rotate(-Math.PI / 4); inner?.(c, d); c.restore();
}
function pixelQ(c, d, blur = 1.5) {   // the pixelated "?" (5x7 blocks, softened)
  const B = ['01110', '10001', '00001', '00110', '00100', '00000', '00100'], p = d * 0.052;
  c.save(); c.filter = `blur(${blur}px)`; c.fillStyle = 'rgba(245,245,255,0.95)';
  B.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') c.fillRect((i - 2.5) * p, (j - 3.5) * p, p * 1.02, p * 1.02); }));
  c.restore();
}
function telescope(c, d) {   // our chapter-1 icon (the reference's is a fork of arrows for "direction"): a telescope on a tripod
  const u = d / 100; c.save(); c.strokeStyle = c.fillStyle = '#ffffff'; c.lineCap = 'round'; c.lineJoin = 'round';
  c.save(); c.rotate(-0.42); c.beginPath(); c.roundRect(-20 * u, -6 * u, 36 * u, 12 * u, 3 * u); c.fill(); c.beginPath(); c.roundRect(16 * u, -8 * u, 7 * u, 16 * u, 2 * u); c.fill(); c.beginPath(); c.roundRect(-28 * u, -4 * u, 9 * u, 8 * u, 2 * u); c.fill(); c.restore();
  c.lineWidth = 4.2 * u; c.beginPath(); c.moveTo(0, 3 * u); c.lineTo(-11 * u, 24 * u); c.moveTo(0, 3 * u); c.lineTo(11 * u, 24 * u); c.moveTo(0, 3 * u); c.lineTo(0, 25 * u); c.stroke();
  c.restore();
}
function eyeball(c, x, y, r, gx, gy, blur) {   // a glossy lilac eyeball, iris toward (gx, gy)
  c.save(); if (blur) c.filter = `blur(${blur}px)`;
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#fbf9ff'); g.addColorStop(0.55, '#d9d4f2'); g.addColorStop(1, '#8a82b8');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  const ix = x + gx * r * 0.42, iy = y + gy * r * 0.42, ir = r * 0.46;
  const gi = c.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir); gi.addColorStop(0, '#2b2c44'); gi.addColorStop(0.7, '#4c4f78'); gi.addColorStop(1, '#6d6fa0');
  c.fillStyle = gi; c.beginPath(); c.ellipse(ix, iy, ir * (1 - Math.abs(gx) * 0.3), ir * (1 - Math.abs(gy) * 0.3), Math.atan2(gy, gx), 0, 7); c.fill();
  c.fillStyle = '#0d0d16'; c.beginPath(); c.arc(ix, iy, ir * 0.45, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(ix - ir * 0.3, iy - ir * 0.35, ir * 0.16, 0, 7); c.fill();
  c.restore();
}

async function prepare() { }

function draw(T, s, ctx) {
  const c = ctx.fx; let drew = false;
  const on = (a, b) => T >= a && T < b && (drew = true);
  // ===== w00 · hook (ref 0-1.935): three glow groups centred on the chest, in front of the mic =====
  if (on(0.10, WD.to)) heroBlock(c, T, { cx: 527, max: 620, top: [['there', WD.there + .03], ['are', WD.are + .03], ['some', WD.some + .03]], hero: 'obvious', ht: WD.obvious + .03, bottom: [['challenges', WD.challenges + .03]] });
  if (on(WD.to, WD.black - 0.03)) heroBlock(c, T, { cx: 500, max: 640, top: [['to', WD.to + .03]], topInset: 73, hero: 'studying', ht: WD.studying + .03 });
  if (on(WD.black, CUT.s2)) {   // ref "that look" 1.60-1.935: bold white, glowing, x-height 60
    glowText(c, T >= WD.holes + .03 ? 'black holes' : 'black', 555 - (T >= WD.holes + .03 ? 0 : 0), 1278, { w: 700, size: 116, ls: -4, align: 'center', color: '#f7f9f9', glow: [[30, 'rgba(255,255,255,0.7)'], [10, 'rgba(255,255,255,0.8)']] });
  }
  // ===== w00 · ECU neon (ref 1.935-4.171) =====
  if (on(CUT.s2, CUT.s3)) {
    const k = eio(seg(T, CUT.s2 + 0.06, CUT.s2 + 0.30));   // the ring draws itself (ref 1.97-2.15), overshooting into a tail
    if (k > 0) {
      c.save(); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3.2; c.shadowColor = 'rgba(255,255,255,0.8)'; c.shadowBlur = 8;
      c.beginPath(); c.ellipse(767, 721, 273, 73, -0.06, Math.PI * 1.08, Math.PI * 1.08 + Math.PI * 2.25 * k); c.stroke(); c.restore();
    }
    const CY = { w: 700, size: 137, ls: -8, color: 'rgb(150,252,246)', glow: [[44, 'rgba(60,230,225,0.9)'], [16, 'rgba(91,214,215,0.95)']] };
    if (T >= WD.far + .03) glowText(c, T >= WD.away + .03 ? 'far away' : 'far', T >= WD.away + .03 ? 773 : 773 - width(c, ' away', 700, 137, -8) / 2, 770, { ...CY, align: 'center' });
    const SM = { size: 64, ls: 5, color: '#f6f4ff', glow: [[12, 'rgba(255,255,255,0.65)']] };
    if (T >= WD.no + .03) glowText(c, T >= WD.light + .03 ? 'no light' : 'no', 560, 846, SM);
    if (T >= WD.can + .03) glowText(c, 'can', 1033, 1097, { ...SM, align: 'right' });
    if (T >= WD.escape + .03) glowText(c, 'escape', 1035, 1177, { w: 700, size: 135, ls: -8, align: 'right', color: 'rgb(228,104,245)', glow: [[44, 'rgba(211,54,221,0.95)'], [14, 'rgba(220,80,235,0.95)']] });
  }
  // ===== w05 · wide + badges (ref 4.171-5.6; ours "two main ways" → two badges) =====
  const cardK = seg(T, CUT.cardA, CUT.cardB);
  if (on(WD.two, CUT.cardB)) {
    const pop = t0 => back(seg(T, t0, t0 + 0.2)) * (T >= t0 ? 1 : 0);
    c.save(); c.globalAlpha = 1 - cardK * 0.6;
    const a = pop(WD.two + .05), b = pop(WD.main + .05);
    if (a > 0) diamond(c, 358, 1550, 267, a, (cc, d) => pixelQ(cc, d));
    if (b > 0) diamond(c, 692, 1558, 267, b, (cc, d) => pixelQ(cc, d));
    c.restore();
  }
  // ===== w05 · chapter card "1" (ref 5.5-7.5) =====
  if (on(CUT.cardA, CUT.s5)) {
    c.save(); c.globalAlpha = cardK;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgb(0,0,12)'); g.addColorStop(1, 'rgb(0,5,52)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // ghost numeral: Arimo Bold, cap 440-1480, ink right edge 760; brightest around y 1100-1250, fading top and bottom
    c.font = F(700, 1450); c.textAlign = 'left';
    const m = c.measureText('1'); const gx = 760 - m.actualBoundingBoxRight;
    const gn = c.createLinearGradient(0, 440, 0, 1480);
    gn.addColorStop(0, 'rgba(110,115,140,0.22)'); gn.addColorStop(0.62, 'rgba(110,115,140,0.6)'); gn.addColorStop(1, 'rgba(110,115,140,0.25)');
    c.fillStyle = gn; c.fillText('1', gx, 1480);
    const morph = seg(T, CUT.cardB + 0.45, CUT.cardB + 0.65);   // ref 6.2-6.4: the "?" blurs out, the icon comes in
    diamond(c, 538, 958, 391, 1, (cc, d) => { if (morph < 1) { cc.globalAlpha = (1 - morph) * cardK; pixelQ(cc, d, 1.5 + 5 * morph); } if (morph > 0) { cc.globalAlpha = morph * cardK; telescope(cc, d); } });
    const lk = seg(T, WD.observational - 0.3, WD.observational + 0.2);
    c.globalAlpha = cardK * lk;
    glowText(c, 'observational data', 538, 1233, { size: 74, ls: -1, align: 'center', color: '#f2f2fb', glow: [[22, 'rgba(255,255,255,0.55)']] });
    c.restore();
  }
  // ===== w05 · medium text (ref 8.6-9.3 "you need to / KNOW EXACTLY") =====
  if (on(WD.like, CUT.s6)) {
    const words = [['like', WD.like], ['looking', WD.looking], ['through', WD.through]];
    let x = 210; for (const [w, t] of words) { if (T >= t + .03) glowText(c, w, x, 1201, { size: 85, ls: 1, color: '#f4f4f6', glow: SOFT }); x += width(c, w, 400, 85, 1) + 30; }
    if (T >= WD.a + .03) glowText(c, T >= WD.telescope + .03 ? 'a telescope' : 'a', 207, 1290, { w: 700, size: 128, ls: -3, color: '#ffffff', glow: [[24, 'rgba(255,255,255,0.6)']] });
  }
  // ===== w05/w10 · frame-in-frame with eyeballs (ref 9.33-11.35) =====
  if (on(CUT.s6, CUT.s7)) {
    const fr = s.frame;
    c.save(); c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.shadowColor = 'rgba(255,255,255,0.95)'; c.shadowBlur = 30;
    c.beginPath(); c.roundRect(fr[0], fr[1], fr[2] - fr[0], fr[3] - fr[1], 6); c.stroke(); c.shadowBlur = 12; c.stroke(); c.restore();
    const e = eo(seg(T, CUT.s6 + 0.25, CUT.s6 + 0.85)), dr = T - CUT.s6;
    const gaze = [Math.sin(dr * 1.3) * 0.5, -0.2 + Math.cos(dr * 0.9) * 0.3];
    eyeball(c, lerp(1250, 1030, e), 80 + Math.sin(dr * 1.1) * 8, 66, -0.6 + gaze[0] * 0.3, 0.5, 2);
    eyeball(c, lerp(-200, 30, e), 720 + Math.sin(dr * 0.8 + 1) * 10, 118, 0.7, 0.1 + gaze[1] * 0.3, 1);
    eyeball(c, lerp(1300, 960, e), 1500 + Math.sin(dr * 0.9 + 2) * 12, 190, -0.5, -0.45 + gaze[1] * 0.2, 0);
    // text inside the frame: small helpers, hero in pink glow (ref "what you want your / SCENE / to look like")
    const sc = (fr[2] - fr[0]) / W, cx = (fr[0] + fr[2]) / 2;
    const SM = { size: 46 * sc / 0.745, ls: 1, color: '#f4f2fa', glow: SOFT, align: 'center' };
    const top = [['we', WD.we3], ['can', WD.can3]].filter(([, t]) => T >= t + .03).map(([w]) => w).join(' ');
    if (top) glowText(c, top, cx, 1075, SM);
    if (T >= WD.observe + .03) glowText(c, 'observe', cx, 1162, { w: 700, size: 112 * sc / 0.745, ls: -5, align: 'center', color: 'rgb(246,170,246)', glow: [[36, 'rgba(232,90,232,0.9)'], [12, 'rgba(240,120,240,0.9)']] });
    const low = [['how', WD.how], ['the', WD.the], ['stuff', WD.stuff]].filter(([, t]) => T >= t + .03).map(([w]) => w).join(' ');
    if (low) glowText(c, low, cx + 120 * sc, 1208, { ...SM, size: 40 * sc / 0.745 });
  }
  // ===== w15 · red ECU (ref 17.55-20.17): hero words left of the face =====
  if (on(CUT.s8, CUT.end)) {
    const SM = { size: 54, ls: 2, color: '#f6eef0', glow: SOFT };
    if (T < WD.theyre4 - 0.02) {
      if (T >= WD.and4 + .05) glowText(c, T >= WD.in4 + .03 ? 'and in' : 'and', 150, 762, SM);
      const redK = s.red;
      if (T >= WD.many + .03) glowText(c, 'many', 118, 1010, { w: 700, size: 200, ls: -12, color: redK > 0.5 ? 'rgb(248,200,205)' : 'rgb(214,196,255)', glow: redK > 0.5 ? [[40, 'rgba(255,40,70,0.9)'], [12, 'rgba(255,120,140,0.8)']] : [[40, 'rgba(160,120,255,0.9)']] });
      if (T >= WD.ways4 + .03) glowText(c, 'ways', 150, 1065, SM);
    } else {
      if (T >= WD.theyre4 + .03) glowText(c, T >= WD.just + .03 ? "they're just" : "they're", 150, 900, { ...SM, size: 46 });
      if (T >= WD.weird + .03) glowText(c, 'weird', 120, 1040, { w: 700, size: 170, ls: -9, color: '#ffffff', glow: [[34, 'rgba(255,255,255,0.85)'], [10, 'rgba(255,255,255,0.9)']] });
    }
  }
  return drew;
}

const sfxFiles = { pop: 'sfx/ui.pop.wav', whoosh: 'sfx/fs.whoosh.swosh-whoosh-air-cut.wav', click: 'sfx/kenney.click.wav' };
const sfx = [
  { t: WD.two + .05, k: 'pop', gain: 0.35 }, { t: WD.main + .05, k: 'pop', gain: 0.35, rate: 1.08 },
  { t: CUT.cardA, k: 'whoosh', gain: 0.25 }, { t: CUT.s6, k: 'whoosh', gain: 0.22, rate: 1.1 },
];
export const EDIT = { duration: CUT.end, sfxFiles, sfx, prepare, state, draw };
