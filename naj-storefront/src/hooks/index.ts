'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, ProductFilters } from '@/types';
import { PRODUCTS, getProductBySlug } from '@/lib/mock-data';

// ─── useProducts: filter + sort products ─────────────────
export function useProducts(filters: ProductFilters = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate async (replace with Supabase query in production)
    const timer = setTimeout(() => {
      let results = PRODUCTS.filter((p) => p.status === 'active');

      if (filters.category) {
        results = results.filter((p) => p.category?.slug === filters.category);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      if (filters.minPrice) results = results.filter((p) => p.price >= filters.minPrice!);
      if (filters.maxPrice) results = results.filter((p) => p.price <= filters.maxPrice!);
      if (filters.inStock)  results = results.filter((p) => p.in_stock);

      switch (filters.sortBy) {
        case 'newest':
          results = [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'price_asc':
          results = [...results].sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          results = [...results].sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
          break;
      }

      setProducts(results);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    filters.category,
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
    filters.sortBy,
  ]);

  return { products, loading };
}

// ─── useProduct: single product by slug ──────────────────
export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const found = getProductBySlug(slug);
      if (found) {
        setProduct(found);
      } else {
        setError('Product not found');
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [slug]);

  return { product, loading, error };
}

// ─── useScrollLock ────────────────────────────────────────
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (top) window.scrollTo(0, -parseInt(top));
    }
  }, [locked]);
}

// ─── useIntersectionObserver: lazy load / animate on scroll
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// ─── useLocalStorage ─────────────────────────────────────
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const updated = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
        return updated;
      });
    },
    [key]
  );

  return [value, set] as const;
}

// ─── useWindowSize ────────────────────────────────────────
export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}

// ─── useMediaQuery ────────────────────────────────────────
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
