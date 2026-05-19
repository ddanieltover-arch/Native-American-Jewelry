import { NextRequest, NextResponse } from 'next/server';
import { adminRejectProduct, adminBulkRejectProducts } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin', 'editor'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { productId, productIds } = await req.json();

  if (productIds?.length) {
    await adminBulkRejectProducts(productIds);
    return NextResponse.json({ data: { rejected: productIds.length } });
  }

  if (productId) {
    await adminRejectProduct(productId);
    return NextResponse.json({ data: { rejected: true } });
  }

  return NextResponse.json({ error: 'productId or productIds required' }, { status: 400 });
}
