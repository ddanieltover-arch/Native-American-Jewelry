'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  RotateCcw,
  Truck,
  Save,
  User,
  Copy,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, ConfirmModal, Select, Textarea, Input } from '@/components/admin/ui';
import {
  cn,
  formatPrice,
  formatDateTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  getOrderContact,
  formatShippingAddress,
} from '@/lib/utils';
import { adminDelete, adminPatch, adminPost, useAdminApi } from '@/lib/use-admin-api';
import type { AdminOrder, OrderStatus, PaymentStatus } from '@/types';

const ORDER_STATUS_OPTIONS = [
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'payment_uploaded', label: 'Payment Uploaded' },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide shrink-0">
        {label}
      </span>
      {href ? (
        <a href={href} className="text-sm text-blue-600 hover:underline break-all text-left sm:text-right">
          {value}
        </a>
      ) : (
        <span className="text-sm text-gray-900 break-all text-left sm:text-right">{value}</span>
      )}
    </div>
  );
}

function CopyableId({ label, value }: { label: string; value: string }) {
  const copy = () => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-blue-600 max-w-[70%] truncate"
        title="Copy"
      >
        <span className="truncate">{value}</span>
        <Copy size={12} className="flex-shrink-0" />
      </button>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data: order, loading, error, refetch } = useAdminApi<AdminOrder>(`/api/admin/orders/${id}`);

  const [notes, setNotes] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!order) return;
    setNotes(order.notes ?? '');
    setShippingMethod(order.shipping_method ?? '');
  }, [order]);

  const patchOrder = async (updates: Record<string, unknown>, msg: string) => {
    setLoadingAction('save');
    try {
      await adminPatch(`/api/admin/orders/${id}`, updates);
      toast.success(msg);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteOrder = async () => {
    setLoadingAction('delete');
    try {
      await adminDelete(`/api/admin/orders/${id}`);
      toast.success('Order deleted');
      router.push('/admin/orders');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete order');
    } finally {
      setLoadingAction(null);
      setConfirmDelete(false);
    }
  };

  const updatePaymentStatus = async (newStatus: PaymentStatus) => {
    if (!order?.payment) return;
    setLoadingAction('payment');
    try {
      await adminPost(`/api/admin/payments/${order.payment.id}/verify`, {
        status: newStatus,
        notes: {
          customerEmail: order.customer?.email,
          orderNumber: order.order_number,
        },
      });
      toast.success(`Payment marked as ${PAYMENT_STATUS_LABELS[newStatus]}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment update failed');
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 p-8">Loading order…</p>;
  }

  if (error || !order) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-red-600">{error ?? 'Order not found'}</p>
        <Link href="/admin/orders">
          <Button variant="secondary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const contact = getOrderContact(order);
  const addressLines = formatShippingAddress(order.shipping_address);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={14} /> Orders
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <Badge className={cn('text-sm px-3 py-1', ORDER_STATUS_COLORS[order.status])}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Customer & contact">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {contact.fullName || '—'}
                  </p>
                  <Badge className={cn('text-[10px] mt-0.5', contact.isGuest ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800')}>
                    {contact.isGuest ? 'Guest checkout' : 'Registered customer'}
                  </Badge>
                </div>
              </div>
              <DetailRow label="Email" value={contact.email || undefined} href={contact.email ? `mailto:${contact.email}` : undefined} />
              <DetailRow label="Phone" value={contact.phone || undefined} href={contact.phone ? `tel:${contact.phone}` : undefined} />
              <DetailRow label="First name" value={contact.firstName || undefined} />
              <DetailRow label="Last name" value={contact.lastName || undefined} />
              {!contact.email && !contact.fullName && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                  Contact details were not saved on this order (placed before checkout capture was enabled).
                  Shipping address is shown in the Shipping section.
                </p>
              )}
            </div>
          </Card>

          <Card title="Shipping address">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 space-y-0.5">
                {addressLines.length > 0 ? (
                  addressLines.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p className="text-gray-400">No address on file</p>
                )}
              </div>
            </div>
            {order.shipping_method && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                <span className="font-medium text-gray-600">Shipping method at checkout:</span>{' '}
                {order.shipping_method}
              </p>
            )}
          </Card>

          {order.notes && (
            <Card title="Customer message">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}

          <Card title="Items ordered">
            <div className="divide-y divide-gray-100">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <Package size={16} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400">
                      Qty: {item.quantity} × {formatPrice(item.unit_price)}
                      {item.product_id && (
                        <span className="text-gray-300"> · {item.product_id.slice(0, 8)}…</span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>−{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-500">
                <span>Shipping</span>
                <span>{order.shipping_cost === 0 ? 'FREE' : formatPrice(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </Card>

          <Card title="Payment verification">
            {order.payment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{PAYMENT_METHOD_ICONS[order.payment.method]}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {PAYMENT_METHOD_LABELS[order.payment.method]}
                      </p>
                      <p className="text-xs text-gray-500">Amount: {formatPrice(order.payment.amount)}</p>
                    </div>
                  </div>
                  <Badge className={PAYMENT_STATUS_COLORS[order.payment.status]}>
                    {PAYMENT_STATUS_LABELS[order.payment.status]}
                  </Badge>
                </div>

                <div className="space-y-1 border-t border-gray-100 pt-3">
                  <DetailRow label="Payment ID" value={order.payment.id} />
                  <DetailRow
                    label="Submitted"
                    value={formatDateTime(order.payment.created_at)}
                  />
                  <DetailRow label="Transaction ref" value={order.payment.transaction_ref} />
                  <DetailRow label="Transaction note" value={order.payment.transaction_note} />
                  {order.payment.verified_at && (
                    <DetailRow
                      label="Verified at"
                      value={formatDateTime(order.payment.verified_at)}
                    />
                  )}
                </div>

                {order.payment.proof_url && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Payment proof</p>
                    <a href={order.payment.proof_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={order.payment.proof_url}
                        alt="Payment proof"
                        className="w-full max-h-64 object-contain bg-gray-50 border border-gray-200 rounded-lg hover:opacity-95"
                      />
                    </a>
                  </div>
                )}

                {order.payment.status === 'uploaded' && (
                  <div className="flex gap-3 pt-2 border-t border-gray-200">
                    <Button
                      className="flex-1"
                      loading={loadingAction === 'payment'}
                      onClick={() => updatePaymentStatus('confirmed')}
                    >
                      <CheckCircle size={14} /> Confirm payment
                    </Button>
                    <Button
                      variant="danger"
                      loading={loadingAction === 'payment'}
                      onClick={() => updatePaymentStatus('failed')}
                    >
                      <XCircle size={14} /> Mark failed
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No payment record</p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Order status">
            <Select
              value={order.status}
              onChange={(e) =>
                patchOrder(
                  { status: e.target.value },
                  `Status → ${ORDER_STATUS_LABELS[e.target.value as OrderStatus]}`
                )
              }
              options={ORDER_STATUS_OPTIONS}
            />
          </Card>

          <Card title="Order summary">
            <div className="space-y-0">
              <CopyableId label="Order ID" value={order.id} />
              <DetailRow label="Order number" value={order.order_number} />
              <DetailRow label="Items" value={`${order.items?.length ?? 0}`} />
              <DetailRow label="Coupon" value={order.coupon_code} />
              <DetailRow label="Last updated" value={formatDateTime(order.updated_at)} />
            </div>
          </Card>

          <Card title="Tracking & fulfillment">
            <Input
              label="Tracking / carrier notes"
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
              placeholder="e.g. USPS 9400…"
            />
            <Button
              className="w-full mt-3"
              size="sm"
              variant="secondary"
              loading={loadingAction === 'save'}
              onClick={() =>
                patchOrder({ shipping_method: shippingMethod || null }, 'Tracking info saved')
              }
            >
              <Truck size={13} /> Save tracking
            </Button>
          </Card>

          <Card title="Internal notes">
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Staff-only notes (not shown to customer)…"
            />
            <Button
              className="w-full mt-2"
              size="sm"
              loading={loadingAction === 'save'}
              onClick={() => patchOrder({ notes: notes || null }, 'Notes saved')}
            >
              <Save size={13} /> Save notes
            </Button>
            {order.notes && (
              <p className="text-xs text-gray-400 mt-2">
                Customer checkout message is shown above. Saving here overwrites the notes field.
              </p>
            )}
          </Card>

          {order.payment?.status === 'confirmed' && order.status !== 'refunded' && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setConfirmRefund(true)}>
              <RotateCcw size={13} /> Process refund
            </Button>
          )}

          <Card title="Danger zone">
            <p className="text-xs text-gray-500 mb-3">
              Permanently remove this order, line items, and payment records. This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={13} /> Delete order
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmRefund}
        title="Process refund"
        message={`Refund ${formatPrice(order.total)} for ${order.order_number}?`}
        confirmLabel="Process refund"
        loading={loadingAction === 'payment'}
        onConfirm={() => {
          updatePaymentStatus('refunded');
          setConfirmRefund(false);
        }}
        onCancel={() => setConfirmRefund(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete order"
        message={`Permanently delete order ${order.order_number}? All line items and payment data will be removed.`}
        confirmLabel="Delete order"
        loading={loadingAction === 'delete'}
        onConfirm={deleteOrder}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
