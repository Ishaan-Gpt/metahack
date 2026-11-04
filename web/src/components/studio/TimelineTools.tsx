'use client';
/* Timeline interactions for the caption lane, ported from Captions Easy's Timeline.tsx: click a caption block to select
   it (and play from it), drag the body to move it, drag an edge to retime it, double-click to rewrite it, snapping to
   the neighbours' edges and the playhead. Zoomed in (WORD_PPS and up), the lane switches to Captions Easy's word view:
   each word is its own block inside a faint band for its card; click a word to pick it and seek, double-click to edit
   it, drag it to move it, drag its edges to stretch or shorten it, clamped to the words beside it (retimeRun). Every
   change goes into the shared caption draft (captionDraft.ts), so the timeline and the caption editor build one batch
   and one re-render. Plus the editor's keyboard shortcuts and the word tools (key word, split, join, delete, undo,
   redo: Captions Easy's StudioPage toolbar). */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { MIN_CARD, MIN_WORD, fmtT, type CaptionDraft } from './captionDraft';

type Drag = { i: number; kind: 'move' | 'start' | 'end'; x0: number; s0: number; e0: number; s: number; e: number; moved: boolean };
type WDrag = Drag & { j: number; lo: number; hi: number };
const SNAP_PX = 7;
/** pixels per second from which the lane shows words, not cards (about 20 px for a typical 0.3 s word) */
export const WORD_PPS = 64;
/** Captions Easy: zoom 1 = the whole video fits; up to 40x for word-level work */
export const MAX_ZOOM = 40;

/**
 * Drop inside the caption lane in place of its blocks:
 * `<div className="ed__lane ed__lane--cap"><CaptionLane draft={draft} duration={D} ... /></div>`
 */
