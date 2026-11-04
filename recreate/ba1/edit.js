// The ba1 edit as data + drawing. Coordinates are the 1080x1920 after frame; times are our clip's clock.
// Reference numbers (in comments, "ref") come from docs/recreate/ba1/wNN/REF.md: camera tables from the
// before→after feature match (data/refs/edit-ba1/cam.json), text boxes from gridded frames, colours sampled.
export const BRAND = 'DORAVI';   // the logo bug's word (the reference's is the client's mark; ours is a placeholder, ?brand=)

const W = 1080, H = 1920, MW = 1800, MH = 2160, COVER = H / MH;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = k => 1 - Math.pow(1 - k, 3), eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, ei = k => k * k * k;
const tab = (rows, t) => { if (t <= rows[0][0]) return rows[0].slice(1); for (let i = 1; i < rows.length; i++) if (t <= rows[i][0]) { const [a, ...va] = rows[i - 1], [b, ...vb] = rows[i], k = (t - a) / (b - a); return va.map((v, j) => lerp(v, vb[j], k)); } return rows.at(-1).slice(1); };

// ---------- our speaker's words (master clock; Whisper per piece, onsets checked against the voice energy) ----------
const WD = {
  what: .02, were: .06, seeing: .18, over: .44, time: .64, is: .92, more1: 1.14, and: 1.38, more2: 1.56, hot: 2.32, years: 2.92,
  these: 3.65, numbers: 3.83, look: 4.12, modest: 4.33, on: 4.63, paper: 4.82,
  More: 5.47, than: 5.59, p70: 5.75, of: 6.43, the1: 6.62, earths: 6.70, surface: 6.92, is2: 7.21, ocean: 7.46,
  and2: 8.07, were2: 8.18, also: 8.28, seeing2: 8.57, record: 8.88, warming: 9.28, over2: 9.63, oceans: 9.99,
  so: 10.87, they: 11.04, absorb: 11.30, heat: 11.63, and3: 12.03, carbon: 12.35, dioxide: 12.59,
  its: 13.77, not: 13.85, in: 14.03, the2: 14.21, atmosphere: 14.30,
};
const SUBS_A = [['well', 15.04], ['we', 15.23], ['know', 15.31], ["what's", 15.54], ['driving', 15.81], ['the', 16.18], ['warming', 16.39], ['on', 16.59], ['our', 16.77], ['planet', 16.89], [null, 17.32]];
const SUBS_B = [['we', 17.38], ['also', 17.50], ['know', 17.82], ['how', 18.60], ['to', 18.90], ['limit', 19.10], ['warming', 19.38], [null, 19.80]];

