'use client';

import { cn } from '@/lib/utils';

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn('skeleton rounded', className)}
      aria-hidden="true"
    />
  );
}

// ─── Product card skeleton ────────────────────────────────
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-label="Loading product">
      {/* Image */}
      <Shimmer className="aspect-[3/4] w-full" />
      {/* Category label */}
      <Shimmer className="h-3 w-16 mt-3" />
      {/* Name */}
      <Shimmer className="h-4 w-full mt-2" />
      <Shimmer className="h-4 w-3/4 mt-1.5" />
      {/* Stars */}
      <Shimmer className="h-3 w-20 mt-2" />
      {/* Price */}
      <Shimmer className="h-5 w-24 mt-2" />
    </div>
  );
}

// ─── Product grid skeleton ────────────────────────────────
export function ProductGridSkeleton({
  count = 8,
  cols = 4,
}: {
  count?: number;
  cols?: 2 | 3 | 4;
}) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }[cols];

  return (
    <div className={cn('grid gap-4 md:gap-6', gridClass)}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Product detail skeleton ──────────────────────────────
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-8">
        <Shimmer className="h-3 w-12" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-24" />
      </div>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Image */}
        <div>
          <Shimmer className="aspect-square w-full" />
          <div className="flex gap-2 mt-3">
            {[0,1,2].map(i => <Shimmer key={i} className="w-16 h-16" />)}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-10 w-full" />
          <Shimmer className="h-10 w-3/4" />
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-8 w-32" />
          <div className="flex gap-2">
            {[0,1,2].map(i => <Shimmer key={i} className="h-9 w-16" />)}
          </div>
          <div className="flex gap-3 mt-6">
            <Shimmer className="h-12 w-32" />
            <Shimmer className="h-12 flex-1" />
            <Shimmer className="h-12 w-12" />
          </div>
          <Shimmer className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Cart drawer item skeleton ────────────────────────────
export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 py-4 border-b border-brand-bone">
      <Shimmer className="w-20 h-20 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-3 w-1/2" />
        <Shimmer className="h-4 w-20" />
        <div className="flex gap-3">
          <Shimmer className="h-7 w-20" />
          <Shimmer className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

// ─── Order list skeleton ──────────────────────────────────
export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border border-brand-bone p-5">
          <div className="flex justify-between mb-4">
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-3 w-24" />
            </div>
            <Shimmer className="h-6 w-24" />
          </div>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Shimmer className="h-3 w-32" />
              <Shimmer className="h-6 w-20" />
            </div>
            <Shimmer className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page header skeleton ─────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-2">
      <Shimmer className="h-10 w-64" />
      <Shimmer className="h-4 w-40" />
    </div>
  );
}

// ─── Inline spinner ───────────────────────────────────────
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin text-brand-turquoise', className)}
      aria-label="Loading"
    >
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
