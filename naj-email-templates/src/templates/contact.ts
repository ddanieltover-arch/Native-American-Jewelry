import { emailLayout } from '../layout';
import { escapeHtml } from '../utils';

export type ContactEmailData = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

export function renderContactAdminEmail(data: ContactEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = data.subject
    ? `[Contact] ${data.subject}`
    : `[Contact] Message from ${data.name}`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#0e0c0a;">New contact form message</h2>
    <p style="margin:0 0 8px;font-size:14px;font-family:Arial,sans-serif;"><strong>Name:</strong> ${escapeHtml(data.name)}</p>
    <p style="margin:0 0 8px;font-size:14px;font-family:Arial,sans-serif;"><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
    ${data.subject ? `<p style="margin:0 0 8px;font-size:14px;font-family:Arial,sans-serif;"><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>` : ''}
    <p style="margin:16px 0 8px;font-size:14px;font-family:Arial,sans-serif;"><strong>Message:</strong></p>
    <p style="margin:0;font-size:14px;line-height:1.65;font-family:Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
  `;

  return {
    subject,
    html: emailLayout({
      preheader: `Contact from ${data.name}`,
      title: subject,
      bodyHtml,
    }),
    text: `Contact from ${data.name} (${data.email})\n\n${data.message}`,
  };
}

export function renderContactConfirmationEmail(data: { name: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(data.name || 'there');
  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#0e0c0a;">We received your message</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      Hi ${name}, thank you for reaching out to Native American Jewelry. We received your message and will respond within 1–2 business days.
    </p>
    <p style="margin:0;font-size:13px;color:#8b5e3c;font-family:Arial,sans-serif;">This is an automated confirmation.</p>
  `;

  return {
    subject: 'We received your message — Native American Jewelry',
    html: emailLayout({
      preheader: 'Thanks for contacting us',
      title: 'Message received',
      bodyHtml,
    }),
    text: `Hi ${data.name}, we received your message and will respond within 1–2 business days.`,
  };
}
