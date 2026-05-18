'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Star, Shield, Truck, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore, useWishlistStore, useRecentlyViewedStore } from '@/lib/store';
import { cn, formatPrice, getProductGradient } from '@/lib/utils';
import ProductCard from '@/components/store/ProductCard';
import type { Product } from '@/types';

interface Props {
  product: Product;
  related: Product[];
}

export default function ProductDetail({ product, related }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [descOpen, setDescOpen] = useState(true);
  const [shippingOpen, setShippingOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const { toggle, has } = useWishlistStore();
  const addRecent = useRecentlyViewedStore((s) => s.add);

  const isWishlisted = has(product.id);
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const effectivePrice = product.price + (selectedVariant?.price_modifier ?? 0);
  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0];
  const gradient = getProductGradient(product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      quantity: qty,
      imageUrl: primaryImage?.url,
      slug: product.slug,
      variantId: selectedVariantId,
      variantLabel: selectedVariant
        ? `${selectedVariant.name}: ${selectedVariant.value}`
        : undefined,
    });
    addRecent(product.id);
    toast.success('Added to cart', { description: product.name });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <nav className="flex items-center gap-2 text-xs text-brand-sienna mb-8" style={{ fontFamily: 'var(--font-body)' }}>
        <Link href="/" className="hover:text-brand-turquoise transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-brand-turquoise transition-colors">Shop</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-brand-turquoise transition-colors">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-brand-obsidian truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16 mb-20">
        <div className="space-y-3">
          <div className={cn('relative aspect-square overflow-hidden bg-gradient-to-br', gradient)}>
            {primaryImage?.url ? (
              <img src={primaryImage.url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl opacity-20">💍</span>
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'w-16 h-16 flex-shrink-0 overflow-hidden border-2 transition-colors',
                    activeImage === i ? 'border-brand-turquoise' : 'border-transparent'
                  )}
                >
                  {img.url ? (
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn('w-full h-full bg-gradient-to-br', gradient)} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category && (
            <Link href={`/shop?category=${product.category.slug}`} className="text-label text-brand-turquoise hover:text-brand-teal transition-colors">
              {product.category.name}
            </Link>
          )}

          <h1 className="text-heading-lg text-brand-obsidian mt-2 mb-3 text-balance" style={{ fontFamily: 'var(--font-display)' }}>
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-light text-brand-obsidian" style={{ fontFamily: 'var(--font-display)' }}>
              {formatPrice(effectivePrice)}
            </span>
            {product.source_price > product.price && (
              <span className="text-lg text-brand-sienna/50 line-through" style={{ fontFamily: 'var(--font-body)' }}>
                {formatPrice(product.source_price + (selectedVariant?.price_modifier ?? 0))}
              </span>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium tracking-wider uppercase text-brand-sienna mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                {product.variants[0].name}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={variant.stock_quantity === 0}
                    className={cn(
                      'px-4 py-2 text-sm border transition-all duration-150',
                      selectedVariantId === variant.id
                        ? 'border-brand-obsidian bg-brand-obsidian text-brand-bone'
                        : 'border-brand-bone text-brand-obsidian hover:border-brand-obsidian',
                      variant.stock_quantity === 0 && 'opacity-30 cursor-not-allowed line-through'
                    )}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {variant.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.stock_quantity <= 5 && product.in_stock && (
            <p className="text-xs text-brand-sienna mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Only {product.stock_quantity} left in stock
            </p>
          )}

          <div className="flex gap-3 mb-6">
            <div className="flex items-center border border-brand-bone">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-12 flex items-center justify-center">−</button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-11 h-12 flex items-center justify-center">+</button>
            </div>
            <button onClick={handleAddToCart} disabled={!product.in_stock} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <ShoppingBag size={16} />
              {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button
              onClick={() => { toggle(product.id); toast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist'); }}
              className="w-12 h-12 border flex items-center justify-center"
              aria-label="Wishlist"
            >
              <Heart size={16} className={isWishlisted ? 'fill-red-500 text-red-500' : ''} />
            </button>
          </div>

          <div className="space-y-2.5 mb-6 p-4 bg-brand-bone border border-brand-sand/30">
            {[
              { icon: Shield, text: 'Certificate of Authenticity included' },
              { icon: Truck, text: 'Free shipping on US orders over $75' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon size={14} className="text-brand-turquoise flex-shrink-0" />
                <span className="text-xs text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>{text}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-brand-bone">
            <Accordion title="Description" open={descOpen} onToggle={() => setDescOpen(!descOpen)}>
              <p className="text-sm text-brand-obsidian/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {product.description}
              </p>
            </Accordion>
            <Accordion title="Shipping & Delivery" open={shippingOpen} onToggle={() => setShippingOpen(!shippingOpen)}>
              <p className="text-sm text-brand-obsidian/80" style={{ fontFamily: 'var(--font-body)' }}>
                Standard US: 5–8 business days. Express: 2–4 days. International: 10–21 days.
              </p>
            </Accordion>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-brand-bone pt-16">
          <h2 className="text-heading-md text-brand-obsidian mb-8" style={{ fontFamily: 'var(--font-display)' }}>
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-brand-bone">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-sm font-medium tracking-wider uppercase text-brand-obsidian" style={{ fontFamily: 'var(--font-body)' }}>
          {title}
        </span>
        <ChevronDown size={16} className={cn('text-brand-sienna transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}
