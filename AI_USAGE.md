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
