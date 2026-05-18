// ═══════════════════════════════════════════════════════════
// Storefront API Routes (Next.js App Router)
// Place each block in the indicated file path
// ═══════════════════════════════════════════════════════════

// ── FILE: src/app/api/products/route.ts ──────────────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/db';

export const revalidate = 60; // ISR: revalidate every 60s

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  try {
    const result = await getProducts({
      category: searchParams.get('category') ?? undefined,
      search:   searchParams.get('search')   ?? undefined,
      sortBy:   (searchParams.get('sort_by') ?? 'featured') as any,
      minPrice: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
      maxPrice: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      inStock:  searchParams.get('in_stock') === 'true',
      page:     parseInt(searchParams.get('page') ?? '1'),
      perPage:  parseInt(searchParams.get('per_page') ?? '24'),
    });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
*/

// ── FILE: src/app/api/products/[slug]/route.ts ────────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/db';

export const revalidate = 300;

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: product });
}
*/

// ── FILE: src/app/api/orders/route.ts ─────────────────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';
import { z } from 'zod';
import { Resend } from 'resend';

const OrderSchema = z.object({
  email:          z.string().email(),
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  phone:          z.string().optional(),
  address: z.object({
    line1:   z.string().min(1),
    line2:   z.string().optional(),
    city:    z.string().min(1),
    state:   z.string().optional(),
    country: z.string().default('US'),
    zip:     z.string().optional(),
  }),
  shippingRateId: z.string().uuid(),
  paymentMethod:  z.enum(['chime','cashapp','apple_cash','zelle','bank_transfer']),
  items: z.array(z.object({
    productId:   z.string().uuid(),
    productName: z.string(),
    variantId:   z.string().uuid().optional(),
    quantity:    z.number().int().min(1),
    unitPrice:   z.number().positive(),
  })).min(1),
  couponCode: z.string().optional(),
  notes:      z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = OrderSchema.parse(body);

    const result = await createOrder(parsed);

    // Send confirmation email (non-blocking)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from:    process.env.FROM_EMAIL ?? 'orders@nativeamericanjewelry.com',
        to:      parsed.email,
        subject: `Order Confirmed: ${result.orderNumber}`,
        html:    buildOrderConfirmEmail(result.orderNumber, parsed.paymentMethod, result.total),
      }).catch(() => null);
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    console.error('Order creation error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

function buildOrderConfirmEmail(orderNumber: string, method: string, total: number): string {
  const INSTRUCTIONS: Record<string, string> = {
    chime:        'Send payment to our Chime account. We will provide details by email.',
    cashapp:      'Send to $NAJewelry on Cash App. Include your order number in the note.',
    apple_cash:   'Send via iMessage to our Apple Cash. We will send the number shortly.',
    zelle:        'Send to orders@nativeamericanjewelry.com via Zelle.',
    bank_transfer:'Bank wire details will follow in a separate email.',
  };
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:40px auto">
      <h2>Thank you! Your order is confirmed.</h2>
      <p><strong>Order #:</strong> ${orderNumber}</p>
      <p><strong>Total:</strong> $${total.toFixed(2)}</p>
      <p><strong>Payment instructions (${method}):</strong><br>${INSTRUCTIONS[method] ?? ''}</p>
      <p>Once you've sent payment, log in to your account and upload a screenshot as proof.</p>
    </div>
  `;
}
*/

// ── FILE: src/app/api/coupons/validate/route.ts ───────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  if (!code || !subtotal) {
    return NextResponse.json({ error: 'code and subtotal required' }, { status: 400 });
  }
  const result = await validateCoupon(code, subtotal);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ data: { discount: result.discount, coupon: { type: result.coupon!.type, value: result.coupon!.value, code } } });
}
*/

// ── FILE: src/app/api/shipping/route.ts ───────────────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { getShippingRates } from '@/lib/db';

export const revalidate = 3600; // cache 1h

export async function GET(req: NextRequest) {
  const zone = new URL(req.url).searchParams.get('zone') as 'usa' | 'international' | null;
  const rates = await getShippingRates(zone ?? undefined);
  return NextResponse.json({ data: rates });
}
*/

// ── FILE: src/app/api/orders/[id]/proof/route.ts ──────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { uploadPaymentProof } from '@/lib/db';
import { createServerClientInstance } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Verify auth
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('proof') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  // Get the session token to pass to the upload function
  const { data: { session } } = await supabase.auth.getSession();

  try {
    const url = await uploadPaymentProof(params.id, file, session!.access_token);
    return NextResponse.json({ data: { url } });
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
*/

export const routeBoilerplate = true; // placeholder export so file is valid TS
