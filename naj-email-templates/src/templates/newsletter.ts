import { siteUrl } from '../brand';
import { emailCustomerCtas } from '../email-ctas';
import { emailLayout } from '../layout';
import { escapeHtml } from '../utils';

export function renderNewsletterWelcomeEmail(email: string): {
  subject: string;
  html: string;
  text: string;
} {
  const base = siteUrl();

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#0e0c0a;">Welcome to our list</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      You are subscribed to updates from Native American Jewelry — new arrivals, restocks, and collector news.
    </p>
    ${emailCustomerCtas({ baseUrl: base, includeAccount: false })}
    <p style="margin:16px 0 0;font-size:13px;color:#8b5e3c;font-family:Arial,sans-serif;">
      Subscribed as ${escapeHtml(email)}
    </p>
  `;

  return {
    subject: 'You are subscribed — Native American Jewelry',
    html: emailLayout({
      preheader: 'Thanks for subscribing',
      title: 'Newsletter subscription',
      bodyHtml,
    }),
    text: `Thanks for subscribing to Native American Jewelry updates (${email}).`,
  };
}

export function renderNewsletterAdminEmail(email: string): {
  subject: string;
  html: string;
  text: string;
} {
  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:400;color:#0e0c0a;">New newsletter subscriber</h2>
    <p style="margin:0;font-size:15px;font-family:Arial,sans-serif;">
      <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
    </p>
  `;

  return {
    subject: `[Newsletter] New subscriber: ${email}`,
    html: emailLayout({
      preheader: `New subscriber ${email}`,
      title: 'Newsletter signup',
      bodyHtml,
    }),
    text: `New newsletter subscriber: ${email}`,
  };
}