// ---------- shots (pieces of the master) ----------
const CUT = { p2: 3.635, p3: 5.395, p4: 10.865, p5: 13.765, p6: 15.015, p7: 17.315, end: 19.805 };
const ANCHOR = [[895, 575], [911, 617], [885, 630], [898, 608], [948, 620], [884, 613], [890, 598]];   // face (Haar centre) in master px per piece
const HAAR = 440;                                   // our face box width in master px (the reference's after boxes divided by it give the scale)
const REF_B1 = [[0, 1.4077], [.1, 1.4007], [.2, 1.3493], [.3, 1.2684], [.4, 1.2273], [.5, 1.1932], [.6, 1.1824], [.7, 1.1698], [.8, 1.1616], [.9, 1.1555]];
const REF_VOID = [[7.6, 1.0241, -11.3, -30.9], [7.7, 1.0957, -51.4, -122.2], [7.8, 1.1634, -84.7, -210.2], [7.9, 1.1997, -109.1, -254.4], [8.0, 1.2242, -125.5, -282.5], [8.1, 1.2364, -125.7, -302.1], [8.2, 1.2489, -137.4, -316.8], [8.3, 1.2508, -134.8, -320.8], [8.4, 1.2541, -136.4, -324.6], [8.5, 1.2546, -134.3, -326.4]];
const REF_B4A = [[11.733, 1.4656], [11.8, 1.5017], [11.9, 1.5328], [12.0, 1.543], [12.1, 1.5491], [12.2, 1.5542], [12.4, 1.556], [12.5, 1.5551], [12.6, 1.5373], [12.7, 1.5079], [12.8, 1.5], [12.9, 1.4895], [13.0, 1.4781], [13.1, 1.4696], [13.2, 1.4599], [13.4, 1.4654], [13.7, 1.4565]];
const REF_B4B = [[13.8, 1.4843], [13.85, 1.5097], [13.9, 1.5484], [14.0, 1.5991], [14.1, 1.6092], [14.2, 1.6312], [14.3, 1.6409], [14.4, 1.6529], [15.8, 1.655]];
const pieceAt = T => T < CUT.p2 ? 0 : T < CUT.p3 ? 1 : T < CUT.p4 ? 2 : T < CUT.p5 ? 3 : T < CUT.p6 ? 4 : T < CUT.p7 ? 5 : 6;
function place(m, fx, fy, a, cover) {   // face anchor a (master px) lands at (fx, fy); cover keeps the frame full of footage
  let ox = fx - m * a[0], oy = fy - m * a[1];
  if (cover) { m = Math.max(m, COVER); ox = clamp(fx - m * a[0], W - m * MW, 0); oy = clamp(fy - m * a[1], H - m * MH, 0); }
  return { m, ox, oy };
}
const B1X = 330, PUNCH_DY = 317;                                    // our face x in the hook (ref 575): left, so the column and the punch clear her head
const CU = { m: 1.91, x0: -49, y0: 1000 };          // close-up: the reference's head height 1015 px, nose at the left edge
function camera(T) {
  const a = ANCHOR[pieceAt(T)];
  if (T < CUT.p2) return place(COVER * tab(REF_B1, T)[0] / 1.1555, B1X, 2000, a, true);
  if (T < CUT.p3) {                                   // ref 3.6-7.4: settle right + slight zoom, tilt at block B, push into the burn
    const k = 1 + 0.025 * eo(seg(T, CUT.p2, CUT.p2 + .7)) + 0.05 * ei(seg(T, 4.68, 5.40));
    const x = CU.x0 + 85 * eo(seg(T, CUT.p2, CUT.p2 + .7)), y = CU.y0 - 47 * eio(seg(T, 4.38, 4.68));
    return place(CU.m * k, x, y, a, true);
  }
  if (T < CUT.p4) {
    const tr = Math.min(8.5, T + 2.05);              // ref void push 7.6 → 8.5 (ref burn 7.23 = our 5.18)
    const [s, rx, ry] = tab(REF_VOID, tr);
    const m = 0.618 * s / 1.2546, fv = [s * 589 + rx, s * 1062 + ry];
    const vc = place(m, fv[0], fv[1], a, false);
    if (T < 8.07) return vc;
    const rp = 1 + 0.09 * eo(seg(T, 8.07, 9.6));      // the reference's push continues 1.378 → 1.50 into the room
    const rc = place(COVER * rp, 593 - 19 * seg(T, 8.07, 9.6), 2000, a, true);
    const k = eio(seg(T, 8.07, 8.45));
    return { m: lerp(vc.m, rc.m, k), ox: lerp(vc.ox, rc.ox, k), oy: lerp(vc.oy, rc.oy, k) };
  }
  if (T < CUT.p5) return place(COVER * tab(REF_B4A, T - CUT.p4 + 11.733)[0] / 1.4565, 574, 2000, a, true);
  if (T < CUT.p6) return place(COVER * tab(REF_B4B, T - CUT.p5 + 13.8)[0] / 1.4565, 700, 2000, a, true);
  if (T < CUT.p7) return place(513 / HAAR, 560, 2000, a, true);
  return place(406 / HAAR, 560, 2000, a, true);
}

// ---------- background / grade per time ----------
function look(T) {
  const g = { uBgSat: 1, uBgBri: 1, uBgCon: 1, uVoid: 0, uBW: 0, uSubSat: 1, uRim: 0, uRimW: 6, uTintGain: 3.4, uGrade: 1, uSatAdj: -0.1 };
  if (T >= CUT.p2 && T < CUT.p3) Object.assign(g, { uBgSat: 0, uBgBri: 1.25, uBgCon: 1.2, uSubSat: 0.82, uRim: 1, uRimW: 9 });
  if (T >= CUT.p3 && T < CUT.p4) g.uVoid = 1 - eio(seg(T, 8.07, 8.42));
  if (T >= CUT.p6 && T < CUT.p7) g.uBW = 1;
  return g;
}

