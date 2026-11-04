import type { CSSProperties } from 'react';

/**
 * The mascot's halo as a mark: not a drawing of it but the halo itself, rendered by his own renderer (same jelly wheel,
 * same material) and saved as `/brand/halo.webp` (large) and `/brand/halo-128.webp` (small). It is the logo, the
 * favicon, the loader and the busy spinner. `spin` turns it in steps, one spoke a second (`@keyframes halo-tick` in @moovi/brand tokens.css).
 * `base` is the app's base path (the studio is served under /studio and keeps its own copy of the files).
 */
export function HaloMark({ size = 28, spin = false, base = '', className, style }: { size?: number; spin?: boolean; base?: string; className?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a tiny static mark; no layout shift (fixed size), no optimiser needed
    <img src={`${base}${size > 64 ? '/brand/halo.webp' : '/brand/halo-128.webp'}`} alt="" aria-hidden="true" width={size} height={size} draggable={false}
      className={className} style={{ display: 'block', ...(spin ? { animation: 'halo-tick 8s infinite' } : null), ...style }} />
  );
}

/** "editeasy" with the halo as the dot on the i of "edit". */
export function Wordmark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`wordmark ${className ?? ''}`} style={style} aria-label="Edit Easy">
      <span aria-hidden="true">ed</span>
      <span className="wordmark__i" aria-hidden="true">
        ı
        <HaloMark className="wordmark__halo" size={48} />
      </span>
      <span aria-hidden="true">teasy</span>
    </span>
  );
}

/** The logo: the word "editeasy" with the halo itself to its right (it steps once a second on hover, see the app's CSS). */
export function Logo({ className, base = '' }: { className?: string; base?: string }) {
  return (
    <span className={`logo ${className ?? ''}`} aria-label="Edit Easy">
      <span className="logo__word" aria-hidden="true">editeasy</span>
      <HaloMark className="logo__halo" size={48} base={base} />
    </span>
  );
}

/**
 * The loader, everywhere something waits (a route, a hand-off, a busy screen): only the halo, stepping one spoke a
 * second, on a soft ice glow. No words. `base` as for HaloMark.
 */
export function HaloLoader({ size = 72, base = '', label = 'Loading', className, style }: { size?: number; base?: string; label?: string; className?: string; style?: CSSProperties }) {
  return (
    <span role="status" aria-label={label} className={className}
      style={{ display: 'grid', placeItems: 'center', width: size * 1.8, height: size * 1.8, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgb(207 230 247 / .7), rgb(207 230 247 / 0))', ...style }}>
      <HaloMark size={size} spin base={base} />
    </span>
  );
}
