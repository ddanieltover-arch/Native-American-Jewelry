'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingBag, Users, Package,
  CreditCard, AlertCircle, ArrowRight, RefreshCw,
  CheckCircle, Clock,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { StatCard, Card, Badge } from '@/components/admin/ui';
import {
  cn, formatPrice, formatDate, timeAgo,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatNumber,
} from '@/lib/utils';
import { useAdminApi } from '@/lib/use-admin-api';

const STATUS_CHART_COLORS: Record<string, string> = {
  delivered:         '#22c55e',
  shipped:           '#8b5cf6',
  processing:        '#6366f1',
  payment_confirmed: '#14b8a6',
  payment_uploaded:  '#3b82f6',
  awaiting_payment:  '#f59e0b',
  cancelled:         '#ef4444',
  refunded:          '#94a3b8',
};

export default function AdminDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');
  const days = period === '7d' ? 7 : 30;
  const { data: analytics } = useAdminApi<{
    revenue: { total: number; change: number };
    orders: { total: number; change: number };
    customers: { total: number; change: number };
    pendingProducts: { total: number };
    pendingPayments: { total: number };
    revenueChart: { date: string; revenue: number }[];
    topProducts: { name: string; sales: number; revenue: number }[];
    ordersByStatus: { status: string; count: number }[];
  }>(`/api/admin/analytics?days=${days}`);
  const { data: pendingProductsData } = useAdminApi<{ products: { id: string }[] }>(
    '/api/admin/products?status=pending&per_page=5'
  );
  const { data: paymentsData } = useAdminApi<{ data: unknown[] }>('/api/admin/payments');
  const { data: recentOrdersData } = useAdminApi<{
    orders: { id: string; order_number: string; total: number; status: string; created_at: string; customer?: { email?: string } }[];
  }>('/api/admin/orders?per_page=4');

  const pendingProducts = pendingProductsData?.products ?? [];
  const recentOrders = recentOrdersData?.orders ?? [];
  const pendingPayments = (paymentsData as { data?: { status: string }[] })?.data?.filter(
    (p) => p.status === 'uploaded'
  ) ?? [];

  if (!analytics) {
    return <div className="p-8 text-stone-500">Loading dashboard…</div>;
  }

  const chartData = period === '7d'
    ? analytics.revenueChart.slice(-7)
    : analytics.revenueChart;

  return (
    <div className="space-y-6">
      {/* ── Alert banners ──────────────────────────────────── */}
      {(pendingProducts.length > 0 || pendingPayments.length > 0) && (
        <div className="space-y-2">
          {pendingProducts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {pendingProducts.length} product{pendingProducts.length > 1 ? 's' : ''} awaiting approval
                </span>
              </div>
              <Link href="/admin/products/approval" className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1">
                Review now <ArrowRight size={12} />
              </Link>
            </div>
          )}
          {pendingPayments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {pendingPayments.length} payment proof{pendingPayments.length > 1 ? 's' : ''} need verification
                </span>
              </div>
              <Link href="/admin/payments" className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1">
                Verify now <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatPrice(analytics.revenue.total)}
          change={analytics.revenue.change}
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          label="Orders"
          value={analytics.orders.total}
          change={analytics.orders.change}
          icon={ShoppingBag}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Customers"
          value={analytics.customers.total}
          change={analytics.customers.change}
          icon={Users}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          label="Pending Review"
          value={analytics.pendingProducts.total}
          icon={Package}
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card
          className="lg:col-span-2"
          title="Revenue"
          action={
            <div className="flex gap-1">
              {(['7d', '30d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded font-medium',
                    period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
              <Tooltip
                formatter={(v: number) => [formatPrice(v), 'Revenue']}
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Orders by status */}
        <Card title="Orders by Status">
          <div className="space-y-2">
            {analytics.ordersByStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_CHART_COLORS[status] }} />
                  <span className="text-xs text-gray-600 truncate">{ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800 ml-2">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <Card
          title="Recent Orders"
          action={
            <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          }
        >
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-500">{order.customer?.email} · {timeAgo(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}>
                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Top products */}
        <Card
          title="Top Products"
          action={
            <Link href="/admin/products" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          }
        >
          <div className="space-y-3">
            {analytics.topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sales} sold</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Quick actions ──────────────────────────────────── */}
      <Card title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Review Approval Queue', href: '/admin/products/approval', icon: AlertCircle, color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
            { label: 'Verify Payments',        href: '/admin/payments',          icon: CreditCard,  color: 'border-blue-300 text-blue-700 hover:bg-blue-50'   },
            { label: 'View All Orders',        href: '/admin/orders',            icon: ShoppingBag, color: 'border-gray-300 text-gray-700 hover:bg-gray-50'   },
            { label: 'Trigger Scrape',         href: '/admin/scraper',           icon: RefreshCw,   color: 'border-green-300 text-green-700 hover:bg-green-50' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={cn('flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors', color)}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
