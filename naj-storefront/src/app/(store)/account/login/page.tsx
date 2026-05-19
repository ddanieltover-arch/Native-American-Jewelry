'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase-client';
import { authRedirectUrl, ensureCustomerProfile } from '@/lib/auth/customer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';
  const authError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    authError === 'auth_callback' ? 'Sign-in link expired or invalid. Please try again.' : ''
  );
  const [info, setInfo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.user) {
      await ensureCustomerProfile(supabase, data.user);
    }
    router.push(redirect);
    router.refresh();
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setInfo('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl(redirect) },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setInfo('Check your email for the sign-in link.');
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your orders, wishlist, and payment uploads."
      footer={
        <p className="text-sm text-brand-sienna mt-6 text-center space-y-2">
          <span className="block">
            New here?{' '}
            <Link
              href={`/account/signup?redirect=${encodeURIComponent(redirect)}`}
              className="text-brand-turquoise hover:underline"
            >
              Create an account
            </Link>
          </span>
          <Link href="/shop" className="block hover:text-brand-turquoise">
            Continue shopping
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="input-base w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="input-base w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right">
          <Link
            href="/account/forgot-password"
            className="text-xs text-brand-turquoise hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={handleMagicLink}
          className="btn-ghost w-full text-sm"
          disabled={!email.trim() || loading}
        >
          Email me a magic link
        </button>
      </form>
    </AuthShell>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
