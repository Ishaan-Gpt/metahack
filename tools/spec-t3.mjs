// The four references' why on Ishaan's take 3 (data/clips/t3), written as a beat spec for the ported Edit mastery player.
// Every beat names the reference whose why it carries (refs/). usage: node tools/spec-t3.mjs → player-em/specs/edit-t3-fourwhy.json
import { readFileSync, writeFileSync } from 'node:fs';

const v14 = JSON.parse(readFileSync('player-em/specs/interview-t3-v14.json', 'utf8'));
const HOT = '#C8321E', PAPER = '#F7ECDE', LOOK = 'contrast(1.16) saturate(1.04) sepia(.16) brightness(.96)';
const w = (word, o = {}) => ({ w: word, ...o });

// reel 2 (Tahrima): the talk's structure as a visual system: ghost numeral, a lit diamond, the step's label
const chapter = (n, label) => ({
  t: 'art', text: true,
  html: `<div class="cb"><div class="num">${n}</div><div class="dia"><span>${n}</span></div><div class="lab">${label}</div></div>`,
  css: `.cb{position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(180deg,rgba(16,10,8,.82),rgba(16,10,8,.55) 55%,rgba(16,10,8,0))}
.num{position:absolute;left:40px;top:40px;font:400 560px/1 'Russo One';color:rgba(247,236,222,calc(.06 + .08*min(1,var(--t)*3)));transform:translateY(calc((1 - min(1,var(--t)*3))*-40px))}
.dia{position:absolute;left:150px;top:300px;width:140px;height:140px;border:7px solid ${PAPER};background:${HOT};box-shadow:0 0 60px rgba(230,80,50,.75),0 24px 50px rgba(0,0,0,.6);transform:rotate(45deg) scale(min(1,calc(.2 + var(--t)*4)))}
.dia span{position:absolute;inset:0;display:grid;place-items:center;transform:rotate(-45deg);font:400 86px 'Russo One';color:${PAPER}}
.lab{position:absolute;left:350px;top:318px;right:40px;font:italic 500 92px/1 'FrauncesV';color:${PAPER};opacity:clamp(0,calc((var(--t) - .1)*6),1);transform:translateX(calc((1 - clamp(0,calc((var(--t) - .1)*5),1))*-40px))}`,
});

// reel 1 (Hossein): the negative line gets the hot colour, built word by word as a stacked block, the speaker shrunk below
const askBlock = {
  t: 'art', text: true, dur: 2.9,
  html: `<div class="k"><i class="a">unable to</i><b class="b">ASK</b><span class="c">questions</span><span class="d">in the class</span></div>`,
  css: `.k{position:absolute;left:96px;top:210px;width:900px}
.k > *{display:block;opacity:0}
.a{font:italic 400 118px/1 'FrauncesV';color:${PAPER};opacity:clamp(0,calc((var(--t) - .5)*8),1)!important}
.b{font:400 360px/.92 'Russo One';color:#FFEDE6;text-shadow:0 0 34px rgba(235,80,50,.95),0 0 110px rgba(200,40,20,.75);opacity:clamp(0,calc((var(--t) - .8)*9),1)!important;transform:scale(calc(1.28 - .28*clamp(0,calc((var(--t) - .8)*5),1)));transform-origin:0 60%}
.c{font:400 132px/1.02 'Russo One';color:${PAPER};opacity:clamp(0,calc((var(--t) - .98)*8),1)!important}
.d{margin-top:16px;font:italic 400 84px 'FrauncesV';color:rgba(247,236,222,.82);opacity:clamp(0,calc((var(--t) - 1.5)*6),1)!important}`,
};

