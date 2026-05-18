'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Package, MapPin, RotateCcw, Truck, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, ConfirmModal, Select, Textarea, Input } from '@/components/admin/ui';
import {
  cn, formatPrice, formatDateTime,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS,
} from '@/lib/utils';
import { adminPatch, adminPost, useAdminApi } from '@/lib/use-admin-api';
import type { AdminOrder, OrderStatus, PaymentStatus } from '@/types';

const ORDER_STATUS_OPTIONS = [
  { value: 'awaiting_payment',  label: 'Awaiting Payment'  },
  { value: 'payment_uploaded',  label: 'Payment Uploaded'  },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'processing',        label: 'Processing'        },
  { value: 'shipped',           label: 'Shipped'           },
  { value: 'delivered',         label: 'Delivered'         },
  { value: 'cancelled',         label: 'Cancelled'         },
  { value: 'refunded',          label: 'Refunded'          },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, loading, error, refetch } = useAdminApi<AdminOrder>(`/api/admin/orders/${id}`);

  const [notes, setNotes] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);

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
        <Link href="/admin/orders"><Button variant="secondary">Back to Orders</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="sm"><ArrowLeft size={14} /> Orders</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <Badge className={cn('text-sm px-3 py-1', ORDER_STATUS_COLORS[order.status])}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Items Ordered">
            <div className="divide-y divide-gray-100">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <Package size={16} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
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
                <span>Total</span><span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </Card>

          <Card title="Payment Verification">
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

                {order.payment.proof_url && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Payment Proof</p>
                    <img
                      src={order.payment.proof_url}
                      alt="Payment proof"
                      className="w-full max-h-64 object-contain bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                )}

                {order.payment.status === 'uploaded' && (
                  <div className="flex gap-3 pt-2 border-t border-gray-200">
                    <Button className="flex-1" loading={loadingAction === 'payment'} onClick={() => updatePaymentStatus('confirmed')}>
                      <CheckCircle size={14} /> Confirm Payment
                    </Button>
                    <Button variant="danger" loading={loadingAction === 'payment'} onClick={() => updatePaymentStatus('failed')}>
                      <XCircle size={14} /> Mark Failed
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
          <Card title="Order Status">
            <Select
              value={order.status}
              onChange={(e) => patchOrder({ status: e.target.value }, `Status → ${ORDER_STATUS_LABELS[e.target.value as OrderStatus]}`)}
              options={ORDER_STATUS_OPTIONS}
            />
          </Card>

          <Card title="Shipping">
            <Input
              label="Shipping / tracking"
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
              placeholder="e.g. USPS 9400…"
            />
            <Button
              className="w-full mt-3"
              size="sm"
              variant="secondary"
              loading={loadingAction === 'save'}
              onClick={() => patchOrder({ shipping_method: shippingMethod || null }, 'Shipping info saved')}
            >
              <Truck size={13} /> Save shipping
            </Button>
            <div className="flex items-start gap-2 mt-4">
              <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p>{order.shipping_address.line1}</p>
                {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</p>
                <p>{order.shipping_address.country}</p>
              </div>
            </div>
          </Card>

          <Card title="Order Notes">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" />
            <Button
              className="w-full mt-2"
              size="sm"
              loading={loadingAction === 'save'}
              onClick={() => patchOrder({ notes: notes || null }, 'Notes saved')}
            >
              <Save size={13} /> Save notes
            </Button>
          </Card>

          {order.payment?.status === 'confirmed' && order.status !== 'refunded' && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setConfirmRefund(true)}>
              <RotateCcw size={13} /> Process Refund
            </Button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmRefund}
        title="Process Refund"
        message={`Refund ${formatPrice(order.total)} for ${order.order_number}?`}
        confirmLabel="Process Refund"
        loading={loadingAction === 'payment'}
        onConfirm={() => { updatePaymentStatus('refunded'); setConfirmRefund(false); }}
        onCancel={() => setConfirmRefund(false)}
      />
    </div>
  );
}
