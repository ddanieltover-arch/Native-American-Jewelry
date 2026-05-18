'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Eye, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Card, Badge, Button, SlideOver,
  Table, Pagination, Tabs, EmptyState, SearchInput,
} from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import {
  formatPrice, formatDateTime, timeAgo,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from '@/lib/utils';
import { MOCK_ORDERS } from '@/lib/mock-data';
import type { AdminOrder, PaymentStatus } from '@/types';

export default function PaymentsPage() {
  const [orders, setOrders]       = useState<AdminOrder[]>(MOCK_ORDERS);
  const [tab, setTab]             = useState<'all' | 'uploaded' | 'confirmed' | 'pending' | 'failed'>('uploaded');
  const [search, setSearch]       = useState('');
  const [preview, setPreview]     = useState<AdminOrder | null>(null);
  const [loading, setLoading]     = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    let list = orders.filter((o) => o.payment != null);
    if (tab !== 'all') list = list.filter((o) => o.payment?.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer?.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, tab, search]);

  const counts = useMemo(() => ({
    all:       orders.filter((o) => o.payment).length,
    uploaded:  orders.filter((o) => o.payment?.status === 'uploaded').length,
    pending:   orders.filter((o) => o.payment?.status === 'pending').length,
    confirmed: orders.filter((o) => o.payment?.status === 'confirmed').length,
    failed:    orders.filter((o) => o.payment?.status === 'failed').length,
  }), [orders]);

  const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
    setLoading(`${orderId}-${newStatus}`);
    await new Promise((r) => setTimeout(r, 600));
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus === 'confirmed' ? 'processing' : newStatus === 'failed' ? 'cancelled' : o.status,
              payment: o.payment ? { ...o.payment, status: newStatus, verified_at: new Date().toISOString() } : o.payment,
            }
          : o
      )
    );
    toast.success(`Payment ${PAYMENT_STATUS_LABELS[newStatus].toLowerCase()}`);
    setLoading(null);
    if (preview?.id === orderId) {
      setPreview((p) =>
        p ? { ...p, payment: p.payment ? { ...p.payment, status: newStatus } : p.payment } : p
      );
    }
  };

  const columns: Column<AdminOrder>[] = [
    {
      key: 'order_number', label: 'Order', sortable: true,
      render: (o) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{o.order_number}</p>
          <p className="text-xs text-gray-400">{timeAgo(o.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (o) => (
        <div>
          <p className="text-sm text-gray-800">{o.customer?.first_name} {o.customer?.last_name}</p>
          <p className="text-xs text-gray-400">{o.customer?.email}</p>
        </div>
      ),
    },
    {
      key: 'method', label: 'Method',
      render: (o) => o.payment ? (
        <span className="flex items-center gap-1.5 text-sm text-gray-700">
          <span>{PAYMENT_METHOD_ICONS[o.payment.method]}</span>
          {PAYMENT_METHOD_LABELS[o.payment.method]}
        </span>
      ) : null,
    },
    {
      key: 'amount', label: 'Amount',
      render: (o) => (
        <span className="text-sm font-semibold text-gray-900">
          {o.payment ? formatPrice(o.payment.amount) : '—'}
        </span>
      ),
    },
    {
      key: 'payment_status', label: 'Payment Status',
      render: (o) => o.payment ? (
        <Badge className={PAYMENT_STATUS_COLORS[o.payment.status]}>
          {PAYMENT_STATUS_LABELS[o.payment.status]}
        </Badge>
      ) : null,
    },
    {
      key: 'proof', label: 'Proof',
      render: (o) => (
        <span className={o.payment?.proof_url ? 'text-green-600 text-xs font-medium' : 'text-gray-300 text-xs'}>
          {o.payment?.proof_url ? '✓ Uploaded' : 'Not uploaded'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (o) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setPreview(o)}>
            <Eye size={13} />
          </Button>
          {o.payment?.status === 'uploaded' && (
            <>
              <Button
                size="sm"
                loading={loading === `${o.id}-confirmed`}
                onClick={() => updatePaymentStatus(o.id, 'confirmed')}
              >
                <CheckCircle size={13} /> Confirm
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={loading === `${o.id}-failed`}
                onClick={() => updatePaymentStatus(o.id, 'failed')}
              >
                <XCircle size={13} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment Verification"
        subtitle="Review and confirm manual payments from customers"
      />

      {/* Priority alert */}
      {counts.uploaded > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <CreditCard size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {counts.uploaded} payment{counts.uploaded > 1 ? 's' : ''} with uploaded proof waiting for verification
          </span>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Tabs
            active={tab}
            onChange={(k) => { setTab(k as typeof tab); setPage(1); }}
            tabs={[
              { key: 'uploaded',  label: '📎 Needs Review', count: counts.uploaded  },
              { key: 'pending',   label: 'Pending',         count: counts.pending   },
              { key: 'confirmed', label: '✅ Confirmed',    count: counts.confirmed },
              { key: 'failed',    label: '❌ Failed',       count: counts.failed    },
              { key: 'all',       label: 'All',             count: counts.all       },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Order #, customer…" className="w-60" />
        </div>

        <Table<AdminOrder>
          columns={columns}
          data={filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
          keyField="id"
          emptyMessage={tab === 'uploaded' ? 'No payments need verification' : 'No payments found'}
        />
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </Card>

      {/* Payment detail slide-over */}
      <SlideOver
        open={!!preview}
        title={`Payment — ${preview?.order_number}`}
        onClose={() => setPreview(null)}
      >
        {preview?.payment && (
          <div className="space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Payment Status</span>
              <Badge className={PAYMENT_STATUS_COLORS[preview.payment.status]}>
                {PAYMENT_STATUS_LABELS[preview.payment.status]}
              </Badge>
            </div>

            {/* Method + amount */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <span className="text-3xl">{PAYMENT_METHOD_ICONS[preview.payment.method]}</span>
              <div>
                <p className="text-base font-bold text-gray-900">{formatPrice(preview.payment.amount)}</p>
                <p className="text-sm text-gray-500">{PAYMENT_METHOD_LABELS[preview.payment.method]}</p>
              </div>
            </div>

            {/* Order info */}
            <div className="space-y-2">
              {[
                ['Order', preview.order_number],
                ['Customer', preview.customer?.email ?? 'Guest'],
                ['Placed', formatDateTime(preview.created_at)],
                ['Order Status', ORDER_STATUS_LABELS[preview.status]],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>

            {/* Reference */}
            {preview.payment.transaction_ref && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Transaction Reference</p>
                <p className="text-sm font-mono text-gray-800">{preview.payment.transaction_ref}</p>
              </div>
            )}

            {/* Customer note */}
            {preview.payment.transaction_note && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Customer Note</p>
                <p className="text-sm text-gray-700">{preview.payment.transaction_note}</p>
              </div>
            )}

            {/* Proof image */}
            {preview.payment.proof_url ? (
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Payment Proof</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <img
                    src={preview.payment.proof_url}
                    alt="Payment proof screenshot"
                    className="w-full object-contain max-h-72"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-700 font-medium">No proof uploaded yet</p>
                <p className="text-xs text-amber-600 mt-1">Customer has not uploaded payment screenshot</p>
              </div>
            )}

            {/* Verified info */}
            {preview.payment.verified_at && (
              <p className="text-xs text-gray-400 text-center">
                Verified {formatDateTime(preview.payment.verified_at)}
              </p>
            )}

            {/* Actions */}
            {preview.payment.status === 'uploaded' && (
              <div className="flex gap-3 pt-3 border-t border-gray-200">
                <Button
                  className="flex-1"
                  loading={loading === `${preview.id}-confirmed`}
                  onClick={() => updatePaymentStatus(preview.id, 'confirmed')}
                >
                  <CheckCircle size={14} /> Confirm Payment
                </Button>
                <Button
                  variant="danger"
                  loading={loading === `${preview.id}-failed`}
                  onClick={() => updatePaymentStatus(preview.id, 'failed')}
                >
                  <XCircle size={14} /> Failed
                </Button>
              </div>
            )}

            <Link href={`/admin/orders/${preview.id}`}>
              <Button variant="secondary" className="w-full">View Full Order →</Button>
            </Link>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
