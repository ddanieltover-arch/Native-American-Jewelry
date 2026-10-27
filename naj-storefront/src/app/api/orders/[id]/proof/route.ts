import { NextRequest, NextResponse } from 'next/server';
import { createServerClientInstance } from '@/lib/supabase-server';
import { getSql } from '@/lib/neon';
import { uploadPaymentProof } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('proof') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const sql = getSql();
  const orders = (await sql`
    SELECT id, customer_id FROM orders WHERE id = ${orderId} LIMIT 1
  `) as { id: string; customer_id: string | null }[];

  const order = orders[0];
  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    const publicUrl = await uploadPaymentProof(orderId, file);
    return NextResponse.json({ data: { url: publicUrl } });
  } catch (err) {
    console.error('payment proof upload failed', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
