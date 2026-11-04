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
| 2 | plan | Muse Spark (`POST {base}/chat/completions`, strict `json_schema`) | the whole transcript plus the director's segment list (start, end, text) | per segment: layout (one of `face graphic split list post wide orbit topsquare textbehind`), plus an optional `background` (`blur pale warm`, only read for `textbehind`), hero caption word, 0 to 2 icon names (from the fixed list `ig yt tt fb x heart play chat bell cash chart camera`), 1 to 2 concrete stock searches ("film camera on set"), transition | about 1,000 input and 300 output tokens for a 10 segment video; `max_tokens` is capped at about 160 per segment plus headroom; temperature 0, minimal reasoning, one attempt |

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

## All 9 edit types in every video (hard rule)
After the Spark plan, a coverage pass in code makes sure every video uses all 9 edit types: the 8 reference ones (face card with
jump zoom, graphic card with wash in and wipe out, zoom out to a small card with orbiting icons, face in a top square over a
pale lower half, split with picture changes, bullet list, app/post card with a cursor tap, wide card with big serif words as
spoken) and the 9th, `textbehind` (below). A missing type goes to the best fitting stretch of the transcript (numbers to the
wide card, "post/share/app" to the post card, social words to orbit, a turn like "but" to the top square, a concrete noun to
split or graphic, a list to the bullet list, one strong short keyword to text-behind), carved from a face segment or from a
duplicate layout. The first 1.8 s and last 1.2 s are always the face. The cadence is a change every 2 to 3 s: long face
segments are cut at word boundaries and each piece gets the next zoom level (a jump zoom). Clips under 20 s use shorter holds
(about 1.2 s minimum) and long layouts hand their tail back to the face to make room. Every change has a whoosh, pop or click
(text-behind: a whoosh as the word slams in and a pop on the spoken word). Captions start below the chin of the current face
box, never over the mouth.

