import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type FeedImage = { url: string; is_primary?: boolean; position?: number };
type FeedCategory = { name: string } | { name: string }[] | null;
type FeedProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sku: string | null;
  in_stock: boolean;
  seo_title: string | null;
  images?: FeedImage[] | null;
  category?: FeedCategory;
};

function primaryImage(images: FeedImage[] | null | undefined): string {
  if (!images?.length) return '';
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });
  return sorted[0]?.url ?? '';
}

function categoryName(category: FeedCategory | undefined): string {
  if (!category) return '';
  if (Array.isArray(category)) return category[0]?.name ?? '';
  return category.name ?? '';
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nativeamericanjewelry.com';
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Native American Jewelry';

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Product feed not configured', { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, price, sku, in_stock, seo_title, images:product_images(url, is_primary, position), category:categories(name)'
    )
    .eq('status', 'active')
    .limit(5000);

  if (error) {
    console.error('GET /feed.xml:', error);
    return new Response('Failed to build product feed', { status: 500 });
  }

  const items = ((data ?? []) as FeedProduct[])
    .map((product) => {
      const imageUrl = primaryImage(product.images);
      if (!imageUrl) return '';

      const id = product.sku || product.id;
      const title = product.seo_title || product.name;
      const description = (product.description || product.name).slice(0, 5000);
      const link = `${base}/product/${product.slug}`;
      const price = `${Number(product.price).toFixed(2)} USD`;
      const availability = product.in_stock ? 'in stock' : 'out of stock';
      const productType = categoryName(product.category);

      return `
    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:price>${price}</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>${productType ? `\n      <g:product_type>${escapeXml(productType)}</g:product_type>` : ''}
    </item>`;
    })
    .filter(Boolean)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(brand)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(`${brand} product catalog`)}</description>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
