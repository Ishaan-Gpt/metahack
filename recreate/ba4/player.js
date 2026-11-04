// ba4 recreation player: Mahdi's interview edit (refs/edit-ba4), rebuilt 1:1 on a Wikimedia Commons interview
// (Bernie Burns, TSTV, CC BY 3.0). Layers per frame: footage (packed master | matte) through the measured camera and
// grade (WebGL) → money behind the subject (matte) → front canvas (captions, the desk world, the bulb) → post (blur,
// light leak). URL: ?t=<start s> &mute=1 &grab=1 &embed=1
import { DURATION, SHOTS, shotAt, camAt, GRADE, CAPS, LEAK, MONEY } from './edit.js';

const Q = new URLSearchParams(location.search);
const W = 1080, H = 1920, PW = 1620;           // out; packed video: master 1080x1920 | matte 540x960 (top right)
const CLIP = '/data/clips/ba4c/';
const $ = id => document.getElementById(id), status = s => ($('status').textContent = s);
window.__ready = false;
function fit() { const k = Math.min(innerWidth / W, (innerHeight - (Q.has('embed') ? 0 : 24)) / H); const s = $('stage'); s.style.transform = `scale(${k})`; s.parentElement.style.width = W * k + 'px'; s.parentElement.style.height = H * k + 'px'; }
addEventListener('resize', fit); fit();

// ---------- load everything behind the gate ----------
status('Loading fonts…');
const FONTS = [['Abril', '/recreate/ba4/fonts/AbrilFatface-Regular.ttf', '400'], ['Playfair', '/recreate/ba4/fonts/PlayfairDisplay-var.ttf', '400 900'],
  ['OpenSans', '/recreate/ba4/fonts/OpenSans-var.ttf', '300 800'], ['Kalam', '/assets/fonts/Kalam-Regular.ttf', '400']];
await Promise.all(FONTS.map(async ([f, u, w]) => document.fonts.add(await new FontFace(f, `url(${u})`, { weight: w, stretch: f === 'OpenSans' ? '75% 100%' : 'normal' }).load())));
status('Loading the desk…');
const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(src)); i.src = src; });
const CUT = '/assets/world/cut/', IM = {};
await Promise.all(Object.entries({ bulb: CUT + 'bulb-on.png', cup: CUT + 'cup.png', leafA: CUT + 'leaf-a.png', leafB: CUT + 'leaf-b.png', pencil: CUT + 'pencil.png', a4: CUT + 'a4.png',
  tex: '/assets/world/tex/beige_wall_001_diff.jpg', brain: CLIP + 'props/brain_0_25.png' }).map(async ([k, u]) => { IM[k] = await img(u); }));
