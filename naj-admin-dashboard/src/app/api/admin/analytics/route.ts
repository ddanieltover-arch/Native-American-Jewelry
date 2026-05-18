import { NextRequest, NextResponse } from 'next/server';
import { adminGetAnalytics } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '30');
  const data = await adminGetAnalytics(days);
  return NextResponse.json({ data });
}
