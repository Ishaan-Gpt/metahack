// ba2 recreation player: Tahrima's creator-studio after panel (refs/edit-ba2), rebuilt 1:1 on a Wikimedia Commons
// talking head (NASA Curious Universe host). Engine adapted from recreate/ba1/player.js: packed footage | matte video →
// WebGL compositor (graded subject over the reference's violet / red ground, frame-in-frame) → front canvas (text,
// badges, chapter card, eyeballs). Every number lives in edit.js and is measured in docs/recreate/ba2/wNN/REF.md.
// URL: ?t=<start s> &mute=1 &embed=1 &grab=1
import { EDIT } from './edit.js';

const Q = new URLSearchParams(location.search);
const W = 1080, H = 1920, MW = 960, MH = 1080, PW = 1440;
const CLIP = '/data/clips/ba2c/';
const $ = id => document.getElementById(id), status = s => ($('status').textContent = s);
window.__ready = false;

function fit() { const k = Math.min(innerWidth / W, (innerHeight - (Q.has('embed') ? 0 : 24)) / H); const s = $('stage'); s.style.transform = `scale(${k})`; s.parentElement.style.width = W * k + 'px'; s.parentElement.style.height = H * k + 'px'; }
addEventListener('resize', fit); fit();

status('Loading fonts…');
const FONTS = [['Arimo', 'Arimo-Regular.ttf', '400'], ['Arimo', 'Arimo-Bold.ttf', '700']];
await Promise.all(FONTS.map(async ([f, file, w]) => document.fonts.add(await new FontFace(f, `url(/assets/fonts/${file})`, { weight: w }).load())));

status('Loading the footage…');
const video = Object.assign(document.createElement('video'), { src: CLIP + 'pack.mp4', preload: 'auto', muted: true, playsInline: true, crossOrigin: 'anonymous' });
await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('pack.mp4 failed')); video.load(); });
const VDUR = video.duration;

status('Loading the sound…');
const AC = new AudioContext(), BUF = {};
const loadBuf = async (k, url) => { BUF[k] = await AC.decodeAudioData(await (await fetch(url)).arrayBuffer()); };
await Promise.all([loadBuf('voice', CLIP + 'voice.m4a'), ...Object.entries(EDIT.sfxFiles).map(([k, f]) => loadBuf(k, '/assets/' + f))]);

