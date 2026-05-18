import { NextRequest, NextResponse } from 'next/server';
import { adminGetProducts } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const result = await adminGetProducts({
    status: (searchParams.get('status') as 'pending' | 'active' | 'archived') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: parseInt(searchParams.get('page') ?? '1'),
    perPage: parseInt(searchParams.get('per_page') ?? '20'),
  });
  return NextResponse.json(result);
}
