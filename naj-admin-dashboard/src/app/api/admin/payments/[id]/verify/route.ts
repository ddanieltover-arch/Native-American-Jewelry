import { NextRequest, NextResponse } from 'next/server';
import { adminVerifyPayment } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { Resend } from 'resend';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status, notes } = await req.json();

  if (!['confirmed', 'failed', 'refunded'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await adminVerifyPayment(id, status, admin.id);

  if (process.env.RESEND_API_KEY && notes?.customerEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject =
      status === 'confirmed'
        ? 'Payment Confirmed — Your order is processing!'
        : 'Payment Issue — Action Required';
    resend.emails
      .send({
        from: process.env.FROM_EMAIL!,
        to: notes.customerEmail,
        subject,
        html: `<p>Your payment for order <strong>${notes.orderNumber}</strong> has been marked as <strong>${status}</strong>.</p>`,
      })
      .catch(() => null);
  }

  return NextResponse.json({ data: { verified: true } });
}
