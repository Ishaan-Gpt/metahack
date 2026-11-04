# Muse model map

**Plain statement, read first.** This project runs on ordinary API keys used minimally, because Meta Model API credits are low
(a free Gemini key as the backup, local faster-whisper for hearing, plain code for every frame). Every Muse model below
is written into the code with its own on/off switch, and every one that costs credits is **OFF by default: "OFF: credit limit"**.
Nothing here claims Muse is running when it is not: `node engine/muse.mjs` prints the live table, and each job prints it at
its start (`log.txt`) and records which provider answered (`status.json`, `meta-usage.json`).

| Model | Job in this pipeline | Switch | Status today | Free fallback when off |
|---|---|---|---|---|
| Muse Spark 1.3 (`muse-spark-1.3`) | Director: style pick + one plan call per video (strict JSON schema) | `MODEL_API_KEY` | built; waiting for a key | free Gemini API, then plain rules |
| Muse Voice Transcribe (`muse-voice-transcribe-1.0`) | Hears the take (words + turns) | `MODEL_API_KEY` | built; waiting for a key | local faster-whisper |
| Muse Wonder (`muse-wonder-1.0`) | Plan critic, flags beats that contradict the transcript | `MUSE_WONDER=on` | function written (`museCritique`), **OFF: credit limit**, not hooked into a job yet | plain validators |
| Muse Image (`muse-image`, $0.01/image) | Makes the picture for a noun when stock search finds nothing | `MUSE_IMAGE=on` | hooked into `engine/stock.mjs`, **OFF: credit limit** | Openverse / Wikimedia Commons |
| SAM 3.1 (`sam-3-1`) | Cut the speaker out and track them | `MUSE_SAM=on` | function written (`museSam`), mask-to-matte step not written yet, **OFF: credit limit** | local u2net matte |
| Muse Glimmer (open weights, 30B, Apache 2.0) | Local director through any OpenAI-compatible server | `MUSE_LOCAL=glimmer` + `MUSE_LOCAL_BASE` + `MUSE_LOCAL_MODEL` | hooked into `engine/meta.mjs`, **OFF: credit limit** (needs a GPU) | Meta API, Gemini or rules |
| Muse Spark Open (open weights) | Same slot as Glimmer | `MUSE_LOCAL=sparkopen` | hooked, **OFF: credit limit** | same |
| Muse Code | Development tool, not a runtime dependency | n/a | not used at runtime | n/a |

## What has and has not been tested
- The local-director switch was run end to end against a **local test stand-in** (`tools/meta-standin.mjs`), not against a real Glimmer or Spark Open server.
- Spark and Voice Transcribe wire code was run only against that stand-in; no real Meta key has been used yet.
- Muse Image, SAM 3.1 and Wonder request shapes are **UNVERIFIED** against Meta's live API (the model pages give model ids and prices, not the request bodies); each function says so in its comment. Check Meta's API docs before turning one on.
- The cheaper `muse-spark-1.3-contributor` tier is available through `SPARK_MODEL=muse-spark-1.3-contributor`; Meta says it may use those calls to improve its products.