## 9th type: text-behind (the person cut out in front of a huge word)
Three layers, back to front: (a) a backdrop, `blur` (a darkened, heavily blurred copy of the same video, a soft gradient of the real wall and light; the default),
`pale` (the theme's pale card with a peach glow) or `warm` (dark warm gradient), picked by the Spark plan's `background`;
(b) ONE huge word (the hero word of the segment, bold sans, fitted to the card width and stretched tall like poster type,
slamming in with a small scale and a slow sideways drift for parallax), sized from the head top so about half of each letter
stays above the head and the hair hides the lower part; (c) the person on top, cut out with a per frame alpha matte. The face keeps the framing of a face card (same crop, same
x position); only when the head is so high in the frame that there is no room above it for a word, the person is lowered
(up to 24% of the card, the body just runs off the bottom edge) so the word has headroom (`textBehind.headroom` and
`maxLower` in the template; `maxFace`/`minScale` can shrink a very large head instead, off by default because it shows the
source's side edges). The segment holds 1.5 to 2.5 s, never in the first 1.8 s or
last 1.2 s, starts about 0.35 s before the word is spoken, and has no caption (the word is the caption). The plan may use it on
1 segment of a clip under 28 s (2 under 50 s, then 3); the coverage pass adds one when the plan has none. No extra Meta call.

`engine/person_matte.py` makes the matte, all local, no credits, no network at render time:
- Model: U2-Net human segmentation (`u2net_human_seg.onnx`, 176 MB, Apache-2.0 weights from the U-2-Net project, the same file
  `rembg` ships) run with `onnxruntime` on CPU. Fallbacks in this order: mediapipe selfie segmentation (only if the package with
  its legacy solutions is installed; not used on the build box), `u2netp` (4.7 MB, Apache-2.0, rougher), OpenCV GrabCut seeded
  from the YuNet face box (no download at all). `--model` forces one.
- Edges: the model output is sharpened with a smoothstep, snapped to the real picture edge with a half size GrabCut whose trimap
  comes from the model matte, choked about 8 px (a soft source gives the model a generous edge), unioned with a small face
  ellipse so the head top never has a hole, blended over 3 frames (small, with a motion guard so there are no ghosts) and
  feathered 2 to 3 px. The frames are 30 fps to match the renderer; only the frames of the text-behind segments (plus 0.1 s
  before and 0.7 s after, for the transition) are processed.
- Speed (16 cores, 1080x1920 source): about 0.7 s a frame, 83 to 85 frames for one segment in 55 to 70 s. A whole 37 s clip
  (1,100 frames) would take about 13 min, which is why only the segments are matted. Memory is small.
- Weights go to `$MATTE_WEIGHTS_DIR` (default `~/.cache/card-studio-matte`), downloaded once on first use from the
  U-2-Net release on GitHub; they are never committed.
- Cache: `data/<clip>/matte/<sha of graded.mp4 first 12>-<model>-v4/m00123.png` (RGBA, alpha = person) plus `index.json`. A
  re-run computes only frames that are missing, so a repeat costs nothing.
- Fallback (never a crash): if the matte step fails (no weights and no network, a missing library, ...) the coverage pass turns
  the text-behind segments into plain face segments, logs `coverage: text-behind matte failed (...), fell back to face` and
  records it in `spec.card.json` under `director.coverage`; at render time a frame with no matte also draws the face card.
  `CARD_FORCE_MATTE_FAIL=1` forces the failure for a test.
- Standalone: `python3 engine/person_matte.py graded.mp4 --out data/clips/c/matte --ranges 5.0-7.4,12-14`.
Known weak points: a soft or low resolution source makes a soft edge (a faint light rim can remain on cheek and jaw where the
wall and the skin have the same colour); a hand held far from the body at head height is still kept (the model sees it), but a
fast hand can blur; text-behind shows the matte at the card size only (player preview in the browser plays the face card, the
MP4 renderer draws the effect).
`coverage: added ...` and `director.coverage` in `spec.card.json` list anything the pass had to add; a clip with too little
speech to fit all 9 prints `STILL MISSING ...`. `python3 tools/coverage_sheet.py data/clips/<clip> out.mp4 sheet.jpg` makes a labeled frame per type.

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
pip install faster-whisper opencv-python-headless onnxruntime   # stand-in, face boxes, and the text-behind matte
```
Step by step (the same result): `node engine/prep.mjs raw.mp4 data/clips/c` with `THEME=card-studio` for the Meta transcript, then
`node engine/card-studio.mjs data/clips/c --out out.mp4`. Live preview: `node serve.mjs 4700`, then
`http://127.0.0.1:4700/player/card-studio.html?clip=data/clips/c`. Other themes (kinetic-brand) still use Groq or local whisper
and are unchanged.

Speed on a 16 core box: draw 12 to 13 ms a frame; an 18.6 s clip renders in about 40 s, plus the Meta calls, plus about a minute for the text-behind matte the first time.

## Env keys
- `MODEL_API_KEY` (Meta Model API): required for this theme.
- `PIXABAY_API_KEY`: optional. Stock photos come from Pixabay first; no key falls back to Openverse and Wikimedia Commons (no key). Licence and credit are saved per picture in `data/stock/<query>/meta.json` and listed in `spec.card.json` under `credits`.
- `GROQ_API_KEY`: not used by this theme (other themes only).

## Files
- `engine/meta.mjs` the two Meta calls, schema, validation, cache, usage log
- `engine/card-studio.mjs` rule director + plan merge + coverage pass -> `spec.card.json`
- `engine/person_matte.py` person alpha matte for text-behind (local model, cached per clip)
- `engine/templates/card-studio.json` theme values (layout, palette, fonts, motion, rules, SFX)
- `player/card-studio.js` drawing module (browser preview and MP4 renderer), `player/card-studio.html` preview
- `tools/render-card.mjs` MP4 export (ffmpeg decode -> canvas -> ffmpeg encode, SFX, music bed, two pass loudnorm)
- `tools/meta-standin.mjs` TEST ONLY stand-in for the Meta endpoints; `tools/coverage_sheet.py` coverage sheet
- `engine/stock.mjs` Pixabay / Openverse / Wikimedia Commons provider with disk cache and credits
- `engine/hear_local.py` local word timings (stand-in only); `engine/faces.py` face boxes; `engine/prep.mjs`; `engine/edit.mjs` (`--theme`)

## Known gaps
- Stock pictures without a `PIXABAY_API_KEY` come from Openverse and Wikimedia Commons, which often return weak matches for a concrete search (the model's queries help, a Pixabay key helps more). Any picture that is a screenshot, meme, logo or draft is skipped by plain filters.
- The real Meta endpoints were not reachable from the build box (no key), so call 1 and call 2 are verified against the stand-in and Meta's published request shapes only. First run with the real key: check `data/<clip>/meta-usage.json` and the printed summary.
- Video B-roll playback (photos only; Pixabay videos are fetched and cached but not drawn). Platform icons are simple drawn glyphs, not the real logos.
- Meta returns turn level times, so word times inside a turn are placed by code (voiced-frame weighted); captions can be a few tenths of a second off on long turns.
