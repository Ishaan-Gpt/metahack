// Our clock ↔ the reference's clock, shot by shot (our host's sentences are longer than the reference's, so each shot
// starts at the same moment of the reference and holds its last frame while ours is still running).
export const SHOTS = [[0, 0], [3.44, 1.935], [6.45, 4.171], [9.45, 5.5], [11.35, 7.5], [13.45, 9.33], [16.18, 11.35], [19.83, 15.0], [22.26, 17.55], [25.36, 20.17]];
export function refTime(t) {
  for (let i = SHOTS.length - 2; i >= 0; i--) if (t >= SHOTS[i][0]) return Math.min(SHOTS[i][1] + (t - SHOTS[i][0]), SHOTS[i + 1][1] - 0.034);
  return 0;
}
