// ba3 recreation player: Daniel's "$10 vs $80" after panel (refs/edit-ba2-ba4-WHY.md, edit-ba3) rebuilt 1:1 on a
// Wikimedia Commons talking head. Every UI element is DOM/CSS/SVG drawn per frame from render(t); t is the A-roll's own
// clock (data/clips/ba3c/aroll.mp4 is cut to the reference's 17.88 s with joins on its cuts). Numbers are the
// reference's, measured from its after panel at 1080x1920 (docs/recreate/ba3/wNN/REF.md). URL: ?t=<start> &mute=1
const Q = new URLSearchParams(location.search);
const W = 1080, H = 1920, DUR = 17.88;
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
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); const n = d.firstChild; ST.appendChild(n); return n; };
const css = (n, o) => { for (const k in o) n.style[k] = o[k]; };
const show = (n, on) => { n.style.visibility = on ? 'visible' : 'hidden'; };   // visibility, so flex layouts keep their display

// colours sampled from the reference frames
const C = { ink: '#1d1d1f', grey: '#8a8a8e', red: '#e5484d', blue: '#0b84ff', pill: '#f6ebe2', orange: '#f27c3a', card: '#0d0c0b' };
const GRADE = 'brightness(.86) contrast(1.22) saturate(.92)';
const GOLD = 'linear-gradient(90deg,#f6c983 0%,#fbe6b0 38%,#f8d08a 62%,#ec9a45 100%)';
const TIMEG = 'linear-gradient(180deg,#f9b46e 0%,#f38a3f 100%)';

const ground = el(`<div class="L" style="width:1080px;height:1920px;background:#fff"></div>`);
const peach = el(`<div class="L" style="width:1080px;height:1920px;background:linear-gradient(162deg,#f8cf9c 0%,#fbe1c2 30%,#fdf1e5 55%,#fffaf6 75%,#ffffff 100%)"></div>`);

