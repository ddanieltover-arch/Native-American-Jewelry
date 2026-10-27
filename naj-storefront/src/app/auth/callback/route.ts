import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Mirror Auth user into Neon customers (no auth.users FK on Neon)
      try {
        const user = data.session?.user;
        if (user && process.env.DATABASE_URL) {
          const { ensureCustomerRow } = await import('@/lib/db');
          const meta = user.user_metadata ?? {};
          await ensureCustomerRow({
            id: user.id,
            email: user.email ?? '',
            first_name: (meta.first_name as string | undefined)?.trim() || null,
            last_name: (meta.last_name as string | undefined)?.trim() || null,
            phone: (meta.phone as string | undefined)?.trim() || null,
          });
        }
      } catch (err) {
        console.error('auth callback: ensureCustomerRow failed', err);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/account/login?error=auth_callback&redirect=${encodeURIComponent(safeNext)}`
  );
}
