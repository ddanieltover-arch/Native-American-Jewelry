'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Package, MapPin, CreditCard, RotateCcw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, ConfirmModal, Select } from '@/components/admin/ui';
import {
  cn, formatPrice, formatDateTime, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS,
} from '@/lib/utils';
import { MOCK_ORDERS } from '@/lib/mock-data';
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

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'awaiting_payment',  label: 'Order Placed'       },
  { status: 'payment_uploaded',  label: 'Payment Uploaded'   },
  { status: 'payment_confirmed', label: 'Payment Verified'   },
  { status: 'processing',        label: 'Processing'         },
  { status: 'shipped',           label: 'Shipped'            },
  { status: 'delivered',         label: 'Delivered'          },
];

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  TIMELINE_STEPS.map((s, i) => [s.status, i])
);

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const initial = MOCK_ORDERS.find((o) => o.id === id) ?? MOCK_ORDERS[0];

  const [order, setOrder]             = useState<AdminOrder>(initial);
  const [loading, setLoading]         = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showTracking, setShowTracking]     = useState(false);

  const currentStep = STEP_INDEX[order.status] ?? -1;

  const updatePaymentStatus = async (newStatus: PaymentStatus) => {
    setLoading('payment');
    await new Promise((r) => setTimeout(r, 600));
    setOrder((prev) => ({
      ...prev,
      payment: prev.payment ? { ...prev.payment, status: newStatus, verified_at: new Date().toISOString() } : prev.payment,
      status: newStatus === 'confirmed' ? 'processing' : newStatus === 'failed' ? 'cancelled' : prev.status,
    }));
    toast.success(`Payment marked as ${PAYMENT_STATUS_LABELS[newStatus]}`);
    setLoading(null);
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    setLoading('status');
    await new Promise((r) => setTimeout(r, 400));
    setOrder((prev) => ({ ...prev, status: newStatus }));
    toast.success(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
    setLoading(null);
  };

  const processRefund = async () => {
    setLoading('refund');
    await new Promise((r) => setTimeout(r, 700));
    setOrder((prev) => ({
      ...prev,
      status: 'refunded',
      payment: prev.payment ? { ...prev.payment, status: 'refunded' } : prev.payment,
    }));
    toast.success('Refund processed');
    setLoading(null);
    setConfirmRefund(false);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
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

      {/* Order timeline */}
      {!['cancelled', 'refunded'].includes(order.status) && (
        <Card title="Order Progress">
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done    = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={step.status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                      done && !current && 'border-green-500 bg-green-500 text-white',
                      current && 'border-blue-500 bg-blue-500 text-white',
                      !done && 'border-gray-200 bg-white text-gray-400'
                    )}>
                      {done && !current ? <CheckCircle size={14} /> : i + 1}
                    </div>
                    <p className={cn('text-[10px] mt-1 text-center max-w-[70px] leading-tight',
                      done ? 'text-gray-700 font-medium' : 'text-gray-400'
                    )}>
                      {step.label}
                    </p>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mb-5 mx-1', i < currentStep ? 'bg-green-400' : 'bg-gray-200')} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: items + payment */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order items */}
          <Card title="Items Ordered">
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
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

          {/* Payment verification */}
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

                {order.payment.transaction_ref && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Transaction Reference</p>
                    <p className="text-sm font-mono text-gray-800">{order.payment.transaction_ref}</p>
                  </div>
                )}

                {order.payment.transaction_note && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Customer Note</p>
                    <p className="text-sm text-gray-700">{order.payment.transaction_note}</p>
                  </div>
                )}

                {/* Payment proof */}
                {order.payment.proof_url ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Payment Proof</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={order.payment.proof_url}
                        alt="Payment proof"
                        className="w-full max-h-64 object-contain bg-gray-50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                    No payment proof uploaded yet
                  </div>
                )}

                {order.payment.verified_at && (
                  <p className="text-xs text-gray-400">
                    Verified {formatDateTime(order.payment.verified_at)}
                  </p>
                )}

                {/* Verification actions */}
                {order.payment.status === 'uploaded' && (
                  <div className="flex gap-3 pt-2 border-t border-gray-200">
                    <Button
                      className="flex-1"
                      loading={loading === 'payment'}
                      onClick={() => updatePaymentStatus('confirmed')}
                    >
                      <CheckCircle size={14} /> Confirm Payment
                    </Button>
                    <Button
                      variant="danger"
                      loading={loading === 'payment'}
                      onClick={() => updatePaymentStatus('failed')}
                    >
                      <XCircle size={14} /> Mark Failed
                    </Button>
                  </div>
                )}

                {order.payment.status === 'confirmed' && order.status !== 'refunded' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmRefund(true)}
                    className="w-full"
                  >
                    <RotateCcw size={13} /> Process Refund
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No payment record</p>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Status control */}
          <Card title="Order Status">
            <Select
              value={order.status}
              onChange={(e) => updateOrderStatus(e.target.value as OrderStatus)}
              options={ORDER_STATUS_OPTIONS}
            />
            {loading === 'status' && <p className="text-xs text-gray-400 mt-2">Updating…</p>}
          </Card>

          {/* Shipping info */}
          <Card title="Shipping">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p>{order.shipping_address.line1}</p>
                  {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</p>
                  <p>{order.shipping_address.country}</p>
                </div>
              </div>
              {order.shipping_method && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Truck size={13} />
                  <span>{order.shipping_method}</span>
                </div>
              )}
              {order.status === 'processing' && (
                <div>
                  {showTracking ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking #"
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          updateOrderStatus('shipped');
                          setShowTracking(false);
                          toast.success('Order marked as shipped');
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowTracking(true)}
                    >
                      <Truck size={13} /> Mark as Shipped
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Customer */}
          <Card title="Customer">
            {order.customer ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {order.customer.first_name} {order.customer.last_name}
                </p>
                <p className="text-xs text-gray-500">{order.customer.email}</p>
                {order.customer.phone && <p className="text-xs text-gray-500">{order.customer.phone}</p>}
                <Link href={`/admin/customers`}>
                  <Button variant="ghost" size="sm" className="mt-1 -ml-1">View Profile →</Button>
                </Link>
              </div>
            ) : <p className="text-sm text-gray-400">Guest order</p>}
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card title="Order Notes">
              <p className="text-sm text-gray-700">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmRefund}
        title="Process Refund"
        message={`Are you sure you want to refund ${formatPrice(order.total)} for order ${order.order_number}? This cannot be undone.`}
        confirmLabel="Process Refund"
        loading={loading === 'refund'}
        onConfirm={processRefund}
        onCancel={() => setConfirmRefund(false)}
      />
    </div>
  );
}
