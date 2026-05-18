'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Eye, Archive, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Card, Badge, Button, Table,
  Pagination, SearchInput, Tabs, EmptyState,
} from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import { formatPrice, formatDate, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS, cn } from '@/lib/utils';
import { adminPost } from '@/lib/use-admin-api';
import type { AdminProduct, ProductStatus } from '@/types';

const PER_PAGE = 20;

type ProductListResponse = {
  products: AdminProduct[];
  total: number;
  page: number;
  perPage: number;
};

async function fetchProductList(
  params: Record<string, string>
): Promise<ProductListResponse> {
  const qs = new URLSearchParams(params);
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  const token = match?.[1];
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${decodeURIComponent(token)}` }
    : {};

  const res = await fetch(`/api/admin/products?${qs}`, { headers, credentials: 'include' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to load products');
  return json;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [tab, setTab] = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<string | null>(null);
  const [counts, setCounts] = useState({ all: 0, active: 0, pending: 0, archived: 0 });

  const loadCounts = useCallback(async () => {
    try {
      const [all, active, pending, archived] = await Promise.all([
        fetchProductList({ per_page: '1', page: '1' }),
        fetchProductList({ status: 'active', per_page: '1', page: '1' }),
        fetchProductList({ status: 'pending', per_page: '1', page: '1' }),
        fetchProductList({ status: 'archived', per_page: '1', page: '1' }),
      ]);
      setCounts({
        all: all.total,
        active: active.total,
        pending: pending.total,
        archived: archived.total,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setListLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(PER_PAGE),
      };
      if (tab !== 'all') params.status = tab;
      if (search.trim()) params.search = search.trim();

      const result = await fetchProductList(params);
      setProducts(result.products);
      setTotal(result.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load products');
      setProducts([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [tab, search, page]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadProducts, search]);

  const archiveProduct = async (product: AdminProduct) => {
    setLoading(product.id);
    try {
      await adminPost('/api/admin/products/reject', { productId: product.id });
      toast.success(`"${product.name}" archived`);
      await loadProducts();
      await loadCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setLoading(null);
    }
  };

  const restoreProduct = async (product: AdminProduct) => {
    setLoading(product.id);
    try {
      await adminPost('/api/admin/products/approve', { productId: product.id });
      toast.success(`"${product.name}" restored to active`);
      await loadProducts();
      await loadCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setLoading(null);
    }
  };

  const columns: Column<AdminProduct>[] = [
    {
      key: 'name', label: 'Product', sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex-shrink-0 flex items-center justify-center border border-gray-100 overflow-hidden">
            {p.images[0]?.url
              ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
              : <Package size={14} className="text-gray-300" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[260px]">{p.name}</p>
            <p className="text-xs text-gray-400">{p.sku ?? 'No SKU'} · {p.category?.name ?? 'Uncategorized'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (p) => <Badge className={PRODUCT_STATUS_COLORS[p.status]}>{PRODUCT_STATUS_LABELS[p.status]}</Badge>,
    },
    {
      key: 'price', label: 'Price', sortable: true,
      render: (p) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{formatPrice(p.price)}</p>
          <p className="text-xs text-gray-400 line-through">{formatPrice(p.source_price)}</p>
        </div>
      ),
    },
    {
      key: 'stock_quantity', label: 'Stock',
      render: (p) => (
        <span className={cn('text-sm', p.stock_quantity <= 2 ? 'text-red-500 font-medium' : 'text-gray-700')}>
          {p.in_stock ? p.stock_quantity : 'Out of Stock'}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Added', sortable: true,
      render: (p) => <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>,
    },
    {
      key: 'actions', label: '',
      render: (p) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Link href={`/admin/products/${p.id}`}>
            <Button size="sm" variant="ghost" title="Edit"><Pencil size={13} /></Button>
          </Link>
          {p.source_url && (
            <a href={p.source_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost"><Eye size={13} /></Button>
            </a>
          )}
          {p.status === 'active' && (
            <Button size="sm" variant="ghost" loading={loading === p.id} onClick={() => archiveProduct(p)}>
              <Archive size={13} />
            </Button>
          )}
          {p.status === 'archived' && (
            <Button size="sm" variant="ghost" loading={loading === p.id} onClick={() => restoreProduct(p)}>
              <RotateCcw size={13} />
            </Button>
          )}
          {p.status === 'pending' && (
            <Link href="/admin/products/approval">
              <Button size="sm">Review</Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        subtitle={`${counts.all} total products in catalog`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/products/approval">
              {counts.pending > 0 && (
                <Button variant="secondary" size="sm">
                  {counts.pending} Pending Approval
                </Button>
              )}
            </Link>
          </div>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Tabs
            active={tab}
            onChange={(k) => { setTab(k as typeof tab); setPage(1); }}
            tabs={[
              { key: 'all',      label: 'All',      count: counts.all      },
              { key: 'active',   label: 'Active',   count: counts.active   },
              { key: 'pending',  label: 'Pending',  count: counts.pending  },
              { key: 'archived', label: 'Archived', count: counts.archived },
            ]}
          />
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or SKU…" className="w-64" />
        </div>

        {listLoading ? (
          <p className="text-sm text-gray-500 py-12 text-center">Loading products…</p>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Run a scrape to import products" />
        ) : (
          <>
            <Table<AdminProduct>
              columns={columns}
              data={products}
              keyField="id"
              emptyMessage="No products found"
              onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
            />
            <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
