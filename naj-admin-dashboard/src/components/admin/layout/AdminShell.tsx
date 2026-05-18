'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Users, CreditCard,
  Truck, Tag, Bell, BarChart2, Settings, RefreshCw,
  ChevronLeft, ChevronRight, Menu, LogOut, Search,
  AlertCircle, X,
} from 'lucide-react';
import { cn, ROLE_LABELS, ROLE_COLORS } from '@/lib/utils';
import { useAdminStore, MOCK_ADMIN } from '@/lib/store';

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
function AdminSidebar({ pendingCount }: { pendingCount: number }) {
  const pathname   = usePathname();
  const { sidebarCollapsed, collapseSidebar } = useAdminStore();

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-gray-900 text-white border-r border-gray-800 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        {!sidebarCollapsed && (
          <div>
            <p className="text-sm font-semibold text-white leading-tight">NAJ Admin</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Native American Jewelry</p>
          </div>
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
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white mx-auto">
            A
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {MOCK_ADMIN.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{MOCK_ADMIN.email}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', ROLE_COLORS[MOCK_ADMIN.role])}>
                {ROLE_LABELS[MOCK_ADMIN.role]}
              </span>
            </div>
            <button className="text-gray-500 hover:text-white transition-colors p-1">
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
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
          A
        </div>
      </div>
    </header>
  );
}

// ─── Shell layout ─────────────────────────────────────────
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { setAdmin } = useAdminStore();

  // Hydrate mock session
  useEffect(() => { setAdmin(MOCK_ADMIN); }, [setAdmin]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar pendingCount={3} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
