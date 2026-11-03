# metahack: CONTEXT (read this first)

Written 2026-11-03 by the planning session that started in the Moovi repo. Everything a new session needs is here or
linked from here. Owner: Ishaan. Repo: https://github.com/Ishaan-Gpt/metahack (public).

## 1. What we are building (one paragraph)
**An editing engine: give it a raw "before" talking-head clip, get back an "after" that looks like a hired short-form
editor made it**: graded, cut, kinetic captions, motion graphics, UI mock-ups, 3D props, transitions, effects, sound
design, a brand frame. The engine is a **library of templates (look states) plus a director**: code does everything that
can be measured, and a small model (Meta's Muse Spark) only makes the few choices that need judgment, in one short call
per video. The product output is the after video and a before/after split showing both.
It is entered in the **Meta Global AI Developer Hackathon** (Cerebral Valley x Meta). It replaces Moovi as Ishaan's
hackathon product; Moovi's editing pieces are imported as source (section 11).

## 2. The hackathon in short (details in `hackathon/RULES.md`, quoted from the Official Rules)
- **Deadline: Wed 4 Nov 2026, 9:00 PM ET (Thu 5 Nov 06:30 IST).** Internal target: 4:00 PM ET. Submit at
  https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit (login; Ishaan only).
- Judging (both tracks): **Impact 30%, Use of Meta AI tooling 25%, Demo incl. the video 25%, Technical depth 20%.**
- Prizes: startup track 250k/150k/75k/50k/25k; indie track 150k/100k/75k/50k/25k; bonus prizes up to 50k (community vote,
  most viral, others), announced about Nov 10.
- Ishaan applied to the **startup** track. A track switch is UNKNOWN (ask Cerebral Valley). Startup track needs a startup
  whose Representative is "an active employee". Pre-existing work: not forbidden, not explicitly allowed: **disclose**.
- Submission gives Meta/CV a perpetual licence to the submission: only put in what we own or may licence.
- Other files: `hackathon/PLAN.md` (the hour plan written for Moovi; this file supersedes its build steps),
  `hackathon/FIT.md`, `hackathon/INDIE.md` (all Muse models, costs), `hackathon/WINNERS-WHY.md`, `hackathon/WHY-WE-WON.md`.

## 3. The references and their essence
Four "before → after" reels by short-form editors (full beat tables in `refs/`):
| id | Editor | Length | What the after is | Dialect |
|---|---|---|---|---|
| edit-ba1 | Hossein (BONOMI ad) https://www.instagram.com/p/DduLd-RRDxa/ | 23 s, 48 words | one static take turned into a brand ad: segmentation looks, meaning colour, word-built type | **Kinetic Brand** |
| edit-ba2 | Tahrima https://www.instagram.com/p/DaFaIEGIFvx/ | 45 s, 166 words | creator studio: colour-field ground that changes with meaning, chapter cards, glow hero words behind the mic, list builder | **Creator Studio** |
| edit-ba3 | Daniel "$10 vs $80" https://www.instagram.com/p/DXjyhHEkwOV/ | 18 s, 58 words | dull footage hidden behind Apple-clean UI that acts out every claim; A-roll shrinks to card/circle | **Clean UI** |
| edit-ba4 | Mahdi (interview) https://www.instagram.com/p/DdM89KRMPBJ/ | 24 s, 99 words | warm documentary: yellow glow hero words, a 3D sunlit desk world for the process, money falling behind him | **Desk Doc** |
**Essence (for the viewer of these reels):** a creator, coach or brand deciding whether to hire an editor. They came to
see the **same plain take become premium content**, and the side-by-side lets them feel the difference in one second.
**Essence (for our product's user):** "I talk to my phone; the engine hands me what a pro editor would have made."

## 4. The WHY (principles shared by all four; these are the engine's laws)
1. **Show the sentence, don't just say it.** Every phrase gets a picture or a typographic act that means what is said:
   a statistic becomes a huge number, a process becomes objects on a desk, a tool becomes its UI, a list becomes a stack.
2. **Editing solves the footage's problems** (ba3's own caption). Dull footage gets hidden behind graphics, a static take
   gets variety from shot size and ground changes, a cheap room gets replaced by a colour field or a void.
3. **The A-roll is a layer, not the canvas.** It is cropped (wide → close-up), shifted aside, shrunk to a card or circle,
   framed, isolated on a void, or replaced for a few seconds, then returns.
4. **One hero word per phrase.** Big, bold, lit (glow, colour); helper words small, light or script. Built word by word
   in sync with the voice. Never on the face; often beside it or **behind the person** (masked).
5. **Colour carries meaning, tied to the brand.** Alarm/negative/statistic: the hot colour (red). Warm ideas: warm
   colours. Conclusion: desaturate, then colour returns on the payoff. One video, one palette.
6. **Rhythm: something changes every ~1.2-2.5 s, with rest beats.** Loud beats (huge type, void, particles) alternate
   with quiet ones (A-roll, tiny subtitle or nothing). 20-35% of the time has no text graphic at all.
7. **Segmentation is everywhere.** Text behind the person, background dimmed/desaturated/swapped, rim line, particles
   behind the head, A-roll isolated on a void. This is what makes cheap footage look produced.
8. **One dialect per video.** One type system (a bold display sans + a light/script companion), one palette, one world.
   Variety lives inside one language; a structural card (chapter 1/2/3) may repeat because it is the video's structure.
9. **Transitions are few, motivated and never twice in a row:** light burn, line wipe, particle dissolve, blur-through,
   flash, whip. Most changes are hard cuts on phrase ends.
10. **A brand frame:** a grade (contrast, deep blacks, warm skin), a bottom fall-off to dark under the captions/logo,
    a logo bug, an end card or CTA.
11. **The voice stays natural**; the edit carries the energy. Sound design (whooshes, pops, hits, UI clicks, risers,
    a bed) is claimed by the editors but **not yet measured** from the audio (open task E0.4).

## 5. The parameters (the edit grammar the engine works in)
A video = global settings + a list of **beats** (one per phrase/sentence). Each beat is one **look state**.

**Global (one per video, chosen once):**
- `dialect`: kinetic-brand | creator-studio | clean-ui | desk-doc (more later)
- `palette`: brand colours (from the user or the footage) + meaning roles: `hot` (alarm/number), `warm`, `cool`, `ink`,
  `paper`, `ground`; neutrals tinted from the dominant (Ishaan's palette rule)
- `type`: display (bold sans caps), companion (script/serif italic or light), subtitle; sizes as ratios
- `grade`: base look (contrast, black point, warmth, saturation), vignette, grain
- `frame`: logo bug position, bottom fall-off, end card/CTA
- `pace`: target change interval (1.2-2.5 s), rest-beat share (20-35%), transition budget (≤ 1 per 4 beats)
- `sound`: bed (music file, gain), SFX kit

**Per beat (the look state):**
| Param | Values (seen in refs) |
|---|---|
| `role` | hook, question, claim, negative, number/stat, list-item, chapter, mechanism/process, tool/how, example, contrast, payoff, cta/brand |
| `hero` | the one word or number the beat is about (+ helper words) |
| `shot.size` | wide (as shot), medium, close-up, extreme close-up (crop scale 1.0-2.2 via the person box) |
| `shot.place` | centre, face-left/text-right, face-right/text-left, low |
| `shot.motion` | static, slow push, drift, punch on the hero word |
| `subject` | as-is, cutout+rim line, background dim/desaturate, ground swap to a colour field, void (black/navy), B&W, frame-in-frame (glowing border), card (rounded), circle, mini avatar, off (graphic only) |
| `text.system` | none, phrase subtitle (small), hero-glow line (hero big + helpers tiny), stacked kinetic block (mixed weights), neon word, one-word subtitle, list stack (pills), chapter card (ghost numeral + icon + label), text inside a graphic |
| `text.place` | beside the face, below the chin/chest, behind the subject, top band, in the graphic |
| `text.entrance` | word-synced pop/rise, blur-in, letter scramble, typewriter, draw-on |
| `graphic` | none, big stat, chapter card, badges/icons, UI mock (chart card, checklist, app-store row + cursor, notification, calendar pills, clock), 3D props/desk world (brain, bulb, notes, storyboard → player, coffee, leaves), particles (money, sparks) behind the subject, frame + 3D objects (eyeballs) |
| `color` | which palette role this beat uses (hot/warm/cool/ink) |
| `transition.in` | cut (default), flash/light burn, line wipe, particle dissolve, blur-through, whip, zoom-through, morph (A-roll ↔ card ↔ circle) |
| `fx` | glow, chromatic aberration, noise, posterize-time, light leak, depth blur |
| `sfx` | pop/tick per word, whoosh on a transition, hit on a stat/hero, riser into a reveal, UI click/notify, swoosh on a card |
Hard rules (enforced by code, not the model): text never covers a face, Shorts safe area (y 230-1480, x 70-905 of
1080x1920), one text layer per frame, no transition twice in a row, no beat look twice in a row, never a black/empty
frame, no punctuation in captions, a caption card stays ≥ 1.2 s.

## 6. The engine (pipeline)
```
before.mp4
 0 ingest   probe, normalise to H.264, 1080x1920 (landscape: reframe by the tracked person), audio out        code
 1 hear     word timings (local Whisper / Groq), speakers (Muse Voice Transcribe: diarization, turn times)     model-light
 2 clean    cut silences, false starts, repeats (Moovi cut.ts / takes.ts)                                      code
 3 see      person + mic masks per frame (SAM 3.1, ~10 fps, interpolated), face box (MediaPipe, local)         SAM
 4 read     sentences → role guess, hero word, numbers, list items, verbs (Moovi readSentences)                code
 5 direct   ONE Muse Spark call: per sentence {role, hero, template id, colour role, slot text}                 1 call
 6 cast     constraints: variety, rhythm, transition budget, face-safe, loud/quiet, dialect                     code
 7 render   browser player draws the beat spec live (Moovi edit-player devices); MP4 only on "export"           code
 8 sound    events → one SFX stem + bed + voice, loudness targets (Moovi audio/style1.ts)                       code
 9 check    face/safe-area/empty-frame/contrast checks; optional one Spark vision look at 6 frames             0-1 call
10 output   after.mp4 + before/after split
```
The **beat spec** format and player already exist in Moovi (`import/moovi/mastery/edit.md` "The beat spec",
`import/moovi/mastery/edit-player/player.html`, `import/moovi/engine-edit/beatspec.ts`). We extend them; we do not
reinvent them (Ishaan's rule: port the Edit mastery player, never re-implement its taste).

## 7. Spending as few tokens as possible (design rules)
1. **The model never writes code, coordinates, timings or colours.** It picks ids from a short menu and fills text slots.
   Positions come from masks/face boxes, timings from word anchors, colours from palette roles.
2. **One direct call per video.** Input: numbered sentences (≈ 10-15 tokens each) + the dialect's template menu as short
   ids with one-line "use when" (cached system prompt). Output: compact JSON per sentence via structured output.
   A 60 s clip ≈ 2-3k input tokens (≈ 1.5k cached) and ≈ 0.6-1k output.
3. **Rules first, model second:** `readSentences` already guesses role/hero; the model only confirms or changes them.
   With no model at all the engine still makes a full edit (deterministic caster), just less sharp.
4. **Vision is optional and tiny:** one look at 6 rendered frames for a sanity score, not per frame.
5. **Templates are authored offline** (by Claude Code in development, from references), never at runtime.
6. **Cache everything:** masks, transcripts, picks per clip hash; re-edits ("bigger captions") re-run only the cast step.
Estimated Meta cost per 60 s clip (unmeasured; measure in step H2): Spark ≈ $0.01, Voice ≈ $0.003, SAM 3.1 ≈ $0.12 at
10 fps (600 frames × $0.20/1000) ≈ **$0.15 a minute**; $150 of credits ≈ 1,000 minutes.

## 8. Meta models (from dev.meta.ai/docs/models, read 2026-11-03; prices in `hackathon/INDIE.md`)
| Model | Role here |
|---|---|
| **Muse Spark 1.3** `muse-spark-1.3` (Standard mode, never Contributor for users' clips) | the director: one structured call per video; can also watch video directly (optional) |
| Muse Spark 1.2 | audio understanding (Meta says 1.3's audio is not fully supported) if we ask the model to hear emphasis |
| **SAM 3.1** `sam-3.1` | person/mic masks + tracking for every look in principle 7; reframing landscape to vertical |
| **Muse Voice Transcribe** | who speaks when (podcasts, interviews). **No word-level timestamps**: captions use local/Whisper word times |
| Muse Image | optional: a thumbnail from a real frame, a prop when the library lacks one |
| Muse Glimmer (open, 30B, Apache-2.0) | optional: offline director via Ollama |
| Muse Wonder | not needed (cost) |
API: `https://api.meta.ai/v1` (OpenAI/Anthropic compatible), key in `.env.local` as `MODEL_API_KEY` (never in git).
SAM: `/v1/files` upload (purpose `user_data`) then `/v1/responses` with `input_video` + `input_text: "person"`,
`stream: true`; decode with Meta's parser (`@meta-sam/parser`; cookbook `07_sam/01_api_basics`). MP4/MOV only, ≤ 15,000
frames per request, ≤ 16 tracked objects.

## 9. The template library (what "a library of templates" means here)
A template = one look state recipe that a beat can take. Stored as data, drawn by the player's devices.
```jsonc
{
  "id": "kb.stat-void",                // dialect.short-name
  "dialect": "kinetic-brand",
  "roles": ["number"], "weight": 1,     // when it fits
  "needs": { "mask": true, "number": true, "faceFree": "top" },
  "shot": { "size": "medium", "place": "low" },
  "subject": "void",
  "text": { "system": "hero-glow", "place": "top", "behind": true, "entrance": "word-pop", "color": "hot" },
  "graphic": null,
  "transition": "line-wipe",
  "sfx": [{ "on": "hero", "k": "hit" }, { "on": "in", "k": "whoosh" }],
  "slots": ["hero", "helper"],          // the only things the model writes
  "loud": true
}
```
Libraries to build (the user's list), each a folder of such entries plus their devices in the player:
captions (exists: Premium Captions 1-4) · effects (glow, aberration, grain, leak…) · camera (exists: 63 moves) ·
motion graphics (stat, chapter card, badges, list stack, UI mocks) · 3D props/worlds (desk world exists in edit-player) ·
transitions · grades (LUTs exist) · sfx (kits exist) · templates (= look states, the new layer that ties them together).

## 10. Quality bar and how we prove it
- "Exact or better" is proven, never claimed: the **blind ratchet** (ishaan-motion `references/ratchet.md`): our after and
  the reference's after are scored side by side by a blind judge; ship a dialect only when it **matches or beats** the
  reference (ba1 8.5, ba2 8, ba3 8.5, ba4 8.5 by this session's own eye; re-score in the judge's round).
- Nothing reaches Ishaan under 8/10, with the scores shown. Watch every live preview in real time before sending it.
- Honest note: matching on **any** clip is harder than matching on the reference's own clip. Test on 5 different clips.

## 11. What was imported from Moovi (source to port, not a working build yet)
Moovi commit at copy time: `d8958c0` (repo https://github.com/Ishaan-Gpt/moovi). These files reference Moovi packages
(`@moovi/*`, the graph, config) and **do not compile here as is**; port what a step needs.
| Path here | From Moovi | Why |
|---|---|---|
| `import/moovi/mastery/` | `docs/agents/mastery/` | **The edit taste source**: `edit-player/player.html` (the beat-spec player, devices, desk world), `specs/*.json`, `edit.md` (spec format, verdicts), `captions.md` (Premium Captions rules), `refs-*.md` |
| `import/moovi/engine-edit/` | `packages/engine/src/edit/` | the edit pipeline: hear, cut, takes, beatspec (readSentences, castBeats, beatSpecOf), registry, beats-draw, film (MP4 capture), restore (grade + upscale), effects (cutout, auto) |
| `import/moovi/engine-audio/` | `packages/engine/src/audio/` | style1.ts (the SFX/mix engine), stt (Whisper), local-stt, mix |
| `import/moovi/engine-library/` | `packages/engine/src/library/` | edit-styles and the library readers |
| `import/moovi/engine-review/` | `packages/engine/src/review/` | the frame checks (face, contrast, lens) |
| `import/moovi/captions/` | `packages/library/src/captions/` | Premium Captions (presets, draw.ts painter, theme) |
| `import/moovi/kits-motion/` | `packages/library/src/kits/motion/` | shared motion core, type, grade (+ LUTs), sfx, footage |
| `import/moovi/camera/` | `packages/library/src/camera/` | 63 camera moves by keyword |
| `import/moovi/scripts/` | `packages/engine/scripts/ref-intake.ts`, `ref-footage.ts` | one-command reference intake |
| `assets/` | `packages/engine/assets/` | fonts (OFL), CC0 sfx, Ishaan's Style 1 sound pack, CC-BY music bed (credit Kevin MacLeod), MediaPipe face/selfie models (Apache-2.0), desk-world cut-outs (Poly Haven CC0), the MotionEasy renderer (MIT). Licences: `assets/CREDITS.md`, `assets/world/CREDITS.txt` |
| `.claude/skills/` | `~/.claude/skills/` | ishaan-motion 1.17.86 (edit-fundamentals.md, talking-head.md, ratchet.md…), ishaan-ui 2.2.0, author-english |
Not copied (on purpose): reference media (other people's reels), FalkorDB/graph code, the studio app, Moovi's other
styles. Reference frames live in `moovi/data/refs/edit-ba1..4/` on Ishaan's PC.

## 12. Implementation plan
Times are estimates; log actuals in `LOG.md`. Two horizons: **H = hackathon (by 4 Nov 4 PM ET)**, **E = the engine
after it.** Simple and nailed: in H, one dialect done well beats four half-done.

### H: hackathon build (≈ 26 working hours left on 3 Nov evening ET)
| # | Step | Est | Done when |
|---|---|---|---|
| H0 | Gates (Ishaan): accepted? track? Meta key + $150 credits claimed; form fields copied (hackathon/PLAN.md G1-G7) | 1 h | key in `.env.local` |
| H1 | Skeleton: pnpm/TS project, `packages/engine` (pipeline), `apps/player` (the ported edit player, served with byte ranges), one CLI `edit <before.mp4> --dialect kinetic-brand` | 2 h | CLI runs end to end on a test clip with the deterministic caster |
| H2 | Meta smoke + measure: Spark structured output; SAM 3.1 on 5 s (mask decode); Voice diarization. Record time and $ | 1.5 h | numbers in `RESULTS.md` |
| H3 | Port hear/clean/read from Moovi (stt, cut, takes, readSentences) | 2 h | words + sentences + cuts for any clip |
| H4 | SAM masks → per-frame person matte + face box files; local MediaPipe fallback | 3 h | mask video plays aligned in the player |
| H5 | Dialect 1 = **Kinetic Brand** (ba1 + ba2's grammar): 8-10 templates: hero-glow line, stacked kinetic block, behind-subject text, close-up text-beside, void + big stat, ground swap (meaning colour), B&W conclusion → colour payoff, chapter card, list stack, end card. Each a player device + template entry | 6 h | each template plays on the test clip, face-safe |
| H6 | Director: one Spark call (menu + sentences → picks); caster constraints; cache | 2 h | same clip → same edit; ≤ 1 call; tokens logged |
| H7 | Sound: port style1 SFX engine; events from the spec; bed; loudness | 1.5 h | the preview plays with sound |
| H8 | Blind ratchet vs edit-ba1/ba2 on 3 clips; one fix round per template | 3 h | ≥ 8/10, scores logged |
| H9 | Demo film (before/after split, real clock, real $, Meta models named on screen), README with prior-work disclosure | 4 h | Ishaan watched the live preview and said export |
| H10 | Submit (Ishaan) | 1 h | confirmation screenshot |
If H4 (SAM) overruns: MediaPipe selfie matte (already vendored) for the demo, SAM for reframing only, said honestly.

### E: the engine (after the hackathon)
| # | Step | Est |
|---|---|---|
| E0 | Reference → why pipeline: `ref-intake` + a beat-table extractor (frame sheets + transcript → the section-5 table as JSON, by Spark or Claude, checked by a human); E0.4 measure sound design from the audio (onsets, whooshes, hits) | 1 day |
| E1 | Dialects 2-4: Clean UI (UI mock kit: chart card, checklist, app row + cursor, notification, calendar pills, clock), Desk Doc (desk world props from Moovi's edit-player, scramble text, particles behind), Creator Studio (colour-field ground, neon word, frame-in-frame + 3D objects) | 2-3 days each |
| E2 | Libraries as data: captions, effects, camera, transitions, graphics, props, grades, sfx; each entry tagged with roles/needs (the template schema) | ongoing |
| E3 | Taste memory: per user dialect/palette/feedback (Moovi's FalkorDB pattern, optional) | 2 days |
| E4 | Podcasts: diarization → speaker-follow reframing, two-person layouts, long → Shorts picking | 3 days |
| E5 | Scale: server render path, batch, GPU export (docs in Moovi `docs/agents/speed/`) | later |

## 13. Ishaan's rules that apply here (full text: `.claude/skills/`, his global CLAUDE.md)
Taste is Ishaan's (propose options, list every default, wait for his yes) · never the AI-default palette · text never on
a face, Shorts safe area · never a black/empty frame · author's English for any script/caption copy · show work as a
live preview he can play (byte ranges), one export at the end only after he says export · nothing under 8/10 shown,
with scores · a reference is the WHY, never the WHAT (no copying an editor's exact elements, colours or captions) ·
simple and nailed · no secrets in git · log AI use.

## 14. Decisions waiting for Ishaan
1. Which dialect is built first for the hackathon (recommended: Kinetic Brand, from ba1 + ba2).
2. The demo's before clip (his own face, or a consenting person; it gets licensed to Meta on submission).
3. Fonts and palette for dialect 1 (propose 2-3 options each; Moovi's Premium Caption 1 is a candidate).
4. Music bed and SFX kit (Style 1 pack is available).
5. Track (startup vs indie) and the Representative.
6. Whether the repo stays public now (it is public; the skills in `.claude/skills/` are now public too).

## 15. Open questions and risks
- SAM 3.1 mask decoding and speed are unverified (H2 decides). Spark tool/schema behaviour unverified.
- Sound design of the references is unmeasured (E0.4).
- Matching a reference on arbitrary clips is harder than on its own clip; the ratchet is the only proof.
- The imported Moovi code needs porting (graph, config, `@moovi/*` imports).
- The hackathon's pre-existing-work rule is unknown: disclose Moovi as the source of the imported parts.