export function CaptionLane({ draft, duration, selected, onSelect, onSeek, currentTime }: {
  draft: CaptionDraft;
  duration: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onSeek?: (t: number) => void;
  /** playhead in seconds: a snap target, and the spoken card is marked */
  currentTime?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [wdrag, setWdrag] = useState<WDrag | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [wrename, setWrename] = useState<{ i: number; j: number } | null>(null);
  const [width, setWidth] = useState(0);
  const D = Math.max(0.1, duration);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el); setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const pps = () => (ref.current?.clientWidth ?? 1) / D;   // pixels per second
  const wordView = width / D >= WORD_PPS;

  const snapTo = (v: number, targets: number[]) => {
    let best = v, bd = SNAP_PX / pps();
    for (const t of targets) if (Math.abs(t - v) < bd) { bd = Math.abs(t - v); best = t; }
    return best;
  };
  const snap = (v: number, i: number) => {
    const targets = [0, D, ...(currentTime !== undefined ? [currentTime] : [])];
    for (const c of draft.cards) if (c.i !== i && !c.deleted) targets.push(c.t0, c.t1);
    return snapTo(v, targets);
  };
  const wordTargets = (i: number, j: number) => {
    const t = [0, D, ...(currentTime !== undefined ? [currentTime] : [])];
    for (const c of draft.cards) for (const w of c.wordViews) if (!(c.i === i && w.j === j)) t.push(w.t, w.end);
    return t;
  };

  // ---- cards ----
  const begin = (e: React.PointerEvent, i: number, kind: Drag['kind']) => {
    if (e.button !== 0 || renaming !== null) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const c = draft.cards[i]!;
    setDrag({ i, kind, x0: e.clientX, s0: c.t0, e0: c.t1, s: c.t0, e: c.t1, moved: false });
  };
  // ---- words (Captions Easy beginDrag / onMove / endDrag in word mode) ----
  const beginWord = (e: React.PointerEvent, i: number, j: number, kind: Drag['kind']) => {
    if (e.button !== 0 || wrename) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const w = draft.cards[i]!.wordViews[j]!, { lo, hi } = draft.wordRoom(i, j);
    setWdrag({ i, j, kind, x0: e.clientX, s0: w.t, e0: w.end, s: w.t, e: w.end, moved: false, lo, hi });
  };
  const move = (e: React.PointerEvent) => {
    if (wdrag) {
      const px = e.clientX - wdrag.x0;
      if (!wdrag.moved && Math.abs(px) < 3) return;
      const dt = px / pps(), tg = wordTargets(wdrag.i, wdrag.j);
      let s = wdrag.s0, en = wdrag.e0;
      if (wdrag.kind === 'start') s = Math.min(wdrag.e0 - MIN_WORD, Math.max(wdrag.lo, snapTo(wdrag.s0 + dt, tg)));
      else if (wdrag.kind === 'end') en = Math.max(wdrag.s0 + MIN_WORD, Math.min(wdrag.hi, snapTo(wdrag.e0 + dt, tg)));
      else {
        const len = wdrag.e0 - wdrag.s0, raw = wdrag.s0 + dt, ss = snapTo(raw, tg), se = snapTo(raw + len, tg);
        s = Math.min(wdrag.hi - len, Math.max(wdrag.lo, ss !== raw ? ss : se !== raw + len ? se - len : raw));
        en = s + len;
      }
      setWdrag({ ...wdrag, s, e: en, moved: true });
      return;
    }
    if (!drag) return;
    const px = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(px) < 3) return;
    const dt = px / pps(), { lo, hi } = draft.bounds(drag.i);
    let s = drag.s0, en = drag.e0;
    if (drag.kind === 'start') s = Math.min(drag.e0 - MIN_CARD, Math.max(lo, snap(drag.s0 + dt, drag.i)));
    else if (drag.kind === 'end') en = Math.max(drag.s0 + MIN_CARD, Math.min(hi, snap(drag.e0 + dt, drag.i)));
    else {
      const len = drag.e0 - drag.s0, raw = drag.s0 + dt, ss = snap(raw, drag.i), se = snap(raw + len, drag.i);
      s = Math.min(hi - len, Math.max(lo, ss !== raw ? ss : se !== raw + len ? se - len : raw));
      en = s + len;
    }
    setDrag({ ...drag, s, e: en, moved: true });
  };
  const end = (e: React.PointerEvent) => {
    if (wdrag) {
      e.stopPropagation();
      if (wdrag.moved && (wdrag.s !== wdrag.s0 || wdrag.e !== wdrag.e0)) draft.setWordTime(wdrag.i, wdrag.j, wdrag.s, wdrag.e);
      else onSeek?.(wdrag.s0 + 0.01);
      draft.selectWord({ i: wdrag.i, j: wdrag.j }); onSelect(wdrag.i);
      setWdrag(null);
      return;
    }
    if (!drag) return;
    e.stopPropagation();
    if (drag.moved && (drag.s !== drag.s0 || drag.e !== drag.e0)) draft.setTiming(drag.i, drag.s, drag.e);
    else { onSelect(drag.i); onSeek?.(drag.s0 + 0.01); }
    setDrag(null);
  };

  const pct = (t: number) => `${t / D * 100}%`;
  return (
    <div className={`cx-lane${wordView ? ' is-words' : ''}`} ref={ref} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { setDrag(null); setWdrag(null); }}
      onClick={e => { if ((e.target as HTMLElement) === ref.current) { e.stopPropagation(); onSelect(null); draft.selectWord(null); const r = ref.current.getBoundingClientRect(); onSeek?.((e.clientX - r.left) / r.width * D); } }}>
      {draft.cards.map(c => {
        if (c.deleted) return null;
        const on = selected === c.i;
        const now = currentTime !== undefined && currentTime >= c.t0 && currentTime < c.t1;
        // word view: a faint band for the card, its words on top
        if (wordView && c.wordViews.length) return (
          <div key={c.i} className={`cx-band${on ? ' is-on' : ''}${now ? ' is-live' : ''}`} style={{ left: pct(c.t0), width: pct(Math.max(0.01, c.t1 - c.t0)) }}>
            {c.wordViews.map(w => {
              const live = wdrag && wdrag.i === c.i && wdrag.j === w.j ? { s: wdrag.s, e: wdrag.e } : { s: w.t, e: w.end };
              const picked = draft.word?.i === c.i && draft.word.j === w.j;
              const said = currentTime !== undefined && currentTime >= live.s && currentTime < live.e;
              const editing = wrename?.i === c.i && wrename.j === w.j;
              return (
                <div key={w.j} className={`cx-word${picked ? ' is-on' : ''}${said ? ' is-live' : ''}${w.hero ? ' is-hero' : ''}${wdrag?.i === c.i && wdrag.j === w.j ? ' is-drag' : ''}`}
                  style={{ left: `${(live.s - c.t0) / Math.max(0.01, c.t1 - c.t0) * 100}%`, width: `${Math.max(0.5, (live.e - live.s) / Math.max(0.01, c.t1 - c.t0) * 100)}%` }}
                  title={`${w.w}  ${fmtT(live.s)} to ${fmtT(live.e)}${w.hero ? '  (key word)' : ''}  (drag to move, drag an edge to stretch, double-click to edit)`}
                  onPointerDown={e => beginWord(e, c.i, w.j, 'move')} onClick={e => e.stopPropagation()}
                  onDoubleClick={e => { e.stopPropagation(); setWrename({ i: c.i, j: w.j }); }}>
                  {editing ? (
                    <input autoFocus defaultValue={w.w} aria-label="Word text"
                      onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
                      onBlur={e => { draft.setWordText(c.i, w.j, e.target.value); setWrename(null); }}
                      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setWrename(null); }} />
                  ) : <span>{w.w}</span>}
                  {!editing && <>
                    <i className="cx-edge cx-edge--s" onPointerDown={e => beginWord(e, c.i, w.j, 'start')} aria-label={`Move the start of "${w.w}"`} />
                    <i className="cx-edge cx-edge--e" onPointerDown={e => beginWord(e, c.i, w.j, 'end')} aria-label={`Move the end of "${w.w}"`} />
                  </>}
                </div>
              );
            })}
          </div>
        );
        const live = drag?.i === c.i ? { s: drag.s, e: drag.e } : { s: c.t0, e: c.t1 };
        const nowL = currentTime !== undefined && currentTime >= live.s && currentTime < live.e;
        return (
          <div key={c.i} className={`cx-block${on ? ' is-on' : ''}${nowL ? ' is-live' : ''}${c.edited || c.retimed ? ' is-changed' : ''}${drag?.i === c.i ? ' is-drag' : ''}`}
            style={{ left: pct(live.s), width: `${Math.max(0.2, (live.e - live.s) / D * 100)}%` }}
            title={`${c.text}  ${fmtT(live.s)} to ${fmtT(live.e)}  (drag to move, drag an edge to retime, double-click to rewrite${wordView ? '; apply to edit its words' : ''})`}
            onPointerDown={e => begin(e, c.i, 'move')} onClick={e => e.stopPropagation()}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(c.i); }}>
            {renaming === c.i ? (
              <input autoFocus defaultValue={draft.state.cards[c.i]?.text ?? c.original.text} aria-label="Caption text"
                onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
                onBlur={e => { if (e.target.value.trim()) draft.setText(c.i, e.target.value); setRenaming(null); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }} />
            ) : (
              <span>{c.hero ? <u>{c.hero}</u> : c.text}</span>
            )}
            {renaming !== c.i && <>
              <i className="cx-edge cx-edge--s" onPointerDown={e => begin(e, c.i, 'start')} aria-label={`Move the start of "${c.text}"`} />
              <i className="cx-edge cx-edge--e" onPointerDown={e => begin(e, c.i, 'end')} aria-label={`Move the end of "${c.text}"`} />
            </>}
          </div>
        );
      })}
    </div>
  );
}

