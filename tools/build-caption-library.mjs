#!/usr/bin/env node
/**
 * Builds library/captions-easy/ from the CaptionsEasy repo (read only):
 *   src/...           the look, motion and template files, copied as-is at their repo-relative paths,
 *                     plus whatever they import from caption-engine / shared / templates (import graph)
 *   catalog.json      one entry per look (id, name, premium, fonts, colours, background, in/out/emphasis/letter motion, source file)
 *   animations.json   one entry per animation (entrances, exits, spoken-word effects, letter animators, word entries,
 *                     springs, Moovi premium entrances)
 *
 * Usage: node tools/build-caption-library.mjs [captionsEasyDir]
 *   source root: argv[2] || env CAPTIONS_EASY_DIR || C:/Ishaan GPT/hackthons/CaptionsEasy
 *
 * Look data is read by running the source repo's own registry through the source repo's own tsx (no new
 * dependencies here). If tsx is missing there, it falls back to reading the copied TS text with regexes;
 * any field it cannot read is null. Re-runnable: the output folder is rebuilt from scratch every time.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SRC = path.resolve(process.argv[2] || process.env.CAPTIONS_EASY_DIR || "C:/Ishaan GPT/hackthons/CaptionsEasy");
const OUT = path.join(REPO, "library", "captions-easy");
const OUT_SRC = path.join(OUT, "src");
const rel = (abs) => path.relative(SRC, abs).split(path.sep).join("/");
const libPath = (abs) => "src/" + rel(abs);

if (!fs.existsSync(path.join(SRC, "packages", "templates", "src", "registry.ts"))) {
  console.error(`CaptionsEasy not found at ${SRC} (pass the path as the first argument or set CAPTIONS_EASY_DIR)`);
  process.exit(1);
}

// ---------------------------------------------------------------- 1. copy the import graph
const TPL = path.join(SRC, "packages", "templates", "src");
const ENTRIES = [
  "registry.ts", "motion.ts", "controls.ts", "types.ts", "templates.tsx", "fonts.ts", "fontCatalog.ts", "text.ts",
  "looks/new.ts", "looks/numbers.ts", "looks/legacy.generated.json", "looks/capabilities.generated.json", "pack/index.ts",
].map((f) => path.join(TPL, f));

// workspace packages by name (packages/*/package.json), so "@capseasy/shared" and "@motion-ai/caption-engine/core" resolve
const WORKSPACE = new Map();
for (const d of fs.readdirSync(path.join(SRC, "packages"))) {
  const pj = path.join(SRC, "packages", d, "package.json");
  if (!fs.existsSync(pj)) continue;
  const p = JSON.parse(fs.readFileSync(pj, "utf8"));
  WORKSPACE.set(p.name, { dir: path.join(SRC, "packages", d), pkg: p });
}

