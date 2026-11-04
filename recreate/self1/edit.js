// self1: "The moon remembers everything" (Ernie Wright, NASA Goddard, public domain), edited from docs/self/WHY.md alone.
// Every beat is decided from what he says (docs/self/EDIT.md has the beat sheet and the reasons). Coordinates are the
// 1080x1920 frame; the master is the full 1920x1080 source; times are the cut clock (data/clips/self1/words.json).
const W = 1080, H = 1920, MW = 1920, MH = 1080, COVER = H / MH;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = k => 1 - Math.pow(1 - k, 3), eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, ei = k => k * k * k;
const hash = x => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };

// ---------- palette (derived from the subject: the Moon and an eclipse; OKLCH ramps in docs/self/EDIT.md) ----------
const C = {
  silver: '#eef0f3',      // oklch(0.95 0.006 250): moonlight white, the caption ink
  dust: '#aeb3ba',        // oklch(0.76 0.010 250): regolith grey, helpers
  copper: '#e0915c',      // oklch(0.72 0.12 50): the eclipsed moon's copper, the accent (memory, the number)
  copperHi: '#f4b98a',    // oklch(0.83 0.09 55): its lit core
  basalt: '#15181d', basalt2: '#232831',   // oklch(0.17/0.24 0.012 260): the maria's dark, the void
  umbra: '#2a140e', umbra2: '#4a2216',     // oklch(0.20/0.28 0.06 40): the eclipse's dark copper, the deep-time ground
};

// ---------- words (cut clock) ----------
const WD = {
  the: .12, moon: .14, remembers: .36, everything: 1.04,
  you: 2.24, know: 2.36, on: 2.60, earth: 2.88, all: 3.08, this: 3.44, erased: 3.80, by: 4.44, weather: 4.80, and1: 5.46, tectonics: 6.02,
  and2: 7.28, kinds: 7.76, things: 8.02, make: 8.46, cratering: 8.80, events: 10.10, other: 10.50, just: 10.92, go: 11.50, away: 12.10,
  but: 12.59, all2: 12.67, thats: 13.07, remembered: 13.27, on2: 13.61, the2: 13.83, moon2: 13.95,
  so: 14.39, we: 14.51, can: 14.69, look: 14.83, at: 15.01, craters: 15.21,
  that: 16.03, were: 16.29, formed: 16.49, three: 16.87, and3: 17.51, four: 17.79, billion: 18.01, years: 18.43, ago: 18.73,
  and4: 19.01, learn: 19.41, about: 19.81, what: 20.05, going: 20.31, in: 20.69, early: 20.97, solar: 21.13, system: 21.41, from: 21.77, thatE: 22.03,
  i: 22.33, think: 22.53, thats2: 23.03, verycool: 23.37, cool: 23.59,
};
const CUT = { b2: 2.22, b3: 7.24, b4: 12.54, b6: 16.80, b7: 18.98, b8: 22.26, end: 24.11 };   // b2 and b4 sit on the piece joins
const DUR = 25.9;

