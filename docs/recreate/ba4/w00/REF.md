# ba4 · window 00 (reference 0.00-5.00 s) · REF

Source: after panel of https://www.instagram.com/p/DdM89KRMPBJ/ (sharpest copy: DASH 1080x1920 VP9 1280 kb/s, 30 fps;
the other formats are 720p). The after panel is x 440-978, y 427-1385 of the reel (539x958, 9:16, rounded corners),
measured from the edge profile; cropped 536x953 at (441,429) and scaled x2.015 to 1080x1920. The before panel (the raw)
is x 75-405, y 625-1213. Camera = raw matched to after per frame (ORB + RANSAC similarity, recreate/ba4/cam.py →
cam.js): after = s·R(rot)·raw + (tx, ty).

## Camera
| t | s | tx, ty | rot | note |
|---|---|---|---|---|
| 0.00 | 1.678 | -332, -186 | -3.99° | opens rotated and zoomed in |
| 0.20 | 1.596 | -287, -168 | -3.46° | |
| 0.40 | 1.269 | -121, -85 | -1.58° | fast zoom-out with roll back to level, ease-out |
| 0.60 | 1.120 | -52, -41 | -0.76° | |
| 0.80 | 1.052 | -21, -23 | -0.18° | |
| 1.00-1.60 | 1.018 → 1.005 | -8 → -3, -12 → -8 | 0 | settles |
| 1.60-3.87 | 1.005 → 1.067 | → -36, -69 | 0 | slow push-in, accelerating (ease-in) |
| 3.95 | hard cut | | | to the desk world |
Motion blur: the 0.1-0.4 s frames smear in the zoom direction (shutter ~180°); the caption smears with it.

## Grade and frame (raw → after, 1.3-1.5 s and 16-21 s, camera ≈ identity)
Per channel (raw → after): R 128→115, 200→193, 248→202; G 128→116, 200→151, 248→190; B 128→108, 200→137, 248→170
(highlights pulled down, blue and green more: the pale wall becomes teal-green). Bottom fall-off (after/before
luminance): 1.0 above y 1290, 0.86 at 1360, 0.39 at 1520, 0.13 at 1680, 0.035 at 1840. Background (x 750-1080,
y 0-350) at 1.8 s: rgb (93,127,111).

## Speech (Whisper onsets)
We 0.00 · work 0.16 · on 0.40 · videos 0.54 · probably 0.78 · three 1.16 · or 1.46 · four 1.58 · months 1.72 · in 1.92 ·
advance 2.08 · but 2.54 · before 2.94 · that 3.22 · like 3.10 · they 3.84 · sit 4.46 · in 4.66 · ideation 4.74

## Captions
1. 0.10-0.90 "We work" + "on videos". Pinned to the raw (it rides the zoom-out: at 0.0 it sits bottom-left at y≈1595,
   at 0.8 it is at x 130, "We work" baseline ≈1096, "on videos" baseline ≈1234, ink x 146-862, y 1174-1294 with glow).
   "We work": high-contrast serif (Playfair Display regular match), ≈62 px, white with a soft white glow.
   "on videos": fat-face Didone (Abril Fatface match by the ball terminals and hairline joins), ≈150 px (width 666),
   yellow #E1E13A core, yellow-green glow (blur ≈26 px). Letters appear out of order over ≈0.1 s ("on vid e" at 0.4).
2. 1.0-2.6 top-right block, left x 663: "probably three or" humanist sans regular ≈40 px (Open Sans / Segoe match),
   baseline ≈452; "four months" ≈60 px, baseline ≈528; "in advance" semibold ≈58 px white on an orange plate
   #E19C2E (sampled 225,156,46), baseline ≈596, plate wipes on from the left. Letters type on (≈22 ms each).
3. 2.75-3.95 "but Before that like", centred x 540, baseline ≈1258; "but" / "that like" bold ≈52 px, "Before" bold
   ≈80 px; Before's letters scramble in blue-grey (#7F98B6) and settle to white; soft dark shadow.
Captions cut out (≤ 2 frames), no fade.

## 4.0-5.0: the desk world (cut, no transition)
3.95 cut to an empty beige desk, soft (blur ≈8 px), window-light shadows (big panes, soft mullions; lit
(236,224,207), shade (175,162,142)). 4.03-4.32 a grey 3D brain rises from small (≈0.25) rotating into place, centre
≈(497,1060), width ≈734. 4.6 a pencil slides in at the top-left; 4.62-4.8 a lit yellow bulb pops above the brain on a
dark cable (bulb centre ≈(524,430), ≈216 px wide), a paper note "✓ concept ✓ story ✓ style ✓ ..." drops in at the right
(≈(850,600), rotated ≈+15°), a coffee cup sits bottom-right (≈(945,1755)).
