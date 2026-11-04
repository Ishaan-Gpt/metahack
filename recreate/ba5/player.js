// ba5 recreation player: Edita Visuals' "Opus 5.5 + Storyboard" reel (https://www.instagram.com/p/DerbE18txNg/) rebuilt
// 1:1 on a Wikimedia Commons talking head (data/clips/ba5c/SOURCE.md). The page (pills, storyboard card, CTA) is static;
// the edit plays inside the card as its own 1080x1920 frame at half scale. Everything is DOM/CSS/SVG drawn per frame from
// render(t); t is the A-roll's clock. Numbers are the reference's, measured at 1080x1920 (docs/recreate/ba5/wNN/REF.md);
// "inner" numbers are the edit's own frame (card px x 2). URL: ?t=<start> &mute=1 &embed
const Q = new URLSearchParams(location.search);
const W = 1080, H = 1920, DUR = 24;
const $ = id => document.getElementById(id), status = s => ($('status').textContent = s);
window.__ready = false;

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = k => 1 - Math.pow(1 - k, 3), eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, ei = k => k * k * k;
const tab = (rows, t) => { if (t <= rows[0][0]) return rows[0].slice(1); for (let i = 1; i < rows.length; i++) if (t <= rows[i][0]) { const [a, ...va] = rows[i - 1], [b, ...vb] = rows[i], k = (t - a) / (b - a); return va.map((v, j) => lerp(v, vb[j], k)); } return rows.at(-1).slice(1); };

// ---------- stage fit ----------
function fit() { const pad = Q.has('embed') ? 0 : 24, k = Math.min(innerWidth / W, (innerHeight - pad) / H), st = $('stage'); Object.assign(st.style, { transform: `scale(${k})`, transformOrigin: '0 0', left: (innerWidth - W * k) / 2 + 'px', top: (innerHeight - pad - H * k) / 2 + 'px' }); }
addEventListener('resize', fit); fit();

// ---------- DOM ----------
const ST = $('stage');
const mk = (html, parent = ST) => { const d = document.createElement('div'); d.innerHTML = html.trim(); const n = d.firstChild; parent.appendChild(n); return n; };
const css = (n, o) => { for (const k in o) n.style[k] = o[k]; };
const show = (n, on) => { n.style.display = on ? '' : 'none'; };   // display, so a child's own visibility can't leak through

// colours sampled from the reference frames
const C = { ink: '#151515', orange: '#e37f59', handle: '#5d5a56', lime: '#c6ec4b', title: '#1f1f22', paperTop: '#f6f1ea', paperBot: '#e8e5df' };
const LIMEG = 'linear-gradient(180deg,#eef77a 0%,#d6ef5a 45%,#b4d63a 100%)';

// ===== the page =====
// ground: neutral grey, lighter at the top-left and bottom-right corners (251), darker at the other two (230)
mk(`<div class="L" style="width:1080px;height:1920px;background:
  radial-gradient(circle at 0% 0%, rgba(255,255,255,.80) 0, rgba(255,255,255,.45) 520px, rgba(255,255,255,0) 980px),
  radial-gradient(circle at 100% 100%, rgba(255,255,255,.80) 0, rgba(255,255,255,.45) 520px, rgba(255,255,255,0) 980px),
  radial-gradient(60% 40% at 50% 50%, rgba(255,255,255,.30), rgba(255,255,255,0)), #e6e6e6"></div>`);

// the big faint spark behind everything: rounded arms from (560, 860), tips measured on the R-B difference image
const ARMS = [[260, 300], [660, 270], [990, 410], [1010, 820], [1010, 1010], [960, 1300], [500, 1570], [200, 1390], [40, 880], [40, 500]];
mk(`<svg class="L" width="1080" height="1920" style="filter:blur(4px)"><g stroke="rgba(255,236,226,.42)" stroke-width="112" stroke-linecap="round">
  ${ARMS.map(([x, y]) => `<line x1="560" y1="860" x2="${x}" y2="${y}"/>`).join('')}</g></svg>`);

// storyboard card (right side tucks under the edit card)
const sb = mk(`<div class="L" style="left:113px;top:655px;width:294px;height:523px;border-radius:18px;overflow:hidden;
  background:linear-gradient(180deg,${C.paperTop},${C.paperBot});box-shadow:0 18px 44px rgba(90,60,45,.20),0 2px 6px rgba(0,0,0,.08)"></div>`);
