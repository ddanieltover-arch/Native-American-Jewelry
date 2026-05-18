'use client';

import { useState } from 'react';
import { Truck, Plus, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Button, Input, Badge } from '@/components/admin/ui';
import { cn, formatPrice } from '@/lib/utils';
import { adminPatch, useAdminApi } from '@/lib/use-admin-api';
import type { ShippingRate } from '@/types';

export default function ShippingPage() {
  const { data, refetch } = useAdminApi<ShippingRate[]>('/api/admin/shipping');
  const rates = data ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits]     = useState<Partial<ShippingRate>>({});
  const [loading, setLoading] = useState(false);

  const startEdit = (rate: ShippingRate) => {
    setEditing(rate.id);
    setEdits({
      label:          rate.label,
      rate:           rate.rate,
      free_threshold: rate.free_threshold ?? undefined,
      est_days_min:   rate.est_days_min ?? undefined,
      est_days_max:   rate.est_days_max ?? undefined,
      active:         rate.active,
    });
  };

  const saveEdit = async (id: string) => {
    setLoading(true);
    try {
      await adminPatch('/api/admin/shipping', { id, ...edits });
      toast.success('Shipping rate updated');
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await adminPatch('/api/admin/shipping', { id, active: !active });
      toast.success('Rate updated');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const usaRates  = rates.filter((r) => r.zone === 'usa');
  const intlRates = rates.filter((r) => r.zone === 'international');

  const RateCard = ({ rate }: { rate: ShippingRate }) => {
    const isEditing = editing === rate.id;
    return (
      <div className={cn('border rounded-xl p-4 space-y-3', rate.active ? 'border-gray-200' : 'border-gray-100 opacity-60')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={15} className={rate.active ? 'text-blue-500' : 'text-gray-300'} />
            {isEditing ? (
              <input
                className="text-sm font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={String(edits.label ?? '')}
                onChange={(e) => setEdits((p) => ({ ...p, label: e.target.value }))}
              />
            ) : (
              <span className="text-sm font-semibold text-gray-900">{rate.label}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', rate.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
              {rate.active ? 'Active' : 'Disabled'}
            </span>
            {isEditing ? (
              <div className="flex gap-1">
                <Button size="sm" loading={loading} onClick={() => saveEdit(rate.id)}>
                  <Check size={13} /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  <X size={13} />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => startEdit(rate)}>
                <Pencil size={13} /> Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Rate</p>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={edits.rate ?? 0}
                  onChange={(e) => setEdits((p) => ({ ...p, rate: parseFloat(e.target.value) }))}
                />
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-900">{formatPrice(rate.rate)}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Free Threshold</p>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="None"
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={edits.free_threshold ?? ''}
                  onChange={(e) => setEdits((p) => ({ ...p, free_threshold: e.target.value ? parseFloat(e.target.value) : undefined }))}
                />
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-700">
                {rate.free_threshold ? `Free over ${formatPrice(rate.free_threshold)}` : 'No free threshold'}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Est. Delivery</p>
            {isEditing ? (
              <div className="flex items-center gap-1 text-sm">
                <input
                  type="number"
                  className="border border-gray-300 rounded px-2 py-1 w-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={edits.est_days_min ?? ''}
                  onChange={(e) => setEdits((p) => ({ ...p, est_days_min: parseInt(e.target.value) }))}
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  className="border border-gray-300 rounded px-2 py-1 w-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={edits.est_days_max ?? ''}
                  onChange={(e) => setEdits((p) => ({ ...p, est_days_max: parseInt(e.target.value) }))}
                />
                <span className="text-gray-400 text-xs">days</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-700">
                {rate.est_days_min}–{rate.est_days_max} business days
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <button
              onClick={() => toggleActive(rate.id, rate.active)}
              className={cn(
                'relative inline-flex h-5 w-9 rounded-full transition-colors',
                rate.active ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                rate.active ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Shipping Configuration"
        subtitle="Configure rates for USA and international shipping zones"
      />

      <Card title="🇺🇸 USA Shipping">
        <div className="space-y-3">
          {usaRates.map((rate) => <RateCard key={rate.id} rate={rate} />)}
        </div>
      </Card>

      <Card title="🌍 International Shipping">
        <div className="space-y-3">
          {intlRates.map((rate) => <RateCard key={rate.id} rate={rate} />)}
        </div>
      </Card>

      <Card title="Notes">
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
          <li>Free shipping is automatically applied at checkout when the order meets the threshold</li>
          <li>All rates are in USD. Disable a rate to hide it from customers at checkout</li>
          <li>Delivery estimates are shown to customers as business days</li>
          <li>International rates do not include customs duties — customers are responsible</li>
        </ul>
      </Card>
    </div>
  );
}
