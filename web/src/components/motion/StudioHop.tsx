'use client';
import { useEffect, useState } from 'react';
import { HaloMark } from '@/components/brand/Logo';

const ZONE = /^\/studio(\/|$)/;

/**
 * Into the studio (/studio, a route of this app with its own shell): the halo covers the page at once, then a full
 * navigation, so the landing's film, scroll and world are torn down cleanly behind the cover. Links into /studio are
 * caught here; code that navigates there itself calls `goStudio(url)`.
 */
export function goStudio(url: string) { window.dispatchEvent(new CustomEvent('moovi:studio', { detail: url })); }

export function StudioHop() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let alive = true;
    const go = async (url: string) => {
      setOn(true);
      // two frames so the cover paints before the browser starts unloading the page
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (alive) window.location.assign(url);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element)?.closest?.('a') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !ZONE.test(u.pathname)) return;
      e.preventDefault();
      void go(u.pathname + u.search + u.hash);
    };
    const onEvent = (e: Event) => void go((e as CustomEvent<string>).detail);
    // coming back with the back button (page restored from the cache): no cover
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setOn(false); };
    document.addEventListener('click', onClick, true);
    window.addEventListener('moovi:studio', onEvent);
    window.addEventListener('pageshow', onShow);
    return () => { alive = false; document.removeEventListener('click', onClick, true); window.removeEventListener('moovi:studio', onEvent); window.removeEventListener('pageshow', onShow); };
  }, []);

  if (!on) return null;
  return <div className="hop" role="status" aria-label="Opening the studio"><span className="hop__glow"><HaloMark size={84} spin /></span></div>;
}
