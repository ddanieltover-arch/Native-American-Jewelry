import { NextRequest, NextResponse } from 'next/server';
import { adminGetNotificationConfig, adminUpdateNotificationConfig } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = await adminGetNotificationConfig();
  return NextResponse.json({ data: config });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await adminUpdateNotificationConfig(id, updates);
  const config = await adminGetNotificationConfig();
  return NextResponse.json({ data: config });
}
