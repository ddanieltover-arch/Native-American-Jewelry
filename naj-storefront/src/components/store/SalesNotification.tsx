'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn, USA_STATES, randomBetween } from '@/lib/utils';
import type { Product } from '@/types';

interface Notification {
  id: string;
  state: string;
  productName: string;
}

export default function SalesNotification() {
  const [products, setProducts] = useState<Product[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch('/api/products?per_page=50')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? d.data ?? []))
      .catch(() => {});
  }, []);

  const showNext = useCallback(() => {
    if (!products.length) return;
    const state = USA_STATES[Math.floor(Math.random() * USA_STATES.length)];
    const product = products[Math.floor(Math.random() * products.length)];

    setNotification({
      id: Math.random().toString(36).slice(2),
      state,
      productName: product.name,
    });
    setVisible(true);
    setTimeout(() => setVisible(false), 5000);
  }, [products]);

  useEffect(() => {
    if (!products.length) return;
    const initial = setTimeout(showNext, 8000);
    const interval = setInterval(showNext, randomBetween(30, 90) * 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [showNext, products.length]);

  const dismiss = () => setVisible(false);
  if (!notification) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 md:bottom-8 left-4 z-40 max-w-[280px]',
        'transition-all duration-500 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white border border-brand-sand/40 shadow-lg p-3 flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-brand-turquoise mt-1.5 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-brand-obsidian leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
            Someone in <strong>{notification.state}</strong> just purchased{' '}
            <span className="text-brand-turquoise">{notification.productName}</span>
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-brand-sienna hover:text-brand-obsidian flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
