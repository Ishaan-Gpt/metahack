import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // standalone app inside the metahack repo (which has its own lockfile): resolve from web/
  turbopack: { root: process.cwd() },
  // a second dev server (e.g. a preview alongside another session's) needs its own build folder and lock
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // the reference recreations' live players (shown on /styles) load from these absolute paths; app/ref serves an
  // allow-list of them from the repo root
  async rewrites() {
    return [
      { source: '/recreate/:path*', destination: '/ref/recreate/:path*' },
      { source: '/assets/:path*', destination: '/ref/assets/:path*' },
      { source: '/data/clips/:path*', destination: '/ref/data/clips/:path*' },
    ];
  },
};

export default config;
