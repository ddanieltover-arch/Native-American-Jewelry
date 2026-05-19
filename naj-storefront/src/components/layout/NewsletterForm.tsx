'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Subscription failed');
      setEmail('');
      toast.success('You are subscribed — check your inbox for a welcome email.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-0">
      <input
        type="email"
        required
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="flex-1 bg-white/10 border border-white/20 px-4 py-3 text-sm text-brand-bone placeholder:text-brand-sand/60 focus:outline-none focus:border-brand-turquoise transition-colors disabled:opacity-60"
        style={{ fontFamily: 'var(--font-body)' }}
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-turquoise text-white px-5 py-3 text-xs font-medium tracking-widest uppercase hover:bg-brand-teal transition-colors whitespace-nowrap disabled:opacity-60"
        style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.12em' }}
      >
        {loading ? '…' : 'Subscribe'}
      </button>
    </form>
  );
}
