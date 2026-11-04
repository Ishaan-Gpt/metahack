'use client';
/* The caption editor's batch: every change (a word, a retime, a delete, a find & replace, a preset, size, position,
   case) is held here as a draft and sent as ONE list of ops when the user presses Apply, so a batch costs one
   re-render. Shared by CaptionEditor (the panel) and TimelineTools (the timeline lane and the shortcuts) so a drag on
   the timeline and a typed word land in the same batch. Ported from Captions Easy's edit model (useStudio.ts: every
   change is a pure function on the doc, typing coalesces into one undo step). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAPTION_PRESETS } from '@/lib/caption-presets';
import { applyWordOp as applyWordOpJs, wordEnd as wordEndJs, wordRoom as wordRoomJs, MIN_WORD as MIN_WORD_JS } from '@/lib/word-ops';

/** a word: starts at t, ends at e when set, else where the next word starts, else at the card's end */
export type Word = { w: string; t: number; e?: number; hero: boolean };
export type Caption = { t0: number; t1: number; text: string; hero: string | null; words?: Word[] };
/** the part of GET /api/jobs/<id>/spec the caption tools read (Studio's Spec is assignable to it) */
export type CaptionSpec = { duration: number; captions: Caption[] };

export type Op =
  | { op: 'caption.text'; find: string; replace: string }
  | { op: 'caption.word'; i: number; text: string }
  | { op: 'caption.timing'; i: number; t0: number; t1: number }
  | { op: 'caption.delete'; i: number }
  | { op: 'caption.preset'; name: string }
  | { op: 'caption.size'; scale: number }
  | { op: 'caption.position'; dy: number }
  | { op: 'caption.case'; upper: boolean }
  | { op: 'caption.hide' }
  | { op: 'caption.show' }
  | WordOp;

/** word-level ops (engine/word-ops.mjs): sent first, in the order they were made, before the card ops */
export type WordOp =
  | { op: 'caption.wordTime'; i: number; j: number; t0: number; t1: number }
  | { op: 'caption.wordText'; i: number; j: number; text: string }
  | { op: 'caption.hero'; i: number; j: number; off?: boolean }
  | { op: 'caption.split'; i: number; j: number }
  | { op: 'caption.merge'; i: number }
  | { op: 'caption.wordDelete'; i: number; j: number };

type WCap = { t0: number; t1: number; words: Word[] };
/** the shared appliers, typed (web/src/lib/word-ops.ts is a generated copy of engine/word-ops.mjs) */
export const MIN_WORD: number = MIN_WORD_JS;
const applyWordOp = applyWordOpJs as (caps: WCap[], op: WordOp, duration: number) => string | null;
export const wordEnd = wordEndJs as (c: WCap, j: number) => number;
const wordRoomT = wordRoomJs as (caps: WCap[], i: number, j: number, duration: number) => { lo: number; hi: number };
/** a word picked on the timeline: card i, word j (of the working captions) */
export type WordSel = { i: number; j: number };

type CardEdit = { text?: string; t0?: number; t1?: number; del?: boolean };
export type DraftState = {
  cards: Record<number, CardEdit>;
  replace: { find: string; replace: string }[];
  preset: string | null;
  /** relative: 1 = unchanged */
  scale: number;
  /** relative, fraction of height, + is lower */
  dy: number;
  upper: boolean | null;
  visible: boolean | null;
  /** word ops in the order they were made; card edits (cards) index the captions after these */
  words: WordOp[];
};
const EMPTY: DraftState = { cards: {}, replace: [], preset: null, scale: 1, dy: 0, upper: null, visible: null, words: [] };

