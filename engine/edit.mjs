// The whole engine for one clip: prep (once) → read → direct → cast → spec.json for the player.
// usage: node engine/edit.mjs <clip dir> [--theme kinetic-brand|card-studio|auto] [--brand "Name"] [--no-model]
//   --theme card-studio (or auto when it fits) hands off to engine/card-studio.mjs: rules only, writes spec.card.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadEnv, ROOT } from './env.mjs';
import { readClip } from './read.mjs';
import { askSpark, cast } from './direct.mjs';

loadEnv();
const args = process.argv.slice(2), dir = args[0];
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
if (!dir || !existsSync(join(dir, 'words.json'))) { console.error('usage: node engine/edit.mjs <clip dir> (run engine/prep.mjs first)'); process.exit(1); }
let dialectId = opt('--theme') ?? opt('--dialect') ?? process.env.THEME ?? 'kinetic-brand';
if (dialectId === 'auto') dialectId = autoTheme(dir);
if (dialectId === 'card-studio') {
  const { direct } = await import('./card-studio.mjs');
  await direct(dir, { badge: opt('--badge') ?? opt('--brand') ?? undefined, handle: opt('--handle') ?? undefined, cta1: opt('--cta1') ?? undefined, cta2: opt('--cta2') ?? undefined, kw: opt('--kw') ?? undefined, noStock: args.includes('--no-stock') });
  console.log('render: node tools/render-card.mjs ' + dir + '   (or preview: /player/card-studio.html?clip=' + dir + ')');
  process.exit(0);
}
/** auto: Card Studio when the clip is a talking head (a face in most samples) recorded in any shape other than 9:16
 *  (a landscape or square source looks best framed in a card); otherwise the full-frame Kinetic Brand. Plain rules. */
function autoTheme(d) {
  try {
    const t = JSON.parse(readFileSync(join(ROOT, 'engine/templates/card-studio.json'), 'utf8')).auto;
    const prep = existsSync(join(d, 'prep.json')) ? JSON.parse(readFileSync(join(d, 'prep.json'), 'utf8')) : {};
    const facesPath = join(d, 'faces.cv.json');
    if (!existsSync(facesPath)) execFileSync(process.env.PYTHON ?? 'python3', [join(ROOT, 'engine/faces.py'), join(d, 'cut.mp4'), facesPath, '2'], { stdio: 'inherit' });
    const f = JSON.parse(readFileSync(facesPath, 'utf8'));
    const ratio = f.found / Math.max(1, f.n), not916 = prep.sourceAspect ? Math.abs(prep.sourceAspect - 9 / 16) > 0.02 : false;
    const pick = ratio >= t.minFaceRatio && (!t.whenSourceNot916 || not916) ? 'card-studio' : 'kinetic-brand';
    console.log(`auto theme: ${pick} (face in ${(ratio * 100).toFixed(0)}% of samples, source ${not916 ? 'not ' : ''}9:16)`);
    return pick;
  } catch (e) { console.warn('auto theme fell back to kinetic-brand:', e.message); return 'kinetic-brand'; }
}
const dialect = JSON.parse(readFileSync(join(ROOT, 'engine/templates', `${dialectId}.json`), 'utf8'));
const words = JSON.parse(readFileSync(join(dir, 'words.json'), 'utf8'));
const cut = JSON.parse(readFileSync(join(dir, 'cut.json'), 'utf8'));

const t0 = performance.now();
const reads = readClip(words);
const spark = args.includes('--no-model') ? null : await askSpark(reads, dialect);
const picks = cast(reads, dialect, spark);
const beats = reads.map((r, k) => ({
  i: r.i, t0: r.t0, t1: r.t1, text: r.text, words: r.words, role: r.role, hero: r.hero, chapter: r.chapter, list: r.list,
  template: picks[k].t, transition: picks[k].transition, by: picks[k].why,
}));
const spec = {
  version: 1, dialect: dialectId, clip: '', duration: cut.duration, brand: opt('--brand') ?? null,
  director: spark ? { model: spark.model, seconds: spark.seconds, usage: spark.usage } : { model: null, note: 'rules only (no MODEL_API_KEY or --no-model)' },
  beats,
};
writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
const count = beats.reduce((m, b) => (m[b.template] = (m[b.template] ?? 0) + 1, m), {});
console.log(`spec.json: ${beats.length} beats in ${((performance.now() - t0) / 1000).toFixed(2)} s, director ${spec.director.model ?? 'rules'}`);
console.log(count);
for (const b of beats) console.log(`${b.t0.toFixed(1).padStart(5)} ${b.template.padEnd(14)} ${b.transition.padEnd(11)} ${b.role.padEnd(9)} [${b.words[b.hero]?.w}] ${b.text}`);
