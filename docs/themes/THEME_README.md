# Card Studio theme (branch theme-card-studio)

A second theme for the metahack editor, modelled on the @edita.visuals reel (light studio background, the talking head in a
rounded card, badge, storyboard card, two line CTA, lime serif hero captions, keyword graphic cards, split B-roll, bullet
lists, big-text post card, orbiting icons, jump zooms). The full breakdown of the reference is in `docs/themes/card-studio.md`.

## The Meta Model API key is REQUIRED
Card Studio needs `MODEL_API_KEY` (the Meta Model API key). Put it in `.env.local` at the repo root (git-ignored, read by
`engine/env.mjs` like every other key):
```
MODEL_API_KEY=your-meta-model-api-key
```
Without it the theme does not run. `node engine/card-studio.mjs ...` exits before any work with
`MODEL_API_KEY is required for the Card Studio theme (Meta Model API)`. There is no silent fallback to rules or to Groq.

## Exactly two Meta calls per video (low credits, no feedback loop)
| # | call | model | sends | returns | typical size |
|---|------|-------|-------|---------|--------------|
| 1 | transcription | Muse Voice Transcribe (`POST {base}/asr/transcribe`, multipart: request JSON + 16 kHz mono WAV) | the clip's audio | transcript and speech turns with times (Meta gives turn level times; `engine/meta.mjs` places each word inside its turn by plain code) | request is about 32 KB per second of speech (a 35 s clip is about 1.1 MB), no tokens |
| 2 | plan | Muse Spark (`POST {base}/chat/completions`, strict `json_schema`) | the whole transcript plus the director's segment list (start, end, text) | per segment: layout (one of `face graphic split list post wide orbit topsquare`), hero caption word, 0 to 2 icon names (from the fixed list `ig yt tt fb x heart play chat bell cash chart camera`), 1 to 2 concrete stock searches ("film camera on set"), transition | about 1,000 input and 300 output tokens for a 10 segment video; `max_tokens` is capped at about 160 per segment plus headroom; temperature 0, minimal reasoning, one attempt |

Rules for both calls: one attempt each, no retries, no critique or multi turn. If the plan comes back with a segment that fails
the schema check (unknown layout, a hero word that is not in the segment, ...), only that segment goes back to the rule director
and the reason is logged. There is never a third call.

`META_API_BASE` overrides the base URL (default `https://api.meta.ai/v1`); the model names are the two constants at the top of
`engine/meta.mjs`, so if Meta's endpoint paths or model ids differ for your account, change them there (the only file that
knows the wire format).

## Caching (a re-run costs 0 credits and is identical)
Both responses are cached under `data/<clip>/meta/`, keyed by the sha256 of the input audio (call 1) and of the transcript plus
segment list plus schema (call 2). Re-running the same video makes zero Meta calls and gives the same edit. After every run
`data/<clip>/meta-usage.json` records the calls made, cache hit per call, seconds, token usage when Meta returns it, and a
one line summary is printed, for example `meta: 2 calls, 0 cache hits: transcribe, plan called (1018 in / 306 out tokens)`.
Stock pictures are cached per search word under `data/stock/`.

## All 8 reference edit types in every video (hard rule)
After the Spark plan, a coverage pass in code makes sure every video uses all 8 edit types: face card with jump zoom, graphic
card (wash in, wipe out), zoom out to a small card with orbiting icons, face in a top square over a pale lower half, split with
picture changes, bullet list, app/post card with a cursor tap, wide card with big serif words as spoken. A missing type goes to
the best fitting stretch of the transcript (numbers to the wide card, "post/share/app" to the post card, social words to orbit,
a turn like "but" to the top square, a concrete noun to split or graphic, a list to the bullet list), carved from a face segment
or from a duplicate layout. The first 1.8 s and last 1.2 s are always the face. The cadence is a change every 2 to 3 s: long
face segments are cut at word boundaries and each piece gets the next zoom level (a jump zoom). Clips under 20 s use shorter
holds (about 1.2 s minimum). Every change has a whoosh, pop or click. Captions start below the chin of the current face box, never over the mouth. The log line
`coverage: added ...` and `director.coverage` in `spec.card.json` list anything the pass had to add; a clip with too little
speech to fit all 8 prints `STILL MISSING ...`. `python3 tools/coverage_sheet.py data/clips/<clip> out.mp4 sheet.jpg` makes a labeled frame per type.

