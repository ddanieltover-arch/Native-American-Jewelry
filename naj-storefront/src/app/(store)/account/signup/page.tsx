'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase-client';
import { authRedirectUrl, ensureCustomerProfile } from '@/lib/auth/customer';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: form.phone.trim() || null,
        },
        emailRedirectTo: authRedirectUrl(redirect),
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user && data.session) {
      await ensureCustomerProfile(supabase, data.user);
      router.push(redirect);
      router.refresh();
      return;
    }

    setMessage(
      'Account created. Check your email to confirm your address, then sign in.'
    );
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Track orders, save your wishlist, and manage your account."
      footer={
        <p className="text-sm text-brand-sienna mt-6 text-center">
          Already have an account?{' '}
          <Link
            href={`/account/login?redirect=${encodeURIComponent(redirect)}`}
            className="text-brand-turquoise hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="First name"
            className="input-base w-full"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
          <input
            type="text"
            required
            placeholder="Last name"
            className="input-base w-full"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </div>
        <input
          type="tel"
          placeholder="Phone (optional)"
          className="input-base w-full"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="input-base w-full"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Password (min. 8 characters)"
          className="input-base w-full"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Confirm password"
          className="input-base w-full"
          value={form.confirmPassword}
          onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
