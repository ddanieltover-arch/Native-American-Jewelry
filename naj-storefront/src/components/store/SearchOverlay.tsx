'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { cn, formatPrice, getProductGradient } from '@/lib/utils';
import type { Product } from '@/types';

const TRENDING = [
  'Turquoise necklace',
  'Squash blossom',
  'Navajo ring',
  'Concho belt',
  'Zuni earrings',
];

export default function SearchOverlay() {
  const { isSearchOpen, toggleSearch } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      // Load recent searches from localStorage
      try {
        const stored = localStorage.getItem('naj-recent-searches');
        if (stored) setRecent(JSON.parse(stored).slice(0, 5));
      } catch {}
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isSearchOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isSearchOpen]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleSearch();
    };
    if (isSearchOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSearchOpen, toggleSearch]);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (val.trim().length < 2) {
        setResults([]);
        return;
      }
      fetch(`/api/products?search=${encodeURIComponent(val)}&per_page=6`)
        .then((res) => res.json())
        .then((data) => setResults(data.products ?? data.data ?? []))
        .catch(() => setResults([]));
    }, 220);
  };

  const handleSelect = (term: string) => {
    // Persist recent search
    try {
      const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
      setRecent(updated);
      localStorage.setItem('naj-recent-searches', JSON.stringify(updated));
    } catch {}
    toggleSearch();
  };

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem('naj-recent-searches'); } catch {}
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-obsidian/70 backdrop-blur-sm"
        onClick={toggleSearch}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 bg-brand-parchment shadow-2xl max-h-[80vh] flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 md:px-8 py-4 border-b border-brand-bone">
          <Search size={20} className="text-brand-sienna flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search jewelry, stones, styles…"
            className="flex-1 bg-transparent text-brand-obsidian text-lg placeholder:text-brand-sienna/50 focus:outline-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="p-1 text-brand-sienna hover:text-brand-obsidian transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={toggleSearch}
            className="p-2 text-brand-sienna hover:text-brand-obsidian transition-colors ml-1"
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results / suggestions */}
        <div className="overflow-y-auto flex-1 px-4 md:px-8 py-4">
          {/* Live search results */}
          {results.length > 0 && (
            <div>
              <p
                className="text-label text-brand-sienna mb-3"
                style={{ fontSize: '10px', letterSpacing: '0.16em' }}
              >
                Results for "{query}"
              </p>
              <div className="space-y-1">
                {results.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={() => handleSelect(query)}
                    className="flex items-center gap-4 p-3 rounded hover:bg-brand-bone transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div
                      className={cn(
                        'w-12 h-12 flex-shrink-0 rounded bg-gradient-to-br',
                        getProductGradient(product.id)
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-brand-obsidian group-hover:text-brand-turquoise transition-colors line-clamp-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {product.name}
                      </p>
                      <p
                        className="text-xs text-brand-sienna"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {product.category?.name} · {formatPrice(product.price)}
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-brand-sienna opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </Link>
                ))}
              </div>

              {/* View all results */}
              <Link
                href={`/shop?search=${encodeURIComponent(query)}`}
                onClick={() => handleSelect(query)}
                className="flex items-center justify-between mt-3 p-3 border border-brand-bone hover:border-brand-turquoise group transition-colors"
              >
                <span
                  className="text-sm text-brand-obsidian"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  View all results for "<strong>{query}</strong>"
                </span>
                <ArrowRight
                  size={14}
                  className="text-brand-sienna group-hover:text-brand-turquoise transition-colors"
                />
              </Link>
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center">
              <p
                className="text-brand-obsidian font-light text-lg mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                No results for "{query}"
              </p>
              <p className="text-sm text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                Try a different search term
              </p>
            </div>
          )}

          {/* Empty state: recent + trending */}
          {!query && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Recent searches */}
              {recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label text-brand-sienna" style={{ fontSize: '10px', letterSpacing: '0.16em' }}>
                      <Clock size={11} className="inline mr-1.5 -mt-0.5" />
                      Recent
                    </p>
                    <button
                      onClick={clearRecent}
                      className="text-[10px] text-brand-sienna hover:text-brand-turquoise transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recent.map((term) => (
                      <Link
                        key={term}
                        href={`/shop?search=${encodeURIComponent(term)}`}
                        onClick={() => handleSelect(term)}
                        className="flex items-center gap-2 py-2 px-3 hover:bg-brand-bone transition-colors rounded group"
                      >
                        <Clock size={12} className="text-brand-sienna/50 flex-shrink-0" />
                        <span className="text-sm text-brand-obsidian group-hover:text-brand-turquoise transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                          {term}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              <div>
                <p className="text-label text-brand-sienna mb-3" style={{ fontSize: '10px', letterSpacing: '0.16em' }}>
                  <TrendingUp size={11} className="inline mr-1.5 -mt-0.5" />
                  Trending Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((term) => (
                    <Link
                      key={term}
                      href={`/shop?search=${encodeURIComponent(term)}`}
                      onClick={() => handleSelect(term)}
                      className="px-3 py-1.5 text-sm border border-brand-bone text-brand-obsidian hover:border-brand-turquoise hover:text-brand-turquoise transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {term}
                    </Link>
                  ))}
                </div>

                {/* Popular categories */}
                <p className="text-label text-brand-sienna mt-5 mb-3" style={{ fontSize: '10px', letterSpacing: '0.16em' }}>
                  Popular Categories
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Necklaces', 'Rings', 'Bracelets', 'Earrings'].map((cat) => (
                    <Link
                      key={cat}
                      href={`/shop?category=${cat.toLowerCase()}`}
                      onClick={() => toggleSearch()}
                      className="flex items-center justify-between p-3 border border-brand-bone hover:border-brand-turquoise group transition-colors"
                    >
                      <span className="text-sm text-brand-obsidian" style={{ fontFamily: 'var(--font-body)' }}>
                        {cat}
                      </span>
                      <ArrowRight size={12} className="text-brand-sienna group-hover:text-brand-turquoise transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
