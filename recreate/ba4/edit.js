// ba4 recreation: the timeline. Every time and position is measured from the reference after panel (Mahdi, interview
// edit, refs/edit-ba4-WHY), on the reference's own clock; numbers per window in docs/recreate/ba4/wNN/REF.md.
// Coordinates are the after panel scaled to 1080x1920. Caption words sit on our speaker's word onsets (voice pieces in
// pieces.json are placed so each hero word lands where the reference's lands, within about 0.3 s).
import { CAM } from './cam.js';

export const DURATION = 23.788;

// ---- shots: which picture is on screen (the A-roll with the measured camera, or a desk scene) ----
// A-roll windows: the camera table (cam.js) runs over them. Desk scenes cover the rest.
export const SHOTS = [
  { k: 'aroll', a: 0.00, b: 3.95 },
  { k: 'desk1', a: 3.95, b: 6.47 },      // brain, bulb, notes, coffee; blur-out 6.20-6.47
  { k: 'aroll', a: 6.47, b: 7.47, blurIn: [6.47, 6.70] },
  { k: 'desk2', a: 7.47, b: 12.20 },     // paper stack → video card + UPLOAD; blur-out 11.85-12.20
  { k: 'bulb',  a: 12.20, b: 14.20 },    // big glowing bulb over the blurred desk; blur-out 13.95-14.20
  { k: 'aroll', a: 14.20, b: 23.788, blurIn: [14.20, 14.30] },
];
export const shotAt = t => SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];

export function camAt(t) {
  for (const c of CAM) if (t >= c.a - 1e-6 && t <= c.b + 1e-6) {
    const f = Math.max(0, Math.min(c.s.length - 1, (t - c.a) / c.dt)), i = Math.floor(f), j = Math.min(i + 1, c.s.length - 1), u = f - i;
    const L = k => c[k][i] + (c[k][j] - c[k][i]) * u;
    return { s: L('s'), tx: L('tx'), ty: L('ty'), rot: L('rot') };
  }
  return { s: 1.004, tx: -1, ty: -7.5, rot: 0 };
}

// ---- the grade: the reference's own raw → after transfer, measured per channel (REF w00 "Grade") ----
export const GRADE = {
  r: [[0, 0], [8, 8], [32, 26], [56, 46], [80, 72], [104, 92], [128, 115], [152, 130], [176, 159], [200, 193], [224, 215], [255, 222]],
  g: [[0, 0], [8, 8], [32, 25], [56, 45], [80, 71], [104, 88], [128, 113], [152, 128], [176, 146], [200, 158], [224, 178], [255, 196]],
  b: [[0, 0], [8, 8], [32, 24], [56, 42], [80, 63], [104, 84], [128, 104], [152, 118], [176, 130], [200, 139], [224, 160], [255, 176]],
  // the bottom fall-off (after/before luminance by row band): 1 above y 1290, 0.39 at 1520, 0.13 at 1680, 0.035 at 1840
  fall: [[0, 1], [1290, 1], [1360, 0.86], [1520, 0.39], [1680, 0.13], [1840, 0.035], [1920, 0.02]],
};

