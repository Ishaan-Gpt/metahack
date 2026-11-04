# Captions Easy port

What came over from Captions Easy (`Ishaan-Gpt/Captions-Easy`, the newer of the two repos; `CaptionsEasy` is the same
code minus the CLI packages) into the studio's caption editing, and what did not.

## Files

| ours | ported from (Captions Easy) |
|---|---|
| `engine/caption-presets.json` (12 presets) | `packages/templates/src/looks/new.ts` (the look gallery) |
| `web/src/lib/caption-presets.ts` | generated copy of the JSON (`node tools/sync-caption-presets.mjs`); Turbopack's root is `web/`, so the web app cannot import `engine/` |
| `web/src/components/studio/captionDraft.ts` | `features/studio/useStudio.ts` (every edit is a pure change with undo, typing coalesces into one step) and `caption-engine/src/core/ops.ts` (`findMatches` / `findReplace`: whole word, case kept) |
| `web/src/components/studio/CaptionEditor.tsx` | `features/studio/panels/CaptionsPanel.tsx` (card list that follows playback, find & replace, selected-card editor), `LooksPanel.tsx` + `StylePanel.tsx` (look gallery, size, position, case) |
| `web/src/components/studio/TimelineTools.tsx` | `features/studio/Timeline.tsx` (click to select and seek, drag to move, drag edges to retime, double-click to rename, snap to neighbours and the playhead, clamped to neighbours) and `StudioPage.tsx` keys (space, undo) |
| `engine/word-ops.mjs` (+ generated `web/src/lib/word-ops.ts`) | `caption-engine/src/core/ops.ts`: `retimeRun` (clamp to the words beside it, the word before gives way), `setWordText`, `setEmphasis` (key word), `splitCardAt`, `mergeWithPrevious`, `setHidden` (as delete) |
| word view in `TimelineTools.tsx` (`CaptionLane`, `WordTools`) and the timeline zoom in `Studio.tsx` | `features/studio/Timeline.tsx` word mode (one block per word, click to pick and seek, double-click to edit, drag to move, drag edges to stretch, snap 7 px to every word edge and the playhead, MIN 40 ms), zoom 1 to 40x, follow the playhead; `StudioPage.tsx` toolbar (key word, split, join, undo, redo) and keys (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) |
| `web/src/styles/captions.css` | none: the studio's own tokens |

## Presets

Our renderer draws a caption as small words (sans, `palette.small`) and one big key word (`fonts.hero`, `palette.hero`,
optional glow), so each Captions Easy look was translated into that shape: its font (the nearest one in
`assets/renderer/fonts/`), its accent colour on the key word, its case and glow.

hormozi (Hormozi Box), beast (Beast Bounce), karaoke (Karaoke Fill), scribble (Scribble, Permanent Marker, funky),
sunny-script (Storytime, Pacifico, funky), clean (Subtitle), minimal (Minimal Pro), bold (Motivational), luxe-serif
(Luxe Serif), neon-ice (Neon + Italic Over Ice), terminal (Terminal), serif-accent (Serif Accent Glow).

`overrides` are nested objects in the template's own shape (`{ fonts: { hero }, palette, caption, layout: { caption } }`)
so they deep-merge into the style template. Sizes (`heroSize`, `smallSize`, `yFrac`) are left out on purpose: the
card-studio template and the full-frame styles use very different absolute sizes, so a preset sets the face and colour
and `caption.size` / `caption.position` scale from whatever the style has.

## The batch

Captions Easy saves every change live because it renders in the browser. Ours re-renders on the server, so the editor
holds a draft and sends one `{ ops }` list on Apply (Ctrl+Enter). Op order is index-safe: the word ops (`caption.wordTime`, `wordText`, `hero`, `split`, `merge`, `wordDelete`) first, in the order they were made, then `caption.word` and
`caption.timing` first, then `caption.text`, then `caption.delete` from the last card back, then hide/show, the preset,
and size / position / case last so they win over the preset.

## Words on the timeline

Zoom the timeline in (the - and + buttons, the slider, or the - and = keys) and the caption lane switches from cards to
words at 64 px a second, like Captions Easy's word mode. Click a word to pick it and play from it; double-click to edit
it; drag it to move it; drag an edge to stretch it. Pick a word, then K makes it the key word, S starts a new caption at
it, J joins its caption onto the one before, Delete removes it; Left and Right nudge it, Alt stretches its end. Every
word edit goes into the same batch as the card edits and the look, and Apply (Ctrl+Enter) sends it as one re-render.
A card with a pending rewrite or retime shows as a card until it is applied, because the engine applies word ops first.

## Left out, and why

- **Add a word at the playhead**: not ported yet; a new word needs a place in a card and a key-word rule. Could be `caption.wordAdd {i, j, text}`.
- **Hide one word** (keep it but do not show it): our spec has no hidden flag, so the word view deletes instead.
- **Word end times in the picture**: the renderers read each word's start only, so a shortened word does not leave the
  screen early (see docs/EDIT-API.md, "Words").
- **Ripple moves, the word/line switch, emoji and colour per word, emotion per card**: no data for them in the spec; the
  zoom level picks words or cards instead of a switch.
- **Box / pill / bubble backgrounds, outline-fill, karaoke sweep, bounce, entrances and exits, gradients, emoji,
  letter animators, 400+ Google fonts, brand kit**: the renderer has no override keys for them. Karaoke and Hormozi
  keep their font and colour but lose the moving box and the sweep.
- **Letter and line spacing**: `caption.spacing` exists, but the renderer's caption code does not read it yet, so no
  control was added.
- **SRT import/export, low-confidence word marks, filmstrip and waveform tracks, ripple ("linked") moves, word/line
  view switch**: no data for them in the spec, or the studio timeline already has its own lanes.

## The caption library

`library/captions-easy/` keeps every Captions Easy look (157, 16 premium, including Moovi's premium captions 1.1, 1.2,
2, 3 and 4) and every in, out, emphasis, letter and word animation (49) as source files plus `catalog.json` and
`animations.json`. It is stored, not wired into the renderer. Rebuild it with `node tools/build-caption-library.mjs`;
its README says how to use a look.
