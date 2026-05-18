// ═══════════════════════════════════════════════════════════
// Admin Auth Layer
// Drop into naj-admin/src/lib/auth.ts
// ═══════════════════════════════════════════════════════════
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// ─── Verify admin from Bearer token, admin_token cookie, or Supabase session ──
export async function verifyAdminToken(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  let userEmail: string | null = null;

  const token =
    req.cookies.get('admin_token')?.value ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (token) {
    const service = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user } } = await service.auth.getUser(token);
    if (user?.email) userEmail = user.email;
  }

  if (!userEmail && anonKey) {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) userEmail = user.email;
  }

  if (!userEmail) return null;

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, email, role, totp_enabled')
      .eq('email', userEmail.trim().toLowerCase())
      .single();

    if (!adminUser) return null;

    // Update last_login_at (fire and forget)
    supabase
      .from('admin_users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: req.headers.get('x-forwarded-for') ?? 'unknown',
      })
      .eq('id', adminUser.id)
      .then(() => null);

    return adminUser;
  } catch {
    return null;
  }
}

// ─── Role permission helpers ──────────────────────────────
type AdminRole = 'super_admin' | 'admin' | 'editor' | 'support' | 'analyst';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  admin:       80,
  editor:      60,
  support:     40,
  analyst:     20,
};

export function hasRole(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function canApproveProducts(role: AdminRole): boolean {
  return hasRole(role, 'editor');
}

export function canVerifyPayments(role: AdminRole): boolean {
  return hasRole(role, 'support');
}

export function canManageShipping(role: AdminRole): boolean {
  return hasRole(role, 'admin');
}

export function canTriggerScrape(role: AdminRole): boolean {
  return hasRole(role, 'admin');
}

export function canManageAdmins(role: AdminRole): boolean {
  return role === 'super_admin';
}
