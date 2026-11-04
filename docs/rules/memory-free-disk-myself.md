---
name: free-disk-myself
description: "When the disk is low, find and clear stale space myself (old installers, superseded film drafts, stale session worktrees) instead of asking Ishaan"
metadata:
  node_type: memory
  type: feedback
  originSessionId: bbd05921-3df7-4da6-b797-fd59ff07ef9d
  modified: 2026-11-03T02:33:00.419Z
---

When C: is too full (the speed gate needs 10 GB), never ask Ishaan to free space. Check it myself: the app's storage report (ccd_host get_storage_usage, clean_up_worktrees for inactive sessions), then the biggest files in Downloads, Temp and the film `out/` folders, and clear the stale ones: old installers, superseded drafts of a finished film (keep the final), stale session worktrees.

**Why:** Ishaan, 2026-11-03: "u should not ask me to free instead yourself check claude sessions its memory usage and then free big files from stale sessions or upload stuff".

**How to apply:** send files to the Recycle Bin (I may not permanently delete), list what went and how much, and tell him one click empties the bin. Never touch conversation history, the app's data folder, a final film or anything uncommitted. See [[deploy-check-studio-build]] for other gates.
