import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, styles } from '@/lib/server/jobs';
import { StylePair } from './StylePair';
import { RefPair } from './RefPair';

export const metadata: Metadata = { title: 'Styles', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * For the developer, on plain white: the two styles the engine renders today (the same raw take before and after, from
 * web/public/styles/<id>/), then every reference edit rebuilt 1:1 in code (its raw take beside the live recreation player
 * in recreate/<id>), each marked with the engine it became, or "no engine yet".
 */
const REFS = [
  { id: 'ba5', name: 'Storyboard card', clip: 'ba5c', note: 'the reference behind Studio Card' },
  { id: 'ba2', name: 'Creator studio', clip: 'ba2c', note: 'one of the two references behind Creator Mix' },
  { id: 'ba1', name: 'Brand ad', clip: 'ba1c', note: 'no engine yet' },
  { id: 'ba3', name: '$10 vs $80', clip: 'ba3c', note: 'no engine yet' },
  { id: 'ba4', name: 'Interview desk', clip: 'ba4c', note: 'no engine yet' },
  { id: 'self1', name: 'Our own, no reference', clip: 'self1', note: 'no engine yet' },
];

export default function StylesPage() {
  const engines = styles().map(s => ({ ...s, has: existsSync(join(process.cwd(), 'public', 'styles', s.id, 'after.mp4')) }));
  const refs = REFS.map(r => {
    const b = ['before.mp4', 'aroll.mp4'].find(f => existsSync(join(ROOT, 'data', 'clips', r.clip, f)));
    return { ...r, before: b ? `/data/clips/${r.clip}/${b}` : null, has: existsSync(join(ROOT, 'recreate', r.id, 'index.html')) };
  }).filter(r => r.before && r.has);
  const h2: React.CSSProperties = { fontSize: 20, fontWeight: 600, margin: '0 0 6px', textAlign: 'center' };
  const tag: React.CSSProperties = { fontSize: 12, color: '#777', textAlign: 'center', margin: '0 0 16px' };
  return (
    <main style={{ background: '#fff', minHeight: '100svh', padding: '48px 16px 80px', fontFamily: 'var(--font-display), system-ui, sans-serif', color: '#111' }}>
      {engines.map(s => (
        <section key={s.id} style={{ maxWidth: 760, margin: '0 auto 72px' }}>
          <h2 style={h2}>{s.label}</h2>
          <p style={tag}>engine</p>
          {s.has ? <StylePair id={s.id} /> : null}
        </section>
      ))}
      {refs.map(r => (
        <section key={r.id} style={{ maxWidth: 760, margin: '0 auto 72px' }}>
          <h2 style={h2}>{r.name}</h2>
          <p style={tag}>{r.id} · rebuilt in code · {r.note}</p>
          <RefPair id={r.id} before={r.before!} />
        </section>
      ))}
    </main>
  );
}
