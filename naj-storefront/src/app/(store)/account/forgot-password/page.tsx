'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase-client';
import { authRedirectUrl } from '@/lib/auth/customer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl('/account/reset-password'),
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage('If an account exists for that email, we sent a password reset link.');
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we will send a link to choose a new password."
      footer={
        <p className="text-sm text-brand-sienna mt-6 text-center">
          <Link href="/account/login" className="text-brand-turquoise hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="input-base w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