/** shortest a card may be (the edit route refuses under 0.2 s) */
export const MIN_CARD = 0.25;
const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** whole-word, case-insensitive matcher (Captions Easy findMatches) */
export const matcher = (find: string) => (find.trim() ? new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(find.trim())})(?=$|[^\\p{L}\\p{N}])`, 'giu') : null);
/** a replacement that keeps the case of what it replaces (ALL CAPS stays caps, Capitalised stays capitalised) */
const keepCase = (orig: string, rep: string) =>
  orig === orig.toUpperCase() && orig !== orig.toLowerCase() ? rep.toUpperCase() : orig[0] && orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
export const applyReplace = (text: string, list: DraftState['replace']) =>
  list.reduce((t, { find, replace }) => { const re = matcher(find); return re ? t.replace(re, (_m, pre: string, w: string) => pre + keepCase(w, replace)) : t; }, text);

export type WordView = Word & { j: number; end: number };
export type CardView = Caption & { i: number; deleted: boolean; edited: boolean; retimed: boolean; original: Caption;
  /** the card's words with their ends; empty while the card has a pending rewrite or retime (apply that first) */
  wordViews: WordView[] };

/** the spec's captions after the draft's word ops: what the card edits and the timeline work on */
function working(src: Caption[], ops: WordOp[], duration: number): Caption[] {
  if (!ops.length) return src;
  const caps: WCap[] = src.map(c => ({ t0: c.t0, t1: c.t1, words: (c.words ?? []).map(w => ({ ...w })) }));
  for (const op of ops) applyWordOp(caps, op, duration);
  return caps.map(c => ({ t0: c.t0, t1: c.t1, words: c.words, text: c.words.map(w => w.w).join(' '), hero: c.words.find(w => w.hero)?.w ?? null }));
}

/** card edits are keyed by index: a split (+1) shifts the cards after `at`; a join or a removed card (-1) drops `at` */
function shift(cs: DraftState['cards'], at: number, by: 1 | -1) {
  const o: DraftState['cards'] = {};
  for (const [k, v] of Object.entries(cs)) { const n = +k; if (by < 0 && n === at) continue; o[n > at ? n + by : n] = v; }
  return o;
}

export function useCaptionDraft(spec: CaptionSpec | null) {
  const [d, setD] = useState<DraftState>(EMPTY);
  const past = useRef<DraftState[]>([]);
  const future = useRef<DraftState[]>([]);
  const last = useRef<{ key: string; at: number } | null>(null);
  const [word, setWord] = useState<WordSel | null>(null);

  // a new spec (the re-render after Apply, or another take) starts a clean batch
  const orig = spec?.captions;
  useEffect(() => { setD(EMPTY); past.current = []; future.current = []; last.current = null; setWord(null); }, [orig]);
  const duration = spec?.duration ?? Infinity;
  const caps = useMemo(() => (orig ? working(orig, d.words, duration) : orig), [orig, d.words, duration]);

  /** every change is undoable; typing into the same card within 600 ms is one step (Captions Easy coalesceKey) */
  const update = useCallback((fn: (s: DraftState) => DraftState, key?: string) => {
    setD(prev => {
      const now = Date.now();
      const coalesce = key && last.current?.key === key && now - last.current.at < 600;
      if (!coalesce) { past.current.push(prev); if (past.current.length > 80) past.current.shift(); }
      future.current = [];
      last.current = key ? { key, at: now } : null;
      return fn(prev);
    });
  }, []);
  const undo = useCallback(() => { const p = past.current.pop(); if (p) { last.current = null; setD(cur => { future.current.push(cur); return p; }); setWord(null); } }, []);
  /** Captions Easy's redo (Ctrl+Shift+Z or Ctrl+Y) */
  const redo = useCallback(() => { const n = future.current.pop(); if (n) { last.current = null; setD(cur => { past.current.push(cur); return n; }); setWord(null); } }, []);
  const discard = useCallback(() => { if (past.current.length || d !== EMPTY) { past.current.push(d); setD(EMPTY); } }, [d]);

  const card = (s: DraftState, i: number, patch: CardEdit): DraftState => ({ ...s, cards: { ...s.cards, [i]: { ...s.cards[i], ...patch } } });

  const cards: CardView[] = useMemo(() => (caps ?? []).map((c, i) => {
    const e = d.cards[i] ?? {};
    const text = applyReplace(e.text ?? c.text, d.replace);
    const t0 = e.t0 ?? c.t0, t1 = e.t1 ?? c.t1;
    const edited = e.text !== undefined && e.text !== c.text, retimed = Math.abs(t0 - c.t0) > 0.004 || Math.abs(t1 - c.t1) > 0.004;
    const ws = c.words ?? [], wc = { t0: c.t0, t1: c.t1, words: ws };
    const wordViews = edited || retimed || e.del || text !== c.text ? [] : ws.map((w, j) => ({ ...w, j, end: wordEnd(wc, j) }));
    return { i, t0, t1, text, hero: c.hero, words: ws, deleted: !!e.del, edited, retimed, original: c, wordViews };
  }), [caps, d]);

  /** neighbours' edges (deleted cards free their room), for clamping a move or a stretch */
  const bounds = useCallback((i: number) => {
    let lo = 0, hi = spec?.duration ?? Infinity;
    for (let k = i - 1; k >= 0; k--) if (!cards[k]?.deleted) { lo = cards[k]!.t1; break; }
    for (let k = i + 1; k < cards.length; k++) if (!cards[k]?.deleted) { hi = cards[k]!.t0; break; }
    return { lo, hi };
  }, [cards, spec?.duration]);

  /** adds a word op to the batch; refused on a card with a pending rewrite or retime (its words are not shown) */
  const wordEdit = (op: WordOp, key?: string) => {
    const cv = cards[op.i], pv = cards[op.i - 1];
    if (!cv || cv.deleted || !cv.wordViews.length) return;
    if (op.op === 'caption.merge' && (!pv || pv.deleted || !pv.wordViews.length)) return;
    if (op.op === 'caption.split' && !(op.j > 0 && op.j < cv.wordViews.length)) return;
    update(s => {
      let cs = s.cards;
      if (op.op === 'caption.split') cs = shift(cs, op.i, 1);
      if (op.op === 'caption.merge' || (op.op === 'caption.wordDelete' && cv.wordViews.length === 1)) cs = shift(cs, op.i, -1);
      // dragging the same word again replaces its last retime, so a batch stays short
      const lastOp = s.words[s.words.length - 1];
      const same = op.op === 'caption.wordTime' && lastOp?.op === 'caption.wordTime' && lastOp.i === op.i && lastOp.j === op.j;
      return { ...s, cards: cs, words: same ? [...s.words.slice(0, -1), op] : [...s.words, op] };
    }, key);
    if (op.op === 'caption.split') setWord({ i: op.i + 1, j: 0 });
    else if (op.op === 'caption.merge') setWord({ i: op.i - 1, j: pv!.wordViews.length });
    else if (op.op === 'caption.wordDelete') setWord(null);
  };
  const wordRoom = (i: number, j: number) => wordRoomT(cards.map(c => ({ t0: c.t0, t1: c.t1, words: c.words ?? [] })), i, j, duration);
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const setWordTime = (i: number, j: number, t0: number, t1: number) => wordEdit({ op: 'caption.wordTime', i, j, t0: r3(t0), t1: r3(t1) }, `w${i}.${j}`);

  const api = {
    state: d,
    cards,
    bounds,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    /** the picked word, if it still exists */
    word: word && cards[word.i]?.wordViews[word.j] ? word : null,
    selectWord: setWord,
    /** the room a word may use (its neighbours' edges), for clamping a drag (Captions Easy retimeRun) */
    wordRoom,
    setWordTime,
    /** moves a word by dt seconds, keeping its length, inside its room */
    nudgeWord: (i: number, j: number, dt: number) => {
      const w = cards[i]?.wordViews[j]; if (!w) return;
      const { lo, hi } = wordRoom(i, j), len = w.end - w.t, a = Math.min(hi - len, Math.max(lo, w.t + dt));
      setWordTime(i, j, a, a + len);
    },
    /** moves only a word's end by dt seconds */
    stretchWord: (i: number, j: number, dt: number) => {
      const w = cards[i]?.wordViews[j]; if (!w) return;
      const { hi } = wordRoom(i, j);
      setWordTime(i, j, w.t, Math.min(hi, Math.max(w.t + MIN_WORD, w.end + dt)));
    },
    /** an empty text removes the word (Captions Easy hides it) */
    setWordText: (i: number, j: number, text: string) => { if (text.trim() !== cards[i]?.wordViews[j]?.w) wordEdit({ op: 'caption.wordText', i, j, text: text.trim() }); },
    /** makes the word its card's key word, or unsets it when it already is (Captions Easy's star) */
    toggleHero: (i: number, j: number) => { const w = cards[i]?.wordViews[j]; if (w) wordEdit(w.hero ? { op: 'caption.hero', i, j, off: true } : { op: 'caption.hero', i, j }); },
    /** a new caption starts at word j */
    split: (i: number, j: number) => wordEdit({ op: 'caption.split', i, j }),
    /** caption i joins the one before it */
    merge: (i: number) => wordEdit({ op: 'caption.merge', i }),
    deleteWord: (i: number, j: number) => wordEdit({ op: 'caption.wordDelete', i, j }),
    discard,
    setText: (i: number, text: string) => update(s => card(s, i, { text }), `t${i}`),
    /** sets a card's edges, clamped to its neighbours and to MIN_CARD */
    setTiming: (i: number, t0: number, t1: number) => {
      const { lo, hi } = bounds(i);
      let a = Math.max(lo, t0), b = Math.min(hi, t1);
      if (b - a < MIN_CARD) { if (t0 !== cards[i]?.t0) a = b - MIN_CARD; else b = a + MIN_CARD; }
      update(s => card(s, i, { t0: r2(a), t1: r2(b) }), `m${i}`);
    },
    /** moves a card by dt seconds, keeping its length */
    nudge: (i: number, dt: number) => {
      const c = cards[i]; if (!c) return;
      const { lo, hi } = bounds(i), len = c.t1 - c.t0;
      const a = Math.min(hi - len, Math.max(lo, c.t0 + dt));
      update(s => card(s, i, { t0: r2(a), t1: r2(a + len) }), `m${i}`);
    },
    /** moves only the end by dt seconds */
    stretch: (i: number, dt: number) => {
      const c = cards[i]; if (!c) return;
      const { hi } = bounds(i);
      update(s => card(s, i, { t1: r2(Math.min(hi, Math.max(c.t0 + MIN_CARD, c.t1 + dt))) }), `m${i}`);
    },
    toggleDelete: (i: number) => update(s => card(s, i, { del: !s.cards[i]?.del })),
    resetCard: (i: number) => update(s => { const cs = { ...s.cards }; delete cs[i]; return { ...s, cards: cs }; }),
    addReplace: (find: string, replace: string) => { if (find.trim()) update(s => ({ ...s, replace: [...s.replace.filter(r => r.find.toLowerCase() !== find.trim().toLowerCase()), { find: find.trim(), replace }] })); },
    removeReplace: (k: number) => update(s => ({ ...s, replace: s.replace.filter((_, j) => j !== k) })),
    setPreset: (name: string | null) => update(s => ({ ...s, preset: s.preset === name ? null : name })),
    setScale: (scale: number) => update(s => ({ ...s, scale }), 'scale'),
    setDy: (dy: number) => update(s => ({ ...s, dy }), 'dy'),
    setUpper: (upper: boolean | null) => update(s => ({ ...s, upper })),
    setVisible: (visible: boolean | null) => update(s => ({ ...s, visible })),
    ops: [] as Op[],
    said: '',
  };

  // the batch, in an order that is safe for index-based ops: per-card rewrites and retimes first, then find & replace
  // over the whole edit, then deletes from the last card back (so earlier indices never shift), then the look:
  // preset before size / position / case so the fine controls win over the preset's own values
  const { ops, said } = useMemo(() => {
    const o: Op[] = [...d.words], words: string[] = [];
    const src = caps ?? [];
    let nWord = 0, nTime = 0, nDel = 0;
    src.forEach((c, i) => {
      const e = d.cards[i]; if (!e || e.del) return;
      if (e.text !== undefined && e.text.trim() && e.text !== c.text) { o.push({ op: 'caption.word', i, text: e.text.trim() }); nWord++; }
      const t0 = e.t0 ?? c.t0, t1 = e.t1 ?? c.t1;
      if (Math.abs(t0 - c.t0) > 0.004 || Math.abs(t1 - c.t1) > 0.004) { o.push({ op: 'caption.timing', i, t0, t1 }); nTime++; }
    });
    for (const r of d.replace) o.push({ op: 'caption.text', find: r.find, replace: r.replace });
    for (let i = src.length - 1; i >= 0; i--) if (d.cards[i]?.del) { o.push({ op: 'caption.delete', i }); nDel++; }
    if (d.visible === false) o.push({ op: 'caption.hide' });
    if (d.visible === true) o.push({ op: 'caption.show' });
    if (d.preset) o.push({ op: 'caption.preset', name: d.preset });
    if (Math.abs(d.scale - 1) > 0.001) o.push({ op: 'caption.size', scale: r2(d.scale) });
    if (Math.abs(d.dy) > 0.001) o.push({ op: 'caption.position', dy: r2(d.dy) });
    if (d.upper !== null) o.push({ op: 'caption.case', upper: d.upper });
    const n = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;
    const cnt = (k: WordOp['op']) => d.words.filter(x => x.op === k).length;
    const moved = new Set(d.words.flatMap(x => (x.op === 'caption.wordTime' ? [`${x.i}.${x.j}`] : []))).size;
    if (moved) words.push(`retimed ${n(moved, 'word')}`);
    if (cnt('caption.wordText')) words.push(`changed ${n(cnt('caption.wordText'), 'word')}`);
    const heroOff = d.words.filter(x => x.op === 'caption.hero' && 'off' in x && x.off).length, heroOn = cnt('caption.hero') - heroOff;
    if (heroOn) words.push(`moved ${n(heroOn, 'key word')}`);
    if (heroOff) words.push(`cleared ${n(heroOff, 'key word')}`);
    if (cnt('caption.split')) words.push(`split ${n(cnt('caption.split'), 'caption')}`);
    if (cnt('caption.merge')) words.push(`joined ${n(cnt('caption.merge'), 'caption')}`);
    if (cnt('caption.wordDelete')) words.push(`removed ${n(cnt('caption.wordDelete'), 'word')}`);
    if (nWord) words.push(`rewrote ${n(nWord, 'caption')}`);
    if (nTime) words.push(`retimed ${n(nTime, 'caption')}`);
    if (d.replace.length) words.push(d.replace.map(r => `"${r.find}" to "${r.replace}"`).join(', '));
    if (nDel) words.push(`removed ${n(nDel, 'caption')}`);
    if (d.visible !== null) words.push(d.visible ? 'captions on' : 'captions off');
    if (d.preset) words.push(`${CAPTION_PRESETS[d.preset]?.label ?? d.preset} look`);
    if (Math.abs(d.scale - 1) > 0.001) words.push(d.scale > 1 ? 'bigger captions' : 'smaller captions');
    if (Math.abs(d.dy) > 0.001) words.push(d.dy > 0 ? 'captions lower' : 'captions higher');
    if (d.upper !== null) words.push(d.upper ? 'all caps' : 'sentence case');
    const s = words.join(', ');
    return { ops: o, said: s ? s.charAt(0).toUpperCase() + s.slice(1) : '' };
  }, [caps, d]);
  api.ops = ops;
  api.said = said;
  return api;
}

export type CaptionDraft = ReturnType<typeof useCaptionDraft>;

/** 0:03.4 */
export const fmtT = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
