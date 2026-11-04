# ba2 · window 00 · OURS (our clock 0.00-~8.6 = reference 0.00-5.00)

Footage: NASA Curious Universe host (Commons, public domain; data/clips/ba2c/SOURCE.md), pieces 0-1 and the start of 2 of
`recreate/ba2/pieces.json`. Our words: Now .08 there .32 are .60 some .72 obvious .94 challenges 1.50 to 2.12 studying 2.54
black 2.84 holes 3.14 | They're 3.56 far 3.85 away 4.12 no 5.05 light 5.35 can 5.58 escape 5.86 them 6.13 | but 6.60 … two 8.26
main 8.44 ways 8.70. Shot map (our start → ref start, `recreate/ba2/map.mjs`): 0 → 0 · 3.44 → 1.935 · 6.45 → 4.171. Our
sentences are longer, so each shot keeps the reference's camera and look and lasts as long as our line.

- Ground: the reference's wall profile painted behind the person matte (MediaPipe selfie segmenter baked in headless Chrome,
  a second pass on the head crop for the hair, 1-2-1 temporal smoothing; the edge band is gated by luminance so the black
  studio never counts as person), placed in world space so it zooms with the camera. Subject grade: gamma 1.04, saturation
  +10%, warm +4%, violet spill on dark cloth.
- Hook camera: the reference's table (1.134 → 1, cubic ease-out 1.05 s about (540,958)); our face settles at (536,607),
  m 1.97 (Haar 424, as the reference's).
- Groups: "there are some" (helpers 77 px, justified) · OBVIOUS (Arimo Bold, tracking -0.08 em, x-height 137 shrunk to fit
  620 px because our word is longer than "look") · "challenges" (46 px) | "to" + STUDYING | "black holes" (bold white 116,
  glow) to the cut.
- ECU: m 3.5, nose at x 0. Ring 3.50-3.74, "far away" cyan, "no light" white below, "can" white right, "escape" magenta.
- Wide: m 1.65 → 0.948 zoom; two badges (our line is "two main ways") at the reference's lower-left and lower-right spots.
