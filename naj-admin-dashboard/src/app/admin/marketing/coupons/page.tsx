'use client';

import { useState } from 'react';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Button, Badge, Table, ConfirmModal, Input, Select } from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { MOCK_COUPONS } from '@/lib/mock-data';
import type { Coupon } from '@/types';

export default function CouponsPage() {
  const [coupons, setCoupons]   = useState<Coupon[]>(MOCK_COUPONS);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [loading, setLoading]   = useState<string | null>(null);

  const [form, setForm] = useState({
    code:      '',
    type:      'percent' as 'percent' | 'flat',
    value:     '',
    min_order: '0',
    max_uses:  '',
    expires_at:'',
  });

  const toggleActive = async (coupon: Coupon) => {
    setLoading(coupon.id);
    await new Promise((r) => setTimeout(r, 300));
    setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, active: !c.active } : c));
    toast.success(`Coupon ${coupon.active ? 'deactivated' : 'activated'}`);
    setLoading(null);
  };

  const createCoupon = async () => {
    if (!form.code.trim() || !form.value) {
      toast.error('Code and value are required');
      return;
    }
    setLoading('create');
    await new Promise((r) => setTimeout(r, 500));
    const newCoupon: Coupon = {
      id:            `coup-${Date.now()}`,
      code:          form.code.trim().toUpperCase(),
      type:          form.type,
      value:         parseFloat(form.value),
      min_order:     parseFloat(form.min_order) || 0,
      max_uses:      form.max_uses ? parseInt(form.max_uses) : null,
      used_count:    0,
      applicable_to: 'all',
      expires_at:    form.expires_at || null,
      active:        true,
      created_at:    new Date().toISOString(),
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    toast.success('Coupon created');
    setCreating(false);
    setForm({ code: '', type: 'percent', value: '', min_order: '0', max_uses: '', expires_at: '' });
    setLoading(null);
  };

  const deleteCoupon = async (coupon: Coupon) => {
    setLoading(`del-${coupon.id}`);
    await new Promise((r) => setTimeout(r, 400));
    setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    toast.success('Coupon deleted');
    setDeleteTarget(null);
    setLoading(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}" to clipboard`);
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code', label: 'Code',
      render: (c) => (
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{c.code}</code>
          <button onClick={() => copyCode(c.code)} className="text-gray-400 hover:text-gray-600">
            <Copy size={12} />
          </button>
        </div>
      ),
    },
    {
      key: 'type', label: 'Discount',
      render: (c) => (
        <span className="text-sm font-semibold text-gray-900">
          {c.type === 'percent' ? `${c.value}% off` : `${formatPrice(c.value)} off`}
        </span>
      ),
    },
    {
      key: 'min_order', label: 'Min Order',
      render: (c) => (
        <span className="text-sm text-gray-600">{c.min_order > 0 ? formatPrice(c.min_order) : '—'}</span>
      ),
    },
    {
      key: 'used_count', label: 'Usage',
      render: (c) => (
        <div className="text-sm">
          <span className="font-medium text-gray-900">{c.used_count}</span>
          {c.max_uses && <span className="text-gray-400"> / {c.max_uses}</span>}
          {c.max_uses && (
            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min((c.used_count / c.max_uses) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'expires_at', label: 'Expires',
      render: (c) => (
        <span className="text-xs text-gray-500">{c.expires_at ? formatDate(c.expires_at) : 'Never'}</span>
      ),
    },
    {
      key: 'active', label: 'Status',
      render: (c) => (
        <Badge className={c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
          {c.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions', label: '',
      render: (c) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleActive(c)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            title={c.active ? 'Deactivate' : 'Activate'}
          >
            {c.active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Coupons"
        subtitle="Create and manage discount codes"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> Create Coupon
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Total Coupons', coupons.length],
          ['Active',        coupons.filter((c) => c.active).length],
          ['Total Uses',    coupons.reduce((s, c) => s + c.used_count, 0)],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <Card title="New Coupon">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Code *"
              placeholder="SUMMER20"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            />
            <Select
              label="Type *"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'percent' | 'flat' }))}
              options={[
                { value: 'percent', label: 'Percentage (%)' },
                { value: 'flat',    label: 'Fixed Amount ($)' },
              ]}
            />
            <Input
              label={form.type === 'percent' ? 'Discount % *' : 'Discount Amount ($) *'}
              type="number"
              step="0.01"
              placeholder={form.type === 'percent' ? '10' : '25.00'}
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
            />
            <Input
              label="Minimum Order ($)"
              type="number"
              step="0.01"
              placeholder="0"
              value={form.min_order}
              onChange={(e) => setForm((p) => ({ ...p, min_order: e.target.value }))}
            />
            <Input
              label="Max Uses (leave empty for unlimited)"
              type="number"
              placeholder="100"
              value={form.max_uses}
              onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))}
            />
            <Input
              label="Expiry Date (optional)"
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button loading={loading === 'create'} onClick={createCoupon}>Create Coupon</Button>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card title="All Coupons">
        <Table<Coupon>
          columns={columns}
          data={coupons}
          keyField="id"
          emptyMessage="No coupons yet"
        />
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Coupon"
        message={`Delete coupon "${deleteTarget?.code}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={loading?.startsWith('del') ?? false}
        onConfirm={() => deleteTarget && deleteCoupon(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
