// ba1 recreation player: Hossein's BONOMI after panel (refs/edit-ba1), rebuilt 1:1 on a Wikimedia Commons talking head.
// Every number here is measured from the reference (docs/recreate/ba1/wNN/REF.md); times are on our clip's clock and
// sit on our speaker's word onsets the way the reference sits on its own.
// Layers per frame: footage (packed master | matte video) → graded, background treatment (red tint regions, B&W,
// darken, void) → behind-the-subject canvas → subject (+ rim line) → front canvas (text, lines, fall-off, logo) →
// post (transitions). URL: ?t=<start s> &brand=<WORD> &mute=1
import { EDIT, BRAND } from './edit.js';

const Q = new URLSearchParams(location.search);
const W = 1080, H = 1920, MW = 1800, MH = 2160, PW = 2700;   // out, master window, packed video width
const CLIP = '/data/clips/ba1c/';
const $ = id => document.getElementById(id), status = s => ($('status').textContent = s);
window.__ready = false;

// ---------- fit the stage ----------
function fit() { const k = Math.min(innerWidth / W, (innerHeight - 24) / H); const s = $('stage'); s.style.transform = `scale(${k})`; s.style.width = W + 'px'; s.parentElement.style.width = W * k + 'px'; s.parentElement.style.height = H * k + 'px'; $('wrap').style.display = 'grid'; }
addEventListener('resize', fit); fit();

// ---------- load everything behind the gate ----------
status('Loading fonts…');
const FONTS = [
  ['Poppins', 'Poppins-SemiBold.ttf', '600'], ['Poppins', 'Poppins-Bold.ttf', '700'], ['Poppins', 'Poppins-ExtraBold.ttf', '800'],
  ['Poppins', 'Poppins-ExtraLight.ttf', '200'], ['Poppins', 'Poppins-Light.ttf', '300'], ['Poppins', 'Poppins-Regular.ttf', '400'],
  ['Courgette', 'Courgette-Regular.ttf', '400'], ['Kalam', 'Kalam-Regular.ttf', '400'], ['Anton', 'Anton-Regular.ttf', '400'],
  ['Lobster', 'Lobster-Regular.ttf', '400'],
];
await Promise.all(FONTS.map(async ([f, file, w]) => document.fonts.add(await new FontFace(f, `url(/assets/fonts/${file})`, { weight: w }).load())));
document.fonts.add(await new FontFace('InterTight', 'url(/assets/renderer/fonts/inter-tight-latin-wght-normal.woff2)', { weight: '100 900' }).load());

status('Loading the footage…');
const video = Object.assign(document.createElement('video'), { src: CLIP + 'pack.mp4', preload: 'auto', muted: true, playsInline: true, crossOrigin: 'anonymous' });
await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('pack.mp4 failed')); video.load(); });
const VDUR = video.duration;

status('Loading the sound…');
const AC = new AudioContext(), BUF = {};
const loadBuf = async (k, url) => { BUF[k] = await AC.decodeAudioData(await (await fetch(url)).arrayBuffer()); };
await Promise.all([loadBuf('voice', CLIP + 'voice.m4a'), ...Object.entries(EDIT.sfxFiles).map(([k, f]) => loadBuf(k, '/assets/' + f))]);
BUF.boom = synthBoom(); BUF.sand = synthSand();

// ---------- WebGL compositor ----------
const out = $('out'), gl = out.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
const mk2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const [CB, bx] = mk2d(W, H), [CF, fx] = mk2d(W, H), [CT, tx] = mk2d(W / 2, H / 2);   // behind, front, tint (half res)
const VS = `#version 300 es
in vec2 a; out vec2 uv; void main(){ uv = a*0.5+0.5; gl_Position = vec4(a,0,1); }`;
const FS_MAIN = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tVid, tB, tF, tT;
uniform vec2 uO; uniform float uM;                 // master → out: p = uO + uM*q
uniform float uSatAdj, uBgSat, uBgBri, uBgCon, uVoid, uBW, uSubSat, uRim, uRimW, uTintGain, uGrade, uTime;
uniform vec3 uVoidCol;
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 grade(vec3 c){ // the reference's measured before→after transfer, softened for already-graded footage (REF w10)
  vec3 g = pow(max(c,0.0), 1.0 + uGrade*vec3(0.16, 0.26, 0.36));   // the measured transfer: blue and green crushed more than red
  g = mix(g, smoothstep(0.0,1.0,g), 0.35*uGrade);
  float l = lum(g); g = mix(vec3(l), g, 1.0 + uSatAdj*uGrade);
  g *= vec3(1.0+0.03*uGrade, 1.0, 1.0-0.06*uGrade);
  return clamp(g,0.0,1.0); }
