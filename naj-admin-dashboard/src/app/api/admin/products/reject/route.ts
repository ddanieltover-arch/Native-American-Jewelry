import { NextRequest, NextResponse } from 'next/server';
import { adminRejectProduct } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin', 'editor'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { productId } = await req.json();
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  await adminRejectProduct(productId);
  return NextResponse.json({ data: { rejected: true } });
}
