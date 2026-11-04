# CaptionsEasy caption library

This folder holds the caption looks and motion from CaptionsEasy, Ishaan's own caption product.
It is a read-only copy for porting. Nothing in metahack imports it yet.

## What is here

- `src/` has the source files, copied as-is at their CaptionsEasy paths.
  It covers every look, the motion file, the layouts, the pack (premium included) and what they import from `shared` and `caption-engine`.
  npm packages (react, remotion, zod, @remotion/*) are not copied. No media, fonts, build output or keys.
- `catalog.json` has one entry per look.
- `animations.json` has one entry per animation.
- `files.json` lists the copied files and the npm imports left out.

## Counts (last build)

- 157 looks. 133 have a permanent number and 105 of those are in the CaptionsEasy gallery.
  The other 24 are uncurated or legacy colour variants, kept so every look has an entry.
- 16 premium looks. Five are Moovi's premium captions: Premium Caption 1.1, 1.2, 2, 3 and 4 (`moovi_caption_*`).
- 49 animations: 18 in, 5 out, 11 emphasis (the spoken word), 6 letter, 5 word, 4 springs.
- 102 source files.

## Rebuild

```
node tools/build-caption-library.mjs
```

The source defaults to `C:/Ishaan GPT/hackthons/CaptionsEasy`.
Pass another path as the first argument, or set `CAPTIONS_EASY_DIR`.
The script reads each look by running CaptionsEasy's own registry through CaptionsEasy's own `tsx`, so every style is fully resolved.
If that `tsx` is missing, it falls back to reading the TS text with regexes, and fields it cannot read stay null.
It rebuilds the folder from scratch, so you can run it as often as you like.

## Catalog fields

Each look has its `id`, `name`, `number` and `premium` flag, plus:

- `fonts` (font names only) and `type` (weight, size, casing, hero font).
- `colours`: text, gradient, hero, active, box, stroke, glow, background and shadows. Moovi looks also list their tier colours.
- `background`: none, box, pill, bar or bubble. `highlight` says how the spoken word is marked (box, marker, karaoke, underline, glow, outline, text).
- `inAnimation`, `outAnimation`, `emphasis`, `letterAnimator` and `wordAnimator`.
- `layoutMotion`: the Moovi premium entrance, which the canvas painter draws itself.
- `sourceFile` and `templateSourceFile`, both paths under this folder.

Many pack and premium looks have `inAnimation.type` set to `none` because their layout draws its own motion.
For those, open `templateSourceFile` and read the layout.

## Use a look later

1. Find the look in `catalog.json` by its id or name.
2. Open its `sourceFile` and `templateSourceFile` to see how it is drawn.
3. Map it onto an `engine/caption-presets.json` override, which has the shape `{ fonts: { hero }, palette, caption, layout: { caption } }`.
   Put the look's `fonts` into `fonts.hero`, its `colours` into `palette`, its type and motion into `caption`, and its position into `layout.caption`.
4. Port the motion from `animations.json` (durations, eases, springs) rather than inventing new curves.