// reel 3 (Daniel): the claim becomes the thing itself: a turning wireframe cube for "3D"
const cube = {
  t: 'art', text: true, dur: 1.05,
  html: `<div class="sc"><div class="cube"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="f5"></i><i class="f6"></i></div><div class="t">3D</div></div>`,
  css: `.sc{position:absolute;inset:0;perspective:1500px}
.cube{position:absolute;left:390px;top:300px;width:300px;height:300px;transform-style:preserve-3d;transform:rotateX(calc(-22deg - var(--t)*35deg)) rotateY(calc(35deg + var(--t)*110deg)) scale(calc(.45 + .55*var(--e)))}
.cube i{position:absolute;inset:0;border:7px solid ${PAPER};box-shadow:0 0 34px rgba(255,190,120,.65),inset 0 0 34px rgba(255,190,120,.25);background:rgba(255,215,170,.05)}
.f1{transform:translateZ(150px)}.f2{transform:rotateY(180deg) translateZ(150px)}.f3{transform:rotateY(90deg) translateZ(150px)}.f4{transform:rotateY(-90deg) translateZ(150px)}.f5{transform:rotateX(90deg) translateZ(150px)}.f6{transform:rotateX(-90deg) translateZ(150px)}
.t{position:absolute;left:0;right:0;top:720px;text-align:center;font:400 250px 'Russo One';color:#FFF3E6;text-shadow:0 0 50px rgba(255,170,90,.85);opacity:clamp(0,calc(var(--p)*6 - 1),1)}`,
};

// reel 3 (Daniel): "videos I used to learn from" becomes the thing: a lecture player whose chat is switched off
const oneWay = {
  t: 'art', text: true, at: w('videos'), dur: 2.2,
  html: `<div class="ui"><div class="pl"><b>&#9654;</b><span>lecture.mp4</span><em></em></div><div class="ch"><i>&#128172;</i><span>chat is off</span></div></div>`,
  css: `.ui{position:absolute;left:60px;top:230px;width:780px;transform:translateY(calc((1 - var(--e))*-50px)) rotate(-3deg);opacity:min(1,calc(var(--t)*7))}
.pl{display:flex;align-items:center;gap:22px;padding:34px 40px;border-radius:38px;background:rgba(18,12,10,.88);box-shadow:0 26px 60px rgba(0,0,0,.45),inset 0 0 0 2px rgba(247,236,222,.18);font:700 62px Manrope;color:${PAPER}}
.pl b{width:100px;height:100px;border-radius:50%;display:grid;place-items:center;background:${HOT};font-size:44px}
.pl em{flex:1;height:10px;border-radius:5px;background:linear-gradient(90deg,${HOT} calc(var(--p)*100%),rgba(247,236,222,.2) 0)}
.ch{margin:22px 0 0 120px;display:inline-flex;align-items:center;gap:18px;padding:22px 36px;border-radius:999px;background:rgba(247,236,222,.95);font:800 58px Manrope;color:#2a1a14;box-shadow:0 20px 44px rgba(0,0,0,.35);opacity:clamp(0,calc((var(--t) - .9)*6),1);transform:scale(calc(.8 + .2*clamp(0,calc((var(--t) - .9)*5),1)))}
.ch span{text-decoration:line-through;text-decoration-color:${HOT};text-decoration-thickness:6px}`,
};

