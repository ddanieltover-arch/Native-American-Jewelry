'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ChevronRight, Instagram, Facebook } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/mock-data';

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobileMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeMobileMenu]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-brand-obsidian/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-[85vw] max-w-xs z-50 md:hidden',
          'bg-brand-parchment flex flex-col shadow-2xl',
          'transition-transform duration-400 ease-[cubic-bezier(0.32,0,0.67,0)]',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-bone">
          <span
            className="text-lg font-light text-brand-obsidian tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Native American Jewelry
          </span>
          <button
            onClick={closeMobileMenu}
            className="p-2 -mr-2 text-brand-sienna hover:text-brand-obsidian transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-5 pb-4 border-b border-brand-bone">
            <p
              className="text-[10px] font-medium tracking-[0.18em] uppercase text-brand-sienna mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Shop
            </p>
            <Link
              href="/shop"
              onClick={closeMobileMenu}
              className="flex items-center justify-between py-2.5 text-base text-brand-obsidian hover:text-brand-turquoise transition-colors"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              All Jewelry
              <ChevronRight size={16} className="text-brand-sienna" />
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                onClick={closeMobileMenu}
                className="flex items-center justify-between py-2.5 text-base text-brand-obsidian hover:text-brand-turquoise transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {cat.name}
                <ChevronRight size={16} className="text-brand-sienna" />
              </Link>
            ))}
          </div>

          <div className="px-5 pt-4 pb-4 border-b border-brand-bone">
            <p
              className="text-[10px] font-medium tracking-[0.18em] uppercase text-brand-sienna mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Account
            </p>
            {[
              { label: 'My Account',   href: '/account' },
              { label: 'My Orders',    href: '/account/orders' },
              { label: 'My Wishlist',  href: '/account/wishlist' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className="flex items-center justify-between py-2.5 text-base text-brand-obsidian hover:text-brand-turquoise transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {label}
                <ChevronRight size={16} className="text-brand-sienna" />
              </Link>
            ))}
          </div>

          <div className="px-5 pt-4">
            <p
              className="text-[10px] font-medium tracking-[0.18em] uppercase text-brand-sienna mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Info
            </p>
            {[
              { label: 'Our Story',         href: '/about' },
              { label: 'Authenticity',       href: '/authenticity' },
              { label: 'Payment Methods',    href: '/payment-methods' },
              { label: 'Shipping & Returns', href: '/shipping' },
              { label: 'Contact Us',         href: '/contact' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className="flex items-center justify-between py-2 text-sm text-brand-sienna hover:text-brand-turquoise transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {label}
                <ChevronRight size={14} className="text-brand-sand/60" />
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-brand-bone px-5 py-4">
          <p className="text-xs text-brand-sienna mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Free US shipping on orders over $75
          </p>
          <div className="flex gap-3">
            <a href="#" className="w-8 h-8 border border-brand-bone flex items-center justify-center text-brand-sienna hover:border-brand-turquoise hover:text-brand-turquoise transition-colors">
              <Instagram size={14} />
            </a>
            <a href="#" className="w-8 h-8 border border-brand-bone flex items-center justify-center text-brand-sienna hover:border-brand-turquoise hover:text-brand-turquoise transition-colors">
              <Facebook size={14} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
