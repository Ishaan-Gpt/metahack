# Edit Easy for the Meta hackathon: the winning plan

> Update, 5 Nov: the product is now called **Edit Easy** (it grew out of Moovi, built before the hackathon). The five
> styles and the auto style pick below were replaced by two render engines, Card Studio and Creator Mix, given to uploads
> in a shuffled turn, and editing by prompt after the render through a keyword edit dictionary (docs/EDIT-API.md).
> The rows below are the plan as it stood on 4 Nov.

Written 2026-11-04, 23:30 IST. Deadline **Thu 5 Nov 06:30 IST** (Wed 4 Nov 9:00 PM ET). Our hand-off target: **01:30 IST**.
Sources: hackathon/RULES.md (official rules, quoted), the public event page (re-read today), usevyra.com, the repo.

## 1. The bet in one line
**Raw take in, a pro editor's cut out.** A creator drops the talking-head clip they already shot; Meta's Muse models
make the editor's decisions; Edit Easy's engine draws every frame. Their real face and voice, edited like the best
short-form editors on Instagram, in minutes.

Why this wins against the field: most entries will be chatbots or agents that *generate*. Ours *edits real footage*,
shows the before beside the after in one second (the demo sells itself), and uses Muse where judgment is needed and
plain code everywhere else, which is the "beyond a basic integration" the 25% Meta criterion asks for.

## 2. Built to the judging (weights from the official rules)
| Criterion | Weight | How we score it |
|---|---|---|
| Impact | 30% | A real, paid job (editors cost money and days) made instant for creators, coaches, founders. "Build for Your World" theme. A product people use, live at a link. |
| Use of Meta AI tooling | 25% | Muse Voice Transcribe hears the take; Muse Spark **picks the style and says why** (auto mode); Muse Spark **plans every beat** under a strict JSON schema; code validates each beat. Two to three calls per edit, cached by the audio hash. **Kill switch:** no Meta key → the studio says so and stops (Meta is load-bearing, not decoration). |
| Demo | 25% | Live studio at a public link; 2:30 demo video: hook = raw beside finished edit in the first 3 s; real clocks; the Muse Spark pick with its one-line why; five styles from one take; the kill switch. |
| Technical depth | 20% | Five styles **measured frame by frame** from five real editors' reels (fonts by x-height, sampled colours, timing at 30 fps); rule director with 9 layouts + coverage and pacing checks; canvas renderer + ffmpeg; person cut-out for text-behind; -14 LUFS mix; job queue, resumable jobs, graceful errors. |

## 3. Our USPs (what the page, the demo and the form all say)
1. **Edits your real take.** Not an avatar, not stock: your face, your voice.
2. **Five pro editors' styles, measured to the frame** (Card Studio, Kinetic Brand, Creator Studio, Clean UI, Desk Doc), or **Auto**: Muse Spark watches and picks, and tells you why.
3. **One Muse plan, a deterministic editor.** Muse decides, code draws: cents per edit, the same take always gives the same cut, no generated pixels.
4. **A before/after with every edit**, ready to post.
5. **Honest and robust:** every failure is one sentence with the action next to it; prior work disclosed.

