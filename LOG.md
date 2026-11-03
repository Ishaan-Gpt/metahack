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
