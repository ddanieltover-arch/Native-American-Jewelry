'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(redirect);
    router.refresh();
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setError('Check your email for the sign-in link.');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-heading-lg text-brand-obsidian mb-6" style={{ fontFamily: 'var(--font-display)' }}>
        Sign in
      </h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          className="input-base w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="input-base w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={handleMagicLink}
          className="btn-ghost w-full text-sm"
          disabled={!email || loading}
        >
          Email me a magic link
        </button>
      </form>
      <p className="text-sm text-brand-sienna mt-6 text-center">
        <Link href="/shop" className="hover:text-brand-turquoise">Continue shopping</Link>
      </p>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