// A-roll: one clip box (position/size/radius animate) holding the video, laid out in stage coordinates inside it
const box = el(`<div class="L" style="overflow:hidden;background:#000"></div>`);
const video = document.createElement('video');
Object.assign(video, { id: 'v', src: '/data/clips/ba3c/aroll.mp4', preload: 'auto', playsInline: true, crossOrigin: 'anonymous' });
video.muted = Q.has('mute');
css(video, { filter: 'none', position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', transformOrigin: '0 0' });
box.appendChild(video);
const tint = el(`<div class="L" style="pointer-events:none"></div>`); box.appendChild(tint);
css(tint, { width: '100%', height: '100%', position: 'absolute' });

// hook caption
const cap = el(`<div class="L" style="width:1080px;text-align:center;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.45)">
  <div id="c1" style="position:absolute;left:0;width:1080px;top:902px;font:400 47px/1 Inter;letter-spacing:-.3px"></div>
  <div id="c2" style="position:absolute;left:0;width:1080px;top:968px;font:700 94px/1 Inter;letter-spacing:-1px"><span style="background:${GOLD};-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(240,170,80,.35))">DRIVERS</span></div>
</div>`);
const c1 = cap.querySelector('#c1'), c2 = cap.querySelector('#c2');
const W1 = ['one', 'of', 'the', 'fastest'], W1T = [0.0, 0.04, 0.08, 0.13];   // ref: the line leads the voice, all four words in by 0.15 (blurred), sharp by 0.3
c1.innerHTML = W1.map(w => `<span style="display:inline-block;margin:0 6px">${w}</span>`).join('');

// chart card (design size 788x494, measured at 3.0 s)
const PTS = [[112, 357], [145, 330], [202, 344], [244, 309], [287, 295], [332, 234], [394, 305], [407, 269], [467, 285], [502, 257], [657, 186]];
const chart = el(`<div class="L" style="width:788px;height:494px;border-radius:46px;background:radial-gradient(120% 90% at 70% 45%,#1b1510 0%,${C.card} 60%);border:2px solid #3d3b39;box-shadow:0 22px 44px rgba(0,0,0,.22),0 3px 8px rgba(0,0,0,.18);transform-origin:0 0;color:#fff;overflow:hidden">
  <div style="position:absolute;left:67px;top:40px;font:400 36px/1 Inter;letter-spacing:-.4px">Your Pace</div>
  <div style="position:absolute;left:65px;top:92px;font:700 49px/1 Inter;letter-spacing:-.8px">1:42.318</div>
  <div style="position:absolute;left:67px;top:155px;font:400 17px/1 Inter;color:#d9d9d9">−3.4s from yesterday</div>
  <svg width="788" height="494" style="position:absolute;left:0;top:0;overflow:visible">
    <defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#e2772c"/><stop offset=".55" stop-color="#f4b14f"/><stop offset="1" stop-color="#ffe09a"/></linearGradient>
    <filter id="gl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${[222, 282, 341, 399].map(y => `<line x1="70" x2="706" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.42)" stroke-width="1.6" stroke-dasharray="2.2 3"/>`).join('')}
    <circle id="hd" r="7" fill="#fff3d6" filter="url(#gl)"/>
    <polyline id="pl" points="${PTS.map(p => p.join(',')).join(' ')}" fill="none" stroke="url(#lg)" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#gl)"/>
  </svg>
  <div id="lab" style="position:absolute;left:512px;top:160px;font:500 40px/1 Inter;color:#f2b24e;text-shadow:0 0 14px rgba(242,170,70,.5);letter-spacing:-.5px">−3.4s</div>
  <div id="pill" style="position:absolute;left:520px;top:63px;width:207px;height:58px;border-radius:29px;border:2.2px solid #d8a14b;background:#14100b;box-shadow:0 0 12px rgba(216,161,75,.35);font:400 35px/53px Inter;text-align:center;letter-spacing:-.4px">faster</div>
</div>`);
const hd = chart.querySelector('#hd'), pl = chart.querySelector('#pl'), lab = chart.querySelector('#lab'), pill = chart.querySelector('#pill');
let PLEN = 0; for (let i = 1; i < PTS.length; i++) PLEN += Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]);
pl.style.strokeDasharray = PLEN;

// "today" with its gold swash, then "discover Digit's [GT 7 chip]"
const w1 = el(`<div class="L" style="font:500 96px/1 Inter;color:${C.ink};letter-spacing:-1.4px;white-space:nowrap">today
  <svg width="250" height="40" style="position:absolute;left:-14px;top:104px;overflow:visible"><path id="sw" d="M4 30 C 70 14, 150 8, 246 10" fill="none" stroke="#efb64a" stroke-width="5" stroke-linecap="round"/></svg></div>`);
const sw = w1.querySelector('#sw'); sw.style.strokeDasharray = 250;
const w2 = el(`<div class="L" style="width:1080px;display:flex;justify-content:center;align-items:flex-end;gap:22px;font:500 66px/1 Inter;color:${C.ink};letter-spacing:-.8px;white-space:nowrap">
  <span id="w2a" style="margin-right:20px">discover</span><span id="w2b" style="margin-right:20px">Digit's</span>
  <span id="chip" style="display:inline-block;width:113px;height:96px;border-radius:18px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.14),0 1px 3px rgba(0,0,0,.12);overflow:hidden;position:relative;top:-6px">
    <span style="display:block;height:30px;background:#ec4b47;color:#fff;font:700 17px/30px Inter;text-align:center;letter-spacing:1px">GT</span>
    <span style="display:block;font:500 40px/62px Inter;text-align:center;color:#333">7</span></span></div>`);
const w2a = w2.querySelector('#w2a'), w2b = w2.querySelector('#w2b'), chip = w2.querySelector('#chip');

// checklist under the avatar (ref: icon x 247, text x 315, rows centred y 1069 / 1162)
const badge = `<span style="display:inline-block;width:48px;height:48px;border-radius:9px;background:${C.red};position:relative;margin-right:20px;flex:none"><svg width="48" height="48" style="position:absolute;left:0;top:0"><path d="M15 15 L33 33 M33 15 L15 33" stroke="#fff" stroke-width="4.6" stroke-linecap="round"/></svg></span>`;
const L1 = ['also', 'a', 'great', 'database'], L1T = [6.33, 6.37, 6.41, 6.45], L2 = ['for', 'players', 'in'], L2T = [7.50, 7.56, 7.62];
const mkRow = (ws, y) => el(`<div class="L" style="left:247px;top:${y - 24}px;display:flex;align-items:center;font:400 39px/1 Inter;color:${C.ink};letter-spacing:-.4px;white-space:nowrap">${badge}${ws.map(w => `<span style="display:inline-block;margin-right:10px">${w}</span>`).join('')}</div>`);
const row1 = mkRow(L1, 1069), row2 = mkRow(L2, 1162);

// community circle: the avatar turns into a dark disc with a steering wheel (ref: clock, d 339 at 538,733)
const wheel = el(`<svg class="L" width="339" height="339" viewBox="-170 -170 340 340"><g fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round">
  <circle id="wr" r="74"/><path id="ws" d="M-72 -6 L-22 -2 M72 -6 L22 -2 M0 22 L0 72"/><circle r="18" fill="#fff" stroke="none"/></g></svg>`);
const wr = wheel.querySelector('#wr'), wsp = wheel.querySelector('#ws');
const cm1 = el(`<div class="L" style="width:1080px;text-align:center;top:0;font:400 50px/1 Inter;color:${C.ink};letter-spacing:-.5px"></div>`);
const CW = ['in', 'the', 'Gran', 'Turismo', '7'], CWT = [8.72, 8.78, 8.84, 8.92, 9.00]   // ref '90 percent of' lead (8.75-8.95), not our voice;
cm1.innerHTML = CW.map(w => `<span style="display:inline-block;margin:0 5px">${w}</span>`).join('');
const cm2 = el(`<div class="L" style="width:1080px;text-align:center;font:800 86px/1 Inter;letter-spacing:-1.5px"><span style="background:${TIMEG};-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 16px rgba(242,130,60,.45))">COMMUNITY</span></div>`);

// white circle wipe holding the App Store search
const wipe = el(`<div class="L" style="border-radius:50%;background:#fff;overflow:hidden"></div>`);
const store = document.createElement('div'); wipe.appendChild(store);
css(store, { position: 'absolute', width: '1080px', height: '1920px' });
const appIcon = (s) => `<span style="display:inline-block;width:${s}px;height:${s}px;border-radius:${s * .24}px;background:linear-gradient(135deg,#1f2a44,#0d1220);position:relative;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)"><span style="position:absolute;inset:0;display:grid;place-items:center;font:800 ${s * .38}px/1 Inter;color:#fff;letter-spacing:-1px"><span><span style="color:#ff4b4b">D</span>G</span></span></span>`;
const rowHTML = `<div class="row" style="position:absolute;width:764px;height:154px;border-radius:18px;background:#f2f2f4;box-shadow:0 2px 6px rgba(0,0,0,.05);display:flex;align-items:center;padding:0 26px;gap:22px">
  ${appIcon(86)}<div style="flex:1;white-space:nowrap;overflow:hidden"><div style="font:500 43px/1.1 Inter;color:${C.ink};letter-spacing:-.6px">Digit Racing</div><div style="font:400 25px/1.3 Inter;color:#8a8a8e">Sim racing coach, lap data</div></div>
  <span class="dl" style="display:inline-block;flex:none;width:170px;height:56px;border-radius:28px;background:${C.blue};color:#fff;font:500 27px/56px Inter;text-align:center">Download</span></div>`;
store.innerHTML = `<div id="sg" style="position:absolute;left:0;top:0;width:1080px;height:1920px">
  <div style="position:absolute;left:156px;top:450px;font:700 76px/1 Inter;color:${C.ink};letter-spacing:-1.4px">Search</div>
  <div style="position:absolute;left:849px;top:450px;width:74px;height:74px;border-radius:50%;background:#8e8e93;color:#fff;font:600 28px/74px Inter;text-align:center">IS</div>
  <div style="position:absolute;left:155px;top:552px;width:769px;height:83px;border-radius:22px;background:#eeeef0;display:flex;align-items:center;padding:0 24px;gap:14px;color:#8a8a8e;font:400 37px/1 Inter;letter-spacing:-.4px">
    <svg width="30" height="30"><circle cx="12" cy="12" r="9" fill="none" stroke="#8a8a8e" stroke-width="3.2"/><path d="M19 19 L27 27" stroke="#8a8a8e" stroke-width="3.4" stroke-linecap="round"/></svg>
    <span style="flex:1">Games, Apps, Stories and More</span>
    <svg width="22" height="32"><rect x="6" y="1" width="10" height="19" rx="5" fill="#8a8a8e"/><path d="M2 14 Q2 25 11 25 Q20 25 20 14 M11 25 L11 31" fill="none" stroke="#8a8a8e" stroke-width="2.6"/></svg></div>
  <div style="position:absolute;left:154px;top:700px;font:600 54px/1 Inter;color:${C.ink};letter-spacing:-.8px">Suggested</div>
  <div id="r1" style="position:absolute;left:159px;top:839px">${rowHTML}</div></div>`;
const sg = store.querySelector('#sg'), r1 = store.querySelector('#r1');

// zoomed row + cursor (scale 2.6, measured from the 11.0-11.6 frames)
const zrow = el(`<div class="L" style="transform-origin:0 0">${rowHTML}</div>`); const zdl = zrow.querySelector('.dl');
const hand = el(`<svg class="L" width="60" height="66" viewBox="0 0 30 33"><path d="M10 2.5c1.3 0 2.2 1 2.2 2.3v8.1l1-.2c.3-1 1.1-1.6 2.1-1.6 1.1 0 1.9.7 2.1 1.7h.3c.4-.9 1.2-1.4 2.1-1.4 1.2 0 2.1.9 2.2 2.1.3-.2.8-.3 1.2-.3 1.3 0 2.2 1 2.2 2.3v6.6c0 4.6-3.2 8.4-8 8.4h-2.3c-2.6 0-4.4-1.1-5.9-3.2L4.6 20c-.8-1.1-.6-2.5.4-3.2.9-.6 2.2-.4 3 .5l.8 1V4.8c0-1.3.9-2.3 2.2-2.3z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/><path d="M15.3 14v6M19.6 14.5v5.5M23.7 16v4" stroke="#111" stroke-width="1.2" stroke-linecap="round"/></svg>`);
const arrow = el(`<svg class="L" style="z-index:4" width="40" height="56" viewBox="0 0 20 28"><path d="M2 1.5 L2 22 L7 17.3 L10.4 25.4 L13.6 24 L10.3 16.2 L17 16.2 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`);

// caption over the A-roll after the expand (ref "GOOGLE CALENDAR", y ~975-1000)
const gcap = el(`<div class="L" style="width:1080px;text-align:center;top:990px;font:700 68px/1 Inter;letter-spacing:-.3px;white-space:nowrap">
  <span id="g1" style="display:inline-block;background:linear-gradient(180deg,#f3d79b,#d6a456);-webkit-background-clip:text;background-clip:text;color:transparent">DIGIT</span>
  <span id="g2" style="display:inline-block;margin-left:14px;background:linear-gradient(180deg,#f3d79b,#d6a456);-webkit-background-clip:text;background-clip:text;color:transparent">RACING</span></div>`);
const g1 = gcap.querySelector('#g1'), g2 = gcap.querySelector('#g2');

// schedule pills (ref x 191-886, centres y 868 / 1065 / 1262 / 1461)
const PILLS = [['Racecraft drills', 'Today  9:30 AM'], ['Skill set review', 'Today  10:30 AM'], ['Practice laps', 'Today  13:30 PM'], ['Coaching call', 'Today  15:30 PM']];
const PT = [12.98, 13.36, 13.62, 14.02], PY = [868, 1065, 1262, 1461];
const icon = `<span style="flex:none;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ff9a5c,${C.orange});display:grid;place-items:center;box-shadow:0 4px 10px rgba(242,124,58,.35)"><svg width="44" height="44" viewBox="0 0 30 30"><rect x="3" y="6" width="24" height="20" rx="4" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M3 12 H27 M9 3 V8 M21 3 V8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></span>`;
const pills = PILLS.map(([a, b]) => el(`<div class="L" style="width:695px;height:150px;border-radius:75px;background:${C.pill};display:flex;align-items:center;gap:30px;padding:0 30px;transform-origin:50% 50%;box-shadow:0 8px 24px rgba(160,110,70,.10)">${icon}<div><div style="font:500 49px/1.12 Inter;color:${C.ink};letter-spacing:-.7px">${a}</div><div style="font:400 33px/1.25 Inter;color:#55514d">${b}</div></div></div>`));

// notification (ref 665 x ~150 at y ~1065; close-up x2.6)
const notifHTML = `<div style="width:665px;height:150px;border-radius:30px;background:rgba(236,236,236,.97);display:flex;align-items:center;gap:22px;padding:0 24px;box-shadow:0 10px 30px rgba(0,0,0,.35)">
  <span style="flex:none;width:96px;height:100px;border-radius:20px;background:#fff;text-align:center;padding-top:8px"><span style="display:block;font:500 21px/1 Inter;color:${C.red}">Fri</span><span style="display:block;font:400 54px/1.2 Inter;color:#222;letter-spacing:-1px">14</span></span>
  <div style="flex:1;white-space:nowrap;overflow:hidden"><div style="font:600 30px/1.2 Inter;color:#1d1d1f;letter-spacing:-.4px">Start Your Journey</div><div style="font:400 27px/1.25 Inter;color:#444"><span style="color:${C.red}">sim racing</span> content</div></div>
  <span style="align-self:flex-start;margin-top:30px;font:400 18px/1 Inter;color:#8a8a8e;white-space:nowrap">7/14, 3:00 PM</span></div>`;
const notif = el(`<div class="L" style="transform-origin:0 0;z-index:3">${notifHTML}</div>`);

const mark = el(`<div class="L" style="width:1080px;text-align:center;top:1797px;font:500 40px/1 Inter;letter-spacing:-.3px">ishaan.motion</div>`);

// ---------- the timeline ----------
const blurIn = (n, t, t0, d = .16, dy = 10, blur = 8) => { const k = seg(t, t0, t0 + d); css(n, { opacity: k, filter: k < 1 ? `blur(${(1 - k) * blur}px)` : 'none', transform: `translateY(${(1 - eo(k)) * dy}px)` }); };
// A-roll box: [t, cx, cy, w, h] tables, measured (6.235-7.0 shrink, 12.8-14.3 shrink, 11.65-12.08 expand)
const SHRINK1 = [[6.235, 540, 960, 1080, 1920], [6.27, 537, 850, 815, 1300], [6.33, 537, 805, 665, 960], [6.40, 537, 755, 515, 620], [6.47, 537, 720, 405, 360], [6.53, 537, 710, 375, 290], [6.60, 537, 715, 395, 340], [6.67, 537, 730, 435, 430], [6.73, 537, 737, 465, 495], [6.80, 537, 740, 465, 510], [6.90, 538, 736, 455, 478], [7.0, 538, 733, 448, 457]];
const SHRINK2 = [[12.83, 540, 960, 1080, 1920], [12.87, 540, 840, 960, 1640], [12.93, 537, 735, 815, 1300], [13.0, 537, 627, 665, 955], [13.07, 537, 500, 515, 570], [13.13, 537, 440, 395, 350], [13.20, 537, 418, 365, 275], [13.27, 535, 430, 390, 330], [13.30, 537, 449, 413, 384], [13.70, 538, 464, 431, 426], [14.30, 538, 470, 440, 445]];
const EXPAND = [[11.60, 537, 832, 156 * 2.6, 52 * 2.6, 26 * 2.6], [11.65, 570, 832, 713, 435, 200], [11.75, 560, 832, 1150, 900, 440], [11.85, 550, 840, 1500, 1535, 600], [11.95, 545, 900, 1300, 1800, 300], [12.08, 540, 960, 1080, 1920, 0]];
const ROWR = [[11.0, 1150], [11.1, 1060], [11.15, 1024], [11.25, 959], [11.35, 907], [11.45, 888], [11.6, 880]];
const CHARTW = [[1.835, .56], [1.867, .624], [2.0, .731], [2.2, .826], [2.4, .886], [2.6, .928], [2.8, .957], [3.0, .980], [3.2, .992], [3.4, 1]];
const CHARTX = [[1.835, 544], [3.0, 546], [3.068, 544], [3.135, 540], [3.201, 533], [3.268, 524], [3.335, 512], [3.402, 496], [3.468, 473], [3.504, 462]];
const ZOOMR = [[3.504, 1100], [3.535, 1075], [3.602, 1030], [3.669, 999], [3.735, 976], [3.802, 958], [3.869, 943], [3.935, 930], [4.002, 917], [4.069, 904], [4.136, 890], [4.202, 875], [4.269, 858], [4.336, 836], [4.403, 808], [4.469, 768], [4.505, 745]];
const DRAW = [[1.84, 0], [1.897, .18], [1.963, .33], [2.03, .48], [2.097, .59], [2.164, .70], [2.23, .77], [2.297, .86], [2.364, .92], [2.431, .95], [2.497, .975], [2.56, 1]];
const NOTIFX = [[16.45, 420], [16.6, 155], [16.8, 78], [16.9, 53], [17.88, 36]];
const HANDP = [[11.0, 1060, 1180], [11.15, 823, 1037], [11.25, 690, 975], [11.35, 640, 945], [11.45, 612, 942], [11.6, 598, 940]];
const ARROWP = [[14.9, 470, 1010], [15.2, 520, 975], [15.5, 548, 968], [15.8, 640, 1090], [16.1, 990, 1150], [16.45, 1130, 1330]];

function aroll(t) {   // where the A-roll box is (null = hidden); returns {x,y,w,h,r,vs,vx,vy}
  const full = { x: 0, y: 0, w: W, h: H, r: 0 };
  if (t < 1.835) return full;
  if (t >= 6.235 && t < 10.04) {
    let [cx, cy, w, h] = tab(SHRINK1, t), r = t < 6.27 ? 30 * seg(t, 6.235, 6.27) : Math.min(w, h) * .13;
    if (t >= 8.5) { const k = eo(seg(t, 8.5, 8.62)); w = lerp(448, 339, k); h = lerp(457, 339, k); r = lerp(r, 170, k); }
    return { x: cx - w / 2, y: cy - h / 2, w, h, r };
  }
  if (t >= 11.6 && t < 12.85) { const [cx, cy, w, h, r] = tab(EXPAND, t); return { x: cx - w / 2, y: cy - h / 2, w, h, r }; }
  if (t >= 12.85 && t < 14.65) { const [cx, cy, w, h] = tab(SHRINK2, t); return { x: cx - w / 2, y: cy - h / 2, w, h, r: Math.min(w, h) * .13 }; }
  if (t >= 14.65) {
    if (t < 15.05) { const k = eo(seg(t, 14.62, 14.98)); const w = lerp(440, W, k), h = lerp(445, H, k), cx = lerp(538, 540, k), cy = lerp(470, 960, k); return { x: cx - w / 2, y: cy - h / 2, w, h, r: lerp(57, 0, k) }; }   // ref: 158-918 x 97-1230 already at 14.7
    return full;
  }
  return null;
}

function render(t) {
  // grounds
  const peachK = t >= 8.5 && t < 10.5 ? seg(t, 8.5, 8.9) : 0;
  peach.style.opacity = peachK; show(peach, peachK > 0);

  // A-roll
  const a = aroll(t);
  show(box, !!a); box.style.zIndex = t >= 14.65 && t < 15.05 ? 2 : 0;
  if (a) {
    css(box, { transform: `translate(${a.x}px,${a.y}px)`, width: a.w + 'px', height: a.h + 'px', borderRadius: a.r + 'px' });
    // video: cover the box, face held at the box centre; extra punch for the small avatar (ref face fills ~60%)
    let s = Math.max(a.w / W, a.h / H), fx = 0.59 * W, fy = 0.30 * H;
    if (a.w < 700) s *= 1.35;
    let vx = a.w / 2 - fx * s, vy = a.h / 2 - fy * s;
    if (a.w >= W - 1) { vx = 0; vy = 0; s = 1; }
    let blur = 0, extra = 1;
    if (t < 0.2) { extra = lerp(1.45, 1, eo(seg(t, 0, .2))); blur = lerp(16, 0, seg(t, 0, .2)); }   // opening pull-out (ref 0-0.2)
    if (t >= 11.6 && t < 12.08) extra = lerp(1.5, 1, eo(seg(t, 11.65, 12.08)));
    if (t >= 16.45) { extra = 2.35; blur = 7; }                                                          // close-up behind the notification
    if (extra !== 1) { const cxp = a.w / 2, cyp = t >= 16.45 ? 1300 : a.h / 2; vx = cxp - (cxp - vx) * extra; vy = cyp - (cyp - vy) * extra; s *= extra; }   // close-up on the chest and mic, like the reference
    css(video, { transform: `translate(${vx}px,${vy}px) scale(${s})`, filter: `${blur > .2 ? `blur(${blur}px) ` : ''}${GRADE}${t >= 16.45 ? ' brightness(.62)' : ''}` });
    // tints: the Download button's blue fading out of the blob; the disc going dark
    let tb = 'transparent', to = 0;
    if (t >= 11.6 && t < 11.8) { tb = C.blue; to = 1 - seg(t, 11.6, 11.78); }
    if (t >= 8.6 && t < 10.04) { tb = t < 9.96 ? '#1b1918' : '#ffffff'; to = t < 9.96 ? seg(t, 8.6, 8.78) : seg(t, 9.96, 10.04); }
    css(tint, { background: tb, opacity: to });
  }

  // hook caption
  show(cap, t < 1.835);
  if (t < 1.835) {
    [...c1.children].forEach((s, i) => blurIn(s, t, W1T[i], .16, 8, 10));
    const k = seg(t, .32, .50); css(c2, { opacity: k, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : 'none', transform: `translateY(${(1 - eo(k)) * 12}px)` });
  }

  // chart card + zoom
  const inChart = t >= 1.835 && t < 4.505; show(chart, inChart);
  if (inChart) {
    let sc, x, y;
    if (t < 3.504) { sc = tab(CHARTW, t)[0]; x = tab(CHARTX, t)[0] - 394 * sc; y = 963 - 247 * sc; }
    else { sc = 1.972; x = tab(ZOOMR, t)[0] - 788 * sc; y = 507; }
    css(chart, { transform: `translate(${x}px,${y}px) scale(${sc})`, opacity: t < 1.87 ? seg(t, 1.835, 1.87) : 1 });
    const dp = tab(DRAW, t)[0]; pl.style.strokeDashoffset = PLEN * (1 - dp);
    { let L = dp * PLEN, i = 1; for (; i < PTS.length; i++) { const l = Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]); if (L <= l) break; L -= l; } i = Math.min(i, PTS.length - 1);
      const l = Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]) || 1, k = clamp(L / l); hd.setAttribute('cx', lerp(PTS[i - 1][0], PTS[i][0], k)); hd.setAttribute('cy', lerp(PTS[i - 1][1], PTS[i][1], k)); hd.style.opacity = dp > 0 && dp < 1 ? 1 : 0; }
    lab.style.opacity = seg(t, 2.33, 2.45);
    show(pill, t >= 3.504);
  }

  // today → discover Digit's
  const inW = t >= 4.505 && t < 6.235; show(w1, inW && t < 5.5); show(w2, inW && t >= 5.33);
  if (inW) {
    const cx = tab([[4.505, 690], [4.6, 665], [4.8, 610], [5.0, 572], [5.3, 541], [5.5, 535]], t)[0];
    css(w1, { transform: `translate(${cx - 118}px,872px)`, opacity: 1 - seg(t, 5.36, 5.5), filter: t > 5.36 ? `blur(${seg(t, 5.36, 5.5) * 10}px)` : 'none' });
    sw.style.strokeDashoffset = 250 * (1 - eo(seg(t, 4.52, 4.78)));
    css(w2, { transform: 'translate(0px,890px)' });
    blurIn(w2a, t, 5.36, .2, 0, 14); blurIn(w2b, t, 5.62, .2, 0, 12);
    const kc = seg(t, 5.62, 5.86); css(chip, { opacity: kc, transform: `translateY(${-38 * (1 - eo(kc))}px) scale(${lerp(.7, 1, eo(kc))})` });
  }

  // checklist
  const inL = t >= 6.3 && t < 8.5; show(row1, inL); show(row2, inL && t >= 7.5);
  if (inL) {
    const b1 = row1.firstChild, b2 = row2.firstChild;
    blurIn(b1, t, 6.30, .14, 0, 4);
    [...row1.children].slice(1).forEach((s, i) => blurIn(s, t, L1T[i], .13, -16, 8));
    blurIn(b2, t, 7.50, .14, 0, 4);
    [...row2.children].slice(1).forEach((s, i) => blurIn(s, t, L2T[i], .13, -16, 8));
  }

  // community disc
  const inC = t >= 8.62 && t < 10.25; show(wheel, inC && t < 10.04); show(cm1, inC); show(cm2, inC && t >= 9.1);
  if (inC) {
    const k = eo(seg(t, 8.65, 8.95));
    css(wheel, { transform: `translate(${538 - 169.5}px,${733 - 169.5}px)`, opacity: seg(t, 8.62, 8.75) });
    wr.style.strokeDasharray = 465; wr.style.strokeDashoffset = 465 * (1 - k);
    wsp.style.opacity = seg(t, 8.75, 8.95);
    const up = lerp(0, -12, seg(t, 9.2, 9.6));
    css(cm1, { transform: `translateY(${975 + up}px)` }); [...cm1.children].forEach((s, i) => blurIn(s, t, CWT[i], .18, -10, 8));
    { const f = seg(t, 10.0, 10.22); css(cm1, { opacity: 1 - f, filter: f > 0 ? `blur(${f * 10}px)` : 'none' }); }
    const k2 = seg(t, 9.1, 9.28); const f2 = seg(t, 10.0, 10.22); css(cm2, { transform: `translateY(${1036 + up + (1 - eo(k2)) * 14}px)`, opacity: k2 * (1 - f2), filter: k2 < 1 || f2 > 0 ? `blur(${(1 - k2) * 10 + f2 * 10}px)` : 'none' });
  }

  // white circle wipe → App Store search
  const inS = t >= 10.0 && t < 11.0; show(wipe, inS);
  if (inS) {
    const R = tab([[10.0, 170], [10.04, 172], [10.1, 290], [10.17, 440], [10.24, 620], [10.3, 800], [10.37, 1000], [10.45, 1250], [11.0, 1300]], t)[0];
    const cx = 538, cy = 733 + 90 * seg(t, 10.04, 10.45);
    css(wipe, { transform: `translate(${cx - R}px,${cy - R}px)`, width: 2 * R + 'px', height: 2 * R + 'px' });
    css(store, { left: (R - cx) + 'px', top: (R - cy) + 'px' });
    const k = seg(t, 10.05, 10.3), [dx, dy] = tab([[10.1, 0, 110], [10.25, 0, 70], [10.5, 0, 0], [10.9, -60, -31], [11.0, -75, -38]], t);   // ref title top 526 → 456 → 425
    css(sg, { transform: `translate(${dx}px,${dy}px)`, opacity: k, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : 'none' });
    const kr = seg(t, 10.12, 10.45); css(r1, { opacity: kr, transform: `translateY(${(1 - eo(kr)) * 60}px) scale(${lerp(.86, 1, eo(kr))})` });
  }
  // the clock/disc turning white before the wipe (ref 9.98-10.06)
  if (t >= 9.96 && t < 10.04) { wheel.style.opacity = 1 - seg(t, 9.96, 10.04); }

  // zoomed row + hand cursor
  const inZ = t >= 11.0 && t < 11.6; show(zrow, inZ); show(hand, inZ);
  if (inZ) {
    const sc = 2.6, right = tab(ROWR, t)[0];
    css(zrow, { transform: `translate(${right - 764 * sc}px,${832 - 77 * sc}px) scale(${sc})`, filter: t < 11.12 ? `blur(${(1 - seg(t, 11.0, 11.12)) * 6}px)` : 'none' });
    const press = t > 11.38 && t < 11.52 ? 1 - .06 * Math.sin(Math.PI * seg(t, 11.38, 11.52)) : 1;
    zdl.style.transform = `scale(${press})`;
    const [hx, hy] = tab(HANDP, t);
    css(hand, { transform: `translate(${hx}px,${hy}px) scale(2.1)`, filter: t < 11.2 ? `blur(${(1 - seg(t, 11.0, 11.2)) * 3}px)` : 'none' });
  }

  // caption over the A-roll after the expand
  const inG = t >= 11.72 && t < 12.85; show(gcap, inG);
  if (inG) { blurIn(g1, t, 11.72, .18, 0, 12); blurIn(g2, t, 11.98, .18, 0, 12); }

  // schedule pills
  pills.forEach((p, i) => {
    const on = t >= PT[i] && t < 14.95; show(p, on); if (!on) return;   // the growing card slides over them (ref 14.65-14.9)
    const k = eo(seg(t, PT[i], PT[i] + .32)), settle = i === 0 ? lerp(1.2, 1.03, eo(seg(t, 12.98, 13.3))) * lerp(1, 1 / 1.03, seg(t, 13.3, 13.6)) : lerp(1.18, 1, k);
    const fade = i === 3 ? .55 : 1;
    css(p, { transform: `translate(${538 - 347}px,${PY[i] - 75 + (1 - k) * 70}px) scale(${settle})`, opacity: seg(t, PT[i], PT[i] + .12) * fade, filter: k < .8 ? `blur(${(1 - k / .8) * 8}px)` : 'none' });
  });

  // notification + cursor, then the close-up
  const inN = t >= 14.75; show(notif, inN); show(arrow, t >= 14.9 && t < 16.45);
  if (inN) {
    if (t < 16.45) {
      const k = eo(seg(t, 14.8, 15.1));
      css(notif, { transform: `translate(${lerp(-200, 170, k)}px,${993}px) scale(1)`, opacity: seg(t, 14.8, 14.95), filter: k < 1 ? `blur(${(1 - k) * 10}px)` : 'none' });
      const [ax, ay] = tab(ARROWP, t); css(arrow, { transform: `translate(${ax}px,${ay}px)` });
    } else {
      const x = tab(NOTIFX, t)[0], k = seg(t, 16.45, 16.65);
      css(notif, { transform: `translate(${x}px,${654}px) scale(2.6)`, opacity: 1, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : 'none' });
    }
  }

  // watermark: light grey on white, faint on the footage
  const dark = (t < 1.835) || (t >= 12.08 && t < 12.85) || t >= 15.0;
  mark.style.color = dark ? 'rgba(255,255,255,.13)' : 'rgba(150,150,150,.22)';
  $('bar').firstChild.style.width = (100 * t / DUR) + '%';
}