// ---------- camera: face-anchored crops of the master ----------
const FACE = [1006, 370];                         // Haar centre in master px (face 347 px wide)
function place(m, fx, fy, cover = true) {
  let ox = fx - m * FACE[0], oy = fy - m * FACE[1];
  if (cover) { m = Math.max(m, COVER); ox = clamp(fx - m * FACE[0], W - m * MW, 0); oy = clamp(fy - m * FACE[1], H - m * MH, 0); }
  return { m, ox, oy };
}
const mix = (a, b, k) => ({ m: lerp(a.m, b.m, k), ox: lerp(a.ox, b.ox, k), oy: lerp(a.oy, b.oy, k) });
function camera(T) {
  if (T < CUT.b2) {          // hook: open 1.30x in, pull out to the medium with a cubic ease-out (WHY 6: 0.1-0.95 s), then lock
    const k = 1 + 0.30 * (1 - eo(seg(T, 0.08, 0.95)));
    return place(COVER * k, 540, 658 + 120 * (k - 1) / 0.3 * 0.5);
  }
  if (T < CUT.b3) {          // close-up, face pushed right; settle +2.5% and 60 px over 0.7 s, slow push 3% to the cut
    const s = eo(seg(T, CUT.b2, CUT.b2 + 0.7)), k = 1 + 0.025 * s + 0.03 * eio(seg(T, 3.0, CUT.b3));
    return place(2.05 * k, 730 + 60 * s, 760, true);
  }
  if (T < CUT.b4) {          // wide medium in B&W: a slow push through the long line (+6%), ease in-out
    const k = 1 + 0.06 * eio(seg(T, CUT.b3, CUT.b4));
    return place(COVER * k, 540, 690);
  }
  if (T < CUT.b6) {          // the void: medium, face low-right of centre so the moon has the upper left; settle, then a push on "craters"
    const s = eo(seg(T, CUT.b4, CUT.b4 + 0.8)), p = eo(seg(T, WD.craters - 0.2, WD.craters + 0.6));
    return place(1.60 * (1 + 0.025 * s + 0.07 * p), 640 - 30 * s, 1040 - 20 * p, false);
  }
  if (T < CUT.b7) {          // deep time: closer, face low so the number fills the space above the head; push on "three"
    const p = eo(seg(T, CUT.b6, CUT.b6 + 0.75)), q = eio(seg(T, WD.billion, CUT.b7));
    return place(1.85 * (1 + 0.10 * p + 0.03 * q), 540, 1250, false);
  }
  if (T < CUT.b8) {          // rest: the room back in colour, the wide shot drifting slowly right
    const k = seg(T, CUT.b7, CUT.b8);
    return place(COVER * (1.02 + 0.03 * k), 520 + 40 * eio(k), 670);
  }
  // payoff: punch to a close-up; a +6% push on "cool"
  const p = eo(seg(T, WD.cool - 0.05, WD.cool + 0.5));
  return place(2.1 * (1 + 0.06 * p), 540, 830);
}

// ---------- ground and grade per time ----------
function look(T) {
  const g = { uBgSat: 1, uBgBri: 1, uBgCon: 1, uVoid: 0, uSubSat: 1, uRim: 0, uRimW: 7, uGrade: 1, uWarm: 0, uSharp: 0.55, uHide: 0, uFall: 0.8, void: [C.basalt, C.basalt2], rimCol: C.silver };
  if (T < CUT.b2) Object.assign(g, { uBgSat: 0.55, uBgBri: 0.62, uBgCon: 1.1 });                    // hook: the room pushed back
  else if (T < CUT.b3) {                                                                            // erased: colour drains away
    const d = eio(seg(T, WD.erased, WD.erased + 1.6));
    Object.assign(g, { uBgSat: 0.8 * (1 - d), uBgBri: lerp(0.85, 0.6, d), uBgCon: 1.1, uSubSat: lerp(1, 0.18, d) });
  } else if (T < CUT.b4) Object.assign(g, { uBgSat: 0, uBgBri: 0.72, uBgCon: 1.15, uSubSat: 0 });  // the Earth without memory: B&W
  else if (T < CUT.b6) Object.assign(g, { uFall: 0.55, uVoid: 1, uRim: 0.5, uRimW: 4, rimCol: C.copperHi });          // the moon: void, colour back, copper limb
  else if (T < CUT.b7) Object.assign(g, { uFall: 0.55, uVoid: 1, uRim: 0.45, uRimW: 4, rimCol: C.copper, void: [C.umbra, C.umbra2] });
  else if (T < CUT.b8) Object.assign(g, { uBgSat: 0.85, uBgBri: 0.9 });
  else if (T < CUT.end) Object.assign(g, { uBgSat: 0.7, uBgBri: 0.66, uBgCon: 1.08, uWarm: 1 });
  else Object.assign(g, { uBgSat: 0.7, uBgBri: 0.66, uWarm: 1, uVoid: eio(seg(T, CUT.end, CUT.end + 0.45)), uHide: eio(seg(T, CUT.end + 0.05, CUT.end + 0.5)) });   // end: the room and then he give way to the void
  return g;
}

// ---------- post: the umbra wipe (the one transition, on the turn from Earth to Moon) and the end fade ----------
const WIPE = { a: CUT.b4 - 0.26, b: CUT.b4 + 0.40 };
function post(T) {
  const p = { uUmbra: [0, 0, 0, 0], uFade: 0, fadeCol: C.basalt };
  if (T >= WIPE.a && T < WIPE.b) {
    // the disc enters from the right (ease-in), covers the frame at the cut, leaves to the left (ease-out)
    const R = 1250, x = T < CUT.b4 ? lerp(2500, 700, ei(seg(T, WIPE.a, CUT.b4))) : lerp(700, -1500, eo(seg(T, CUT.b4, WIPE.b)));
    p.uUmbra = [x, R, 1, 1];
  }
  return p;
}

