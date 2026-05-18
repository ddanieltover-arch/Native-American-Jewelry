import { NextRequest, NextResponse } from 'next/server';
import { createServerClientInstance } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order } = await admin
    .from('orders')
    .select('id, customer_id')
    .eq('id', orderId)
    .single();

  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const filePath = `${orderId}/${Date.now()}_${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('payment-proofs')
    .upload(filePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('payment-proofs').getPublicUrl(filePath);

  await admin
    .from('payments')
    .update({ status: 'uploaded', proof_url: publicUrl })
    .eq('order_id', orderId);

  await admin.from('orders').update({ status: 'payment_uploaded' }).eq('id', orderId);

  return NextResponse.json({ data: { url: publicUrl } });
}
