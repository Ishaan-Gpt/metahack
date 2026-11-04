import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // standalone app inside the metahack repo (which has its own lockfile): resolve from web/
  turbopack: { root: process.cwd() },
  // a second dev server (e.g. a preview alongside another session's) needs its own build folder and lock
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default config;