// ---------- type ----------
const F = {
  hero: s => `800 ${s}px Archivo`,            // drawn expanded (fontStretch 125%)
  heroN: s => `700 ${s}px Archivo`,
  ser: s => `italic 400 ${s}px InstrumentSerif`,
  sub: s => `600 ${s}px InterTight`,
};
let MC;
const capOf = (font, st = 'normal') => { MC.font = font; MC.fontStretch = st; return MC.measureText('H').actualBoundingBoxAscent; };
const widthOf = (t, font, st = 'normal', ls = 0) => { MC.font = font; MC.fontStretch = st; MC.letterSpacing = ls + 'px'; const w = MC.measureText(t).width - ls; MC.letterSpacing = '0px'; return w; };
const sizeForWidth = (mk, t, w, st = 'normal', ls = 0) => w / widthOf(t, mk(100), st, ls) * 100;
function txt(c, s, o) {
  const a = o.alpha ?? 1; if (a <= 0.003) return;
  c.save(); c.globalAlpha *= a; c.font = o.font; c.fontStretch = o.st ?? 'normal'; c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic';
  c.letterSpacing = (o.ls ?? 0) + 'px';
  if (o.blur > 0.3) c.filter = `blur(${o.blur.toFixed(1)}px)`;
  const x = o.x + (o.dx ?? 0), y = o.y + (o.dy ?? 0);
  if (o.rot || (o.sc && o.sc !== 1)) { c.translate(x, y); if (o.rot) c.rotate(o.rot); if (o.sc) c.scale(o.sc, o.sc); c.translate(-x, -y); }
  for (const [bl, col] of o.glow ?? []) { c.shadowColor = col; c.shadowBlur = bl; c.fillStyle = col; c.fillText(s, x, y); }
  c.shadowBlur = 0; c.shadowColor = 'transparent';
  if (o.shadow) { c.shadowColor = o.shadow[0]; c.shadowBlur = o.shadow[1]; c.shadowOffsetY = o.shadow[2] ?? 0; }
  if (o.fill || o.grad) {
    if (o.grad) { const m = c.measureText(s); const gr = c.createLinearGradient(0, y - m.actualBoundingBoxAscent, 0, y); o.grad.forEach(([k, col]) => gr.addColorStop(k, col)); c.fillStyle = gr; }
    else c.fillStyle = o.fill;
    c.fillText(s, x, y);
  }
  if (o.stroke) { c.shadowColor = 'transparent'; c.lineJoin = 'round'; c.strokeStyle = o.stroke; c.lineWidth = o.sw ?? 3; c.strokeText(s, x, y); }
  c.restore();
}
const enter = (T, t0, d = 0.2) => eo(seg(T, t0, t0 + d));
const SH = ['rgba(8,10,14,0.55)', 14, 3];
// a word whose letters erode into dust: each letter leaves at its own time, drifting up-right, blurring, thinning
function erode(c, s, o, T, t0, span) {
  MC.font = o.font; MC.fontStretch = o.st ?? 'normal';
  const total = MC.measureText(s).width; let x = o.align === 'center' ? -total / 2 : 0;
  c.save(); c.translate(o.x, o.y); if (o.rot) c.rotate(o.rot);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], w = MC.measureText(ch).width * (ch === ' ' ? 1.7 : 1), tl = t0 + span * (i / Math.max(1, s.length - 1)) * 0.8 + 0.08 * hash(i + 3);
    const k = seg(T, tl, tl + 0.75), kk = eo(k);
    if (k < 1) {
      txt(c, ch, { ...o, x: x + 46 * kk + 10 * Math.sin(i), y: -70 * kk - 20 * hash(i) * kk, rot: 0, alpha: (o.alpha ?? 1) * (1 - kk), blur: 9 * kk, align: 'left' });
      if (k > 0) {   // the dust the letter sheds
        c.save(); c.fillStyle = o.dust ?? C.dust;
        for (let j = 0; j < 14; j++) { const r = hash(i * 31 + j), q = hash(j * 7 + i), age = clamp(k * 1.4 - r * 0.4);
          if (age <= 0 || age >= 1) continue;
          c.globalAlpha = (1 - age) * 0.8 * (o.alpha ?? 1);
          c.beginPath(); c.arc(x + w * q + 140 * age * (0.5 + r), -capOf(o.font, o.st) * hash(j + i * 3) - 150 * age * q, 2 + 3 * r * (1 - age), 0, 7); c.fill(); }
        c.restore();
      }
    }
    x += w;
  }
  c.restore();
}
// crater rings on the wall, drawn behind him: thin silver arcs that draw on, then spread and thin away
function ring(c, x, y, r, kDraw, kGone, alpha = 0.85) {
  if (kDraw <= 0 || kGone >= 1) return;
  const k = eo(kDraw), rr = r * lerp(0.5, 1, k) * (1 + 0.3 * kGone);
  c.save(); c.globalAlpha = alpha * Math.min(1, kDraw * 3) * (1 - kGone);
  c.translate(x, y); c.scale(1, 0.72);   // seen a little from the side, like a crater on a sphere
  // the bowl: its upper-left wall in shadow, the lower-right wall lit (light from the upper left), a flat floor
  const g = c.createLinearGradient(-rr, -rr, rr, rr);
  g.addColorStop(0, 'rgba(12,13,16,0.92)'); g.addColorStop(0.55, 'rgba(58,60,66,0.85)'); g.addColorStop(1, 'rgba(168,172,178,0.9)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rr, 0, 7); c.fill();
  c.strokeStyle = 'rgba(232,234,238,0.95)'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.arc(0, 0, rr, Math.PI * 1.05, Math.PI * 1.05 + Math.PI * 1.1 * k); c.stroke();   // the lit rim, upper left
  c.strokeStyle = 'rgba(10,11,14,0.7)'; c.lineWidth = 5;
  c.beginPath(); c.arc(0, 0, rr * 1.04, Math.PI * 0.05, Math.PI * 0.05 + Math.PI * 0.9 * k); c.stroke();  // its cast shadow, lower right
  c.restore();
}

const L = {};
function prepare(ctx) {
  MC = document.createElement('canvas').getContext('2d');
  L.remembers = sizeForWidth(F.hero, 'REMEMBERS', 900, 'expanded');
  L.erased = sizeForWidth(F.hero, 'ERASED', 1000, 'expanded');
  L.rememberedBig = sizeForWidth(F.hero, 'REMEMBERED', 940, 'expanded');
  L.num = sizeForWidth(F.heroN, '3–4', 760);
  L.billion = sizeForWidth(F.hero, 'BILLION YEARS AGO', 920, 'expanded');
  L.cool = sizeForWidth(F.hero, 'COOL', 700, 'expanded');
}

// ---------- the frame ----------
function draw(T, s, ctx) {
  const { bx, fx } = ctx;
  // ===== B1 hook (0 → 2.22): "the moon / REMEMBERS / everything" on the chest, the room pushed back =====
  if (T < CUT.b2) {
    const out = 1 - seg(T, CUT.b2 - 0.08, CUT.b2);
    const k0 = enter(T, 0.06, 0.18), k1 = enter(T, WD.remembers + 0.05, 0.22), k2 = enter(T, WD.everything + 0.04, 0.22);
    txt(fx, 'the moon', { font: F.ser(92), x: 540, y: 1045, align: 'center', fill: C.silver, alpha: k0 * out, blur: (1 - k0) * 6, dy: 12 * (1 - k0), shadow: SH });
    txt(fx, 'REMEMBERS', { font: F.hero(L.remembers), st: 'expanded', x: 540, y: 1170, align: 'center', fill: C.copper, alpha: k1 * out, blur: (1 - k1) * 10, sc: lerp(1.08, 1, k1),
      glow: [[46, 'rgba(224,145,92,0.45)']], shadow: SH });
    txt(fx, 'everything', { font: F.ser(104), x: 540, y: 1262, align: 'center', fill: C.silver, alpha: k2 * out, blur: (1 - k2) * 6, dy: 12 * (1 - k2), shadow: SH });
  }
  // ===== B2 close-up (2.22 → 7.24): the Earth erases. A vertical ERASED up the left edge erodes into dust =====
  if (T >= CUT.b2 && T < CUT.b3) {
    const out = 1 - seg(T, CUT.b3 - 0.1, CUT.b3);
    const k0 = enter(T, WD.on + 0.03, 0.18);
    txt(fx, 'on the', { font: F.ser(70), x: 90, y: 330, fill: C.dust, alpha: k0 * out, blur: (1 - k0) * 5, dy: 10 * (1 - k0), shadow: SH });
    const k1 = enter(T, WD.earth + 0.03, 0.2);
    txt(fx, 'Earth', { font: F.ser(128), x: 84, y: 450, fill: C.silver, alpha: k1 * out, blur: (1 - k1) * 6, dy: 12 * (1 - k1), shadow: SH });
    // ERASED, rotated to read bottom-to-top along the left edge, its letters leaving one by one from "weather" on
    if (T >= WD.erased) {
      const k = enter(T, WD.erased + 0.04, 0.16);
      erode(fx, 'ERASED', { font: F.hero(L.erased * 0.98), st: 'expanded', x: 300, y: 1500, rot: -Math.PI / 2, fill: C.silver, alpha: k * out, shadow: SH, dust: C.silver }, T, WD.weather - 0.1, 1.5);
    }
    const kw = enter(T, WD.weather + 0.04, 0.18), kt = enter(T, WD.tectonics + 0.04, 0.18);
    if (T >= WD.weather) erode(fx, 'by weather', { font: F.ser(66), x: 330, y: 1300, fill: C.dust, alpha: kw * out, shadow: SH }, T, WD.tectonics + 0.4, 0.5);
    if (T >= WD.tectonics) txt(fx, 'and tectonics', { font: F.ser(66), x: 330, y: 1380, fill: C.dust, alpha: kt * out, blur: (1 - kt) * 5, shadow: SH });
  }
  // ===== B3 wide B&W (7.24 → 12.54): crater rings on the wall behind him, then "go away" erodes =====
  if (T >= CUT.b3 && T < CUT.b4) {
    const cam = s.cam, wall = (x, y) => [cam.ox + cam.m * x, cam.oy + cam.m * y];   // master px on the wall → screen
    // screen-placed around his head (the wide crop shows little wall), drifting with the push so they sit on the wall
    const rings = [[165, 330, 105, 0], [925, 270, 120, 0.1], [120, 690, 64, 0.2], [975, 650, 78, 0.3], [540, 120, 58, 0.4], [300, 120, 40, 0.5], [800, 110, 44, 0.6], [95, 960, 52, 0.7]];
    const gone = eio(seg(T, WD.go - 0.1, WD.away + 0.3)), z = cam.m / COVER;
    for (const [x, y, r, d] of rings) ring(bx, 540 + (x - 540) * z, 690 + (y - 690) * z, r * z, seg(T, WD.cratering + d, WD.cratering + d + 0.35), gone);
    const kc = enter(T, WD.cratering + 0.05, 0.2), cOut = 1 - seg(T, WD.just - 0.15, WD.just);
    txt(fx, 'cratering', { font: F.ser(110), x: 540, y: 1175, align: 'center', fill: C.silver, alpha: kc * cOut, blur: (1 - kc) * 6, dy: 12 * (1 - kc), shadow: SH });
    if (T >= WD.just) {
      const kg = enter(T, WD.just + 0.03, 0.18);
      erode(fx, 'just go away', { font: F.ser(110), x: 540, y: 1175, align: 'center', fill: C.silver, alpha: kg, shadow: SH, dust: C.silver }, T, WD.away + 0.05, 0.25);
    }
  }
  // ===== B4/B5 the void (12.54 → 16.80): REMEMBERED behind his head, then the Moon rises behind him; a lens on a crater =====
  if (T >= CUT.b4 && T < CUT.b6) {
    const cam = s.cam;
    // the moon: rises on "moon", large in the upper left, behind him; a copper-lit limb on its lower right (the eclipse)
    const km = eo(seg(T, WD.moon2 - 0.1, WD.moon2 + 0.8));
    if (km > 0) {
      const R = 470 + 30 * eo(seg(T, WD.moon2, CUT.b6)), cx = 250 + 30 * (1 - km), cy = 560 + 180 * (1 - km);
      bx.save(); bx.globalAlpha = km;
      const g = bx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5); g.addColorStop(0, 'rgba(224,145,92,0.18)'); g.addColorStop(1, 'rgba(224,145,92,0)');
      bx.fillStyle = g; bx.fillRect(0, 0, W, H);
      const mr = R / 287; bx.drawImage(ctx.moon, cx - 187 * mr, cy - 321 * mr, 500 * mr, 640 * mr);
      const sh = bx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); sh.addColorStop(0, 'rgba(21,24,29,0)'); sh.addColorStop(0.55, 'rgba(21,24,29,0.05)'); sh.addColorStop(1, 'rgba(120,52,28,0.55)');
      bx.globalCompositeOperation = 'source-atop'; bx.fillStyle = sh; bx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      bx.restore();
      // the lens on "craters": a ring drifts onto a crater with a leader line and a label
      const kl = eo(seg(T, WD.craters - 0.05, WD.craters + 0.4)), lx = cx - R * 0.08, ly = cy - R * 0.42, lr = 84;
      if (kl > 0) {
        fx.save(); fx.globalAlpha = kl; fx.strokeStyle = C.silver; fx.lineWidth = 3;
        fx.beginPath(); fx.arc(lx, ly, lr * lerp(1.6, 1, kl), 0, 7); fx.stroke();
        const ex = lx + lr * 0.72, ey = ly - lr * 0.72, kx = eo(seg(T, WD.craters + 0.2, WD.craters + 0.55));
        fx.beginPath(); fx.moveTo(ex, ey); fx.lineTo(lerp(ex, 636, kx), lerp(ey, 312, kx)); fx.stroke(); fx.restore();
        const kt = enter(T, WD.craters + 0.4, 0.2);
        txt(fx, 'craters', { font: F.ser(86), x: 648, y: 335, fill: C.silver, alpha: kt, blur: (1 - kt) * 5, dy: 10 * (1 - kt), shadow: SH });
        const k4 = enter(T, WD.craters + 0.7, 0.2);
        txt(fx, 'MARE NUBIUM', { font: F.sub(30), x: 656, y: 352, ls: 6, fill: C.dust, alpha: 0 * k4 });
      }
    }
    // REMEMBERED: behind him, across the head, copper glow rising; it hands over to the moon
    const kr = enter(T, WD.remembered + 0.03, 0.24), rOut = 1 - seg(T, WD.moon2 - 0.15, WD.moon2 + 0.25);
    if (kr * rOut > 0) {
      const y = cam.oy + cam.m * 92;    // a band just above his crown, its letters passing behind his hair
      txt(bx, 'REMEMBERED', { font: F.hero(L.rememberedBig), st: 'expanded', x: 540, y, align: 'center', fill: C.silver, alpha: kr * rOut, blur: (1 - kr) * 10 + 6 * (1 - rOut), sc: lerp(0.94, 1, kr),
        glow: [[60, 'rgba(224,145,92,0.55)'], [20, 'rgba(244,185,138,0.5)']] });
    }
    const ka = enter(T, WD.but + 0.02, 0.18), aOut = 1 - seg(T, WD.remembered - 0.06, WD.remembered + 0.04);
    txt(fx, "but all of that's", { font: F.ser(96), x: 540, y: 1360, align: 'center', fill: C.silver, alpha: ka * aOut, blur: (1 - ka) * 5, dy: 10 * (1 - ka), shadow: SH });
    const kn = enter(T, WD.on2 + 0.02, 0.2), nOut = 1 - seg(T, WD.so - 0.05, WD.so + 0.1);
    txt(fx, 'on the moon', { font: F.ser(104), x: 540, y: 1380, align: 'center', fill: C.copperHi, alpha: kn * nOut, blur: (1 - kn) * 5, dy: 10 * (1 - kn), shadow: SH });
  }
  // ===== B6 deep time (16.80 → 18.98): 3–4 above his head, BILLION YEARS behind it, on the umbra's copper dark =====
  if (T >= CUT.b6 && T < CUT.b7) {
    const kn = Math.pow(seg(T, WD.three - 0.02, WD.four + 0.4), 1.2), k3 = enter(T, WD.three + 0.02, 0.12), k4 = enter(T, WD.four + 0.02, 0.12);
    const col = `rgb(${Math.round(lerp(150, 244, kn))},${Math.round(lerp(70, 185, kn))},${Math.round(lerp(40, 138, kn))})`;
    const n = L.num, y = 548;
    MC.font = F.heroN(n); const w3 = MC.measureText('3').width, wAll = MC.measureText('3–4').width, x0 = 540 - wAll / 2;
    const glow = [[50 + 30 * kn, `rgba(224,145,92,${0.25 + 0.5 * kn})`]];
    txt(bx, '3', { font: F.heroN(n), x: x0, y, fill: col, alpha: k3, blur: (1 - k3) * 10, glow });
    txt(bx, '–4', { font: F.heroN(n), x: x0 + w3, y, fill: col, alpha: k4, blur: (1 - k4) * 10, glow });
    const kb = enter(T, WD.billion + 0.02, 0.2), ky = enter(T, WD.years + 0.02, 0.2);
    MC.font = F.hero(L.billion); MC.fontStretch = 'expanded'; const wb = MC.measureText('BILLION ').width, wy = MC.measureText('BILLION YEARS ').width, wt = MC.measureText('BILLION YEARS AGO').width;
    txt(bx, 'BILLION', { font: F.hero(L.billion), st: 'expanded', x: 540 - wt / 2, y: 660, stroke: C.copperHi, sw: 3, alpha: kb, blur: (1 - kb) * 8, glow: [[22, 'rgba(224,145,92,0.35)']] });
    txt(bx, 'YEARS', { font: F.hero(L.billion), st: 'expanded', x: 540 - wt / 2 + wb, y: 660, stroke: C.copperHi, sw: 3, alpha: ky, blur: (1 - ky) * 8, glow: [[22, 'rgba(224,145,92,0.35)']] });
    const kg = enter(T, WD.ago + 0.02, 0.16);
    txt(bx, 'AGO', { font: F.hero(L.billion), st: 'expanded', x: 540 - wt / 2 + wy, y: 660, stroke: C.copperHi, sw: 3, alpha: kg, blur: (1 - kg) * 8, glow: [[22, 'rgba(224,145,92,0.35)']] });
  }
  // ===== B7 rest (18.98 → 22.26): the room back in colour, a quiet phrase subtitle =====
  if (T >= CUT.b7 && T < CUT.b8) {
    const lines = [[WD.and4, WD.what - 0.05, [['and learn about', F.sub(56), C.silver]]], [WD.what, WD.in - 0.04, [['what was going on', F.sub(56), C.silver]]],
      [WD.in, CUT.b8 - 0.05, [['in the', F.sub(56), C.silver], ['early solar system', F.ser(84), C.copperHi]]]];
    for (const [a, b, parts] of lines) {
      if (T < a || T >= b) continue;
      const k = enter(T, a, 0.14), o = 1 - seg(T, b - 0.08, b);
      let tw = 0; const ws = parts.map(([t, f]) => { MC.font = f; MC.fontStretch = 'normal'; const w = MC.measureText(t + ' ').width; tw += w; return w; });
      let x = 540 - tw / 2;
      parts.forEach(([t, f, col], i) => { txt(fx, t, { font: f, x, y: 1160, fill: col, alpha: k * o, blur: (1 - k) * 4, dy: 8 * (1 - k), shadow: SH }); x += ws[i]; });
    }
  }
  // ===== B8 payoff (22.26 → 24.11): close-up, warm; "I think that's just" small, VERY COOL lands =====
  if (T >= CUT.b8 && T < CUT.end + 0.4) {
    const out = 1 - seg(T, CUT.end + 0.05, CUT.end + 0.35);
    const k0 = enter(T, WD.think, 0.16), o0 = 1 - seg(T, WD.verycool - 0.06, WD.verycool + 0.04);
    txt(fx, "i think that's just", { font: F.ser(92), x: 540, y: 1380, align: 'center', fill: C.silver, alpha: k0 * o0, blur: (1 - k0) * 5, dy: 10 * (1 - k0), shadow: SH });
    const kv = enter(T, WD.verycool + 0.02, 0.14), kc = enter(T, WD.cool + 0.02, 0.2);
    txt(fx, 'very', { font: F.ser(96), x: 540, y: 1230, align: 'center', fill: C.silver, alpha: kv * out, blur: (1 - kv) * 5, dy: 10 * (1 - kv), shadow: SH });
    txt(fx, 'COOL', { font: F.hero(L.cool), st: 'expanded', x: 540, y: 1400, align: 'center', fill: C.silver, alpha: kc * out, blur: (1 - kc) * 10, sc: lerp(1.12, 1, kc), glow: [[50, 'rgba(238,240,243,0.35)']], shadow: SH });
  }
  // ===== frame: a bottom fall-off under the captions (WHY 8), and the end card =====
  if (T >= CUT.end) {   // (the bottom fall-off is drawn by the compositor: look().uFall)
    // end card over the faded frame: the moon, small, and the line; then the credit (public domain, credited anyway)
    const k = eo(seg(T, CUT.end + 0.25, CUT.end + 0.9));
    const R = 210, cx = 540, cy = 760 - 30 * (1 - k);
    fx.save(); fx.globalAlpha = k; const mr = R / 287;
    fx.beginPath(); fx.arc(cx, cy, R, 0, 7); fx.clip();
    fx.save(); fx.translate(cx, 0); fx.scale(-1, 1); fx.drawImage(ctx.moon, -187 * mr, cy - 321 * mr, 500 * mr, 640 * mr); fx.restore();   // the source cuts the moon's left limb: its mirror fills it
    fx.drawImage(ctx.moon, cx - 187 * mr, cy - 321 * mr, 500 * mr, 640 * mr);
    const sh = fx.createLinearGradient(cx - R, cy, cx + R, cy); sh.addColorStop(0, 'rgba(21,24,29,0)'); sh.addColorStop(0.6, 'rgba(90,40,22,0.25)'); sh.addColorStop(1, 'rgba(150,64,30,0.7)');
    fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = sh; fx.fillRect(cx - R, cy - R, 2 * R, 2 * R); fx.restore();
    const kt = enter(T, CUT.end + 0.55, 0.3);
    txt(fx, 'the moon', { font: F.ser(84), x: 540, y: 1110, align: 'center', fill: C.silver, alpha: kt, blur: (1 - kt) * 6 });
    txt(fx, 'REMEMBERS', { font: F.hero(sizeForWidth(F.hero, 'REMEMBERS', 620, 'expanded')), st: 'expanded', x: 540, y: 1200, align: 'center', fill: C.copper, alpha: kt, blur: (1 - kt) * 6, glow: [[30, 'rgba(224,145,92,0.35)']] });
    const kc = enter(T, CUT.end + 0.9, 0.3);
    txt(fx, 'Ernie Wright · NASA Goddard', { font: F.sub(30), x: 540, y: 1330, align: 'center', ls: 2, fill: C.dust, alpha: kc });
  }
}
function paintUnder(c, fn) { c.save(); c.globalCompositeOperation = 'destination-over'; fn(); c.restore(); }

