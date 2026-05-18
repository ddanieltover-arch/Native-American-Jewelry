import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing Supabase URL or anon key.' },
      { status: 500 }
    );
  }
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set on Vercel.' },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookies.forEach((c) => cookiesToSet.push(c));
      },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminUser, error: adminError } = await service
    .from('admin_users')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle();

  if (adminError || !adminUser) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'This account is not authorized for admin access.' },
      { status: 403 }
    );
  }

  await service
    .from('admin_users')
    .update({
      last_login_at: new Date().toISOString(),
      last_login_ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    })
    .eq('id', adminUser.id);

  const response = NextResponse.json({ data: adminUser });
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  if (authData.session?.access_token) {
    response.cookies.set('admin_token', authData.session.access_token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
}