// ---------- transitions (post uniforms) ----------
const BURN = 5.18, PART = 10.635, BAR = 10.935, GL = 14.68;
function post(T) {
  const p = { uBurn: [0, 0, 0, 0], uBand: [960, 0, 0, 0], uPart: [0, 0, 0, 0], uBar: [0, 0, 0, 0], uGlitch: [0, 0, 0, 0], uLeak: [0, 0, 0, 0], uBlack: 0 };
  const b = T - BURN;                                  // ref 7.23 → 7.633 (blobs, white, glitch frame, noise, band to a line, void)
  if (b >= 0 && b < 0.237) { p.uBurn[0] = clamp(b / 0.17); p.uBurn[1] = eio(seg(b, 0.14, 0.2)); }
  if (b >= 0.237 && b < 0.27) p.uBand[3] = 1;
  if (b >= 0.27 && b < 0.33) p.uBurn[2] = 1;
  if (b >= 0.33 && b < 0.355) {                         // white from the top collapses into a line at y 944 over the void
    const k = seg(b, 0.33, 0.355), top = 0, bot = lerp(1050, 958, eo(k)), y0 = lerp(top, 958, eo(k));
    p.uBurn[3] = 1; p.uBand[0] = (y0 + bot) / 2; p.uBand[1] = Math.max(1.5, (bot - y0) / 2); }
  if (b >= 0.355) p.uBand[0] = 958;
  if (b >= 0.355 && b < 0.47) p.uBand[2] = 1 - seg(b, 0.355, 0.47);
  const q = T - PART;                                  // ref 11.37 → 11.73
  if (q >= 0 && q < 0.36) { p.uPart = [seg(q, 0, 0.16), Math.sin(Math.PI * seg(q, 0.12, 0.36)), q < 0.23 ? eo(seg(q, 0, 0.12)) : 1 - seg(q, 0.23, 0.3), Math.floor(T * 30)]; }
  const r = T - BAR;                                   // ref 11.80 → 11.97
  if (r >= 0 && r < 0.17) { const f = Math.floor(r * 30); p.uBar = [[810, 700, 620, 600, 760, 820][Math.min(5, f)], [270, 120, 60, 70, 160, 270][Math.min(5, f)], 1, f]; }
  const g = T - GL;                                    // ref 15.83 → 16.20
  if (g >= 0 && g < 0.37) { p.uGlitch = [g < 0.12 ? 1 : 0, g >= 0.14 && g < 0.27 ? 1 : 0, g >= 0.27 ? (g < 0.34 ? 1 : 1 - seg(g, 0.34, 0.37)) : 0, 0]; }
  const l = T - 15.08;                                 // green leak, ref 16.23 → 16.40
  if (l >= 0 && l < 0.17) p.uLeak = [Math.sin(Math.PI * seg(l, 0, 0.17)), lerp(1000, 640, eo(seg(l, 0, 0.17))), 1700, 170];
  if (T >= 19.82) p.uBlack = 1;
  return p;
}

// ---------- drawing helpers ----------
const F = {
  script: s => `400 ${s}px Courgette`, xb: s => `800 ${s}px Poppins`, b: s => `700 ${s}px Poppins`, sb: s => `600 ${s}px Poppins`,
  l: s => `300 ${s}px Poppins`, xl: s => `200 ${s}px Poppins`, hand: s => `400 ${s}px Kalam`, anton: s => `400 ${s}px Anton`, it: s => `700 ${s}px InterTight`, it6: s => `600 ${s}px InterTight`,
  lob: s => `400 ${s}px Lobster`,
};
let MC;                                                // a measuring context
const capOf = font => { MC.font = font; return MC.measureText('H').actualBoundingBoxAscent; };
const widthOf = (txt, font, ls = 0) => { MC.font = font; MC.letterSpacing = ls + 'px'; const w = MC.measureText(txt).width - ls; MC.letterSpacing = '0px'; return w; };
const sizeForCap = (mk, cap) => cap / capOf(mk(100)) * 100;
const sizeForWidth = (mk, txt, w, ls = 0) => w / widthOf(txt, mk(100), ls) * 100;
// entrance: fade + blur + small slide (ref words resolve in 0.13-0.27 s)
const enter = (T, t0, d = 0.18) => eo(seg(T, t0, t0 + d));
function txt(c, s, o) {
  const a = (o.alpha ?? 1); if (a <= 0.003) return;
  c.save();
  c.globalAlpha = a; c.font = o.font; c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic';
  c.letterSpacing = (o.ls ?? 0) + 'px';
  if (o.blur > 0.3) c.filter = `blur(${o.blur.toFixed(1)}px)`;
  const x = o.x + (o.dx ?? 0), y = o.y + (o.dy ?? 0);
  if ((o.sc && o.sc !== 1) || o.sy) { c.translate(x, y); c.scale(o.sc ?? 1, (o.sc ?? 1) * (o.sy ?? 1)); c.translate(-x, -y); }
  if (o.shadow) { c.shadowColor = o.shadow[0]; c.shadowBlur = o.shadow[1]; c.shadowOffsetX = o.shadow[2] ?? 0; c.shadowOffsetY = o.shadow[3] ?? 0; }
  if (o.fill || o.grad) {
    if (o.grad) { const m = c.measureText(s); const gr = c.createLinearGradient(0, y - m.actualBoundingBoxAscent, 0, y + (o.gradDesc ? m.actualBoundingBoxDescent : 0)); o.grad.forEach(([k, col]) => gr.addColorStop(k, col)); c.fillStyle = gr; }
    else c.fillStyle = o.fill;
    c.fillText(s, x, y);
  }
  if (o.stroke) { c.shadowColor = 'transparent'; c.lineJoin = 'round'; c.strokeStyle = o.stroke; c.lineWidth = o.sw ?? 4; c.strokeText(s, x, y); if (o.stroke2) { c.strokeStyle = o.stroke2; c.lineWidth = o.sw2; c.strokeText(s, x, y); } }
  c.restore();
}
function line(c, x0, y0, x1, y1, k, alpha = 0.55, w = 2) { if (k <= 0) return; c.save(); c.globalAlpha = alpha; c.strokeStyle = '#f2efe9'; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); c.stroke(); c.restore(); }
const toOut = (cam, x, y) => [cam.ox + cam.m * x, cam.oy + cam.m * y];

