import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { notifyPaymentInstructionsEmail } from '@/lib/notify-customer';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await notifyPaymentInstructionsEmail(params.id);
    return NextResponse.json({ data: { sent: true } });
  } catch (err) {
    console.error('Resend payment email failed:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
