# Templates

There are exactly two templates, and `engine/styles.mjs` (`TEMPLATES`) is the single list that says so:

1. **Card Studio** (`card-studio`): the take framed in a clean studio card with a storyboard and lime serif hero words. Engine: `engine/card-studio.mjs`.
2. **Creator Mix** (`creator-mix`): two reels in one. Colour-world backgrounds, whip, zoom, negative, tilt and shatter cuts, number posters, photo strips, and a Before/After with a visible "Edited by Meta" line. Engine: `engine/creator-mix.mjs`, docs in `docs/themes/creator-mix.md`.

Choose one in `job.json` (`"style": "card-studio"` or `"style": "creator-mix"`); `auto` means Card Studio. Each template uses the same two model calls per video (hearing, plan), cached, so a re-run costs nothing. Earlier looks (Clean UI, Creator Studio, Desk Doc, Kinetic Brand) were removed from the code on 5 Nov 2026.
