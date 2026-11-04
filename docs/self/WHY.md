# The WHY of four before→after edits, as an editor's decisions (2026-11-04)

Distilled from the four 1:1 recreations (`docs/recreate/ba1..ba4/wNN/REF.md`, measured frame by frame) and `refs/*.md`.
These are decisions, not elements: no reference's words, colours, fonts or set pieces are to be reused as a template
(Ishaan: "a reference is the WHY, never the WHAT"). Numbers are in the 1080x1920 after frame; times in seconds.

## 0. What the edit is for
The viewer is deciding whether a plain take can become premium content; the edit has to make one ordinary sentence
feel produced within the first second, and make each later sentence *visible* (a viewer with the sound off still gets
the point). Every decision below serves one of three jobs: **show the line**, **separate the person from the room**,
**keep the eye moving without tiring it**.

## 1. When the look changes, and why
- **The beat is the phrase, not the second.** A new "look state" (shot size, ground, text system) starts on a phrase
  boundary, usually a hard cut sitting on the first syllable of the new phrase (ba1 cuts 3.50, 7.60, 11.73, 16.2;
  ba2 1.935, 4.171, 7.50; ba3 1.835, 3.504, 4.505, 6.235). Measured beat lengths: 1.2-4.0 s, median about 2.2 s.
- **The look follows the meaning of the line**, not a rotation: alarm/statistic → isolation (void, red, huge type);
  a mechanism or warm idea → the room comes back, warm colour; a conclusion → quiet (B&W, tiny subtitle), then colour
  returns on the payoff (ba1 18.13). A negative line flips the ground's colour (ba2 violet → deep red at 17.6-17.8).
- **Loud, then quiet.** A huge beat (full-width word, void, particles) is followed by a plain one (tiny text or none).
  Rest beats are real: ba2 runs 6.2 s with no text (11.35-17.55); ba1's payoff is one 58 px word at a time.
  Share of time with no designed text: about 20-35%.