// ---------- layout computed once fonts are in ----------
const L = {};
function prepare(ctx) {
  MC = document.createElement('canvas').getContext('2d');
  // B1 stack 1: a justified column x 658..983 (ref: HAPPENS fit, TO at YOUR's size, YOUR fit, PAID fit; lines touch)
  const col = { x: 658, w: 325 };
  const lines = [['WE’RE', F.xb, 'fill'], ['SEEING', F.xb, 'stroke'], ['OVER', F.xb, 'grad'], ['TIME', F.xb, 'stroke']];
  let y = 470; L.s1 = [];
  for (const [t, mk, kind] of lines) { const size = sizeForWidth(mk, t, col.w); const cap = capOf(mk(size)); L.s1.push({ t, font: mk(size), kind, y: y + cap, x: col.x }); y += cap + 2; }
  L.s1what = { font: F.script(70), x: 658, y: 425 };
  L.s1is = { font: F.script(70), x: 1018, y: y + 95 - 2, align: 'right' };
  // B1 punch, ref PRESENCE: Anton, x 76..972, cap 443..832
  // the reference's condensed caps are stretched vertically: fit the width, then scale y until the cap is 389
  const ps = sizeForWidth(F.anton, 'HOT YEARS', 896), pcap0 = capOf(F.anton(ps));
  L.punch = { font: F.anton(ps), sy: 389 / pcap0, y: 832, w: widthOf('HOT YEARS', F.anton(ps)), hotW: widthOf('HOT ', F.anton(ps)) };
  L.punch.x = 524 - L.punch.w / 2;
  // B3 big number, ref %94: digit height 324 (270..594), x 86..998
  const ns = sizeForCap(F.b, 324); L.num = { font: F.b(ns), y: 594 };
  const nw = widthOf('%70', F.b(ns)); L.num.ls = (912 - nw) / 2; L.num.x = 86;
  { const fs = sizeForWidth(F.anton, 'EARTH’S SURFACE', 918); L.surf = { font: F.anton(fs), x: 86, y: 875, sy: 227 / capOf(F.anton(fs)) }; }
  // B4b stack, ref ADS / convert / THE / warm / AUDIENCE at x 86, column ~385 wide
  L.b4b = { atm: F.b(sizeForWidth(F.b, 'ATMOSPHERE', 385)) };
  // logo bug, ref BONOMI: cap 40, 223 wide, baseline 1563
  L.logo = (scale) => ({ size: sizeForCap(F.b, 40 * scale) });
}

// the logo: the brand word with a red dot standing in for its second letter (the reference's device)
function logo(c, brand, cx, base, scale, alpha) {
  if (alpha <= 0) return;
  const size = sizeForCap(F.b, 40 * scale), font = F.b(size), cap = 40 * scale;
  const first = brand[0], rest = brand.slice(2), gap = cap * 0.08;
  const w1 = widthOf(first, font), dot = cap * 1.04, w2 = widthOf(rest, font), w = w1 + gap + dot + gap + w2;
  let x = cx - w / 2;
  c.save(); c.globalAlpha = alpha; c.font = font; c.fillStyle = '#fbf8f4'; c.textBaseline = 'alphabetic';
  c.fillText(first, x, base); x += w1 + gap;
  c.fillStyle = '#e81e19'; c.beginPath(); c.arc(x + dot / 2, base - cap / 2, dot / 2, 0, Math.PI * 2); c.fill(); x += dot + gap;
  c.fillStyle = '#fbf8f4'; c.fillText(rest, x, base); c.restore();
}

