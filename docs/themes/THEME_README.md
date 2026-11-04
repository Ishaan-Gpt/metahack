# Card Studio theme (branch theme-card-studio)

A second theme for the metahack editor, modelled on the @edita.visuals reel (light studio background, the talking head in a
rounded card, badge, storyboard card, two line CTA, lime serif hero captions, keyword graphic cards, split B-roll, bullet
lists, big-text post card, jump zooms). The full breakdown of the reference is in `docs/themes/card-studio.md`.

## One command (raw face video in, MP4 out)
```bash
node engine/card-studio.mjs path/to/raw.mp4 --out out.mp4 --badge "Meta AI" --handle "@me" --kw GUIDE
#   prep (1080x1920, face-aware crop, word timings, pauses cut) -> rules director -> stock fetch (cached) -> render -> MP4
#   optional: --cta1 'Follow & comment "{KW}"' --cta2 'for the full guide' --no-stock --no-music --dir data/clips/name
```
Deterministic: the same input and flags give the same edit. There is no random choice anywhere; stock pictures are cached
per search word under `data/stock/`, so a re-run reuses exactly the same pictures (a first run with an empty cache depends
on what the free picture sites return that day). No AI call in the default path; the theme never calls Meta.

## Step by step (same result)
```bash
npm install                       # adds @napi-rs/canvas (the MP4 renderer draws with it; no browser needed)
pip install faster-whisper opencv-python-headless   # free local speech-to-text and face boxes (CPU)
node engine/prep.mjs path/to/raw.mp4 data/clips/my-clip            # 1080x1920 (landscape is cropped around the face), words, pauses cut
node engine/edit.mjs data/clips/my-clip --theme card-studio --badge "Meta AI" --handle "@me" --kw GUIDE
#   --theme auto picks card-studio for a talking head shot in any shape other than 9:16, else kinetic-brand
#   optional: --cta1 'Follow & comment "{KW}"' --cta2 'for the full guide' --no-stock
node tools/render-card.mjs data/clips/my-clip out.mp4               # MP4, 1080x1920, 30 fps, AAC, about -14 LUFS (add --no-music)
node serve.mjs 4700   # live preview: http://127.0.0.1:4700/player/card-studio.html?clip=data/clips/my-clip
```
Speed on a 16 core box: draw 12 to 13 ms a frame; an 18.6 s clip renders in about 40 s, a 36.5 s clip in about 74 s.

## Env keys (all optional)
- `PIXABAY_API_KEY`: free Pixabay key (pixabay.com/api/docs). Used first for stock photos (and videos, downloaded and cached; the renderer uses photos today).
- No key: stock comes from Openverse (no key) and then Wikimedia Commons (no key). Licence and credit are saved per picture in `data/stock/<query>/meta.json` and listed in `spec.card.json` under `credits`.
- `GROQ_API_KEY`: if set, word timings come from Groq Whisper as before. If not set, prep runs local faster-whisper (`small`, CPU, int8; `WHISPER_MODEL` to change). Free.
- `MODEL_API_KEY` (Meta): not used by this theme. Card Studio makes zero model calls.

## What is code and what is AI
- Code (plain rules): sentence splitting, caption chunks and hero words, which shot goes where (face, graphic, split, list, big text), zoom levels, transitions, budgets, stock search words (with a small fixed table that turns brand words like "Instagram" into picturable searches), all drawing, SFX placement, audio mix and loudness.
- Local models, free, no credits: faster-whisper for word timings when there is no Groq key; YuNet (OpenCV's 230 KB face detector, `assets/vision`) for face boxes.
- Paid or credit-based AI: none. The theme never calls Meta, Groq or any other API except the free stock picture searches.

## Files
- `engine/templates/card-studio.json` theme values (layout, palette, fonts, motion, rules, SFX)
- `engine/card-studio.mjs` the rule director -> `spec.card.json`
- `player/card-studio.js` drawing module (shared by the browser preview and the MP4 renderer), `player/card-studio.html` preview
- `tools/render-card.mjs` MP4 export (ffmpeg decode -> canvas -> ffmpeg encode, SFX, music bed, two pass loudnorm)
- `engine/stock.mjs` Pixabay / Openverse / Wikimedia Commons provider with disk cache and credits
- `engine/hear_local.py` free word timings; `engine/faces.py` face boxes; `engine/prep.mjs` (no key fallback, face aware crop); `engine/edit.mjs` (`--theme`)

## Edit types (all rules, all in `player/card-studio.js`)
face card with jump zoom (1.0 / 1.16 at sentence ends, slow 4% push), graphic card (wash in, wipe out), split (picture top,
face bottom, caption on the seam, picture changes on spoken nouns), orbit (face shrinks to a small landscape card, platform
icons orbit, the line as a black title), top square (face square on top, caption on the pale lower half), bullet list (lime
dots), post card (face, words as spoken, pink button, cursor tap), wide card (card widens over the storyboard, face left, big
black serif italic words right), two style captions, storyboard card, badge, handle, CTA, starburst background, whoosh/pop/click SFX.

## Known gaps
- Video B-roll playback (photos only for now; Pixabay videos are fetched and cached but not drawn yet). Platform icons are simple drawn glyphs, not the real logos.
- Openverse pictures are often weak for brand words; a Pixabay key gives much better stock.
- Sentence rules work best with punctuation in the transcript (Groq gives it; local Whisper usually does).
