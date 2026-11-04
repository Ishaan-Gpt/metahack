# Templates

There are exactly three templates (two common ones plus the explicit-only Polyester, see the end), and `engine/styles.mjs` (`TEMPLATES`) is the single list that says so:

1. **Card Studio** (`card-studio`): the take framed in a clean studio card with a storyboard and lime serif hero words. Engine: `engine/card-studio.mjs`.
2. **Creator Mix** (`creator-mix`): two reels in one. Colour-world backgrounds, whip, zoom, negative, tilt and shatter cuts, number posters, photo strips, and a Before/After with a visible "Edited by Meta" line. Engine: `engine/creator-mix.mjs`, docs in `docs/themes/creator-mix.md`.

Choose one in `job.json` (`"style": "card-studio"` or `"style": "creator-mix"`); `auto` means Card Studio. Each template uses the same two model calls per video (hearing, plan), cached, so a re-run costs nothing. Earlier looks (Clean UI, Creator Studio, Desk Doc, Kinetic Brand) were removed from the code on 5 Nov 2026.

## What the user sees and what they download (for the frontend)
| Template | SHOW (plays in the page) | DOWNLOAD (the only thing offered) |
|---|---|---|
| Card Studio | `edit.mp4`, the full frame: white background, storyboard, card | **Card Studio Zoom**, `card-studio-zoom.mp4`: only the card's edited video, 1080x1920, no storyboard or outside frame |
| Creator Mix | `before-after.mp4`: raw beside the edit, "EDITED BY META" | **Creator Mix Zoom**, `creator-mix-zoom.mp4`: only the After video, 1080x1920 |

Contract: when a job's `status.json` has `state: "done"`, `outputs` carries `template` (`card-studio` | `creator-mix`), `show` (play this one), `download` (file name of the Zoom) and `downloadName` (the name the user's browser saves it as). The file route `GET /api/jobs/<id>/file/<name>` plays any show file; with `?dl=1` it ignores `<name>` and sends only `outputs.download` as an attachment named `downloadName`. So the existing Export link (`file$('edit.mp4', true)`) already downloads the Zoom. The Card Studio Zoom is cut out of the card (inset past its rounded corners) and scaled 2x, so it is slightly softer than a native render.

## Template 3: Polyester (explicit choice only)
`"style": "polyester"` in `job.json`; "auto" never picks it and it is not in the common pair. Input is photos, not a talking take:

```json
{ "id": "...", "style": "polyester",
  "polyester": { "people": [ { "name": "Vignesh", "photos": ["a.jpg", "b.jpg", "..."] }, { "name": "Ishaan", "photos": ["c.jpg", "d.jpg"] } ],
                 "videos": ["optional-clip.mp4"], "audio": "optional-track.mp3" } }
```
Files are paths inside the job folder. One person is fine (the second person's slots reuse the first's photos); 8 to 12 photos give the best cut. Output `polyester.mp4`, 1280x720, 19.3 s (579 frames at 30 fps, timing measured frame by frame from the reference, `docs/POLYESTER.md`). `status.json` outputs: `template: "polyester"`, `show` and `download` are both `polyester.mp4`, `downloadName: "Polyester.mp4"`.
**AI use: none.** No Muse, no Gemini, no network calls: cut-outs run locally (U2-Net human segmentation), everything else is image code. The song is never shipped; a track is only added if the user provides `audio`.
Cost on this build box (16 cores): about 12 s for 9 photos, about 3 to 4 min render. The web upload form is still single-file; Polyester's multi-photo upload needs a small frontend addition that writes the `polyester` block above.
