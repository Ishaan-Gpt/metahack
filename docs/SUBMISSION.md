# Submission: every field, drafted

For Ishaan to read, edit and paste into the Cerebral Valley form (https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit).
Deadline: **Wed 4 Nov 2026, 9:00 PM ET (Thu 5 Nov 06:30 IST)**. Nothing here has been submitted.
Placeholders in `[[...]]` wait for measured numbers (docs/RESULTS.md) or links. Do not paste a field that still holds one.

## Project name
**Edit Easy**

## Tagline (60 characters at most)
Options, with their length; the first is the pick, because it says the whole product in the creator's own terms.
1. `Drop a raw take, get back a pro editor's cut.` (45)
2. `Your raw take, edited the way a pro editor would.` (49)
3. `The short-form editor you don't have to hire.` (45)

## Short description (280 characters at most)
> Edit Easy edits your raw talking-head take the way a hired short-form editor would. Meta's Muse Voice Transcribe hears it, Muse Spark plans every beat, one of two engines draws every frame in code, and you change the cut by asking in plain words.

(246 characters.)

## Long description (about 250 words)
> Anyone who talks to a camera for a living knows the choice: post the flat take and watch people scroll past it, or pay an editor and wait days for the cut. AI video tools offer a third way out, but what they hand back is a stranger's face saying words you never said.
>
> Edit Easy edits the take you already have. You drop a raw phone clip into the studio, and Meta's Muse Voice Transcribe hears every word, so Edit Easy can frame you for 9:16 around your face and cut the dead pauses between your words. Muse Spark then reads the whole take once and plans every beat under a strict JSON schema: which of nine layouts it gets, which word is the hero, what photo to search for and how it cuts to the next one. Plain code checks each beat before using it, and one of two engines draws every frame: Studio Card, which frames you in a clean card beside a storyboard, or Creator Mix, which lays twenty-two effects from two real reels over your take. Uploads take the engines in a shuffled turn, so your videos do not all wear the same look.
>
> Once the cut is rendered you change it by asking, "bigger captions, zoom out a little, no music", and those words are matched against a dictionary of edits instead of being sent to a model, so a change costs next to nothing and only the picture and the sound are drawn again. An edit takes two Meta calls, cached by the audio's hash, so the same take always gives the same cut and a retry costs nothing. Take the Meta key away and the studio says so and stops, because without Muse Spark there is nobody to direct.
>
> On one CPU-only Windows PC, a 22-second take became a finished 1080x1920 Studio Card edit plus a before/after in 5 minutes 14 seconds on a quiet CPU through the live studio (docs/RESULTS.md).

(About 270 words before the results line.)

## Track
**Startup** (as applied). Open question for Ishaan: the startup track asks for a Representative who is "an active employee of the startup" (hackathon/RULES.md item 3).

## Theme / problem statement
**Build for Your World.** Creators, coaches and founders who explain things on camera every day, and who either can't afford an editor or can't wait for one.