const EXTS = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", ".json", "/index.ts", "/index.tsx", "/index.js"];
const MAX_JSON = 512 * 1024;
const MEDIA = /\.(mp4|mov|webm|mp3|wav|m4a|aac|ogg|png|jpe?g|webp|gif|avif|svg|ttf|otf|woff2?|eot)$/i;
function tryFile(base) {
  for (const e of EXTS) {
    const f = base + e;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
function resolveSpec(spec, fromFile) {
  if (spec.startsWith(".")) return tryFile(path.resolve(path.dirname(fromFile), spec));
  // longest workspace package name that prefixes the spec
  for (const [name, { dir, pkg }] of [...WORKSPACE].sort((a, b) => b[0].length - a[0].length)) {
    if (spec !== name && !spec.startsWith(name + "/")) continue;
    const sub = spec === name ? "." : "./" + spec.slice(name.length + 1);
    const exp = pkg.exports;
    let target = typeof exp === "object" && exp && !Array.isArray(exp) && typeof exp[sub] === "string" ? exp[sub] : null;
    if (!target && sub === ".") target = (typeof exp === "string" && exp) || pkg.main || "src/index.ts";
    if (!target) target = "src/" + sub.slice(2);
    return tryFile(path.resolve(dir, target));
  }
  return null; // npm package (react, remotion, zod, ...): not copied
}
const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const copied = new Set();
const skipped = [];
const external = new Set();
const queue = [...ENTRIES];
while (queue.length) {
  const f = queue.shift();
  if (!f || copied.has(f)) continue;
  const r = rel(f);
  if (/node_modules|[\\/](dist|\.next|\.turbo)[\\/]|\.env/.test(r) || MEDIA.test(f)) { skipped.push(r + " (media/build/env)"); continue; }
  if (/\.json$/.test(f) && fs.statSync(f).size > MAX_JSON) { skipped.push(r + " (json over 512 KB)"); continue; }
  copied.add(f);
  if (!/\.(ts|tsx|mts|js|mjs)$/.test(f)) continue;
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1] || m[2];
    if (MEDIA.test(spec)) { skipped.push(`${spec} (media, imported by ${r})`); continue; }
    const res = resolveSpec(spec, f);
    if (res) queue.push(res);
    else if (!spec.startsWith(".")) external.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
    else skipped.push(`${spec} (unresolved, imported by ${r})`);
  }
}
fs.rmSync(OUT_SRC, { recursive: true, force: true });
for (const f of [...copied].sort()) {
  const dest = path.join(OUT_SRC, rel(f));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f, dest);
}
const copiedRel = [...copied].map(rel).sort();

// ---------------------------------------------------------------- 2. read the looks
const srcText = new Map(copiedRel.map((r) => [r, fs.readFileSync(path.join(SRC, r), "utf8")]));

