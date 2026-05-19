import { NextRequest, NextResponse } from 'next/server';
import { adminVerifyPayment } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { notifyPaymentStatusEmail } from '@/lib/notify-customer';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, notes } = await req.json();

  if (!['confirmed', 'failed', 'refunded'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const orderId = await adminVerifyPayment(params.id, status, admin.id);

  const notify = notes?.notifyCustomer !== false;
  if (notify) {
    try {
      await notifyPaymentStatusEmail(
        orderId,
        status,
        typeof notes?.adminNote === 'string' ? notes.adminNote : undefined
      );
    } catch (err) {
      console.error('Payment status email failed:', err);
    }
  }

  return NextResponse.json({ data: { verified: true, orderId } });
}
