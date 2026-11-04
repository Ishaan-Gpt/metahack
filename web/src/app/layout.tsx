import type { Metadata, Viewport } from 'next';
import { Manrope, Fraunces, DM_Mono, Fredoka } from 'next/font/google';
import '@/styles/tokens.css';
import '@/styles/base.css';

// a calm, slightly rounded grotesk for UI and body; a soft serif (Fraunces at full SOFT) for the expressive lines,
// whose rounded terminals echo the mascot's jelly
const display = Manrope({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const serif = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['SOFT', 'WONK', 'opsz'], variable: '--font-serif', display: 'swap' });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });
// the logo's word: a heavy, fully rounded face (Ishaan's reference), round like the jelly
const logo = Fredoka({ subsets: ['latin'], weight: ['700'], variable: '--font-logo', display: 'swap' });

export const metadata: Metadata = {
  title: 'Edit Easy · raw take in, a pro editor’s cut out',
  description: 'Drop a raw talking-head take. Meta’s Muse Spark directs, Edit Easy draws every frame: the edit a hired short-form editor would make, in minutes.',
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  openGraph: { title: 'Edit Easy · raw take in, a pro editor’s cut out', description: 'Directed by Meta’s Muse Spark, cut by one of two engines, then changed by asking in plain words.', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#F7FAFD', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable} ${logo.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