## Meta models used, and how
- **Muse Voice Transcribe** (`muse-voice-transcribe-1.0`, `/v1/asr/transcribe`): hears the take. It returns turn-level times, so Edit Easy spreads each turn's words over its voiced frames by syllable weight, then cuts the pauses between words. `engine/meta.mjs` (`metaTranscribe`, `wordsFromTurns`), called from `engine/prep.mjs`.
- **Muse Spark** (`muse-spark-1.3`, `/v1/chat/completions`, strict `json_schema` named `card_studio_plan`): one call plans every beat of the edit: layout, hero word, icons, photo searches, the backdrop for text-behind, the transition. Code validates every beat on its own, so a bad answer costs one beat and never triggers a second call. Both engines, Studio Card and Creator Mix, draw from this one plan. `engine/meta.mjs` (`metaPlan`, `planSchema`, `validateItem`), called from `engine/card-studio.mjs`.
- **After the render, no model at all:** edits asked for in plain words are matched by a keyword dictionary (`engine/edits.mjs`, docs/EDIT-API.md) and only the picture and sound are redrawn; switching a take to the other engine costs one more plan call and reuses the cached transcription.
- **Why this goes beyond a basic integration:** the model makes the few decisions that need judgment and nothing else, under a schema the code can check, and a deterministic engine does everything that can be measured. That keeps an edit to two calls ([[TOKENS_PER_EDIT]] tokens, [[COST_PER_EDIT]]) and every later change to none, makes it repeatable (cached by the audio's sha256), and keeps the creator's real face and voice in every frame.
- **Load-bearing:** with no `MODEL_API_KEY`, `/api/health` reports `meta: "missing"`, the studio header reads "Meta key missing", and a job stops before any work with `NO_META_KEY`. Every call, cache hit, its seconds and tokens are logged per edit (`meta-usage.json`) and listed in the studio.
- **Next, not in this build:** SAM 3.1 for the person cut-out and speaker tracking (today a local U-2-Net matte).

## What's new vs. pre-existing
> Edit Easy grew out of Moovi, an AI video director built before this hackathon for Graph Hacks (WeMakeDevs x FalkorDB, October 2026, github.com/Ishaan-Gpt/moovi). This repo started empty on 3 November. Carried over: Moovi's edit taste and some of its code as source to port (players, captions, the sound engine, in `import/moovi/`), the MotionEasy canvas renderer by the same author, and the landing page's design and character. Built during the hackathon: the whole Meta layer (Muse Voice Transcribe and the Muse Spark beat plan, schemas, checks, caching, usage log), the job runner with real clocks and readable errors, the face-aware prep and pause cut, the two engines, Studio Card and Creator Mix, with their renderer (Vignesh B S), editing by prompt with its edit dictionary, and the studio with its API. The README has the full table with file paths.

## Team
- **Ishaan** [[FULL_NAME as on the CV account]] (Representative): Edit Easy (and Moovi before it), the job runner, editing by prompt, the studio.
- **Vignesh B S**: both engines, Studio Card (template 1) and Creator Mix (template 2), and the Card Studio director (the Meta transcribe and plan calls, rule director, nine edit types, MP4 renderer, text-behind).

## Links
- Live demo: https://configuring-educated-heads-relations.trycloudflare.com (studio at https://configuring-educated-heads-relations.trycloudflare.com/studio; a tunnel to the build machine, so check it is up before pasting)
- Demo video: [[VIDEO_URL]]
- Repo: https://github.com/Ishaan-Gpt/metahack ([[REPO_URL]] if a submission tag is made)

## Challenges we ran into
> Meta's transcriber gives the time of each speech turn but not of each word, and captions that fire on the wrong syllable look cheap, so we placed every word inside its turn by weighting syllables over the frames where the voice is actually on. We also had no Meta key on the build machine for most of the build, so we wrote a small stand-in that answers in Meta's exact request and response shapes, which let us build the caching, the schema checks and the error paths before the real calls, and every run through it is marked as a test so it can never pass for Meta's work. Matching real editors meant measuring their reels frame by frame (fonts by x-height, colours sampled from the frames, timing read at 30 fps) instead of describing them, and the cut-out behind the big word costs about five seconds a frame on our 8-core CPU, so the engine mattes only the frames where a word sits behind the speaker, at 15 frames a second, and caches it for both engines. Letting people change a finished cut by asking without paying for a model each time meant writing the edits down as a dictionary of words and ops, so a request is matched in code and only the picture and the sound are drawn again.


## What we learned
> A model is at its best when it is asked for decisions rather than pixels: one Muse Spark call with a strict schema can direct a whole edit, and the parts of editing that can be measured are better done by code that never drifts.

## What's next
> SAM 3.1 takes over the cut-out and tracks the speaker through the take, so a word can sit behind someone who moves and a landscape take can follow its speaker instead of cropping around the first face. After that come longer takes, a brand kit that carries your colours and handle into both engines, more engines built from more editors' reels, and the richer devices from our 1:1 recreations (the 3D desk world, the eroding type) moving into the studio.

## Third-party media in the submission (Rules clause (c))
- Sample take: Iliana for Wikitongues, CC BY-SA 4.0 (share-alike: an edit of it is a derivative and keeps the licence and credit).
- Music: "Funkorama" by Kevin MacLeod (incompetech.com), CC BY 4.0. SFX: CC0 (freesound.org creators, Kenney) and MIT.
- The reference reels are other creators' work: named and linked as the source of each engine, never shown in the submission unless Ishaan decides otherwise.
