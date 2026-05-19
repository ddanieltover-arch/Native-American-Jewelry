import { siteUrl } from '../brand';
import { emailButton, emailLayout, infoBox } from '../layout';
import type { PaymentStatusEmailData } from '../types';
import { escapeHtml, formatUsd } from '../utils';

export function renderPaymentStatusEmail(data: PaymentStatusEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const base = data.siteUrl ?? siteUrl();
  const accountUrl = `${base}/account`;

  const configs = {
    confirmed: {
      headline: 'Payment confirmed',
      message:
        'We verified your payment. Your order is now being prepared for shipment.',
      subject: `Payment confirmed — ${data.orderNumber}`,
      preheader: 'Your payment was verified — we are processing your order',
    },
    failed: {
      headline: 'Payment could not be verified',
      message:
        'We could not verify your payment. Please contact us or try uploading proof again from your account.',
      subject: `Payment issue — ${data.orderNumber}`,
      preheader: 'Action needed on your order payment',
    },
    refunded: {
      headline: 'Refund processed',
      message:
        'A refund has been issued for this order. Allow 3–10 business days for funds to appear, depending on your bank.',
      subject: `Refund issued — ${data.orderNumber}`,
      preheader: 'Your order refund has been processed',
    },
  } as const;

  const cfg = configs[data.status];
  const noteBlock = data.adminNote
    ? infoBox(
        `<p style="margin:0;font-size:14px;font-family:Arial,sans-serif;"><strong>Note from our team:</strong> ${escapeHtml(data.adminNote)}</p>`
      )
    : '';

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8b5e3c;font-family:Arial,sans-serif;">
      Order ${escapeHtml(data.orderNumber)}
    </p>
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:400;color:#0e0c0a;">
      ${cfg.headline}
    </h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      Hi ${escapeHtml(data.customerName || 'there')}, ${cfg.message}
    </p>
    ${
      data.total != null
        ? `<p style="margin:0 0 16px;font-size:14px;font-family:Arial,sans-serif;"><strong>Order total:</strong> ${formatUsd(data.total)}</p>`
        : ''
    }
    ${noteBlock}
    ${emailButton(accountUrl, 'View my orders')}
  `;

  const html = emailLayout({
    preheader: cfg.preheader,
    title: cfg.subject,
    bodyHtml,
  });

  const text = `${cfg.headline}\nOrder #${data.orderNumber}\n${cfg.message}`;

  return { subject: cfg.subject, html, text };
}