vec2 inMaster(vec2 p){ return (p - uO)/uM; }
float matteAt(vec2 q){ if(q.x<0.||q.y<0.||q.x>=1800.||q.y>=2160.) return 0.; return texture(tVid, vec2((1800.+q.x*0.5)/2700., q.y*0.5/2160.)).r; }
void main(){
  vec2 p = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec2 q = inMaster(p);
  bool inside = q.x>=0.&&q.y>=0.&&q.x<1800.&&q.y<2160.;
  vec3 v = inside ? texture(tVid, vec2(q.x/2700., q.y/2160.)).rgb : vec3(0.);
  float ma = smoothstep(0.30, 0.70, matteAt(q));
  vec3 g = grade(v);
  // background
  float l = lum(g);
  vec3 bg = mix(vec3(l), g, uBgSat);
  bg = (bg - 0.5)*uBgCon + 0.5; bg = max(bg,0.)*uBgBri;
  float tint = texture(tT, vec2(uv.x, 1.-uv.y)).r;
  vec3 red = vec3(clamp(0.58 + (lum(g)-0.12)*uTintGain*0.5, 0.40, 0.95), 0.0, 0.004);   // ref red 152-207 with the wall's texture
  bg = mix(bg, red, tint);
  if(!inside) bg = uVoidCol;
  bg = mix(bg, uVoidCol, uVoid);
  vec4 b = texture(tB, vec2(uv.x, 1.-uv.y));
  bg = bg*(1.-b.a) + b.rgb;
  // subject
  vec3 s = mix(vec3(lum(g)), g, uSubSat);
  vec3 col = mix(bg, s, ma);
  // rim line just outside the matte edge (white, soft glow)
  if(uRim > 0.0){
    float r = uRimW/uM, mx = 0., mg = 0.;
    for(int i=0;i<16;i++){ float an = 6.2831853*float(i)/16.; vec2 d = vec2(cos(an),sin(an));
      mx = max(mx, matteAt(q + d*r)); mg = max(mg, matteAt(q + d*r*2.6)); }
    float outside = 1. - smoothstep(0.15, 0.55, matteAt(q));
    float line = smoothstep(0.35, 0.75, mx) * outside;
    float glow = smoothstep(0.3, 0.8, mg) * outside * 0.22;
    col = mix(col, vec3(0.93,0.91,0.87), clamp(line*uRim,0.,1.));
    col += vec3(0.9,0.88,0.84)*glow*uRim;
  }
  col = mix(col, vec3(lum(col)), uBW);
  // front tint (green channel of the tint layer): red letters filled with whatever is under them, subject included
  vec3 tt = texture(tT, vec2(uv.x, 1.-uv.y)).rgb; float ft = tt.g;
  col *= 1. - 0.88*tt.b;
  col = mix(col, vec3(clamp(0.74 + (lum(col)-0.10)*1.3, 0.52, 0.96), 0., 0.004), ft);
  vec4 f = texture(tF, vec2(uv.x, 1.-uv.y));
  col = col*(1.-f.a) + f.rgb;
  o = vec4(col,1.);
}`;
const FS_POST = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tM; uniform float uTime;
uniform vec4 uBurn;     // x: leak, y: white, z: noise, w: band (0 off, 0..1 collapse)
uniform vec4 uBand;     // x: band centre y (px), y: half height, z: line alpha, w: glitch frame
uniform vec4 uPart;     // x: sweep 0..1, y: speck density, z: grain white, w: seed
uniform vec4 uBar;      // x: centre x px, y: half width px, z: alpha, w: seed
uniform vec4 uGlitch;   // x: strips, y: bars, z: white, w: rise (new frame from white, 0..1)
uniform vec4 uLeak;     // x: green leak alpha, y: x px, z: y px, w: radius
uniform float uBlack;   // end: fade to black
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
void main(){
  vec2 p = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec2 tuv = uv;
  // glitch strips: horizontal slices shifted sideways
  if(uGlitch.x > 0.){
    float row = floor(p.y/22.); float k = h(vec2(row, floor(uTime*30.)));
    if(k > 0.72 && p.y < 900.) tuv.x += (h(vec2(row,3.1))-.5)*0.18*uGlitch.x;
  }
  vec3 c = texture(tM, tuv).rgb;
  // light burn: warm blobs blooming over the frame (ref 7.23-7.40)
  if(uBurn.x > 0.){
    float t = uBurn.x;
    vec2 c1 = vec2(380., 120.), c2 = vec2(200., 1820.), c3 = vec2(980., 900.);
    float r1 = mix(60., 900., t), r2 = mix(40., 700., t*t), r3 = mix(10., 600., max(t-.3,0.)/.7);
    float l1 = exp(-pow(length(p-c1)/r1, 2.)), l2 = exp(-pow(length(p-c2)/r2, 2.)), l3 = exp(-pow(length(p-c3)/r3,2.));
    float L = clamp((l1+l2*.8+l3*.6)*(0.4+1.4*t), 0., 1.6);
    c = c + vec3(1.0,0.86,0.66)*L; c = mix(c, vec3(1.), smoothstep(0.75, 1., t)*0.7);
  }
  if(uBand.w > 0.){ float l = lum(c); c = vec3(l)*1.3 + vec3(step(0.82, h(vec2(floor(p.x/9.), 7.)))*0.6); }
  if(uBurn.y > 0.) c = mix(c, vec3(1.), uBurn.y);
  if(uBurn.z > 0.){ float g = h(p + uTime*91.); c = mix(c, vec3(0.94 - g*0.18), uBurn.z); }
  if(uBurn.w > 0.){ // white band collapsing to a line, black elsewhere, until the void shot shows
    float d = abs(p.y - uBand.x);
    float band = 1. - smoothstep(uBand.y, uBand.y+2., d);
    c = mix(mix(c, vec3(0.008,0.004,0.01), uBurn.w), vec3(1.), band*uBurn.w);
  }
  if(uBand.z > 0.){ float d = abs(p.y - uBand.x); c = mix(c, vec3(1.), (1.-smoothstep(1.5, 4.5, d))*uBand.z); c += vec3(1.)*exp(-d*d/600.)*0.25*uBand.z; }
  // particle dissolve: white grain sweeping in from the left, then specks over the new shot (ref 11.37-11.73)
  if(uPart.y > 0. || uPart.z > 0.){
    float sweep = smoothstep(uPart.x*1.25 - 0.25, uPart.x*1.25, 1. - p.x/1080.);
    float g = h(floor(p/3.) + uPart.w);
    float grain = step(1. - uPart.z*sweep, g);
    c = mix(c, vec3(0.92 + 0.08*h(p+3.)), grain*0.85);
    float sp = h(floor(p/4.) + uPart.w*1.7);
    c = mix(c, vec3(step(0.5, h(p*.7+uPart.w))), step(1. - uPart.y*0.35, sp));
  }
  // noise bar: a white grainy vertical band (ref 11.80-11.97)
  if(uBar.z > 0.){ float d = abs(p.x - uBar.x); float m = 1. - smoothstep(uBar.y, uBar.y+3., d);
    float g = h(floor(p/2.) + uBar.w); c = mix(c, vec3(0.97 - 0.35*step(0.86, g)), m*uBar.z); }
  // glitch bars: vertical black/white barcode with noise, then white
  if(uGlitch.y > 0.){ float col = h(vec2(floor(p.x/(6.+18.*h(vec2(floor(p.x/40.),2.)))), floor(uTime*24.)));
    vec3 bc = mix(vec3(0.97), vec3(0.03), step(0.84, col)); bc = mix(bc, vec3(0.75), step(0.93, h(p+uTime)));
    c = mix(c, bc, uGlitch.y); }
  if(uGlitch.z > 0.) c = mix(c, vec3(1.), uGlitch.z);
  // green light leak sliding along the bottom (ref 16.27-16.37)
  if(uLeak.x > 0.){ vec2 d = (p - uLeak.yz)/vec2(uLeak.w*1.6, uLeak.w*0.55); float L = exp(-dot(d,d)*1.6);
    c += vec3(0.05, 1.0, 0.25)*L*uLeak.x*1.4; c = mix(c, vec3(0.5,1.,0.6), clamp(L*uLeak.x-0.6,0.,1.)); }
  c = mix(c, vec3(0.008,0.004,0.01), uBlack);
  o = vec4(clamp(c,0.,1.),1.);
}`;
const prog = (fs) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
const PM = prog(FS_MAIN), PP = prog(FS_POST);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const tex = (lin = true) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, lin ? gl.LINEAR : gl.NEAREST], [gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
const TV = tex(), TB = tex(), TF = tex(), TT = tex(), TM = tex();
gl.bindTexture(gl.TEXTURE_2D, TM); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
const FB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, FB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, TM, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
const U = (p) => new Proxy({}, { get: (_, k) => gl.getUniformLocation(p, k) });
const um = U(PM), up = U(PP);

function upload(t, src) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }

