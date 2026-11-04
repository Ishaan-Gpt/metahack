// self1 player: an edit made from docs/self/WHY.md with no reference open, on a Commons talking head (NASA, Ernie Wright,
// public domain). The compositor is the ba1 recreation's (copied, generalised to a 1920x1080 master), with our own grade,
// a coloured rim, a void colour per beat, a sharpen for the 1080p source, and our own post pass (the umbra wipe).
// Layers per frame: footage (packed master | matte) → grade, ground treatment → behind canvas → subject (+ rim) → front
// canvas → post. URL: ?t=<start s> &mute=1 &embed=1
import { EDIT } from './edit.js';

const Q = new URLSearchParams(location.search);
const W = 1080, H = 1920, MW = 1920, MH = 1080, PW = 2880;
const CLIP = '/data/clips/self1/';
const $ = id => document.getElementById(id), status = s => ($('status').textContent = s);
window.__ready = false;

function fit() {
  const pad = Q.has('embed') ? 0 : 24, k = Math.min(innerWidth / W, (innerHeight - pad) / H), st = $('stage');
  Object.assign(st.style, { position: 'absolute', transform: `scale(${k})`, transformOrigin: '0 0', left: (innerWidth - W * k) / 2 + 'px', top: (innerHeight - pad - H * k) / 2 + 'px' });
}
addEventListener('resize', fit); fit();

// ---------- load everything behind the gate ----------
status('Loading fonts…');
const FF = '/assets/renderer/fonts/';
await Promise.all([
  ['Archivo', 'archivo-latin-wdth-normal.woff2', { weight: '100 900', stretch: '62% 125%' }],
  ['InstrumentSerif', 'instrument-serif-latin-400-italic.woff2', { style: 'italic', weight: '400' }],
  ['InterTight', 'inter-tight-latin-wght-normal.woff2', { weight: '100 900' }],
].map(async ([f, file, d]) => document.fonts.add(await new FontFace(f, `url(${FF}${file})`, d).load())));

status('Loading the footage…');
const video = Object.assign(document.createElement('video'), { id: 'v', src: CLIP + 'pack.mp4', preload: 'auto', muted: true, playsInline: true, crossOrigin: 'anonymous' });
video.style.display = 'none'; document.body.appendChild(video);
await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('pack.mp4 failed')); video.load(); });
const VDUR = video.duration;
const MOON = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = CLIP + 'moon.png'; });

status('Loading the sound…');
const AC = new AudioContext(), BUF = {};
const loadBuf = async (k, url) => { BUF[k] = await AC.decodeAudioData(await (await fetch(url)).arrayBuffer()); };
await Promise.all([loadBuf('voice', CLIP + 'voice.m4a'), ...Object.entries(EDIT.sfxFiles).map(([k, f]) => loadBuf(k, '/assets/' + f))]);
BUF.boom = synthBoom(); BUF.sand = synthSand(); BUF.thud = synthThud();

// ---------- WebGL compositor ----------
const out = $('out'), gl = out.getContext('webgl2', { preserveDrawingBuffer: Q.has('grab'), premultipliedAlpha: false, antialias: false });
const mk2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const [CB, bx] = mk2d(W, H), [CF, fx] = mk2d(W, H);
const VS = `#version 300 es
in vec2 a; out vec2 uv; void main(){ uv = a*0.5+0.5; gl_Position = vec4(a,0,1); }`;
const FS_MAIN = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tVid, tB, tF;
uniform vec2 uO; uniform float uM;
uniform float uFall, uHide, uBgSat, uBgBri, uBgCon, uVoid, uSubSat, uRim, uRimW, uGrade, uWarm, uTime, uSharp;
uniform vec3 uVoidCol, uVoidCol2, uRimCol;
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 grade(vec3 c){
  // our grade (not a reference's): blacks set down to the basalt of the void, mids given contrast, the lavender studio
  // light pulled toward a cooler silver, skin and the maroon shirt kept warm; uWarm adds the payoff's warmth
  vec3 g = max(c - 0.035, 0.0) / 0.965;
  g = mix(g, smoothstep(0.0, 1.0, g), 0.42);
  float l = lum(g);
  float lav = smoothstep(0.02, 0.10, c.b - c.g) * smoothstep(0.03, 0.12, c.b - c.r*0.9);   // the lavender wall
  g = mix(g, vec3(l)*vec3(0.97,0.99,1.03), lav*0.55);
  g = mix(vec3(lum(g)), g, 1.08);
  g *= vec3(1.0 + 0.04*uWarm, 1.0 + 0.01*uWarm, 1.0 - 0.05*uWarm);
  g = mix(g, g*vec3(0.92,0.95,1.06), (1.0 - smoothstep(0.0, 0.35, l))*0.5);                 // cool, deep shadows
  return clamp(g, 0.0, 1.0); }
