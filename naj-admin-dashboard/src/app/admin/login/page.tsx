'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/brand/Logo';

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

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof payload.error === 'string'
            ? payload.error
            : `Sign-in failed (${res.status}). Check Vercel env vars.`
        );
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Check your connection or Vercel configuration.');
      } else {
        setError(err instanceof Error ? err.message : 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 shadow-sm border border-stone-200">
        <div className="flex justify-center mb-6">
          <Logo height={80} href={null} priority />
        </div>
        <h1 className="text-xl font-semibold text-stone-900 mb-6 text-center">Admin Sign In</h1>
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full border border-stone-300 px-3 py-2 mb-3 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="w-full border border-stone-300 px-3 py-2 mb-3 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
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
