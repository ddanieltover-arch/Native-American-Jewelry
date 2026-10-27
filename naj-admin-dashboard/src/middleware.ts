import { createServerClient } from '@supabase/ssr';
import { neon } from '@neondatabase/serverless';
import { NextResponse, type NextRequest } from 'next/server';

async function isAdminEmail(email: string): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      SELECT id FROM admin_users WHERE email = ${email.trim().toLowerCase()} LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !(await isAdminEmail(user.email))) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
