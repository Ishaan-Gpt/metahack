# MASTER PLAN: Moovi for the Meta Global AI Developer Hackathon (startup track)

Written 2026-11-03 about 09:35 ET (19:05 IST). **Hard deadline: Wed 4 Nov 9:00 PM ET = Thu 5 Nov 06:30 IST.** That is about 35 hours, not 24. **Internal submit target: Wed 4 Nov 4:00 PM ET (Thu 5 Nov 01:30 IST)**, leaving 5 hours of buffer for the portal.
Read first: RULES.md (what is confirmed), FIT.md (wedge, scores), WINNERS-WHY.md, WHY-WE-WON.md.
Rules for whoever executes: no secrets in files; nothing posted, signed or submitted without Ishaan; nothing under 8/10 reaches him; log each step's ACTUAL time in the "Actual" column and in `LOG.md` here.

## The bet in one paragraph
Enter Moovi in the **startup track** (if Ishaan's status allows) with the wedge: **a founder's raw phone clip becomes a finished vertical launch video in minutes, for cents, on Meta's models.** Load-bearing Meta use: **Muse Spark runs the crew; SAM 3.1 tracks the speaker on video** (text behind the person, captions off the face); Voice and Image only if they work. The demo shows one real clip in, one finished film out, real clocks, measured cost, and a **kill-switch** beat (unplug the Meta key, the crew stops). We disclose prior work and say exactly what was added in the event. Realistic aim: a top-5 startup placing and a bonus prize; the $250k needs the story to land beyond "another AI video editor" (Tailored Labs, an AI video editor, won Bolt's $100k, so the category can win).

## A. GATES: Ishaan does these first (login or judgment needed; I cannot)
| # | What | Where | Time |
|---|---|---|---|
| G1 | Confirm you were **accepted** (acceptance email Oct 26 / account shows the project form) | email + https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit (log in; do not submit) | 5 min |
| G2 | Copy the **submit form's exact fields and limits** (video length, repo, demo link, text limits) into `FORM-FIELDS.md` here. Do not press submit | same page | 10 min |
| G3 | **Claim the $150 Meta Model API credits** (read the Credit Terms first; S6 says last claim day is Nov 4) and make an API key at https://dev.meta.ai. Put it in `.env.local` as `MODEL_API_KEY` (never in a doc or commit) | dev.meta.ai | 15 min |
| G4 | **Ask once in the Meta hackathon Discord** (link comes with acceptance): "May an existing product be entered in the startup track if the Meta-model work is built during the event? Is prior-work disclosure needed? Does the startup track need a registered company, and what are the bonus prize categories / how does the community vote work?" | Discord | 5 min, answer may take hours: **do not block on it** |
| G5 | Decide **track/entity**: does Moovi have a company and an "active employee" Representative (RULES item 3)? If not, ask CV/Discord whether indie (teams up to 4) applies | Ishaan | 10 min |
| G6 | Win proof for Graph Hacks (see WHY-WE-WON.md): paste what you have or tell me the exact placement; until then we write only "built for Graph Hacks" | Ishaan | 5 min |
| G7 | Team: who is on the submission (Vignesh? others)? All must be named; all must have read the Rules | Ishaan | 5 min |
If G1 fails (not accepted): stop the build and ask CV support today; nothing else matters.

