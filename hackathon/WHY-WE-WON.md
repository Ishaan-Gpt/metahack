# Graph Hacks: what we submitted, and what to reuse (read 2026-11-03)

## Evidence check (honest)
- **No file in the repo, git log or docs records a Graph Hacks result.** I searched `docs/`, `hackathon/`, `README.md`, `docs/agents/*.md`, `docs/submission/` and every commit message for "won / winner / 1st / finalist / result". Nothing. The Graph Hacks blog draft (Vignesh, 18 Oct 12:16 IST, commit `0a33322`) says: "Graph Hacks results are not out yet (it ends tonight)".
- `AI_USAGE.md` is **not at the repo root** (the brief says to read it; `git log` mentions it in several commits, so it was moved or is on another branch). Not found on disk at `AI_USAGE.md` or `docs/AI_USAGE.md`.
- No session or doc is named "Hacktober/Hacktoberfest".
- So "Moovi won Graph Hacks" is **UNVERIFIED from the repo**. **Ishaan: paste the win proof (email, WeMakeDevs/Devpost result page, certificate) into `docs/agents/meta-hack/WIN-PROOF.md`.** Do not claim a win in the Meta submission until that proof is in hand; say "built for Graph Hacks (WeMakeDevs x FalkorDB)" only, unless he confirms the exact placement and track.

## What exactly was submitted (CONFIRMED from the repo)
Event: Graph Hacks: Context for AI Agents (WeMakeDevs x FalkorDB), 15-18 Oct 2026, deadline 18 Oct 11:59 PM IST. (`hackathon/graphhacks/README.md`)
- **Deliverables:** a Dev.to blog post and a 45-60 s demo video. The final blog is `docs/submission/blog-final.md` (commit `78c6ddf`, "final Dev.to blog with demo video embed + all blog images"). Video embedded: https://www.youtube.com/watch?v=9QYmooX4ffA
- **Live product:** https://moovi-three.vercel.app. **Code:** https://github.com/Ishaan-Gpt/moovi.
- **Tracks claimed:** Track 01 "Agents That Act on Connected Data" and Track 02 "Agent Memory and Coordination" (blog header). The blog was also a side prize ("Best blog post").
- **Title/pitch:** "Moovi: an AI video editor whose every choice is a node in FalkorDB". Line: "Every choice it makes is a node in a FalkorDB graph, with an edge back to the reason. So when you ask 'why did you cut there?', the answer is a Cypher query, not a guess."
- **Claims in the blog (check each is still true before reusing):** 713 commits in 68 hours; 248 named Cypher queries; one library graph, one graph per user, one per project; exactly three graph algorithms (`shortestPath`, `algo.SPpaths`, `algo.pageRank`); "If FalkorDB goes down, the job stops" ("Moovi's memory is offline"); crew of Moovi + seven specialists on a task board stored in the graph; first real edit "16.2 s from 19.0 s, 10 shots, 48 words captioned" after 29 s; 17 bugs told honestly.
- **Demo film (3:00 script, `docs/submission/demo/SCRIPT-FINAL.md`)**: hook on "Building a SaaS is dead in 2026... if you can't get it seen", wave, meet Moovi, live demo, "the graph is the core", **"Pull the plug" (stop FalkorDB, Moovi refuses)**, harness/BYOK, taste library (~950 assets), CTA "Built on FalkorDB". (Note: the Graph Hacks deliverable said 45-60 s; this 3:00 script may be a later cut. Which one was actually submitted is UNVERIFIED.)
- **Pre-existing work disclosure:** the Graph Hacks plan listed a "pre-existing library" note and "disclose AI assistance in the README" (PLAN.md lines ~25, 183). Repo rule: log AI use in `AI_USAGE.md`. Same habit applies now.

## What the judges rewarded
**Unknown: no judge feedback is in the repo.** The only evidence is what the team believed judges wanted, from `docs/submission/BLOG.md` (draft section 1): FalkorDB load-bearing ("must support a central part of the product"), show the path behind an answer, real experience, "the part where it broke", narrow title with a number, screenshots plus demo video. These came from the event page and past WeMakeDevs winners, not from our judges.

## What to reuse for Meta (these are working habits, not Graph Hacks facts)
1. **Make the sponsor's tech undeniably load-bearing and prove it with a kill-switch.** The "Pull the plug" beat ("Moovi stops, no silent fallback") is exactly how to answer "Use of Meta AI Tooling... went beyond a basic integration" (25%). Do the same with Muse Spark / SAM 3.1: show the step that cannot happen without them.
2. **Honest numbers and the broken-then-fixed story.** The 29 s live edit, 713 commits, 17 bugs. Keep measured numbers only (repo rule: performance claims are measured).
3. **One-sentence explainable pitch** ("the answer is a query, not a guess"). Needs a Meta equivalent.
4. **A live link a judge can click** (moovi-three.vercel.app, server on EC2 t3.small; see CLAUDE.md "Live deployment"). "Holds up in production" is the startup-track test. Confirm it is up before the video is shot.
5. **The graph/FalkorDB memory stays as the differentiator** (taste memory), but for Meta it is supporting, not the headline: Meta's scoring never mentions it.
6. **Do not reuse:** the "SaaS is dead / getting seen is 80%" hook unchanged (it is about distribution, not Meta models) and the 3:00 length if the form caps video shorter.
