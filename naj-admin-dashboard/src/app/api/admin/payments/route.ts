import { NextRequest, NextResponse } from 'next/server';
import { adminGetPendingPayments } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payments = await adminGetPendingPayments();
  return NextResponse.json({ data: payments });
}
