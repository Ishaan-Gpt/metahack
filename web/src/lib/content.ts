/**
 * Every word on the landing page, in story order. Moovi now edits your real take: raw talking-head video in, the cut a
 * hired short-form editor would make out, directed by Meta's Muse Spark. Numbers on this page are measured on real runs
 * (see docs/RESULTS.md); anything that looks like customer data is sample data and says so.
 */

export const nav = [
  { id: 'intro', label: 'Intro' },
  { id: 'crew', label: 'Crew' },
  { id: 'how', label: 'How' },
  { id: 'memory', label: 'Styles' },
  { id: 'hood', label: 'Muse' },
  { id: 'hire', label: 'Edit' },
] as const;

export const hero = {
  tagline: 'Raw take in. A pro editor’s cut out.',
  tab: 'The studio',
  hi: ['Hi.', 'I’m Moovi.'],
  job: 'I edit your takes.',
};

/** The box Moovi holds up in the hero: drop a take, pick a style or let Muse Spark pick, go to the studio. */
export const brief = {
  label: 'Your raw take',
  placeholder: 'Drop a talking-head video (5 to 75 seconds)',
  upload: 'Add your take',
  uploadVideo: 'Choose the video to edit',
  suggest: 'Try a sample take',
  send: 'Edit my take',
  pickLabel: 'How should it look?',
  presets: [
    { id: 'auto', title: 'Auto', line: 'Muse Spark watches and picks', need: 'Needs your video',
      placeholder: 'Anything Moovi should know (optional)',
      samples: ['Keep my voice, cut the pauses, make the numbers big.', 'Make it feel like a launch, not a lecture.'] },
    { id: 'style', title: 'A style', line: 'One of five pro editors', need: 'Needs your video',
      placeholder: 'Pick the style in the studio',
      samples: ['Studio Card, with my handle on top.', 'Clean UI, the take shrinks into cards.'] },
    { id: 'split', title: 'Before/after', line: 'Raw beside the edit', need: 'Needs your video',
      placeholder: 'Anything Moovi should know (optional)',
      samples: ['Show my raw take next to the edit for my post.'] },
  ],
  missing: { preset: 'Pick how it should look first.', edit: 'Moovi needs your video.', launch: 'Moovi needs your video.', showreel: 'Moovi needs your video.' },
} as const;

export const problem = {
  tool: 'any AI video generator',
  prompt: 'turn my talking-head clip into a viral reel',
  generate: 'Generate',
  generating: 'Generating…',
  file: 'stock_avatar_v3.mp4',
  captions: ['Unlock your potential', 'Game-changing tips', 'Follow for more!'],
  clock: '0:07 / 0:30',
  verdict: ['A stranger’s face.', 'Words you never said.', 'You post it, and hope.'],
  punch: ['He doesn’t generate.', 'He edits your take.'],
};

export const directed = {
  big: 'Directed by Muse*',
  aside: ['Your face, your voice.', 'A pro editor’s grammar.', 'Every frame drawn by code.'],
  foot: '* Meta’s Muse Spark, with Muse Voice Transcribe for the ears.',
  hover: 'Hover Moovi to say hi',
};

export type CrewId = 'editor' | 'researcher' | 'writer' | 'sound' | 'designer' | 'lens' | 'keeper';
export const crewIntro = ['He doesn’t edit alone.', 'meet the crew'];
/** The seven parts of the engine (engine/run.mjs). Kept in the character's crew order (ids drive Moovi's colours). */
export const crew: { id: CrewId; name: string; role: string; line: string }[] = [
  { id: 'editor', name: 'Editor', role: 'Your footage', line: 'Frames you for 9:16 around your face and cuts every dead pause, so the take moves at a scroller’s pace.' },
  { id: 'researcher', name: 'Ear', role: 'Muse Voice Transcribe', line: 'Hears every word you say and where you breathe, so the cut lands between your words, never on them.' },
  { id: 'writer', name: 'Director', role: 'Muse Spark', line: 'Reads the whole take once, picks the style, and gives every beat a layout and one hero word.' },
  { id: 'sound', name: 'Sound', role: 'Effects & bed', line: 'A whoosh or a pop on every change, a quiet bed under your voice, and the mix set to -14 LUFS for the feed.' },
  { id: 'designer', name: 'Designer', role: 'Look', line: 'Lays each beat out the way a pro editor would: a card, a split with a photo, a list, a word behind you.' },
  { id: 'lens', name: 'Lens', role: 'Critic', line: 'Checks every beat before it renders: no caption on your face, no layout twice in a row, a change every two seconds.' },
  { id: 'keeper', name: 'Cutout', role: 'You, separated', line: 'Lifts you off the background so the big word can sit behind your head and in front of the wall.' },
];

