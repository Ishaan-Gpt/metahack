// @ts-nocheck
/* A generated copy of engine/word-ops.mjs, so the studio previews a word edit exactly as the engine will apply it.
   Do not edit here: edit engine/word-ops.mjs, then run node tools/sync-caption-presets.mjs */
// Word-level caption edits, ported from Captions Easy's caption engine (packages/caption-engine/src/core/ops.ts:
// retimeRun, setWordText, setEmphasis, splitCardAt, mergeWithPrevious, setHidden) onto our spec's caption cards
// `{ t0, t1, words: [{ w, t, e?, hero }] }`. A word starts at `t`; it ends at `e` when set, else where the next word
// starts, else at the card's end. The renderers read `t` only (player/creator-mix.js shows each word from its `t`,
// player/card-studio.js pops the key word at its `t`), so `e` is kept for the editor and is harmless to them.
// One source for the engine (engine/edits.mjs) and the studio: node tools/sync-caption-presets.mjs copies this file
// to web/src/lib/word-ops.ts. Each op changes `caps` in place and returns one plain sentence.

/** shortest a word may be, in seconds (Captions Easy MIN_MS = 40) */
export const MIN_WORD = 0.04;
const r3 = n => Math.round(n * 1000) / 1000;
const clean = s => String(s ?? '').replace(/^[^\p{L}\p{N}%$']+|[^\p{L}\p{N}%$']+$/gu, '');

/** where word j of card c stops */
export const wordEnd = (c, j) => c.words[j]?.e ?? c.words[j + 1]?.t ?? c.t1;

/** the room word j may use: from the end of what is before it to the start of what is after it */
export function wordRoom(caps, i, j, duration) {
  const c = caps[i];
  const lo = j > 0 ? c.words[j - 1].t + MIN_WORD : (caps[i - 1]?.t1 ?? 0);
  const hi = j < c.words.length - 1 ? c.words[j + 1].t : (caps[i + 1]?.t0 ?? duration ?? Infinity);
  return { lo, hi };
}

/** a card keeps one key word: when it has none, the longest word takes it (our looks are built round one key word) */
function ensureHero(c) {
  if (!c.words.length || c.words.some(w => w.hero)) return;
  let best = 0;
  c.words.forEach((w, k) => { if (clean(w.w).length > clean(c.words[best].w).length) best = k; });
  c.words[best].hero = true;
}

export function applyWordOp(caps, op, duration) {
  const i = op.i, c = caps[i];
  if (!c) return 'That caption is not there.';
  const n = i + 1;
  switch (op.op) {
    case 'caption.wordTime': {
      const w = c.words[op.j]; if (!w) return 'That word is not there.';
      const { lo, hi } = wordRoom(caps, i, op.j, duration);
      if (hi - lo < MIN_WORD) return `There is no room to move “${w.w}”.`;
      const t0 = r3(Math.min(hi - MIN_WORD, Math.max(lo, +op.t0)));
      const t1 = r3(Math.min(hi, Math.max(t0 + MIN_WORD, +op.t1)));
      const prev = c.words[op.j - 1];
      if (prev && wordEnd(c, op.j - 1) > t0) prev.e = t0;          // the word before gives way
      w.t = t0;
      if (op.j === 0) c.t0 = t0;                                   // a card starts with its first word
      if (op.j === c.words.length - 1) { c.t1 = t1; delete w.e; }  // and ends with its last
      else if (t1 < c.words[op.j + 1].t) w.e = t1; else delete w.e;
      return `“${w.w}” now runs ${t0.toFixed(2)}–${t1.toFixed(2)} s.`;
    }
    case 'caption.wordText': {
      const w = c.words[op.j]; if (!w) return 'That word is not there.';
      const text = String(op.text ?? '').trim();
      if (!text) return applyWordOp(caps, { op: 'caption.wordDelete', i, j: op.j }, duration);
      const was = w.w; w.w = text;
      return `Changed “${was}” to “${text}” in caption ${n}.`;
    }
    case 'caption.hero': {
      const w = c.words[op.j]; if (!w) return 'That word is not there.';
      if (op.off) { w.hero = false; return `“${w.w}” is no longer the key word.`; }
      c.words.forEach(x => { x.hero = false; }); w.hero = true;
      return `“${w.w}” is now the key word of caption ${n}.`;
    }
    case 'caption.split': {
      const j = op.j;
      if (!(j > 0 && j < c.words.length)) return 'A caption splits between two of its words.';
      const at = c.words[j].t;
      const b = { ...c, t0: at, t1: c.t1, words: c.words.slice(j) };
      c.words = c.words.slice(0, j); c.t1 = at;
      ensureHero(c); ensureHero(b);
      caps.splice(i + 1, 0, b);
      return `Split caption ${n} before “${b.words[0].w}”.`;
    }
    case 'caption.merge': {
      const p = caps[i - 1]; if (!p) return 'The first caption has nothing before it to join.';
      const last = p.words[p.words.length - 1];
      if (last && last.e == null && p.t1 < c.t0) last.e = p.t1;    // keep the gap between them as it was
      const hadHero = p.words.some(w => w.hero);
      p.words = [...p.words, ...c.words.map(w => ({ ...w, hero: hadHero ? false : w.hero }))];
      p.t1 = c.t1; ensureHero(p);
      caps.splice(i, 1);
      return `Joined caption ${n} onto caption ${n - 1}.`;
    }
    case 'caption.wordDelete': {
      const w = c.words[op.j]; if (!w) return 'That word is not there.';
      if (c.words.length === 1) { caps.splice(i, 1); return `Removed caption ${n}, its only word was “${w.w}”.`; }
      const endPrev = op.j > 0 ? wordEnd(c, op.j - 1) : null;
      c.words.splice(op.j, 1);
      if (op.j === 0) c.t0 = c.words[0].t;
      else if (op.j === c.words.length) { c.t1 = r3(endPrev); delete c.words[op.j - 1].e; }
      if (w.hero) ensureHero(c);
      return `Removed “${w.w}” from caption ${n}.`;
    }
    default: return null;
  }
}

export const WORD_OPS = ['caption.wordTime', 'caption.wordText', 'caption.hero', 'caption.split', 'caption.merge', 'caption.wordDelete'];
