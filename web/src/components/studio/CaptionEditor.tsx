'use client';
/* The caption editor: every caption card of the finished edit, editable in place, plus the look (preset, size,
   position, case). Changes collect in one batch and go to POST /api/jobs/<id>/edit as exact ops when the user presses
   Apply, so many fixes cost one re-render. Ported from Captions Easy's CaptionsPanel (card list that follows playback,
   find & replace, selected-card editor) and LooksPanel / StylePanel (look gallery, fine controls), mapped onto the
   ops in docs/EDIT-API.md. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconChevron, IconClose, IconLoupe } from '@/components/ui/icons';
import { CAPTION_PRESETS } from '@/lib/caption-presets';
import { fmtT, matcher, useCaptionDraft, type CaptionDraft, type CaptionSpec, type Op } from './captionDraft';

export type { CaptionDraft, CaptionSpec, Op } from './captionDraft';
export { useCaptionDraft } from './captionDraft';

type Props = {
  jobId: string;
  spec: CaptionSpec | null;
  /** the lead POSTs `{ ops }` to /api/jobs/<id>/edit and refreshes; `said` is a plain summary for the chat */
  onApply: (ops: Op[], said: string) => void;
  busy: boolean;
  /** share one batch with the timeline (TimelineTools); without it the editor keeps its own */
  draft?: CaptionDraft;
  /** selected caption index, shared with the timeline */
  selected?: number | null;
  onSelect?: (i: number | null) => void;
  /** playhead in seconds: the card being spoken is marked and kept in view */
  currentTime?: number;
  onSeek?: (t: number) => void;
};

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@900&family=Bricolage+Grotesque:wght@800&family=Fraunces:ital,wght@1,600&family=Instrument+Serif:ital@1&family=Inter+Tight:wght@500&family=Inter:wght@700&family=JetBrains+Mono:wght@700&family=Montserrat:wght@900&family=Pacifico&family=Permanent+Marker&family=Plus+Jakarta+Sans:wght@800&display=swap';
const PRESETS = Object.entries(CAPTION_PRESETS);

