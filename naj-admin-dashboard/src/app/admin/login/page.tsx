'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    const token = data.session?.access_token;
    if (token) {
      document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }

    const check = await fetch('/api/admin/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!check.ok) {
      setError('This account is not authorized for admin access.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 shadow-sm border border-stone-200">
        <h1 className="text-xl font-semibold text-stone-900 mb-6">Admin Sign In</h1>
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full border border-stone-300 px-3 py-2 mb-3 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="w-full border border-stone-300 px-3 py-2 mb-3 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
