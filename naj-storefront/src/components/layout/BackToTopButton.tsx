'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCROLL_THRESHOLD = 400;

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(() => {
    setVisible(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        'fixed left-4 z-50 md:left-6',
        'bottom-[var(--floating-bottom-mobile)] md:bottom-[var(--floating-bottom-desktop)]',
        'flex h-12 w-12 items-center justify-center rounded-full',
        'bg-brand-turquoise text-white shadow-glow-teal',
        'transition-all duration-300',
        'hover:bg-brand-teal hover:scale-105',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none'
      )}
    >
      <ChevronUp size={22} strokeWidth={2.25} aria-hidden />
    </button>
  );
}