vec2 inMaster(vec2 p){ return (p - uO)/uM; }
bool inM(vec2 q){ return q.x>=0.&&q.y>=0.&&q.x<${MW}.&&q.y<${MH}.; }
vec3 vid(vec2 q){ return texture(tVid, vec2(q.x/${PW}., q.y/${MH}.)).rgb; }
float matteAt(vec2 q){ if(!inM(q)) return 0.; return texture(tVid, vec2((${MW}.+q.x*0.5)/${PW}., clamp(q.y*0.5, 1., ${MH / 2 - 1}.)/${MH}.)).r; }
float matteSoft(vec2 q){ if(!inM(q)) return 0.; return texture(tVid, vec2((${MW}.+q.x*0.5)/${PW}., (${MH / 2}.+clamp(q.y*0.5, 1., ${MH / 2 - 1}.))/${MH}.)).r; }   // clamped: no bleed between the two halves
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 p = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec2 q = inMaster(p);
  bool inside = inM(q);
  vec3 v = vec3(0.);
  if(inside){
    v = vid(q);
    // unsharp mask, radius 1 master px: the 1080p source is enlarged 1.8-2.4x
    vec3 bl = (vid(q+vec2(1.2,0.)) + vid(q-vec2(1.2,0.)) + vid(q+vec2(0.,1.2)) + vid(q-vec2(0.,1.2)))*0.25;
    v = clamp(v + (v - bl)*uSharp, 0., 1.);
  }
  float ma = smoothstep(0.30, 0.70, matteAt(q));
  ma *= 1. - uHide;
  if(q.y < 300. && lum(v) < 0.075) ma *= smoothstep(0.03, 0.075, lum(v));   // rembg keeps a patch of the black screen by his crown
  vec3 g = grade(v);
  float l = lum(g);
  vec3 bg = mix(vec3(l), g, uBgSat);
  bg = (bg - 0.5)*uBgCon + 0.5; bg = max(bg,0.)*uBgBri;
  // the void: a soft vertical ramp between two colours of one hue family
  vec3 vc = mix(uVoidCol2, uVoidCol, smoothstep(0., 1920., p.y*0.9 + 200.*sin(p.x/700.)));
  if(!inside) bg = vc;
  bg = mix(bg, vc, uVoid);
  vec4 b = texture(tB, vec2(uv.x, 1.-uv.y));
  bg = bg*(1.-b.a) + b.rgb;
  vec3 s = mix(vec3(lum(g)), g, uSubSat);
  vec3 col = mix(bg, s, ma);
  if(uRim > 0.0 && uHide < 0.5){
    float r = uRimW/uM, mx = 0., mg = 0.;
    for(int i=0;i<16;i++){ float an = 6.2831853*float(i)/16.; vec2 d = vec2(cos(an),sin(an));
      mx = max(mx, matteSoft(q + d*r)); mg = max(mg, matteSoft(q + d*r*2.8)); }
    float outside = 1. - smoothstep(0.15, 0.55, matteSoft(q));
    float line = smoothstep(0.35, 0.75, mx) * outside;
    float glow = smoothstep(0.3, 0.8, mg) * outside * 0.35;
    col = mix(col, uRimCol, clamp(line*uRim, 0., 1.));
    col += uRimCol*glow*uRim;
  }
  float fall = smoothstep(1180., 1700., p.y); col = mix(col, vec3(0.082,0.094,0.114), uFall*mix(0., 0.92, fall)*smoothstep(0.,0.6,fall*1.6));   // bottom fall-off under the captions (WHY 8)
  col += (h(p + fract(uTime*7.)*100.) - 0.5)*0.022;                    // fine grain over everything (hides the enlargement)
  vec4 f = texture(tF, vec2(uv.x, 1.-uv.y));
  col = col*(1.-f.a) + f.rgb;
  o = vec4(col,1.);
}`;
const FS_POST = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tM; uniform float uTime;
uniform vec4 uUmbra;   // x: disc centre x px, y: radius px, z: on, w: copper of the umbra
uniform float uFade;   // to the end card ground
uniform vec3 uFadeCol;
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
void main(){
  vec2 p = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec3 c = texture(tM, uv).rgb;
  if(uUmbra.z > 0.){
    // the Earth's shadow crossing the frame: a soft penumbra, a copper-red umbra (an eclipsed moon's colour), a thin
    // bright limb on its leading edge. Inside, the picture stays visible, dimmed and tinted: never a black frame.
    float d = length(p - vec2(uUmbra.x, 960.)) - uUmbra.y;
    float inner = 1. - smoothstep(-160., 0., d);
    float pen = 1. - smoothstep(-160., 140., d);
    vec3 um = vec3(lum(c))*vec3(0.62,0.30,0.20)*1.25 + vec3(0.07,0.03,0.025);
    c = mix(c, c*0.55, pen*0.6);
    c = mix(c, um, inner);
    float limb = exp(-pow(d/9., 2.));
    c += vec3(1.0,0.72,0.52)*limb*0.55*uUmbra.w;
  }
  c = mix(c, uFadeCol, uFade);
  o = vec4(clamp(c,0.,1.),1.);
}`;
const prog = (fs) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
const PM = prog(FS_MAIN), PP = prog(FS_POST);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
const TV = tex(), TB = tex(), TF = tex(), TM = tex();
gl.bindTexture(gl.TEXTURE_2D, TM); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
const FB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, FB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, TM, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
const U = (p) => new Proxy({}, { get: (_, k) => gl.getUniformLocation(p, k) });
const um = U(PM), up = U(PP);
const upload = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };

