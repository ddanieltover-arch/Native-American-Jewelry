import { NextRequest, NextResponse } from 'next/server';
import { adminGetOrder, adminUpdateOrder } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { notifyShippingUpdateEmail } from '@/lib/notify-customer';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const order = await adminGetOrder(params.id);
    return NextResponse.json({ data: order });
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin', 'support', 'editor'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updates: Parameters<typeof adminUpdateOrder>[1] = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.shipping_method !== undefined) updates.shipping_method = body.shipping_method;

  let previousStatus: string | undefined;
  if (body.status !== undefined) {
    try {
      const before = await adminGetOrder(params.id);
      previousStatus = before.status;
    } catch {
      /* ignore */
    }
  }

  await adminUpdateOrder(params.id, updates, admin.id);
  const order = await adminGetOrder(params.id);

  const notify = body.notifyCustomer !== false;
  if (
    notify &&
    body.status &&
    body.status !== previousStatus &&
    (body.status === 'shipped' || body.status === 'delivered')
  ) {
    try {
      await notifyShippingUpdateEmail(params.id, body.status, {
        trackingNumber: body.tracking_number,
        trackingUrl: body.tracking_url,
        estimatedDelivery: body.estimated_delivery,
      });
    } catch (err) {
      console.error('Shipping update email failed:', err);
    }
  }

  return NextResponse.json({ data: order });
}
