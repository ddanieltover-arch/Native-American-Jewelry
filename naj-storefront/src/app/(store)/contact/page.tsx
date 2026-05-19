'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setSent(true);
      toast.success('Message sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-heading-lg text-brand-obsidian mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Thank you
        </h1>
        <p className="text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
          We received your message and will reply within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 md:px-8 py-16">
      <h1 className="text-heading-xl text-brand-obsidian mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        Contact Us
      </h1>
      <p className="text-brand-sienna text-sm mb-8" style={{ fontFamily: 'var(--font-body)' }}>
        Questions about a piece, orders, or authenticity? Send us a message.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Your name"
          className="input-base w-full"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className="input-base w-full"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Subject (optional)"
          className="input-base w-full"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <textarea
          required
          minLength={10}
          placeholder="Your message"
          className="input-base w-full min-h-[140px]"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-60">
          {sending ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
