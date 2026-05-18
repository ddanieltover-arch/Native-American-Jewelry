import { NextRequest, NextResponse } from 'next/server';
import { adminGetScrapeLogs } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const logs = await adminGetScrapeLogs(30);
  return NextResponse.json({ data: logs });
}