// ---------- draw one frame at time T ----------
const ctx = { W, H, bx, fx, tx, brand: (Q.get('brand') || BRAND).toUpperCase() };
EDIT.prepare(ctx);
function frame(T) {
  const s = EDIT.state(T);                      // camera + background + post uniforms for this time
  for (const c of [bx, fx]) c.clearRect(0, 0, W, H);
  tx.clearRect(0, 0, W / 2, H / 2);
  EDIT.draw(T, s, ctx);                         // text, lines, blocks, fall-off, logo
  if (T < VDUR && video.readyState >= 2) upload(TV, video);
  upload(TB, CB); upload(TF, CF); upload(TT, CT);
  gl.viewport(0, 0, W, H);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FB); gl.useProgram(PM);
  [[TV, 'tVid'], [TB, 'tB'], [TF, 'tF'], [TT, 'tT']].forEach(([t, n], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(um[n], i); });
  gl.uniform2f(um.uO, s.cam.ox, s.cam.oy); gl.uniform1f(um.uM, s.cam.m);
  gl.uniform1f(um.uSatAdj, s.g.uSatAdj ?? 0);
  for (const k of ['uBgSat', 'uBgBri', 'uBgCon', 'uVoid', 'uBW', 'uSubSat', 'uRim', 'uRimW', 'uTintGain', 'uGrade']) gl.uniform1f(um[k], s.g[k]);
  gl.uniform1f(um.uTime, T); gl.uniform3f(um.uVoidCol, 0.008, 0.004, 0.012);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(PP);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TM); gl.uniform1i(up.tM, 0);
  gl.uniform1f(up.uTime, T);
  for (const k of ['uBurn', 'uBand', 'uPart', 'uBar', 'uGlitch', 'uLeak']) gl.uniform4fv(up[k], s.p[k]);
  gl.uniform1f(up.uBlack, s.p.uBlack);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  $('bar').firstElementChild.style.width = (100 * T / EDIT.duration) + '%';
}