// ---------- the frame ----------
function draw(T, s, ctx) {
  const { bx, fx, tx } = ctx, cam = s.cam;
  // ===== B1 (0 → 3.635): red wall regions, stack 1, handwritten stack 2, the punch =====
  if (T < CUT.p2) {
    const exit1 = 1.25, out1 = 1 - seg(T, exit1, exit1 + 0.17);
    // red regions: world-anchored rectangles (ref: the wall's wood panels turned red, behind her), popping in 0.30-0.47
    const settled = place(COVER, B1X, 2000, ANCHOR[0], true);
    const blocks = [[645, 0, 1080, 450, 0.30], [0, 442, 650, 840, 0.37], [727, 840, 1080, 1335, 0.45]];
    if (T >= 0.30 && T < exit1 + 0.02) {
      tx.save(); tx.scale(0.5, 0.5); tx.fillStyle = '#ff0000';
      bx.save();
      for (const [x0, y0, x1, y1, t0] of blocks) {
        if (T < t0) continue;
        const q0 = [(x0 - settled.ox) / settled.m, (y0 - settled.oy) / settled.m], q1 = [(x1 - settled.ox) / settled.m, (y1 - settled.oy) / settled.m];
        const [a0, b0] = toOut(cam, ...q0), [a1, b1] = toOut(cam, ...q1);
        tx.fillRect(a0, b0, a1 - a0, b1 - b0);
        bx.fillStyle = 'rgba(0,0,0,0.9)';   // the dark bars and shadow framing each red panel
        bx.fillRect(a0 - 14, b1, a1 - a0 + 14, 16); bx.fillRect(a0 - 14, b0, 14, b1 - b0 + 16);
      }
      bx.restore(); tx.restore();
    }
    // stack 1
    if (out1 > 0) {
      const sh = ['rgba(0,0,0,0.45)', 10, 0, 3];
      const k0 = enter(T, 0.13, 0.27);
      txt(fx, 'what', { ...L.s1what, fill: '#ffffff', alpha: k0 * out1, blur: (1 - k0) * 6, dy: -15 * (1 - k0), shadow: sh });
      const ins = [0.25, 0.37, 0.56, 0.76];
      L.s1.forEach((ln, i) => {
        const k = enter(T, ins[i]);
        const o = { font: ln.font, x: ln.x, y: ln.y, alpha: k * out1, blur: (1 - k) * 7, dy: 10 * (1 - k) };
        if (ln.kind === 'fill') txt(fx, ln.t, { ...o, fill: '#ffffff', shadow: sh });
        if (ln.kind === 'grad') txt(fx, ln.t, { ...o, grad: [[0, '#ffffff'], [0.45, '#f1f1f1'], [1, '#9c9c9c']], shadow: sh });
        if (ln.kind === 'stroke') txt(fx, ln.t, { ...o, stroke: '#ffffff', sw: 4.5 });
      });
      const k5 = enter(T, 1.04);
      txt(fx, 'is', { ...L.s1is, fill: '#ffffff', alpha: k5 * out1, blur: (1 - k5) * 6, dy: 10 * (1 - k5), shadow: sh });
    }
    // stack 2: handwritten zigzag (ref when/you/have/zero/organic, lagging the voice 0.2-0.3 s), thin frame lines
    const out2 = 1 - seg(T, WD.hot + 0.04, WD.hot + 0.12);
    if (T >= 1.42 && out2 > 0) {
      const hw = [['more', 648, 520, 1.45], ['and', 760, 578, 1.60], ['more', 680, 640, 1.80]];
      for (const [w, x, y, t0] of hw) { const k = enter(T, t0, 0.14); txt(fx, w, { font: F.hand(100), x, y, fill: '#ffffff', alpha: k * out2, blur: (1 - k) * 5, shadow: ['rgba(0,0,0,0.4)', 8, 0, 2] }); }
    }
    if (T >= 1.42) { const lk = eo(seg(T, 1.42, 1.75)); line(fx, 650, 440, 1080, 440, lk, 0.5); line(fx, 650, 833, 1080, 833, lk, 0.5); line(fx, 983, 0, 983, 1330, lk, 0.45); }
    // the punch (ref PRESENCE 2.92-3.5: textured red letters, dark offset shadow, behind her above the head). Our head
    // fills that band, so the punch sits in front of her body under the chin, same size, same fill (DIFF w00)
    if (T >= WD.hot + 0.04) {
      const P = L.punch, showYears = T >= WD.years + 0.04, Y = P.y + PUNCH_DY;
      const fade = (t0) => eio(seg(T, t0, t0 + 0.17));   // ref: PRESENCE fades up over 0.17 s while stack 2 fades out
      for (const [word, x0, t0] of [['HOT', P.x, WD.hot + 0.04], ['YEARS', P.x + P.hotW, WD.years + 0.04]]) {
        if (word === 'YEARS' && !showYears) continue;
        const a = fade(t0);
        tx.save(); tx.scale(0.5, 0.5);
        txt(tx, word, { font: P.font, x: x0, y: Y, sy: P.sy, fill: '#0000ff', dx: -9, dy: 10, alpha: a });   // the dark offset shadow (blue channel)
        txt(tx, word, { font: P.font, x: x0, y: Y, sy: P.sy, fill: '#00ff00', alpha: a }); tx.restore();
      }
    }
  }
  // ===== B2 close-up (3.635 → 5.395): B&W dark background, rim line, two-weight blocks, frame lines, dust =====
  if (T >= CUT.p2 && T < CUT.p3) {
    const dust = [[60, 140, 6, .3], [740, 1010, 8, .5], [400, 640, 5, .7], [960, 300, 7, .2], [870, 1220, 6, .9], [180, 1500, 5, .4]];
    bx.save(); for (const [x, y, r, ph] of dust) { const yy = y - 30 * (T - CUT.p2) - 8 * Math.sin(T * 2 + ph * 6); const g = bx.createRadialGradient(x, yy, 0, x, yy, r * 2); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); bx.fillStyle = g; bx.beginPath(); bx.arc(x, yy, r * 2, 0, 7); bx.fill(); } bx.restore();
    const FA = 3.75, FB = 4.38, FC = 4.68;
    const aOut = 1 - seg(T, FB - 0.08, FB), bOut = 1 - seg(T, FC - 0.06, FC);
    const w = (c, t, x, y, t0, fill, font = F.it(145)) => { const k = enter(T, t0, 0.12); txt(c, t, { font, x, y, fill, alpha: k, blur: (1 - k) * 6, dx: -30 * (1 - k) }); };
    if (aOut > 0) {
      fx.save(); fx.globalAlpha = aOut;
      w(fx, 'these', 492, 594, FA, '#ffffff'); w(fx, 'numbers', 492, 659, WD.numbers + 0.1, '#ffffff');
      fx.restore();
      bx.save(); bx.globalAlpha = aOut; w(bx, 'look', 470, 724, WD.look + 0.1, '#8d8d8d'); bx.restore();
      const lk = eo(seg(T, FA, FA + 0.3)); line(fx, 470, 771, 1080, 771, lk, 0.55 * aOut); line(fx, 756, 120, 756, 1080, lk, 0.4 * aOut);
    }
    if (T >= FB && bOut > 0) {
      fx.save(); fx.globalAlpha = bOut; w(fx, 'modest', 490, 588, FB, '#ffffff'); fx.restore();
      const lk = eo(seg(T, FB, FB + 0.25)); line(fx, 470, 508, 1080, 508, lk, 0.55 * bOut); line(fx, 470, 771, 1080, 771, lk, 0.55 * bOut); line(fx, 983, 324, 983, 771, lk, 0.5 * bOut);
    }
    if (T >= FC) {
      const kc = enter(T, WD.paper + 0.05, 0.16);
      txt(fx, 'paper', { font: F.it(sizeForWidth(F.it, 'paper', 497)), x: 514, y: 767, fill: '#c4c4c4', alpha: 0.82 * kc, blur: (1 - kc) * 8, dx: -25 * (1 - kc) });
      w(fx, 'on', 508, 640, FC, '#ffffff');
      const lk = eo(seg(T, FC, FC + 0.25)); line(fx, 470, 508, 1080, 508, lk); line(fx, 470, 771, 1080, 771, lk); line(fx, 994, 0, 994, 1920, lk, 0.5);
    }
  }
  // ===== B3 void (5.395 → 8.07) and the room's return (→ 10.865) =====
  if (T >= CUT.p3 && T < CUT.p4) {
    const vOut = 1 - seg(T, 8.07, 8.42);
    const sub = (t, t0, t1) => { if (T < t0 || T >= t1) return; const k = enter(T, t0, 0.08); txt(fx, t, { font: F.sb(62), x: 540, y: 1345, align: 'center', fill: '#ffffff', alpha: k, blur: (1 - k) * 4, shadow: ['rgba(0,0,0,0.5)', 8, 0, 2] }); };
    sub('more', WD.More, WD.than); sub('than', WD.than, WD.p70 + 0.05);
    sub('is', WD.is2 + 0.04, WD.ocean); sub('ocean', WD.ocean + 0.04, 8.07);
    if (vOut > 0) {
      // the number glows up out of the void (ref %94: dim at 7.6, full at 8.4)
      const kn = Math.pow(seg(T, 5.55, 6.40), 1.25), N = L.num;   // ref: dim dark red at the void's reveal (7.6), full by 8.4
      const col = `rgb(${Math.round(lerp(55, 255, kn))},${Math.round(lerp(2, 22, kn))},${Math.round(lerp(2, 14, kn))})`;
      fx.save(); fx.globalAlpha = vOut * (T < 5.53 ? 0 : 1);
      txt(fx, '%70', { font: N.font, x: N.x, y: N.y, ls: N.ls, fill: col, shadow: [`rgba(255,20,10,${0.25 + 0.65 * kn})`, 30 + 18 * kn] });
      txt(fx, '%70', { font: N.font, x: N.x, y: N.y, ls: N.ls, fill: col, shadow: [`rgba(255,40,20,${0.5 * kn})`, 14] });
      fx.restore();
      const ko = enter(T, WD.of + 0.06, 0.2);
      txt(fx, 'OF', { font: F.anton(118), x: 534, y: 652, align: 'center', fill: `rgba(235,20,14,${0.95 * ko * vOut})`, shadow: ['rgba(255,20,10,0.8)', 24] });
      const ks = enter(T, WD.earths + 0.05, 0.22);
      txt(bx, 'EARTH’S SURFACE', { font: L.surf.font, x: L.surf.x, y: L.surf.y, sy: L.surf.sy, stroke: `rgba(250,28,18,${ks * vOut})`, sw: 5, blur: (1 - ks) * 8 });
      bx.save(); bx.filter = 'blur(14px)'; txt(bx, 'EARTH’S SURFACE', { font: L.surf.font, x: L.surf.x, y: L.surf.y, sy: L.surf.sy, stroke: `rgba(255,20,10,${0.95 * ks * vOut})`, sw: 12 }); bx.restore();
    }
    // room back: RECORD (ref MULTIPLE: double-line outline) and "warming" (ref touchpoints: gold script)
    const kr = enter(T, WD.record + 0.08, 0.16), kw = enter(T, WD.warming + 0.08, 0.2);
    if (T >= WD.record) {
      const f = F.xb(sizeForCap(F.xb, 108));
      txt(fx, 'RECORD', { font: f, x: 542, y: 1177, align: 'center', stroke: '#fbfbfb', sw: 5, stroke2: '#3a3a3a', sw2: 1.6, alpha: kr, blur: (1 - kr) * 6, shadow: ['rgba(0,0,0,0.4)', 8] });
    }
    if (T >= WD.warming) txt(fx, 'warming', { font: F.script(108), x: 550, y: 1262, align: 'center', grad: [[0, '#fbe3a4'], [0.55, '#e7b264'], [1, '#c98a3e']], gradDesc: true, alpha: kw, blur: (1 - kw) * 6, shadow: ['rgba(0,0,0,0.45)', 10, 0, 3] });
  }
  // ===== B4a (10.865 → 13.765): bold + warm outline + thin + teal, low left =====
  if (T >= CUT.p4 && T < CUT.p5) {
    const out = 1 - seg(T, 13.62, 13.76), sh = ['rgba(0,0,0,0.45)', 10, 0, 3];
    const k1 = enter(T, 10.95), k2 = enter(T, WD.heat + 0.12), k3 = enter(T, WD.and3 + 0.08), k4 = enter(T, WD.carbon + 0.1);
    txt(fx, 'so they absorb', { font: F.sb(100), x: 151, y: 1145, fill: '#ffffff', alpha: k1 * out, blur: (1 - k1) * 6, dy: 10 * (1 - k1), shadow: sh });
    txt(fx, 'HEAT', { font: F.sb(sizeForCap(F.sb, 123)), x: 248, y: 1274, stroke: '#d79d63', sw: 3.2, alpha: k2 * out, blur: (1 - k2) * 6, dy: 10 * (1 - k2) });
    txt(fx, 'and', { font: F.xl(100), x: 400 - 260, y: 1352, fill: '#ffffff', alpha: k3 * out, blur: (1 - k3) * 6 });
    txt(fx, 'carbon dioxide', { font: F.sb(sizeForWidth(F.sb, 'carbon dioxide', 1040 - 312)), x: 312, y: 1352, fill: '#2e9aa3', alpha: k4 * out, blur: (1 - k4) * 6, shadow: ['rgba(0,0,0,0.35)', 8] });
  }
  // ===== B4b (13.765 → 15.015): top-left stack, caps + outlined scripts =====
  if (T >= CUT.p5 && T < CUT.p6) {
    const sh = ['rgba(0,0,0,0.45)', 10, 0, 3];
    const it = (t, t0, o) => { const k = enter(T, t0, 0.16); txt(fx, t, { ...o, alpha: k, blur: (1 - k) * 7, dy: 8 * (1 - k) }); };
    it('IT’S', WD.its + 0.12, { font: F.xb(sizeForCap(F.xb, 104)), x: 86, y: 363, fill: '#ffffff', shadow: sh });
    it('not', WD.not + 0.12, { font: F.lob(112), x: 92, y: 440, stroke: '#9fd0ff', sw: 3, stroke2: '#2e6fb3', sw2: 1.2, shadow: ['rgba(80,160,255,0.6)', 10] });
    it('IN', WD.in + 0.1, { font: F.xb(sizeForCap(F.xb, 97)), x: 97, y: 557, grad: [[0, '#ffffff'], [1, '#a7a7a7']], shadow: sh });
    it('the', WD.the2 + 0.06, { font: F.lob(112), x: 97, y: 640, stroke: '#e2b98d', sw: 3, stroke2: '#7a5536', sw2: 1.2 });
    it('ATMOSPHERE', WD.atmosphere + 0.08, { font: L.b4b.atm, x: 89, y: 734, grad: [[0, '#ffffff'], [1, '#b3b3b3']], shadow: sh });
  }
  // ===== B5 (15.015 → 19.805): one-word subtitles at the chest, B&W then colour =====
  if (T >= CUT.p6 && T < CUT.end) {
    for (const list of [SUBS_A, SUBS_B]) for (let i = 0; i < list.length - 1; i++) {
      const [w, t0] = list[i], t1 = list[i + 1][1];
      if (T >= t0 && T < t1) { const k = enter(T, t0, 0.06); txt(fx, w, { font: F.l(58), x: 540, y: 1300, align: 'center', fill: 'rgba(255,255,255,0.9)', alpha: k, shadow: ['rgba(0,0,0,0.45)', 6, 0, 1] }); }
    }
  }
  // ===== frame: bottom fall-off to black and the logo bug (ref y 1280 → 1600), then the end card =====
  if (T < 19.82) {
    const g = fx.createLinearGradient(0, 1270, 0, 1600); g.addColorStop(0, 'rgba(3,1,3,0)'); g.addColorStop(0.55, 'rgba(3,1,3,0.78)'); g.addColorStop(1, 'rgba(3,1,3,1)');
    fx.save(); fx.globalCompositeOperation = 'destination-over'; fx.restore();
    // fall-off goes under the text: draw it on a fresh layer below by painting into the behind-front order
    paintUnder(fx, () => { fx.fillStyle = g; fx.fillRect(0, 1270, W, H - 1270); });
    logo(fx, ctx.brand, 540, 1563, 1, 1);
  } else {
    const a = eio(seg(T, 20.07, 20.82)) * (1 - eio(seg(T, 22.17, 22.57)));
    logo(fx, ctx.brand, 540, 1044, 2.61, a);
  }
}
// paint something under what the front canvas already holds
function paintUnder(c, fn) { c.save(); c.globalCompositeOperation = 'destination-over'; fn(); c.restore(); }

