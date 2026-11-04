---
name: edit-taste-one-owner
description: "Only the Edit mastery session sets Moovi's edit taste; Tab is Claude Code bridge only; Claude 1 polices this"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e5436a00-ea27-48ab-a20d-83784bf561c2
  modified: 2026-10-18T04:13:14.911Z
---

Moovi's edit style (devices, forms, padding, looks, captions, motion graphics) comes only from the Edit mastery session and the pushed ishaan-motion skill. No other session sets it. Tab (Vignesh's agent) works only on the Claude Code MCP bridge. The product runs Edit mastery's player.html unchanged. Decision 17 in docs/agents/DECISIONS.md.

**Why:** On 2026-10-18 Ishaan found Tab had changed effects, cut padding and captions while making "live-run fixes" (reverted in 9c3eeee). The wiring session had shipped its own copy of older devices, and he rejected it.
**How to apply:** Before relaying or deploying, check that no non-Edit-mastery commit touches edit taste. Route problems other sessions see to Edit mastery as notes. See [[session-brief-rules]].