export const how = {
  heading: ['One take in,', 'a finished cut out.'],
  sample: 'A real run · a 22 s take',
  steps: [
    { n: '01', title: 'Drop', text: 'You drop a raw take from your phone. Landscape, square or vertical: Moovi frames it for 9:16 around your face.', tag: 'take.received' },
    { n: '02', title: 'Hear', text: 'Muse Voice Transcribe hears every word. Moovi times them and cuts the pauses, so a rambling take reads tight.', tag: 'words.timed' },
    { n: '03', title: 'Pick', text: 'Muse Spark reads the whole take and picks the style that fits what you said, and tells you why in one line.', tag: 'style.chosen' },
    { n: '04', title: 'Plan', text: 'One more Muse Spark call gives every beat a layout and a hero word. The rules check each one before it is used.', tag: 'beats.planned' },
    { n: '05', title: 'Build', text: 'Photos for the nouns you can show, you cut out for the word that goes behind you, icons for the apps you name.', tag: 'looks.built' },
    { n: '06', title: 'Draw', text: 'Code draws every frame of the edit: no generated pixels, so your face and voice stay yours.', tag: 'frames.drawn' },
    { n: '07', title: 'Mix', text: 'Effects on every change, a quiet bed, loudness set for the feed.', tag: 'mix.-14lufs' },
    { n: '08', title: 'Share', text: 'You get the edit and a before/after, ready to post.', tag: 'ready' },
  ],
  done: 'edit.mp4 · 1080×1920 · ready',
};

/** Was the memory chapter; now the style library: five real editors' reels, measured frame by frame. */
export const memory = {
  heading: ['Five pro editors,', 'measured to the frame.'],
  body: 'Each style is one real editor’s before-and-after reel, rebuilt by measuring it frame by frame: where the words sit, how big, which colour, how fast things change. Pick one, or let Muse Spark pick for your take.',
  inputLabel: 'Pick a style',
  chips: ['Studio Card', 'Kinetic Brand', 'Creator Studio', 'Clean UI', 'Desk Doc'],
  why: 'Why this style?',
};

export const styles = {
  lead: 'One director,',
  options: [
    { id: 'explainer', word: 'studio cards', title: 'Studio Card', text: 'Your take framed in a clean studio card, a storyboard beside it, one lime serif word per line.', specs: ['Card frame, storyboard', 'Splits with photos', 'Post card with a tap'] },
    { id: 'launch', word: 'brand ads', title: 'Kinetic Brand', text: 'One static take turned into a brand ad: huge words behind you, white, gold and one red.', specs: ['Full frame, deep blacks', 'Words behind you', 'Hits and risers'] },
    { id: 'kinetic', word: 'clean UI', title: 'Clean UI', text: 'Apple-clean cards act out every claim; your take shrinks into a card and comes back.', specs: ['White interface cards', 'Wide words, post taps', 'Clean clicks'] },
    { id: 'edit', word: 'documentaries', title: 'Desk Doc', text: 'A warm documentary: photos that prove the point, numbers made big, yellow glowing words.', specs: ['Warm sunlit grade', 'Photo splits, lists', 'A soft bed'] },
  ],
};

export const paper = {
  heading: ['Under the hood,', 'for the curious.'],
  title: 'Moovi-M: one Muse Spark plan, a deterministic editor',
  abstract: 'Most AI video tools ask a model for pixels. Moovi asks Meta’s Muse Spark for decisions and draws every pixel with code. Muse Voice Transcribe gives the words; one Muse Spark call picks the style, a second plans every beat (layout, hero word, photo searches, transition) under a strict JSON schema; a rule director checks each item and renders the edit frame by frame from the style’s measured template. Two to three model calls per video, cached by the audio’s hash: an edit costs cents and the same take always gives the same cut.',
  columns: [
    { h: 'Meta models', items: ['Muse Voice Transcribe: words and turns', 'Muse Spark 1.3: the style, in one call', 'Muse Spark 1.3: every beat, json_schema', 'No key, no edit: Meta is load-bearing'] },
    { h: 'Engine', items: ['Rule director with 9 layouts', 'Coverage and pacing checks', 'Canvas renderer, ffmpeg in and out', 'Effects, bed, -14 LUFS mix'] },
    { h: 'Styles', items: ['5 real editors’ reels, measured', 'Fonts matched by x-height', 'Colours sampled from frames', 'Timing read per frame at 30 fps'] },
  ],
  cypher: `POST /v1/chat/completions
{ "model": "muse-spark-1.3",
  "response_format": { "type": "json_schema",
    "json_schema": { "name": "card_studio_plan" } } }`,
  soon: 'Code: github.com/Ishaan-Gpt/metahack',
};

export const finale = {
  statement: ['You bring the take.', 'Moovi brings the cut.'],
  cta: 'Edit my take',
  waitlist: { label: 'Tell me when the app is out', placeholder: 'you@yourbrand.com', done: 'You’re on the list. Moovi will wave when it’s your turn.' },
  legal: 'Moovi was built before this hackathon as an AI video director; the Muse-directed editing engine and this studio were built for the Meta Global AI Developer Hackathon.',
};
