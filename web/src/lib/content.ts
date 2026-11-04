/**
 * Every word on the landing page, in story order. Edit Easy edits your real take: raw talking-head video in, the cut a
 * hired short-form editor would make out, directed by Meta's Muse Spark. Numbers on this page are measured on real runs
 * (see docs/RESULTS.md); anything that looks like customer data is sample data and says so.
 */

export const nav = [
  { id: 'intro', label: 'Intro' },
  { id: 'crew', label: 'Crew' },
  { id: 'how', label: 'How' },
  { id: 'memory', label: 'Engines' },
  { id: 'hood', label: 'Muse' },
  { id: 'hire', label: 'Edit' },
] as const;

export const hero = {
  tagline: 'Raw take in. A pro editor’s cut out.',
  tab: 'The studio',
  hi: ['Hi.', 'I’m Edit Easy.'],
  job: 'I edit your takes.',
};

/** The box the mascot holds up in the hero: give your video, say what you want if you like, and the studio edits it. */
export const brief = {
  label: 'Your video',
  placeholder: 'Drop your video here, or click the arrow to choose it',
  note: 'Anything Edit Easy should know? (optional) e.g. no music, put @me on it',
  upload: 'Add your video',
  uploadVideo: 'Choose the video to edit',
  suggest: 'Try a sample take',
  send: 'Edit my video',
  missing: { edit: 'Edit Easy needs your video first.' },
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
  hover: 'Hover Edit Easy to say hi',
};

export type CrewId = 'editor' | 'researcher' | 'writer' | 'sound' | 'designer' | 'lens' | 'keeper';
export const crewIntro = ['He doesn’t edit alone.', 'meet the crew'];
/** The seven parts of the engine (engine/run.mjs). Kept in the character's crew order (ids drive the mascot's colours). */
export const crew: { id: CrewId; name: string; role: string; line: string }[] = [
  { id: 'editor', name: 'Editor', role: 'Your footage', line: 'Frames you for 9:16 around your face and cuts every dead pause, so the take moves at a scroller’s pace.' },
  { id: 'researcher', name: 'Ear', role: 'Muse Voice Transcribe', line: 'Hears every word you say and where you breathe, so the cut lands between your words, never on them.' },
  { id: 'writer', name: 'Director', role: 'Muse Spark', line: 'Reads the whole take once and gives every beat a layout, one hero word and the photo it needs.' },
  { id: 'sound', name: 'Sound', role: 'Effects & bed', line: 'A whoosh or a pop on every change, a quiet bed under your voice, and the mix set to -14 LUFS for the feed.' },
  { id: 'designer', name: 'Designer', role: 'Look', line: 'Lays each beat out the way a pro editor would: a card, a split with a photo, a list, a word behind you.' },
  { id: 'lens', name: 'Lens', role: 'Critic', line: 'Checks every beat before it renders: no caption on your face, no layout twice in a row, a change every two seconds.' },
  { id: 'keeper', name: 'Cutout', role: 'You, separated', line: 'Lifts you off the background so the big word can sit behind your head and in front of the wall.' },
];

export const how = {
  heading: ['One take in,', 'a finished cut out.'],
  sample: 'A real run · a 22 s take',
  steps: [
    { n: '01', title: 'Drop', text: 'You drop a raw take from your phone. Landscape, square or vertical: Edit Easy frames it for 9:16 around your face.', tag: 'take.received' },
    { n: '02', title: 'Hear', text: 'Muse Voice Transcribe hears every word. Edit Easy times them and cuts the pauses, so a rambling take reads tight.', tag: 'words.timed' },
    { n: '03', title: 'Pick', text: 'Your take goes to one of two engines, Card Studio or Creator Mix, taken in turn, so two uploads in a row never wear the same look.', tag: 'engine.chosen' },
    { n: '04', title: 'Plan', text: 'One more Muse Spark call gives every beat a layout and a hero word. The rules check each one before it is used.', tag: 'beats.planned' },
    { n: '05', title: 'Build', text: 'Photos for the nouns you can show, you cut out for the word that goes behind you, icons for the apps you name.', tag: 'looks.built' },
    { n: '06', title: 'Draw', text: 'Code draws every frame of the edit: no generated pixels, so your face and voice stay yours.', tag: 'frames.drawn' },
    { n: '07', title: 'Mix', text: 'Effects on every change, a quiet bed, loudness set for the feed.', tag: 'mix.-14lufs' },
    { n: '08', title: 'Tweak', text: 'You get the edit and a before/after, then ask for changes in plain words: bigger captions, a photo here, no music.', tag: 'ready' },
  ],
  done: 'edit.mp4 · 1080×1920 · ready',
};

