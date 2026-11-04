// Edit styles: each style is Card Studio's template (engine/templates/card-studio.json) plus the overrides in
// engine/styles/<id>.json, measured from one real "before -> after" reel (refs/, docs/recreate/). The renderer and the
// rule director read the merged template, so a style changes the look, the frame, the type, the colour of the hero word,
// the grade, the transitions' colour and which edit layouts the director may use. "auto" is not a style: Muse Spark picks
// one of these per video (engine/run.mjs).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const BASE = join(ROOT, 'engine/templates/card-studio.json');
const DIR = join(ROOT, 'engine/styles');
export const DEFAULT_STYLE = 'card-studio';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}

/** the merged template for a style id; unknown ids throw so a job fails loudly, not silently in the wrong look */
export function loadStyle(id = DEFAULT_STYLE) {
  const base = JSON.parse(readFileSync(BASE, 'utf8'));
  const f = join(DIR, `${id}.json`);
  if (!existsSync(f)) throw new Error(`unknown style "${id}" (have: ${listStyles().map(s => s.id).join(', ')})`);
  const o = JSON.parse(readFileSync(f, 'utf8'));
  return { ...merge(base, o), name: id };
}

/** the catalogue the studio shows and Muse Spark chooses from: id, label, one line, the reference it was measured from,
 *  and the fundamentals (what the style does), in the order the studio lists them */
export function listStyles() {
  return readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => {
    const s = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    return { id: f.replace(/\.json$/, ''), label: s.label, line: s.line, ref: s.ref, fundamentals: s.fundamentals, order: s.order ?? 99, swatch: s.swatch, engine: s.engine ?? 'card-studio', auto: s.auto !== false };
  }).sort((a, b) => a.order - b.order);
}
