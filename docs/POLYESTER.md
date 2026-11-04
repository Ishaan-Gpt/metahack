# Reference edit breakdown

> Credit: this breakdown measures **"Polyester Spiderman Edit (Original by foryouamv)"**, https://youtu.be/zswT92VzOYM (uploaded by BlackRob183; the original edit is by @foryouamv on TikTok). It is a visual reference for an independent re-creation; none of its footage, audio or watermark is used.

Source: "Polyester Spiderman Edit (Original by foryouamv)", https://youtu.be/zswT92VzOYM
Reference copy (not shipped): `reference/original.mp4` is 1280x720, 30 fps, 579 frames (19.30 s), AAC audio.
I reviewed all 579 frames by eye using the contact sheets in `reference/frames/sheet_01..13.png`. Each tile there is labeled with its frame number.

## The style in one paragraph

Every shot has a **cut-out hero** (the subject with the background removed) layered over a **background montage that changes on every single frame**. Those background frames are radial- or zoom-blurred clips, so it plays like a 30-fps strobe. Shots change on beat hits through **full white flash frames**, often followed by **one inverted/RGB-split glitch frame**. Some shots come in through **split screens**: a horizontal top/bottom split, a diagonal band or a vertical bar, with **white bars punching in on each beat**. The grade is cool teal-blue with crushed blacks, high contrast and sharpening. The mid-section has a **title card with the subject standing in front of big glitching text**.

## Music timing

- The tempo detects as ~187.5 BPM, which feels like ~94 BPM. The 8th-note grid is 0.16 s, about 4.8 frames.
- The drop/hit is at **4.75 s (frame 142)**. It's the strongest onset in the track, and the first white flash is at frame 143.
- Every white flash below sits on a detected onset within ±2 frames. Full list: `python -I tools/beats.py reference/original.mp4`.

## Shot list (frame numbers at 30 fps)

