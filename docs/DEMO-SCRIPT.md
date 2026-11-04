# Demo video: 2:30 script and shot list

**What the video is, in one line:** a judge watches one real take become a finished edit in the real studio, sees Muse Spark
make the choices, and sees the product stop when Meta is taken away.
Scored on Impact 30, Use of Meta AI tooling 25, Demo 25 (incl. this video), Technical depth 20 (hackathon/RULES.md).

Rules for the cut:
- Every picture is the real product: screen captures of `/studio`, the real outputs, the real logs. No cards standing in for the work.
- The clocks are real. If a wait is compressed, the picture says so ("4x") and the on-screen clock keeps counting real seconds.
- On-screen words never sit on a face: labels go beside or below the take.
- Placeholders `[[...]]` are filled only from docs/RESULTS.md or the recorded run itself. If a number is missing, cut the line, never guess.
- One export, at the end, after Ishaan has watched the live preview and said export.

## Decisions for Ishaan (defaults, with the alternative)

| Choice | Default | Alternative | Why the default |
|---|---|---|---|
| The take in the hook and the live run | Ishaan's own raw phone take, 20-30 s | The studio's sample (Iliana for Wikitongues, CC BY-SA 4.0, credited on screen) | His own take proves "your take", and he owns it outright; the sample's share-alike licence would carry over to the video |
| Voice | Ishaan reads the narration in one calm continuous take | No voice: on-screen lines only, over the bed | A founder's voice carries the Impact story; a text-only demo reads like a feature list |
| Music | "Funkorama" (Kevin MacLeod, CC BY 4.0, `assets/music/bed.mp3`, listed in `assets/CREDITS.md`) under the hook and close only, silent under the live run | The bed throughout, ducked | Silence under the live run lets the studio's own effects be heard |
| Size | 1920x1080, the vertical edits shown in-frame | 1080x1920 | Judges watch on a laptop; the vertical cut is in BONUS-KIT.md |

## Shot list

Timings are targets for a calm read of about 2.5-3 words a second, with room for the product's own sound.

