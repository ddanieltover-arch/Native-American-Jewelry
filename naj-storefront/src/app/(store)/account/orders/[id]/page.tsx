'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-client';
import { formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('orders')
      .select('*, items:order_items(*), payment:payments(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => setOrder(data as Record<string, unknown>));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('proof', file);
    try {
      const res = await fetch(`/api/orders/${id}/proof`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Payment proof uploaded');
    } catch {
      toast.error('Could not upload proof');
    } finally {
      setUploading(false);
    }
  };

  if (!order) {
    return <div className="p-10 text-center text-brand-sienna">Loading order…</div>;
  }

  const payment = Array.isArray(order.payment) ? order.payment[0] : order.payment;
  const items = (order.items as { product_name: string; quantity: number; subtotal: number }[]) ?? [];

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
            <span>{item.product_name} × {item.quantity}</span>
            <span>{formatPrice(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg font-medium mb-8">Total: {formatPrice(order.total as number)}</p>

      {payment?.status === 'pending' && (
        <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
          <Upload size={16} />
          {uploading ? 'Uploading…' : 'Upload payment proof'}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
