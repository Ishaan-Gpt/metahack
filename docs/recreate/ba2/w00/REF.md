# ba2 · window 00 (reference 0.00-5.00 s) · REF

Source: the after panel of https://www.instagram.com/p/DaFaIEGIFvx/ (sharpest copy: DASH 1080x1920 VP9 740 kb/s, 29.97 fps;
`yt-dlp -F` lists nothing sharper). The after panel occupies x 354-999, y 168-1319 of the 1080x1920 reel (646x1152, rounded
corners; the "After" tab overlaps its top edge), measured from the white-to-panel edge profile; cut as crop=648:1152:353:168
and scaled x1.667 to `data/refs/edit-ba2/after1080.mp4`. Coordinates below are that 1080x1920 frame; times are the
reference's clock (frame n at (n-1)/29.97). Camera: ORB + RANSAC similarity between 10 fps frames inside each shot.
Faces: OpenCV Haar (centre, width).

## Speech (Whisper)
if 0.00 · you .18 · look .24 · at .38 · your .50 · edits .60 · and .90 · you 1.12 · think 1.24 · that 1.26 · look 1.76 · nothing 1.94 ·
like 2.14 · what 2.54 · I 2.76 · see 2.86 · on 3.08 · Instagram 3.26 · it's 3.56 · probably 4.18 · one 4.62 · of 4.84 · these 4.94 · three 5.14

## Shots (hard cuts found by frame difference)
| t | shot | camera |
|---|---|---|
| 0.000-1.935 | medium, face centred, mic in front of the chest | opens 1.134x in and zooms out about (540, 958): s at .1 .9625 · .2 .939 · .3 .923 · .4 .9115 · .5 .9026 · .6 .896 · .7 .889 · 1.0 .882 (cubic ease-out, 1.05 s), then locked (±0.002). Face (536,547) w502 at 0 → (492,610) w424 at 1.33 (he leans) |
| 1.935-4.171 | ECU, nose on the left edge, face cut | static (too few inliers to fit; the frames show only his own movement) |
| 4.171-5.60 | wide, head small | 1 → 0.948 about (585, 918), cubic ease-out 0.8 s (.98 at +.13, .964 +.33, .956 +.53, .9495 +.73); face (557,698) w354 |

No motion blur on any move (edges stay sharp; the zooms are slow), so the shutter is effectively 0.

## Ground and grade
Violet wall, G ≈ 0 on the left. Column x 40: y 60 (29,0,73) · 300 (36,0,90) · 540 (43,1,106) · 780 (50,1,129) · 900 (53,4,138).
x 880: (34,0,88) · (47,5,110) · (60,11,128) · (74,23,154) · (78,41,145). x 1040: (39,3,82) · (51,16,102) · (69,27,125) ·
(81,35,144) · (88,38,160). Darker at the top, brighter and pinker lower right; leaf shadows at the right edge. Navy T-shirt
(37,32,62). ECU wall: top (46,2,103), low (84,28,163).

## Text (screen-fixed: it does not follow the zoom; each word pops 1-2 frames after its onset, no fade)
- Group 1 (0.07-1.00): "if" 0.07 (left, x 295) · "you" 0.20 (right, ends x 755) · baseline 1198, helper x-height 40 (Helvetica/
  Arial-style regular, straight 'y' tail) · hero "look" 0.27: x 295-760, baseline 1397, x-height 137, ascender 182, stem 35 px
  (asc/x 1.33; Arial/Helvetica Bold shapes: slanted 't' top, straight 'k'), tracking about -0.08 em, fill (197,201,170) pale
  yellow-green at ~90% (the mic shows through the 'k'), a wide grey-white haze around it ((91,89,96) over a (38,36,47) shirt) ·
  bottom "at" .40 · "your" .53 · "edits" .67: x-height 24, wide tracking, justified from x 295 to 760, baseline 1462.
- Group 2 (1.00-1.53): "and" 1.00 (x 299-411, baseline 1198) · "you" 1.07 (bottom right, ends x 767, baseline 1449) · "think"
  1.20 (x 226-774, baseline 1400, x-height 141). Gap 1.53-1.60.
- Group 3 (1.60-1.935): "that" 1.60 · "look" 1.67, bold white (247,249,249), x-height 60, x 368-742, baseline 1278, white glow.
- ECU neon (1.97-4.171): white ellipse ring draws 1.97-2.15 (centre (767,721), rx 273, ry 73, tilted -4°, overshooting into a
  tail at the top left, 3 px) · "nothing" cyan bold (core (131,251,244), glow (91,214,215)), x 547-1000, baseline 770, ~137 px,
  by 2.1 · "like what" white regular ~64 px, wide tracking, x 560-867, baseline 846 · "i see on" white, right edge 1033,
  baseline 1097 · "insagram" (sic) magenta bold (core (224,96,242), glow (211,54,221)), right edge 1035, baseline 1177, by 2.6.
- Wide (4.6-5.6): diamond badges with a pixelated "?" pop one by one (4.6, 4.8, 5.0): rounded diamond, white outline ~10 px
  with glow, violet inner tile (light top-left to deep bottom-right), diagonal 267 px, centres (517,1367) (358,1550) (692,1558).

## Sound
Not measured in this pass (voice; soft pops under the badges by ear).