- **The structural device may repeat** (ba2's chapter card ×3, because the talk is a list); everything else changes
  every beat. No look twice in a row.

## 2. Hero words: which, how big, where
- **One hero per phrase**: the noun or number the sentence is *about* (the word you would underline when reading
  aloud), never a filler. Helpers stay small. Ratio hero:helper in measured blocks: ba2 x-height 137 vs 40/24
  (3.4-5.7x); ba4 150 px vs 62 px (2.4x); ba3 caps 68 vs x-height 25 (≈2.7x); ba1 punch cap 389 vs 70 px helpers.
- **Size by role**: a punch word or number fills the width (ba1 PRESENCE x 76-972 = 83% of width, cap 389 = 20% of
  height; %94 digits 324 px, x 86-998). A hero inside a caption is 40-60% of width (ba2 "look" 465 px; ba4 "on
  videos" 666 px). Subtitles 52-62 px (≈3% of height); one-word quiet subtitles 58 px.
- **Where**: in the empty space beside the face (ba1 column x 658-983 to the right of a face at x 575), at chest
  height under the chin (ba2 baselines 1198/1397/1462; ba4 1258-1430; ba1 subtitles 1300-1345), or **behind the
  person** through the matte (ba1 PRESENCE/PURCHASES behind the head, ba2 "lost" passing behind the face, ba4 bills
  behind the shoulders). Never on the face, never over another text layer.
- **Hero treatments seen**: glow (core + 26-70 px soft halo), outline-only stroke 4.5-5 px (often for the *second*
  stressed word), a gradient fill (white → grey, or a metal/gold ramp), letters filled with the background texture
  tinted, a plate wiped on behind it (ba4 orange plate, 0.12 s).

## 3. How text builds with the voice
- **Word-synced**: each word appears 0.03-0.3 s after its onset (ba2 pops 1-2 frames after; ba1 handwriting lags
  0.2-0.4 s; ba3 *leads* the voice by up to 0.3 s on lists so the eye is there first).
- **Entrances by register**: fade + blur + 10-15 px rise over 0.13-0.27 s (calm brand), hard pop with no fade (punchy
  creator), letter scramble 0.3-0.5 s settling to white (documentary reveal), type-on 22 ms per letter, blur-in from
  below for UI pills. One film uses 2-3 of these, chosen per beat by meaning.
- **Exits are fast and plain**: opacity out in 0.07-0.17 s or a hard cut out; text never lingers into the next beat.
- **Text is screen-fixed** while the camera zooms (ba2), except one documentary block pinned to the footage (ba4).

## 4. Separating the person from the room
A per-frame person matte is the single most "produced" ingredient. Uses measured:
- ground treatments behind the matte: room desaturated and darkened to B&W with highlights rolled off (ba1 close-up),
  a full void (black (8,4,10)), a flat colour field (ba2 violet, its luminance ramp kept: darker top, brighter low
  right), a colour flip for a negative line (red (58,0,2) → (104,0,3)), regions of the wall recoloured one by one;
- a **rim line** 6-9 px with soft glow hugging hair and shoulders (ba1), only on the isolated close-up;
- **depth layering**: big words and particles go between ground and person (behind-the-head), small text in front.
- A-roll as a layer: shrunk to a rounded card on a spring (ba3: width 815 → 375 → 465 → 448 over 0.73 s, radius 13%
  of the short side), a circle, a glowing frame-in-frame (ba2 stroke 7 px, shrinks 9.33 → 9.85), or replaced for a
  few seconds by a world of objects (ba4 desk, ba3 UI) and then returned.

## 5. Colour carries meaning
- One video, one palette: 2-3 text colours (white/bone + one hot accent + at most one support). The hot accent is
  spent only on alarm, numbers and the negative; a warm colour marks the warm/human idea; the payoff gets colour
  *back* rather than a new colour.
- Colour can live in the ground instead of the type (ba2's whole field turns red on the negative line).
- Glow colour = fill colour, lighter; a dark soft shadow (rgba 0,0,0,.45, 8-10 px, 2-3 px down) keeps white legible
  on bright rooms.

## 6. Camera: moves and their measured curves
- **Open on a move**: every reference opens zoomed in and pulls out with an ease-out: ba1 1.408 → 1.155 over
  0.1-0.9 s; ba2 1.134 → 0.882 over 1.05 s (cubic ease-out); ba4 1.678 → 1.005 over 1.0 s with a 4° roll back to level
  and motion blur; ba3 1.45 → 1.0 in 0.2 s out of a blur. Then **lock** (±0.003).
- **Slow push** inside a long beat: +2.5-6% over 0.7-2.3 s (ba1 close-up, ba4 1.005 → 1.067 ease-in over 2.3 s).
- **Push on the hero**: +10-17% in 0.6 s ease-out on the stressed word (ba1 1.484 → 1.653 on "Ads").
- **Punch-in close-up**: a cut, not a zoom; head height ≈ 1015 px (53% of frame) with the face pushed to one side so
  the other half carries text.
- **Settle after a cut**: +85 px drift and +2.5% over 0.7 s ease-out, so a cut never lands dead.
- Ease-out for arrivals, ease-in for leaving into a transition; no shake; shutter ≈ 0 except one fast opening zoom.

## 7. Transitions: which and when
- Most changes are **hard cuts on the phrase boundary**. A transition is spent where the *meaning* changes register
  (into isolation, into a number, into the conclusion): ba1 uses 4 in 20 s, none twice; ba2 one cross-dissolve
  (0.3 s into a chapter card); ba3 blur-throughs and morphs of the A-roll; ba4 blur-through (0.25 s, 0 → 20 px) into and
  out of the desk world and one light leak before the money line.
- Measured shapes: light burn 0.40 s (blobs bloom 0.17 s → white 0.05 s → cut inside the white → collapse to a line
  0.025 s → line fades 0.1 s); particle dissolve 0.36 s sweeping from the left; light leak 0.45 s (magenta flash →
  orange rise from the bottom → peach wash over the cut → yellow fade); circle wipe growing r 172 → 1250 px in 0.41 s.

## 8. Grade and frame
- Contrasty, deep blacks, warm skin: shadows and mids crushed with blue/green pulled more than red (ba1 r 120→73,
  b 118→60), saturation up (0.33 → 0.59) — or highlights pulled down to tint the wall (ba4: pale wall → teal-green).
- **Bottom fall-off** to near-black from about 66% of height to 83% (ba1 y 1270 → 1600; ba4 1290 → 1840), so
  captions and the brand bug sit on dark.
- A small brand mark and an end card (ba1 holds 3 s; too long by its own rating).

## 9. Sound
- Measured: no music bed in ba1 (noise floor drops to silence in pauses); air-band whooshes on look changes
  (0.2-0.3 s) and on text blocks leaving; a soft low hit under a punch word; a whoosh into the white + a low hit on
  the cut inside a burn; a sand texture under a particle dissolve; a low sustained boom with a rising shimmer under the
  end card. ba4 keeps a quiet bed. The voice is never ducked and never sped up; the edit carries the energy.

## Devices that already exist in code (copy, never edit the originals)
| Device | Where |
|---|---|
| WebGL compositor: packed footage+matte video, grade, ground desat/darken/contrast, void, B&W, subject saturation, rim line, behind/front canvases, half-res tint layer (recolour ground regions or fill letters with the image) | `recreate/ba1/player.js` (FS_MAIN) |
| Post shader: light burn, band→line, particle dissolve, noise bar, glitch strips, white rise, coloured leak, fade to black | `recreate/ba1/player.js` (FS_POST) |
| Camera helpers: `place()` face-anchored cover crop, `tab()` measured tables, eases | `recreate/ba1/edit.js` |
| Type helpers: `txt()` (blur/fade/slide, gradient, stroke, double stroke, stretch), `sizeForCap/Width`, frame lines | `recreate/ba1/edit.js` |
| Glow hero block, justified helper lines (`spread`), diamond badge, pixel "?", eyeballs | `recreate/ba2/edit.js` |
| Per-letter caption engine: type-on, letter scramble, wipe-on plate, pinned to footage | `recreate/ba4/player.js` (`drawLine`) |
| Desk world with gobo light, CC0 cut-outs, paper notes, money behind the head, light leak per frame | `recreate/ba4/player.js` |
| A-roll as DOM card/circle on a spring, chart card with draw-on line, checklist, App Store row + cursor, iOS notification, circle wipe | `recreate/ba3/player.js` |
| Matte bake (rembg isnet, holes filled) | `recreate/ba1/matte.py`; pack layout `recreate/ba1/pack.mjs` |
| Showcase page (light page, raw small left, edit large right, in step) | `recreate/ba1/showcase.html` |
