# ba4 · window 20 · DIFF (after round 2)
1. A jump cut at 21.60 (two takes; the 388-394 s take with the matching numbers is B-roll in the source). The ref has none.
2. Our bills are drawn notes (grey-green with an oval and corner marks); the ref's look like photographed bills.
3. Our close-up is only 1.1x our medium (the ref's punch is 1.43x) because our medium is already 1.29x too big.

## Whole film (checks, 2026-11-04)
- Sound: the ref has a bed under the voice (gap floor ≈-27 dBFS RMS, no distinct whooshes found in 50 ms RMS/HF scans
  at the transitions). Ours: voice +1.1 dB to the ref's overall RMS and "Funkorama" (CC BY 4.0) at the measured bed
  level as a stand-in; the ref's music itself is unknown.
- Playback (recreate/ba1/fps.mjs on ba4, headless Chrome, 23.7 s): 34.6 fps, p50 32.9 ms, p95 49.9 ms, max 204 ms
  (one stall), draw 2.1 ms/frame, audio-video drift p95 0.11 s. First pass was 16 fps: the blurred desk behind the bulb
  was re-filtered every frame and every bill had a blur filter; both fixed.
- Per-region motion (phase correlation on frames seeked 1/30 s apart): desk 2 stack region moves -0.09..-0.14 x,
  +0.26..+0.33 y px per frame (the smooth push), no reversals; A-roll background ±0.5 px (source cadence), no jitter.