/** Captions Easy's word toolbar (StudioPage extraTools + Timeline split / join) and the timeline zoom */
export function WordTools({ draft, zoom, onZoom }: { draft: CaptionDraft; zoom: number; onZoom: (z: number) => void }) {
  const w = draft.word, wv = w ? draft.cards[w.i]?.wordViews[w.j] : undefined;
  const none = !w || !wv;
  const b = (label: string, text: string, fn: () => void, o: { disabled?: boolean; active?: boolean } = {}) => (
    <button type="button" className={`cx-tool${o.active ? ' is-on' : ''}`} title={label} aria-label={label} disabled={o.disabled} onClick={e => { e.stopPropagation(); fn(); }}>{text}</button>
  );
  return (
    <span className="cx-tools" onClick={e => e.stopPropagation()}>
      {wv ? <span className="cx-tools__word">“{wv.w}”</span> : <span className="cx-tools__hint">{zoom < 2 ? 'Zoom in to edit words' : 'Pick a word'}</span>}
      {b(wv?.hero ? 'Key word (click to unset)  K' : 'Make key word  K', '★', () => w && draft.toggleHero(w.i, w.j), { disabled: none, active: !!wv?.hero })}
      {b('Split: start a new caption at this word  S', 'Split', () => w && draft.split(w.i, w.j), { disabled: none || w!.j === 0 })}
      {b("Join: merge this word's caption with the previous one  J", 'Join', () => w && draft.merge(w.i), { disabled: none || w!.i === 0 })}
      {b('Delete the word  Delete', 'Delete', () => w && draft.deleteWord(w.i, w.j), { disabled: none })}
      {b('Undo  Ctrl+Z', '↶', draft.undo, { disabled: !draft.canUndo })}
      {b('Redo  Ctrl+Shift+Z', '↷', draft.redo, { disabled: !draft.canRedo })}
      <span className="cx-zoom">
        {b('Zoom out  -', '−', () => onZoom(Math.max(1, zoom / 1.5)), { disabled: zoom <= 1 })}
        <input type="range" min={0} max={Math.log(MAX_ZOOM)} step={0.01} value={Math.log(zoom)} aria-label="Timeline zoom" onChange={e => onZoom(Math.exp(+e.target.value))} />
        {b('Zoom in  =', '+', () => onZoom(Math.min(MAX_ZOOM, zoom * 1.5)), { disabled: zoom >= MAX_ZOOM })}
      </span>
    </span>
  );
}