const SBI = ['s1', 's2', 's3'].map(n => { const i = new Image(); i.src = `/data/clips/ba5c/sb/${n}.png`; css(i, { position: 'absolute', left: 0, top: 0, width: '294px', height: '523px' }); sb.appendChild(i); return i; });
mk(`<div class="L" style="left:115px;top:572px;width:211px;height:69px;border-radius:35px;overflow:hidden;
  background:radial-gradient(70px 60px at 18px 34px, rgba(200,40,25,.85), rgba(200,40,25,0) 100%),linear-gradient(180deg,#26232a,#141217);
  box-shadow:0 8px 22px rgba(0,0,0,.18)">
  <div style="position:absolute;left:9px;top:25px;width:19px;height:19px;border-radius:50%;background:#eb1301;box-shadow:0 0 10px 3px rgba(255,40,10,.55)"></div>
  <div style="position:absolute;left:49px;top:13px;font:400 34px/40px 'Inter Tight';letter-spacing:-1.3px;color:#fff">Storyboard</div></div>`);

// the edit card: 540x960 at (381, 423); the edit inside is a 1080x1920 frame at 0.5
const card = mk(`<div class="L" style="left:381px;top:423px;width:540px;height:960px;border-radius:26px;overflow:hidden;background:#000;
  box-shadow:0 30px 64px rgba(70,45,35,.30),0 6px 14px rgba(0,0,0,.10)"></div>`);
const IN = mk(`<div style="position:absolute;left:0;top:0;width:1080px;height:1920px;transform:scale(.5);transform-origin:0 0;overflow:hidden"></div>`, card);

// "Opus 5.5" pill with the orange spark
const sparkIcon = (r, col) => { const rays = [0, 28, 61, 90, 118, 152, 180, 206, 238, 270, 300, 331], len = [1, .82, .95, .78, 1, .86, .97, .8, .92, .84, 1, .8];
  return `<g stroke="${col}" stroke-width="${r * .17}" stroke-linecap="round">${rays.map((a, i) => { const q = a * Math.PI / 180, l = r * len[i]; return `<line x1="${(Math.cos(q) * r * .12).toFixed(1)}" y1="${(Math.sin(q) * r * .12).toFixed(1)}" x2="${(Math.cos(q) * l).toFixed(1)}" y2="${(Math.sin(q) * l).toFixed(1)}"/>`; }).join('')}</g>`; };
mk(`<div class="L" style="left:390px;top:287px;width:310px;height:118px;border-radius:59px;overflow:hidden;
  background:radial-gradient(150px 130px at 62px 59px, rgba(170,105,80,.62), rgba(170,105,80,0) 100%),linear-gradient(180deg,#2c2a2f 0%,#17151a 60%,#121015 100%);
  box-shadow:0 10px 26px rgba(0,0,0,.20)">
  <svg style="position:absolute;left:24px;top:21px" width="76" height="76"><g transform="translate(38 38)" style="filter:drop-shadow(0 0 6px rgba(240,120,70,.6))">${sparkIcon(37, '#ec7a4c')}</g></svg>
  <div style="position:absolute;left:123px;top:28px;font:300 42px/60px 'Inter Tight';letter-spacing:-2.2px;color:#fff">Opus 5.5</div></div>`);

// handle and call to action
mk(`<div class="L" style="left:717px;top:113px;font:600 34px/40px Poppins;letter-spacing:-.4px;color:${C.handle}">@metahack.edit</div>`);
mk(`<div class="L" style="left:0;top:1424px;width:1080px;text-align:center;font:500 62px/76px 'Inter Tight';letter-spacing:-3.4px;color:${C.ink}">
  Follow &amp; comment <span style="color:${C.orange};font-weight:600">“CLAUDE”</span><br>for the full guide</div>`);

// ===== the edit (inner frame) =====
const ground = mk(`<div class="L" style="width:1080px;height:1920px;background:linear-gradient(180deg,#e8ecf6 0%,#f0f2f8 45%,#f6f7fb 100%)"></div>`, IN);

