# Moovi

**Drop a raw talking-head take and get back the edit a hired short-form editor would have made, with a before/after beside it.**

Demo video: [[VIDEO_URL]] · Live studio: https://darwin-images-integrate-protecting.trycloudflare.com/studio · Code: https://github.com/Ishaan-Gpt/metahack
Built for the Meta Global AI Developer Hackathon (Cerebral Valley x Meta), startup track, theme "Build for Your World".

## What it does

You talk to your phone for twenty seconds, drop the clip into the studio, and Moovi hands back a finished 9:16 edit:
framed around your face, the dead pauses cut, one hero word per line, cards, photo splits, lists, a big word sitting
behind your head, a whoosh or a pop on every change, and the sound set for the feed. Meta's Muse Voice Transcribe hears
the take, Muse Spark picks which of five styles suits it and plans every beat, and plain code draws every frame, so the
face and the voice in the finished cut are still yours. Each of the five styles was measured frame by frame from a real
editor's before-and-after reel.

## How Meta's models are used

Two or three Meta calls per edit, one attempt each, cached by the hash of the audio, so the same take always gives the
same cut and a retry costs nothing.

| # | Model | What it decides | Where |
|---|---|---|---|
| 1 | **Muse Voice Transcribe** (`muse-voice-transcribe-1.0`, `POST /v1/asr/transcribe`) | Every word of the take and its speech turns. Meta returns turn-level times, so Moovi places each word inside its turn by code (weighted by syllables over the voiced frames), then cuts the pauses between words. | `engine/meta.mjs` (`metaTranscribe`, `wordsFromTurns`), called from `engine/prep.mjs` (`HEAR=meta`) |
| 2 | **Muse Spark** (`muse-spark-1.3`, `POST /v1/chat/completions`, strict `json_schema` `style_pick`) | Auto mode only: reads the whole transcript against the style catalogue and picks one style, with a one-line why and its hero words. The studio shows that line. | `engine/meta.mjs` (`metaChooseStyle`), called from `engine/run.mjs` (stage `direct`) |
| 3 | **Muse Spark** (`muse-spark-1.3`, strict `json_schema` `card_studio_plan`) | One plan for every beat: its layout (one of nine), its hero word, icons, photo searches, the backdrop for text-behind and the transition out. Code checks each beat (`validateItem`); a beat that fails goes back to the rule director alone, and there is never a second plan call. | `engine/meta.mjs` (`metaPlan`, `planSchema`), called from `engine/card-studio.mjs` |

**No key, no edit.** Without `MODEL_API_KEY` the studio's header reads "Meta key missing" (`GET /api/health` returns
`meta: "missing"`) and every job stops before any work with error `NO_META_KEY` and a sentence a creator can read
(`engine/run.mjs`). Every call, cache hit, its seconds and tokens are written to `<clip>/meta-usage.json`, and the studio
lists them under "Meta model calls for this edit".

**What falls back, and says so.** If the auto style pick fails, rules pick the style and the studio labels it
"rules (Muse Spark unavailable)". A plan beat that breaks the schema keeps the rule director's beat and the reason is logged.

**Not used yet:** SAM 3.1. The person cut-out behind the big word is a local U-2-Net matte today (`engine/person_matte.py`);
moving it and the speaker tracking to SAM 3.1 is the next step.

## What existed before the hackathon, and what we built during it

This repo started empty on 3 Nov 2026 (first commit `56c9a81`). Moovi itself is older.

| Existed before (and where it came from) | Built during the hackathon (3-4 Nov 2026) |
|---|---|
| **Moovi**, an AI video director built for Graph Hacks (WeMakeDevs x FalkorDB, 15-18 Oct 2026): https://github.com/Ishaan-Gpt/moovi | The Meta layer: Muse Voice Transcribe, the Muse Spark style pick and the Muse Spark beat plan, with schemas, checks, caching and a usage log (`engine/meta.mjs`) |
| Moovi's edit taste and code, copied in as source to port, not as a build: Edit mastery's player, Premium Captions, the SFX and mix engine (`import/moovi/`) | The job runner with six stages, real per-stage clocks and errors a creator can act on (`engine/run.mjs`) |
| The MotionEasy canvas renderer by the same author, MIT (`assets/renderer/`) | Prep: the face-aware 9:16 crop, word timing and the pause cut (`engine/prep.mjs`, `engine/faces.py`) |
| The landing page's design and the Moovi character, from Moovi's site (the copy was rewritten for this product) | Card Studio, the rule director, the nine edit types, the canvas MP4 renderer and the text-behind matte, by Vignesh B S (`engine/card-studio.mjs`, `player/card-studio.js`, `tools/render-card.mjs`, `engine/person_matte.py`, `engine/stock.mjs`) |
| | Five styles measured from five editors' reels (`engine/styles/*.json`, `engine/styles.mjs`) and the 1:1 recreations they were measured with (`recreate/`, `docs/recreate/`) |
| | The studio at `/studio` and its API: upload, queue, status, retry, health, sample (`web/src/app/studio`, `web/src/app/api`, `web/src/lib/server/jobs.ts`) |
| | A test stand-in that speaks Meta's exact request and response shapes for runs without a key, marked as a test everywhere it appears (`tools/meta-standin.mjs`) |

