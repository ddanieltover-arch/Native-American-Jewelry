'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, Heart, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home',    href: '/',        icon: Home },
  { label: 'Shop',    href: '/shop',    icon: Grid3X3 },
  { label: 'Wishlist',href: '/account/wishlist', icon: Heart },
  { label: 'Cart',    href: null,       icon: ShoppingBag, isCart: true },
  { label: 'Account', href: '/account', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();
  const count = useCartStore((s) => s.count());
  const openDrawer = useCartStore((s) => s.openDrawer);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-parchment/95 backdrop-blur-md border-t border-brand-bone safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href : false;

          if (item.isCart) {
            return (
              <button
                key="cart"
                onClick={openDrawer}
                className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
              >
                <div className="relative">
                  <Icon size={22} className="text-brand-obsidian" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-brand-turquoise text-white text-[9px] font-bold flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-brand-charcoal" style={{ fontFamily: 'var(--font-body)' }}>
                  Cart
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon
                size={22}
                className={cn(
                  'transition-colors',
                  isActive ? 'text-brand-turquoise' : 'text-brand-charcoal'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand-turquoise' : 'text-brand-charcoal'
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
