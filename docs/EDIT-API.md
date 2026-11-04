# Edit API (after a video is rendered)

Every change to a finished edit goes through one route and re-renders only the picture and sound (no new transcription,
no new director call), so a change costs near 0 credits.

`POST /api/jobs/<id>/edit` with JSON, either:
- `{ "prompt": "make the captions funkier and zoom out" }`: the server matches the words against the edit dictionary
  (`engine/edits.mjs`, keyword and fuzzy matching, no model call) and turns them into ops; or
- `{ "ops": [ ...Op ] }`: exact ops from a UI (the caption editor, the timeline).

Answer: `{ id, applied: [{ op, said }], unmatched: string[] }`, then the job re-renders (`status.state` goes `running`
→ `done`, stages `render`, `mix`, `share`; the studio polls `/api/jobs/<id>` as for a first edit). `409 BUSY` while it runs.

## Ops

| op | fields | does |
|---|---|---|
| `caption.text` | `find`, `replace` | replaces a word or phrase everywhere on screen (captions, titles, list items, big words); case kept; fixes misspellings |
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
| `engine` | `name` (`card-studio` or `creator-mix`) | re-directs the take in the other engine (one more plan, cached transcription) |

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