// ---------- load + play ----------
status('Loading fonts…');
document.fonts.add(await new FontFace('Inter', 'url(/assets/renderer/fonts/inter-latin-wght-normal.woff2)', { weight: '100 900' }).load());
status('Loading the footage…');
await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('aroll.mp4 failed')); video.load(); });
// whole file in memory so seeks never stall
try { const b = await (await fetch(video.src)).blob(); const u = URL.createObjectURL(b); video.src = u; await new Promise(ok => { video.oncanplaythrough = ok; video.load(); }); } catch {}
let playing = false;
const T = () => video.currentTime;
window.__T = T;
window.__seek = async t => { video.pause(); playing = false; video.currentTime = Math.min(t, DUR - .01); await new Promise(ok => { video.onseeked = ok; }); render(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); };
function loop() { render(Math.min(T(), DUR)); if (playing) (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop)); }
const start = +(Q.get('t') || 0);
video.currentTime = start; render(start);
$('gate').classList.add('ready'); status(Q.has('mute') ? 'Ready (muted)' : 'Play');
$('gate').onclick = () => window.__play();
video.onended = () => { playing = false; };
$('bar').onclick = e => { const k = e.clientX / innerWidth; video.currentTime = k * DUR; render(k * DUR); };
addEventListener('keydown', e => { if (e.code === 'Space') { if (playing) { video.pause(); playing = false; } else { $('gate').style.display = 'none'; playing = true; video.play(); requestAnimationFrame(function raf() { if (playing) { render(Math.min(T(), DUR)); requestAnimationFrame(raf); } }); } } });
window.__play = () => { $('gate').style.display = 'none'; playing = true; video.play(); requestAnimationFrame(function raf() { if (playing) { render(Math.min(T(), DUR)); requestAnimationFrame(raf); } }); };
window.__mute = m => { video.muted = m; };
if (Q.has('embed')) { $('bar').style.display = 'none'; $('gate').style.display = 'none'; }
window.__ready = true;
