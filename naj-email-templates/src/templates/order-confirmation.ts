import { siteUrl } from '../brand';
import { emailButton, emailLayout, infoBox } from '../layout';
import { paymentMethodLabel, renderPaymentInstructionsHtml } from '../payment-details';
import type { OrderConfirmationEmailData } from '../types';
import { escapeHtml, formatUsd } from '../utils';

export function renderOrderConfirmationEmail(data: OrderConfirmationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const base = data.siteUrl ?? siteUrl();
  const proofUrl = `${base}/account/orders/${data.orderId}`;
  const name = escapeHtml(data.customerName || 'there');
  const orderNum = escapeHtml(data.orderNumber);

  const itemRows = data.items
    .map(
      (item) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0e8d8;font-size:14px;font-family:Arial,sans-serif;">
          ${escapeHtml(item.name)} × ${item.quantity}
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #f0e8d8;font-size:14px;font-family:Arial,sans-serif;">
          ${formatUsd(item.subtotal)}
        </td>
      </tr>`
    )
    .join('');

  const totalsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr><td style="font-size:13px;font-family:Arial,sans-serif;color:#8b5e3c;">Subtotal</td>
          <td align="right" style="font-size:13px;font-family:Arial,sans-serif;">${formatUsd(data.subtotal)}</td></tr>
      <tr><td style="font-size:13px;font-family:Arial,sans-serif;color:#8b5e3c;padding-top:6px;">Shipping</td>
          <td align="right" style="font-size:13px;font-family:Arial,sans-serif;padding-top:6px;">${formatUsd(data.shippingCost)}</td></tr>
      ${
        data.discountAmount > 0
          ? `<tr><td style="font-size:13px;font-family:Arial,sans-serif;color:#3da8a0;padding-top:6px;">Discount</td>
          <td align="right" style="font-size:13px;font-family:Arial,sans-serif;color:#3da8a0;padding-top:6px;">−${formatUsd(data.discountAmount)}</td></tr>`
          : ''
      }
      <tr><td style="font-size:15px;font-weight:600;font-family:Arial,sans-serif;padding-top:12px;">Total</td>
          <td align="right" style="font-size:15px;font-weight:600;font-family:Arial,sans-serif;padding-top:12px;">${formatUsd(data.total)}</td></tr>
    </table>`;

  const paymentHtml = renderPaymentInstructionsHtml(
    data.paymentMethod,
    data.orderNumber,
    data.total
  );

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8b5e3c;font-family:Arial,sans-serif;">
      Order confirmed
    </p>
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:400;color:#0e0c0a;">
      Thank you, ${name}
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      We received your order <strong>#${orderNum}</strong>. Complete payment via
      <strong>${escapeHtml(paymentMethodLabel(data.paymentMethod))}</strong> to begin processing.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <thead>
        <tr>
          <th align="left" style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8b5e3c;font-family:Arial,sans-serif;padding-bottom:8px;">Item</th>
          <th align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8b5e3c;font-family:Arial,sans-serif;padding-bottom:8px;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    ${totalsHtml}

    ${infoBox(paymentHtml)}

    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
      After sending payment, upload a screenshot from your account so we can verify within 24–48 hours.
    </p>
    ${emailButton(proofUrl, 'Upload payment proof')}
    ${emailButton(`${base}/account`, 'View my account')}
  `;

  const html = emailLayout({
    preheader: `Order ${data.orderNumber} confirmed — ${formatUsd(data.total)} due`,
    title: `Order confirmed — ${data.orderNumber}`,
    bodyHtml,
  });

  const text = [
    `Thank you, ${data.customerName}!`,
    `Order #${data.orderNumber} is confirmed.`,
    `Total: ${formatUsd(data.total)}`,
    `Payment: ${paymentMethodLabel(data.paymentMethod)}`,
    `Upload proof: ${proofUrl}`,
  ].join('\n');

  return {
    subject: `Order confirmed — ${data.orderNumber}`,
    html,
    text,
  };
}