export function CaptionEditor({ jobId, spec, onApply, busy, draft, selected: selProp, onSelect, currentTime, onSeek }: Props) {
  const own = useCaptionDraft(spec);
  const d = draft ?? own;
  const [selOwn, setSelOwn] = useState<number | null>(null);
  const selected = selProp !== undefined ? selProp : selOwn;
  const select = (i: number | null) => { setSelOwn(i); onSelect?.(i); };
  const [tab, setTab] = useState<'words' | 'look'>('words');
  const [find, setFind] = useState('');
  const [rep, setRep] = useState('');

  // the preset tiles show each look in its own face (the renderer's fonts, from Google Fonts for the preview only)
  useEffect(() => {
    if (document.getElementById('cx-fonts')) return;
    const l = Object.assign(document.createElement('link'), { id: 'cx-fonts', rel: 'stylesheet', href: FONTS_HREF });
    document.head.appendChild(l);
  }, []);

  const re = useMemo(() => matcher(find), [find]);
  const matches = useMemo(() => (re ? d.cards.reduce((n, c) => n + (c.deleted ? 0 : (c.text.match(re)?.length ?? 0)), 0) : 0), [re, d.cards]);
  const live = currentTime === undefined ? -1 : d.cards.findIndex(c => !c.deleted && currentTime >= c.t0 && currentTime < c.t1);

  // follow playback (and the timeline's selection): keep that card in the middle of the list; only the list scrolls
  const listRef = useRef<HTMLDivElement>(null);
  const follow = selected ?? live;
  useEffect(() => {
    const list = listRef.current, row = list?.querySelector<HTMLElement>(`[data-i="${follow}"]`);
    if (!list || !row || list.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') return;
    const top = row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2;
    if (Math.abs(list.scrollTop - top) > row.offsetHeight / 2) list.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [follow]);

  const apply = () => { if (!d.ops.length || busy) return; onApply(d.ops, d.said); };
  const s = d.state;

  return (
    <section className="cx" aria-label="Captions" data-job={jobId}>
      <header className="cx__head">
        <span className="cx__lab">Captions</span>
        <span className="cx__count">{spec ? `${d.cards.filter(c => !c.deleted).length} cards` : ''}</span>
        <div className="cx__seg" role="tablist" aria-label="Caption tools">
          <button role="tab" aria-selected={tab === 'words'} onClick={() => setTab('words')}>Words</button>
          <button role="tab" aria-selected={tab === 'look'} onClick={() => setTab('look')}>Look</button>
        </div>
      </header>

      {!spec ? <p className="cx__empty">Captions appear here once the edit is planned.</p> : tab === 'words' ? (
        <>
          <div className="cx__find">
            <label className="cx__field"><IconLoupe width={16} height={16} /><input value={find} onChange={e => setFind(e.target.value)} placeholder="Find" aria-label="Find a word" /></label>
            <label className="cx__field"><input value={rep} onChange={e => setRep(e.target.value)} placeholder="Replace with" aria-label="Replace with" onKeyDown={e => { if (e.key === 'Enter' && matches) { d.addReplace(find, rep); setFind(''); setRep(''); } }} /></label>
            <button className="cx__btn" disabled={!matches} onClick={() => { d.addReplace(find, rep); setFind(''); setRep(''); }}>Replace {find ? matches : ''}</button>
          </div>
          {s.replace.length > 0 && (
            <div className="cx__chips">
              {s.replace.map((r, k) => (
                <span key={k} className="cx__chip">{r.find}<i>to</i>{r.replace || <i>nothing</i>}
                  <button aria-label={`Undo replacing ${r.find}`} onClick={() => d.removeReplace(k)}><IconClose width={14} height={14} /></button></span>
              ))}
            </div>
          )}

          <div className="cx__list" ref={listRef}>
            {d.cards.length === 0 && <p className="cx__empty">This edit has no captions. Ask in the chat to add them.</p>}
            {d.cards.map(c => {
              const on = selected === c.i;
              const hit = re && !c.deleted && re.test(c.text); if (re) re.lastIndex = 0;
              return (
                <div key={c.i} data-i={c.i} className={`cx__card${on ? ' is-on' : ''}${live === c.i ? ' is-live' : ''}${c.deleted ? ' is-del' : ''}${hit ? ' is-hit' : ''}`}
                  onClick={() => { if (!c.deleted) select(c.i); }}>
                  <div className="cx__row">
                    <button className="cx__time" onClick={e => { e.stopPropagation(); onSeek?.(c.t0 + 0.01); select(c.i); }} title="Play from here">
                      {fmtT(c.t0)}<i>{(c.t1 - c.t0).toFixed(1)} s</i>
                    </button>
                    {c.hero && <em className="cx__hero" title="Key word, shown big">{c.hero}</em>}
                    {(c.edited || c.retimed) && !c.deleted && <span className="cx__dot" title="Changed, not applied yet" />}
                    <button className="cx__icon" onClick={e => { e.stopPropagation(); d.toggleDelete(c.i); if (on) select(null); }}
                      aria-label={c.deleted ? 'Restore caption' : 'Delete caption'} title={c.deleted ? 'Restore' : 'Delete (Del)'}>
                      {c.deleted ? <span className="cx__restore">Restore</span> : <IconClose width={16} height={16} />}
                    </button>
                  </div>
                  {c.deleted ? <p className="cx__text cx__text--del">{c.original.text}</p> : (
                    <input className="cx__text" value={d.state.cards[c.i]?.text ?? c.original.text} aria-label={`Caption at ${fmtT(c.t0)}`}
                      onFocus={() => select(c.i)} onChange={e => d.setText(c.i, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { d.resetCard(c.i); (e.target as HTMLInputElement).blur(); } }} />
                  )}
                  {on && !c.deleted && (
                    <div className="cx__timing" onClick={e => e.stopPropagation()}>
                      <Nudge label="Start" value={c.t0} onLess={() => d.setTiming(c.i, c.t0 - 0.1, c.t1)} onMore={() => d.setTiming(c.i, c.t0 + 0.1, c.t1)} />
                      <Nudge label="End" value={c.t1} onLess={() => d.stretch(c.i, -0.1)} onMore={() => d.stretch(c.i, 0.1)} />
                      <Nudge label="Move" onLess={() => d.nudge(c.i, -0.1)} onMore={() => d.nudge(c.i, 0.1)} />
                      {(c.edited || c.retimed) && <button className="cx__link" onClick={() => d.resetCard(c.i)}>Reset</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="cx__look">
          <div className="cx__presets" role="radiogroup" aria-label="Caption look">
            {PRESETS.map(([name, p]) => {
              const o = p.overrides, f = o.fonts?.hero;
              return (
                <button key={name} role="radio" aria-checked={s.preset === name} className={`cx__preset${s.preset === name ? ' is-on' : ''}`} onClick={() => d.setPreset(name)} title={p.line}>
                  <span className="cx__swatch" style={{ ['--glow' as string]: o.palette?.glowRgb ?? '255,255,255' }}>
                    <small style={{ color: o.palette?.small ?? '#fff' }}>THE BEST</small>
                    <b style={{ fontFamily: f ? `"${f.family}", var(--font-sans, sans-serif)` : undefined, fontStyle: f?.style === 'italic' ? 'italic' : 'normal', fontWeight: o.caption?.heroWeight ?? 700,
                      color: o.palette?.hero ?? '#fff', textTransform: o.caption?.heroUpper === false ? 'none' : 'uppercase',
                      textShadow: o.caption?.heroGlow ? `0 0 ${o.caption.heroGlow * 0.6}px rgba(${o.palette?.glowRgb ?? '255,255,255'},.85)` : undefined }}>moment</b>
                  </span>
                  <span className="cx__pname">{p.label}{s.preset === name && <IconCheck width={14} height={14} />}</span>
                  <span className="cx__pline">{p.line}</span>
                </button>
              );
            })}
          </div>

          <div className="cx__ctl">
            <label className="cx__slider"><span>Size <i>{s.scale === 1 ? 'as is' : `${Math.round(s.scale * 100)}%`}</i></span>
              <input type="range" min={0.6} max={1.6} step={0.05} value={s.scale} onChange={e => d.setScale(Number(e.target.value))} /></label>
            <label className="cx__slider"><span>Position <i>{s.dy === 0 ? 'as is' : s.dy < 0 ? `${Math.round(-s.dy * 100)}% higher` : `${Math.round(s.dy * 100)}% lower`}</i></span>
              <input type="range" min={-0.3} max={0.3} step={0.01} value={s.dy} onChange={e => d.setDy(Number(e.target.value))} /></label>
            <div className="cx__pick"><span>Case</span>
              <div className="cx__seg">
                <button aria-pressed={s.upper === null} onClick={() => d.setUpper(null)}>As is</button>
                <button aria-pressed={s.upper === true} onClick={() => d.setUpper(true)}>CAPS</button>
                <button aria-pressed={s.upper === false} onClick={() => d.setUpper(false)}>Sentence</button>
              </div></div>
            <div className="cx__pick"><span>Captions</span>
              <div className="cx__seg">
                <button aria-pressed={s.visible === null} onClick={() => d.setVisible(null)}>As is</button>
                <button aria-pressed={s.visible === true} onClick={() => d.setVisible(true)}>On</button>
                <button aria-pressed={s.visible === false} onClick={() => d.setVisible(false)}>Off</button>
              </div></div>
          </div>
        </div>
      )}

      <footer className="cx__foot">
        <p className="cx__said">{d.ops.length ? d.said : busy ? 'Rendering your changes' : 'Edit words, timing or the look, then apply them together.'}</p>
        <div className="cx__actions">
          <button className="cx__link" disabled={!d.canUndo} onClick={d.undo} title="Undo (Ctrl+Z)">Undo</button>
          <button className="cx__link" disabled={!d.ops.length} onClick={d.discard}>Discard</button>
          <button className="cx__apply" disabled={!d.ops.length || busy} onClick={apply} title="Apply (Ctrl+Enter)">
            {busy ? 'Rendering' : d.ops.length ? `Apply ${d.ops.length} change${d.ops.length === 1 ? '' : 's'}` : 'Apply changes'}
          </button>
        </div>
      </footer>
    </section>
  );
}

function Nudge({ label, value, onLess, onMore }: { label: string; value?: number; onLess: () => void; onMore: () => void }) {
  return (
    <span className="cx__nudge">
      <button onClick={onLess} aria-label={`${label} earlier`} title={`${label} 0.1 s earlier`}><IconChevron width={16} height={16} className="cx__l" /></button>
      <span>{label}{value !== undefined && <i>{fmtT(value)}</i>}</span>
      <button onClick={onMore} aria-label={`${label} later`} title={`${label} 0.1 s later`}><IconChevron width={16} height={16} className="cx__r" /></button>
    </span>
  );
}

export default CaptionEditor;
