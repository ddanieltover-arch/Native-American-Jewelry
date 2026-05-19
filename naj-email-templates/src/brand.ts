export const BRAND = {
  name: 'Native American Jewelry',
  tagline: 'Authentic · Handcrafted · Traditional',
  colors: {
    obsidian: '#0e0c0a',
    parchment: '#faf6ef',
    bone: '#f0e8d8',
    charcoal: '#3d2c1e',
    sienna: '#8b5e3c',
    turquoise: '#3da8a0',
    sand: '#e8dcc8',
    white: '#ffffff',
  },
} as const;

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'https://nativeamericanjewelry.com'
  ).replace(/\/$/, '');
}
