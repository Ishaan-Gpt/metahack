# ba5 · window 00 (reference 0.00-5.00 s) · REF

Source: https://www.instagram.com/p/DerbE18txNg/ (Edita Visuals, 36.43 s). Sharpest copy: DASH 1080x1920 VP9 1327 kb/s,
60 fps container with 30 fps content (every frame doubled; diffs land on 1/30 s steps). Local: `moovi/data/refs/edit-ba5/`.
All numbers are reel pixels (1080x1920) unless marked **inner**; times are the reference's clock.

## Essence
A creator-agency lead magnet: "Opus 5.5 made this edit from a storyboard". The viewer (creators, editors) sees a pencil
storyboard on the left and the finished edit beside it, shot for shot, and comments CLAUDE for the guide. The page is
the frame; the edit inside it is a light, lime-accented talking-head edit (serif-italic hero words, UI cards, a phone).

## The page (static for all 36 s; outside-the-cards diff vs 13 s and 28 s = compression noise only)
- Ground: neutral grey, lighter at top-left and bottom-right (251), darker at top-right and bottom-left (230), 242 in the
  middle. A huge faint peach spark (Claude mark shape, ~10 rounded arms, centre ≈ (560, 860), arms ~110 px wide, reach
  ~520 px) behind everything, colour (249,239,235) on the 241 ground, soft edges.
- Handle "@edita.visuals": bold geometric sans, ink ≈ #5c5955, x 717-950, y 120-148 (cap+desc), ≈ 36 px.
- Pill "Opus 5.5": x 390-700, y 287-405 (310 x 118, full radius), near-black (#121015 right, #252327 bottom) with a warm
  orange haze bleeding from the spark (105,84,81 at the left edge); orange spark icon centre (452, 347), r ≈ 38,
  ~12 thin rays, (232,120,80) core; text white, light weight, ≈ 50 px, x 515-656, tight tracking.
- Edit card: x 381-920, y 423-1382 (540 x 960 = the edit at 0.5 scale), radius ≈ 26, soft drop shadow down/right
  (199,193,190 at 10 px right of the edge).
- Storyboard card: x 113-~420 (right side under the edit card), y 655-1178, radius ≈ 18, cream (246,241,234) top →
  (232,229,223) bottom, soft shadow. Pill "Storyboard" x 115-326, y 572-641, dark, red dot (235,19,1) at (133,606) with a
  red glow into the pill's left; text white ≈ 34 px, x 166-299.
- Sketch content = line art of the current shot's key frame (edge lines + diagonal hatching on darks), with a hand-drawn
  box "Text" (script) where the caption goes. It changes on hard cuts only: 1.90 s (to "Social media." outline + phone
  scribble), 3.80 s (back to the face, wider). It is a still per shot (diff 0.0 between cuts).
- CTA: "Follow & comment "CLAUDE"" ink x 169-621 + orange x 638-911, y 1440-1485; "for the full guide" x 343-732,
  y 1514-1574. Tight grotesk, medium-semibold, ≈ 62 px, line pitch 76; ink ≈ #141414, orange (227,127,89).

## The edit (inside the card; **inner** = card px x 2, a 1080x1920 edit)
Shots (card frame-difference, 30 fps): A-roll 0-2.13 · transition 2.13-2.53 · "Social media" card 2.53-3.80 ·
hard cut 3.80 · A-roll (wider, subject right) 3.80-5+.

### Camera (Haar face, inner px)
| t | 0 | .067 | .133 | .2 | .267 | .333 | .467 | .6 | .8 | 1.07 | 1.33 | 1.53 | 1.8 | 2.0 | 2.13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| face w | 742 | 684 | 650 | 630 | 616 | 604 | 592 | 576 | 552 | 540 | 532 | 514 | 530 | 532 | 532 |
| cy | 659 | 680 | 683 | 689 | 698 | 700 | 714 | 722 | 730 | 722 | 726 | 719 | 731 | 730 | 744 |
Pull-out from 1.43x to 1.0x: half done by 0.2 s, then a slow drift to 1.0 at 1.5 s (ease-out, tau ≈ 0.35 s), face
centre x 533 → 555. After the 3.80 cut: face w 462, centre (600, 670), steady (±8 px handheld drift).

### Captions (white = helper, lime = hero; card px)
- Helper: thin grotesk caps, tight tracking, white, faint dark shadow. "I THINK THE MOST" builds word by word 0.233-0.433
  (x 146 → 153-379), cap ≈ 22 card px (≈ 60 px inner font), centred at x ≈ 266; rises y 615 → 588 by 0.7 → 583 by 1.0.
- Hero: condensed bold italic high-contrast serif (Playfair Display Italic ~750, x-scale ≈ 0.86, tracking -0.03 em) in a
  lime gradient (light (232,245,110) top → (180,214,58) bottom) with a soft glow. "POWERFUL" 0.50-0.567 scales down
  into place (x 155-417 → 149-392), cap 37 card px (≈ 105 px inner font), y 619-655 → 611-646 (drifts up with line 1).
- 1.033 hard swap: "BUSINESS" alone (x 131-307, y 591-637), scales down in over 0.13 s; "TOOL" at 1.30-1.40
  (line → x 129-421); a 3 px lime underline x ≈ 205-418, y 633, under "TOOL"; at 1.767 the words vanish and the
  underline retracts left→right (x 383 → 418) by 1.93.
- 1.833-2.13 "THAT YOU HAVE TODAY", helper style, word by word, each word fades in from 40% (x 124-…, y 601-650).
- 3.833-4.33 "NOT ONLY FOR" word by word (x 178-363, cap 22, y 580-602); "MARKETING PURPOSES" hero, cap 30 (x 77-466,
  y 607-634) flickers on alternate frames 4.40-4.53, steady from 4.533.

### Transition (2.13-2.53) and the Social media card (2.53-3.80)
- 2.13-2.37: the A-roll slides down (face cy 744 → 843) and shrinks into a rounded card inset (≈ x 15-527, y 235-935)
  on a pale blue-white ground; 2.37-2.43 a lime multiply tint floods the card; by 2.5 the card is solid lime
  (#c4ec4a-ish), x 27-512, y 421-910, radius ≈ 26, faint white line pattern; it ends x 30-512, y 435-912.
- Ground: pale lavender-blue → white (232,236,246 top, 246,247,251 lower).
- A lime four-point sparkle (glow, soft) appears at 2.5 top-left (≈ x 30, y 150) and travels to the right of "Social"
  (≈ 300-440, 90-260) by 2.83.
- A black phone (iPhone, tilted ≈ -22° leaning right, app grid: Threads, TikTok 15, Messenger, X 20, Instagram,
  Telegram 2, Facebook 1, WhatsApp) rises from below the lime card 2.80-3.47 (ease-out), ends top-left at ≈ (25, 355),
  bottom off the card at the lime card's bottom.
- "Social" types in at 2.83, "media." blurs in at 3.0 (bold grotesk, ink #1f1f22, ≈ 90 px card cap, x 55-340,
  y 90-265); right-aligned small text block "Connect. / Share. / Grow. / Build communities through / photos, videos and
  stories." (≈ 11 px card, right edge x 488, y 336-398).
- 3.47-3.77 the title deletes letter by letter ("Soc", "mec"), then the hard cut at 3.80.