## One command (raw face video in, MP4 out)
```bash
node engine/card-studio.mjs path/to/raw.mp4 --out out.mp4 --badge "Meta AI" --handle "@me" --kw GUIDE
#   Meta transcribe -> rule director -> Meta Spark plan -> coverage pass -> stock fetch (cached) -> render -> MP4
#   optional: --cta1 'Follow & comment "{KW}"' --cta2 'for the full guide' --no-stock --no-music --dir data/clips/name
```
Everything except the two Meta calls is code: sentence splitting, caption chunks, timing, zoom levels, B-roll budgets (the rules
still check the model's picks: face only hook and tail, face hidden at most 25% of the time, never two hidden-face cards in a
row), stock fetch using the model's queries, all drawing, SFX, mix and loudness.

## Test without a key: tools/meta-standin.mjs (TEST ONLY)
There is no Meta key on the build box, so `tools/meta-standin.mjs` is a tiny local server that answers the two endpoints in
Meta's exact request and response shapes. It is NOT Meta and not a model: transcription runs local faster-whisper
(`engine/hear_local.py`) and the "plan" is a deterministic keyword heuristic with concrete search phrases. It proves the plumbing,
caching and rule checks, not Meta's judgement; `meta-usage.json` marks such runs `standin: true`. Never use it for a real video.
```bash
node tools/meta-standin.mjs 8799 &        # setsid/nohup it with output to a file if you want it to outlive the shell
META_API_BASE=http://127.0.0.1:8799/v1 MODEL_API_KEY=standin node engine/card-studio.mjs raw.mp4 --out out.mp4
```
For real use delete `META_API_BASE` and put your real key in `.env.local`.

## Setup
```bash
npm install                       # adds @napi-rs/canvas (the MP4 renderer draws with it; no browser needed)
pip install faster-whisper opencv-python-headless   # only the stand-in and the face boxes need these
```
Step by step (the same result): `node engine/prep.mjs raw.mp4 data/clips/c` with `THEME=card-studio` for the Meta transcript, then
`node engine/card-studio.mjs data/clips/c --out out.mp4`. Live preview: `node serve.mjs 4700`, then
`http://127.0.0.1:4700/player/card-studio.html?clip=data/clips/c`. Other themes (kinetic-brand) still use Groq or local whisper
and are unchanged.

Speed on a 16 core box: draw 12 to 13 ms a frame; an 18.6 s clip renders in about 40 s, plus the Meta calls.

## Env keys
- `MODEL_API_KEY` (Meta Model API): required for this theme.
- `PIXABAY_API_KEY`: optional. Stock photos come from Pixabay first; no key falls back to Openverse and Wikimedia Commons (no key). Licence and credit are saved per picture in `data/stock/<query>/meta.json` and listed in `spec.card.json` under `credits`.
- `GROQ_API_KEY`: not used by this theme (other themes only).

## Files
- `engine/meta.mjs` the two Meta calls, schema, validation, cache, usage log
- `engine/card-studio.mjs` rule director + plan merge + coverage pass -> `spec.card.json`
- `engine/templates/card-studio.json` theme values (layout, palette, fonts, motion, rules, SFX)
- `player/card-studio.js` drawing module (browser preview and MP4 renderer), `player/card-studio.html` preview
- `tools/render-card.mjs` MP4 export (ffmpeg decode -> canvas -> ffmpeg encode, SFX, music bed, two pass loudnorm)
- `tools/meta-standin.mjs` TEST ONLY stand-in for the Meta endpoints; `tools/coverage_sheet.py` coverage sheet
- `engine/stock.mjs` Pixabay / Openverse / Wikimedia Commons provider with disk cache and credits
- `engine/hear_local.py` local word timings (stand-in only); `engine/faces.py` face boxes; `engine/prep.mjs`; `engine/edit.mjs` (`--theme`)

## Known gaps
- The real Meta endpoints were not reachable from the build box (no key), so call 1 and call 2 are verified against the stand-in and Meta's published request shapes only. First run with the real key: check `data/<clip>/meta-usage.json` and the printed summary.
- Video B-roll playback (photos only; Pixabay videos are fetched and cached but not drawn). Platform icons are simple drawn glyphs, not the real logos.
- Meta returns turn level times, so word times inside a turn are placed by code (voiced-frame weighted); captions can be a few tenths of a second off on long turns.