status('Loading the footage…');
const video = Object.assign(document.createElement('video'), { src: CLIP + 'pack.mp4', preload: 'auto', muted: true, playsInline: true, crossOrigin: 'anonymous' });
await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('pack.mp4 failed')); video.load(); });
const VDUR = video.duration;
status('Loading the sound…');
const AC = new AudioContext(), BUF = {};
const loadBuf = async (k, url) => { BUF[k] = await AC.decodeAudioData(await (await fetch(url)).arrayBuffer()); };
await Promise.all([loadBuf('voice', CLIP + 'voice.m4a'), loadBuf('bed', '/assets/music/bed.mp3')]);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, u) => a + (b - a) * u, win = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = u => 1 - (1 - u) ** 3, eio = u => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2, eob = u => { const c = 1.6; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
const mk2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- prebuilt desk pieces ----------
const LIT = [238, 227, 211], SHADE = [192, 179, 158];   // ref desk p90 (237,225,208), p50 (208,195,175) at 8.0 s
function ground(seed, ang) {             // beige desk 1400x2300 with soft window-light (gobo) shadows
  const [c, x] = mk2d(1400, 2300);
  x.fillStyle = `rgb(${SHADE})`; x.fillRect(0, 0, 1400, 2300);
  const [l, lx] = mk2d(1400, 2300);
  lx.translate(700, 1150); lx.rotate(ang); lx.fillStyle = `rgb(${LIT})`;
  for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) lx.fillRect(i * 560 - 250 + seed * 120, j * 640 - 300, 500, 570);   // panes; mullions are the gaps
  lx.setTransform(1, 0, 0, 1, 0, 0);
  x.filter = 'blur(38px)'; x.drawImage(l, 0, 0); x.filter = 'none';
  const g = x.createRadialGradient(500, 700, 100, 700, 1150, 1500); g.addColorStop(0, 'rgba(255,248,236,0.18)'); g.addColorStop(1, 'rgba(90,70,50,0.18)');
  x.fillStyle = g; x.fillRect(0, 0, 1400, 2300);
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = .32;
  for (let yy = 0; yy < 2300; yy += 700) for (let xx = 0; xx < 1400; xx += 700) x.drawImage(IM.tex, xx, yy, 700, 700);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  return c;
}
const G1 = ground(0, -0.42), G2 = ground(1, -0.30);
const BULB = (() => {                    // the CC0 bulb scan, glass tinted to the reference's lit yellow (#F6D846), screw kept
  const b = IM.bulb, [c, x] = mk2d(b.width, b.height);
  x.drawImage(b, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  const g = x.createLinearGradient(0, 0, 0, b.height); g.addColorStop(0, 'rgba(250,214,40,1)'); g.addColorStop(0.68, 'rgba(250,214,40,1)'); g.addColorStop(0.73, 'rgba(250,214,40,0)');
  x.globalCompositeOperation = 'multiply'; x.fillStyle = g; x.fillRect(0, 0, b.width, b.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(b, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  const h = x.createRadialGradient(b.width * .38, b.height * .22, 10, b.width * .45, b.height * .3, b.width * .55); h.addColorStop(0, 'rgba(255,255,230,0.75)'); h.addColorStop(1, 'rgba(255,240,150,0)');
  x.fillStyle = h; x.fillRect(0, 0, b.width, b.height * .7);
  // filament: two supports and a coil, thin warm-white lines (seen through the glass in the reference)
  x.strokeStyle = 'rgba(255,250,225,0.85)'; x.lineWidth = 3; x.lineCap = 'round';
  const cx = b.width / 2, top = b.height * .30, bot = b.height * .66;
  x.beginPath(); x.moveTo(cx - 34, bot); x.lineTo(cx - 40, top + 40); x.moveTo(cx + 34, bot); x.lineTo(cx + 40, top + 40);
  x.moveTo(cx - 40, top + 40); for (let i = 0; i <= 16; i++) x.lineTo(cx - 40 + i * 5, top + 40 + (i % 2 ? -10 : 8)); x.stroke();
  x.beginPath(); x.moveTo(cx - 14, bot); x.lineTo(cx - 10, top + 120); x.lineTo(cx + 10, top + 120); x.lineTo(cx + 14, bot); x.stroke();
  return c;
})();
const CUP = (() => { const b = IM.cup, [c, x] = mk2d(b.width, b.height); x.drawImage(b, 0, 0);
  const cx = b.width * .5, cy = b.height * .585, r = b.width * .36, g = x.createRadialGradient(cx - r * .2, cy - r * .3, r * .1, cx, cy, r);
  g.addColorStop(0, '#3a2414'); g.addColorStop(.85, '#1c0f07'); g.addColorStop(1, '#2a180c');
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, r, r * .985, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,240,220,0.35)'; x.beginPath(); x.ellipse(cx - r * .45, cy - r * .5, r * .12, r * .05, -.6, 0, 7); x.fill(); return c; })();
function paperNote(w, h, lines, doodle) {  // an off-white paper note with handwriting (Kalam), or a bulb doodle
  const [c, x] = mk2d(w, h); x.fillStyle = '#EEECE7'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = .35; x.drawImage(IM.tex, 0, 0, w * 1.4, h * 1.4); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
  x.fillStyle = '#2B2622'; x.strokeStyle = '#2B2622'; x.lineCap = 'round'; x.lineJoin = 'round';
  if (lines) { x.font = `400 ${h * .13}px Kalam`; lines.forEach((s, i) => x.fillText(s, w * .14, h * (.26 + i * .19))); }
  if (doodle) { x.lineWidth = w * .028; x.beginPath(); x.arc(w * .5, h * .42, w * .17, Math.PI * .85, Math.PI * 2.15); x.lineTo(w * .58, h * .7); x.lineTo(w * .42, h * .7); x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(w * .43, h * .78); x.lineTo(w * .57, h * .78); for (const a of [-2.4, -1.57, -.75]) { x.moveTo(w * .5 + Math.cos(a) * w * .25, h * .42 + Math.sin(a) * w * .25); x.lineTo(w * .5 + Math.cos(a) * w * .32, h * .42 + Math.sin(a) * w * .32); } x.stroke(); }
  return c;
}
const NOTE1 = paperNote(330, 360, ['✓ concept', '✓ story', '✓ style', '✓ ...']), NOTE2 = paperNote(200, 200, null, true);
const STACK = (() => {                   // storyboard sheets: three papers, sketch of a player + text lines + four X frames, binder clip
  const w = 560, h = 470, [c, x] = mk2d(w + 80, h + 120); x.translate(40, 70);
  x.shadowColor = 'rgba(70,55,40,0.28)'; x.shadowBlur = 10; x.shadowOffsetY = 4;
  for (const [dx, dy, r] of [[14, 22, .04], [-8, 12, -.035], [0, 0, 0]]) { x.save(); x.translate(w / 2 + dx, h / 2 + dy); x.rotate(r); x.fillStyle = '#F2F0EB'; x.fillRect(-w / 2, -h / 2, w, h);
    x.globalAlpha = .25; x.globalCompositeOperation = 'multiply'; x.drawImage(IM.tex, -w / 2, -h / 2, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.restore(); }
  x.shadowColor = 'transparent'; x.strokeStyle = '#3A3430'; x.lineWidth = 4; x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeRect(80, 90, 200, 130); x.beginPath(); x.moveTo(165, 128); x.lineTo(165, 182); x.lineTo(205, 155); x.closePath(); x.stroke();
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(320, 105 + i * 30); x.lineTo(480 - (i % 2) * 40, 105 + i * 30); x.stroke(); }
  for (let i = 0; i < 4; i++) { const bx = 80 + i * 100; x.strokeRect(bx, 270, 82, 82); x.beginPath(); x.moveTo(bx + 10, 280); x.lineTo(bx + 72, 342); x.moveTo(bx + 72, 280); x.lineTo(bx + 10, 342); x.stroke(); }
  // binder clip (black steel, two wire handles)
  x.fillStyle = '#1E1C1B'; x.fillRect(w / 2 - 34, -10, 68, 34); x.strokeStyle = '#4A4744'; x.lineWidth = 5; x.beginPath(); x.moveTo(w / 2 - 22, -8); x.lineTo(w / 2 - 14, -58); x.lineTo(w / 2 + 14, -58); x.lineTo(w / 2 + 22, -8); x.stroke();
  return c; })();
const CARD = (() => {                    // the video card: white device frame, black screen, play triangle, progress bar; wood edge behind
  const w = 520, h = 330, [c, x] = mk2d(w + 60, h + 60); x.translate(30, 30);
  x.fillStyle = '#D9B57A'; x.fillRect(w - 40, 20, 46, h - 30);
  x.shadowColor = 'rgba(60,45,30,0.3)'; x.shadowBlur = 14; x.shadowOffsetY = 6; x.fillStyle = '#F4F3F0'; rr(x, 0, 0, w - 10, h, 22); x.fill(); x.shadowColor = 'transparent';
  x.fillStyle = '#121212'; rr(x, 24, 26, w - 58, h - 70, 10); x.fill();
  x.fillStyle = '#F4F4F2'; x.beginPath(); x.moveTo(w / 2 - 30, h / 2 - 40); x.lineTo(w / 2 - 30, h / 2 + 22); x.lineTo(w / 2 + 22, h / 2 - 9); x.closePath(); x.fill();
  x.fillStyle = '#9A9A98'; x.fillRect(40, h - 64, w - 92, 5); x.fillStyle = '#F4F4F2'; x.fillRect(40, h - 64, (w - 92) * .38, 5);
  x.strokeStyle = '#2F2C2A'; x.lineWidth = 3; x.strokeRect(36, -6, 34, 10); return c; })();
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }

// ---------- WebGL compositor ----------
const out = $('out'), gl = out.getContext('webgl2', { preserveDrawingBuffer: Q.has('grab'), premultipliedAlpha: false, antialias: false });
const [CB, bx] = mk2d(W, H), [CF, fx] = mk2d(W, H);
const VS = `#version 300 es
in vec2 a; out vec2 uv; void main(){ uv = a*0.5+0.5; gl_Position = vec4(a,0,1); }`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tVid, tB, tF, tLut;
uniform vec4 uCam;      // s, tx, ty, rot(rad)
uniform float uBlur, uFront, uLeak, uLeakRise, uMatte; uniform vec4 uLk;
uniform float uFall[7]; uniform float uFallY[7];
vec2 toRaw(vec2 p){ vec2 d = (p - uCam.yz)/uCam.x; float c = cos(-uCam.w), s = sin(-uCam.w); return vec2(c*d.x - s*d.y, s*d.x + c*d.y); }
vec3 foot(vec2 q){ q = clamp(q, vec2(0.5), vec2(1079.5, 1919.5)); return texture(tVid, vec2(q.x/1620., q.y/1920.)).rgb; }
float matte(vec2 q){ if(q.x<0.||q.y<0.||q.x>1080.||q.y>1920.) return 0.; return texture(tVid, vec2((1080.+q.x*0.5)/1620., q.y*0.5/1920.)).r; }
vec3 grade(vec3 c){ return vec3(texture(tLut, vec2(c.r,0.5)).r, texture(tLut, vec2(c.g,0.5)).g, texture(tLut, vec2(c.b,0.5)).b); }
float fall(float y){ for(int i=0;i<6;i++){ if(y < uFallY[i+1]) return mix(uFall[i], uFall[i+1], (y-uFallY[i])/(uFallY[i+1]-uFallY[i])); } return uFall[6]; }
void main(){
  vec2 p = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec2 q = toRaw(p);
  vec3 v = foot(q);
  if(uBlur > 0.3){ vec3 acc = v; float n = 1.;
    for(int i=0;i<24;i++){ float a = float(i)*2.39996; float r = uBlur*sqrt((float(i)+.5)/24.); acc += foot(q + vec2(cos(a),sin(a))*r/uCam.x); n += 1.; } v = acc/n; }
  vec3 col = pow(grade(v), vec3(1.18, 1.10, 1.10)) * fall(p.y);   // LUT + a measured trim (bg 114,136,120 → ref 93,127,111)
  vec4 b = texture(tB, vec2(uv.x, 1.-uv.y));
  if(b.a > 0.){ float m = uMatte > 0. ? smoothstep(0.35, 0.65, matte(q)) : 0.; col = mix(col, b.rgb/max(b.a,1e-3), b.a*(1.-m)); }
  vec4 f = texture(tF, vec2(uv.x, 1.-uv.y));
  col = col*(1.-f.a) + f.rgb;
  // light leak (ref 19.18-19.80, measured per frame): a magenta flash, an orange glow rising from the bottom, a peach
  // wash over the cut, then a yellow wash on the upper frame fading out
  if(uLeak > 0.){
    col = mix(col, vec3(0.86,0.58,0.74) + col*0.25, uLk.x*0.8);
    float L = smoothstep(uLk.y - 160., uLk.y + 160., p.y);
    col = mix(col, vec3(0.84,0.55,0.27) + col*0.25, L*0.88*step(uLk.y, 1919.));
    col = mix(col, vec3(0.95,0.76,0.59), uLk.z);
    col = mix(col, vec3(0.94,0.80,0.47), (1. - smoothstep(900., 1500., p.y))*uLk.w);
  }
  o = vec4(clamp(col,0.,1.),1.);
}`;
const prog = (() => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; })();
gl.useProgram(prog);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
const TV = tex(), TB = tex(), TF = tex(), TL = tex();
const U = k => gl.getUniformLocation(prog, k);
{ // the measured per-channel transfer as a 256x1 LUT
  const lut = new Uint8Array(256 * 4), at = (pts, v) => { for (let i = 0; i < pts.length - 1; i++) if (v <= pts[i + 1][0]) return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (v - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts.at(-1)[1]; };
  for (let v = 0; v < 256; v++) { lut[v * 4] = at(GRADE.r, v); lut[v * 4 + 1] = at(GRADE.g, v); lut[v * 4 + 2] = at(GRADE.b, v); lut[v * 4 + 3] = 255; }
  gl.bindTexture(gl.TEXTURE_2D, TL); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
  gl.uniform1fv(U('uFall'), GRADE.fall.map(f => f[1])); gl.uniform1fv(U('uFallY'), GRADE.fall.map(f => f[0]));
}
[['tVid', 0], ['tB', 1], ['tF', 2], ['tLut', 3]].forEach(([n, i]) => gl.uniform1i(U(n), i));
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
const upload = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };

// ---------- captions ----------
const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const fitCache = new Map();
function fontFit(x, L, font) { if (!L.fitW) return font; const k = font + L.fitW; if (!fitCache.has(k)) { x.font = font; const w = x.measureText(Array.isArray(L.text) ? L.text.join(' ') : L.text).width, px = +font.match(/(\d+)px/)[1]; fitCache.set(k, font.replace(/\d+px/, Math.round(px * L.fitW / w) + 'px')); } return fitCache.get(k); }
function drawLine(x, L, t, cap) {
  const segs = Array.isArray(L.text) ? L.text.map((s, i) => ({ s, font: L.font[i] })) : [{ s: L.text, font: L.font }];
  // letters with their reveal times: words reveal on their onsets; letters inside a word 22 ms apart (a fast type-on)
  const letters = []; let wi = 0;
  for (const g of segs) { g.font = fontFit(x, L, g.font); x.font = g.font; for (const [k, word] of g.s.split(' ').entries()) { const t0 = L.words[Math.min(wi, L.words.length - 1)] ?? cap.a; wi++;
    for (let j = 0; j < word.length; j++) letters.push({ ch: word[j], font: g.font, t0: t0 + (L.scramble ? hash(letters.length * 7.3 + 1) * L.scramble * .6 : j * .022) });
    letters.push({ ch: ' ', font: g.font, t0 }); } }
  letters.pop();
  let total = 0; for (const l of letters) { x.font = l.font; l.w = x.measureText(l.ch).width; total += l.w; }
  let cx = L.align === 'c' ? L.x - total / 2 : L.x;
  const out = Math.min(win(t, cap.b - .04, cap.b), 1);
  if (L.plate && t >= L.plateIn) { const u = eo3(win(t, L.plateIn, L.plateIn + .12)); x.font = letters[0].font; const px = +letters[0].font.match(/(\d+)px/)[1];
    x.fillStyle = L.plate; x.globalAlpha = 1 - out; x.fillRect(cx - 8, L.y - px * .92, (total + 16) * u, px * 1.14); x.globalAlpha = 1; }
  for (const l of letters) {
    const age = t - l.t0; if (age < 0 || l.ch === ' ') { cx += l.w; continue; }
    const settle = L.scramble ? L.scramble * .5 : 0, scr = age < settle;
    const ch = scr ? SCR[Math.floor(hash(l.t0 * 99 + Math.floor(t * 30)) * SCR.length)] : l.ch;
    const a = clamp(age / .06) * (1 - out);
    x.font = l.font; x.globalAlpha = a;
    const fill = scr && L.scrambleCol ? L.scrambleCol : L.fill;
    if (L.shadow) { x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 10; x.shadowOffsetY = 2; x.fillStyle = fill; x.fillText(ch, cx, L.y); }
    if (L.glow && !scr) { x.shadowColor = L.glow; x.shadowBlur = L.gb; x.shadowOffsetY = 0; x.fillStyle = fill; x.fillText(ch, cx, L.y); x.shadowBlur = L.gb * .45; x.fillText(ch, cx, L.y); }
    x.shadowColor = 'transparent'; x.fillStyle = fill; x.fillText(ch, cx, L.y);
    cx += l.w;
  }
  x.globalAlpha = 1; x.shadowColor = 'transparent';
}
const PIN0 = camAt(0.8);
function drawCaps(x, t) {
  for (const cap of CAPS) { if (t < cap.a || t >= cap.b) continue;
    x.save();
    if (cap.pin) { const c = camAt(t), r = Math.PI / 180; x.translate(c.tx, c.ty); x.rotate(c.rot * r); x.scale(c.s, c.s); x.scale(1 / PIN0.s, 1 / PIN0.s); x.rotate(-PIN0.rot * r); x.translate(-PIN0.tx, -PIN0.ty); }
    for (const L of cap.lines) drawLine(x, L, t, cap);
    x.restore(); }
}

// ---------- the desk world ----------
function put(x, im, cx, cy, w, rot = 0, a = 1, sh = true, h) {
  h = h ?? w * im.height / im.width; x.save(); x.globalAlpha = a; x.translate(cx, cy); x.rotate(rot);
  if (sh) { x.shadowColor = 'rgba(70,52,34,0.38)'; x.shadowBlur = 28; x.shadowOffsetX = 16; x.shadowOffsetY = 22; }
  x.drawImage(im, -w / 2, -h / 2, w, h); x.restore();
}
function shadeOver(x) { // the window light falls over the props too: the ground's gobo, multiplied lightly on top
  x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = .0; x.restore(); }
function desk1(x, t) {
  const push = 1 + .02 * eio(win(t, 4.4, 6.4));
  x.save(); x.translate(540, 960); x.scale(push, push); x.translate(-540, -960);
  x.drawImage(G1, -160, -190);
  put(x, CUP, 960, 1770, 560, .3);
  if (t > 4.60) { const u = eo3(win(t, 4.60, 4.86)); put(x, IM.pencil, lerp(-120, 170, u), lerp(-60, 110, u), 620, .62, 1); }
  const bu = win(t, 4.02, 4.32);
  if (t > 4.03) { const s = lerp(.24, 1, eo3(bu)); put(x, IM.brain, lerp(560, 500, eo3(bu)), lerp(1000, 1045, eo3(bu)), 930 * s, lerp(-.8, 0, eo3(bu))); }
  if (t > 4.62) { const s = eob(win(t, 4.62, 4.82));
    x.strokeStyle = '#2C2A28'; x.lineWidth = 7; x.beginPath(); x.moveTo(530, 690); x.lineTo(532, 740 + 30 * (1 - s)); x.stroke();
    x.save(); const g = x.createRadialGradient(524, 440, 20, 524, 440, 260 * s); g.addColorStop(0, 'rgba(255,236,120,0.55)'); g.addColorStop(1, 'rgba(255,236,120,0)'); x.fillStyle = g; x.fillRect(200, 120, 650, 650); x.restore();
    put(x, BULB, 524, 470, 270 * s, 0, 1, true); }
  if (t > 4.86) { const u = eo3(win(t, 4.86, 5.06)); put(x, NOTE1, 845, 570, 330 * lerp(1.25, 1, u), lerp(.45, .26, u), u); }
  if (t > 5.14) { const u = eo3(win(t, 5.14, 5.32)); put(x, NOTE2, 205, 625, 200 * lerp(1.25, 1, u), lerp(-.5, -.28, u), u); }
  x.restore();
  // words: a faint script line, then the hero in orange condensed caps-height type
  const cap = { a: 4.45, b: 6.47 };
  drawLine(x, { text: 'and that was', font: 'italic 400 42px Playfair', x: 540, y: 1300, align: 'c', fill: 'rgba(255,255,255,0.7)', words: [4.48, 4.76, 4.92], gb: 0 }, t, cap);
  x.save(); x.font = '700 70px OpenSans'; x.fontStretch = 'condensed';
  drawLine(x, { text: 'the idea behind it', font: '700 70px OpenSans', x: 540, y: 1396, align: 'c', fill: '#D98C1F', words: [5.08, 5.24, 5.48, 5.76], gb: 0 }, t, cap);
  x.restore();
}
function desk2(x, t, frozen) {
  const push = 1 + .09 * eio(win(t, 8.0, 12.0));
  x.save(); x.translate(540, 760); x.scale(push, push); x.translate(-540, -760 + 20 * eio(win(t, 8.0, 12.0)));
  x.drawImage(G2, -160, -190);
  if (t > 7.95) { const u = eo3(win(t, 7.95, 8.25)); put(x, IM.pencil, lerp(-200, 110, u), lerp(900, 760, u), 600, 1.05); }
  if (t > 8.60) { const u = eo3(win(t, 8.60, 9.00)); put(x, IM.leafA, lerp(1300, 1010, u), lerp(1700, 1560, u), 430, -.35); }
  if (t > 8.70) { const u = eo3(win(t, 8.70, 9.00)); put(x, IM.leafB, lerp(-200, 90, u), lerp(-160, 40, u), 380, 2.6); }
  if (t > 7.62) { const u = eio(win(t, 7.62, 8.06)); put(x, STACK, lerp(300, 465, u), lerp(220, 690, u), 640 * lerp(1.9, 1, u), lerp(-.25, -.06, u)); }
  if (t > 8.15) { // dashed curved arrow drawing on
    const u = win(t, 8.15, 8.90), P = s => { const a = s * Math.PI * 1.55 - Math.PI * .5; return [495 + Math.cos(a) * 52 * (1 - s * .3) + s * 30, 1000 + s * 210 + Math.sin(a) * 40]; };
    x.save(); x.strokeStyle = '#2B2622'; x.lineWidth = 5; x.lineCap = 'round'; x.setLineDash([10, 12]); x.beginPath();
    for (let i = 0; i <= 40 * u; i++) { const [px, py] = P(i / 40); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.setLineDash([]);
    if (u >= 1) { const [ex, ey] = P(1), [qx, qy] = P(.96), a = Math.atan2(ey - qy, ex - qx); x.beginPath(); x.moveTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6); x.lineTo(ex - Math.cos(a - .5) * 22, ey - Math.sin(a - .5) * 22); x.moveTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6); x.lineTo(ex - Math.cos(a + .5) * 22, ey - Math.sin(a + .5) * 22); x.stroke(); }
    x.restore(); }
  if (t > 8.70) { const u = eo3(win(t, 8.70, 9.10)); put(x, CARD, lerp(560, 505, u), lerp(1330, 1405, u), 570 * lerp(.45, 1, u), lerp(.55, -.04, u)); }
  if (t > 9.10) { const s = eob(win(t, 9.10, 9.28)); x.save(); x.translate(513, 1592); x.rotate(-.03); x.scale(s, s);
    x.shadowColor = 'rgba(70,52,34,0.35)'; x.shadowBlur = 10; x.shadowOffsetY = 5; x.fillStyle = '#E8C66A'; x.fillRect(-100, -30, 200, 60); x.shadowColor = 'transparent';
    x.fillStyle = '#3A2E1E'; x.font = '600 26px OpenSans'; x.textAlign = 'center'; x.fillText('UPLOAD', 0, 9); x.textAlign = 'left'; x.restore(); }
  if (t > 10.0) { // handwritten "6 MONTHS" (white marker), letters drawn on 10.0-10.5; a small line under it from 11.25
    const s = '6 MONTHS', n = Math.floor(win(t, 10.0, 10.5) * s.length + .999);
    x.save(); x.translate(540, 170); x.rotate(-.06); x.font = '700 96px Kalam'; x.textAlign = 'center';
    x.shadowColor = 'rgba(60,45,30,0.45)'; x.shadowBlur = 6; x.shadowOffsetY = 3; x.fillStyle = '#F6F3EC'; x.fillText(s.slice(0, n).padEnd(s.length, ' '), 0, 0);
    if (t > 11.25) { x.font = '400 30px Kalam'; x.globalAlpha = win(t, 11.25, 11.45); x.fillText('put the first episodes online', 0, 52); }
    x.restore(); }
  x.restore();
}
let BULBBG = null;
function bulbScene(x, t) {
  if (!BULBBG) { const [c, y] = mk2d(W, H), [d, z] = mk2d(W, H); desk2(z, 11.99); y.filter = 'blur(18px) brightness(1.06)'; y.translate(540, 900); y.scale(1.3, 1.3); y.translate(-540, -900); y.drawImage(d, 0, 0); BULBBG = c; }
  x.drawImage(BULBBG, 0, 0);   // the blurred desk behind the bulb, built once
  const u = eo3(win(t, 12.20, 12.50)), s = lerp(.86, 1, u), cy = lerp(760, 700, u);
  const g = x.createRadialGradient(527, cy - 120, 40, 527, cy - 120, 520); g.addColorStop(0, 'rgba(255,238,140,0.55)'); g.addColorStop(1, 'rgba(255,238,140,0)'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1700);
  put(x, BULB, 527, cy, 480 * s, 0, 1, true);
  const cap = { a: 12.30, b: 14.2 };
  drawLine(x, { text: 'It was like a', font: '400 52px OpenSans', x: 540, y: 1339, align: 'c', fill: '#F7F5F0', shadow: true, words: [12.32, 12.47, 12.59, 12.73], gb: 0 }, t, cap);
  drawLine(x, { text: 'light bulb moment', font: '700 52px OpenSans', x: 540, y: 1424, align: 'c', fill: '#F7F5F0', shadow: true, words: [12.82, 13.08, 13.21], gb: 0 }, t, cap);
}
// blur ramps on the desk scenes' exits (ref 6.20-6.47, 11.85-12.20, 13.95-14.20) and entries (3.95-4.20, 7.47-7.65)
const deskBlur = (t, sh) => ({ desk1: Math.max(10 * (1 - win(t, 3.95, 4.18)), 22 * win(t, 6.20, 6.47)), desk2: Math.max(9 * (1 - win(t, 7.47, 7.66)), 18 * win(t, 11.85, 12.20)), bulb: 20 * win(t, 13.95, 14.20) })[sh.k] || 0;
const [CD, dx] = mk2d(W, H);
function drawDesk(t, sh) {
  dx.clearRect(0, 0, W, H);
  if (sh.k === 'desk1') desk1(dx, t); else if (sh.k === 'desk2') desk2(dx, t); else bulbScene(dx, t);
  const b = deskBlur(t, sh);
  if (b > .3) { fx.filter = `blur(${b.toFixed(1)}px)`; fx.drawImage(CD, 0, 0); fx.filter = 'none'; } else fx.drawImage(CD, 0, 0);
}

// ---------- money behind the head (ref 20.45-21.6): grey-green bills fly in from the top right, tumbling ----------
function bill(x, w, h) { x.fillStyle = '#A9B39F'; x.fillRect(-w / 2, -h / 2, w, h); x.strokeStyle = '#6E7D68'; x.lineWidth = 3; x.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
  x.fillStyle = '#7E8C77'; x.beginPath(); x.ellipse(0, 0, h * .3, h * .36, 0, 0, 7); x.fill(); x.fillStyle = '#C3CBB8'; x.fillRect(-w / 2 + 16, -h / 2 + 14, w * .18, h * .2); x.fillRect(w / 2 - 16 - w * .18, h / 2 - 14 - h * .2, w * .18, h * .2); }
function drawMoney(x, t) {
  for (let i = 0; i < MONEY.n; i++) { const t0 = MONEY.a + i * .11 + hash(i) * .12, u = (t - t0) / 1.1; if (u < 0 || u > 1) continue;
    const left = i % 4 === 3, px = left ? lerp(-150, 120 + hash(i + 5) * 250, u) : lerp(1200 + hash(i + 3) * 200, 420 + hash(i + 5) * 560, u), py = lerp(-220 + hash(i + 7) * 250, 820 + hash(i + 9) * 420, u * u * .6 + u * .4);
    const rot = hash(i + 11) * 6 + u * (3 + hash(i) * 4), sq = Math.cos(u * 9 + i);
    x.save(); x.translate(px, py); x.rotate(rot); x.scale(1, .35 + .65 * Math.abs(sq)); x.globalAlpha = .92 * clamp(u * 6) * clamp((1 - u) * 5);
    bill(x, 390, 166); x.restore(); }
}

// ---------- one frame ----------
const PROF = { n: 0, ms: 0 }; window.__prof = () => ({ n: PROF.n, ms: +(PROF.ms / Math.max(1, PROF.n)).toFixed(2) });
let vNew = true; const onVF = () => { vNew = true; video.requestVideoFrameCallback(onVF); }; video.requestVideoFrameCallback(onVF);
let wasB = true;
function frame(T) {
  const t0 = performance.now(), sh = shotAt(T), c = camAt(T);
  fx.clearRect(0, 0, W, H);
  if (sh.k !== 'aroll') drawDesk(T, sh); else drawCaps(fx, T);
  const money = T > MONEY.a && T < MONEY.b + .2;
  if (money || wasB) { bx.clearRect(0, 0, W, H); if (money) drawMoney(bx, T); upload(TB, CB); wasB = money; }
  if (T < VDUR && video.readyState >= 2 && (vNew || !playing)) { upload(TV, video); vNew = false; }
  upload(TF, CF);
  gl.viewport(0, 0, W, H);
  [TV, TB, TF, TL].forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); });
  gl.uniform4f(U('uCam'), c.s, c.tx, c.ty, c.rot * Math.PI / 180);
  const bl = sh.blurIn ? 16 * (1 - win(T, sh.blurIn[0], sh.blurIn[1])) : 0;
  gl.uniform1f(U('uBlur'), sh.k === 'aroll' ? bl : 0);
  gl.uniform1f(U('uMatte'), T > 19.5 ? 1 : 0);
  const tri = (t, a, m, b) => t < a || t > b ? 0 : t < m ? win(t, a, m) : 1 - win(t, m, b);
  const lk = [.8 * tri(T, 19.18, 19.267, 19.335), T > 19.36 && T < 19.60 ? lerp(1920, 700, win(T, 19.36, 19.57)) : 1920, T > 19.555 && T < 19.705 ? .88 * win(T, 19.555, 19.6) : 0, T >= 19.70 && T < 19.81 ? .85 * (1 - win(T, 19.70, 19.81)) : 0];
  gl.uniform1f(U('uLeak'), T > 19.15 && T < 19.85 ? 1 : 0); gl.uniform4f(U('uLk'), ...lk);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  PROF.n++; PROF.ms += performance.now() - t0;
  $('bar').firstElementChild.style.width = (100 * T / DURATION) + '%';
}

// ---------- clock, playback ----------
let playing = false, T = +(Q.get('t') || 0), wall0 = 0, T0 = 0, srcs = [];
const master = AC.createGain(); master.connect(AC.destination); master.gain.value = Q.has('mute') ? 0 : 1;
// voice +1.1 dB to the ref's overall RMS (-17.0 vs ours -18.1); a bed under it at the ref's measured gap floor (≈-27 dBFS
// RMS between words; bed.mp3 is -19.8, so x0.44). The ref's music itself is unknown: "Funkorama" (CC BY 4.0) stands in.
function startAudio(from) { const at = AC.currentTime + 0.05;
  for (const [k, g] of [['voice', 1.13], ['bed', 0.44]]) { const v = AC.createBufferSource(), gn = AC.createGain(); v.buffer = BUF[k]; gn.gain.value = g; v.connect(gn).connect(master); if (from < BUF[k].duration) v.start(at, from + (k === 'bed' ? 12 : 0)); srcs.push(v); }
  return at; }
function stopAudio() { for (const s of srcs) try { s.stop(); } catch { } srcs = []; }
async function play() {
  if (T >= DURATION - 0.05) T = 0;
  await AC.resume();
  video.currentTime = Math.min(T, VDUR - .02); await new Promise(r => (video.onseeked = r));
  wall0 = startAudio(T); T0 = T; playing = true; video.play(); requestAnimationFrame(loop);
}
function pause() { playing = false; video.pause(); stopAudio(); }
function loop() {
  if (!playing) return;
  T = Math.max(T0, T0 + (AC.currentTime - wall0));
  if (T < VDUR) { const d = video.currentTime - T; if (Math.abs(d) > 0.12) video.currentTime = T; else video.playbackRate = 1 - Math.max(-0.05, Math.min(0.05, d * 0.5)); if (video.paused) video.play(); } else if (!video.paused) video.pause();
  frame(T);
  if (T >= DURATION) { pause(); T = DURATION; return; }
  requestAnimationFrame(loop);
}
window.__seek = async t => {
  pause(); T = t; const target = Math.min(t, VDUR - 0.02);
  if (Math.abs(video.currentTime - target) > 1e-4) { video.currentTime = target; await new Promise(r => (video.onseeked = r)); }
  await new Promise(r => { video.requestVideoFrameCallback(() => r()); setTimeout(r, 150); });
  frame(t); return true;
};
window.__play = play; window.__T = () => T; window.__mute = m => { master.gain.value = m ? 0 : 1; }; window.__vt = () => video.currentTime;
$('bar').onclick = e => { const r = $('bar').getBoundingClientRect(), was = playing; pause(); T = (e.clientX - r.left) / r.width * DURATION; window.__seek(T).then(() => was && play()); };
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
$('stage').onclick = () => (playing ? pause() : play());
// warm every desk scene once (decode images, build filters) so the first visit does not stall
for (const t of [4.5, 9.5, 12.8]) frame(t);
await window.__seek(T);
status('Ready: press play'); $('gate').classList.add('ready');
if (Q.has('embed')) { $('gate').style.display = 'none'; $('bar').style.display = 'none'; }
$('gate').onclick = () => { $('gate').style.display = 'none'; play(); };
window.__ready = true;
