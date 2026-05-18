import { NextRequest, NextResponse } from 'next/server';
import { adminGetOrders } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const result = await adminGetOrders({
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: parseInt(searchParams.get('page') ?? '1'),
    perPage: parseInt(searchParams.get('per_page') ?? '20'),
  });
  return NextResponse.json(result);
}
