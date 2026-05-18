import type { Product, ProductImage, Category } from '@/types';

type DbCategory = Category | Category[] | null | undefined;

function normalizeCategory(cat: DbCategory): Category | undefined {
  if (!cat) return undefined;
  if (Array.isArray(cat)) return cat[0];
  return cat;
}

function normalizeImages(images: ProductImage[] | null | undefined): ProductImage[] {
  if (!images?.length) return [];
  return [...images].sort((a, b) => a.position - b.position);
}

/** Map Supabase product row (with joins) to storefront Product type */
export function mapDbProduct(row: Record<string, unknown>): Product {
  const tags = (row.tags as string[] | null) ?? [];
  const images = normalizeImages(row.images as ProductImage[] | undefined);
  const variants = (row.variants as Product['variants']) ?? [];

  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? undefined,
    category_id: (row.category_id as string | null) ?? undefined,
    category: normalizeCategory(row.category as DbCategory),
    source_price: Number(row.source_price ?? row.price ?? 0),
    price: Number(row.price ?? 0),
    sku: (row.sku as string | null) ?? undefined,
    tags,
    in_stock: Boolean(row.in_stock ?? true),
    stock_quantity: Number(row.stock_quantity ?? 0),
    status: (row.status as Product['status']) ?? 'active',
    images,
    variants,
    seo_title: (row.seo_title as string | null) ?? undefined,
    seo_description: (row.seo_description as string | null) ?? undefined,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export function mapDbProducts(rows: Record<string, unknown>[]): Product[] {
  return rows.map(mapDbProduct);
}