// ---------- clock, playback, sound ----------
let playing = false, T = +(Q.get('t') || 0), wall0 = 0, T0 = 0, srcs = [];
const master = AC.createGain(); master.connect(AC.destination); master.gain.value = Q.has('mute') ? 0 : 1;
function startAudio(from) {
  const at = AC.currentTime + 0.05;
  const v = AC.createBufferSource(); v.buffer = BUF.voice; const vg = AC.createGain(); vg.gain.value = 1; v.connect(vg).connect(master);
  if (from < BUF.voice.duration) v.start(at, from); srcs.push(v);
  for (const e of EDIT.sfx) {
    if (e.t + 0.02 < from || !BUF[e.k]) continue;
    const b = AC.createBufferSource(); b.buffer = BUF[e.k]; b.playbackRate.value = e.rate ?? 1;
    const g = AC.createGain(); g.gain.value = e.gain ?? 0.5; b.connect(g).connect(master); b.start(at + (e.t - from)); srcs.push(b);
  }
  return at;
}
function stopAudio() { for (const s of srcs) try { s.stop(); } catch { } srcs = []; }
async function play() {
  if (T >= EDIT.duration - 0.05) T = 0;
  await AC.resume();
  if (T < VDUR) { video.currentTime = T; await new Promise(r => (video.onseeked = r)); }
  const at = startAudio(T); T0 = T; wall0 = at; playing = true;
  if (T < VDUR) video.play();
  requestAnimationFrame(loop);
}
function pause() { playing = false; video.pause(); stopAudio(); }
function loop() {
  if (!playing) return;
  T = Math.max(T0, T0 + (AC.currentTime - wall0));
  if (T < VDUR) { const d = video.currentTime - T; if (Math.abs(d) > 0.12) video.currentTime = T; else video.playbackRate = 1 - Math.max(-0.05, Math.min(0.05, d * 0.5)); if (video.paused) video.play(); }
  else if (!video.paused) video.pause();
  frame(T);
  if (T >= EDIT.duration) { pause(); T = EDIT.duration; return; }
  requestAnimationFrame(loop);
}
// headless grabs: seek, wait for the decoded frame, draw
window.__seek = async t => {
  pause(); T = t;
  if (t < VDUR) {
    const target = Math.min(t, VDUR - 0.02);
    if (Math.abs(video.currentTime - target) > 1e-4) { video.currentTime = target; await new Promise(r => (video.onseeked = r)); }
    if (video.requestVideoFrameCallback) await new Promise(r => { video.requestVideoFrameCallback(() => r()); setTimeout(r, 120); });
  }
  frame(t); return true;
};
window.__play = play; window.__T = () => T; window.__edit = EDIT;
$('bar').onclick = e => { const r = $('bar').getBoundingClientRect(); const was = playing; pause(); T = (e.clientX - r.left) / r.width * EDIT.duration; window.__seek(T).then(() => was && play()); };
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
$('stage').onclick = () => (playing ? pause() : play());

