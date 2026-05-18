'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, ExternalLink, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Badge, Button, Card, ConfirmModal,
  SlideOver, Tabs, SearchInput, EmptyState,
} from '@/components/admin/ui';
import { cn, formatPrice, PRODUCT_STATUS_COLORS, PRODUCT_STATUS_LABELS, timeAgo } from '@/lib/utils';
import { adminPost } from '@/lib/use-admin-api';
import type { AdminProduct } from '@/types';

export default function ApprovalQueuePage() {
  const [products, setProducts]       = useState<AdminProduct[]>([]);

  useEffect(() => {
    fetch('/api/admin/products?per_page=100')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {});
  }, []);
  const [tab, setTab]                 = useState<'pending' | 'active' | 'archived'>('pending');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<AdminProduct | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminProduct | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState<string | null>(null);

  const filtered = products.filter((p) =>
    p.status === tab && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    pending:  products.filter((p) => p.status === 'pending').length,
    active:   products.filter((p) => p.status === 'active').length,
    archived: products.filter((p) => p.status === 'archived').length,
  };

  const approve = async (product: AdminProduct) => {
    setLoading(product.id);
    await adminPost('/api/admin/products/approve', { productId: product.id });
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: 'active' as const } : p));
    toast.success(`"${product.name}" approved and published`);
    setLoading(null);
    if (selected?.id === product.id) setSelected(null);
  };

  const reject = async (product: AdminProduct) => {
    setLoading(product.id);
    await new Promise((r) => setTimeout(r, 600));
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: 'archived' as const } : p));
    toast.success(`"${product.name}" rejected and archived`);
    setLoading(null);
    setRejectTarget(null);
    if (selected?.id === product.id) setSelected(null);
  };

  const bulkApprove = async () => {
    setLoading('bulk');
    await adminPost('/api/admin/products/approve', {
      productIds: Array.from(bulkSelected),
    });
    setProducts((prev) =>
      prev.map((p) => bulkSelected.has(p.id) ? { ...p, status: 'active' as const } : p)
    );
    toast.success(`${bulkSelected.size} products approved`);
    setBulkSelected(new Set());
    setLoading(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Approval Queue"
        subtitle="Review scraped products before they go live on the storefront"
        action={
          bulkSelected.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{bulkSelected.size} selected</span>
              <Button size="sm" loading={loading === 'bulk'} onClick={bulkApprove}>
                <CheckCircle size={14} /> Approve All
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setBulkSelected(new Set())}>
                Clear
              </Button>
            </div>
          ) : undefined
        }
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
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'pending' ? 'No products pending review' : 'No products here'}
            description={tab === 'pending' ? 'Run a scrape to import new products' : undefined}
          />
        ) : (
          <div className="space-y-3">
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
                  {product.images[0]?.url ? (
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
              {selected.images[0]?.url ? (
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
        loading={!!loading && loading !== 'bulk'}
        onConfirm={() => rejectTarget && reject(rejectTarget)}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