/** the editor's keys, for a help line or a tooltip */
export const SHORTCUTS: [string, string][] = [
  ['Space', 'play or pause'],
  ['Left / Right', 'move the selected word or caption 0.05 s (Shift 0.25 s); with none selected, step the playhead 0.5 s (Shift 2 s)'],
  ['Alt + Left / Right', 'stretch or shrink the selected word\'s or caption\'s end'],
  ['Up / Down', 'select the previous or next caption'],
  ['Delete', 'delete the selected word, or the selected caption'],
  ['K', 'make the selected word the key word (again to unset)'],
  ['S', 'split: a new caption starts at the selected word'],
  ['J', 'join the selected word\'s caption with the previous one'],
  ['- / =', 'zoom the timeline out or in'],
  ['Esc', 'clear the selection'],
  ['Ctrl + Z', 'undo the last unapplied change'],
  ['Ctrl + Shift + Z or Ctrl + Y', 'redo'],
  ['Ctrl + Enter', 'apply the changes'],
];

/**
 * Keyboard shortcuts for the studio (Captions Easy's StudioPage keys plus timeline nudges and the word tools). Typing
 * in a field is never hijacked, except Ctrl+Enter to apply.
 */
export function useTimelineShortcuts(o: {
  video: RefObject<HTMLVideoElement | null>;
  draft: CaptionDraft;
  selected: number | null;
  onSelect: (i: number | null) => void;
  /** called on Ctrl/Cmd+Enter; usually `() => onApply(draft.ops, draft.said)` */
  onApply?: () => void;
  /** timeline zoom, for - and = */
  zoom?: number;
  onZoom?: (z: number) => void;
  enabled?: boolean;
}) {
  const live = useRef(o);
  useLayoutEffect(() => { live.current = o; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { video, draft, selected, onSelect, onApply, zoom, onZoom, enabled = true } = live.current;
      if (!enabled) return;
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); onApply?.(); return; }
      if (typing) return;
      const v = video.current;
      const sel = selected !== null && draft.cards[selected] && !draft.cards[selected]!.deleted ? selected : null;
      const w = draft.word;
      const step = (dir: 1 | -1) => {   // next / previous caption that still exists
        const from = sel ?? (v ? draft.cards.findIndex(c => c.t1 > v.currentTime) - (dir > 0 ? 1 : 0) : -1);
        for (let k = from + dir; k >= 0 && k < draft.cards.length; k += dir) if (!draft.cards[k]!.deleted) return k;
        return null;
      };
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) draft.redo(); else draft.undo(); }
      else if (mod && k === 'y') { e.preventDefault(); draft.redo(); }
      else if (mod) return;
      else if (e.code === 'Space') { e.preventDefault(); if (v) { if (v.paused) void v.play().catch(() => {}); else v.pause(); } }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1, dt = dir * (e.shiftKey ? 0.25 : 0.05);
        if (w) { if (e.altKey) draft.stretchWord(w.i, w.j, dt); else draft.nudgeWord(w.i, w.j, dt); }
        else if (sel !== null) { if (e.altKey) draft.stretch(sel, dt); else draft.nudge(sel, dt); }
        else if (v) v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + dir * (e.shiftKey ? 2 : 0.5)));
      }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const n = step(e.key === 'ArrowUp' ? -1 : 1);
        if (n !== null) { draft.selectWord(null); onSelect(n); if (v) v.currentTime = draft.cards[n]!.t0 + 0.01; }
      }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && w) { e.preventDefault(); draft.deleteWord(w.i, w.j); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel !== null) { e.preventDefault(); draft.toggleDelete(sel); onSelect(step(1) ?? step(-1)); }
      else if (k === 'k' && w) { e.preventDefault(); draft.toggleHero(w.i, w.j); }
      else if (k === 's' && w) { e.preventDefault(); draft.split(w.i, w.j); }
      else if (k === 'j' && w) { e.preventDefault(); draft.merge(w.i); }
      else if ((e.key === '=' || e.key === '+') && onZoom) { e.preventDefault(); onZoom(Math.min(MAX_ZOOM, (zoom ?? 1) * 1.5)); }
      else if (e.key === '-' && onZoom) { e.preventDefault(); onZoom(Math.max(1, (zoom ?? 1) / 1.5)); }
      else if (e.key === 'Escape' && (w || sel !== null)) { draft.selectWord(null); onSelect(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
