import {
  renderPaymentStatusEmail,
  renderPaymentInstructionsEmail,
  renderShippingUpdateEmail,
  sendTransactionalEmail,
} from '@naj/emails';
import type { PaymentMethod } from '@naj/emails';
import { adminGetOrder } from '@/lib/db';
import { getOrderContact } from '@/lib/utils';
import type { AdminOrder } from '@/types';

function customerName(order: AdminOrder): string {
  const contact = getOrderContact(order);
  if (contact.fullName) return contact.fullName;
  return contact.email?.split('@')[0] ?? 'Customer';
}

function customerEmail(order: AdminOrder): string | null {
  return getOrderContact(order).email ?? order.customer?.email ?? null;
}

export async function notifyPaymentStatusEmail(
  orderId: string,
  status: 'confirmed' | 'failed' | 'refunded',
  adminNote?: string
): Promise<void> {
  const order = await adminGetOrder(orderId);
  const to = customerEmail(order);
  if (!to) return;

  const { subject, html, text } = renderPaymentStatusEmail({
    customerName: customerName(order),
    orderNumber: order.order_number,
    status,
    total: order.total,
    adminNote,
  });

  const result = await sendTransactionalEmail({ to, subject, html, text });
  if (!result.ok && !('skipped' in result && result.skipped)) {
    console.error('Payment status email failed:', 'error' in result ? result.error : result);
    throw new Error('error' in result ? result.error : 'Email send failed');
  }
}

export async function notifyShippingUpdateEmail(
  orderId: string,
  status: 'shipped' | 'delivered',
  extras?: {
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  }
): Promise<void> {
  const order = await adminGetOrder(orderId);
  const to = customerEmail(order);
  if (!to) return;

  const { subject, html, text } = renderShippingUpdateEmail({
    customerName: customerName(order),
    orderNumber: order.order_number,
    status,
    shippingMethod: order.shipping_method ?? undefined,
    trackingNumber: extras?.trackingNumber,
    trackingUrl: extras?.trackingUrl,
    estimatedDelivery: extras?.estimatedDelivery,
  });

  const result = await sendTransactionalEmail({ to, subject, html, text });
  if (!result.ok && !('skipped' in result && result.skipped)) {
    console.error('Shipping update email failed:', 'error' in result ? result.error : result);
    throw new Error('error' in result ? result.error : 'Email send failed');
  }
}

export async function notifyPaymentInstructionsEmail(orderId: string): Promise<void> {
  const order = await adminGetOrder(orderId);
  const to = customerEmail(order);
  if (!to || !order.payment?.method) return;

  const { subject, html, text } = renderPaymentInstructionsEmail({
    customerName: customerName(order),
    orderNumber: order.order_number,
    total: order.total,
    paymentMethod: order.payment.method as PaymentMethod,
    orderId: order.id,
  });

  const result = await sendTransactionalEmail({ to, subject, html, text });
  if (!result.ok && !('skipped' in result && result.skipped)) {
    console.error('Payment instructions email failed:', 'error' in result ? result.error : result);
    throw new Error('error' in result ? result.error : 'Email send failed');
  }
}
