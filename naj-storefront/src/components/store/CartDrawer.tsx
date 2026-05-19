'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { cn, formatPrice, getProductGradient } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD_US } from '@/lib/shipping-constants';

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, total } = useCartStore();

  // Lock body scroll when drawer open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDrawer]);

  const subtotal = total();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-brand-obsidian/60 backdrop-blur-sm transition-opacity duration-300',
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md z-50',
          'bg-brand-parchment flex flex-col shadow-drawer',
          'transition-transform duration-400 ease-[cubic-bezier(0.32,0,0.67,0)]',
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-bone">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-obsidian" />
            <h2
              className="text-lg font-light tracking-wide"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Your Cart
            </h2>
            {items.length > 0 && (
              <span className="ml-1 text-xs text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 -mr-2 text-brand-sienna hover:text-brand-obsidian transition-colors"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-brand-bone flex items-center justify-center">
                <ShoppingBag size={24} className="text-brand-sienna" />
              </div>
              <div>
                <p
                  className="text-xl font-light text-brand-obsidian mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Your cart is empty
                </p>
                <p className="text-sm text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                  Discover our handcrafted pieces
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="btn-ghost text-sm"
              >
                Browse Shop
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.key} className="flex gap-4 py-4 border-b border-brand-bone last:border-0">
                {/* Image */}
                <div
                  className={cn(
                    'w-20 h-20 flex-shrink-0 rounded bg-gradient-to-br',
                    getProductGradient(item.productId)
                  )}
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeDrawer}
                    className="text-sm font-medium text-brand-obsidian hover:text-brand-turquoise transition-colors leading-snug line-clamp-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {item.name}
                  </Link>
                  {item.variantLabel && (
                    <p className="text-xs text-brand-sienna mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      {item.variantLabel}
                    </p>
                  )}
                  <p className="text-sm font-medium text-brand-obsidian mt-1">
                    {formatPrice(item.price)}
                  </p>

                  {/* Quantity + remove */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-brand-bone">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-brand-sienna hover:text-brand-obsidian transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span
                        className="w-7 h-7 flex items-center justify-center text-sm text-brand-obsidian border-x border-brand-bone"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-brand-sienna hover:text-brand-obsidian transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.key)}
                      className="text-brand-sienna hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>

                    <span className="ml-auto text-sm font-medium text-brand-obsidian">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: totals + checkout CTA */}
        {items.length > 0 && (
          <div className="border-t border-brand-bone px-6 py-5 space-y-4 bg-brand-parchment">
            {/* Free shipping progress */}
            {subtotal < FREE_SHIPPING_THRESHOLD_US && (
              <div>
                <p className="text-xs text-brand-sienna mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Add{' '}
                  <span className="font-medium text-brand-obsidian">{formatPrice(FREE_SHIPPING_THRESHOLD_US - subtotal)}</span>{' '}
                  more for free US shipping (orders over ${FREE_SHIPPING_THRESHOLD_US})
                </p>
                <div className="w-full h-1 bg-brand-bone rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-turquoise rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD_US) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {subtotal >= FREE_SHIPPING_THRESHOLD_US && (
              <p className="text-xs text-brand-turquoise font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                ✓ You qualify for free shipping!
              </p>
            )}

            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>Subtotal</span>
              <span
                className="text-lg font-light text-brand-obsidian"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatPrice(subtotal)}
              </span>
            </div>

            <p className="text-xs text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
              Shipping & taxes calculated at checkout
            </p>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight size={15} />
            </Link>

            <Link
              href="/shop"
              onClick={closeDrawer}
              className="block text-center text-xs text-brand-sienna hover:text-brand-turquoise transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Continue Shopping
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
