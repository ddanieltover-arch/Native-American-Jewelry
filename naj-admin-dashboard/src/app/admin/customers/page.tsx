'use client';

import { useState, useMemo } from 'react';
import { Users, Ban, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, Card, Badge, Button, SlideOver,
  Table, Pagination, SearchInput, EmptyState, Textarea,
} from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import { formatPrice, formatDate, timeAgo, cn } from '@/lib/utils';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';
import type { AdminCustomer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>(MOCK_CUSTOMERS);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<AdminCustomer | null>(null);
  const [noteText, setNoteText]   = useState('');
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState<string | null>(null);
  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const toggleBlacklist = async (customer: AdminCustomer) => {
    setLoading(customer.id);
    await new Promise((r) => setTimeout(r, 500));
    setCustomers((prev) =>
      prev.map((c) => c.id === customer.id ? { ...c, blacklisted: !c.blacklisted } : c)
    );
    if (selected?.id === customer.id) setSelected((p) => p ? { ...p, blacklisted: !p.blacklisted } : p);
    toast.success(customer.blacklisted ? 'Customer unblacklisted' : 'Customer blacklisted');
    setLoading(null);
  };

  const saveNote = async () => {
    if (!selected) return;
    setLoading('note');
    await new Promise((r) => setTimeout(r, 400));
    setCustomers((prev) =>
      prev.map((c) => c.id === selected.id ? { ...c, notes: noteText } : c)
    );
    setSelected((p) => p ? { ...p, notes: noteText } : p);
    toast.success('Note saved');
    setLoading(null);
  };

  const columns: Column<AdminCustomer>[] = [
    {
      key: 'name', label: 'Customer', sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-sm font-bold text-purple-600 flex-shrink-0">
            {(c.first_name?.[0] ?? c.email[0]).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {c.first_name} {c.last_name}
              {c.blacklisted && <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Blacklisted</span>}
            </p>
            <p className="text-xs text-gray-400">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'order_count', label: 'Orders', sortable: true,
      render: (c) => <span className="text-sm text-gray-700">{c.order_count ?? 0}</span>,
    },
    {
      key: 'total_spent', label: 'Total Spent', sortable: true,
      render: (c) => <span className="text-sm font-semibold text-gray-900">{formatPrice(c.total_spent ?? 0)}</span>,
    },
    {
      key: 'notes', label: 'Notes',
      render: (c) => c.notes
        ? <span className="text-xs text-blue-600 flex items-center gap-1"><StickyNote size={11} /> Has note</span>
        : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: 'created_at', label: 'Joined', sortable: true,
      render: (c) => <span className="text-xs text-gray-500">{formatDate(c.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} total customers`}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: customers.length, color: 'bg-blue-50 border-blue-100' },
          { label: 'Total Revenue',   value: formatPrice(customers.reduce((s, c) => s + (c.total_spent ?? 0), 0)), color: 'bg-green-50 border-green-100' },
          { label: 'Blacklisted',     value: customers.filter((c) => c.blacklisted).length, color: 'bg-red-50 border-red-100' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('border rounded-xl p-4', color)}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or email…" className="max-w-sm" />
        </div>

        <Table<AdminCustomer>
          columns={columns}
          data={filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
          keyField="id"
          onRowClick={(c) => { setSelected(c); setNoteText(c.notes ?? ''); }}
          emptyMessage="No customers found"
        />
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </Card>

      {/* Customer slide-over */}
      <SlideOver open={!!selected} title="Customer Profile" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-5">
            {/* Avatar + basic */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-xl font-bold text-purple-600">
                {(selected.first_name?.[0] ?? selected.email[0]).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{selected.first_name} {selected.last_name}</p>
                <p className="text-sm text-gray-500">{selected.email}</p>
                {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Total Orders',  selected.order_count ?? 0],
                ['Total Spent',   formatPrice(selected.total_spent ?? 0)],
                ['Wishlist Items',selected.wishlist.length],
                ['Member Since',  formatDate(selected.created_at)],
              ].map(([l, v]) => (
                <div key={String(l)} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">{l}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Admin Notes</p>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add internal notes about this customer…"
                rows={4}
              />
              <Button size="sm" loading={loading === 'note'} onClick={saveNote} className="mt-2">
                Save Note
              </Button>
            </div>

            {/* Blacklist */}
            <div className="pt-3 border-t border-gray-200">
              <Button
                variant={selected.blacklisted ? 'secondary' : 'danger'}
                loading={loading === selected.id}
                onClick={() => toggleBlacklist(selected)}
                className="w-full"
              >
                <Ban size={14} />
                {selected.blacklisted ? 'Remove from Blacklist' : 'Blacklist Customer'}
              </Button>
              {selected.blacklisted && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  This customer cannot place new orders
                </p>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
