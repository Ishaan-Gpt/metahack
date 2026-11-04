# Templates

There are exactly three templates (two common ones plus the explicit-only Polyester, see the end), and `engine/styles.mjs` (`TEMPLATES`) is the single list that says so:

1. **Card Studio** (`card-studio`): the take framed in a clean studio card, centred on a light page, with lime serif hero words. The storyboard card is off for now (Ishaan, 5 Nov: `engine/styles/card-studio.json` `layout.storyboard.show: false`, card centred). Engine: `engine/card-studio.mjs`.
2. **Creator Mix** (`creator-mix`): two reels in one. Colour-world backgrounds, whip, zoom, negative, tilt and shatter cuts, number posters, photo strips, and a Before/After with a visible "Edited by Meta" line. Engine: `engine/creator-mix.mjs`, docs in `docs/themes/creator-mix.md`.

Choose one in `job.json` (`"style": "card-studio"` or `"style": "creator-mix"`); with `auto` (every upload and sample from the studio) uploads take turns between the two engines (`data/jobs/.engine-turn`), and a prompt can switch engines later. Each template uses the same two model calls per video (hearing, plan), cached, so a re-run costs nothing. Earlier looks (Clean UI, Creator Studio, Desk Doc, Kinetic Brand) were removed from the code on 5 Nov 2026.

## Preview first (5 Nov 2026)
A new job runs `watch -> direct -> build` and STOPS: no MP4 yet. The studio plays a live preview drawn in the browser with `player/card-studio.js` / `player/creator-mix.js`, and offers the final render only when the user is done editing.

- End of build: `status.state: "preview"`, `status.outputs` unset (or kept from an earlier final render), and
  `status.preview = { engine, spec: "spec.card.json" | "spec.mix.json", video: "graded.mp4", template: "preview.json", edits: <spec.edits.length>, t: <ISO time> }`.
  The files sit in `<job>/clip/`: `spec` is the plan, `video` the graded take the frames are drawn over, and `preview.json` is the FULLY MERGED template T the renderer would use (Card Studio: `merge_(loadStyle(spec.style), spec.overrides)` as `tools/render-card.mjs`; Creator Mix: `merge_(templates/creator-mix.json, spec.overrides)` as `tools/render-mix.mjs`), so the page never imports engine code. `engine/preview.mjs` writes it; it is refreshed after every edit, regrade and render.
- Edits (docs/EDIT-API.md) change the plan and refresh `preview.json`; they never render. `needs: "none"` keeps the job in `preview`; `"regrade"` and `"full"` mean: start `engine/run.mjs` again (it reads the flag `engine/edits.mjs` wrote into `job.json`).
- Render button: set `job.json` `render: true` and queue the job. That run skips to `render -> mix -> share` and ends `state: "done"` with `outputs` as below, plus `status.renderedEdits = spec.edits.length`. Compare it with `status.preview.edits` to know whether the MP4 is out of date (an edit after a render puts the job back in `preview`, outputs kept).
- `run.mjs` modes, in order: `style: "polyester"` (Polyester branch, renders its MP4; with `render: true` and `polyester.mp4` already made it just ends `done`), `render` or the old `rerender` (final MP4), `regradeOnly` (re-grade `graded.mp4`, back to `preview`, one stage `grade`), `redirect` (engine switch: direct again from the cached words, stage `watch` skipped), else a full new take. Stages per mode: full `watch, direct, build`; render `render, mix, share`; regrade `grade`; Polyester `cutout, render, share`.
- Jobs from before preview-first (an `edit.mp4`, state `done`) still work: they show their MP4 until the first edit, then the preview; `render: true` makes a new MP4.

## What the user sees and what they download (for the frontend)
The studio preview has two views for every template (Ishaan, 5 Nov), both built in the browser, no server-made before/after:
- **Edit**: the actual edited clip. While editing it is the live preview (`player/*.js` drawn over `clip/graded.mp4`); once rendered and up to date it is the final MP4 (`outputs.show`, i.e. `edit.mp4`).
- **Before / After**: a plain white card, the raw take on the left and the edit on the right in step, with a small dark "Muse" pill on top of the After.

Every element in the Edit view can be clicked (caption, word, photo beat, effect, badge, handle, CTA): it becomes a chip in the chat and the next prompt edits only that element (`target`, docs/EDIT-API.md).

| Template | DOWNLOAD (the only thing offered) |
|---|---|
| Card Studio | **Card Studio Zoom**, `card-studio-zoom.mp4`: only the card's edited video, 1080x1920 |
| Creator Mix | **Creator Mix Zoom**, `creator-mix-zoom.mp4`: only the After video, 1080x1920 |

Contract: when a job's `status.json` has `state: "done"`, `outputs` carries `template`, `show`, `download` and `downloadName`. The file route `GET /api/jobs/<id>/file/<name>` plays any show file; with `?dl=1` it sends only `outputs.download` as an attachment named `downloadName`. Creator Mix still writes `before-after.mp4` ("EDITED BY META", `tools/ba-wrap.py`) for sharing; the studio no longer shows it. The Card Studio Zoom is cut out of the card and scaled 2x, so it is slightly softer than a native render.

Reference samples: the five takes whose edits were rebuilt once in code but have no engine yet (ba1 Brand ad, ba2 Creator studio, ba3 $10 vs $80, ba4 Interview desk, self1 Our own edit; not ba5, the storyboard card) open with that edit already applied (the live recreation player). A prompt on one starts a real job on its raw take in an engine and applies the prompt when its preview is ready.

## Template 3: Polyester (explicit choice only)
`"style": "polyester"` in `job.json`; "auto" never picks it and it is not in the common pair. Input is photos, not a talking take:

```json
{ "id": "...", "style": "polyester",
  "polyester": { "people": [ { "name": "Vignesh", "photos": ["a.jpg", "b.jpg", "..."] }, { "name": "Ishaan", "photos": ["c.jpg", "d.jpg"] } ],
                 "videos": ["optional-clip.mp4"], "audio": "optional-track.mp3" } }
```
Files are paths inside the job folder. One person is fine (the second person's slots reuse the first's photos); 8 to 12 photos give the best cut. Output `polyester.mp4`, 1280x720, 19.3 s (579 frames at 30 fps, timing measured frame by frame from the reference, `docs/POLYESTER.md`). `status.json` outputs: `template: "polyester"`, `show` and `download` are both `polyester.mp4`, `downloadName: "Polyester.mp4"`.
**AI use: none.** No Muse, no Gemini, no network calls: cut-outs run locally (U2-Net human segmentation), everything else is image code. The song is never shipped; a track is only added if the user provides `audio`.
Also a prompt skill: on any talking-head job, "make it a polyester edit" (or "spiderman edit", "glitch montage edit") pulls 10 stills of the speaker from the take (`<job>/poly-photos/`), writes the `polyester` block with the handle's first word as the name, and re-runs the job into this branch; "switch back to card studio" returns to the talking edit (docs/EDIT-API.md, op `polyester`).
Cost on this build box (16 cores): about 12 s for 9 photos, about 3 to 4 min render. The web upload form is still single-file; Polyester's multi-photo upload needs a small frontend addition that writes the `polyester` block above.
