---
name: session-brief-rules
description: "Every session brief Claude 1 writes for Moovi must carry Ishaan's 5 working rules and the speed rules"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e5436a00-ea27-48ab-a20d-83784bf561c2
  modified: 2026-10-17T19:45:41.794Z
---

Every new session brief for Moovi includes Ishaan's 5 rules (also in ~/.claude/CLAUDE.md and ishaan-motion 1.10.1):
1. Every correction he gives lands the same turn, unasked, in the style-specific reference and the common skills, with a VERSION bump.
2. No silent defaults: saved looks, kits and rules are references to beat, not to apply.
3. Moovi colour and type come only from the live site and logo (packages/brand), never AI defaults.
4. A storyboard is a frame plus a labelled side panel.
5. Moving work is shown as a playable preview with sound.
Plus speed (DECISIONS.md decision 16): 3–4 minutes per iteration, ask him bluntly "better or worse, what is off?", up to 20 references per round, no long self-judging.

**Why:** He scored the pipeline's saved looks 0/10 and was frustrated by 25+ minute silent judge rounds; taste must come from his answers and references.
**How to apply:** Paste these into every start_session brief; when a session drifts into long self-judging, stop its turn and redirect. See [[moovi-decisions]].
