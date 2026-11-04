# Engine results: five styles on one take (2026-11-04)

Input: `data/samples/sample.mp4`, a 22.0 s 1920x1080 CC BY-SA talking head (54 words, the cut is 21.6 s).
Run: `node engine/run.mjs data/jobs/<id>` headless, with the TEST stand-in for Meta (`tools/meta-standin.mjs`, so the plan
is a keyword heuristic, not Muse Spark's judgement) and Groq Whisper for the words. Every job ended `state: done` with
`edit.mp4` and `before-after.mp4`. Times are wall seconds from `status.json` (`stages[].seconds`, `seconds`).

Box: Windows 11, 8 logical cores. The CPU was shared the whole time (the studio web app was running its own jobs and a
`next build`), so the numbers are upper bounds, not a clean benchmark.

## Final runs (prep reused: these show direct / build / render per style)

| style | job | state | take s (raw -> cut) | total s | watch | direct | build | render | mix | share | beats | layouts used | photos | Meta calls |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Card Studio | stylecard1 | done | 22 -> 21.6 | 377.9 | 0.2 | 26.1 | 4.4 | 326.7 | 6.4 | 13 | 11 | face, topsquare, wide, graphic, textbehind, post, list, split, orbit | 2 | plan (stand-in), cached |
| Kinetic Brand | stykinetic | done | 22 -> 21.6 | 525.3 | 0.2 | 59.3 | 9.3 | 442 | 3.4 | 11 | 11 | face, graphic, textbehind, list, split | 2 | plan (stand-in), cached |
| Creator Studio | stycreator | done | 22 -> 21.6 | 206.6 | 0.2 | 23.4 | 2.1 | 170.2 | 2.2 | 8.4 | 11 | face, textbehind, list, graphic, orbit | 1 | plan (stand-in), cached |
| Clean UI | styclean01 | done | 22 -> 21.6 | 198.9 | 0.2 | 22.9 | 0 | 140.7 | 16.2 | 18.8 | 11 | face, topsquare, wide, post, list, graphic, orbit | 1 | plan (stand-in), cached |
| Desk Doc | stydeskdoc | done | 22 -> 21.6 | 434.7 | 0.5 | 64.2 | 6.4 | 348.4 | 4.4 | 10.7 | 11 | face, graphic, textbehind, list, split | 2 | plan (stand-in), cached |

`direct` includes the style's own re-grade of the cut (about 20 to 40 s of ffmpeg). `build` is the person matte and the
stock photos; here the matte came from the shared cache and the photos from `data/stock`.

## Cold run: one 22 s take, nothing cached (the honest end-to-end number)

| style | job | state | take s (raw -> cut) | total s | watch | direct | build | render | mix | share | beats | layouts used | photos | Meta calls |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Desk Doc | stycoldrun | done | 22 -> 21.6 | **611.7** | 66.3 | 38.9 | 219.2 | 276.3 | 2.1 | 8.7 | 11 | face, graphic, textbehind, list, split | 2 | plan (stand-in) |

watch = face-aware crop 23 s + Groq Whisper 1 s + pause cut 42 s. build = person matte (u2net_human_seg + GrabCut edge,
42 frames at 15 fps) about 210 s + photos. render = 648 frames drawn by napi canvas and encoded. Same output bytes as
`stydeskdoc` (the engine is deterministic). A style without text-behind (Clean UI) skips the matte: about 200 s less.

## First runs, before the fixes (why the fixes)

| style | job | state | total s | watch | direct | build | render | note |
|---|---|---|---|---|---|---|---|---|
| Card Studio | stylecard1 | done | 1251.6 | 45.2 | 650.4 | 4.6 | 534.5 | matte 82 frames at 30 fps from graded.mp4: 577 s, counted in direct |
| Kinetic Brand | stykinetic | **error RENDER** | 782 | | | | | `roundRect` radius -8 on the full-frame split (r 0): ended as status error with a human sentence, no hang |
| Clean UI | styclean01 | done | 681.1 | 46.1 | 45.5 | 261.8 | 315.7 | computed a 259 s matte for a text-behind the style does not even allow |
| Desk Doc | stydeskdoc | done | 334.7 | 26 | 29.5 | 129.3 | 139.5 | split dropped: no on-topic photo for "themselves close up photo" |
| (earlier t001) | t001 | error RENDER | 6707+ | 114 | 6591 | | | stock search retried every variant on a dead Openverse for ~70 min |

## What changed

- `engine/stock.mjs`: Commons first (Openverse answered 500 after 16 s), 25 s budget per query, a source that fails at
  the network level is dropped for that query; Commons results were all being rejected (the filter matched
  "wikimedia" in every URL); relevance check (a photo must name the query's main word in title, file name, page or tags;
  title matches rank first; scanned old-book pages dropped; pronoun-only queries get no photo); cache v2 re-fetches old
  unchecked entries and remembers a checked miss for 6 h. "Assyrians" went from gravel / a stone wall / an 1827 map to
  the Assyrian flag; "Syriac" to Syriac letters; "themselves" to no photo.
- `engine/card-studio.mjs`: a photo query or graphic title with nothing picturable is replaced by the stretch's best
  stock noun; matte from the ungraded `cut.mp4` (one cache for all styles); no matte and no photos for layouts the style
  disallows; `textBehindBg` per style; a `build:` log line so direct and build are timed apart.
- `engine/person_matte.py`: 30 s socket timeout on the weights download; fps in the cache key (a 30 fps cache was about
  to answer for the lead's new 15 fps frame numbers with the wrong masks).
- `engine/run.mjs`: every child step has a time limit (render 2400 s, others 1200 s) and is killed past it; a watchdog
  on the in-process director; unknown style fails at preflight (BAD_STYLE); the render error keeps the exit reason.
- `engine/meta.mjs`: 120 s timeout on the chat call, 300 s on transcribe (a silent endpoint fails, never hangs).
- `engine/prep.mjs`: a re-run skips steps whose outputs exist; no throwaway grade when run.mjs grades per style.
- `tools/render-card.mjs`: x264 `veryfast`, CRF 21 (was `medium`, 23).
- `player/card-studio.js` (all behind `chrome === false`, Card Studio unchanged): split radius and paper; graphic title,
  orbit title, wide and post text, list items and the text-behind word in the style's display face; readable list size;
  text-behind colour field uses the style's ground (Creator Studio violet); pale topsquare panel and its hero word use the
  style's own colours (Clean UI orange, not studio lime).
- `engine/styles/creator-studio.json`: `textBehindBg: "warm"` (the colour field behind the speaker).

## Still weak

- The plan comes from the stand-in heuristic: Kinetic, Creator and Desk Doc get only 4 to 5 layouts on this take and the
  coverage pass fills the rest the same way for every style, so the five edits share the same beat grid.
- The person matte costs about 3.5 min of CPU per take even at 15 fps (GrabCut edge refine is most of it).
- Render is 140 to 440 s for 21.6 s, mostly contention; draw is 40 to 110 ms a frame.
- Clean UI `wide` puts the speaker in a tall thin column on the full frame; `post` leaves a large empty white band.
- The split caption sits on the seam between photo and face in every style (by design from Card Studio, busy on Kinetic).

## Auto mode, quiet CPU, through the live studio (2026-11-05 01:07 IST)

Started with the studio's own sample route (`POST /api/sample?style=auto`), nothing else running, test stand-in for the
director. Auto kept Card Studio's look and mixed every style's layouts (`spec.card.json`: `mix: true`).

| job | state | total s | watch | direct | build | render | mix | share | beats | layouts used |
|---|---|---|---|---|---|---|---|---|---|---|
| 8uco8enqlh | done | **313.5** | 31.2 | 30.9 | 100 | 139.2 | 2.5 | 8.2 | 11 | all 9 |