| # | Frames | Time | What happens | Rebuild with your media |
|---|---|---|---|---|
| 1 | 0–95 | 0.00–3.17 | Low-angle close-up of the hero (cut-out, slow push-in). The background montage changes every frame. The real background (building and sky) creeps up from the bottom edge. | Cut-out photo of you + background montage clips |
| 1b | 96–127 | 3.20–4.23 | The montage shrinks to a thin horizontal slit across the middle that keeps flickering, then closes. | Same |
| 1c | 128–142 | 4.27–4.73 | Clean shot. White silhouette flashes of the *next* pose at 129, 134 and 139 (on the 8th notes), and the next pose fades in. | Pose 2 silhouette |
| ⚡ | 143–144 | 4.77 | **Drop.** White frame, then one inverted/glitched frame. | — |
| 2 | 145–189 | 4.83–6.30 | Full-body standing shot at night (cut-out). A diagonal band behind the subject shows the per-frame montage and rotates and widens. | Full-body photo of you |
| 2b | 187–199 | 6.23–6.63 | A vertical white bar wipes across. Cut to a face close-up, with a montage panel on the right and a white bar sliding. | Face close-up |
| ⚡ | 200–201 | 6.67 | White, then inverted RGB-split. | — |
| 3 | 202–242 | 6.73–8.07 | Dark head-and-shoulders close-up (cut-out), letterbox band on top, per-frame blurred montage behind. | Moody close-up |
| 3b | 243–257 | 8.10–8.57 | Horizontal split: shot 3 on top, a new action shot below. White bars at 243, 249 and 254 (on beats). The bottom shot takes over at 255. | Action photo/clip |
| ⚡ | 258–259 | 8.60 | White, then inverted. | — |
| 4 | 260–281 | 8.67–9.37 | Mid-jump cut-out. A circular "tunnel" opens behind the subject and grows, with the montage inside it. | Jump/action pose |
| 4b | 282–314 | 9.40–10.47 | Full-frame montage behind the jump pose. The next pose (crouch) appears via white silhouette flashes at 304–312. | Crouch pose |
| ⚡ | 315–316 | 10.50 | White. | — |
| 5 | 317–325 | 10.57–10.83 | Fade from white into a crouching pose in a bright city scene. | Crouch photo |
| ⚡ | 326 | 10.87 | White. | — |
| 6 | 327–335 | 10.90–11.17 | Fade from white: upside-down hanging shot with a lightning overlay. | Any photo, flipped |
| ⚡ | 336 | 11.20 | White. | — |
| 7 | 337–363 | 11.23–12.10 | Fade-in, upside-down close-up. Then a horizontal split with a face close-up rising from below, white bars at 345, 350, 355 and 360 (each on a beat). | Two close-ups |
| ⚡ | 364–365 | 12.13 | White. | — |
| 8 | 366–372 | 12.20–12.40 | Face close-up over a city skyline. White silhouette of the next pose at 370, then the pose itself. | Close-up + next pose |
| ⚡ | 373–374 | 12.43 | White, then inverted. | — |
| 9 | 375–416 | 12.50–13.87 | Cut-out hero (looking down) over the per-frame blurred montage. RGB split on entry. | Looking-down photo |
| 9b | 417–428 | 13.90–14.27 | Diagonal white bars and triangular shard wipes reveal a rooftop wide shot. Horizontal white bar at 427. | Wide/landscape shot |
| ⚡ | 429–431 | 14.30 | White ×2, then inverted. | — |
| 10 | 432–473 | 14.40–15.77 | **Title card.** Hero cut-out in front of huge "SPIDER-MAN" text (so the text sits *behind* the person). The text's colour glitches every frame (cyan/red/white). | **Your name** in place of the text |
| 10b | 474–487 | 15.80–16.23 | Horizontal split: lightning shot on top, title below. White bars at 474, 480 and 485. The top shot takes over. | Energetic clip |
| ⚡ | 488–489 | 16.27 | White, then inverted. | — |
| 11 | 490–532 | 16.33–17.73 | Crouching hero with a **glowing animated emblem outline behind them** that changes colour every frame (white/cyan/red). | Crouch photo + an emblem of your choice |
| 11b | 533–545 | 17.77–18.17 | Vertical white bar wipes left→right and reveals an explosion action shot. | Big action shot |
| ⚡ | 546–547 | 18.20 | White. | — |
| 12 | 548–555 | 18.27–18.50 | Fade from white: explosion swing. | Same |
| ⚡ | 556 | 18.53 | White. | — |
| 13 | 557–565 | 18.57–18.83 | Fade from white: electric flying shot, heavy blue grade. | Action clip |
| ⚡ | 566 | 18.87 | White. | — |
| 14 | 567–578 | 18.90–19.27 | Fade from white: extreme close-up of the eye (end shot). | Close-up of your eye |

## Do not copy

- The "4GAMV" watermark in the bottom right.
- Any Spider-Man footage or the "SPIDER-MAN" wordmark. Your name and your own media replace them.

## What the rebuild needs from you

- **~12–15 photos of you (the "hero")**: full body, close-up, face, crouch, jump/action, looking down and one eye close-up. A clear outline against the background helps the cut-out.
- **Background montage material**: the montage changes every frame, so it eats a lot of footage. Your own videos are best (I slice them into single frames and blur them), ideally 1–3 minutes total. 40+ extra photos also work.
- **Text for the title card** (shot 10), e.g. your name.
- **Background removal**: this needs a cut-out tool (`rembg`, a free Python package that downloads an AI model of about 170 MB). I'll ask before installing it.


## How the template uses this
`tools/polyester/render.py` holds the effects and the timeline (frame numbers above); `tools/polyester/prep.py` turns the user's photos into the cut-out slots; `engine/run.mjs` runs both for `style: polyester`. Do not ship the reference video, its audio, the watermark or any Spider-Man material: only the recipe is used.
