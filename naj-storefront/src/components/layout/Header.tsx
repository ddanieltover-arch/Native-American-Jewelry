'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, Heart, Menu, X, ChevronDown } from 'lucide-react';
import { useCartStore, useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/mock-data';

const NAV_LINKS = [
  { label: 'Shop All',  href: '/shop' },
  { label: 'Necklaces', href: '/shop?category=necklaces' },
  { label: 'Rings',     href: '/shop?category=rings' },
  { label: 'Bracelets', href: '/shop?category=bracelets' },
  { label: 'Earrings',  href: '/shop?category=earrings' },
  { label: 'Our Story', href: '/about' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const count = useCartStore((s) => s.count());
  const openDrawer = useCartStore((s) => s.openDrawer);
  const { toggleSearch, openMobileMenu } = useUIStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-400',
        scrolled
          ? 'bg-brand-parchment/95 backdrop-blur-md shadow-sm border-b border-brand-bone'
          : 'bg-transparent'
      )}
      style={{ height: 'var(--header-height)' }}
    >
      {/* Announcement bar */}
      <div className="bg-brand-obsidian text-brand-bone text-center py-1.5">
        <p className="text-label text-[10px] tracking-[0.16em]">
          Free shipping on US orders over $75 &nbsp;·&nbsp; Authentic handcrafted jewelry
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-[56px]">
        {/* Left: hamburger (mobile) + nav (desktop) */}
        <div className="flex items-center gap-6">
          <button
            className="md:hidden p-2 -ml-2 text-brand-obsidian"
            onClick={openMobileMenu}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-[13px] font-medium tracking-wide text-brand-charcoal hover:text-brand-turquoise transition-colors duration-200"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Center: logo */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <div className="text-center">
            <span
              className="block text-[1.35rem] font-light tracking-[0.06em] text-brand-obsidian leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Native American
            </span>
            <span
              className="block text-[0.6rem] font-medium tracking-[0.28em] text-brand-turquoise uppercase"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Jewelry
            </span>
          </div>
        </Link>

        {/* Right: icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSearch}
            className="p-2 text-brand-obsidian hover:text-brand-turquoise transition-colors"
            aria-label="Search"
          >
            <Search size={19} />
          </button>

          <Link
            href="/account/wishlist"
            className="p-2 text-brand-obsidian hover:text-brand-turquoise transition-colors"
            aria-label="Wishlist"
          >
            <Heart size={19} />
          </Link>

          <button
            onClick={openDrawer}
            className="p-2 relative text-brand-obsidian hover:text-brand-turquoise transition-colors"
            aria-label="Shopping cart"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-turquoise text-white text-[9px] font-bold flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