/** Was the memory chapter; now the engine shelf: two render engines, each built from a real editor's template. */
export const memory = {
  heading: ['Two engines,', 'then your words.'],
  body: 'Each upload is cut by one of two engines, taken in turn: Card Studio frames you in a clean card, and Creator Mix picks eight to sixteen of its twenty-six effects for your words. Once it renders you change it by asking, and a small dictionary of edits turns your words into the change without another model call.',
  inputLabel: 'The two engines',
  chips: ['Card Studio', 'Creator Mix'],
  why: 'Why this engine?',
};

/** Four windows, matched to the mascot's four shapes (lib/script.ts → styles): the two engines, then two kinds of edit by prompt. */
export const styles = {
  lead: 'One director,',
  options: [
    { id: 'card', word: 'studio cards', title: 'Card Studio', text: 'Your take framed in a clean studio card with a storyboard beside it, and one lime serif word on every line.', specs: ['Card frame, storyboard', 'Splits with photos', 'Nine layouts'] },
    { id: 'mix', word: 'creator mixes', title: 'Creator Mix', text: 'Colour worlds behind you, whip and shatter cuts, number posters, and a Before/After with Edited by Meta.', specs: ['8 to 16 effects picked by your words', 'One colour theme per video', 'Before/After built in'] },
    { id: 'words', word: 'your words', title: 'Edit by asking', text: 'Say “bigger captions, zoom out” and the cut changes, matched by a dictionary of edits with no model call.', specs: ['Caption size, case and place', 'Zoom in or out', 'Fix a misheard word'] },
    { id: 'more', word: 'small fixes', title: 'Add and take away', text: 'Ask for a photo at twelve seconds, quieter music or a warmer grade, and only picture and sound are redrawn.', specs: ['Photos in or out', 'Music and effects', 'Your @handle and call to action'] },
  ],
};

export const paper = {
  heading: ['Under the hood,', 'for the curious.'],
  title: 'Edit Easy: one Muse Spark plan, a deterministic editor',
  abstract: 'Most AI video tools ask a model for pixels. Edit Easy asks Meta’s Muse Spark for decisions and draws every pixel with code. Muse Voice Transcribe gives the words and one Muse Spark call plans every beat (layout, hero word, photo searches, transition) under a strict JSON schema; a rule director checks each item, and one of two engines renders the edit frame by frame from its template. Two model calls per video, cached by the audio’s hash, so the same take always gives the same cut, and the changes you ask for afterwards are matched by a dictionary of edits and cost next to nothing.',
  columns: [
    { h: 'Meta models', items: ['Muse Voice Transcribe: words and turns', 'Muse Spark 1.3: every beat, json_schema', 'Prompt edits: no model call', 'No key, no edit: Meta is load-bearing'] },
    { h: 'Engine', items: ['Rule director with 9 layouts', 'Coverage and pacing checks', 'Canvas renderer, ffmpeg in and out', 'Effects, bed, -14 LUFS mix'] },
    { h: 'Engines', items: ['Card Studio: nine layouts', 'Creator Mix: 26 effects', 'Taken in turn per upload', 'Edits redraw picture and sound only'] },
  ],
  cypher: `POST /v1/chat/completions
{ "model": "muse-spark-1.3",
  "response_format": { "type": "json_schema",
    "json_schema": { "name": "card_studio_plan" } } }`,
  soon: 'Code: github.com/Ishaan-Gpt/metahack',
};

export const finale = {
  statement: ['You bring the take.', 'Edit Easy brings the cut.'],
  cta: 'Edit my take',
  waitlist: { label: 'Tell me when the app is out', placeholder: 'you@yourbrand.com', done: 'You’re on the list. Edit Easy will wave when it’s your turn.' },
  legal: 'Edit Easy grew out of Moovi, an AI video director built before this hackathon; the Muse-directed editing engine and this studio were built for the Meta Global AI Developer Hackathon.',
};
