import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/db';
import { mapDbProducts } from '@/lib/product-mapper';
import type { ProductFilters } from '@/lib/db';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  try {
    const result = await getProducts({
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      sortBy: (searchParams.get('sort_by') ?? 'featured') as ProductFilters['sortBy'],
      minPrice: searchParams.get('min_price')
        ? parseFloat(searchParams.get('min_price')!)
        : 150,
      maxPrice: searchParams.get('max_price')
        ? parseFloat(searchParams.get('max_price')!)
        : undefined,
      inStock: searchParams.get('in_stock') === 'true' ? true : undefined,
      page: parseInt(searchParams.get('page') ?? '1'),
      perPage: parseInt(searchParams.get('per_page') ?? '24'),
    });

    const products = mapDbProducts(result.products as Record<string, unknown>[]);

    return NextResponse.json(
      {
        products,
        data: products,
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: result.totalPages,
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err) {
    console.error('GET /api/products:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
