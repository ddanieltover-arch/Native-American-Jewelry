import { siteUrl } from '../brand';
import { emailCustomerCtas } from '../email-ctas';
import { emailLayout, infoBox } from '../layout';
import { paymentMethodLabel, renderPaymentFollowUpHtml, renderPaymentFollowUpText } from '../payment-details';
import type { PaymentInstructionsEmailData } from '../types';
import { escapeHtml, formatUsd } from '../utils';

export function renderPaymentInstructionsEmail(data: PaymentInstructionsEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const base = data.siteUrl ?? siteUrl();
  const paymentHtml = renderPaymentFollowUpHtml(
    data.paymentMethod,
    data.orderNumber,
    data.total
  );

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8b5e3c;font-family:Arial,sans-serif;">
      Order update
    </p>
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:400;color:#0e0c0a;">
      Hi ${escapeHtml(data.customerName || 'there')},
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;font-family:Arial,sans-serif;">
      Regarding order <strong>#${escapeHtml(data.orderNumber)}</strong>
      (${formatUsd(data.total)} · ${escapeHtml(paymentMethodLabel(data.paymentMethod))}):
    </p>
    ${infoBox(paymentHtml)}
    ${emailCustomerCtas({ baseUrl: base, orderId: data.orderId })}
  `;

  const html = emailLayout({
    preheader: `Order ${data.orderNumber} — our team will contact you with payment details`,
    title: `Order update — ${data.orderNumber}`,
    bodyHtml,
  });

  const text = [
    `Order #${data.orderNumber}`,
    `Total: ${formatUsd(data.total)}`,
    renderPaymentFollowUpText(data.paymentMethod, data.orderNumber, data.total),
  ].join('\n');

  return {
    subject: `Order update — ${data.orderNumber}`,
    html,
    text,
  };
}
