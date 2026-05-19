import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

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

/** Ensure a `customers` row exists for the signed-in auth user */
export async function ensureCustomerProfile(
  supabase: SupabaseClient,
  user: User
): Promise<CustomerProfile | null> {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? '';
  const firstName = (meta.first_name as string | undefined)?.trim() || null;
  const lastName = (meta.last_name as string | undefined)?.trim() || null;
  const phone = (meta.phone as string | undefined)?.trim() || null;

  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return existing as CustomerProfile;
  }

  const { data: inserted, error } = await supabase
    .from('customers')
    .insert({
      id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
    })
    .select('*')
    .single();

  if (error) {
    const { data: retry } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    return (retry as CustomerProfile) ?? null;
  }

  return inserted as CustomerProfile;
}