// ---------- one frame ----------
// a layer is re-uploaded only when something was drawn on it this frame or the last (ba1's dirty tracking)
const DIRTY = { b: false, f: false }, WAS = { b: true, f: true };
const track = (c, k) => new Proxy(c, { get(o, p) { const v = o[p]; return typeof v === 'function' ? (...a) => { if (p !== 'clearRect' && p !== 'save' && p !== 'restore' && p !== 'measureText') DIRTY[k] = true; return v.apply(o, a); } : v; }, set(o, p, v) { o[p] = v; return true; } });
const ctx = { W, H, bx: track(bx, 'b'), fx: track(fx, 'f'), moon: MOON };
EDIT.prepare(ctx);
let vNew = true; const onVF = () => { vNew = true; video.requestVideoFrameCallback?.(onVF); }; video.requestVideoFrameCallback?.(onVF);
const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
function frame(T) {
  const s = EDIT.state(T);
  if (WAS.b) bx.clearRect(0, 0, W, H); if (WAS.f) fx.clearRect(0, 0, W, H);
  DIRTY.b = DIRTY.f = false;
  EDIT.draw(T, s, ctx);
  if (T < VDUR && video.readyState >= 2 && (vNew || !playing)) { upload(TV, video); vNew = false; }
  for (const [k, t, c] of [['b', TB, CB], ['f', TF, CF]]) { if (DIRTY[k] || WAS[k]) upload(t, c); WAS[k] = DIRTY[k]; }
  gl.viewport(0, 0, W, H);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FB); gl.useProgram(PM);
  [[TV, 'tVid'], [TB, 'tB'], [TF, 'tF']].forEach(([t, n], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(um[n], i); });
  gl.uniform2f(um.uO, s.cam.ox, s.cam.oy); gl.uniform1f(um.uM, s.cam.m);
  for (const k of ['uFall', 'uHide', 'uBgSat', 'uBgBri', 'uBgCon', 'uVoid', 'uSubSat', 'uRim', 'uRimW', 'uGrade', 'uWarm', 'uSharp']) gl.uniform1f(um[k], s.g[k]);
  gl.uniform3fv(um.uVoidCol, hex(s.g.void[0])); gl.uniform3fv(um.uVoidCol2, hex(s.g.void[1])); gl.uniform3fv(um.uRimCol, hex(s.g.rimCol));
  gl.uniform1f(um.uTime, T);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(PP);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TM); gl.uniform1i(up.tM, 0);
  gl.uniform1f(up.uTime, T); gl.uniform4fv(up.uUmbra, s.p.uUmbra); gl.uniform1f(up.uFade, s.p.uFade); gl.uniform3fv(up.uFadeCol, hex(s.p.fadeCol));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  $('bar').firstElementChild.style.width = (100 * T / EDIT.duration) + '%';
}

