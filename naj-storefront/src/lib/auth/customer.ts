import type { User } from '@supabase/supabase-js';

export type CustomerProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  wishlist: string[];
  blacklisted: boolean;
};

export function authRedirectUrl(path = '/account'): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(path)}`;
}

/** Ensure a `customers` row exists via server API (Neon). */
export async function ensureCustomerProfile(
  _supabase: unknown,
  user: User
): Promise<CustomerProfile | null> {
  try {
    const res = await fetch('/api/account/profile', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.customer as CustomerProfile) ?? null;
  } catch {
    // Server-side callers should use ensureCustomerRow from db.ts
    if (typeof window === 'undefined') {
      const { ensureCustomerRow } = await import('@/lib/db');
      const meta = user.user_metadata ?? {};
      const row = await ensureCustomerRow({
        id: user.id,
        email: user.email ?? '',
        first_name: (meta.first_name as string | undefined)?.trim() || null,
        last_name: (meta.last_name as string | undefined)?.trim() || null,
        phone: (meta.phone as string | undefined)?.trim() || null,
      });
      return row as CustomerProfile | null;
    }
    return null;
  }
}
