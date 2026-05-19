import { siteUrl } from '../brand';
import { emailButton, emailLayout, infoBox } from '../layout';
import type { ShippingUpdateEmailData } from '../types';
import { escapeHtml } from '../utils';

export function renderShippingUpdateEmail(data: ShippingUpdateEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const base = data.siteUrl ?? siteUrl();
  const accountUrl = `${base}/account`;

  const isDelivered = data.status === 'delivered';

  const configs = {
    shipped: {
      headline: 'Your order has shipped',
      message: 'Your handcrafted pieces are on their way.',
      subject: `Shipped — ${data.orderNumber}`,
      preheader: `Order ${data.orderNumber} is on the way`,
    },
    delivered: {
      headline: 'Delivered',
      message: 'Your order has been marked as delivered. We hope you love your new jewelry!',
      subject: `Delivered — ${data.orderNumber}`,
      preheader: `Order ${data.orderNumber} was delivered`,
    },
  } as const;

  const cfg = configs[data.status];

  const details: string[] = [];
  if (data.shippingMethod) details.push(`Shipping method: ${data.shippingMethod}`);
  if (data.trackingNumber) details.push(`Tracking number: ${data.trackingNumber}`);
  if (data.estimatedDelivery) details.push(`Estimated delivery: ${data.estimatedDelivery}`);

  const detailsHtml =
    details.length > 0
      ? infoBox(
          `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
            ${details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>`
        )
      : '';

  const trackingBtn =
    data.trackingUrl && !isDelivered
      ? emailButton(data.trackingUrl, 'Track package')
      : '';

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8b5e3c;font-family:Arial,sans-serif;">
      Shipping update
    </p>
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:400;color:#0e0c0a;">
      ${cfg.headline}
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      Hi ${escapeHtml(data.customerName || 'there')}, ${cfg.message}
      Order <strong>#${escapeHtml(data.orderNumber)}</strong>.
    </p>
    ${detailsHtml}
    ${trackingBtn}
    ${emailButton(accountUrl, 'View order history')}
  `;

  const html = emailLayout({
    preheader: cfg.preheader,
    title: cfg.subject,
    bodyHtml,
  });

  const text = `${cfg.headline}\nOrder #${data.orderNumber}\n${details.join('\n')}`;

  return { subject: cfg.subject, html, text };
}
