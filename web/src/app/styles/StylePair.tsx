'use client';
import { useEffect, useRef } from 'react';

/** The raw take and the edit side by side, kept in step: the edit leads (it has the sound), the raw follows it. */
export function StylePair({ id }: { id: string }) {
  const before = useRef<HTMLVideoElement>(null), after = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const a = after.current, b = before.current;
    if (!a || !b) return;
    const sync = () => { if (Math.abs(b.currentTime - a.currentTime) > 0.08) b.currentTime = a.currentTime; };
    const play = () => { b.currentTime = a.currentTime; void b.play().catch(() => {}); };
    const pause = () => b.pause();
    a.addEventListener('play', play); a.addEventListener('pause', pause); a.addEventListener('seeked', sync); a.addEventListener('timeupdate', sync);
    return () => { a.removeEventListener('play', play); a.removeEventListener('pause', pause); a.removeEventListener('seeked', sync); a.removeEventListener('timeupdate', sync); };
  }, []);
  const v: React.CSSProperties = { width: '100%', aspectRatio: '9 / 16', display: 'block', background: '#fff', borderRadius: 12 };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <video ref={before} src={`/styles/${id}/before.mp4`} muted playsInline preload="auto" style={v} />
      <video ref={after} src={`/styles/${id}/after.mp4`} controls playsInline preload="auto" style={v} />
    </div>
  );
}
