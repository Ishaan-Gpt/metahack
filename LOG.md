# Build log (estimates vs actuals, CONTEXT.md section 12)

## 2026-11-03 (IST evening)
- H1 skeleton (est 2 h): prep / read / direct / edit / player / serve, plain Node ESM, no build step. Actual ≈ 1.5 h.
- Test clip: Moovi's `data/demo/edit/t1/src.mp4` (480x854, 59.2 s, one person, plain wall). Kept in `data/` (not in git).
- prep on t1: ingest 32 s, hear (Groq Whisper) 1.5 s, clean 31 s; 59.2 s → 53.8 s in 9 pieces, 165 words.
- edit on t1 (rules only, no Meta key yet): 26 beats in 0.01 s. Spark call written, NOT yet run (no MODEL_API_KEY).
- Player rounds judged on frame sheets (`data/grabs/t1-v1..v4.jpg`, my own eye, not a blind judge yet):
  - v1/v2: close-ups cropped the face (zoom 1.75 on a 480p source), hero words "behind" the body were hidden, the stat hid behind the head.
  - v3/v4: zooms 1.06-1.35, hero words over the chest, the person shrunk low on the void so the number owns the top. My score ≈ 5.5-6/10 vs the references' 8-8.5.
- Speed (measured in the page): drawing a frame costs 1-3 ms; live MediaPipe segmentation 35-96 ms a frame → about 14 fps when visible.
  Fix: bake the matte once (matte.webm + faces.json), the player reads it (the SAM 3.1 path writes the same files).
  Base grade baked into graded.mp4 by prep (no per-frame colour filter); grain is one full-frame layer.
- Not done yet: SAM 3.1, Muse Spark run, Voice diarization, blind ratchet vs the references, real-time watch-through,
  export, a better (sharper, 1080p) demo clip.
- Matte bake on t1: 806 frames at 15 fps baked in the browser (slow while the pane was hidden: about 1 frame/s, ~13 min;
  a visible window should be much faster), encoded to matte.webm (VP9 alpha, 3.6 MB) in 22.8 s.
- With the baked matte, a frame costs 1-2 ms (vision 0.1-0.3 ms + draw 0.9-1.6 ms), down from 35-96 ms. Look unchanged (`data/grabs/t1-v5-baked.jpg`).
  Real-time fps not measured yet: the browser pane was hidden, which throttles the page.

## 2026-11-04
- Ishaan: **1/10** on v0. My diagnosis: captions over the before, not an edit (no sentence is shown as a picture, no designed graphics,
  the dull 480p room unchanged, rest beats 42%), a re-invented player instead of Edit mastery's, sent at my own 6/10.
  Lesson written to ishaan-motion 1.17.87 (lessons.md). Next: match ONE reference beat side by side before anything else.

## 2026-11-04 Card Studio theme (branch theme-card-studio)
- New theme from the @edita.visuals reference: rule director, shared canvas drawing, headless MP4 export (no browser), free stock (Pixabay / Openverse / Commons), free local word timings and face boxes. Draw 12 to 13 ms a frame. Breakdown in docs/themes/card-studio.md, how to run in docs/themes/THEME_README.md.
