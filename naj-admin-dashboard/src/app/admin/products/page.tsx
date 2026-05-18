'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Package, Plus, Eye, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Card, Badge, Button, Table,
  Pagination, SearchInput, Tabs, EmptyState,
} from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import { formatPrice, formatDate, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS, cn } from '@/lib/utils';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import type { AdminProduct, ProductStatus } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>(MOCK_PRODUCTS);
  const [tab, setTab]     = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState<string | null>(null);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    let list = products;
    if (tab !== 'all') list = list.filter((p) => p.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return list;
  }, [products, tab, search]);

  const counts = {
    all:      products.length,
    active:   products.filter((p) => p.status === 'active').length,
    pending:  products.filter((p) => p.status === 'pending').length,
    archived: products.filter((p) => p.status === 'archived').length,
  };

  const archiveProduct = async (product: AdminProduct) => {
    setLoading(product.id);
    await new Promise((r) => setTimeout(r, 400));
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: 'archived' as const } : p));
    toast.success(`"${product.name}" archived`);
    setLoading(null);
  };

  const restoreProduct = async (product: AdminProduct) => {
    setLoading(product.id);
    await new Promise((r) => setTimeout(r, 400));
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: 'active' as const } : p));
    toast.success(`"${product.name}" restored`);
    setLoading(null);
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
            <p className="text-xs text-gray-400">{p.sku ?? 'No SKU'} · {p.category?.name}</p>
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
        subtitle={`${products.length} total products in catalog`}
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

        <Table<AdminProduct>
          columns={columns}
          data={filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
          keyField="id"
          emptyMessage="No products found"
        />
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </Card>
    </div>
  );
}
