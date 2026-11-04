# Edit API (preview first)

A job stops at a live preview (`status.state: "preview"`, see docs/TEMPLATES.md). Every change goes through one route,
changes the plan (`clip/spec.card.json` or `clip/spec.mix.json`) and refreshes `clip/preview.json`; nothing re-renders.
The final MP4 is made only when the studio sets `job.json` `render: true` and queues the job.

`POST /api/jobs/<id>/edit` with JSON, either:
- `{ "prompt": "make the captions funkier and zoom out" }`: matched against the edit dictionary (`engine/edits.mjs`,
  keyword and fuzzy matching, no model call) and turned into ops; or
- `{ "prompt": "make it bigger", "target": Target }`: the element the user clicked in the preview; the prompt changes
  that element only; or
- `{ "ops": [ ...Op ] }`: exact ops from a UI (the caption editor, the timeline).

CLI: `node engine/edits.mjs <job> --prompt "..." [--target '{"kind":"caption","i":4}']` or `--ops '[...]'`.
In code: `editJob(jobDir, { prompt, ops, target })`.

Answer (one JSON line):

    { "applied": [{ "op": "caption.look", "said": "Caption 5 is bigger." }],   // said = the sentence to show
      "unmatched": ["do a backflip"],                                          // clauses not understood
      "changed": true,
      "needs": "none" | "regrade" | "full",
      "target": { ... },                                                        // echoed when sent
      "error": { "code": "NO_TARGET", "human": "There is no caption 41." } }   // only when the target is not there

- `needs: "none"`: the live preview already shows it (captions, size, position, case, text, word ops, zoom, b-roll
  add/remove/swap once the stock photo is fetched, music, sfx, handle, cta). `status.json` goes back to
  `state: "preview"` with a fresh `status.preview`.
- `needs: "regrade"`: the colour changed. `job.json` now has `regradeOnly: true`; start `engine/run.mjs`, which re-grades
  `clip/graded.mp4` (about 30 s) and ends at `state: "preview"` again.
- `needs: "full"`: an engine switch or Polyester. `job.json` carries the flag (`redirect: true` = direct again from
  the cached words, no new transcription; `style: "polyester"` = the Polyester branch; `regradeOnly: true` when leaving
  Polyester back to the same engine). Start `engine/run.mjs`.
- `applied[].skipped` (with `said: null`) appears when an op is refused, e.g. a caption edit on a Polyester job.
- An applied edit is recorded in `spec.edits` (`{ at, prompt, target?, ops }`). `status.renderedEdits` (set by a final
  render) vs `status.preview.edits` tells whether the last MP4 is out of date.

## Targets (click an element in the preview)

