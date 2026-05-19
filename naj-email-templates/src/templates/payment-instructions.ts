import { siteUrl } from '../brand';
import { emailButton, emailLayout, infoBox } from '../layout';
import { paymentMethodLabel, renderPaymentInstructionsHtml } from '../payment-details';
import type { PaymentInstructionsEmailData } from '../types';
import { escapeHtml, formatUsd } from '../utils';

export function renderPaymentInstructionsEmail(data: PaymentInstructionsEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const base = data.siteUrl ?? siteUrl();
  const proofUrl = `${base}/account/orders/${data.orderId}`;
  const paymentHtml = renderPaymentInstructionsHtml(
    data.paymentMethod,
    data.orderNumber,
    data.total
  );

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8b5e3c;font-family:Arial,sans-serif;">
      Payment instructions
    </p>
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:400;color:#0e0c0a;">
      Hi ${escapeHtml(data.customerName || 'there')},
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      Here are the payment details for order <strong>#${escapeHtml(data.orderNumber)}</strong>
      (${formatUsd(data.total)} via ${escapeHtml(paymentMethodLabel(data.paymentMethod))}).
    </p>
    ${infoBox(paymentHtml)}
    <p style="margin:0;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
      Once paid, upload your receipt so we can start fulfillment.
    </p>
    ${emailButton(proofUrl, 'Upload payment proof')}
  `;

  const html = emailLayout({
    preheader: `How to pay for order ${data.orderNumber}`,
    title: `Payment instructions — ${data.orderNumber}`,
    bodyHtml,
  });

  const text = `Payment instructions for order #${data.orderNumber}\nTotal: ${formatUsd(data.total)}\nUpload proof: ${proofUrl}`;

  return {
    subject: `Payment instructions — ${data.orderNumber}`,
    html,
    text,
  };
}
