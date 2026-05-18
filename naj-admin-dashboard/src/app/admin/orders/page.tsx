'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Download, Filter } from 'lucide-react';
import {
  PageHeader, Card, Badge, Button, SearchInput,
  Table, Pagination, Tabs, EmptyState, Select,
} from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import {
  formatPrice, formatDateTime, ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS, cn,
} from '@/lib/utils';
import { MOCK_ORDERS } from '@/lib/mock-data';
import type { AdminOrder, OrderStatus } from '@/types';

const ALL_STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'awaiting_payment',  label: 'Awaiting Payment'  },
  { value: 'payment_uploaded',  label: 'Payment Uploaded'  },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'processing',        label: 'Processing'        },
  { value: 'shipped',           label: 'Shipped'           },
  { value: 'delivered',         label: 'Delivered'         },
  { value: 'cancelled',         label: 'Cancelled'         },
  { value: 'refunded',          label: 'Refunded'          },
];

const COLUMNS: Column<AdminOrder>[] = [
  {
    key: 'order_number', label: 'Order', sortable: true,
    render: (o) => (
      <div>
        <p className="text-sm font-semibold text-gray-900">{o.order_number}</p>
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
    render: (o) => <Badge className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>,
  },
  {
    key: 'payment', label: 'Payment',
    render: (o) => o.payment ? (
      <span className="text-xs text-gray-600">
        {PAYMENT_METHOD_LABELS[o.payment.method]}
      </span>
    ) : <span className="text-gray-300 text-xs">—</span>,
  },
  {
    key: 'total', label: 'Total', sortable: true,
    render: (o) => <span className="text-sm font-semibold text-gray-900">{formatPrice(o.total)}</span>,
  },
  {
    key: 'items', label: 'Items',
    render: (o) => (
      <span className="text-xs text-gray-500">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</span>
    ),
  },
];

export default function OrdersPage() {
  const router  = useRouter();
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    let list = [...MOCK_ORDERS];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer?.email.toLowerCase().includes(q) ||
          o.customer?.first_name?.toLowerCase().includes(q)
      );
    }

    if (status) list = list.filter((o) => o.status === status);

    list.sort((a, b) => {
      let aVal: string | number = a[sortKey as keyof AdminOrder] as string | number ?? '';
      let bVal: string | number = b[sortKey as keyof AdminOrder] as string | number ?? '';
      if (sortKey === 'total') { aVal = Number(aVal); bVal = Number(bVal); }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return list;
  }, [search, status, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  // Status tab counts
  const tabCounts = useMemo(() => ({
    all:              MOCK_ORDERS.length,
    awaiting_payment: MOCK_ORDERS.filter((o) => o.status === 'awaiting_payment').length,
    payment_uploaded: MOCK_ORDERS.filter((o) => o.status === 'payment_uploaded').length,
    processing:       MOCK_ORDERS.filter((o) => ['processing', 'payment_confirmed'].includes(o.status)).length,
    shipped:          MOCK_ORDERS.filter((o) => o.status === 'shipped').length,
    delivered:        MOCK_ORDERS.filter((o) => o.status === 'delivered').length,
  }), []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${MOCK_ORDERS.length} total orders`}
        action={
          <Button variant="secondary" size="sm">
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      {/* Quick filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: '',               label: 'All',       count: tabCounts.all              },
          { key: 'awaiting_payment', label: '⏳ Awaiting', count: tabCounts.awaiting_payment },
          { key: 'payment_uploaded', label: '📎 Proof Uploaded', count: tabCounts.payment_uploaded },
          { key: 'processing',     label: 'Processing',count: tabCounts.processing       },
          { key: 'shipped',        label: '🚚 Shipped', count: tabCounts.shipped          },
          { key: 'delivered',      label: '✅ Delivered',count: tabCounts.delivered       },
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
            placeholder="Search order #, customer email…"
            className="flex-1 min-w-[200px] max-w-sm"
          />
        </div>

        <Table<AdminOrder>
          columns={COLUMNS}
          data={paginated}
          keyField="id"
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
          emptyMessage="No orders found"
        />
        <Pagination
          page={page}
          total={filtered.length}
          perPage={PER_PAGE}
          onChange={setPage}
        />
      </Card>
    </div>
  );
}