await window.__seek(T);
status('Ready: press play');
$('gate').classList.add('ready');
$('gate').onclick = () => { $('gate').style.display = 'none'; play(); };
window.__ready = true;

// ---------- code-made sounds (the end card's low boom with a shimmer tail, the particle sand) ----------
function synthBoom() {
  const sr = 48000, n = sr * 3.0, b = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: 1 }), d = b.getChannelData(0);
  let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, f = 52 - 14 * Math.min(1, t / 1.2); ph += 2 * Math.PI * f / sr;
    const body = Math.sin(ph) * Math.exp(-t * 1.1) * 0.9;
    lp += ((Math.random() * 2 - 1) - lp) * 0.08;
    const shimmer = (Math.random() * 2 - 1 - lp) * 0.05 * Math.min(1, t / 0.6) * Math.exp(-Math.max(0, t - 1.4) * 2.2);
    d[i] = (body + shimmer) * Math.min(1, t / 0.01) * (t > 2.6 ? Math.max(0, (3 - t) / 0.4) : 1); }
  return b;
}
function synthSand() {
  const sr = 48000, n = Math.floor(sr * 0.45), b = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: 1 }), d = b.getChannelData(0);
  let hp = 0, prev = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, x = Math.random() * 2 - 1; hp = 0.85 * (hp + x - prev); prev = x;
    d[i] = hp * 0.35 * Math.sin(Math.PI * t / 0.45) * (Math.random() < 0.3 ? 1.4 : 0.6); }
  return b;
}
