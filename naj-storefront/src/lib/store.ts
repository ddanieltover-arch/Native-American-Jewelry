'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, ProductFilters } from '@/types';

// ─── Cart Store ───────────────────────────────────────────
interface CartStore {
  items: CartItem[];
  isDrawerOpen: boolean;

  addItem: (item: Omit<CartItem, 'key'>) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;

  // Computed
  total: () => number;
  subtotal: () => number;
  count: () => number;
  hasItem: (productId: string, variantId?: string) => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (item) => {
        const key = `${item.productId}-${item.variantId ?? 'default'}`;
        set((state) => {
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
              isDrawerOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, key }],
            isDrawerOpen: true,
          };
        });
      },

      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
      hasItem: (productId, variantId) => {
        const key = `${productId}-${variantId ?? 'default'}`;
        return get().items.some((i) => i.key === key);
      },
    }),
    {
      name: 'naj-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// ─── Wishlist Store ───────────────────────────────────────
interface WishlistStore {
  productIds: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  replace: (productIds: string[]) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],

      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),

      has: (productId) => get().productIds.includes(productId),
      replace: (productIds: string[]) => set({ productIds }),
      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'naj-wishlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── Recently Viewed Store ────────────────────────────────
interface RecentlyViewedStore {
  productIds: string[];
  add: (productId: string) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      productIds: [],

      add: (productId) =>
        set((state) => ({
          productIds: [
            productId,
            ...state.productIds.filter((id) => id !== productId),
          ].slice(0, 8),
        })),

      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'naj-recently-viewed',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── UI / Filter Store (not persisted) ───────────────────
interface UIStore {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  filters: ProductFilters;

  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleSearch: () => void;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: ProductFilters = {
  sortBy: 'featured',
};

export const useUIStore = create<UIStore>()((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  filters: DEFAULT_FILTERS,

  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
