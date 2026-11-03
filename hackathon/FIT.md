# FIT: Moovi against the Meta hackathon (2026-11-03)

Scores are my honest estimate of how a judge would score us TODAY and AFTER the plan. They are guesses, not facts. Criteria and weights are CONFIRMED in RULES.md (Impact 30, Meta tooling 25, Demo 25, Technical 20).

## The wedge (one sentence)
**Moovi turns a founder's raw phone clip of themselves explaining their product into a finished, captioned, sound-designed vertical launch video in minutes, for cents, so a technical founder with no editor can ship a video every day.**
- User: a solo or small-team technical founder (the startup track's "technical founders building a product") who has a product and no video.
- Painful job: getting seen. Code is cheap now; distribution is not, and the only affordable distribution is video the founder cannot edit. (Same thesis as our Graph Hacks demo hook, so it is already ours.)
- Measurable result (to be MEASURED in plan step 6, never claimed before): minutes from upload to a playable cut; Meta API cost per video in dollars (Muse Spark $1.25 in / $4.25 out per M tokens, SAM 3.1 $0.20 per 1,000 video frames, Muse Voice $0.18 per hour; a 30 s 30 fps clip is 900 frames, about $0.18 of SAM); number of words captioned correctly; face never covered.
- Theme to claim: **Build for Your World** (our own domain: video). Do not claim "Push the Frontier".

## How Meta's models become load-bearing (each one swaps something that exists)
| Meta piece | What it does inside Moovi | Today's code it replaces/joins | Effort |
|---|---|---|---|
| **Muse Spark** (`muse-spark-1.3`, Standard mode, NOT Contributor: Contributor requires permission to train on your content) | The whole crew's brain: director, writer, editor decisions (three tiers) | `packages/engine/src/runtime/providers.ts`: add a `meta` entry, OpenAI wire, base `https://api.meta.ai/v1`, key `MODEL_API_KEY`. The `compatible` provider (`MOOVI_API_KEY` + `MOOVI_BASE_URL`) already exists, so a zero-code trial is possible | 0.5-1 h |
| **SAM 3.1** (`sam-3.1` via `/v1/responses`, `input_video`, concept prompt "person", stream) | The person cutout per frame: text behind the speaker, captions kept off the face, effects that follow the subject | `src/edit/effects/cutout.ts` (local U2-Net via onnxruntime, 320x320 masks). A SAM path writes the same `m%05d.png` masks | 3-4 h, riskiest |
| **Muse Voice Transcribe** (`/v1/asr/transcribe`, WAV, up to 10 min) | Hear the clip | `src/audio/stt.ts` (Whisper on Groq/OpenAI, or local). **Word timestamps are NOT documented**, and captions need word timing. Do it only if the response has them; otherwise keep the local/Whisper path for timing and say so | 1-2 h, optional |
| **Muse Image** (`muse-image-1.0`, $0.01 an image) | Inserts and pictures when the library has none | library-first pictures already exist; optional garnish | 1 h, optional |
| Open weights on Baseten / Modal / Fireworks | Not needed; skip. Mention only if honest | | skip |

"Went beyond a basic integration / surfaced unexpected capabilities" (25%) is best earned by SAM 3.1 on video (tracking the speaker) plus Spark running a multi-agent crew with tool calls, shown with a kill switch ("unplug Meta, the crew stops", the same beat as our Graph Hacks "pull the plug").

## What is REAL today (evidence level)
- **Read in code/docs (not re-run by me):** the edit pipeline (`packages/engine/src/edit/`, 7.8k lines incl. film, cut, effects, reedit), the crew and task board in FalkorDB, the model layer with 12 providers and a repair/coerce layer built for weak models (`docs/MODELS.md`), the local person cutout, the studio and landing, BYOK sealing.
- **Checked live just now (curl, 2026-11-03):** https://moovi-three.vercel.app returns 200 in 1.4 s; `/studio` 200 in 0.7 s; https://65-2-223-240.sslip.io/studio 200.
- **From CLAUDE.md, not re-measured by me:** live styles 13-48 s to a preview; Auto 27.7 s; edit test clip in 58 s on 2 threads; "165 engine tests".
- **Not run by me:** `pnpm typecheck`, engine tests, any film. Step 1 of the plan does this.
- **No Meta integration exists.** Grep for `api.meta.ai`, `muse-spark`, `sam-3`, `MODEL_API_KEY` outside `docs/agents/meta-hack/` found nothing I could confirm (the search was still running in the background when this was written; re-run before claiming). There is **no Meta API key on this machine** that I know of; Ishaan must claim the $150 credits.
- **Unverified Meta facts:** whether Spark through `/v1/chat/completions` supports tools and JSON schema the way our adapter assumes; SAM mask stream decoding (official parser `@meta-sam/parser` exists; repo path `07_sam/01_api_basics`); SAM latency per clip; transcribe word timing.
- **Known weak points:** CLAUDE.md says the server is a 2 GB t3.small and a heavy MP4 film "timed out"; the live path is preview, not MP4 export. The Moovi MCP connector in this session reports "This Moovi connection was removed" (a stale token, irrelevant to the product). Taste rules mean no film may be shown under 8/10 (Ishaan's rule).
- **Honest hazards for the claim "holds up in production":** no users or usage numbers are in the repo. If Ishaan has real users (even 5 friends who made a video), that is the single strongest proof we lack. Ask him.

## Scorecard (startup track)
| Criterion (weight) | Today | After plan (target) | Why / what moves it |
|---|---|---|---|
| Impact 30% | 5 | 7 | Wedge is clear and real (founders lack video). Needs one named real user or measured before/after and a number for cost/time. We have no usage proof in the repo. |
| Use of Meta AI tooling 25% | 0 (none used) | 7 | Spark as the crew + SAM 3.1 on video + kill-switch beat. Voice/Image are a bonus only if they work. |
| Demo 25% | 6 | 8 | We know how to make films and the product has a live link. Demo must show a real clip going in and a finished film coming out, with real clocks. |
| Technical depth 20% | 7 | 8 | 7.8k-line edit engine, graph memory, repair layer. Needs a clean README, tests green, and the Meta swaps shown with measured numbers. |
| **Weighted** | **~4.3** | **~7.3** | Winning the $250k needs a story better than "another AI video editor" (the winners research warns of this); the realistic aim is a top-5 placing ($25-250k) plus a bonus prize. |

## Side prizes (CONFIRMED only these exist, all at Meta's discretion, up to $50k total, announced about Nov 10)
| Prize | Fit | Action |
|---|---|---|
| Community vote award (if it exists) | Good: a video product makes shareable output | A public page with the demo film plus 2-3 films Moovi made; a 30-45 s vertical cut for posting; ask supporters only if rules allow (UNKNOWN: ask Discord how votes work) |
| Most viral project | Moderate: depends on posting Nov 4-9 | Post the 30-45 s cut on Ishaan's channels after submitting (Ishaan decides; nothing is posted by Claude) |
| Other "unique or notable" categories | Unknown | Read the Discord announcements for the real list |
No sponsor prizes from Baseten/Modal/Fireworks are listed anywhere (credits only).

## Track risk
The startup track needs a startup with an employee Representative. If Moovi has no entity, ask CV today whether a sole-founder company or the indie track applies (RULES.md item 3). Indie 1st is $150k vs startup $250k; both have 5 places.
