---
name: edit-style-source
description: "The Edit type's taste and style come only from the Edit mastery session's latest player and specs, never the old pipeline"
metadata:
  node_type: memory
  type: feedback
  originSessionId: f27323cd-3290-438c-a352-98175f45292e
  modified: 2026-10-18T03:39:16.137Z
---

For the "Edit my video" type, the style and taste (looks, fonts, colours, caption, devices, world, sound, grade, picks) come
ONLY from the Edit mastery session's latest work (docs/agents/mastery/edit-player/player.html and its specs, edit.md,
ishaan-motion edit-fundamentals §12–13). Nothing from the old pipeline (page.ts caption styles, palettes, D2.2 looks,
castEdl camera/sfx), Tab's or Claude 1's rules, or a session's own guesses carries over.

**Why:** 2026-10-18 the edit-library wiring session re-implemented a few of Edit mastery's devices inside the old edit page
with its own fonts, ground, captions and keyword picks; Ishaan said it was "completely fucked up" and did not look like
Edit mastery's v10–v13.

**How to apply:** before wiring or shipping anything for the Edit type, open Edit mastery's latest player and spec, ask that
session, and compare your output side by side with its latest playable version before pushing. Port, do not re-invent.
Related: [[session-brief-rules]]