// ---------- clock, playback, sound (the audio clock is the master) ----------
let playing = false, T = +(Q.get('t') || 0), wall0 = 0, T0 = 0, srcs = [];
const master = AC.createGain(); master.connect(AC.destination); master.gain.value = Q.has('mute') ? 0 : 1;
function startAudio(from) {
  const at = AC.currentTime + 0.05;
  const v = AC.createBufferSource(); v.buffer = BUF.voice; v.connect(master);
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
window.__seek = async t => {
  pause(); T = t;
  if (t < VDUR) {
    const target = Math.min(t, VDUR - 0.02);
    if (Math.abs(video.currentTime - target) > 1e-4) { video.currentTime = target; await new Promise(r => (video.onseeked = r)); }
    if (video.requestVideoFrameCallback) await new Promise(r => { video.requestVideoFrameCallback(() => r()); setTimeout(r, 120); });
  }
  frame(t); return true;
};
window.__play = play; window.__T = () => T; window.__edit = EDIT; window.__mute = m => { master.gain.value = m ? 0 : 1; }; window.__vt = () => video.currentTime;
$('bar').onclick = e => { const r = $('bar').getBoundingClientRect(); const was = playing; pause(); T = (e.clientX - r.left) / r.width * EDIT.duration; window.__seek(T).then(() => was && play()); };
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
$('stage').onclick = () => (playing ? pause() : play());

await window.__seek(T);
status('Ready: press play');
$('gate').classList.add('ready');
if (Q.has('embed')) { $('gate').style.display = 'none'; $('bar').style.display = 'none'; }
$('gate').onclick = () => { $('gate').style.display = 'none'; play(); };
window.__ready = true;

// ---------- code-made sounds ----------
function synthBoom() {   // a low swell with a quiet high shimmer: the end card
  const sr = 48000, n = sr * 2.4, b = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: 1 }), d = b.getChannelData(0);
  let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, f = 48 - 10 * Math.min(1, t / 1.2); ph += 2 * Math.PI * f / sr;
    const body = Math.sin(ph) * Math.exp(-t * 1.4) * 0.8;
    lp += ((Math.random() * 2 - 1) - lp) * 0.08;
    const shimmer = (Math.random() * 2 - 1 - lp) * 0.04 * Math.min(1, t / 0.5) * Math.exp(-Math.max(0, t - 1.0) * 2.4);
    d[i] = (body + shimmer) * Math.min(1, t / 0.02) * (t > 2.0 ? Math.max(0, (2.4 - t) / 0.4) : 1); }
  return b;
}
function synthSand() {   // a dry grain texture under the eroding words
  const sr = 48000, n = Math.floor(sr * 0.9), b = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: 1 }), d = b.getChannelData(0);
  let hp = 0, prev = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, x = Math.random() * 2 - 1; hp = 0.86 * (hp + x - prev); prev = x;
    d[i] = hp * 0.3 * Math.sin(Math.PI * t / 0.9) * (Math.random() < 0.25 ? 1.5 : 0.55); }
  return b;
}
function synthThud() {   // a short low hit for the shadow's arrival
  const sr = 48000, n = Math.floor(sr * 0.7), b = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: 1 }), d = b.getChannelData(0);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, f = 70 - 30 * Math.min(1, t / 0.25); ph += 2 * Math.PI * f / sr;
    d[i] = Math.sin(ph) * Math.exp(-t * 6) * Math.min(1, t / 0.004) * 0.9; }
  return b;
}
