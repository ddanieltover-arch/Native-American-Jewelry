'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Package, User, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlistStore } from '@/lib/store';
import { createClient } from '@/lib/supabase-client';
import { cn, formatPrice, formatDateShort, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import ProductCard from '@/components/store/ProductCard';
import type { Order, Product } from '@/types';

type Tab = 'orders' | 'wishlist' | 'profile';

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [email, setEmail] = useState('');
  const { productIds } = useWishlistStore();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/account/login?redirect=/account');
        return;
      }
      setEmail(user.email ?? '');
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), payment:payments(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) ?? []);
    });
  }, [router]);

  useEffect(() => {
    if (!productIds.length) {
      setWishlistProducts([]);
      return;
    }
    fetch(`/api/products?per_page=100`)
      .then((r) => r.json())
      .then((d) => {
        const all: Product[] = d.products ?? [];
        setWishlistProducts(all.filter((p) => productIds.includes(p.id)));
      })
      .catch(() => {});
  }, [productIds]);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push('/');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-heading-xl text-brand-obsidian" style={{ fontFamily: 'var(--font-display)' }}>
          My Account
        </h1>
        <button onClick={handleSignOut} className="text-sm text-brand-sienna hover:text-brand-turquoise">
          Sign out
        </button>
      </div>

      <div className="flex gap-1 border-b border-brand-bone mb-8">
        {([
          { id: 'orders' as Tab, icon: Package, label: 'Orders' },
          { id: 'wishlist' as Tab, icon: Heart, label: 'Wishlist' },
          { id: 'profile' as Tab, icon: User, label: 'Profile' },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors',
              tab === id
                ? 'border-brand-turquoise text-brand-obsidian'
                : 'border-transparent text-brand-sienna hover:text-brand-obsidian'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag size={32} className="mx-auto text-brand-sand mb-4" />
              <p className="text-brand-sienna mb-4">No orders yet</p>
              <Link href="/shop" className="btn-primary text-sm">Start Shopping</Link>
            </div>
          ) : (
            orders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block border border-brand-bone p-5 hover:border-brand-turquoise/40 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-brand-obsidian">{order.order_number}</p>
                    <p className="text-xs text-brand-sienna mt-1">{formatDateShort(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.total)}</p>
                    <span className={cn('text-xs', ORDER_STATUS_COLORS[order.status])}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'wishlist' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {wishlistProducts.length === 0 ? (
            <p className="col-span-full text-brand-sienna text-center py-12">Your wishlist is empty</p>
          ) : (
            wishlistProducts.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="max-w-md space-y-4">
          <p className="text-sm text-brand-sienna">Signed in as</p>
          <p className="text-brand-obsidian font-medium">{email}</p>
        </div>
      )}
    </div>
  );
}