// lime card (sits under the A-roll box until the box becomes it)
const lime = mk(`<div class="L" style="background:${C.lime};overflow:hidden">
  <svg width="1000" height="1000" style="position:absolute;left:0;top:0;opacity:.45"><g fill="none" stroke="#fff" stroke-width="2">
  ${[140, 260, 380, 500].map(r => `<polygon points="${[0, 60, 120, 180, 240, 300].map(a => `${(560 + r * Math.cos(a * Math.PI / 180)).toFixed(0)},${(520 + r * Math.sin(a * Math.PI / 180)).toFixed(0)}`).join(' ')}"/>`).join('')}</g></svg></div>`, IN);

// A-roll box: position, size and radius animate; it holds the video and the captions so they shrink together
const box = mk(`<div class="L" style="overflow:hidden;width:1080px;height:1920px"></div>`, IN);
const content = mk(`<div class="L" style="width:1080px;height:1920px;transform-origin:0 0"></div>`, box);
const video = document.createElement('video');
Object.assign(video, { id: 'v', src: '/data/clips/ba5c/aroll.mp4', preload: 'auto', playsInline: true, crossOrigin: 'anonymous' });
video.muted = Q.has('mute');
css(video, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', transformOrigin: '0 0', filter: 'contrast(1.05) saturate(.68) brightness(1.03) hue-rotate(-8deg)'   // cooler, greyer wall (ref: neutral grey) });
content.appendChild(video);
const tint = mk(`<div class="L" style="width:1080px;height:1920px;background:#c4ec46;mix-blend-mode:multiply;opacity:0"></div>`, content);

// captions: helper = thin grotesk caps, hero = condensed bold italic serif in lime
const capLayer = mk(`<div class="L" style="width:1080px;height:1920px"></div>`, content);
const SHADOW = 'text-shadow:0 2px 10px rgba(0,0,0,.30)';
function line(words, { top, size, hero = false, cx = 540 }) {
  const n = mk(`<div class="L" style="left:0;top:${top}px;width:1080px;text-align:center;white-space:nowrap"></div>`, capLayer);
  const inner = mk(`<div style="display:inline-block;transform-origin:50% 60%"></div>`, n);
  const spans = words.map((w, i) => {
    const s = document.createElement('span');
    s.textContent = w + (i < words.length - 1 ? ' ' : '');
    s.style.cssText = hero
      ? `font:850 ${size}px/1 'Playfair Italic';font-style:italic;letter-spacing:-.035em;background:${LIMEG};-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block;white-space:pre`
      : `font:300 ${size}px/1 'Inter Tight';letter-spacing:-.045em;color:#fff;${SHADOW};display:inline-block;white-space:pre`;
    inner.appendChild(s); return s;
  });
  if (hero) css(inner, { filter: 'drop-shadow(0 0 14px rgba(200,240,70,.35)) drop-shadow(0 3px 5px rgba(0,0,0,.35))', transform: 'scaleX(.86)' });
  n.style.left = (cx - 540) + 'px';
  return { n, inner, spans };
}
// beat 1 (ref "I THINK THE MOST / POWERFUL")
const b1a = line(['IN', 'AL-HASEKE'], { top: 1166, size: 60 });
const b1b = line(['GOVERNORATE'], { top: 1214, size: 105, hero: true });
// beat 2 (ref "BUSINESS TOOL" + underline)
const b2 = line(['OF', 'SYRIA'], { top: 1170, size: 96, hero: true, cx: 550 });
const ul = mk(`<div class="L" style="height:6px;background:#c9ea4a;box-shadow:0 0 8px rgba(200,240,70,.5)"></div>`, capLayer);
// beat 3 (ref "THAT YOU HAVE TODAY")
const b3 = line(['THERE', 'IS', 'A'], { top: 1196, size: 60 });
// beat 4 (ref "NOT ONLY FOR / MARKETING PURPOSES")
const b4a = line(['THAT', 'ARE'], { top: 1150, size: 60 });
const b4b = line(['INDIGENOUS'], { top: 1196, size: 84, hero: true });

// the title card pieces (ref "Social media.")
const star = mk(`<svg class="L" width="260" height="260" viewBox="-130 -130 260 260" style="overflow:visible">
  <defs><radialGradient id="sg" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#f4ff9a"/><stop offset=".55" stop-color="#cdf04a"/><stop offset="1" stop-color="#9fd424"/></radialGradient>
  <filter id="sgl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <path filter="url(#sgl)" fill="url(#sg)" d="M0,-120 C10,-30 30,-10 110,0 C30,10 10,30 0,120 C-10,30 -30,10 -110,0 C-30,-10 -10,-30 0,-120Z"/></svg>`, IN);
const title = mk(`<div class="L" style="left:104px;top:150px;font:700 166px/170px 'Inter Tight';letter-spacing:-.045em;color:${C.title}">
  <div id="tl1"></div><div id="tl2"></div></div>`, IN);
const TL = ['Christian', 'community.'], tl = [title.querySelector('#tl1'), title.querySelector('#tl2')];
const small = mk(`<div class="L" style="left:0;top:668px;width:976px;text-align:right;font:400 22px/26px Inter;color:#2b2b30">
  Assyrians.<br>Syriac.<br>Christian.<br>Indigenous to the region<br>of Al-Haseke, Syria.</div>`, IN);

// the phone: black body, dark screen, a 3x3 grid of community apps (generic icons drawn here, no brand marks)
const APPS = [
  ['Chat', 'linear-gradient(160deg,#5ef08a,#18b84c)', '<path d="M14 18h44a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H32l-12 10v-10h-6a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8z" fill="#fff"/>', 15],
  ['Members', 'linear-gradient(160deg,#5fb6ff,#1f6fe0)', '<circle cx="28" cy="30" r="10" fill="#fff"/><circle cx="50" cy="30" r="10" fill="#fff" opacity=".8"/><path d="M12 62c2-12 10-18 16-18s14 6 16 18zM36 62c2-12 8-18 14-18s12 6 14 18z" fill="#fff"/>', 0],
  ['Church', 'linear-gradient(160deg,#c48bff,#7a3ff0)', '<path d="M36 10v16M28 18h16M18 64V40l18-12 18 12v24z" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/>', 0],
  ['Events', 'linear-gradient(160deg,#ff8a6a,#f0453a)', '<rect x="14" y="18" width="44" height="42" rx="7" fill="#fff"/><rect x="14" y="18" width="44" height="12" rx="6" fill="#ffd3c8"/><text x="36" y="54" font-size="22" font-weight="700" text-anchor="middle" fill="#f0453a" font-family="Inter">20</text>', 20],
  ['Gallery', 'linear-gradient(160deg,#ffd36a,#ff6aa2 60%,#9b5cff)', '<rect x="13" y="16" width="46" height="40" rx="8" stroke="#fff" stroke-width="5" fill="none"/><path d="M17 52l13-14 10 10 6-6 10 10" stroke="#fff" stroke-width="5" fill="none"/><circle cx="46" cy="28" r="5" fill="#fff"/>', 0],
  ['Map', 'linear-gradient(160deg,#7fd8ff,#2a9df4)', '<path d="M36 64s-18-18-18-32a18 18 0 0 1 36 0c0 14-18 32-18 32z" fill="#fff"/><circle cx="36" cy="32" r="7" fill="#2a9df4"/>', 2],
  ['News', 'linear-gradient(160deg,#4f8dff,#1d4fd6)', '<rect x="14" y="16" width="44" height="42" rx="6" fill="#fff"/><path d="M22 28h28M22 37h28M22 46h18" stroke="#1d4fd6" stroke-width="4"/>', 1],
  ['Calls', 'linear-gradient(160deg,#6df07e,#1fb543)', '<path d="M24 14l8 14-6 6c3 7 9 13 16 16l6-6 14 8-4 12c-24 0-46-22-46-46z" fill="#fff"/>', 0],
  ['Syriac', 'linear-gradient(160deg,#ffe08a,#e8a92b)', '<text x="36" y="50" font-size="34" font-weight="700" text-anchor="middle" fill="#fff" font-family="Inter">ܐ</text>', 0],
];
const phoneClip = mk(`<div class="L" style="width:1080px;height:1824px;overflow:hidden;perspective:2200px"></div>`, IN);
const phone = mk(`<div style="position:absolute;left:0;top:0;width:600px;height:1290px;border-radius:104px;transform-origin:50% 50%;
  background:linear-gradient(90deg,#3a3a3e 0%,#0c0c0e 3%,#0a0a0c 97%,#2c2c30 100%);box-shadow:0 40px 80px rgba(0,0,0,.35);transform-style:preserve-3d">
  <div style="position:absolute;left:16px;top:16px;right:16px;bottom:16px;border-radius:90px;overflow:hidden;
    background:radial-gradient(220px 160px at 30% 6%, rgba(90,60,255,.65), rgba(0,0,0,0)),radial-gradient(200px 140px at 82% 4%, rgba(255,110,190,.5), rgba(0,0,0,0)),radial-gradient(260px 200px at 60% 100%, rgba(120,70,255,.45), rgba(0,0,0,0)),linear-gradient(180deg,#0b0d1a,#06070c)">
    <div style="position:absolute;left:220px;top:22px;width:128px;height:36px;border-radius:18px;background:#000"></div>
    ${APPS.map(([name, bg, g, badge], i) => { const c = i % 3, r = (i / 3) | 0, x = 66 + c * 166, y = 330 + r * 250;
      return `<div style="position:absolute;left:${x}px;top:${y}px;width:118px;text-align:center">
        <div style="width:118px;height:118px;border-radius:30px;background:${bg};position:relative;box-shadow:0 6px 16px rgba(0,0,0,.4)">
          <svg width="118" height="118" viewBox="0 0 72 72">${g}</svg>
          ${badge ? `<div style="position:absolute;right:-12px;top:-12px;min-width:44px;height:44px;border-radius:22px;background:#f2392f;color:#fff;font:600 25px/44px Inter;padding:0 8px">${badge}</div>` : ''}</div>
        <div style="margin-top:12px;font:500 25px/1 Inter;color:#fff;white-space:nowrap"><span style="color:#5ac8fa">• </span>${name}</div></div>`; }).join('')}
  </div></div>`, phoneClip);

// ---------- camera ----------
// reference camera (REF.md): t, face width, centre x, centre y (inner px)
const REFCAM = [[0, 742, 533, 659], [.067, 684, 538, 680], [.133, 650, 539, 683], [.2, 630, 537, 689], [.267, 616, 540, 698], [.333, 604, 544, 700], [.467, 592, 550, 714], [.6, 576, 556, 722], [.8, 552, 558, 730], [1.07, 540, 554, 722], [1.33, 532, 554, 726], [1.53, 520, 557, 719], [1.8, 530, 553, 731], [2.0, 532, 554, 730], [2.13, 532, 560, 744]];
let FACE = null;   // our face track (data/clips/ba5c/face.json, 10 fps, smoothed)
function cam(t) {
  // zoom follows the reference's face width (x1.2: our raw is framed tighter), the face is held on the reference's face
  // position (minus 145 px: our raw has no headroom above her), then clamped so the video always covers the frame.
  // Same function as sketch.py cam().
  let k, fx, fy;
  if (t < 3.8) { const [w, x, y] = tab(REFCAM, t); k = 1.2 * w / 525; fx = x; fy = y - 145; } else { k = 1.15; fx = 600; fy = 670 - 145; }
  const i = Math.min(FACE.x.length - 1, Math.round(t / FACE.dt)), ux = FACE.x[i], uy = FACE.y[i];
  const tx = clamp(fx - ux * k, W - W * k, 0), ty = clamp(fy - uy * k, H - H * k, 0);
  return [k, tx, ty];
}

// ---------- caption helpers ----------
const blurIn = (n, t, t0, dur = .1, from = .0, blur = 6) => { const k = seg(t, t0, t0 + dur); css(n, { opacity: lerp(from, 1, k), filter: k < 1 ? `blur(${(1 - k) * blur}px)` : 'none' }); };
const words = (L, t, times, from = 0) => L.spans.forEach((s, i) => { s.style.visibility = t >= times[i] ? 'visible' : 'hidden'; blurIn(s, t, times[i], .1, from, 4); });

// ---------- render ----------
function rect(n, x, y, w, h, r) { css(n, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: r + 'px' }); }
function render(t) {
  // storyboard: the sketch of the current shot; swaps on the hard cuts (ref 1.90, 3.80)
  SBI.forEach((im, i) => show(im, i === (t < 1.9 ? 0 : t < 3.8 ? 1 : 2)));

  // A-roll box: full frame, then (2.13-2.40) slides down and shrinks into the rounded inset, tints lime (2.367-2.433),
  // and becomes the solid lime card (2.43-2.53) which settles (to 2.8); back to full frame on the 3.80 cut
  const inCard = t >= 2.13 && t < 3.8;
  let bx = 0, by = 0, bw = 1080, bh = 1920, br = 0;
  if (inCard) {
    const k1 = eio(seg(t, 2.13, 2.40));
    bx = lerp(0, 30, k1); by = lerp(0, 470, k1); bw = lerp(1080, 1024, k1); bh = lerp(1920, 1400, k1); br = lerp(0, 40, k1);
    if (t > 2.40) { const [x, y, w, h] = tab([[2.40, 30, 470, 1024, 1400], [2.5, 54, 842, 972, 978], [2.8, 60, 870, 964, 954]], t); bx = x; by = y; bw = w; bh = h; br = 52; }
  }
  rect(box, bx, by, bw, bh, br);
  rect(lime, bx, by, bw, bh, br);
  show(lime, inCard && t >= 2.40);
  const fadeAR = inCard ? 1 - seg(t, 2.43, 2.53) : 1;
  content.style.opacity = fadeAR; show(box, fadeAR > 0);
  const ck = inCard ? eio(seg(t, 2.13, 2.40)) : 0;
  content.style.transform = `translate(0px,${-120 * ck}px) scale(${lerp(1, .95, ck)})`;
  const tk = inCard ? .92 * seg(t, 2.367, 2.433) : 0; tint.style.opacity = tk; show(tint, tk > 0);
  box.style.boxShadow = inCard ? '0 20px 50px rgba(60,70,110,.18)' : 'none';
  ground.style.visibility = inCard ? 'visible' : 'hidden';

  // camera on the footage
  const [k, tx, ty] = cam(t);
  video.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;

  // beat 1: helper builds word by word (0.233, 0.33) and rises; hero scales down into place (0.50-0.567)
  const on1 = t >= .233 && t < 1.033; show(b1a.n, on1); show(b1b.n, on1 && t >= .5);
  if (on1) {
    const top = t < .25 ? 1216 : 1166 + 50 * Math.exp(-(t - .25) / .3);
    b1a.n.style.top = top + 'px'; b1b.n.style.top = (top + 54) + 'px';
    words(b1a, t, [.233, .33], 0);
    const kh = seg(t, .5, .567);
    css(b1b.inner, { transform: `scaleX(.86) scale(${lerp(1.08, 1, eo(kh))})`, opacity: seg(t, .5, .533) });
  }
  // beat 2: "OF" scales in (1.033-1.167), "SYRIA" (1.30-1.40); underline draws with it, retracts left→right (1.767-1.93)
  const on2 = t >= 1.033 && t < 1.767; show(b2.n, on2);
  if (on2) {
    b2.spans.forEach((s, i) => { const t0 = [1.033, 1.30][i]; s.style.visibility = t >= t0 ? 'visible' : 'hidden'; css(s, { opacity: seg(t, t0, t0 + .05), transform: `scale(${lerp(1.12, 1, eo(seg(t, t0, t0 + .13)))})` }); });
  }
  const onU = t >= 1.30 && t < 1.93; show(ul, onU);
  if (onU) {
    const r = b2.inner.getBoundingClientRect(), base = card.getBoundingClientRect(), sc = base.width / 540 * .5;  // screen px → inner px
    const L0 = (r.left - base.left) / sc, R0 = (r.right - base.left) / sc, a = L0 + .26 * (R0 - L0), b = R0 - 6;
    const grow = eo(seg(t, 1.30, 1.42)), cut = ei(seg(t, 1.767, 1.93));
    css(ul, { left: lerp(a, b, cut) + 'px', width: Math.max(0, lerp(a, b, grow) - lerp(a, b, cut)) + 'px', top: '1266px' });
  }
  // beat 3: helper word by word, each from 40% (1.833, 1.93, 2.0); rides the box down
  const on3 = t >= 1.833 && t < 2.53; show(b3.n, on3);
  if (on3) words(b3, t, [1.833, 1.93, 2.0], .4);

  // title card: star in at 2.47 and travels to the right of the title; title types (2.78-2.86) / blurs in (2.95-3.15),
  // deletes letter by letter (3.47-3.67); small text with the lime card; phone rises (2.58-3.47)
  const onT = t >= 2.45 && t < 3.8;
  [star, title, small, phoneClip].forEach(n => show(n, onT));
  if (onT) {
    const [sx, sy, ss] = tab([[2.47, 120, 340, 0], [2.52, 120, 340, .9], [2.67, 440, 360, 1], [2.83, 760, 350, 1], [3.8, 772, 346, 1]], t);
    css(star, { transform: `translate(${sx - 130}px,${sy - 130}px) scale(${ss}) rotate(${lerp(-20, 0, seg(t, 2.47, 2.83))}deg)` });
    const del = seg(t, 3.47, 3.67);
    const n1 = t < 2.78 ? 0 : Math.round(lerp(0, TL[0].length, seg(t, 2.78, 2.86))), keep1 = Math.round(lerp(TL[0].length, 3, del));
    tl[0].textContent = TL[0].slice(0, Math.min(n1, keep1));
    tl[1].textContent = t < 2.95 ? '' : TL[1].slice(0, Math.round(lerp(TL[1].length, 3, del)));
    const kb = seg(t, 2.95, 3.15); css(tl[1], { opacity: kb, filter: kb < 1 ? `blur(${(1 - kb) * 14}px)` : 'none' });
    small.style.opacity = seg(t, 2.45, 2.55);
    const kp = eo(seg(t, 2.58, 3.47));
    css(phone, { transform: `translate(${lerp(120, 70, kp)}px,${lerp(1900, 640, kp)}px) rotateZ(${lerp(-8, -16, kp)}deg) rotateY(${lerp(10, 20, kp)}deg)` });
  }

  // beat 4 after the cut: helper word by word (3.833, 4.0), hero flickers on (4.40 on, 4.433 off, 4.467 on, 4.50 off, 4.533 on)
  const on4 = t >= 3.833 && t < 5.0; show(b4a.n, on4);
  if (on4) words(b4a, t, [3.833, 4.0], 0);
  const fl = t >= 4.533 || (t >= 4.40 && t < 4.433) || (t >= 4.467 && t < 4.50);
  show(b4b.n, on4 && fl);
  $('bar').firstChild.style.width = (100 * t / DUR) + '%';
}

