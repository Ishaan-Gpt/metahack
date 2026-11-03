// The whole engine for one clip: prep (once) → read → direct → cast → spec.json for the player.
// usage: node engine/edit.mjs <clip dir> [--dialect kinetic-brand] [--brand "Name"] [--no-model]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, ROOT } from './env.mjs';
import { readClip } from './read.mjs';
import { askSpark, cast } from './direct.mjs';

loadEnv();
const args = process.argv.slice(2), dir = args[0];
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
if (!dir || !existsSync(join(dir, 'words.json'))) { console.error('usage: node engine/edit.mjs <clip dir> (run engine/prep.mjs first)'); process.exit(1); }
const dialectId = opt('--dialect') ?? 'kinetic-brand';
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