| # | Time | Picture | On-screen text | Narration |
|---|---|---|---|---|
| 1 | 0:00-0:06 | **Frame 1 already shows both:** the raw take small on the left, flat and pausing; the finished edit large on the right, playing with sound (the studio's own `before-after.mp4`). | Under the raw: `raw take` · Under the edit: `Moovi's edit · made in [[RUN_SECONDS]] s` | N1 |
| 2 | 0:06-0:18 | The raw take alone, full height, its longest dead pause left in. A cut to a generic AI-avatar reel (our own mock from the landing page's "problem" chapter, not a real product's output). | `post the flat take` → `or wait days for an editor` | N2 |
| 3 | 0:18-0:45 | Screen capture of `/studio`: the header pill reads "Muse Spark is live"; the take is dropped in; Auto is selected; "Edit my take" pressed. The stage list runs with its own per-stage seconds; the "watch" stage's events appear ("Muse Voice Transcribe heard every word", "[[WORDS]] words; pauses cut, [[RAW_S]] s to [[CUT_S]] s"). A real wall clock sits in the corner. | Corner: real clock `0:00` counting · If compressed: `4x` | N3 |
| 4 | 0:45-1:13 | Close-up of the studio: the line "Muse Spark chose [[STYLE]]: [[WHY]]" appears under the stages. Then the panel "Meta model calls for this edit" with `muse-voice-transcribe-1.0`, `muse-spark-1.3` (style), `muse-spark-1.3` (plan), each with its seconds and tokens. A 4 s cut to the plan JSON on disk (`meta/` cache): one beat's `layout`, `hero`, `stock`, `transition` highlighted. | `muse-spark-1.3 · json_schema: card_studio_plan` | N4 |
| 5 | 1:13-1:35 | The render stage counting frames, then the done screen: "Your cut is ready. [[EDIT_S]] s, made in [[RUN_SECONDS]] s." The edit plays 6 s full height with sound, then the before/after. | none (the studio's own words are on screen) | N5 |
| 6 | 1:35-1:52 | The same take in all five styles, side by side, playing in sync. Under each: the style's name and the editor it was measured from. | `Studio Card · Edita Visuals` `Kinetic Brand · Hossein` `Creator Studio · Tahrima` `Clean UI · Daniel` `Desk Doc · Mahdi` | N6 |
| 7 | 1:52-2:07 | **Kill switch**, one continuous capture: `MODEL_API_KEY` blanked in `.env.local`, the server restarted, the studio's header pill now reads "Meta key missing". A take is dropped in; the studio shows "That edit stopped." with "The studio is missing its Meta Model API key, so Muse Spark cannot direct." "Details for us" opens on `NO_META_KEY`. The key goes back; the pill reads "Muse Spark is live" again. | `no Meta key → no edit` | N7 |
| 8 | 2:07-2:17 | The results table from docs/RESULTS.md, rows highlighted one by one: take, length, seconds per stage, total seconds, Meta calls, tokens, cost, pass. | `[[N_TAKES]] takes · median [[MEDIAN_SECONDS]] s · [[COST_PER_EDIT]] per edit` | N8 |
| 9 | 2:17-2:30 | The landing page hero, then the before/after once more as the last picture. | `Before the hackathon: Moovi, an AI video director.` `Built during it: the Muse-directed editor, five styles, this studio.` · End: `[[LIVE_URL]] · github.com/Ishaan-Gpt/metahack` | N9 |

## Narration (author's English; read straight through without stopping)

**N1 (0:00)**
That's a raw phone take on the left, and on the right is the edit Moovi made from it in [[RUN_SECONDS]] seconds.

**N2 (0:06)**
If you talk to a camera for a living, you either post the flat take and watch people scroll past it, or pay an editor and
wait days for the cut, and the AI tools that promise a shortcut hand you back a stranger's face.

**N3 (0:18)**
So I open the studio, drop in my take and leave the style on Auto, and from here on the clock in the corner is the real one.
Meta's Muse Voice Transcribe hears every word first, which is how Moovi knows exactly where my pauses are and cuts every one
of them out.

**N4 (0:45)**
Then Muse Spark reads the whole take once and picks a style for it, and it tells me why in one plain line, right there under
the stages. A second call plans every beat of the edit, which layout it gets, which word is the hero and what photo to look
for, all inside a strict schema that the code checks beat by beat, so a bad answer costs one beat and never the whole video.

**N5 (1:13)**
From there it's all code, drawing every frame, laying a whoosh on each change and setting the sound for the feed, which is
why the face and the voice in the finished cut are still mine.

**N6 (1:35)**
Every style comes from a real editor's before-and-after reel that we measured frame by frame, down to where the words sit and
how fast things change, so the same take comes back five different ways and each one looks like somebody's paid work.

**N7 (1:52)**
Meta is doing the real work here, and you can see it the moment I take the key out, because the studio says so right at the
top and the next edit stops before it starts, with a plain message instead of a quiet fake.

**N8 (2:07)**
We ran [[N_TAKES]] different takes through it, and every number on this table comes from those runs.

**N9 (2:17)**
Moovi was an AI video director before this hackathon, and over these two days it learned to edit the take you already have,
so now you bring the take and Moovi brings the cut.

Word count: about 340 words over 150 seconds, with the product's own sound in the gaps.

## Recording checklist

- Rehearse the kill switch once before recording: `/api/health` must return `meta: "missing"` after the key is blanked and
  the server restarted, and the job must end on `NO_META_KEY` (the check runs right after the file check, before any work).
- Record the live run on a take the cache has never seen, so the Meta calls in shot 4 show seconds and tokens, not "cached".
- Keep the `meta-usage.json` and `status.json` of the recorded run beside the video; they are the proof for every number on screen.
- Credits at the end or in the description: music "Funkorama" by Kevin MacLeod (incompetech.com), CC BY 4.0; sample take
  (if used) Iliana for Wikitongues, CC BY-SA 4.0.
- Before export: watch the live preview in real time in a browser, with sound, start to end.
