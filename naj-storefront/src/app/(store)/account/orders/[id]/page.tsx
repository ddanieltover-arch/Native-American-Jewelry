'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { formatPrice, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import type { PaymentMethod } from '@/types';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('orders')
      .select('*, items:order_items(*), payment:payments(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => setOrder(data as Record<string, unknown>));
  }, [id]);

  if (!order) {
    return <div className="p-10 text-center text-brand-sienna">Loading order…</div>;
  }

  const payment = Array.isArray(order.payment) ? order.payment[0] : order.payment;
  const items = (order.items as { product_name: string; quantity: number; subtotal: number }[]) ?? [];
  const paymentMethod = payment
    ? PAYMENT_METHOD_LABELS[(payment as { method: PaymentMethod }).method]
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-brand-sienna mb-6">
        <ArrowLeft size={14} /> Back to orders
      </Link>
      <h1 className="text-heading-md text-brand-obsidian mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Order {order.order_number as string}
      </h1>
      <p className="text-sm text-brand-sienna mb-6">
        Status: {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? String(order.status)}
      </p>
      <ul className="border border-brand-bone divide-y mb-6">
        {items.map((item, i) => (
          <li key={i} className="flex justify-between p-4 text-sm">
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <span>{formatPrice(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <p className="font-medium mb-6">Total: {formatPrice(order.total as number)}</p>

      {payment && (payment as { status: string }).status === 'pending' && (
        <div className="bg-brand-bone border border-brand-sand/30 p-4 text-sm text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
          <p className="font-medium text-brand-obsidian mb-2">Payment</p>
          <p className="mb-2">
            Your order is confirmed{paymentMethod ? ` (${paymentMethod})` : ''}. Our team will contact you as soon as
            possible with secure payment instructions.
          </p>
          <p className="text-xs">Please wait for our message before sending payment.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-6">
        <Link href="/shop" className="btn-primary text-sm">
          Continue shopping
        </Link>
        <Link href="/contact" className="btn-ghost text-sm">
          Contact us
        </Link>
      </div>
    </div>
  );
}