// ---------- sound: CC0 / MIT / the owner's pack, each on its event; no music bed ----------
const sfxFiles = {
  wshort: 'sfx-style1/woosh-short.wav', wtight: 'sfx-style1/woosh-tight.wav', air: 'sfx/fs.whoosh.swosh-whoosh-air-cut.wav',
  soft: 'sfx/fs.impact.soft-hit.wav', punch: 'sfx/fs.impact.punch2.wav', pop: 'sfx/fs.ui.pop-4.wav', riser: 'sfx/riser-short.wav', click: 'sfx/kenney.click.wav',
};
const sfx = [
  { t: 0.02, k: 'wshort', gain: 0.22 }, { t: WD.remembers + 0.05, k: 'soft', gain: 0.5 },
  { t: CUT.b2 - 0.03, k: 'wtight', gain: 0.18 }, { t: WD.erased + 0.03, k: 'soft', gain: 0.3, rate: 0.8 },
  { t: WD.weather - 0.05, k: 'sand', gain: 0.45 }, { t: WD.tectonics + 0.35, k: 'sand', gain: 0.3, rate: 0.85 },
  { t: CUT.b3 - 0.03, k: 'wtight', gain: 0.16, rate: 0.9 },
  ...[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((d, i) => ({ t: WD.cratering + d, k: 'pop', gain: 0.12, rate: 0.8 + 0.08 * i })),
  { t: WD.away, k: 'sand', gain: 0.4 },
  { t: CUT.b4 - 0.30, k: 'air', gain: 0.45, rate: 0.85 }, { t: CUT.b4 + 0.01, k: 'thud', gain: 0.55 },
  { t: WD.remembered + 0.03, k: 'soft', gain: 0.35 }, { t: WD.moon2 - 0.05, k: 'wshort', gain: 0.18, rate: 0.75 },
  { t: WD.craters + 0.02, k: 'click', gain: 0.25 },
  { t: CUT.b6 - 1.38, k: 'riser', gain: 0.22 }, { t: WD.three + 0.02, k: 'punch', gain: 0.35 }, { t: WD.four + 0.02, k: 'soft', gain: 0.35 },
  { t: CUT.b7 - 0.03, k: 'wshort', gain: 0.14 }, { t: CUT.b8 - 0.03, k: 'wtight', gain: 0.18 },
  { t: WD.cool + 0.02, k: 'soft', gain: 0.4 }, { t: CUT.end + 0.2, k: 'boom', gain: 0.6 },
];

export const EDIT = {
  duration: DUR, sfxFiles, sfx, prepare, draw,
  state: T => ({ cam: camera(T), g: look(T), p: post(T) }),
  words: WD, cuts: CUT,
};
