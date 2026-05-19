'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Eye, ExternalLink, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Badge, Button, Card, ConfirmModal,
  SlideOver, Tabs, SearchInput, EmptyState,
} from '@/components/admin/ui';
import { cn, formatPrice, PRODUCT_STATUS_COLORS, PRODUCT_STATUS_LABELS, timeAgo } from '@/lib/utils';
import { adminPost } from '@/lib/use-admin-api';
import type { AdminProduct } from '@/types';

type ProductListResponse = {
  products: AdminProduct[];
  total: number;
};

async function fetchProducts(
  status: string,
  search: string
): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    status,
    per_page: '100',
  });
  if (search.trim()) params.set('search', search.trim());

  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  const token = match?.[1];
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${decodeURIComponent(token)}` }
    : {};

  const res = await fetch(`/api/admin/products?${params}`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to load products');
  return json;
}

async function fetchStatusTotal(status: string): Promise<number> {
  const res = await fetchProducts(status, '');
  return res.total;
}

export default function ApprovalQueuePage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'active' | 'archived'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminProduct | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, active: 0, archived: 0 });

  const loadCounts = useCallback(async () => {
    try {
      const [pending, active, archived] = await Promise.all([
        fetchStatusTotal('pending'),
        fetchStatusTotal('active'),
        fetchStatusTotal('archived'),
      ]);
      setCounts({ pending, active, archived });
    } catch {
      /* ignore count errors */
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setListLoading(true);
    try {
      const { products: list } = await fetchProducts(tab, search);
      setProducts(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setListLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadProducts, search]);

  useEffect(() => {
    setBulkSelected(new Set());
  }, [tab]);

  const filtered = products;
  const pendingIds = tab === 'pending' ? filtered.map((p) => p.id) : [];
  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => bulkSelected.has(id));
  const somePendingSelected =
    pendingIds.some((id) => bulkSelected.has(id)) && !allPendingSelected;

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(pendingIds));
    }
  };

  const approve = async (product: AdminProduct) => {
    setLoading(product.id);
    try {
      await adminPost('/api/admin/products/approve', { productId: product.id });
      toast.success(`"${product.name}" approved and published`);
      setBulkSelected((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      if (selected?.id === product.id) setSelected(null);
      await loadProducts();
      await loadCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setLoading(null);
    }
  };

  const reject = async (product: AdminProduct) => {
    setLoading(product.id);
    try {
      await adminPost('/api/admin/products/reject', { productId: product.id });
      toast.success(`"${product.name}" rejected and archived`);
      setRejectTarget(null);
      setBulkSelected((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      if (selected?.id === product.id) setSelected(null);
      await loadProducts();
      await loadCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setLoading(null);
    }
  };

  const bulkApprove = async () => {
    const ids = Array.from(bulkSelected);
    if (!ids.length) return;
    setLoading('bulk-approve');
    try {
      await adminPost('/api/admin/products/approve', { productIds: ids });
      toast.success(`${ids.length} product${ids.length === 1 ? '' : 's'} approved`);
      setBulkSelected(new Set());
      await loadProducts();
      await loadCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk approve failed');
    } finally {
      setLoading(null);
    }
  };

  const bulkReject = async () => {
    const ids = Array.from(bulkSelected);
    if (!ids.length) return;
    setLoading('bulk-reject');
    try {
      await adminPost('/api/admin/products/reject', { productIds: ids });
      toast.success(`${ids.length} product${ids.length === 1 ? '' : 's'} rejected`);
      setBulkSelected(new Set());
      setBulkRejectOpen(false);
      await loadProducts();
      await loadCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk reject failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Approval Queue"
        subtitle="Review scraped products before they go live on the storefront"
      />

      <Card>
        {/* Tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as typeof tab)}
            tabs={[
              { key: 'pending',  label: 'Pending',  count: counts.pending  },
              { key: 'active',   label: 'Approved', count: counts.active   },
              { key: 'archived', label: 'Rejected', count: counts.archived },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="w-64" />
        </div>

        {/* Product list */}
        {listLoading ? (
          <p className="text-sm text-gray-500 py-12 text-center">Loading products…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'pending' ? 'No products pending review' : 'No products here'}
            description={tab === 'pending' ? 'Run a scrape to import new products' : undefined}
          />
        ) : (
          <div className="space-y-3">
            {tab === 'pending' && filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={allPendingSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePendingSelected;
                    }}
                    onChange={toggleSelectAll}
                  />
                  Select all on this page ({filtered.length})
                </label>

                {bulkSelected.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {bulkSelected.size} selected
                    </span>
                    <Button
                      size="sm"
                      loading={loading === 'bulk-approve'}
                      onClick={bulkApprove}
                    >
                      <CheckCircle size={14} /> Approve selected
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={loading === 'bulk-reject'}
                      onClick={() => setBulkRejectOpen(true)}
                    >
                      <XCircle size={14} /> Reject selected
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setBulkSelected(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            )}

            {filtered.map((product) => (
              <div
                key={product.id}
                className={cn(
                  'flex items-start gap-4 p-4 border rounded-lg transition-colors',
                  bulkSelected.has(product.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                {/* Checkbox */}
                {tab === 'pending' && (
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-300"
                    checked={bulkSelected.has(product.id)}
                    onChange={() => {
                      const next = new Set(bulkSelected);
                      next.has(product.id) ? next.delete(product.id) : next.add(product.id);
                      setBulkSelected(next);
                    }}
                  />
                )}

                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200">
                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={20} className="text-gray-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{product.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {product.category?.name} · SKU: {product.sku ?? 'N/A'} · {timeAgo(product.created_at)}
                      </p>
                    </div>
                    <Badge className={PRODUCT_STATUS_COLORS[product.status]}>
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{product.description}</p>

                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
                      <span className="text-xs text-gray-400 line-through ml-1.5">{formatPrice(product.source_price)}</span>
                      <span className="text-xs text-green-600 ml-1">−5%</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {product.tags.slice(0, 3).join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(product)}>
                    <Eye size={13} /> Preview
                  </Button>

                  {tab === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        loading={loading === product.id}
                        onClick={() => approve(product)}
                      >
                        <CheckCircle size={13} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setRejectTarget(product)}
                      >
                        <XCircle size={13} /> Reject
                      </Button>
                    </>
                  )}

                  {product.source_url && (
                    <a href={product.source_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">
                        <ExternalLink size={13} /> Source
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preview slide-over */}
      <SlideOver
        open={!!selected}
        title="Product Preview"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-5">
            {/* Image */}
            <div className="aspect-square bg-gradient-to-br from-amber-50 to-stone-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
              {selected.images?.[0]?.url ? (
                <img src={selected.images[0].url} alt={selected.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={40} className="text-gray-300" />
              )}
            </div>

            {/* Details */}
            <div>
              <Badge className={PRODUCT_STATUS_COLORS[selected.status]}>{PRODUCT_STATUS_LABELS[selected.status]}</Badge>
              <h2 className="text-lg font-semibold text-gray-900 mt-2">{selected.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{selected.category?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ['Source Price', formatPrice(selected.source_price)],
                ['Store Price', formatPrice(selected.price)],
                ['SKU', selected.sku ?? 'N/A'],
                ['Stock', selected.stock_quantity],
                ['In Stock', selected.in_stock ? 'Yes' : 'No'],
                ['Category', selected.category?.name ?? 'N/A'],
              ].map(([l, v]) => (
                <div key={String(l)}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {selected.description && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
              </div>
            )}

            {selected.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.source_url && (
              <a href={selected.source_url} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="w-full">
                  <ExternalLink size={14} /> View Source Page
                </Button>
              </a>
            )}

            {selected.status === 'pending' && (
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <Button
                  className="flex-1"
                  loading={loading === selected.id}
                  onClick={() => approve(selected)}
                >
                  <CheckCircle size={14} /> Approve & Publish
                </Button>
                <Button
                  variant="danger"
                  onClick={() => { setRejectTarget(selected); setSelected(null); }}
                >
                  <XCircle size={14} /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* Reject confirm */}
      <ConfirmModal
        open={!!rejectTarget}
        title="Reject Product"
        message={`Are you sure you want to reject "${rejectTarget?.name}"? It will be archived and not shown on the storefront.`}
        confirmLabel="Reject Product"
        loading={!!loading && !String(loading).startsWith('bulk')}
        onConfirm={() => rejectTarget && reject(rejectTarget)}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmModal
        open={bulkRejectOpen}
        title="Reject selected products"
        message={`Reject ${bulkSelected.size} product${bulkSelected.size === 1 ? '' : 's'}? They will be archived and hidden from the storefront.`}
        confirmLabel={`Reject ${bulkSelected.size}`}
        loading={loading === 'bulk-reject'}
        onConfirm={bulkReject}
        onCancel={() => setBulkRejectOpen(false)}
      />
    </div>
  );
}
