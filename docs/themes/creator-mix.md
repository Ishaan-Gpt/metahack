# Creator Mix (template 2)

Template 2 of the video editor, a combination of the effects of two reels: a creator studio edit (glow hero word, colour field, chapter card, icon tiles, push-in, cutouts) and a real estate motion edit (defocus punch, curved caption, poster card, picture window, film strip, mosaic, stripe glitch, slice split, giant type, progress ring, TV wall, torn paper). 22 effects in a fixed order: hook, setup, proof, list, close.

Run: `MODEL_API_KEY=... node engine/creator-mix.mjs raw.mp4 --out out.mp4 [--handle @you --cta1 "..." --cta2 "..."]`

- Needs the Meta Model API key like Card Studio (no key, exit code 2). One transcription call and one plan call per video, both cached. The effects are laid over the plan's timeline by code rules, so no extra Meta calls.
- Real camera work: wide, medium and tight shots with a punch-in on every cut and a slow push; the words sit in one block, in the half opposite the face on tight shots.
- Photos: free stock by keyword (Openverse, then Wikimedia). Cutouts: the person matte from engine/person_matte.py (cached per clip).
- Short clips drop effects from the middle of the order (about 2.5 s per effect); nothing is invented.

Status: tested only with the local Meta stand-in, never against the real Meta API. Reference frames were compared by eye, not frame by frame. The end card handle and call to action are placeholders unless passed as flags.
