import type { PaymentMethod } from './types';
import { escapeHtml } from './utils';

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

/** Store-specific payment handles — set in env on Vercel / Render */
export function getPaymentInstructions(
  method: PaymentMethod,
  orderNumber: string,
  total: number
): { title: string; lines: string[] } {
  const amountLine = `Amount due: $${total.toFixed(2)} USD`;
  const refLine = `Include order number ${orderNumber} in the payment note/memo.`;

  const chime = process.env.PAYMENT_CHIME_HANDLE ?? '$NativeAmericanJewelry';
  const cashapp = process.env.PAYMENT_CASHAPP_TAG ?? '$NativeAmJewelry';
  const appleCash = process.env.PAYMENT_APPLE_CASH_PHONE ?? '(contact us for Apple Cash number)';
  const zelle =
    process.env.PAYMENT_ZELLE_EMAIL ??
    process.env.ZELLE_EMAIL ??
    'orders@nativeamericanjewelry.com';
  const bankName = process.env.PAYMENT_BANK_NAME ?? 'Your bank name (configure PAYMENT_BANK_NAME)';
  const bankRouting = process.env.PAYMENT_BANK_ROUTING ?? '—';
  const bankAccount = process.env.PAYMENT_BANK_ACCOUNT ?? '—';

  switch (method) {
    case 'chime':
      return {
        title: 'Pay with Chime',
        lines: [
          amountLine,
          `Send to Chime: ${chime}`,
          refLine,
          'Allow 24–48 hours for us to verify your payment after you upload proof.',
        ],
      };
    case 'cashapp':
      return {
        title: 'Pay with Cash App',
        lines: [
          amountLine,
          `Send to: ${cashapp}`,
          refLine,
          'Allow 24–48 hours for us to verify your payment after you upload proof.',
        ],
      };
    case 'apple_cash':
      return {
        title: 'Pay with Apple Cash',
        lines: [
          amountLine,
          `Send via iMessage to: ${appleCash}`,
          refLine,
          'Allow 24–48 hours for us to verify your payment after you upload proof.',
        ],
      };
    case 'zelle':
      return {
        title: 'Pay with Zelle',
        lines: [
          amountLine,
          `Send to Zelle email: ${zelle}`,
          refLine,
          'Allow 24–48 hours for us to verify your payment after you upload proof.',
        ],
      };
    case 'bank_transfer':
      return {
        title: 'Bank transfer / ACH',
        lines: [
          amountLine,
          `Bank: ${bankName}`,
          `Routing: ${bankRouting}`,
          `Account: ${bankAccount}`,
          refLine,
          'Wire transfers may take 1–3 business days to appear.',
        ],
      };
    default:
      return { title: 'Payment', lines: [amountLine, refLine] };
  }
}

export function renderPaymentInstructionsHtml(
  method: PaymentMethod,
  orderNumber: string,
  total: number
): string {
  const { title, lines } = getPaymentInstructions(method, orderNumber, total);
  const list = lines
    .map((line) => `<li style="margin-bottom:8px;">${escapeHtml(line)}</li>`)
    .join('');
  return `<p style="margin:0 0 12px;font-weight:600;color:#3d2c1e;font-family:Arial,sans-serif;">${escapeHtml(title)} (${escapeHtml(paymentMethodLabel(method))})</p>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:#3d2c1e;font-family:Arial,sans-serif;">${list}</ul>`;
}
