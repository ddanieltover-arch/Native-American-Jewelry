import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  renderOrderConfirmationEmail,
  renderNewOrderAdminEmail,
  type PaymentMethod,
} from '@naj/emails';
import { createOrder } from '@/lib/db';
import { getAdminEmail, sendEmailSafe, sendTransactionalEmail } from '@/lib/email';
import { createServerClientInstance } from '@/lib/supabase-server';
import { ensureCustomerProfile } from '@/lib/auth/customer';

const OrderSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    country: z.string().default('US'),
    zip: z.string().optional(),
  }),
  shippingRateId: z.string().uuid(),
  paymentMethod: z.enum(['chime', 'cashapp', 'apple_cash', 'zelle', 'bank_transfer']),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        productName: z.string(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().positive(),
      })
    )
    .min(1),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = OrderSchema.parse(body);

    let customerId: string | undefined;
    const supabase = await createServerClientInstance();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await ensureCustomerProfile(supabase, user);
      customerId = user.id;
    }

    const result = await createOrder({ ...parsed, customerId });

    const customerName = `${parsed.firstName} ${parsed.lastName}`.trim();
    const lineItems = parsed.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
    }));

    const { subject, html, text } = renderOrderConfirmationEmail({
      customerName,
      orderNumber: result.orderNumber,
      orderId: result.orderId,
      items: lineItems,
      subtotal: result.subtotal,
      shippingCost: result.shippingCost,
      discountAmount: result.discountAmount,
      total: result.total,
      paymentMethod: parsed.paymentMethod as PaymentMethod,
      shippingMethod: result.shippingMethod,
    });

    await sendEmailSafe('order-confirmation-customer', () =>
      sendTransactionalEmail({
        to: parsed.email,
        subject,
        html,
        text,
      })
    );

    const adminEmail = renderNewOrderAdminEmail({
      orderNumber: result.orderNumber,
      orderId: result.orderId,
      customerName,
      customerEmail: parsed.email,
      customerPhone: parsed.phone,
      items: lineItems,
      subtotal: result.subtotal,
      shippingCost: result.shippingCost,
      discountAmount: result.discountAmount,
      total: result.total,
      paymentMethod: parsed.paymentMethod as PaymentMethod,
      shippingMethod: result.shippingMethod,
    });

    await sendEmailSafe('order-confirmation-admin', () =>
      sendTransactionalEmail({
        to: getAdminEmail(),
        subject: adminEmail.subject,
        html: adminEmail.html,
        text: adminEmail.text,
      })
    );

    return NextResponse.json(
      {
        data: {
          orderNumber: result.orderNumber,
          orderId: result.orderId,
          total: result.total,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      );
    }
    console.error('Order creation error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
