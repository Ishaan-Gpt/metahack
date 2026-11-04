// The live preview's template: <job>/clip/preview.json is the FULLY MERGED template T the renderer would use, so the
// browser draws frames with player/*.js without importing engine code. The merges copy the renderers exactly:
//   Card Studio  (tools/render-card.mjs): T = merge_(loadStyle(spec.style), spec.overrides)
//   Creator Mix  (tools/render-mix.mjs):  T = merge_(engine/templates/creator-mix.json, spec.overrides)
// Written by engine/run.mjs at the end of build (and after a regrade or a render) and by engine/edits.mjs after every edit.
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { loadStyle } from './styles.mjs';

const ROOT = join(import.meta.dirname, '..');
const isObj_ = v => v && typeof v === 'object' && !Array.isArray(v), merge_ = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b ?? {})) o[k] = isObj_(v) && isObj_(a?.[k]) ? merge_(a[k], v) : v; return o; };

export const specName = engine => engine === 'creator-mix' ? 'spec.mix.json' : 'spec.card.json';

/** the merged template for a spec, exactly as the engine's renderer builds it */
export function mergedTemplate(engine, spec) {
  if (engine === 'creator-mix') return merge_(JSON.parse(readFileSync(join(ROOT, 'engine/templates/creator-mix.json'), 'utf8')), spec.overrides);
  return merge_(loadStyle(spec.style), spec.overrides);
}

/** write <clip>/preview.json (atomic); returns the status.preview block */
export function writePreview(clipDir, engine, spec) {
  const name = specName(engine);
  spec = spec ?? JSON.parse(readFileSync(join(clipDir, name), 'utf8'));
  const f = join(clipDir, 'preview.json');
  writeFileSync(f + '.tmp', JSON.stringify(mergedTemplate(engine, spec)));
  renameSync(f + '.tmp', f);
  return { engine, spec: name, video: existsSync(join(clipDir, 'graded.mp4')) ? 'graded.mp4' : (spec.video ?? 'cut.mp4'), template: 'preview.json', edits: (spec.edits ?? []).length, t: new Date().toISOString() };
}
