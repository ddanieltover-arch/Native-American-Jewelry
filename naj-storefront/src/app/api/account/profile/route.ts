import { NextRequest, NextResponse } from 'next/server';
import { createServerClientInstance } from '@/lib/supabase-server';
import {
  ensureCustomerRow,
  getCustomerAddresses,
  getCustomerOrders,
  updateCustomerProfile,
} from '@/lib/db';

async function requireUser() {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const meta = user.user_metadata ?? {};
  const customer = await ensureCustomerRow({
    id: user.id,
    email: user.email ?? '',
    first_name: (meta.first_name as string | undefined)?.trim() || null,
    last_name: (meta.last_name as string | undefined)?.trim() || null,
    phone: (meta.phone as string | undefined)?.trim() || null,
  });

  const [orders, addresses] = await Promise.all([
    getCustomerOrders(user.id),
    getCustomerAddresses(user.id),
  ]);

  return NextResponse.json({ customer, orders, addresses });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const first_name =
    typeof body.first_name === 'string' ? body.first_name.trim() || null : undefined;
  const last_name =
    typeof body.last_name === 'string' ? body.last_name.trim() || null : undefined;
  const phone = typeof body.phone === 'string' ? body.phone.trim() || null : undefined;
  const wishlist = Array.isArray(body.wishlist)
    ? body.wishlist.filter((id: unknown) => typeof id === 'string')
    : undefined;

  await ensureCustomerRow({
    id: user.id,
    email: user.email ?? '',
  });

  await updateCustomerProfile(user.id, { first_name, last_name, phone, wishlist });

  if (first_name !== undefined || last_name !== undefined || phone !== undefined) {
    await supabase.auth.updateUser({
      data: {
        ...(first_name !== undefined ? { first_name: first_name ?? '' } : {}),
        ...(last_name !== undefined ? { last_name: last_name ?? '' } : {}),
        ...(phone !== undefined ? { phone: phone ?? '' } : {}),
      },
    });
  }

  const customer = await ensureCustomerRow({
    id: user.id,
    email: user.email ?? '',
  });

  return NextResponse.json({ customer });
}
