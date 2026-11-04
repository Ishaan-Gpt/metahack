# Card Studio theme: the reference breakdown

Reference: Instagram reel by @edita.visuals (DerbE18txNg), 36.5 s, 1080x1920, 60 fps, AAC 44.1 kHz,
-14.1 LUFS integrated, true peak -0.5 dBTP, loudness range 3.6 LU, no silences over 0.4 s.
Measured from frames at 4 fps (whole reel), 30 and 60 fps around every change, and pixel reads on full size frames.

## The fixed frame (every frame)

| Element | Measured | Theme value |
|---|---|---|
| Background | white to light grey vertical gradient (top 251, bottom about 230) | `#fbfbfb` to `#e5e5e3` |
| Background art | big soft peach starburst (rays) behind the left and centre, low contrast | 12 petal starburst `#f2dccb`, alpha 0.8, centre (430, 760), r 640, plus a soft radial glow |
| Main card | x 380 to 920, y 422 to 1378 (540 x 956, about 9:16), corner radius about 30 px, soft drop shadow below | `layout.card` = 380, 422, 540, 956, r 30, shadow blur 56, y 20, 20% black |
| Badge | dark warm gradient pill above the card, left aligned to the card, x 388 to 701, y 286 to 407, orange starburst logo, light sans label ("Opus 5.5") | dark pill `#2a2422` to `#4d3c35`, orange starburst icon, label from `--badge` |
| Storyboard card | white card x 112 to about 400, y 655 to 1180, partly behind the main card, holding pencil sketch panels; dark "Storyboard" pill with a red dot at y 572 to 642 | same place; the panels are the clip's own stock images in greyscale high contrast (a sketch look, by canvas filter) |
| Handle | top right, grey medium sans, right edge about x 950, baseline about y 150 | `--handle`, `#5a5a5a`, Inter 500 36 px |
| CTA | two centred lines under the card at about y 1478 and 1552, near black medium sans about 56 px, the keyword in quotes in orange `rgb(222,126,89)` bold | `--cta1` / `--cta2`, keyword in `#de7e59` |

## Captions
- 1 to 3 words at a time, centred on the card, at about 64% of the card height (over the chest, under the mouth).
- Two styles in one caption: small white condensed caps (about 30 to 34 px) for the plain words, and ONE big serif italic
  word in lime `rgb(203,230,94)` in caps (about 90 to 100 px) for the hero word ("I THINK THE MOST / POWERFUL",
  "NOT JUST FOR / MARKETING PURPOSES", "... / WASTING / ..."). The hero can sit above, below or between small lines.
- Each caption pops in (fast fade and slight rise), hero word slightly overshoots in scale. Soft dark shadow for legibility.
- In split shots the caption sits on the seam between the picture and the face.
- No caption on full graphic cards (the card's own title carries the word).

## Shots and when the face is hidden (timeline of the reference)
| Time (s) | Shot | Face |
|---|---|---|
| 0.0 to 2.2 | face card | shown |
| 2.2 to 3.8 | graphic card: pale card, "Social media." black heavy sans title top left, phone with social icons rising inside a lime block, lime sparkle | hidden (1.6 s) |
| 3.8 to 5.9 | face card | shown |
| 5.9 to 8.3 | face video zooms out, shrinks to a small landscape card in the middle with social icons orbiting, "JUST TO MARKET YOUR BUSINESS" | small |
| 8.3 to 10.1 | face in the top square of the card, pale lower half, caption "TO GO VIRAL" | shown |
| 10.1 to 12.2 | face card | shown |
| 12.2 to 18.4 | split: card gets a white border, stock picture on top half (hand with phone, cash, crowd, billboard; picture changes at 14.1 and 15.4 on spoken nouns), face on the bottom half, caption on the seam | shown (bottom) |
| 18.4 to 24.1 | face card, punched in; 20.5 to 21.5 a bullet list with lime dots ("A MAGAZINE", "A BILLBOARD") appears item by item on the left of the card | shown |
| 24.1 to 27.1 | white post or app card: face in an upper rounded frame, a row of small UI icons, pink pill button; a cursor glides in and taps the button at 26.5 | shown (small) |
| 27.1 to 30.2 | wide white card: face on the left, big black serif italic words on the right appearing as spoken ("TENS OF MILLIONS OF VIEWS") | shown (small) |
| 30.2 to 36.5 | face card, jump zooms at sentence boundaries | shown |

Face fully hidden: about 1.6 s of 36.5 s (4%). Face small or shared with B-roll: about 15 s (40%).

## Transitions (frame differences at 30 fps; cuts at 3.8, 5.93, 8.27, 10.1, 12.17, 14.1, 15.4, 18.4, 24.07, 27.1, 30.2)
- Into the graphic (2.2): a pale white gradient sweeps down over the face (about 0.15 s), then a lime wash fades off the new card from the bottom while the picture rises (about 0.3 s). Theme: `wash`, 0.45 s.
- Out of a graphic back to the face (3.8): the face is revealed top down behind a soft light edge, 2 to 5 frames. Theme: `wipe`, 0.2 s.
- Into the split (12.17) and between B-roll pictures (14.1, 15.4): hard cuts. Theme: `pop` (a hard cut with a 3.5% scale settle over 0.18 s).
- Face to face at sentence boundaries: hard jump cuts with a different punch level (the face is visibly bigger after 18.4 and 30.2). Theme: `cut` with zoom levels 1.0 and 1.16 alternating, plus a slow 4% push inside each segment.
- The card frame itself never moves; all motion happens inside it. That is why the reel never looks glitchy.

## Sound
- Voice dominates; integrated -14.1 LUFS; no gaps (pauses are cut).
- Short transient bursts line up with the 2.2, 3.8, 12.17 and 24.07 changes and with the cursor tap at 26.5, which reads as soft
  whooshes and a UI click. This is from the waveform's high frequency energy, not from listening, so treat it as likely, not proven.
- No obvious music bed above the voice. The theme adds the repo's bed at -27 dB under the voice (switch off with `--no-music`).

## How the theme reproduces it (rules, no AI)
See `engine/card-studio.mjs`. Per sentence (punctuation, or breaths and a 2.5 to 4.5 s rhythm when the transcript has no punctuation):
- numbers and size words (hundreds, millions, percent, viral, 5) -> big-text post card (face in the top frame, words below as spoken, pink button, cursor tap)
- "a magazine, a billboard" style parallel phrases, or 3+ short comma parts -> bullet list over the face
- a concrete noun (built-in list of picturable words, or a capitalised name) -> alternately a graphic card (face hidden, at most 2.4 s) or a split (face below, up to 4.5 s, picture changes on each spoken keyword)
- everything else -> face card, jump zoom at each sentence boundary
- budgets: first 1.8 s and last 1.2 s always face, 1.6 s of face between any two B-roll shots, face hidden at most 25%, B-roll layouts at most 40% (a split or big-text card counts half because the face stays on screen)
- one static framing per segment (median face box over the segment) so the face never jitters; zoom is capped so the face box always stays inside the crop
- captions: 1 to 3 words, hero = the strongest content word (numbers first, then length), never over the mouth (placed under the chin when the face is large)
