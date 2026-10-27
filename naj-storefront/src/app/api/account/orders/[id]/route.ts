import { NextResponse } from 'next/server';
import { createServerClientInstance } from '@/lib/supabase-server';
import { getOrderByIdForCustomer } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const order = await getOrderByIdForCustomer(id, user.id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ order });
}
