import type { PaymentMethod } from './types';
import { escapeHtml, formatUsd } from './utils';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  chime: 'Chime',
  cashapp: 'Cash App',
  apple_cash: 'Apple Cash',
  zelle: 'Zelle',
  bank_transfer: 'Bank Transfer',
};

export function paymentMethodLabel(method: PaymentMethod): string {
  return METHOD_LABELS[method] ?? method;
}

/** Customer-facing copy — no handles, accounts, or payment credentials. */
export function renderPaymentFollowUpHtml(
  method: PaymentMethod,
  orderNumber: string,
  total: number
): string {
  const methodLabel = escapeHtml(paymentMethodLabel(method));
  const orderNum = escapeHtml(orderNumber);

  return `<p style="margin:0 0 12px;font-weight:600;color:#3d2c1e;font-family:Arial,sans-serif;">
      Your order is confirmed
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#3d2c1e;font-family:Arial,sans-serif;">
      Order <strong>#${orderNum}</strong> is confirmed immediately. Total: <strong>${formatUsd(total)}</strong>.
      You selected <strong>${methodLabel}</strong> as your payment method.
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#3d2c1e;font-family:Arial,sans-serif;">
      A member of our team will contact you as soon as possible with secure payment instructions.
      Please do not send payment until you hear from us.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.65;color:#3d2c1e;font-family:Arial,sans-serif;">
      Once we receive your payment, we begin preparing your order for shipment right away.
    </p>`;
}

export function renderPaymentFollowUpText(
  method: PaymentMethod,
  orderNumber: string,
  total: number
): string {
  return [
    `Order #${orderNumber} is confirmed. Total: ${formatUsd(total)}.`,
    `Payment method selected: ${paymentMethodLabel(method)}.`,
    'Our team will contact you as soon as possible with payment instructions.',
    'Please wait for our message before sending payment.',
  ].join(' ');
}

/** @deprecated Use renderPaymentFollowUpHtml — kept for import compatibility */
export function renderPaymentInstructionsHtml(
  method: PaymentMethod,
  orderNumber: string,
  total: number
): string {
  return renderPaymentFollowUpHtml(method, orderNumber, total);
}
