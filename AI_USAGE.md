# AI usage

- 2026-11-03: Claude Code (Claude Opus 5.5) analysed the four reference reels, wrote CONTEXT.md and the refs/ notes, and copied the Moovi sources listed in CONTEXT.md section 11.
- 2026-11-04: Claude Code (Claude Opus 5.5) built the studio (`web/src/app/studio`, the jobs API in `web/src/app/api`
  and `web/src/lib/server/jobs.ts`), the styles system (`engine/styles.mjs`, `engine/styles/*.json` and the auto pick,
  measured from the reference reels and the 1:1 recreations in `recreate/`) and the job runner (`engine/run.mjs`: stages,
  clocks, errors a creator can act on, the `NO_META_KEY` stop). It also drafted README.md, docs/SUBMISSION.md, docs/DEMO-SCRIPT.md and docs/BONUS-KIT.md for Ishaan
  to review. Ishaan set the product, the taste and every claim; nothing was submitted or posted by the AI.
- 2026-11-04: Card Studio theme (`engine/card-studio.mjs`, `engine/meta.mjs` plan and transcribe calls,
  `player/card-studio.js`, `tools/render-card.mjs`, `engine/person_matte.py`, `engine/stock.mjs`,
  `tools/meta-standin.mjs`) by Vignesh B S, with AI coding help (docs/themes/THEME_README.md documents the theme; six of
  the theme branch's commits are authored by an agent identity, `Tab <tab@tab.bot>`). [[Vignesh: name the tool(s) you used.]]
- 2026-11-05: Claude Code (Claude Opus 5.5) renamed the product to Edit Easy, cut the styles to the two render engines
  (uploads alternate between them), and built prompt editing after the render: `engine/edits.mjs` matches a prompt's
  keywords to a stored dictionary of edit functions (fuzzy spelling, no model call) and re-renders only. It ported
  Captions Easy (Ishaan's own repo) into the studio: the caption editor, the word-level timeline and its ops
  (`engine/word-ops.mjs`), and a stored library of its looks and animations (`library/captions-easy/`). It also put the
  reference recreations on /styles beside their raw takes. Ishaan set what to build; nothing was submitted or posted by the AI.
- 2026-11-05 (later): Claude Code (Claude Opus 5.5) made the studio preview-first: a new edit stops after planning and
  plays as a live preview drawn in the browser with the engines' own drawing code (`player/*.js`), prompt edits change
  the plan with no render, and the MP4 is made only on "Render final video". It made every part of the preview
  clickable (caption, word, photo beat, effect, badge, handle, call to action) so a prompt edits only that part, added
  Edit and Before/After views (white, a Muse pill on the After), the reference edits as samples that open already
  edited, Card Studio without the storyboard card, and Vignesh's Polyester edit as a prompt skill
  ("make it a polyester edit"). Ishaan set what to build; nothing was submitted or posted by the AI.