// ---------- WebGL compositor ----------
const out = $('out'), gl = out.getContext('webgl2', { preserveDrawingBuffer: Q.has('grab'), premultipliedAlpha: false, antialias: false });
const mk2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const [CF, fx] = mk2d(W, H);
const VS = `#version 300 es
in vec2 a; out vec2 uv; void main(){ uv = a*0.5+0.5; gl_Position = vec4(a,0,1); }`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tVid, tF;
uniform vec2 uO; uniform float uM;            // master → out: p = uO + uM*q
uniform float uRed;                           // ground: 0 violet wall, 1 red field
uniform vec4 uFrame; uniform float uFrameOn;  // frame-in-frame rect (out px) and its strength
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 vid(vec2 q){ q = clamp(q, vec2(0.5), vec2(959.5,1079.5)); return texture(tVid, vec2(q.x/1440., q.y/1080.)).rgb; }
float matte(vec2 q){ q = clamp(q, vec2(0.5), vec2(959.5,1079.5)); return texture(tVid, vec2((960.+q.x*0.5)/1440., q.y*0.5/1080.)).r; }
// the reference's violet wall (REF w00: sampled down two columns of the settled hook frame), placed in the hook's frame
vec3 wall(vec2 q){
  vec2 p = vec2(-457.5,-83.4) + 1.97*q;                 // where this master pixel sits in the hook's settled frame
  float v = clamp(p.y/900., 0., 1.25);
  vec3 L = mix(vec3(29.,0.,73.), vec3(53.,4.,138.), v);
  vec3 R = mix(vec3(39.,3.,82.), vec3(88.,38.,160.), v);
  vec3 c = mix(L, R, smoothstep(0.35, 1.0, p.x/1080.));
  return c/255.;
}
vec3 redField(vec2 p){ return mix(vec3(58.,0.,2.), vec3(104.,0.,3.), clamp(p.y/1350., 0., 1.2))/255.; }
vec3 grade(vec3 c){
  vec3 g = pow(max(c,0.), vec3(1.04));
  float l = lum(g); g = mix(vec3(l), g, 1.10);
  g *= vec3(1.04, 1.0, 0.97);
  g += vec3(0.020, 0.0, 0.055)*(1.0 - smoothstep(0.0, 0.25, l));   // the violet spill on dark cloth (ref shirt reads navy-violet)
  return clamp(g, 0., 1.);
}
vec3 shot(vec2 p){
  vec2 q = (p - uO)/uM;
  vec3 v = vid(q);
  float m = matte(q);
  float core = smoothstep(0.80, 0.95, m);
  float band = smoothstep(0.45, 0.80, m) * smoothstep(0.025, 0.10, lum(v));   // edge band: the black studio is not the person
  float a = max(core, band);
  vec3 bg = mix(wall(q), redField(p), uRed);
  return mix(bg, grade(v), a);
}
void main(){
  vec2 p = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec3 col = shot(p);
  if (uFrameOn > 0.) {   // outside the frame: dark violet room with a glow toward the centre (REF w05 9.4-11.3)
    vec2 c = vec2(540., 960.); float d = length((p - c)/vec2(700., 1100.));
    vec3 outside = mix(vec3(40.,12.,92.)/255., vec3(6.,2.,14.)/255., smoothstep(0.15, 1.0, d));
    float inside = step(uFrame.x, p.x)*step(p.x, uFrame.z)*step(uFrame.y, p.y)*step(p.y, uFrame.w);
    col = mix(col, mix(outside, col, inside), uFrameOn);
  }
  vec4 f = texture(tF, vec2(uv.x, 1.-uv.y));
  col = col*(1.-f.a) + f.rgb;
  o = vec4(col, 1.);
}`;
const prog = fs => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
const PM = prog(FS);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
const TV = tex(), TF = tex();
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
const um = new Proxy({}, { get: (_, k) => gl.getUniformLocation(PM, k) });
const upload = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };

const ctx = { W, H, fx };
await EDIT.prepare(ctx);
const PROF = { n: 0, draw: 0, up: 0, gl: 0 }; window.__prof = () => ({ n: PROF.n, draw: +(PROF.draw / PROF.n).toFixed(2), up: +(PROF.up / PROF.n).toFixed(2), gl: +(PROF.gl / PROF.n).toFixed(2) });
let vNew = true; const onVF = () => { vNew = true; video.requestVideoFrameCallback?.(onVF); }; video.requestVideoFrameCallback?.(onVF);
let frontWas = true;
function frame(T) {
  const t0 = performance.now();
  const s = EDIT.state(T);
  fx.clearRect(0, 0, W, H);
  const drew = EDIT.draw(T, s, ctx);
  const t1 = performance.now();
  if (T < VDUR && video.readyState >= 2 && (vNew || !playing)) { upload(TV, video); vNew = false; }
  if (drew || frontWas) upload(TF, CF); frontWas = drew;
  const t2 = performance.now();
  gl.viewport(0, 0, W, H); gl.useProgram(PM);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TV); gl.uniform1i(um.tVid, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, TF); gl.uniform1i(um.tF, 1);
  gl.uniform2f(um.uO, s.cam.ox, s.cam.oy); gl.uniform1f(um.uM, s.cam.m);
  gl.uniform1f(um.uRed, s.red ?? 0);
  const fr = s.frame ?? [0, 0, W, H, 0]; gl.uniform4f(um.uFrame, fr[0], fr[1], fr[2], fr[3]); gl.uniform1f(um.uFrameOn, fr[4]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  PROF.n++; PROF.draw += t1 - t0; PROF.up += t2 - t1; PROF.gl += performance.now() - t2;
  $('bar').firstElementChild.style.width = (100 * T / EDIT.duration) + '%';
}

// ---------- clock, playback, sound (as ba1) ----------
let playing = false, T = +(Q.get('t') || 0), wall0 = 0, T0 = 0, srcs = [];
const master = AC.createGain(); master.connect(AC.destination); master.gain.value = Q.has('mute') ? 0 : 1;
function startAudio(from) {
  const at = AC.currentTime + 0.05;
  const v = AC.createBufferSource(); v.buffer = BUF.voice; v.connect(master); if (from < BUF.voice.duration) v.start(at, from); srcs.push(v);
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
  vNew = true; frame(t); return true;
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
