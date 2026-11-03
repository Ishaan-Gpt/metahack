# Muse models, and how to aim for #1 in the indie track (2026-11-03)

Source for the models: https://dev.meta.ai/docs/models and https://dev.meta.ai/docs/muse-glimmer/ (read today). Prices: https://dev.meta.ai/docs/pricing-rate-limits.

## Every Meta model, and what it is good for in Moovi
| Model (id) | What it is | Takes in -> gives | Price | Use in Moovi |
|---|---|---|---|---|
| **Muse Wonder** `muse-wonder-1.0` (preview) | Strongest; long agentic work, computer use, reasoning up to "max" | text, image, **video, audio**, PDF -> text; 1M context | $4 in / $20 out per M tokens | The Director only (one planning call per film), if Spark's plans are weak |
| **Muse Spark 1.3** `muse-spark-1.3` ("recommended for new work") | Agent + coding model, tools, structured output, web search grounding | text, image, **video, audio**, PDF -> text; 1M context | $1.25 / $4.25 per M | **The whole crew.** And the new trick: it can **watch the raw clip itself** (video in), so the Editor picks moments from what is on screen, not only the transcript |
| Muse Spark 1.3 Contributor `-contributor` | Same, cheaper, no "max" reasoning; **Meta may train on your content** | same | $0.10 / $0.20 per M | Avoid for users' clips (Ishaan's call) |
| **Muse Spark 1.2** `muse-spark-1.2` | Previous version; **Meta recommends it for audio input** (1.3 audio "not fully supported") | same | $1.25 / $4.25 | Listening to the clip: tone, laughs, emphasis, the best line |
| Muse Spark 1.1 | Original | same | same | none |
| **Muse Image** `muse-image-1.0` | Image generation **and editing**; agentic (can search the web, run code) | text, image -> image | $0.01 an image | Thumbnail from a real frame of the clip; insert pictures when the library has none (note Ishaan's "films 100% in code" rule is for his own films; this is the product's user-facing output, his call) |
| **Muse Voice Transcribe** `muse-voice-transcribe-1.0` | Speech to text, live or file, **speaker diarization**, keyword biasing, 25 languages, **turn-level timestamps only (no word-level)** | audio (WAV, 10 min max) -> text | $0.18 an hour | Who speaks when (multi-speaker clips), and the transcript. **Cannot time word-by-word captions**: keep the local/Whisper word timing for captions |
| **SAM 3.1** `sam-3.1` | Segments anything named by a short noun phrase, or by boxes/points; **tracks objects across video** (up to 16) | text prompt + image/video -> boxes + masks | $0.20 per 1,000 video frames (min 50) | Track the speaker: text behind the person, captions never on the face, **auto-reframe 16:9 to 9:16 following the person**, blur/replace background, stickers that follow a hand or product |
| **Muse Spark Open** (open weights, 816B MoE, 42B active) | Self-host or hosted provider; fine-tunable | text, image, video, audio -> text | your GPU bill | Skip (too big for a day) |
| **Muse Glimmer** (open weights, 30B dense, Apache 2.0) | Local agent model distilled from Spark; Ollama, llama.cpp, vLLM, Fireworks, Together | text, image -> text | free locally | **"Runs offline" story:** Moovi's fast tier (small calls) on Glimmer via Ollama; Moovi already supports Ollama. Only if it runs on Ishaan's PC in time |
| **Muse Code** | Meta's coding agent on the same models | | subscription | Could be used to build the Meta adapters; say so honestly if used |

## Indie track: how judges score it
- Same four weights as the startup track (CONFIRMED, RULES.md): Impact 30, Use of Meta AI tooling 25, Demo 25, Technical depth 20. The indie blurb adds the flavour: **"creativity, technical ambition, and whether it works."**
- Indie prizes: 1st $150,000, 2nd $100,000, 3rd $75,000, 4th $50,000, 5th $25,000. Teams of up to 4.
- **Blocking question first:** the Rules say "A participant may apply for one (1) track only, and a project submission may be entered in one (1) track only." Ishaan applied to the **startup** track. **Whether he can switch to indie is UNKNOWN: ask Cerebral Valley / Discord today.** Do not plan the submission as indie until they say yes.

## The plan for #1 (honest: #1 is a long shot among thousands; this is how to give it the best chance)
1. **One "how did it do that?" moment no other entry has**, built from Meta capabilities that only exist together here. Recommendation: **Moovi watches your footage like an editor does.** Spark 1.3 gets the raw video (not only words) and picks the moments; SAM 3.1 finds and tracks you, so the vertical frame follows you and the captions sit behind your head and never on your face; Voice diarization tells who is speaking so a two-person clip cuts to the speaker. Every one of those is a Meta model doing something visible on screen. That covers "creative use", "beyond a basic integration" and "unexpected capabilities" (25%).
2. **It works, live, in front of the judge** (Demo 25% + "whether it works"): a link where a judge drops their own clip and gets a playable film. Our live studio already answers (HTTP 200 today). The demo shows a real clip, a real clock and the finished film with sound.
3. **Impact in one human line** (30%): a specific person who now ships videos they could not make before. One real user with a before/after beats any market slide. Ishaan: is there one (a friend, a client, Vignesh)?
4. **Technical ambition you can see** (20%): a crew of agents, each on a named Meta model, with the graph memory of taste; show the crew's live desks and the model names in the log for 5 seconds, not a diagram.
5. **The first 10 seconds:** the raw clip, then the finished vertical film playing with sound, then one line: what went in, what came out, how long. Nothing before it.
6. **Simple, nailed:** three Meta pieces done perfectly (Spark watching, SAM tracking + reframe, Spark/1.2 or Voice hearing) beat six done badly. Muse Image and Glimmer are extras only if the core is finished by Nov 4 morning ET.
7. **Disclose** what existed before and what was built during the event (prior-work rule is unknown; disclosure is the safe path).

## Changes to PLAN.md if the track becomes indie
- Same hour-by-hour plan; swap step S6 (Voice) for "Spark watches the clip" (send the clip as `input_video`/file to `muse-spark-1.3` and ask for the best moments as structured output), and add "SAM auto-reframe to 9:16" into S5 (the masks give the person's box per frame; crop follows it with smoothing).
- The pitch drops "startup / production" words and leads with the wow moment and the person it helps.

## Cost of one of Ishaan's Shorts on Muse (measured tokens, priced at Meta's list prices)
Measured from the Claude Code transcript of 'The Stillest Man Alive' (48 s Short, commit a2fb763, session cd2aeb24, window 2026-11-03 01:00-02:23 IST): 130 model calls, 63.7M cached-input tokens read, 0.47M written to cache, 153k output tokens (all Claude Opus 5.5).
| Same tokens on | With caching (like Claude Code gets) | If Meta caching does not hit (worst case) |
|---|---|---|
| Muse Spark 1.3 Standard ($1.25 in, $0.15 cached, $4.25 out per M) | about $11 | about $81 |
| Muse Wonder ($4 in, $0.20 cached, $20 out) | about $18 | about $260 |
| Muse Spark Contributor ($0.10 / $0.002 / $0.20; Meta trains on your content) | about $0.20 | about $7 |
Cache-write price on Meta is not published; counted as normal input. Voice is NOT included: Meta has no text-to-speech (Voice Transcribe is speech-to-text only), so the voice stays on Fish. Whether the $150 credits cover Muse Code use is UNKNOWN (Muse Code has its own plans). Quality on Muse is UNMEASURED: run the same brief with the same skills and judge both blind before claiming anything.
