'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Grid2X2, Grid3X3 } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import ShopPagination from '@/components/store/ShopPagination';
import { cn } from '@/lib/utils';
import type { Product, Category, ProductFilters } from '@/types';

const PER_PAGE = 40;

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function ShopContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: 'featured',
    category: searchParams.get('category') ?? undefined,
  });
  const [gridCols, setGridCols] = useState<2 | 3>(3);
  const [priceRange, setPriceRange] = useState<[number, number]>([150, 5000]);
  const [search, setSearch] = useState('');

  const page = useMemo(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const pushShopQuery = useCallback(
    (updates: { page?: number; category?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.category !== undefined) {
        if (updates.category) params.set('category', updates.category);
        else params.delete('category');
        params.delete('page');
      }

      if (updates.page !== undefined) {
        if (updates.page <= 1) params.delete('page');
        else params.set('page', String(updates.page));
      }

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    setFilters((f) => ({
      ...f,
      category: cat ?? undefined,
    }));
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PER_PAGE),
      min_price: String(priceRange[0]),
      max_price: String(priceRange[1]),
      sort_by: filters.sortBy ?? 'featured',
    });
    if (filters.category) params.set('category', filters.category);
    if (search.trim()) params.set('search', search.trim());
    if (filters.inStock) params.set('in_stock', 'true');

    try {
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? (Math.ceil((data.total ?? 0) / PER_PAGE) || 1));
    } catch {
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, priceRange, search, page]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchProducts, search]);

  const searchInitialized = useRef(false);
  useEffect(() => {
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return;
    }
    pushShopQuery({ page: 1 });
    // Only reset pagination when the search query changes, not when page changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handlePageChange = (nextPage: number) => {
    pushShopQuery({ page: nextPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({ sortBy: 'featured' });
    setPriceRange([150, 5000]);
    setSearch('');
    router.push(pathname);
  };

  const hasActiveFilters =
    filters.category || filters.inStock || search || priceRange[0] > 150;

  const heroSubtitle = loading
    ? 'Loading…'
    : totalPages > 1
      ? `Page ${page} of ${totalPages} · ${total} piece${total !== 1 ? 's' : ''}`
      : `${total} piece${total !== 1 ? 's' : ''}`;

  return (
    <>
      <section className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="/images/jewelry-flatlay.png"
          alt="Sterling silver and turquoise rings, cuffs, and necklace on natural stone"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-brand-obsidian/50" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 h-full flex flex-col justify-center">
          <h1
            className="text-heading-lg text-brand-bone"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {filters.category
              ? categories.find((c) => c.slug === filters.category)?.name ?? 'Shop'
              : 'All Jewelry'}
          </h1>
          <p className="text-brand-sand/80 mt-1 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
            {heroSubtitle}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="search"
            placeholder="Search jewelry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base flex-1 min-w-[200px] max-w-xs text-sm"
          />

          <select
            value={filters.category ?? ''}
            onChange={(e) => {
              const value = e.target.value || null;
              setFilters((f) => ({
                ...f,
                category: value ?? undefined,
              }));
              pushShopQuery({ category: value });
            }}
            className="appearance-none input-base pr-8 text-sm py-2 cursor-pointer min-w-[200px] max-w-[280px]"
            style={{ fontFamily: 'var(--font-body)' }}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-3">
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters((f) => ({ ...f, sortBy: e.target.value as ProductFilters['sortBy'] }));
                pushShopQuery({ page: 1 });
              }}
              className="appearance-none input-base pr-8 text-sm py-2 cursor-pointer min-w-[160px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="hidden md:flex border border-brand-bone">
              <button
                onClick={() => setGridCols(2)}
                className={cn(
                  'p-2',
                  gridCols === 2 ? 'bg-brand-obsidian text-brand-bone' : 'text-brand-sienna'
                )}
                aria-label="2 columns"
              >
                <Grid2X2 size={16} />
              </button>
              <button
                onClick={() => setGridCols(3)}
                className={cn(
                  'p-2',
                  gridCols === 3 ? 'bg-brand-obsidian text-brand-bone' : 'text-brand-sienna'
                )}
                aria-label="3 columns"
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={clearFilters}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-brand-sienna">Loading catalog…</div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <p
              className="text-2xl font-light text-brand-obsidian mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No pieces found
            </p>
            <button onClick={clearFilters} className="btn-ghost text-sm">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'grid gap-4 md:gap-6',
                gridCols === 2
                  ? 'grid-cols-2 md:grid-cols-2'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              )}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <ShopPagination
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={PER_PAGE}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-brand-sienna">Loading shop…</div>}>
      <ShopContent />
    </Suspense>
  );
}
