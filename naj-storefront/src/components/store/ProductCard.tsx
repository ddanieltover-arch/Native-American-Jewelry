'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore, useWishlistStore } from '@/lib/store';
import { cn, formatPrice, getProductGradient } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  Bestseller: 'bg-brand-gold text-white',
  New:        'bg-brand-turquoise text-white',
  'Low Stock':'bg-brand-sienna text-white',
  Sale:       'bg-red-600 text-white',
};

export default function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const { toggle, has } = useWishlistStore();
  const isWishlisted = has(product.id);
  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: primaryImage?.url,
      slug: product.slug,
    });

    toast.success('Added to cart', {
      description: product.name,
      duration: 2500,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
    toast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist', {
      duration: 1800,
    });
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn('group block', className)}
    >
      <article className="flex flex-col h-full">
        {/* Image container */}
        <div className="relative overflow-hidden aspect-[3/4] bg-brand-bone">
          {/* Gradient placeholder */}
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br transition-transform duration-700',
              'group-hover:scale-105',
              getProductGradient(product.id)
            )}
          />

          {/* Real image */}
          {primaryImage?.url && (
            <img
              src={primaryImage.url}
              alt={primaryImage.alt ?? product.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}

          {/* Badge */}
          {product.badge && (
            <span
              className={cn(
                'absolute top-3 left-3 text-[9px] font-semibold tracking-[0.14em] uppercase px-2 py-1',
                BADGE_STYLES[product.badge] ?? 'bg-brand-obsidian text-white'
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {product.badge}
            </span>
          )}

          {/* Low stock indicator */}
          {product.stock_quantity <= 3 && product.stock_quantity > 0 && !product.badge && (
            <span
              className="absolute top-3 left-3 text-[9px] font-semibold tracking-[0.14em] uppercase px-2 py-1 bg-brand-sienna text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Only {product.stock_quantity} left
            </span>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 flex items-center justify-center',
              'rounded-full bg-white/90 backdrop-blur-sm shadow-sm',
              'transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-white hover:scale-110',
              isWishlisted && 'opacity-100'
            )}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              size={13}
              className={cn(
                'transition-colors',
                isWishlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-brand-obsidian'
              )}
            />
          </button>

          {/* Quick add (hover) */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 p-3',
              'translate-y-full group-hover:translate-y-0',
              'transition-transform duration-300 ease-out'
            )}
          >
            <button
              onClick={handleAddToCart}
              className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <ShoppingBag size={13} />
              Quick Add
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="pt-3 pb-1 flex flex-col flex-1">
          {product.category && (
            <span
              className="text-[10px] tracking-[0.14em] uppercase text-brand-sienna mb-1"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {product.category.name}
            </span>
          )}

          <h3
            className="text-[15px] font-light leading-snug text-brand-obsidian group-hover:text-brand-turquoise transition-colors line-clamp-2 flex-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {product.name}
          </h3>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={cn(
                      i < Math.round(product.rating!) ? 'fill-brand-gold text-brand-gold' : 'text-brand-bone'
                    )}
                  />
                ))}
              </div>
              <span
                className="text-[11px] text-brand-sienna"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                ({product.review_count})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className="text-base font-medium text-brand-obsidian"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {formatPrice(product.price)}
            </span>
            {product.source_price > product.price && (
              <span
                className="text-xs text-brand-sienna/60 line-through"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {formatPrice(product.source_price)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
