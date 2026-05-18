// ═══════════════════════════════════════════════════════════
// Admin Auth Layer
// Drop into naj-admin/src/lib/auth.ts
// ═══════════════════════════════════════════════════════════
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─── Verify admin token from cookie or Authorization header ──
export async function verifyAdminToken(req: NextRequest) {
  const token =
    req.cookies.get('admin_token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;

  try {
    // Use Supabase to verify the JWT and load the admin profile
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Decode the user from the Supabase JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Fetch the admin_users row for role/permissions
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, email, role, totp_enabled')
      .eq('email', user.email!.trim().toLowerCase())
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
