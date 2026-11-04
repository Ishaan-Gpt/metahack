# Moovi for the Meta hackathon: the winning plan

Written 2026-11-04, 23:30 IST. Deadline **Thu 5 Nov 06:30 IST** (Wed 4 Nov 9:00 PM ET). Our hand-off target: **01:30 IST**.
Sources: hackathon/RULES.md (official rules, quoted), the public event page (re-read today), usevyra.com, the repo.

## 1. The bet in one line
**Raw take in, a pro editor's cut out.** A creator drops the talking-head clip they already shot; Meta's Muse models
make the editor's decisions; Moovi's engine draws every frame. Their real face and voice, edited like the best
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
2. **Five pro editors' styles, measured to the frame** (Studio Card, Kinetic Brand, Creator Studio, Clean UI, Desk Doc), or **Auto**: Muse Spark watches and picks, and tells you why.
3. **One Muse plan, a deterministic editor.** Muse decides, code draws: cents per edit, the same take always gives the same cut, no generated pixels.
4. **A before/after with every edit**, ready to post.
5. **Honest and robust:** every failure is one sentence with the action next to it; prior work disclosed.

## 4. Deliverables and status
| Deliverable | Where | Status |
|---|---|---|
| Landing page, repositioned (Moovi's brand, Muse at the centre, Vyra-style story) | `web/` → `/` | Done, build passes, desktop + phone checked |
| Studio (Vyra-style editor: footage + styles, preview, Moovi chat, timeline) | `web/` → `/studio` | Done; full edit verified in the browser |
| Backend API (upload with progress, queue, status, files with byte ranges, retry in another style, sample, health) | `web/src/app/api`, `web/src/lib/server/jobs.ts` | Done; error paths tested |
| Engine: 5 styles + auto pick + job runner | `engine/styles/`, `engine/run.mjs`, `engine/meta.mjs` | Done; 2 styles verified, 3 rendering now |
| Meta layer (Transcribe, Spark style pick, Spark plan, cache, usage log) | `engine/meta.mjs` | Built; **untested against real Meta: no key yet** |
| Claude Sonnet as temporary director | `DIRECTOR=claude` | Built; needs `ANTHROPIC_API_KEY` |
| Public link | Cloudflare tunnel from this PC | Live (PC must stay on through judging) |
| README, form fields, demo script, bonus kit, AI usage | `README.md`, `docs/SUBMISSION.md`, `docs/DEMO-SCRIPT.md`, `docs/BONUS-KIT.md`, `AI_USAGE.md` | Drafted; numbers wait for RESULTS.md |
| Measured results | `docs/RESULTS.md` | Being written by the styles worker |
| Demo video | to make | Needs your voice or a narration decision |

## 5. Bonus prizes we can reach
The rules name **community vote** and **most viral**, plus "other notable" categories (announced about Nov 10).
- A 40 s vertical before/after post (raw small on the left, edit large on the right), three captions (X, LinkedIn,
  Instagram) and a one-paragraph vote ask: `docs/BONUS-KIT.md`. **You approve and post; nothing is posted by us.**
- Every studio edit already makes a shareable before/after, so every user becomes a post (the viral loop).

## 6. The rest of the night (IST)
| When | What | Who |
|---|---|---|
| now - 00:15 | Remaining 3 styles rendered and fixed; timings into RESULTS.md; rebuild + restart the live server | me + styles worker |
| as soon as it's in | **Muse key → smoke test → one live edit**; swap the docs' test wording for real numbers | you add the key, I run it |
| 00:15 - 01:00 | Demo video: live studio recording + outputs, cut to the script, a live preview for you | me (your voice/narration call) |
| 01:00 - 01:30 | Fill SUBMISSION.md placeholders, final checks, commit (on your word) | me, you approve |
| 01:30 - 06:30 | **You submit** in the Cerebral Valley portal; buffer for anything that breaks | you |

## 7. Risks and what only you can do
1. **Meta key** (biggest): without it the 25% criterion is unproven. Add `MODEL_API_KEY` to `.env.local`.
2. **Track:** startup track needs a Representative who is "an active employee of the startup". Indie fits if not.
3. **Your full name** on the CV account, and the team list (you + Vignesh B S) in the form.
4. **Speed:** a 22 s take took ~19 min on a crowded CPU; we cut the matte cost in half and switched to a faster encoder; we re-time on a quiet CPU before quoting a number.
5. **The PC must stay on and awake** for the public link; the tunnel URL changes if it restarts (we'd update the form).
6. **Licences:** the sample take is CC BY-SA 4.0 (credited); music CC BY (credited); SFX CC0. Submission grants Meta/CV a perpetual licence: only put in what you own or may licence.
