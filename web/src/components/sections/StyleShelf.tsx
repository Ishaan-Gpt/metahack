'use client';
import type { CSSProperties, Ref } from 'react';
import { memory } from '@/lib/content';
import { STYLES, studioHref } from '@/lib/styles';
import { IconArrow, IconOrb } from '@/components/brand/icons';

/**
 * The style library inside Moovi's halo: five small cards on the ring (one per real editor's reel, each with its
 * three measured colours and its one line), and "let Muse Spark pick" at the centre. The ring box is 1000 units,
 * centred and scaled to the halo every frame by WorldStage; the side panel carries the body and the links.
 */
export function StyleShelf({ ringRef }: { ringRef?: Ref<HTMLDivElement> }) {
  return (
    <>
      <div className="memory__ring" ref={ringRef}>
        <div className="memory__ring-in shelf">
          {STYLES.map((s, i) => {
            // five seats around the ring, the first at the top
            const a = (-90 + i * 72) * Math.PI / 180;
            return (
              <a key={s.id} href={studioHref(s.id)} className="shelf__card" title={s.ref}
                style={{ '--x': `${Math.round(Math.cos(a) * 340)}px`, '--y': `${Math.round(Math.sin(a) * 340)}px` } as CSSProperties}>
                <span className="shelf__swatch" aria-hidden="true">{s.swatch.map(c => <i key={c} style={{ background: c }} />)}</span>
                <span className="shelf__label">{s.label}</span>
                <span className="shelf__line">{s.line}</span>
              </a>
            );
          })}
          <a href={studioHref('auto')} className="shelf__auto"><IconOrb width={40} height={40} /><span>Let Muse Spark pick</span></a>
        </div>
      </div>

      <div className="memory__side glass">
        <span className="t-sub2">{memory.inputLabel}</span>
        <p className="memory__lede">{memory.body}</p>
        <ul className="shelf__list">
          {STYLES.map(s => (
            <li key={s.id}>
              <a href={studioHref(s.id)} className="shelf__row">
                <span className="shelf__swatch shelf__swatch--sm" aria-hidden="true">{s.swatch.map(c => <i key={c} style={{ background: c }} />)}</span>
                <span>{s.label}</span>
                <IconArrow width={16} height={16} />
              </a>
            </li>
          ))}
        </ul>
        <a href={studioHref('auto')} className="btn btn--ghost shelf__pick"><IconOrb width={18} height={18} />Let Muse Spark pick</a>
      </div>
    </>
  );
}
