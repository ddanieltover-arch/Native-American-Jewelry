import { NextRequest, NextResponse } from 'next/server';
import {
  adminGetCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
  adminDeleteCoupon,
} from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupons = await adminGetCoupons();
  return NextResponse.json({ data: coupons });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const coupon = await adminCreateCoupon(body);
  return NextResponse.json({ data: coupon });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, active, action } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (action === 'delete') {
    await adminDeleteCoupon(id);
  } else if (typeof active === 'boolean') {
    await adminToggleCoupon(id, active);
  }

  const coupons = await adminGetCoupons();
  return NextResponse.json({ data: coupons });
}
