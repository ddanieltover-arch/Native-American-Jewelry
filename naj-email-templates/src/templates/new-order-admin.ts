import { getAdminSiteUrl } from '../admin';
import { emailButton, emailLayout } from '../layout';
import { paymentMethodLabel } from '../payment-details';
import type { OrderLineItem, PaymentMethod } from '../types';
import { escapeHtml, formatUsd } from '../utils';

export type NewOrderAdminEmailData = {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderLineItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  shippingMethod?: string;
};

export function renderNewOrderAdminEmail(data: NewOrderAdminEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const adminBase = getAdminSiteUrl();
  const orderUrl = `${adminBase}/admin/orders/${data.orderId}`;
  const ordersListUrl = `${adminBase}/admin/orders`;

  const itemRows = data.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f0e8d8;font-size:14px;font-family:Arial,sans-serif;">${escapeHtml(item.name)} × ${item.quantity}</td>
         <td align="right" style="padding:8px 0;border-bottom:1px solid #f0e8d8;font-size:14px;font-family:Arial,sans-serif;">${formatUsd(item.subtotal)}</td></tr>`
    )
    .join('');

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:400;color:#0e0c0a;">New order — #${escapeHtml(data.orderNumber)}</h2>
    <p style="margin:0 0 16px;font-size:14px;font-family:Arial,sans-serif;">
      <strong>Customer:</strong> ${escapeHtml(data.customerName)}<br/>
      <strong>Email:</strong> <a href="mailto:${escapeHtml(data.customerEmail)}">${escapeHtml(data.customerEmail)}</a><br/>
      ${data.customerPhone ? `<strong>Phone:</strong> ${escapeHtml(data.customerPhone)}<br/>` : ''}
      <strong>Payment:</strong> ${escapeHtml(paymentMethodLabel(data.paymentMethod))}<br/>
      ${data.shippingMethod ? `<strong>Shipping:</strong> ${escapeHtml(data.shippingMethod)}<br/>` : ''}
      <strong>Total:</strong> ${formatUsd(data.total)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    ${emailButton(orderUrl, 'View order in admin')}
    ${emailButton(ordersListUrl, 'All orders in admin')}
    ${emailButton(`mailto:${escapeHtml(data.customerEmail)}`, 'Email customer')}
  `;

  return {
    subject: `[New order] #${data.orderNumber} — ${formatUsd(data.total)}`,
    html: emailLayout({
      preheader: `New order ${data.orderNumber} from ${data.customerName}`,
      title: `New order ${data.orderNumber}`,
      bodyHtml,
    }),
    text: `New order #${data.orderNumber}\nCustomer: ${data.customerName} <${data.customerEmail}>\nTotal: ${formatUsd(data.total)}\n${orderUrl}`,
  };
}