// ---------- load + play ----------
status('Loading fonts…');
await Promise.all([`300 60px 'Inter Tight'`, `700 60px 'Inter Tight'`, `500 60px 'Inter Tight'`, `400 22px Inter`, `italic 750 60px 'Playfair Italic'`, `600 30px Poppins`].map(f => document.fonts.load(f)));
FACE = await (await fetch('/data/clips/ba5c/face.json')).json();
status('Loading the footage…');
await Promise.all(SBI.map(i => i.decode().catch(() => {})));
await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('aroll.mp4 failed')); video.load(); });
try { const b = await (await fetch(video.src)).blob(); const u = URL.createObjectURL(b); video.src = u; await new Promise(ok => { video.oncanplaythrough = ok; video.load(); }); } catch {}
let playing = false;
const T = () => video.currentTime;
window.__T = T;
window.__seek = async t => { video.pause(); playing = false; const to = Math.min(t, DUR - .01); if (Math.abs(video.currentTime - to) > 1e-3) { const s = new Promise(ok => { video.onseeked = ok; setTimeout(ok, 3000); }); video.currentTime = to; await s; } render(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); };
const start = +(Q.get('t') || 0);
video.currentTime = start; render(start);
$('gate').classList.add('ready'); status(Q.has('mute') ? 'Ready (muted)' : 'Play');
$('gate').onclick = () => window.__play();
video.onended = () => { playing = false; };
$('bar').onclick = e => { const k = e.clientX / innerWidth; video.currentTime = k * DUR; render(k * DUR); };
const raf = () => { if (playing) { render(Math.min(T(), DUR)); requestAnimationFrame(raf); } };
addEventListener('keydown', e => { if (e.code === 'Space') { if (playing) { video.pause(); playing = false; } else { $('gate').style.display = 'none'; playing = true; video.play(); requestAnimationFrame(raf); } } });
window.__play = () => { $('gate').style.display = 'none'; playing = true; video.play(); requestAnimationFrame(raf); };
window.__mute = m => { video.muted = m; };
if (Q.has('embed')) { $('bar').style.display = 'none'; $('gate').style.display = 'none'; }
window.__ready = true;
