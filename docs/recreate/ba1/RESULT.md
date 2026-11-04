# ba1 recreation · result (2026-11-04)

Preview (served by `node serve.mjs 4700` from the repo root):
- After alone: http://127.0.0.1:4700/recreate/ba1/index.html (space / click = play-pause, bar = seek, `?brand=WORD`)
- Side by side: http://127.0.0.1:4700/recreate/ba1/compare.html (reference after panel | ours, started together,
  sound switch Ours / Reference)

Footage: NASA SVS "Earth Science Subject Matter Experts Interviews (KC Interview Evergreen)", Dr. Kate Calvin, public
domain, 4K (data/clips/ba1c/SOURCE.md). Seven pieces, 19.8 s of speech (the reference's speech is 20.0 s), each join on
one of the reference's cuts or transitions.

## Checks
- Camera path (recreate/ba1/camcheck.mjs, 60 fps, cuts excluded): second difference of a face point p95 0.54 px/frame²;
  the largest values are the single eased move of the room's return (8.22-8.33 s). No jitter.
- Per-region motion (recreate/ba1/motion.py, rendered frames at 60 fps): screen-fixed text and the logo move 0.01-0.03
  px/frame; void push subject region mean 1.55 px/frame vs the reference's 1.04 with the same 21 direction changes;
  the push at 13.8 s background region jerk p95 36.7 vs 33.2.
- Real-time playback (recreate/ba1/fps.mjs, headless Chrome on Ishaan's PC, AMD Radeon iGPU via D3D11, CPU at 70-90%
  from parallel builds): 20-25 fps, p50 33-50 ms, edit clock in real time (10.26 s after 10 s), footage within 0.11 s
  of the clock (p95). The same headless browser reaches only 48-50 fps on a blank page under this load, so this
  understates a normal browser; it is not 60 fps here.

## Blind judge (one round, a fresh agent, rows randomised per window, key in data/grabs/ba1j/key.txt)
| window | reference | ours | original picked (confidence) |
|---|---|---|---|
| w00 hook | 8 | 6 | yes (80%) |
| w05 close-up / burn / void | 8.5 | 5.5 | yes (85%) |
| w10 room / dissolve / blocks | 8 | 7 | yes (70%) |
| w15 glitch / B&W / colour | 8.5 | 5.5 | yes (90%) |
| w20 end card | 8 | 7.5 | yes (65%) |
| overall | 8.2 | 6.2 | |
The judge's concrete gaps were fixed after the round (see each DIFF.md); a second round has not been run. 10/10 (a
judge unable to tell them apart) was not reached.

## What still differs (honest)
1. Framing, from the footage: our speaker is 1.53x larger and her eyes sit at y 491 vs 868 in every wide shot; the
   punch word therefore sits in front of her body instead of behind her head. No Commons clip framed like the
   reference's raw was found (data/clips/ba1c/SOURCE.md).
2. Room: navy studio and a black TV vs warm wood and plants, so the red tiles and the B&W ground are flatter.
3. Our speaker talks faster in the hook and the payoff, so text changes faster there.
4. The heavy outline script of "convert"/"warm" is approximated with Lobster.
5. Matte edge (rembg) is bumpier than the reference's at the crown in the close-up.