const spec = {
  name: 'Take 3 · the four references\' why (edit-ba1..4) with Moovi\'s captions, sounds, camera and desk world',
  why: 'ba2 chapter cards for the 3 points; ba4 desk world acts out the process; ba1 meaning colour + stacked kinetic type on the negative, B&W calm then colour back; ba3 the speaker shrinks into a card and the claim becomes its picture (UI widget, 3D cube). Moovi: Premium Caption 1, the Style 1 / CC0 sounds, punches and leaks.',
  clip: '/data/clips/t3/', start: w('first'),
  palette: { ...v14.palette, accent: '#E2563A', 'accent-hi': '#FF9A7E', 'accent-glow': 'rgba(226,86,58,.6)', 'mat-ink': PAPER },
  theme: { ...v14.theme, ground: [[0, '#2b1f18'], [1, '#0c0807']], ring: 'rgba(247,236,222,.7)' },
  caption: { variant: '1.1', accent: '#E2563A', maxWords: 3 }, music: { ...v14.music, gain: 0.07 }, desk: v14.desk,
  beats: [
    { from: w('first'), layers: [{ t: 'cam', z: 1.14, Y: 0.4, looks: [{ at: w('first'), f: LOOK }] }, chapter(1, 'no two-way talk')] },
    { from: w('have'), layers: [{ t: 'cam', z: 1.22, Y: 0.38, punch: w('two'), by: 1.07, looks: [{ at: w('have'), f: LOOK }] }] },
    { from: w('two'), noCaption: true, layers: [{ t: 'desk', focus: [560, 760, 1.3], pip: 'print' }] },
    { from: w('that', { after: 9.9 }), layers: [
      { t: 'cam', z: 1.18, Y: 0.38, looks: [{ at: w('that', { after: 9.9 }), f: LOOK }] },
      { t: 'leak', at: w('that', { after: 9.9 }) },
      oneWay] },
    { from: w('then'), layers: [{ t: 'cam', z: 1.14, Y: 0.4, looks: [{ at: w('then'), f: LOOK }] }, chapter(2, "can't ask")] },
    { from: w('i', { after: 14 }), noCaption: true, layers: [{ t: 'cam', form: 'card', z: 1.05 }, { t: 'world', stops: [[0, '#8a2314'], [0.55, '#4a0f08'], [1, '#170504']] }, askBlock] },
    { from: w('as', { after: 17 }), layers: [{ t: 'cam', z: 1.16, Y: 0.38, punch: w('introvert'), by: 1.08, looks: [{ at: w('as', { after: 17 }), f: 'grayscale(1) contrast(1.22) brightness(.95)' }] }] },
    { from: w('and', { after: 18 }), layers: [{ t: 'cam', z: 1.14, Y: 0.4, looks: [{ at: w('and', { after: 18 }), f: LOOK }] }, chapter(3, 'no immersive learning')] },
    { from: w('immersive'), noCaption: true, layers: [{ t: 'desk', focus: [560, 2640, 1.3] }] },
    { from: w('you', { after: 21 }), layers: [{ t: 'cam', z: 1.18, Y: 0.38, looks: [{ at: w('you', { after: 21 }), f: LOOK }] }, { t: 'leak', at: w('you', { after: 21 }) }] },
  ],
  sfx: [
    { at: w('first', { dt: 0.2 }), k: 'pop', g: 0.5 },
    { at: w('have'), k: 'whoosh', g: 0.35 }, { at: w('two'), k: 'whoosh', g: 0.4 },
    { at: w('that', { after: 9.9 }), k: 'whoosh', g: 0.35 }, { at: w('used'), k: 'click', g: 0.4 },
    { at: w('then', { dt: -0.45 }), k: 'riser', g: 0.32 }, { at: w('then', { dt: 0.2 }), k: 'pop', g: 0.5 },
    { at: w('i', { after: 14 }), k: 'whoosh', g: 0.4 }, { at: w('ask', { after: 14.9 }), k: 'hit', g: 0.6 },
    { at: w('as', { after: 17 }), k: 'swipe', g: 0.3 }, { at: w('introvert'), k: 'hit', g: 0.45 },
    { at: w('and', { after: 18, dt: -0.45 }), k: 'riser', g: 0.32 }, { at: w('and', { after: 18, dt: 0.2 }), k: 'pop', g: 0.5 },
    { at: w('immersive'), k: 'whoosh', g: 0.4 },
    { at: w('3d', { dt: 0.05 }), k: 'chime', g: 0.45 }, { at: w('you', { after: 21 }), k: 'whoosh', g: 0.35 },
  ],
};
// the hand and VR prints of v14 have no footage here; keep the desk to the laptop, the ink, the megaphone and the bulb
spec.desk = { ...spec.desk, items: spec.desk.items.filter(i => i.kind === 'cut' || i.kind === 'ink') };
writeFileSync('player-em/specs/edit-t3-fourwhy.json', JSON.stringify(spec, null, 1));
console.log(`spec: ${spec.beats.length} beats, ${spec.sfx.length} sounds`);