const sfxFiles = {
  wshort: 'sfx-style1/woosh-short.wav', wtight: 'sfx-style1/woosh-tight.wav', air: 'sfx/fs.whoosh.swosh-whoosh-air-cut.wav',
  soft: 'sfx/fs.impact.soft-hit.wav', punch: 'sfx/fs.impact.punch2.wav', scratch: 'sfx/kenney-scratch.wav',
};
// sound events placed where the reference's audio shows them (flux peaks and air-band bursts, REF.md "Sound")
const sfx = [
  { t: 0.28, k: 'wshort', gain: 0.22 }, { t: 1.24, k: 'wtight', gain: 0.18 },
  { t: WD.hot + 0.02, k: 'soft', gain: 0.55 }, { t: WD.years + 0.02, k: 'punch', gain: 0.32 },
  { t: CUT.p2 - 0.02, k: 'wtight', gain: 0.25 },
  { t: BURN + 0.02, k: 'air', gain: 0.5 }, { t: BURN + 0.40, k: 'punch', gain: 0.35, rate: 0.7 },
  { t: 8.05, k: 'wshort', gain: 0.3 }, { t: PART + 0.02, k: 'sand', gain: 0.7 }, { t: BAR, k: 'wtight', gain: 0.3 },
  { t: GL, k: 'scratch', gain: 0.4 }, { t: GL + 0.14, k: 'scratch', gain: 0.35, rate: 1.3 }, { t: GL + 0.27, k: 'wshort', gain: 0.4 },
  { t: 19.86, k: 'boom', gain: 0.75 },
];

export const EDIT = {
  duration: 22.85, sfxFiles, sfx, prepare, draw,
  state: T => ({ cam: camera(T), g: look(T), p: post(T) }),
  words: WD, cuts: CUT,
};
