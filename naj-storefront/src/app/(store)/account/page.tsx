'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Package, User, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useWishlistStore } from '@/lib/store';
import { createClient } from '@/lib/supabase-client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { cn, formatPrice, formatDateShort, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import ProductCard from '@/components/store/ProductCard';
import type { Order, Product } from '@/types';

type Tab = 'orders' | 'wishlist' | 'profile';

type AddressRow = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  country: string;
  zip: string | null;
  is_default: boolean;
};

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'orders';
  const { user, customer, loading: authLoading, signOut, refreshProfile } = useCustomerAuth();

  const [tab, setTab] = useState<Tab>(
    ['orders', 'wishlist', 'profile'].includes(initialTab) ? initialTab : 'orders'
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const { productIds, replace: replaceWishlist } = useWishlistStore();

  useEffect(() => {
    const t = searchParams.get('tab') as Tab;
    if (t && ['orders', 'wishlist', 'profile'].includes(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/account/login?redirect=/account');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!customer) return;
    setProfileForm({
      firstName: customer.first_name ?? '',
      lastName: customer.last_name ?? '',
      phone: customer.phone ?? '',
    });
    if (customer.wishlist?.length) {
      replaceWishlist(customer.wishlist);
    }
  }, [customer, replaceWishlist]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*), payment:payments(*)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
  }, [user]);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false });
    setAddresses((data as AddressRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadOrders();
    loadAddresses();
  }, [user, loadOrders, loadAddresses]);

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

  useEffect(() => {
    if (!user || !productIds.length) return;
    const supabase = createClient();
    supabase.from('customers').update({ wishlist: productIds }).eq('id', user.id).then();
  }, [user, productIds]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('customers')
      .update({
        first_name: profileForm.firstName.trim() || null,
        last_name: profileForm.lastName.trim() || null,
        phone: profileForm.phone.trim() || null,
      })
      .eq('id', user.id);

    await supabase.auth.updateUser({
      data: {
        first_name: profileForm.firstName.trim(),
        last_name: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
      },
    });

    setSavingProfile(false);
    if (error) {
      toast.error('Could not update profile');
      return;
    }
    toast.success('Profile updated');
    refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  if (authLoading || !user) {
    return <div className="p-10 text-center text-brand-sienna">Loading account…</div>;
  }

  const email = user.email ?? customer?.email ?? '';

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

      <div className="flex gap-1 border-b border-brand-bone mb-8 overflow-x-auto">
        {([
          { id: 'orders' as Tab, icon: Package, label: 'Orders' },
          { id: 'wishlist' as Tab, icon: Heart, label: 'Wishlist' },
          { id: 'profile' as Tab, icon: User, label: 'Profile' },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap',
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
              <Link href="/shop" className="btn-primary text-sm">
                Start Shopping
              </Link>
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
        <div className="max-w-lg space-y-8">
          <form onSubmit={handleSaveProfile} className="space-y-4 border border-brand-bone p-6">
            <h2 className="text-sm font-medium text-brand-obsidian uppercase tracking-wide">Profile</h2>
            <p className="text-xs text-brand-sienna">Signed in as {email}</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First name"
                className="input-base w-full"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Last name"
                className="input-base w-full"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <input
              type="tel"
              placeholder="Phone"
              className="input-base w-full"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <button type="submit" disabled={savingProfile} className="btn-primary text-sm">
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          <div className="border border-brand-bone p-6">
            <h2 className="text-sm font-medium text-brand-obsidian uppercase tracking-wide mb-4">
              Saved addresses
            </h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-brand-sienna">
                Addresses from checkout will appear here once saved.
              </p>
            ) : (
              <ul className="space-y-3">
                {addresses.map((addr) => (
                  <li key={addr.id} className="text-sm text-brand-charcoal border-b border-brand-bone pb-3">
                    {addr.label && <span className="font-medium">{addr.label} · </span>}
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}
                    {addr.state ? `, ${addr.state}` : ''} {addr.zip ?? ''}, {addr.country}
                    {addr.is_default && (
                      <span className="ml-2 text-xs text-brand-turquoise">Default</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/account/forgot-password"
              className="inline-block mt-4 text-xs text-brand-turquoise hover:underline"
            >
              Change password
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <AccountContent />
    </Suspense>
  );
}