| target | the element | prompts it understands |
|---|---|---|
| `{ "kind": "caption", "i": 4 }` | `spec.captions[4]` | bigger / smaller, up / down, caps / lowercase, hide / show, a look word ("funkier", "hormozi") = that card's font and colour, "change it to X" (rewrites the card), "change A to B" (in this card only), "make W the key word", "delete it" |
| `{ "kind": "word", "i": 4, "j": 1 }` | word 1 of caption 4 | "make this the key word" (or "not the key word"), "change it to X", "delete it", "split here", plus the caption prompts for its card |
| `{ "kind": "segment", "i": 3 }` | `spec.segments[3]` (a beat: face, photo, graphic...) | "swap the photo for a mosque" (fetches stock), "remove the photo" (back to a face beat), zoom in / out, "change it to X" (a graphic's title) |
| `{ "kind": "fx", "i": 2 }` | `spec.fx[2]` (Creator Mix effect) | "remove this effect", "change it to X" (its word) |
| `{ "kind": "photo", "key": "img0" }` | `spec.images[key]` | "swap it for a church", "remove it" |

What does not fit the element falls back to whole-video ops only (`grade`, `music`, `sfx`, `engine`, `polyester`,
`text.handle`, `text.cta`): "make it warmer" with a caption selected still warms the video; "bigger" never spills over
to every caption.

Per-card fields the drawing code reads (both player/*.js and both renderers), all optional on `spec.captions[i]`:
`scale` (number, multiplier on the caption's size, 1 = unchanged), `dy` (fraction of frame height, + is lower),
`upper` (bool, caps for that card), `hidden` (bool), `font` (font family for the key word, from the preset's
`fonts.hero.family`), `fontFile` (that font's file in `assets/renderer/fonts`, so a renderer can register it), `color`
(the key word's colour, the preset's `palette.hero`), `preset` (the preset name, for display).

## Ops

| op | fields | does |
|---|---|---|
| `caption.text` | `find`, `replace`, optional `i` | replaces a word or phrase everywhere on screen (captions, titles, list items, big words), or only in caption `i`; case kept; fixes misspellings |
| `caption.word` | `i` (caption index), `text` | rewrites one caption card's words (same timing) |
| `caption.timing` | `i`, `t0`, `t1` | moves or stretches one caption card (seconds) |
| `caption.delete` | `i` | removes one caption card |
| `caption.preset` | `name` | applies a caption preset from `engine/caption-presets.json` |
| `caption.size` | `scale` (e.g. 1.2) | bigger/smaller captions |
| `caption.position` | `dy` (fraction of height, + is lower) | moves captions up or down |
| `caption.spacing` | `letter` (em), `line` (px) | letter and line spacing |
| `caption.case` | `upper` (bool) | caps or sentence case |
| `caption.hide` / `caption.show` | | all captions off / on |
| `caption.wordTime` | `i`, `j` (word index in the card), `t0`, `t1` | moves or stretches one word; clamped between the word before (it gives way) and the word after; the first word sets the card's start, the last its end |
| `caption.wordText` | `i`, `j`, `text` | changes one word; an empty text removes it |
| `caption.hero` | `i`, `j`, optional `off` | makes the word the card's key word (the big one); `off: true` unsets it |
| `caption.split` | `i`, `j` (> 0) | a new card starts at word `j`; each half keeps or gets a key word |
| `caption.merge` | `i` (> 0) | card `i` joins the card before it; the earlier key word stays |
| `caption.wordDelete` | `i`, `j` | removes one word; a card's only word removes the card |
| `zoom` | `scale` (e.g. 0.9 = out, 1.15 = in) | camera punch level on the speaker |
| `broll.add` | `query`, optional `at` (s) | puts a photo of `query` above the speaker at `at` (or the next talking stretch) |
| `broll.remove` | optional `at` | turns photo layouts back into the speaker |
| `music` | `on` (bool) or `db` (relative) | music off/on, louder/quieter |
| `sfx` | `on` (bool) or `db` | sound effects off/on, louder/quieter |
| `grade` | `warm`, `bright`, `contrast`, `sat` (relative) | warmer, cooler, brighter, darker, punchier |
| `text.handle` | `text` | the @handle |
| `text.cta` | `line1`, `line2` | the call to action |
| `engine` | `name` (`card-studio` or `creator-mix`) | re-directs the take in the other engine (one more plan, cached transcription); needs `full`. From a Polyester job it clears `style: "polyester"` and goes back to the talking edit |
| `polyester` | | Vignesh's Polyester template as a skill ("make it a polyester edit", "spiderman edit", "glitch montage edit"): 10 stills of the speaker from `clip/cut.mp4` into `<job>/poly-photos/p01.jpg...`, `job.style = "polyester"`, `job.polyester = { people: [{ name: <first word of the handle or YOU>, photos }] }`; needs `full`; the run ends `done` with `polyester.mp4` |
| `caption.look` | `i`, any of `scale` (relative), `dy` (relative), `upper`, `hidden`, `preset` | one card's size, position, case, visibility, look (writes the per-card fields above) |
| `segment.face` | `i` | that beat's photo out, back to the speaker |
| `segment.photo` | `i`, `query` | a new stock photo for that beat (a face beat becomes a photo split) |
| `segment.zoom` | `i`, `scale` | that beat's zoom |
| `segment.title` | `i`, `text` | a graphic beat's title |
| `fx.delete` | `i` | removes one Creator Mix effect |
| `fx.word` | `i`, `text` | an effect's word |
| `photo.remove` | `key` | takes that photo off every beat and effect that shows it |
| `photo.swap` | `key`, `query` | re-fetches stock for that photo everywhere it shows |

`engine/caption-presets.json` (owned by the caption editor): `{ "<name>": { "label": "...", "overrides": { ...template
keys } } }`, where overrides use the renderer's template keys: `fonts.hero` ({family, file, style} from
`assets/renderer/fonts`), `palette.hero`, `palette.heroStroke`, `palette.small`, `palette.glowRgb`, `caption.heroFont`
("hero" or "serifItalic"), `caption.heroWeight`, `caption.heroUpper`, `caption.heroGlow`, `layout.caption.heroSize`,
`layout.caption.smallSize`, `layout.caption.yFrac`, `layout.caption.lineGap`.

## Words

A caption card is `{ t0, t1, words: [{ w, t, e?, hero }] }`. A word starts at `t` and ends at `e` when set, else where
the next word starts, else at the card's end. `caption.wordTime` writes `e` only when a word stops before the next one.
The renderers read `t`: Creator Mix shows each word from its `t`, Card Studio pops the key word at its `t` and shows the
card from `t0` to `t1`. They ignore `e`, so a shortened word changes the timeline and the next edit, not the picture.
The word ops live in `engine/word-ops.mjs`; the studio uses a generated copy (`node tools/sync-caption-presets.mjs`).

Word ops and card ops index cards, so order matters: send word ops first, in the order they were made, then the card
ops against the cards as they are after them (the studio's batch does this).

    node engine/edits.mjs data/jobs/<id> --ops '[{"op":"caption.split","i":3,"j":1},{"op":"caption.hero","i":4,"j":0}]'
