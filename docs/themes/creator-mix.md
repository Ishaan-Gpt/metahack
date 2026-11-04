# Creator Mix (template 2), version 2

Template 2 of the video editor: a combination of the effects of two reels (a creator studio edit and a real estate motion edit), now with a reusable effect library, a colour theme per video, colour-world backgrounds, whip transitions and a Before / After layout.

Run: `MODEL_API_KEY=... node engine/creator-mix.mjs raw.mp4 --out out.mp4 [--handle @you --cta1 "..." --cta2 "..."] [--no-ba]`

## What changed in version 2
- **Before / After layout (default, `--no-ba` turns it off).** The raw auto-cut (grey, smaller, behind) sits beside the finished edit (rounded card on top), chips "Before" and "After" above, and a permanent **EDITED BY META** line below (tools/ba-wrap.py, PIL + ffmpeg, no AI). The edit alone is also saved as `<out>.after.mp4`.
- **Reusable effect library.** Every effect has tags in `engine/templates/creator-mix.json` ("library"). For every slot the director scores all 23 effects against the words in that window (number, question, list, hero word, long phrase, chapter rhythm), prefers effects not used yet, never repeats one within 3 slots, and may reuse any effect later. Effects per video: about one per 3 seconds, **at least 8**, at most 16 (so a normal clip gets 8 to 12 and a long clip repeats the relevant ones).
- **One colour theme per video** (ember, ice, gold, violet, mint), picked by plain code from the picture's own background colour so the accent sits far from it on the colour wheel. Every effect, caption glow, flash and the end card use that one accent family.
- **Colour worlds.** On every second medium or tight shot the background behind the speaker is replaced by a moving two colour gradient with light blobs and a rim glow (person matte from engine/person_matte.py), like the colour switches in the reference reel.
- **Whip transitions** on every camera cut and every effect start (directional blur, zoom, accent flash), **light leak**, **film grain**, subtle **handheld drift**.
- **2 new effects:** 23 bokeh glow word, 24 highlighter phrase.

## Meta / Gemini
- Meta Model API (MODEL_API_KEY) is the required path. One transcription call and one plan call per video, both cached; re-runs cost nothing; the effects, themes and layouts are laid by code, so no extra calls.
- **Gemini free API as a backup:** only when there is NO MODEL_API_KEY and GEMINI_API_KEY is set, the same two calls run on Gemini (default model gemini-2.5-flash, `GEMINI_MODEL` to change, audio sent inline, JSON schema answer). Same cache, same usage log (marked provider: gemini). One wait-and-retry on a 429. `tools/gemini-standin.mjs` is a test stand-in, not Gemini.

Status: tested only with local stand-ins, never against the real Meta API or the real Gemini API. Reference frames were compared by eye on 1 fps and 3 fps sheets, not every frame.
