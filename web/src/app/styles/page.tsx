import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { styles } from '@/lib/server/jobs';
import { StylePair } from './StylePair';

export const metadata: Metadata = { title: 'Styles', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * For the developer: every style the engine has, each with the same raw take before and after, on plain white.
 * Pairs live in web/public/styles/<id>/{before,after}.mp4 (made from the style's verified run, docs/RESULTS.md);
 * a style without a pair yet is listed by name only.
 */
export default function StylesPage() {
  const list = styles().map(s => ({ ...s, has: existsSync(join(process.cwd(), 'public', 'styles', s.id, 'after.mp4')) }));
  return (
    <main style={{ background: '#fff', minHeight: '100svh', padding: '48px 16px 80px', fontFamily: 'var(--font-display), system-ui, sans-serif', color: '#111' }}>
      {list.map(s => (
        <section key={s.id} style={{ maxWidth: 760, margin: '0 auto 72px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}>{s.label}</h2>
          {s.has ? <StylePair id={s.id} /> : null}
        </section>
      ))}
    </main>
  );
}
