# HANDOFF (2026-11-04): start here in a new chat

Read in this order: this file → CONTEXT.md → docs/rules/ISHAAN-GLOBAL-RULES.md → the newest entries at the end of
`.claude/skills/ishaan-motion/references/lessons.md` (1.17.87, 1.17.88) → `docs/recreate/ba1/RESULT.md`.

## What metahack is
An editing engine for the Meta Global AI Developer Hackathon (deadline **Wed 4 Nov 2026, 9:00 PM ET**; rules in
`hackathon/RULES.md`): a raw talking-head clip in, an edit that looks like a hired short-form editor made it out.

## How Ishaan wants reference work done (binding, lessons.md 1.17.88)
ONE reference at a time, recreated 1:1 on similar Wikimedia Commons footage, in 5-second windows: REF.md (measured frame by
frame, never guessed) → build → OURS.md, DIFF.md, PLAN.md → fix → compare → next window. Sharpest reference copy; fonts by
x-height and letter shapes; colours sampled; camera zoom/pan per frame; motion-blur shutter; a side-by-side and a
per-region motion check at the end; a preview for him; no questions mid-way. His bar: **10/10** (a blind side-by-side cannot
tell ours from the reference). He plans ~100 references, so speed matters: timebox the footage hunt (10 min) and each
window (25 min, 2 rounds), run references in parallel, and turn measurement and the devices into reusable tools.

## Status
| Reference | Where | State |
|---|---|---|
| edit-ba1 (BONOMI ad) | `recreate/ba1/`, `docs/recreate/ba1/` | playable; blind judge 6.2 vs reference 8.2 (before the last fixes). Main gap: the Commons footage (NASA, Dr. Kate Calvin, public domain) is a tight landscape shot, so the speaker is 1.5x bigger/higher than the reference's and the punch word can't sit behind her head. Ishaan was asked for a vertical, seated, warm-room raw clip (eyes ~45% of height) and a brand word for the end card (placeholder "D●RAVI"). |
| edit-ba2 (Tahrima) | `recreate/ba2/`, `docs/recreate/ba2/` | playable, first 20 s (windows 00-15); host NASA Curious Universe (PD); gaps: different host and words, soft upscaled close-ups, flat eyeballs, no sound design, ref 20-45 s not built; no blind score |
| edit-ba3 (Daniel, $10 vs $80) | `recreate/ba3/`, `docs/recreate/ba3/` | playable, full 17.9 s; all UI rebuilt in code from measured tables; Kizzi Sim Racing (CC BY 3.0); gaps: sim-racing words, olive room, Inter for SF Pro, no sound design; no blind score |
| edit-ba4 (Mahdi, interview + desk world) | `recreate/ba4/`, `docs/recreate/ba4/` | playable, full 23.7 s; Burnie Burns / TSTV (CC BY 3.0); camera matched per frame, three.js brain, CC0 desk scans, leak, money behind; gaps: face 1.29x, skin orange, jump cut at 21.6 s, music a stand-in (needs Ishaan's yes); no blind score |
| **self1** (no reference: the four WHYs applied) | `recreate/self1/`, `docs/self/WHY.md`, `docs/self/EDIT.md` | playable + white showcase; NASA Ernie Wright 'the moon remembers' (PD); blind judge 7.0 vs the references' own 8.0 / 7.3 / 6.3 / 3.5 (one fix round after, not re-judged); weakest: showing (no UI/world sequence) |
Previews (run `node serve.mjs 4700` in this folder): `/recreate/<ba1|ba2|ba3|ba4>/compare.html` (side by side with sound),
`/recreate/<id>/index.html` (ours alone), `/recreate/ba1/showcase.html` and `/recreate/self1/showcase.html` (white before/after).
One MP4 of a showcase: `node tools/export-showcase.mjs url=<showcase url> out=out/<name>.mp4` (only when Ishaan says export;
`out/*.mp4` is git-ignored; ba1's is `out/ba1-before-after.mp4` with `out/UPLOAD-ba1-before-after.md`).
Earlier attempts and their scores: engine v0 kinetic captions (Ishaan 1/10, `LOG.md`), the four-references mix on his take 3
(`player-em/specs/edit-t3-fourwhy.json`, blind 5.2 → 5.8; Ishaan "didn't do any good").

## Where things are
- `engine/` prep (ingest, Groq word timings, pause cut, graded.mp4), read, direct (one Muse Spark call + rules), matte;
  `engine/meta-smoke.mjs` tests Muse Spark / SAM 3.1 / Voice once `MODEL_API_KEY` is in `.env.local` (not run yet: no key).
- `player/` canvas player with a baked person matte; `player-em/` Edit mastery's player ported (devices: cam forms, desk world
  with real cut-outs, art, leak, burn, stat, Premium Caption 1); `recreate/<ref>/` the 1:1 recreations.
- `tools/shoot.mjs` (headless Chrome frame sheets; pass `tmp=`), `tools/fps.mjs` (real-time check), `tools/spec-t3.mjs`.
- `import/moovi/` everything carried over from Moovi (source to port, not a build): `mastery/` (Edit mastery: the edit taste
  source, player, specs, captions.md), `captions/` (Premium Captions 1-4), `engine-audio/style1.ts` (the SFX/mix engine),
  `engine-edit/`, `engine-library/`, `engine-review/`, `kits-motion/` (+ LUTs), `camera/` (63 moves), `library-src/` (kits
  R1-R5, Style 1/4, Dark Vox, Anatomy, types), `speed/` (preflight, grab, export, PLAN, CHECKLIST), `docs/` (LIBRARY, VOICE,
  BRAND, MODELS, QUERIES, 3D), `CLAUDE-moovi.md`, `scripts/` (ref-intake, ref-footage).
- `assets/` fonts (OFL, + `assets/fonts` added for the recreations), CC0 sfx, Ishaan's Style 1 sound pack, CC-BY music bed
  (credit Kevin MacLeod), MediaPipe models, desk-world cut-outs (CC0). Licences: `assets/CREDITS.md`.
- `.claude/skills/` ishaan-motion (1.17.88), ishaan-ui, author-english (copies of the global skills; the global ones in
  `~/.claude/skills/` are the source: write new rules there first, then mirror here and in Moovi).
- `docs/rules/` Ishaan's global rules and the edit-taste memories from the Moovi sessions.
- `hackathon/` rules (quoted), plan, fit, Muse models and costs, winners' why, Graph Hacks notes.
- Not in git: `data/` (clips, reference media and frames, grabs), `.env.local` (GROQ_API_KEY; add MODEL_API_KEY for Meta).
  Reference media lives in `C:\Ishaan GPT\hackthons\moovi\data\refs\edit-ba1..4\` on Ishaan's PC.

## Next steps
1. Collect ba2/ba3/ba4 results; give Ishaan each preview with its blind score.
2. With his raw clip, redo ba1 on it to reach the 10/10 bar.
3. Build the measurement tool (cuts, text boxes and timings, colours per region, camera per frame, sound onsets → REF.json)
   and lift the recreations' devices into the library, so a new reference takes minutes, not hours.
4. Hackathon: Meta key → `engine/meta-smoke.mjs`; SAM 3.1 masks replace the MediaPipe matte; submission per
   `hackathon/PLAN.md` before 9 PM ET 4 Nov.
