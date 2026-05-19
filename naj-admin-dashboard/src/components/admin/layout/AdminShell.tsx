'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Users, CreditCard,
  Truck, Tag, Bell, BarChart2, Settings, RefreshCw,
  ChevronLeft, ChevronRight, LogOut, Search,
  AlertCircle,
} from 'lucide-react';
import { cn, ROLE_LABELS, ROLE_COLORS, lookupLabel, lookupColor } from '@/lib/utils';
import { useAdminStore } from '@/lib/store';
import { useAdminApi } from '@/lib/use-admin-api';
import type { AdminUser } from '@/types';
import Logo from '@/components/brand/Logo';

// ─── Nav config ───────────────────────────────────────────
const NAV = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',   href: '/admin',           icon: LayoutDashboard },
      { label: 'Analytics',   href: '/admin/analytics', icon: BarChart2       },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { label: 'Products',    href: '/admin/products',          icon: Package,     badge: 'pending' },
      { label: 'Approval Queue', href: '/admin/products/approval', icon: AlertCircle, badge: 'pending' },
    ],
  },
  {
    group: 'Commerce',
    items: [
      { label: 'Orders',      href: '/admin/orders',    icon: ShoppingBag },
      { label: 'Payments',    href: '/admin/payments',  icon: CreditCard  },
      { label: 'Customers',   href: '/admin/customers', icon: Users       },
      { label: 'Shipping',    href: '/admin/shipping',  icon: Truck       },
    ],
  },
  {
    group: 'Marketing',
    items: [
      { label: 'Coupons',       href: '/admin/marketing/coupons',       icon: Tag  },
      { label: 'Notifications', href: '/admin/marketing/notifications', icon: Bell },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Scraper',   href: '/admin/scraper',  icon: RefreshCw },
      { label: 'Settings',  href: '/admin/settings', icon: Settings  },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────
function AdminSidebar({
  pendingCount,
  admin,
  onLogout,
  loggingOut,
}: {
  pendingCount: number;
  admin: AdminUser | null;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const pathname   = usePathname();
  const { sidebarCollapsed, collapseSidebar } = useAdminStore();
  const emailInitial = (admin?.email?.charAt(0) ?? 'A').toUpperCase();

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-gray-900 text-white border-r border-gray-800 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        {!sidebarCollapsed ? (
          <Logo height={36} href="/admin" className="brightness-110" />
        ) : (
          <Logo height={28} href="/admin" className="mx-auto brightness-110" />
        )}
        <button
          onClick={() => collapseSidebar(!sidebarCollapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-auto"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAV.map((group) => (
          <div key={group.group} className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-1">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const Icon    = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              const badge   = 'badge' in item && item.badge === 'pending' && pendingCount > 0 ? pendingCount : null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                  {badge && !sidebarCollapsed && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                  {badge && sidebarCollapsed && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full text-[9px] text-white flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Admin user */}
      <div className="border-t border-gray-800 p-3">
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            title="Log out"
            aria-label="Log out"
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white mx-auto hover:bg-blue-500 disabled:opacity-50"
          >
            {emailInitial}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {emailInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{admin?.email ?? 'Admin'}</p>
              {admin && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', lookupColor(ROLE_COLORS, admin.role))}>
                  {lookupLabel(ROLE_LABELS, admin.role)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              title="Log out"
              aria-label="Log out"
              className="text-gray-500 hover:text-white transition-colors p-1 disabled:opacity-50"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────
function AdminTopbar({ title }: { title?: string }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{title ?? 'Dashboard'}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search…"
            className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
      </div>
    </header>
  );
}

type PendingCountResponse = { total: number };

// ─── Shell layout ─────────────────────────────────────────
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setAdmin, admin, logout: clearAdminStore } = useAdminStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: me, refetch: refetchMe } = useAdminApi<AdminUser>('/api/admin/me');
  const { data: pendingData, refetch: refetchPending } = useAdminApi<PendingCountResponse>(
    pathname === '/admin/login' ? null : '/api/admin/products?status=pending&per_page=1'
  );

  useEffect(() => {
    if (me) setAdmin(me);
  }, [me, setAdmin]);

  useEffect(() => {
    if (pathname !== '/admin/login') {
      refetchMe();
      refetchPending();
    }
  }, [pathname, refetchMe, refetchPending]);

  const pendingCount = pendingData?.total ?? 0;
  const sessionAdmin = admin ?? me ?? null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Still clear client state and redirect
    }
    clearAdminStore();
    setAdmin(null);
    router.push('/admin/login');
    router.refresh();
    setLoggingOut(false);
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar
        pendingCount={pendingCount}
        admin={sessionAdmin}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