## B. Ishaan's decisions (taste and claims; nobody else sets these)
1. Track (startup vs indie) and the Representative. 2. Which people appear on the submission. 3. The wedge sentence and the **title** of the product line for Meta. 4. Whether to use Muse Spark **Contributor** mode (cheaper but trains Meta's models on our content): **default NO**. 5. Which clip is the demo's input (his own face/voice, or a founder who agreed) and who consents to the Meta licence ("perpetual, irrevocable" licence to the submission: RULES item 2). 6. Any claim of "Graph Hacks winner". 7. Which numbers we show (only measured ones). 8. Music, voice, look of the demo film (taste is his: propose options, list defaults). 9. Whether to post the viral cut after submitting, and where. 10. Whether to put the repo public (the Graph Hacks one is already public at github.com/Ishaan-Gpt/moovi).

## C. Hour-by-hour (ET; [IST] in brackets). "Est" is my estimate; fill "Actual".
| When (ET) | Step | Est | Actual |
|---|---|---|---|
| Nov 3 09:30-10:30 [19:00-20:00] | **Gates G1-G7.** Ishaan. In parallel a session does step 1 below | 1 h | |
| 10:00-10:45 | **S1 Baseline:** `pnpm install` if needed, `pnpm typecheck`, `pnpm --filter @moovi/engine test` (FalkorDB: `pnpm falkordb`), run one Edit end to end on the 848x478 test clip locally, and time it. Write `BASELINE.md` (what passes, what fails, real seconds). This is the "real today" proof | 45 min | |
| 10:45-11:30 | **S2 Meta key smoke test** (after G3): three curls/scripts into `scripts/meta-smoke.ts` (not committed): (a) Spark chat; (b) Spark with a tool call and with a JSON schema; (c) SAM 3.1 on a 5 s MP4 (H.264) with concept "person"; (d) optional transcribe on WAV (do we get word times?). Record which work. **This decides what the video can claim** | 45 min | |
| 11:30-12:30 | **S3 Meta provider in the engine:** add `meta` to `packages/engine/src/runtime/providers.ts` (OpenAI wire, base `https://api.meta.ai/v1`, key `MODEL_API_KEY`, tiers `muse-spark-1.3` for all three, json `object` or `schema` per S2, tools native or emulated per S2); add it to `docs/MODELS.md` and `.env.example`; a test in `weak-models` style. Quick path first: run with `MOOVI_PROVIDER=compatible MOOVI_BASE_URL=https://api.meta.ai/v1 MOOVI_API_KEY=$MODEL_API_KEY MOOVI_MODEL_*=muse-spark-1.3` to prove it works before editing code | 1 h | |
| 12:30-14:00 | **S4 Crew on Spark, proven:** run Auto/Launch and Edit end to end on Spark only; fix what breaks with the existing repair layer. Save the job logs (model calls with `muse-spark-1.3` visible). Fallback if Spark fails tool use: emulated tools (already built) | 1.5 h | |
| 14:00-17:30 | **S5 SAM 3.1 cutout** in `src/edit/effects/cutout.ts` behind `MOOVI_CUTOUT=sam`: upload clip (`/v1/files`, purpose `user_data`), `/v1/responses` with `sam-3.1`, `input_video`, `input_text:"person"`, `stream:true`, decode with the official `@meta-sam/parser` (repo path `07_sam/01_api_basics`, TypeScript `02-upload-and-segment-video.ts`), write `m%05d.png` masks in the existing layout, keep U2-Net as fallback. Convert the clip to H.264 MP4 first (VP9/WebM refused). Measure seconds and dollars. **Cut-off: if no mask decode by 17:30, drop to "SAM on key frames/images only" or drop SAM entirely and say so** | 3.5 h | |
| 17:30-18:30 | **S6 Transcribe (optional):** only if S2(d) returned word times; else skip and keep Whisper/local for timing (say "Meta for the crew and the cutout"). Never claim a Meta part that is not in the run | 1 h | |
| 18:30-21:00 | **S7 Real test set + numbers:** run 5 real clips (different people/lengths) through the Meta path. Record per clip: wall seconds, Meta cost, words captioned/total, face-safe check, pass/fail. Fill `RESULTS.md`. These are the only numbers the video and README may use. Judge each film blind against the previous best with a subagent; nothing under 8/10 goes in the demo | 2.5 h | |
| 21:00-22:00 | **S8 Production check:** deploy decision. CLAUDE.md says no server deploy unless Ishaan asks; the Meta path may need a deploy (about 10 min rebuild) to be "live in production". **Ishaan decides**: deploy with Spark enabled via server `.env` (`MOOVI_PROVIDER=meta`) or run the demo from localhost and say so. Verify `/studio` after (CLAUDE.md steps) | 1 h | |
| Nov 3 22:00 - Nov 4 05:00 | **Sleep / buffer.** Do not build at night | | |
| Nov 4 05:00-06:00 [14:30-15:30] | **S9 Demo script locked** (below), voice and music options to Ishaan (his taste) | 1 h | |
| 06:00-10:00 | **S10 Build the demo film** in code per his rules (1920x1080, live preview first, screen capture of the real product, one export only at the end after he says export). Includes the kill-switch shot and real clocks | 4 h | |
| 10:00-11:00 | **S11 README + repo cleanup** (below) | 1 h | |
| 11:00-12:30 | **S12 Writeup text + side-prize page** (below), Ishaan reads and edits | 1.5 h | |
| 12:30-14:00 | **S13 Export, watch the live preview in real time in a browser, final checks, upload the video** (YouTube unlisted or as the form asks) | 1.5 h | |
| 14:00-16:00 [23:30-01:30] | **S14 Submit** (Ishaan or Representative, in the portal). Fill the form from `SUBMISSION-TEXT.md`; check every field; submit; screenshot the confirmation. Target 16:00 ET | 2 h | |
| 16:00-21:00 | **Buffer only.** If submission is done, stop building (a change after submit is a risk). Fix only broken links | | |
| Nov 4 21:00 | **Deadline.** | | |
Total build about 16 h across 35 h; each slip eats buffer, not sleep. If S5 overruns, S6/S7 shrink first, never the demo.

## D. Demo video script (target 2:30-3:00 unless the form says shorter; cap at the stated limit)
Rules from RULES.md: judged on Impact 30 / Meta tooling 25 / Demo 25 / Tech 20. **The demo is the artifact judges watch. Use the exact words "Muse Spark" and "SAM 3.1" on screen where they run.** Real recordings, not cards. Author's English, plain words (use the `author-english` skill before writing the voice).
Shot list:
1. **0:00-0:10 hook (understood by second 3).** On screen: a founder's raw 40 s phone clip (rambling, silences) on the left; the finished vertical video on the right already playing with sound. Line: one sentence with the result and the clock, e.g. "This raw clip became this launch video in [measured] minutes, for [measured] cents, with Meta's models." (Fill with RESULTS.md numbers.) No logo-first intro, no "SaaS is dead" preamble.
2. **0:10-0:30 the pain:** one line, one number from a real source or our own (cost of an editor vs. ours; only if sourced).
3. **0:30-1:15 live run, real clocks:** drop the clip into the studio; the crew desks light up; a visible log line shows `muse-spark-1.3` calls; preview plays live. A timer is on screen throughout.
4. **1:15-1:50 SAM 3.1 moment:** the speaker is tracked; the caption goes behind their head; show the mask overlay for 2 s; say how long SAM took and what it cost per clip.
5. **1:50-2:10 kill switch:** remove the Meta key; Moovi stops with a clear message; put it back; it runs. (Shows load-bearing, not decorative.)
6. **2:10-2:35 proof it holds up:** the live URL, the five-clip results table (time, cost, pass), 713 commits/165 tests only if re-verified, the memory of taste in FalkorDB in one sentence, "built before the hackathon; during it we added the Meta models" stated plainly.
7. **2:35-2:50 ask/close:** who it is for, one line on what is next, the repo and the link.
First 10 seconds are the only part that must be perfect; if time is short, shorten the middle.

## E. The pitch (50 words, fill the numbers after S7)
"Founders can build a product in a weekend and still fail, because nobody sees it. Moovi is an AI video crew on Meta's Muse Spark and SAM 3.1 that turns one raw phone clip into a finished launch video in [X] minutes for [Y] cents. It remembers your taste. Here it is, live."

## F. Repo cleanup and README (S11, about 1 h; do not commit unless Ishaan says; the CLAUDE.md rule "sync each step to main" applies only on his word for this plan)
- README top: one-line wedge, the demo video link, live link, **"What existed before the hackathon / what we built for it"** table (honest: engine, crew, studio pre-existing; Meta provider, SAM cutout, tests, demo new), how to run in 3 commands, the Meta usage with file paths, measured results table, honest limits.
- Re-create or locate `AI_USAGE.md` (not at repo root now): list AI assistance (Claude Code etc.), per the Graph Hacks habit.
- Make sure no `.env`, keys, or `data/` are tracked; run a secrets scan (`git grep -nE "(sk-|gsk_|AIza|MODEL_API_KEY=.+)"`).
- Remove or hide noise from the first screen of the repo (the uncommitted `.claude/` scratch files and story docs are not part of a clean entry; check what `git status` shows; do not delete anything, just keep out of the submission commit).
- Licence file present; third-party media credits (CC0 sfx, CC-BY music bed) as CLAUDE.md "Open items" says; clause (c) of the Rules.
- **Status of the commit/branch (needs Ishaan):** `git status` showed 206 changed/untracked files from other sessions. The submission should point at a clean commit or tag, e.g. `meta-hack-submission`; create it only on his word.

## G. Writeup text (S12, `SUBMISSION-TEXT.md`; adapt to the real form fields from G2)
- Title and one-liner (the wedge). Problem (who, how much it hurts). What it does (3 bullets). **How we use Meta** (Spark = every crew decision; SAM 3.1 = per-frame speaker tracking; Voice/Image only if used; with endpoints and the measured numbers). Prior work disclosure. What is next. Team (all names). Links: demo video, live app, repo.
- Words must be Ishaan's voice in plain author's English; no hype.

## H. Side prizes: exact actions
- **Community vote / most viral (bonus up to $50k, announced about Nov 10):** (1) a 30-45 s vertical cut of the film for posting, made in S10 at no extra build cost; (2) a public page (the landing) with the film at the top and one-click "make yours"; (3) after submit, Ishaan decides whether to post it. (4) Ask in Discord how a vote works before spending effort. Never ask for votes in a way the rules do not allow.
- Others: read the Discord announcements for the real categories; target each only if cheap.

## I. Risks and fallbacks
| Risk | Likelihood | Fallback |
|---|---|---|
| Not accepted / cannot submit | unknown | G1 first; ask CV support now |
| Startup track needs a company | medium | G5; ask if a sole-founder entity or indie is allowed; both tracks have 5 places |
| Pre-existing project disallowed in practice | low-medium (text silent) | Disclose clearly; emphasise what is new (Meta layer); if Discord says no, we cannot fix it in a day: ask the question early so we know |
| Spark tool calls/JSON fail | medium | emulated tools + repair layer already in `runtime/http.ts`; use `muse-spark-1.2/1.1` or `muse-wonder-1.0` for the director tier |
| SAM output parsing eats the day | medium-high | cut-off 17:30; image-frame SAM + U2-Net, or SAM only on a still for the "unexpected capability" shot; honesty over a faked feature |
| Meta API latency/rate or credit run out ($150) | medium | cost is small (SAM $0.20/1000 frames; Spark $1.25/$4.25 per M tokens); cache results; do the 5-clip test once |
| 2 GB server too small | medium | demo from localhost with the live URL as proof it is up; say so honestly |
| Demo under 8/10 | medium | blind subagent judge each draft; one fix round; keep it short and real; real screen captures beat designed cards (Ishaan's rule) |
| Video limit shorter than 3:00 | unknown | cut to the first 10 s + steps 3-6 |
| Portal fails at the last hour | low | submit by 16:00 ET; screenshot; email CV support early with proof if it breaks |
| Claim we cannot prove (win, users, uptime) | high if careless | claims table: every number in the video has a line in RESULTS.md |

## J. Files this plan creates (all in `docs/agents/meta-hack/`)
BASELINE.md, FORM-FIELDS.md, RESULTS.md, SUBMISSION-TEXT.md, LOG.md (actual times). Code changes: `packages/engine/src/runtime/providers.ts`, `.env.example`, `docs/MODELS.md`, `src/edit/effects/cutout.ts` (+tests). Nothing is committed or deployed by this plan until Ishaan says.

## K. Submission checklist (tick before pressing submit)
- [ ] Accepted; waiver/rules accepted by Ishaan himself. - [ ] Track and Representative correct; all team members named. - [ ] Video uploaded, plays with sound, length within limit, first 10 s checked. - [ ] Repo public, README clean, no secrets, tag exists. - [ ] Live link returns 200 now. - [ ] Meta usage described with real endpoints; only measured numbers. - [ ] Prior work disclosed. - [ ] Third-party media credited. - [ ] Form copy read by Ishaan. - [ ] Submitted by 16:00 ET; confirmation screenshot saved.