// ---- captions (A-roll). y = baseline, x = left (align l) or centre (align c). pin: drawn in raw space (moves with the
// camera, as the reference's first caption does during the zoom-out) ----
const Y = '#E1E13A', Yg = 'rgba(214,226,40,', WHITE = '#F3F3F0';
export const CAPS = [
  // 0.10-0.90: "We work" Playfair-like serif 62 px + "on videos" Abril-like fat face 166 px, yellow glow; pinned to raw
  { a: 0.10, b: 1.05, pin: true, lines: [
    { text: 'I wanted to', font: '400 64px Playfair', x: 132, y: 1098, fill: WHITE, glow: 'rgba(255,255,255,0.55)', gb: 14, words: [0.10, 0.16, 0.30] },
    { text: 'make a movie', font: '400 150px Abril', x: 128, y: 1236, fill: Y, glow: Yg + '0.95)', gb: 26, scramble: 0.08, words: [0.60, 0.72, 0.80], fitW: 690 } ] },
  // 1.05-2.62: top-right block (x 663-1039): small light line, a mid line, the hero on an orange plate
  { a: 1.05, b: 2.62, lines: [
    { text: 'just to learn', font: '400 40px OpenSans', x: 663, y: 452, fill: WHITE, gb: 0, words: [1.05, 1.37, 1.57] },
    { text: 'about the', font: '400 60px OpenSans', x: 663, y: 528, fill: WHITE, gb: 0, words: [1.83, 2.03] },
    { text: 'process', font: '600 58px OpenSans', x: 668, y: 596, fill: WHITE, plate: '#E19C2E', plateIn: 2.19, gb: 0, words: [2.19] } ] },
  // 2.68-3.95: "but Before that like" centred at chest, y 1258; hero bigger, letters scramble in blue-grey then turn white
  { a: 2.68, b: 3.95, lines: [
    { text: ['of', 'filmmaking'], font: ['700 52px OpenSans', '700 80px OpenSans'], x: 540, y: 1258, align: 'c', fill: WHITE, scrambleCol: '#7F98B6', scramble: 0.55, words: [2.68, 3.07], gb: 0, shadow: true } ] },
  // 6.55-7.47: "for a month or two" white bold, letters scramble
  { a: 6.62, b: 7.47, lines: [
    { text: 'we did that for a year', font: '700 50px OpenSans', x: 540, y: 1258, align: 'c', fill: WHITE, scrambleCol: '#7F98B6', scramble: 0.35, words: [6.62, 6.75, 6.87, 7.0, 7.13, 7.23], gb: 0, shadow: true } ] },
  // 14.4-15.75: small line + hero "filming" (yellow glow, letter scramble)
  { a: 14.25, b: 15.75, lines: [
    { text: 'we made a', font: '400 34px OpenSans', x: 540, y: 1128, align: 'c', fill: WHITE, gb: 0, shadow: true, words: [14.25, 14.4, 14.5] },
    { text: '16 millimeter', font: '800 120px OpenSans', x: 540, y: 1268, align: 'c', fill: Y, glow: Yg + '1)', gb: 26, scramble: 0.35, words: [14.64], fitW: 520 } ] },
  // 15.85-17.10: "and then like three weeks" + "Editing"
  { a: 15.85, b: 17.10, lines: [
    { text: 'feature length', font: '400 34px OpenSans', x: 540, y: 1105, align: 'c', fill: WHITE, gb: 0, shadow: true, words: [15.9, 16.2] },
    { text: 'film', font: '800 116px OpenSans', x: 540, y: 1240, align: 'c', fill: Y, glow: Yg + '1)', gb: 26, scramble: 0.3, words: [16.66] } ] },
  // 17.30-19.40: "so probably five months" (scramble in) + "from start to finish" (yellow glow, smaller)
  { a: 17.30, b: 19.62, lines: [
    { text: 'over the course of', font: '400 40px OpenSans', x: 540, y: 1200, align: 'c', fill: WHITE, gb: 0, shadow: true, scrambleCol: '#9AA8B8', scramble: 0.3, words: [17.4, 17.7, 17.82, 18.15] },
    { text: 'about 13 months', font: '700 62px OpenSans', x: 540, y: 1266, align: 'c', fill: Y, glow: Yg + '1)', gb: 20, scramble: 0.3, words: [18.38, 18.7, 19.0] } ] },
  // close-up: small line at y 1336 + hero at y 1428 (Open Sans bold, yellow glow)
  { a: 19.75, b: 21.62, lines: [
    { text: 'I think my budget was', font: '400 30px OpenSans', x: 540, y: 1340, align: 'c', fill: WHITE, gb: 0, shadow: true, words: [19.9, 20.06, 20.18, 20.26, 20.54] },
    { text: '80 bucks', font: '700 64px OpenSans', x: 540, y: 1430, align: 'c', fill: Y, glow: Yg + '1)', gb: 20, scramble: 0.25, words: [20.70, 21.0] } ] },
  { a: 21.66, b: 23.788, lines: [
    { text: 'now the', font: '400 30px OpenSans', x: 540, y: 1340, align: 'c', fill: WHITE, gb: 0, shadow: true, words: [21.7, 21.92] },
    { text: 'number one video game podcast', font: '700 50px OpenSans', x: 540, y: 1430, align: 'c', fill: Y, glow: Yg + '1)', gb: 20, scramble: 0.3, words: [22.44, 22.62, 22.8, 23.04, 23.24], fitW: 640 } ] },
];

// ---- post: light leak (19.25-19.62, warm wash rising from the bottom), money (20.45-21.6 behind the head) ----
export const LEAK = { a: 19.18, peak: 19.50, b: 19.66 };
export const MONEY = { a: 20.45, b: 22.40, n: 15 };
