import { MetadataRoute } from 'next';
import { getActiveProductSlugs, isDatabaseConfigured } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nativeamericanjewelry.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  let productPages: MetadataRoute.Sitemap = [];

  if (isDatabaseConfigured()) {
    try {
      const data = await getActiveProductSlugs();
      productPages = data.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    } catch {
      /* leave product pages empty */
    }
  }

  return [...staticPages, ...productPages];
}
