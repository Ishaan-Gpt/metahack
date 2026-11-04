// The camera's own path at 60 fps (no rendering): per-frame zoom and pan steps and their second differences, so a
// jitter in the camera maths shows as a spike. Cuts are excluded. usage: node recreate/ba1/camcheck.mjs
import { EDIT } from './edit.js';
const cuts = Object.values(EDIT.cuts), rows = [];
let prev = null, prevD = null, worst = [];
for (let i = 0; i < 19.8 * 60; i++) {
  const T = i / 60, c = EDIT.state(T).cam, face = [c.ox + c.m * 900, c.oy + c.m * 600];   // a point near the face
  if (prev && !cuts.some(x => x > T - 1 / 60 && x <= T)) {
    const d = [face[0] - prev[0], face[1] - prev[1], (c.m / prev[2] - 1) * 1000];
    if (prevD && !cuts.some(x => x > T - 2 / 60 && x <= T)) { const j = Math.hypot(d[0] - prevD[0], d[1] - prevD[1]); worst.push([j, T]); }
    prevD = d;
  } else prevD = null;
  prev = [...face, c.m];
}
worst.sort((a, b) => b[0] - a[0]);
console.log('second-difference of a face point (px/frame²), top 8:', worst.slice(0, 8).map(([j, t]) => `${j.toFixed(2)}@${t.toFixed(2)}`).join(' '));
console.log('p95:', worst[Math.floor(worst.length * 0.05)][0].toFixed(3), 'frames:', worst.length);
