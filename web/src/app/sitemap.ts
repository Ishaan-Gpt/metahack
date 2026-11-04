import type { MetadataRoute } from 'next';

const BASE = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 }];
}