## 4. Deliverables and status (updated 5 Nov, 04:10 IST)
| Deliverable | Where | Status |
|---|---|---|
| Landing page as Edit Easy (brand, mascot, Muse at the centre, two engines, edit by asking) | `web/` → `/` | **Done.** The hero's 3D jelly word still spells the old name, so it is hidden |
| Studio: footage and samples, preview, chat, timeline | `web/` → `/studio` | **Done**, checked in the browser |
| Prompt editing after the render: keyword dictionary, fuzzy spelling, text fixes, no model call | `engine/edits.mjs`, `/api/jobs/<id>/edit` | **Done**; real re-renders in 127 to 214 s |
| Captions Easy in the studio: caption tab, word timeline (edit, drag, stretch, key word, split, join, zoom, undo) | `web/src/components/studio/` | **Done**; one word edit applied and re-rendered from the UI |
| Captions Easy library: 157 looks (16 premium), 49 animations, source files | `library/captions-easy/` | **Done**, stored for reuse (not used in renders yet) |
| Two engines, taken in turn per upload (Card Studio, Creator Mix v3 by Vignesh) | `engine/run.mjs`, `engine/styles/` | **Done**; both re-rendered with the merged runner |
| Show vs download (Card Studio Zoom, Creator Mix Before/After + Zoom) | `engine/run.mjs`, file route | **Done** (Vignesh), runs after prompt edits too |
| /styles: both engines, then the five reference recreations + our own edit, live beside their raw takes | `/styles` | **Done**; all six players load |
| Backend API (upload, queue, status, byte-range files, retry, samples, health, edit) | `web/src/app/api`, `web/src/lib/server/jobs.ts` | **Done**; error paths tested |
| Meta layer (Transcribe, Spark plan, cache, usage log; Gemini/local backup) | `engine/meta.mjs`, `engine/muse.mjs` | Built; **untested against real Meta: no key yet** |
| Public link | Cloudflare tunnel from this PC | **Live** (the PC must stay on through judging) |
| Always-on deploy on the EC2 box | `deploy/` | Prepared; **waits for your OK to write to that server** |
| README, form fields, demo script, bonus kit, AI usage | `README.md`, `docs/SUBMISSION.md`, `docs/DEMO-SCRIPT.md`, `docs/BONUS-KIT.md`, `AI_USAGE.md` | Updated to Edit Easy; SUBMISSION still has 4 placeholders: tokens and cost per edit (need the key), your full name, the video URL |
| Measured results | `docs/RESULTS.md` | Card Studio full runs and prompt-edit re-renders measured; Creator Mix's first full run not clean (see RESULTS) |
| Demo video | `data/demo/demo.mp4` is an old 72 s draft (old name, five styles) | **Not done**: needs a new cut and your narration call |
| Submission in the Cerebral Valley portal | | **Not done**: yours, before 06:30 IST |

Roughly: the product is about 90% done, the submission package about 50% (no Meta key, no final demo video, 4 form
placeholders, not submitted).

## 5. Bonus prizes we can reach
The rules name **community vote** and **most viral**, plus "other notable" categories (announced about Nov 10).
- A 40 s vertical before/after post (raw small on the left, edit large on the right), three captions (X, LinkedIn,
  Instagram) and a one-paragraph vote ask: `docs/BONUS-KIT.md`. **You approve and post; nothing is posted by us.**
- Every studio edit already makes a shareable before/after, so every user becomes a post (the viral loop).

## 6. The rest of the night (IST, from 04:10)
| When | What | Who |
|---|---|---|
| now | Add `MODEL_API_KEY` if you have it → I run one live edit and fill tokens and cost per edit | you, then me |
| 04:15 - 05:15 | Demo video: record the live studio (upload, cut, prompt edits, word timeline, /styles), cut to DEMO-SCRIPT, a live preview for you | me (your narration call) |
| 05:15 - 05:40 | Fill SUBMISSION.md, final checks, commit | me, you approve |
| 05:40 - 06:30 | **You submit** in the Cerebral Valley portal; buffer | you |

## 7. Risks and what only you can do
1. **Meta key** (biggest): without it the 25% criterion is unproven. Add `MODEL_API_KEY` to `.env.local`.
2. **Track:** startup track needs a Representative who is "an active employee of the startup". Indie fits if not.
3. **Your full name** on the CV account, and the team list (you + Vignesh B S) in the form.
4. **Speed:** a 22 s take took ~19 min on a crowded CPU; we cut the matte cost in half and switched to a faster encoder; we re-time on a quiet CPU before quoting a number.
5. **The PC must stay on and awake** for the public link; the tunnel URL changes if it restarts (we'd update the form).
6. **Licences:** the sample take is CC BY-SA 4.0 (credited); music CC BY (credited); SFX CC0. Submission grants Meta/CV a perpetual licence: only put in what you own or may licence.