/** the copied file that defines a look id (a literal `id: "x"`, or a template-literal id prefix like `moovi_caption_${...}`) */
function sourceOf(id) {
  const lit = new RegExp(`\\bid:\\s*["'\`]${id}["'\`]`);
  for (const [r, t] of srcText) if (/\.(ts|tsx)$/.test(r) && !/registry\.ts$/.test(r) && lit.test(t)) return "src/" + r;
  // helper-built looks: look("id", ...)
  const call = new RegExp(`\\b\\w+\\(\\s*["']${id}["']\\s*,`);
  for (const [r, t] of srcText) if (/.(ts|tsx)$/.test(r) && !/(registry|numbers).ts$/.test(r) && call.test(t)) return "src/" + r;
  for (const [r, t] of srcText) if (r.endsWith(".json") && /legacy/.test(r) && t.includes(`"id": "${id}"`)) return "src/" + r;
  for (const [r, t] of srcText) {
    if (!/\.(ts|tsx)$/.test(r)) continue;
    for (const m of t.matchAll(/\bid:\s*`([\w-]+)\$\{/g)) if (id.startsWith(m[1]) && !/^pack_/.test(m[1]) === !/^pack_/.test(id)) return "src/" + r;
  }
  return null;
}

function runtimeDump() {
  const candidates = [
    path.join(TPL, "..", "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(SRC, "node_modules", "tsx", "dist", "cli.mjs"),
  ];
  const pnpm = path.join(SRC, "node_modules", ".pnpm");
  if (fs.existsSync(pnpm)) for (const d of fs.readdirSync(pnpm)) if (/^tsx@/.test(d)) candidates.push(path.join(pnpm, d, "node_modules", "tsx", "dist", "cli.mjs"));
  const cli = candidates.find((c) => fs.existsSync(c));
  if (!cli) return { error: "tsx not found in the source repo" };
  const u = (f) => pathToFileURL(path.join(TPL, f)).href;
  const probe = `
import { LOOKS, getLook, LOOK_NUMBER_ORDER, LOOK_SECTIONS, isRetiredLook, lookNumber, resolveStyle, listTemplates } from ${JSON.stringify(u("registry.ts"))};
import { NEW_LOOKS } from ${JSON.stringify(u("looks/new.ts"))};
import legacy from ${JSON.stringify(u("looks/legacy.generated.json"))} with { type: "json" };
import { SPRINGS, LETTER_ANIMATORS, LETTER_AE_MS, LETTER_DEFAULT_MS, LETTER_TRACK_EM } from ${JSON.stringify(u("motion.ts"))};
import { ENTRANCES, EXITS, ACTIVE_EFFECTS, EASINGS } from ${JSON.stringify(pathToFileURL(path.join(SRC, "packages", "shared", "src", "style.ts")).href)};
import * as P from ${JSON.stringify(u("pack/moovi/presets.ts"))};
const gallery = new Set(LOOKS.map((l) => l.id));
const premiumIds = new Set((LOOK_SECTIONS.find((s) => s.id === "premium")?.lookIds) ?? []);
const looks = [];
const seen = new Set();
const push = (l, extra) => { if (!l || seen.has(l.id)) return; seen.add(l.id); looks.push({ id: l.id, name: l.name, description: l.description, category: l.category, templateId: l.templateId, tags: l.tags ?? [], number: lookNumber(l.id) ?? null, retired: isRetiredLook(l.id), inGallery: gallery.has(l.id) && !isRetiredLook(l.id), premiumSection: premiumIds.has(l.id), style: l.style, settings: l.settings, ...extra }); };
for (const id of LOOK_NUMBER_ORDER) push(getLook(id), { curated: true });
for (const l of NEW_LOOKS) if (!seen.has(l.id)) push({ ...l, style: resolveStyle({ ...l.style, templateId: l.templateId }) }, { curated: false });
for (const l of legacy) if (!seen.has(l.id)) push({ ...l, category: l.category ?? "Classic", style: resolveStyle(l.style) }, { curated: false, legacy: true });
const templates = listTemplates().map((t) => ({ id: t.id, name: t.name, layout: t.layout, fonts: t.fonts, heroDrawn: !!t.heroDrawn, fixedWordsPerCard: t.fixedWordsPerCard ?? null, entrances: t.capabilities?.entrances ?? null, activeEffects: t.capabilities?.activeEffects ?? null }));
const moovi = {
  "1_1": P.premiumCaption1("1.1"), "1_2": P.premiumCaption1("1.2"), "2": P.premiumCaption2(), "3": P.premiumCaption3(), "4": P.premiumCaption4(),
};
process.stdout.write("@@JSON@@" + JSON.stringify({ looks, templates, moovi, springs: SPRINGS, letter: { LETTER_ANIMATORS, LETTER_AE_MS, LETTER_DEFAULT_MS, LETTER_TRACK_EM }, enums: { ENTRANCES, EXITS, ACTIVE_EFFECTS, EASINGS } }));
`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ce-probe-"));
  const probeFile = path.join(tmp, "probe.ts");
  fs.writeFileSync(probeFile, probe);
  const r = spawnSync(process.execPath, [cli, probeFile], { cwd: path.join(TPL, ".."), encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 180000 });
  fs.rmSync(tmp, { recursive: true, force: true });
  const out = r.stdout || "";
  const i = out.indexOf("@@JSON@@");
  if (i < 0) return { error: `probe failed: ${(r.stderr || r.error?.message || "").slice(0, 800)}` };
  return JSON.parse(out.slice(i + 8));
}

const uniq = (xs) => [...new Set(xs.filter((x) => x !== null && x !== undefined && x !== ""))];

function coloursOf(style, extra = {}) {
  const fill = style.fill?.type === "gradient" ? null : style.fill?.color ?? null;
  const gradient = style.fill?.type === "gradient" ? (style.fill.stops || []).map((s) => s.color) : null;
  const heroFill = style.hero?.fill ? (style.hero.fill.type === "gradient" ? (style.hero.fill.stops || []).map((s) => s.color).join(" > ") : style.hero.fill.color) : null;
  return {
    text: fill, gradient, hero: heroFill ?? null,
    active: style.active?.effect && style.active.effect !== "none" ? style.active.color ?? null : null,
    box: style.active?.boxColor ?? null,
    stroke: style.stroke?.enabled ? style.stroke.color : null,
    glow: style.glow?.enabled ? style.glow.color : null,
    background: style.background && style.background.type !== "none" ? style.background.color : null,
    shadows: Array.isArray(style.shadows) && style.shadows.length ? uniq(style.shadows.map((s) => s.color)) : null,
    ...extra,
  };
}
const HIGHLIGHT_KIND = { box: "box", marker: "marker", "fill-sweep": "karaoke", underline: "underline", glow: "glow", "outline-fill": "outline" };
const LETTER = /^letter-/;

function fromRuntime(dump) {
  const tplById = new Map(dump.templates.map((t) => [t.id, t]));
  return dump.looks.map((l) => {
    const s = l.style || {};
    const t = tplById.get(l.templateId) || {};
    const mooviKey = /^moovi_caption_/.test(l.id) ? l.id.replace("moovi_caption_", "") : null;
    const preset = mooviKey ? dump.moovi[mooviKey] : null;
    const tiers = preset ? (preset.tiers || []).filter(Boolean) : [];
    const presetFonts = preset ? uniq([...tiers.map((x) => x.font), ...(preset.fonts || []).map((q) => String(q).split(":")[0].replaceAll("+", " "))]) : [];
    const presetColours = uniq(tiers.flatMap((x) => [...[].concat(x.fill ?? []), x.edge?.color, x.shadow?.color, x.glow?.color, ...(x.glow?.layers || []).map((g) => g.c), x.bevel?.light, x.bevel?.dark, x.extrude?.color, x.extrude?.dark]).filter((c) => typeof c === "string"));
    const premium = !!(l.premiumSection || l.category === "Premium" || mooviKey);
    return {
      id: l.id, name: l.name, number: l.number, premium, category: l.category ?? null, description: l.description ?? null, tags: l.tags,
      inGallery: l.inGallery, retired: l.retired, curated: l.curated, legacy: !!l.legacy,
      templateId: l.templateId, layout: t.layout ?? null,
      fonts: uniq([s.fontId, s.hero?.fontId, ...(t.fonts || []), ...presetFonts]),
      type: { fontId: s.fontId ?? null, fontWeight: s.fontWeight ?? null, fontStyle: s.fontStyle ?? null, fontSize: s.fontSize ?? null, casing: s.casing ?? null, letterSpacing: s.letterSpacing ?? null, heroFontId: s.hero?.fontId ?? null, heroScale: s.hero?.scale ?? null },
      colours: coloursOf(s, preset ? { presetTiers: presetColours.length ? presetColours : null, presetTierFonts: tiers.map((x) => ({ font: x.font, weight: x.weight, italic: !!x.italic, casing: x.casing ?? null, size: x.size })) } : {}),
      background: s.background?.type ?? null,
      backgroundDetail: s.background && s.background.type !== "none" ? { color: s.background.color, opacity: s.background.opacity, padding: s.background.padding, radius: s.background.radius, blur: s.background.blur } : null,
      highlight: s.active?.effect ? HIGHLIGHT_KIND[s.active.effect] ?? (s.active.effect === "none" ? "none" : "text") : null,
      inAnimation: s.entrance ? { type: s.entrance.type, durationMs: s.entrance.durationMs, easing: s.entrance.easing, stagger: s.entrance.stagger } : null,
      outAnimation: s.exit ? { type: s.exit.type, durationMs: s.exit.durationMs } : null,
      emphasis: s.active ? { effect: s.active.effect, scale: s.active.scale, color: s.active.color } : null,
      letterAnimator: [s.entrance?.type, s.exit?.type].find((x) => x && LETTER.test(x)) ?? null,
      wordAnimator: s.active?.effect && s.active.effect !== "none" ? s.active.effect : null,
      layoutMotion: preset ? { kind: "moovi-premium-enter", ...preset.enter } : null,
      position: s.position ?? null,
      templateOptions: s.templateOptions && Object.keys(s.templateOptions).length ? s.templateOptions : null,
      settings: l.settings ?? null,
      sourceFile: sourceOf(l.id),
      templateSourceFile: sourceOf(l.templateId),
      extractedBy: "runtime (source repo registry via its tsx)",
    };
  });
}

/** fallback: regex over the copied TS text. Anything not found is null. */
function fromText() {
  const numbers = srcText.get("packages/templates/src/looks/numbers.ts") || "";
  const order = (numbers.match(/LOOK_NUMBER_ORDER[^=]*=\s*\[([\s\S]*?)\];/) || [, ""])[1];
  const ids = uniq([...order.matchAll(/"([\w-]+)"/g)].map((m) => m[1]));
  const newTs = srcText.get("packages/templates/src/looks/new.ts") || "";
  for (const m of newTs.matchAll(/\{\s*id:\s*"([\w-]+)"/g)) ids.push(m[1]);
  return uniq(ids).map((id, i) => {
    const sf = sourceOf(id);
    const t = sf ? srcText.get(sf.slice(4)) || "" : "";
    const at = t.search(new RegExp(`\\bid:\\s*["'\`]${id}["'\`]`));
    let block = null;
    if (at >= 0) { // the balanced { ... } that holds the id
      let s = t.lastIndexOf("{", at), depth = 0, e = s;
      for (; e < t.length; e++) { if (t[e] === "{") depth++; else if (t[e] === "}" && --depth === 0) break; }
      block = t.slice(s, e + 1);
    }
    const g = (re) => (block && (block.match(re) || [])[1]) ?? null;
    const n = (re) => { const v = g(re); return v === null ? null : Number(v); };
    const entrance = g(/entrance:\s*\{\s*type:\s*"([\w-]+)"/);
    const exit = g(/exit:\s*\{\s*type:\s*"([\w-]+)"/);
    const effect = g(/active:\s*\{\s*effect:\s*"([\w-]+)"/);
    return {
      id, name: g(/name:\s*"([^"]+)"/), number: ids.indexOf(id) < 133 ? i + 1 : null, premium: /moovi_caption_|premium/.test(id + (sf || "")),
      category: g(/category:\s*"([^"]+)"/), templateId: g(/templateId:\s*["'`]([\w-]+)/),
      fonts: block ? uniq([...block.matchAll(/fontId:\s*"([^"]+)"/g)].map((m) => m[1])) : null,
      colours: block ? { all: uniq([...block.matchAll(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g)].map((m) => m[0])) } : null,
      background: g(/background:\s*\{\s*type:\s*"([\w-]+)"/),
      inAnimation: entrance ? { type: entrance, durationMs: n(/entrance:\s*\{[^}]*durationMs:\s*([\d.]+)/), easing: g(/entrance:\s*\{[^}]*easing:\s*"(\w+)"/) } : null,
      outAnimation: exit ? { type: exit } : null,
      emphasis: effect ? { effect } : null,
      letterAnimator: [entrance, exit].find((x) => x && LETTER.test(x)) ?? null,
      wordAnimator: effect && effect !== "none" ? effect : null,
      sourceFile: sf, extractedBy: "source text (regex)",
    };
  });
}

// ---------------------------------------------------------------- 3. animations (motion.ts text + runtime constants)
function buildAnimations(dump) {
  const motionRel = "packages/templates/src/motion.ts";
  const m = srcText.get(motionRel) || "";
  const src = "src/" + motionRel;
  const fnBody = (name) => { const i = m.indexOf(`function ${name}(`); if (i < 0) return ""; const j = m.indexOf("\n}\n", i); return m.slice(i, j < 0 ? undefined : j); };
  const cases = (body) => {
    const out = new Map();
    const re = /case\s+"([\w-]+)":/g;
    const hits = [...body.matchAll(re)];
    hits.forEach((h, k) => out.set(h[1], body.slice(h.index, k + 1 < hits.length ? hits[k + 1].index : undefined)));
    return out;
  };
  const springIn = (code) => { const s = code.match(/damping:\s*([\d.]+),\s*stiffness:\s*([\d.]+)(?:,\s*mass:\s*([\d.]+))?/); if (s) return { damping: +s[1], stiffness: +s[2], mass: s[3] ? +s[3] : null }; const n = code.match(/SPRINGS\.(\w+)/); return n ? { preset: n[1], ...(dump?.springs?.[n[1]] || {}) } : null; };
  const anims = [];
  const enums = dump?.enums || {};
  const add = (a) => anims.push({ sourceFile: src, ...a });

  const ent = cases(fnBody("entranceStyle"));
  const entranceIds = enums.ENTRANCES || [...ent.keys()];
  for (const id of entranceIds) {
    if (id === "none" || LETTER.test(id)) continue;
    const code = ent.get(id) || (id === "rise" ? ent.get("rise") : null);
    const sp = code ? springIn(code) : null;
    add({ id: `in.${id}`, name: id, kind: "in", durationMs: sp ? null : "style.entrance.durationMs", ease: sp ? { spring: sp } : "style.entrance.easing (linear|outQuad|outCubic|outExpo|inOutCubic; spring = outExpo)", note: code ? null : "not drawn by entranceStyle; the layout handles it (e.g. typewriter)", sourceFile: code ? src : null });
  }
  const ex = cases(fnBody("exitStyle"));
  for (const id of enums.EXITS || [...ex.keys()]) {
    if (id === "none" || LETTER.test(id)) continue;
    add({ id: `out.${id}`, name: id, kind: "out", durationMs: "style.exit.durationMs (schema default 120)", ease: "in-cubic (Easing.in(Easing.cubic))" });
  }
  const act = cases(fnBody("activeEffect"));
  for (const id of enums.ACTIVE_EFFECTS || [...act.keys()]) {
    if (id === "none") continue;
    const code = act.get(id) || "";
    const dur = code.match(/progress\(timeMs - word\.startMs,\s*(\d+)\)/) || code.match(/\/\s*(\d+)\)\)\)/);
    const usesSpring = /\bsp\b/.test(code);
    add({ id: `emphasis.${id}`, name: id, kind: "emphasis", durationMs: dur ? +dur[1] : id === "fill-sweep" ? "the spoken word's own length" : null, ease: usesSpring ? { spring: { preset: "snappy", ...(dump?.springs?.snappy || {}) } } : dur ? "outExpo" : null, scale: /a\.scale/.test(code) ? "style.active.scale" : null });
  }
  const lb = cases(fnBody("letterAmount"));
  const letterIds = dump?.letter?.LETTER_ANIMATORS || [...lb.keys()];
  for (const id of letterIds) {
    const code = lb.get(id) || (id === "letter-stretch" ? lb.get("letter-spin") : "") || "";
    const params = {};
    for (const p of ["duration", "frequency", "damping"]) { const v = (code.match(new RegExp(`${p}\\s*=\\s*([\\d.]+)`)) || [])[1]; if (v) params[p] = +v; }
    if (/bounceAmount/.test(code)) Object.assign(params, { duration: 0.15, frequency: 2, damping: 9, curve: "AE decaying bounce" });
    add({ id: `letter.${id}`, name: id, kind: "letter", durationMs: { aeMs: dump?.letter?.LETTER_AE_MS ?? 660, defaultMs: dump?.letter?.LETTER_DEFAULT_MS ?? 300 }, ease: { aeExpression: params, trackEm: dump?.letter?.LETTER_TRACK_EM ?? 0.58 }, alsoOut: true, note: "After Effects text animator (scale/rotation 30deg/tracking); also plays backwards as an exit" });
  }
  const we = fnBody("wordEntryTransform");
  for (const [id, sp] of [["pop", "bouncy"], ["slam", "punch"], ["rise", "smooth"]]) {
    if (!we.includes(`"${id}"`)) continue;
    add({ id: `word.${id}`, name: id, kind: "word", durationMs: null, ease: { spring: { preset: sp, ...(dump?.springs?.[sp] || {}) } }, note: "a word's own entrance on top of its card's (Word.entry)" });
  }
  if (/wordReveal\s*=/.test(m)) add({ id: "word.progressive-reveal", name: "progressive reveal", kind: "word", durationMs: +(m.match(/wordReveal[^\n]*progress\([^,]+,\s*(\d+)/) || [, 130])[1], ease: "outExpo" });
  if (/function staggerDelayMs/.test(m)) add({ id: "word.stagger", name: "stagger", kind: "word", durationMs: { perWordMs: 70, perLetterMs: 28, scaledBy: "entrance.durationMs / 220 (min 0.4)" }, ease: null });
  for (const [k, v] of Object.entries(dump?.springs || {})) add({ id: `spring.${k}`, name: `${k} spring`, kind: "spring", durationMs: null, ease: { spring: v }, note: "shared spring preset that the motions above use" });
  if (dump?.moovi) {
    const presetsSrc = "src/packages/templates/src/pack/moovi/presets.ts";
    for (const [k, p] of Object.entries(dump.moovi)) {
      const e = p.enter || {};
      add({ id: `moovi.${k}.enter`, name: `Premium Caption ${k.replace("_", ".")} entrance`, kind: e.stagger ? "letter" : "in", durationMs: { fadeS: e.fadeS, blurS: e.blurS, flashS: e.flashS, writeS: e.writeS ?? null }, ease: { scaleFrom: e.scaleFrom, decay: e.decay, freq: e.freq, blur: e.blur, flash: e.flash, drift: e.drift, rise: e.rise ?? null, stagger: e.stagger ?? null }, sourceFile: presetsSrc, note: "drawn by pack/moovi/draw.ts on a canvas" });
    }
  }
  return anims;
}

// ---------------------------------------------------------------- 4. write
const dump = runtimeDump();
const usedRuntime = !dump.error;
if (!usedRuntime) console.warn(`runtime read skipped: ${dump.error}\nfalling back to the source text`);
const looks = usedRuntime ? fromRuntime(dump) : fromText();
const animations = buildAnimations(usedRuntime ? dump : null);

const unread = [];
for (const l of looks) for (const [k, v] of Object.entries(l)) if (v === null && ["name", "fonts", "colours", "background", "inAnimation", "outAnimation", "sourceFile", "templateId"].includes(k)) unread.push(`${l.id}.${k}`);

const meta = {
  generatedBy: "tools/build-caption-library.mjs", source: SRC.split(path.sep).join("/"), extractedBy: usedRuntime ? "runtime" : "source-text",
  counts: { looks: looks.length, inGallery: looks.filter((l) => l.inGallery).length, premium: looks.filter((l) => l.premium).length, animations: animations.length, filesCopied: copiedRel.length },
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "catalog.json"), JSON.stringify({ ...meta, looks }, null, 2) + "\n");
fs.writeFileSync(path.join(OUT, "animations.json"), JSON.stringify({ ...meta, animations }, null, 2) + "\n");
fs.writeFileSync(path.join(OUT, "files.json"), JSON.stringify({ copied: copiedRel, npmImportsNotCopied: [...external].sort(), skipped: uniq(skipped).sort() }, null, 2) + "\n");

const kinds = animations.reduce((a, x) => ((a[x.kind] = (a[x.kind] || 0) + 1), a), {});
console.log(`source:      ${SRC}`);
console.log(`read by:     ${usedRuntime ? "runtime (source registry via its tsx)" : "source text (regex)"}`);
console.log(`files:       ${copiedRel.length} copied to library/captions-easy/src (${skipped.length} skipped; npm imports not copied: ${[...external].sort().join(", ")})`);
console.log(`looks:       ${looks.length} (${meta.counts.inGallery} in the gallery, ${meta.counts.premium} premium: ${looks.filter((l) => l.premium).map((l) => l.id).join(", ")})`);
console.log(`animations:  ${animations.length} (${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(", ")})`);
const byField = unread.reduce((a, x) => { const k = x.split(".").pop(); a[k] = (a[k] || 0) + 1; return a; }, {});
const premiumUnread = unread.filter((x) => looks.find((l) => l.premium && x.startsWith(l.id + ".")));
console.log(`unread:      ${unread.length ? Object.entries(byField).map(([k, v]) => `${k} ${v}`).join(", ") : "none"}${premiumUnread.length ? ` (premium: ${premiumUnread.join(", ")})` : ""}`);
