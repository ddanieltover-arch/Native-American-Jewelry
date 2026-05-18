import { NextRequest, NextResponse } from 'next/server';
import { adminGetProduct, adminUpdateProduct } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const product = await adminGetProduct(params.id);
    return NextResponse.json({ data: product });
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin', 'editor'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  await adminUpdateProduct(params.id, body);
  const product = await adminGetProduct(params.id);
  return NextResponse.json({ data: product });
}
