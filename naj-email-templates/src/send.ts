import { Resend } from 'resend';
import { BRAND } from './brand';

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  resendApiKey?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

export function getFromAddress(): string {
  const from = process.env.FROM_EMAIL ?? 'orders@nativeamericanjewelry.com';
  if (from.includes('<')) return from;
  return `${BRAND.name} <${from}>`;
}

export async function sendTransactionalEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const apiKey = options.resendApiKey ?? process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true };
  }

  const resend = new Resend(apiKey);
  const to = Array.isArray(options.to) ? options.to : [options.to.trim()];

  const { data, error } = await resend.emails.send({
    from: options.from ?? getFromAddress(),
    to,
    reply_to: options.replyTo?.trim(),
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    console.error('[resend]', error.name ?? 'send_failed', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id ?? '' };
}