## Quick start

Needs Node 24, ffmpeg 8 on PATH, and Python 3 with `pip install opencv-python-headless onnxruntime` (face box and matte).

```bash
npm install && (cd web && npm install)
# put the keys in .env.local at the repo root (git-ignored):  MODEL_API_KEY=...  GROQ_API_KEY=...
cd web && npm run build && npm start          # open http://localhost:3000/studio
```

`MODEL_API_KEY` is the Meta Model API key and is required. `GROQ_API_KEY` is read only on test runs against the stand-in
and by the older `kinetic-brand` prep path; a live studio run uses Meta for the words. `PIXABAY_API_KEY` is optional (photos;
without it Moovi searches Openverse and Wikimedia Commons). One edit from the command line, no web app:
`node engine/run.mjs <job dir with job.json>`.

## Architecture

```
phone take (MP4/MOV/WEBM, 5-75 s)
   │  /studio  ──POST /api/jobs──▶  web/src/lib/server/jobs.ts   (queue, one job at a time, a child process per job)
   ▼
node engine/run.mjs <job>                                           writes status.json, polled by /studio
   preflight   ffprobe: a picture, sound, 5-75 s; Meta key present, else NO_META_KEY
   1 watch     engine/prep.mjs   face-aware 9:16 crop (faces.py, YuNet) ─▶ voice.wav
                                 ─▶ Muse Voice Transcribe ─▶ turns ─▶ word times (code) ─▶ pauses cut ─▶ cut.mp4, words.json
   2 direct    auto: Muse Spark style pick ─▶ style id + one-line why     (fails: rules pick, labelled)
               style grade (ffmpeg) ─▶ engine/card-studio.mjs rule director ─▶ beats
               ─▶ Muse Spark plan (json_schema) ─▶ validateItem per beat ─▶ coverage pass (all nine edit types)
   3 build     engine/stock.mjs photos (Pixabay / Openverse / Commons, cached) · engine/person_matte.py (local matte)
   4 render    tools/render-card.mjs: player/card-studio.js on @napi-rs/canvas, frame by frame ─▶ ffmpeg
   5 mix       an effect on every change, a quiet music bed, loudness to -14 LUFS
   6 share     ffmpeg before/after: the raw take beside the edit, in step
   ▼
edit.mp4 (1080x1920) + before-after.mp4 (1920x1080)
```

## The five styles

Each style is Card Studio's template plus the values measured from one real editor's reel: palette, type, grade, frame,
transitions and which layouts the director may use (`engine/styles/<id>.json`). In auto mode Muse Spark picks one for the look and the director may then use every layout from all five, so the edit mixes the styles' fundamentals around this take.

| Style | id | Measured from | What it does to your take |
|---|---|---|---|
| Studio Card | `card-studio` | Edita Visuals, instagram.com/p/DerbE18txNg | Frames you in a rounded card on a light studio page, with a storyboard beside it and lime serif hero words |
| Kinetic Brand | `kinetic-brand` | Hossein, BONOMI ad, instagram.com/p/DduLd-RRDxa | Turns one static take into a brand ad: huge words behind you, white and gold, red only for alarm and numbers |
| Creator Studio | `creator-studio` | Tahrima, instagram.com/p/DaFaIEGIFvx | Swaps your wall for a violet colour field, with chapter cards and glowing hero words |
| Clean UI | `clean-ui` | Daniel, "$10 vs $80", instagram.com/p/DXjyhHEkwOV | Hides dull footage behind Apple-clean interface cards that act out each claim |
| Desk Doc | `desk-doc` | Mahdi (interview), instagram.com/p/DdM89KRMPBJ | A warm documentary: photos that prove the point, numbers made big, yellow glowing words |

The reference reels are other creators' work; we studied them and do not ship or redistribute them.

## Results

One 22 s take (CC BY-SA sample, 54 words) through every style on one 8-core Windows PC with the CPU shared, so these are
upper bounds. Full per-stage table: [docs/RESULTS.md](docs/RESULTS.md). These runs used the TEST stand-in for the two
director calls (no Meta key on the build box yet); Meta token counts and cost are measured on the first live run.

