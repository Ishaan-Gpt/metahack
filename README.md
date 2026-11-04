# metahack

An editing engine: a raw "before" talking-head clip in, an "after" that looks like a pro short-form editor made it out.
Built for the Meta Global AI Developer Hackathon on Meta's models (Muse Spark, SAM 3.1, Muse Voice Transcribe).
Start with [CONTEXT.md](CONTEXT.md) (the references' why, the edit grammar, the engine, the plan). Build log: [LOG.md](LOG.md).

## Run it (Node 24, ffmpeg 8 on PATH)
```bash
npm install
# .env.local (never committed): GROQ_API_KEY=... (word timings), MODEL_API_KEY=... (Meta Model API, optional)
node engine/prep.mjs path/to/before.mp4 data/clips/my-clip      # 1080x1920, words, pauses cut, graded.mp4
node engine/edit.mjs data/clips/my-clip --brand "Your Brand"     # spec.json: one look per phrase (Muse Spark if a key is set)
node serve.mjs 4700                                              # then open the player:
#   http://127.0.0.1:4700/?clip=data/clips/my-clip                 the after
#   http://127.0.0.1:4700/?clip=data/clips/my-clip&view=split      before | after
#   http://127.0.0.1:4700/?clip=data/clips/my-clip&debug=1         face box, safe area, matte, beat names
# smooth playback: bake the person matte once, then encode it
#   http://127.0.0.1:4700/?clip=data/clips/my-clip&bake=1  → press "Bake the matte"
node engine/matte.mjs data/clips/my-clip                         # → matte.webm (+ faces.json from the bake)
```

## Themes
- `kinetic-brand` (default) and `card-studio` (light studio card edit, rules only, MP4 export): see [docs/themes/THEME_README.md](docs/themes/THEME_README.md); one command: `node engine/card-studio.mjs raw.mp4 --out out.mp4`.

## Layout
- `engine/` prep (ingest, hear, clean), read (phrases, roles, hero words), direct (one Muse Spark call + the rule caster),
  edit (writes spec.json), matte (encodes the baked matte), `templates/kinetic-brand.json` (the first dialect: palette,
  type, grade, 8 look templates, transitions, sfx)
- `player/` the live player: draws the spec over the clip on a canvas (cut-out, looks, word-synced text, transitions,
  sound, before/after)
- `import/moovi/` source carried over from [Moovi](https://github.com/Ishaan-Gpt/moovi) to port (CONTEXT.md section 11)
- `assets/` fonts, sfx, music bed, vision models, desk props (licences in `assets/CREDITS.md`)
- `refs/` the four reference reels' why · `hackathon/` rules and plans
