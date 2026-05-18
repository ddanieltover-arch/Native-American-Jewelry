import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  if (!code || subtotal == null) {
    return NextResponse.json(
      { error: 'code and subtotal required' },
      { status: 400 }
    );
  }
  const result = await validateCoupon(code, Number(subtotal));
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  const { discount, coupon } = result as {
    valid: true;
    discount: number;
    coupon: { type: string; value: number };
  };
  return NextResponse.json({
    data: {
      discount,
      coupon: { type: coupon.type, value: coupon.value, code },
    },
  });
}
