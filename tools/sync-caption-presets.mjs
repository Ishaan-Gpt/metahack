// Copies engine/caption-presets.json into web/src/lib/caption-presets.ts and engine/word-ops.mjs into web/src/lib/word-ops.ts
// (the web app cannot import files outside web/).
// Run after editing the presets: node tools/sync-caption-presets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const p = JSON.parse(readFileSync(new URL('engine/caption-presets.json', root), 'utf8'));
writeFileSync(new URL('web/src/lib/caption-presets.ts', root), `/** Caption presets for the caption editor: a generated copy of engine/caption-presets.json (the engine reads that
 *  file; the web app cannot import it because Turbopack resolves from web/). Do not edit here: edit the JSON, then run
 *  node tools/sync-caption-presets.mjs */
export type CaptionPreset = {
  label: string;
  line: string;
  /** the Captions Easy look it was ported from */
  from: string;
  overrides: {
    fonts?: { hero?: { family: string; file: string; style: string } };
    palette?: { hero?: string; heroStroke?: string; small?: string; glowRgb?: string };
    caption?: { heroFont?: string; heroWeight?: number; heroUpper?: boolean; heroGlow?: number };
    layout?: { caption?: { heroSize?: number; smallSize?: number; yFrac?: number; lineGap?: number } };
  };
};

export const CAPTION_PRESETS: Record<string, CaptionPreset> = ${JSON.stringify(p, null, 2)};
`);
console.log(`synced ${Object.keys(p).length} caption presets`);

// the word-level caption ops: one source (engine/word-ops.mjs) for the engine and the studio's timeline
const ops = readFileSync(new URL('engine/word-ops.mjs', root), 'utf8');
writeFileSync(new URL('web/src/lib/word-ops.ts', root), `// @ts-nocheck
/* A generated copy of engine/word-ops.mjs, so the studio previews a word edit exactly as the engine will apply it.
   Do not edit here: edit engine/word-ops.mjs, then run node tools/sync-caption-presets.mjs */
${ops}`);
console.log('synced word ops');
