'use client';

import { useState } from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { PageHeader, Card, StatCard } from '@/components/admin/ui';
import { formatPrice, formatNumber, ORDER_STATUS_LABELS, cn } from '@/lib/utils';
import { MOCK_ANALYTICS } from '@/lib/mock-data';

const STATUS_COLORS: Record<string, string> = {
  delivered:         '#22c55e',
  shipped:           '#8b5cf6',
  processing:        '#6366f1',
  payment_confirmed: '#14b8a6',
  payment_uploaded:  '#3b82f6',
  awaiting_payment:  '#f59e0b',
  cancelled:         '#ef4444',
  refunded:          '#94a3b8',
};

const PERIODS = ['7d', '14d', '30d'] as const;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '14d' | '30d'>('30d');
  const analytics = MOCK_ANALYTICS;

  const chartData = period === '7d'
    ? analytics.revenueChart.slice(-7)
    : period === '14d'
    ? analytics.revenueChart.slice(-14)
    : analytics.revenueChart;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Analytics" subtitle="Revenue, orders, and customer insights" />
        <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5 bg-white">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue"     value={formatPrice(analytics.revenue.total)}   change={analytics.revenue.change}   icon={DollarSign} iconColor="bg-green-100 text-green-600" />
        <StatCard label="Orders"      value={analytics.orders.total}                 change={analytics.orders.change}    icon={ShoppingBag}iconColor="bg-blue-100 text-blue-600"  />
        <StatCard label="Customers"   value={analytics.customers.total}              change={analytics.customers.change} icon={Users}      iconColor="bg-purple-100 text-purple-600" />
        <StatCard label="Avg Order Value" value={formatPrice(analytics.revenue.total / analytics.orders.total)} icon={TrendingUp} iconColor="bg-amber-100 text-amber-600" />
      </div>

      {/* Revenue chart */}
      <Card title="Revenue Over Time">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `$${formatNumber(v)}`}
            />
            <Tooltip
              formatter={(v: number) => [formatPrice(v), 'Revenue']}
              contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            <Line
              type="monotone" dataKey="revenue"
              stroke="#2563eb" strokeWidth={2.5}
              dot={false} activeDot={{ r: 5, fill: '#2563eb' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Two chart row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top products bar chart */}
        <Card title="Top Products by Revenue">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={analytics.topProducts}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={120} />
              <Tooltip
                formatter={(v: number) => [formatPrice(v), 'Revenue']}
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Order status pie */}
        <Card title="Orders by Status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics.ordersByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={45}
                paddingAngle={2}
              >
                {analytics.ordersByStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [v, ORDER_STATUS_LABELS[name as keyof typeof ORDER_STATUS_LABELS] ?? name]}
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {analytics.ordersByStatus.map((entry) => (
              <div key={entry.status} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[entry.status] }} />
                <span className="text-gray-600 truncate">{ORDER_STATUS_LABELS[entry.status as keyof typeof ORDER_STATUS_LABELS]}</span>
                <span className="font-semibold text-gray-800 ml-auto">{entry.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top products table */}
      <Card title="Top Products — Detail">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Units Sold</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {analytics.topProducts.map((p, i) => (
              <tr key={p.name} className="hover:bg-gray-50">
                <td className="py-2.5 px-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="py-2.5 px-3 text-gray-800 font-medium">{p.name}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{p.sales}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{formatPrice(p.revenue)}</td>
                <td className="py-2.5 px-3 text-right text-gray-500">{formatPrice(p.revenue / p.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