| Style | Result | Total s | Render s | Layouts used |
|---|---|---|---|---|
| Studio Card | pass | 378 | 327 | all 9 |
| Kinetic Brand | pass | 525 | 442 | face, graphic, textbehind, list, split |
| Creator Studio | pass | 207 | 170 | face, textbehind, list, graphic, orbit |
| Clean UI | pass | 199 | 141 | face, topsquare, wide, post, list, graphic, orbit |
| Desk Doc | pass | 435 | 348 | face, graphic, textbehind, list, split |
| Desk Doc, cold (nothing cached) | pass | 612 | 276 | as above |
| **Auto, quiet CPU, via the live studio** | pass | **314** | 139 | all 9 (Studio Card look, every style's layouts) |

Bad inputs end with one plain sentence, tested end to end: a fake video (`NOT_VIDEO`), a 3 s clip (`TOO_SHORT`), a silent
clip (`NO_SOUND`), no Meta key (`NO_META_KEY`).

## Limits (today)

- Takes of 5 to 75 seconds, one edit at a time on one machine.
- Meta returns turn-level times, so word times inside a long turn are placed by code and a caption can land a few tenths
  of a second early or late.
- Four styles run on Card Studio's renderer with their measured values; the richer devices of the 1:1 recreations (the
  3D desk world, eroding type) live in `recreate/` and are not in the studio yet.
- The cut-out behind the big word is a local CPU matte, matted only where it is used; SAM 3.1 is the planned replacement.
- Photos come from free libraries and can be a weak match for an abstract word; platform icons are drawn glyphs, not logos.
- Landscape takes are cropped to 9:16 around the face, so a speaker who walks across the frame can drift out of it.

## Credits

- Sample take in the studio: Iliana for Wikitongues, CC BY-SA 4.0.
- Music bed: "Funkorama" by Kevin MacLeod (incompetech.com), CC BY 4.0.
- Sound effects: freesound.org creators and Kenney, CC0 1.0; synthesized tones and risers, MIT. Full list in `assets/CREDITS.md`.
- Fonts: SIL Open Font License (`assets/renderer/fonts/LICENSES.md`). Face detector: YuNet (OpenCV Zoo, MIT). Matte: U-2-Net weights (Apache-2.0), downloaded on first use.
- Footage of the recreations: Wikimedia Commons, public domain and CC BY / CC BY-SA, credited per clip in `data/clips/*/SOURCE.md`.

## Team

- **Ishaan**: Moovi, the five styles and the auto style pick, the job runner and the studio.
- **Vignesh B S**: the Card Studio theme (the Meta transcribe and plan calls, rule director, nine edit types, the MP4 renderer, text-behind).

AI assistance is logged in [AI_USAGE.md](AI_USAGE.md).

---

## Lower-level tools (the engine before the studio)

Start with [HANDOFF.md](HANDOFF.md), then [CONTEXT.md](CONTEXT.md) (the references' why, the edit grammar, the engine, the plan). Build log: [LOG.md](LOG.md).

### Run the kinetic-brand engine and the live player (Node 24, ffmpeg 8 on PATH)
```bash
npm install
# .env.local (never committed): GROQ_API_KEY=... (word timings), MODEL_API_KEY=... (Meta Model API)
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

### Themes
- `kinetic-brand` and `card-studio` (light studio card edit, Meta required, MP4 export): see
  [docs/themes/THEME_README.md](docs/themes/THEME_README.md); one command: `node engine/card-studio.mjs raw.mp4 --out out.mp4`.

### Layout
- `engine/` run (the job runner), prep (ingest, hear, clean), meta (the Meta calls), styles (the five styles), card-studio
  (rule director and plan merge), read, direct, edit, matte, stock, `templates/` (kinetic-brand, card-studio)
- `web/` the landing page (`/`) and the studio (`/studio`), Next.js
- `player/` the live players: draws the spec over the clip on a canvas (cut-out, looks, word-synced text, transitions,
  sound, before/after); `player/card-studio.js` is shared with the MP4 renderer
- `recreate/` the 1:1 recreations of the reference reels; `docs/recreate/` their frame-by-frame measurements
- `import/moovi/` source carried over from [Moovi](https://github.com/Ishaan-Gpt/moovi) to port (CONTEXT.md section 11)
- `assets/` fonts, sfx, music bed, vision models, desk props (licences in `assets/CREDITS.md`)
- `refs/` the four reference reels' why · `hackathon/` rules and plans · `docs/` themes, recreations, submission
