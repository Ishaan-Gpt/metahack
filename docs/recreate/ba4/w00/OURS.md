# ba4 · window 00 · OURS (round 2)

Footage: Bernie Burns, TSTV interview (Commons, CC BY 3.0). Voice on the reference clock: "I wanted to make a movie just to
learn about the process of filmmaking" (214.50 s of the source) at 0.00; "and that was the idea behind it" at 4.45.
- Raw: a full-height 9:16 crop (607x1080 → 1080x1920, k 1.778), face centre placed at the ref raw's (x 480).
- Camera: the reference's measured table (cam.js) applied to our raw every frame, rotation included.
- Grade: the measured per-channel transfer (LUT) + a trim measured on our frame (pow 1.18/1.10/1.10: background
  114,136,120 → 99,128,111 vs the ref's 93,127,111) + the measured bottom fall-off.
- Captions: "I wanted to" (Playfair 64) + "make a movie" (Abril, fit to 690 px, yellow glow), pinned to the raw like the
  ref; top-right block "just to learn" / "about the" / "process" (orange plate); "of filmmaking" with the scramble.
- Desk: CC0 photoscan cut-outs (bulb, cup, pencil, leaves, paper texture) + a code-built 3D brain (three.js,
  recreate/ba4/props/brain.html: two hemispheres, gyri from warped ridged noise, cerebellum with folia, stem).
