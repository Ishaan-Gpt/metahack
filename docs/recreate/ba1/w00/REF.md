# ba1 · window 00 (reference 0.00-5.00 s) · REF

Source: the after panel of https://www.instagram.com/p/DduLd-RRDxa/ (sharpest copy: DASH 1080x1920 VP9 1176 kb/s 60 fps;
the progressive formats are 720p 30 fps). The after panel occupies x 389-984, y 336-1401 of the 1080x1920 reel
(596x1066, rounded corners), measured from the white-to-panel edge profile. All coordinates below are that panel scaled
to 1080x1920 (x1.812). Times are the reference's own clock. Camera = the before panel (the raw) matched to the after panel
per frame (ORB + RANSAC similarity, `data/refs/edit-ba1/cam.json`, 1380 frames); s is the zoom relative to the raw.

## Speech (Whisper word onsets)
what 0.02 · happens 0.20 · to 0.60 · your 0.84 · paid 0.96 · ads 1.20 · when 1.58 · you 1.90 · have 2.02 · zero 2.16 ·
organic 2.48 · presence 2.88 · (pause) · no 3.60 · organic 3.80 · presence 4.22 · means 4.74

## Shots and camera
| t | s (vs raw) | tx, ty | note |
|---|---|---|---|
| 0.00-0.10 | 1.408 → 1.401 | -212, -571 | opens zoomed in, holds 0.1 s |
| 0.10-0.90 | 1.401 → 1.155 | → -83, -325 | zoom out, ease-out (0.2: 1.349, 0.3: 1.268, 0.4: 1.227, 0.5: 1.193, 0.6: 1.182, 0.7: 1.170, 0.8: 1.162) |
| 0.90-3.45 | 1.155 (±0.003) | -83, -325 | locked; rotation < 0.3° (none) |
| 3.50 | hard cut | | close-up (window 05) |
Face (Haar box) in the after: (576, 924) w 290 at 0.0; (570, 900) w 237 from 0.9; eyes at y 868, interocular 93 px.
Motion blur: none visible in the zoom frames (shutter effectively 0; edges stay sharp at 0.2-0.4 s).

## Grade and frame
- Before → after colour transfer (7444 matched pixels, 8 frames): per-channel curves crush shadows and mids, blue and
  green more than red (r 120→73, g 119→73, b 118→60; 72→32/23/19), highlights lifted (200→222 red); median saturation
  0.33 → 0.59. A warm, contrasty, deep-black grade.
- Bottom fall-off: frame average luminance reaches black (2-3) by y 1580-1600 from content at y 1270 (smooth, no band).
  Black is (2,1,4).
- Logo bug "BONOMI": white geometric bold (Poppins Bold match), cap 40 px, 223 px wide, centred x 540, baseline 1563; the
  O is a solid red dot (sampled #e81e19-ish), diameter about the cap height. Present the whole time until 20.0.

## Background treatment: red panels (0.30-1.65)
- The wall's wood panels turn pure red (sampled (207,0,1), (190,0,1), (152,0,0) in darker parts: G=B=0, R follows the
  panel's texture), only behind her (her skin, also orange, stays natural: a matte, not a hue key).
- Regions at 1.0 s (camera settled): top-right x 645-1080, y 0-450; a band x 0-650, y 442-840 (behind her head);
  bottom-right x 727-1080, y 840-1335. The wall's black bars and a dark drop shadow frame each red region.
- They pop in one by one at 0.30, 0.37-0.40, 0.45-0.60 (no fade), and vanish at 1.62-1.67 as stack 1 fades.

## Text
Stack 1, top-right column x 658-983 (325 px), lines touching (each line's cap top = previous baseline):
| word | font (match) | size | box | look | in |
|---|---|---|---|---|---|
| what | Courgette (script italic) | ~70 px | x 658-795, baseline 425 | white, soft dark shadow | fades in 0.13-0.40, slides down ~15 px |
| HAPPENS | Poppins ExtraBold caps | fit to 325 (cap 55) | cap 470-525 | white, soft shadow | 0.33 faint → 0.60 solid (blur → sharp, rises ~10 px) |
| TO | Poppins ExtraBold outline | at YOUR's size (cap 85) | 525-610, left | white stroke ~4.5 px, no fill | 0.73 → 0.83 |
| YOUR | Poppins ExtraBold | fit (cap 88) | 610-695 | white → grey (#9c9c9c) vertical gradient | 0.87 → 1.00 |
| PAID | Poppins ExtraBold outline | fit (cap 110) | 700-810 | white stroke | 1.13 → 1.27 |
| ads | Courgette | ~70 px | x 900-1018 (right), baseline 905 | white | 1.10 → 1.30 |
Stack 1 fades out 1.63-1.78 (opacity only).

Stack 2 (handwritten, Kalam match: straight-tailed y, looped e), zigzag, ~100 px, white with a soft shadow, lagging the
voice by 0.2-0.4 s: when (x 648-918, baseline 520) 1.90-2.00 · you (x 700-980, 575) 2.10 · have (x 680, 640) 2.20 ·
zero (x 760-985, 700) 2.35 · organic (x 610-985, 775) 2.55. Thin frame lines (2 px, white ~50%): horizontal y 440 and
y 833 from x 650 to the right edge, vertical x 983 from the top to y 1330; they draw on with stack 2 and stay to the cut.
Stack 2 fades out 2.93-3.00.

Punch: PRESENCE, Anton (condensed heavy), x 76-972, cap 443-832 (389 px), letters filled with the wall's own texture
turned red (same red as the panels), a dark offset shadow (down-left ~10 px), BEHIND her: her head crown covers the
bottom of S-E. Fades in 2.93-3.10 (no scale), holds to the cut at 3.50.

## Sound (reference audio, 10 ms spectral flux + band energy)
Voice dominates; no music bed (the noise floor drops to near silence in pauses). Air-band bursts (whoosh-like) at
0.2-0.3 (panels in) and 1.6 (stack out); a soft low hit around 2.9-3.1 (punch).
