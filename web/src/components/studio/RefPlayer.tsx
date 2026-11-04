'use client';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';

export type RefSample = { id: string; name: string; line: string; clip: string; before: string; player: string };
type Win = Window & { __ready?: boolean; __seek?: (t: number) => Promise<void>; __play?: () => void; __T?: () => number; __edit?: { duration?: number } };

/**
 * A reference sample's edit in the studio: the live code recreation (recreate/<id>, served by app/ref) in an iframe.
 * Its clock (__T) is handed up so the Before / After raw take can follow it.
 */
export function RefPlayer({ r, clock }: { r: RefSample; clock: MutableRefObject<(() => { t: number; playing: boolean }) | null> }) {
  const fr = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'ended'>('loading');
  const playing = useRef(false);
  const win = () => fr.current?.contentWindow as Win | null;

  useEffect(() => {
    let stop = false;
    (async () => { for (let n = 0; n < 400 && !stop && !win()?.__ready; n++) await new Promise(ok => setTimeout(ok, 150)); if (!stop) setState(win()?.__ready ? 'ready' : 'loading'); })();
    clock.current = () => ({ t: win()?.__T?.() ?? 0, playing: playing.current });
    let raf = 0;
    const tick = () => {
      const w = win(), d = w?.__edit?.duration;
      if (playing.current && d && (w?.__T?.() ?? 0) >= d - 0.05) { playing.current = false; setState('ended'); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { stop = true; cancelAnimationFrame(raf); clock.current = null; };
  }, [r.id, clock]);

  async function play() {
    const w = win(); if (!w) return;
    await w.__seek?.(0); w.__play?.(); playing.current = true; setState('playing');
  }
  return (
    <div className="rp">
      <iframe ref={fr} src={r.player} allow="autoplay" title={`${r.name} edit`} />
      {state !== 'playing' && (
        <button className="rp__play" onClick={play} disabled={state === 'loading'}>
          <span>{state === 'loading' ? 'Loading the edit…' : state === 'ended' ? 'Play again' : 'Play'}</span>
        </button>
      )}
    </div>
  );
}
