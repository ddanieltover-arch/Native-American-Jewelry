import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { createOrder } from '@/lib/db';

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

const PAYMENT_INSTRUCTIONS: Record<string, string> = {
  chime: 'Send payment to our Chime account. Details will be emailed to you.',
  cashapp: 'Send to our Cash App. Include your order number in the note.',
  apple_cash: 'Send via Apple Cash. We will provide the number via email.',
  zelle: 'Send to orders@nativeamericanjewelry.com via Zelle.',
  bank_transfer: 'Bank wire details will follow in a separate email.',
};

function buildOrderConfirmEmail(
  orderNumber: string,
  method: string,
  total: number
): string {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:40px auto">
      <h2>Thank you! Your order is confirmed.</h2>
      <p><strong>Order #:</strong> ${orderNumber}</p>
      <p><strong>Total:</strong> $${total.toFixed(2)}</p>
      <p><strong>Payment (${method}):</strong><br>${PAYMENT_INSTRUCTIONS[method] ?? ''}</p>
      <p>Upload payment proof from your account after sending payment.</p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = OrderSchema.parse(body);

    const result = await createOrder(parsed);

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails
        .send({
          from: process.env.FROM_EMAIL ?? 'orders@nativeamericanjewelry.com',
          to: parsed.email,
          subject: `Order Confirmed: ${result.orderNumber}`,
          html: buildOrderConfirmEmail(
            result.orderNumber,
            parsed.paymentMethod,
            result.total
          ),
        })
        .catch(() => null);
    }

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
