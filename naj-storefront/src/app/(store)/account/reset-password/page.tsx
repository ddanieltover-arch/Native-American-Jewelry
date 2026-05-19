'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase-client';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/account');
    router.refresh();
  };

  if (!ready) {
    return (
      <AuthShell title="Set new password" subtitle="Use the link from your email to open this page.">
        <p className="text-sm text-brand-sienna">
          Session not found.{' '}
          <Link href="/account/forgot-password" className="text-brand-turquoise hover:underline">
            Request a new reset link
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="New password"
          className="input-base w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Confirm new password"
          className="input-base w-full"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
