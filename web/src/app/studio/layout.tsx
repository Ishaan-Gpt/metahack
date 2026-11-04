import type { Metadata } from 'next';
import '@/styles/studio.css';
import '@/styles/captions.css';

export const metadata: Metadata = {
  title: 'Edit Easy Studio · drop a take, get the cut',
  description: 'Upload a raw talking-head take. Muse Spark directs, Edit Easy renders the edit and a before/after, then you change it by asking.',
};

/** The studio's shell: no intro film, no smooth scroll; a calm work surface in the same ice language as the landing. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="sx">{children}</div>;
}
