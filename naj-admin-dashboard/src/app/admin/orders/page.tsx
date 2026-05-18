'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Download, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Card, Badge, Button, SearchInput,
  Table, Pagination, EmptyState, IconLink,
} from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import {
  formatPrice, formatDateTime, ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS, lookupLabel, lookupColor, cn,
} from '@/lib/utils';
import type { AdminOrder } from '@/types';

const PER_PAGE = 15;

type OrdersResponse = { orders: AdminOrder[]; total: number };

async function fetchOrders(params: Record<string, string>): Promise<OrdersResponse> {
  const qs = new URLSearchParams(params);
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  const token = match?.[1];
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${decodeURIComponent(token)}` }
    : {};
  const res = await fetch(`/api/admin/orders?${qs}`, { headers, credentials: 'include' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to load orders');
  return json;
}

const COLUMNS: Column<AdminOrder>[] = [
  {
    key: 'order_number', label: 'Order', sortable: true,
    render: (o) => (
      <div>
        <Link
          href={`/admin/orders/${o.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {o.order_number}
        </Link>
        <p className="text-xs text-gray-400">{formatDateTime(o.created_at)}</p>
      </div>
    ),
  },
  {
    key: 'customer', label: 'Customer',
    render: (o) => o.customer ? (
      <div>
        <p className="text-sm text-gray-800">{o.customer.first_name} {o.customer.last_name}</p>
        <p className="text-xs text-gray-400">{o.customer.email}</p>
      </div>
    ) : <span className="text-gray-400 text-xs">Guest</span>,
  },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (o) => (
      <Badge className={lookupColor(ORDER_STATUS_COLORS, o.status)}>
        {lookupLabel(ORDER_STATUS_LABELS, o.status)}
      </Badge>
    ),
  },
  {
    key: 'payment', label: 'Payment',
    render: (o) => o.payment ? (
      <span className="text-xs text-gray-600">{lookupLabel(PAYMENT_METHOD_LABELS, o.payment.method, '—')}</span>
    ) : <span className="text-gray-300 text-xs">—</span>,
  },
  {
    key: 'total', label: 'Total', sortable: true,
    render: (o) => <span className="text-sm font-semibold text-gray-900">{formatPrice(o.total)}</span>,
  },
  {
    key: 'items', label: 'Items',
    render: (o) => (
      <span className="text-xs text-gray-500">{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? 's' : ''}</span>
    ),
  },
  {
    key: 'actions', label: 'Actions',
    render: (o) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <IconLink href={`/admin/orders/${o.id}`} title="View details">
          <Eye size={14} />
        </IconLink>
        <IconLink href={`/admin/orders/${o.id}`} title="Edit order">
          <Pencil size={14} />
        </IconLink>
      </div>
    ),
  },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(PER_PAGE),
      };
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const result = await fetchOrders(params);
      setOrders(result.orders);
      setTotal(result.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load orders');
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const tabCounts = {
    all: total,
    awaiting_payment: orders.filter((o) => o.status === 'awaiting_payment').length,
    payment_uploaded: orders.filter((o) => o.status === 'payment_uploaded').length,
    processing: orders.filter((o) => ['processing', 'payment_confirmed'].includes(o.status)).length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${total} orders`}
        action={
          <Button variant="secondary" size="sm" disabled>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="flex gap-2 flex-wrap">
        {[
          { key: '', label: 'All', count: tabCounts.all },
          { key: 'awaiting_payment', label: 'Awaiting', count: tabCounts.awaiting_payment },
          { key: 'payment_uploaded', label: 'Proof Uploaded', count: tabCounts.payment_uploaded },
          { key: 'processing', label: 'Processing', count: tabCounts.processing },
          { key: 'shipped', label: 'Shipped', count: tabCounts.shipped },
          { key: 'delivered', label: 'Delivered', count: tabCounts.delivered },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setStatus(t.key); setPage(1); }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
              status === t.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            {t.label}
            <span className="ml-1.5 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search order #…"
            className="flex-1 min-w-[200px] max-w-sm"
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 py-12 text-center">Loading orders…</p>
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Orders from checkout will appear here" />
        ) : (
          <>
            <Table<AdminOrder>
              columns={COLUMNS}
              data={orders}
              keyField="id"
              onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
              emptyMessage="No orders found"
            />
            <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
