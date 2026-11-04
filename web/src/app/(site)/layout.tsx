import '@/styles/chrome.css';
import '@/styles/sections.css';
import '@/styles/film.css';
import { Intro, introGateScript } from '@/components/motion/Intro';
import { PageTransition } from '@/components/motion/PageTransition';
import { StudioHop } from '@/components/motion/StudioHop';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { Reveals } from '@/components/motion/Reveals';
import { Header } from '@/components/chrome/Header';
import { Timeline } from '@/components/chrome/Timeline';

/** The landing's chrome: the intro gate, smooth scroll, reveals, header and timeline. The studio has its own shell. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: introGateScript }} />
      <link rel="preload" as="image" href="/brand/halo.webp" type="image/webp" fetchPriority="high" />
      <a href="#main" className="skip t-sub2">Skip to content</a>
      <Intro />
      <SmoothScroll />
      <Reveals />
      <Header />
      <Timeline />
      <main id="main">{children}</main>
      <PageTransition />
      <StudioHop />
    </>
  );
}
