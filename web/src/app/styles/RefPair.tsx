'use client';
import { useEffect, useRef, useState } from 'react';

type W = Window & { __ready?: boolean; __seek?: (t: number) => Promise<void>; __play?: () => void; __T?: () => number; __edit?: { duration?: number } };

/**
 * A reference's raw take beside our code recreation of its edit. The recreation is the live player (recreate/<id>), not
 * a video: it loads when the pair scrolls near (each one is a WebGL compositor), and on Play the raw take follows its clock.
 */
export function RefPair({ id, before }: { id: string; before: string }) {
  const root = useRef<HTMLDivElement>(null), bv = useRef<HTMLVideoElement>(null), fr = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'ended'>('loading');
  const raf = useRef(0);
  const win = () => fr.current?.contentWindow as W | null;

  useEffect(() => {
    const el = root.current; if (!el) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setMount(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!mount) return;
    let stop = false;
    (async () => { while (!stop && !win()?.__ready) await new Promise(r => setTimeout(r, 150)); if (!stop) setState('ready'); })();
    return () => { stop = true; cancelAnimationFrame(raf.current); };
  }, [mount]);

  async function play() {
    const w = win(), b = bv.current; if (!w || !b) return;
    setState('playing');
    await w.__seek?.(0); b.currentTime = 0;
    w.__play?.(); void b.play().catch(() => {});
    const dur = w.__edit?.duration ?? b.duration;
    const sync = () => {
      const t = w.__T?.() ?? 0;
      if (t >= dur - 0.05) { b.pause(); setState('ended'); return; }
      if (t < b.duration && Math.abs(b.currentTime - t) > 0.1) b.currentTime = t;
      raf.current = requestAnimationFrame(sync);
    };
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(sync);
  }

  const box: React.CSSProperties = { position: 'relative', width: '100%', aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: '#f2f2f2' };
  return (
    <div ref={root} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={box}><video ref={bv} src={before} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
      <div style={box}>
        {mount && <iframe ref={fr} src={`/recreate/${id}/index.html?embed=1`} allow="autoplay" title={`${id} recreation`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />}
        {state !== 'playing' && (
          <button onClick={play} disabled={state === 'loading'}
            style={{ position: 'absolute', inset: 0, border: 0, background: state === 'ready' ? 'transparent' : 'rgba(255,255,255,.6)', cursor: state === 'loading' ? 'progress' : 'pointer', font: '600 15px system-ui, sans-serif', color: '#111' }}>
            <span style={{ padding: '10px 18px', borderRadius: 99, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }}>{state === 'loading' ? 'Loading the edit…' : state === 'ended' ? 'Play again' : 'Play'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
