// ═══════════════════════════════════════════════════════════
// Admin API Route Handlers
// Place each block in the indicated file path in naj-admin
// All routes verify admin JWT before executing
// ═══════════════════════════════════════════════════════════

// ── FILE: src/app/api/admin/products/approve/route.ts ─────
/*
import { NextRequest, NextResponse } from 'next/server';
import { adminApproveProduct, adminBulkApproveProducts } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin','super_admin','editor'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { productId, productIds } = await req.json();

  if (productIds?.length) {
    await adminBulkApproveProducts(productIds, admin.id);
    return NextResponse.json({ data: { approved: productIds.length } });
  }

  if (productId) {
    await adminApproveProduct(productId, admin.id);
    return NextResponse.json({ data: { approved: true } });
  }

  return NextResponse.json({ error: 'productId or productIds required' }, { status: 400 });
}
*/

// ── FILE: src/app/api/admin/products/[id]/route.ts ────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { adminUpdateProduct, adminRejectProduct } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const updates = await req.json();
  await adminUpdateProduct(params.id, updates);
  return NextResponse.json({ data: { updated: true } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await adminRejectProduct(params.id);
  return NextResponse.json({ data: { archived: true } });
}
*/

// ── FILE: src/app/api/admin/orders/route.ts ───────────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { adminGetOrders } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const result = await adminGetOrders({
    status:  searchParams.get('status')  ?? undefined,
    search:  searchParams.get('search')  ?? undefined,
    page:    parseInt(searchParams.get('page')     ?? '1'),
    perPage: parseInt(searchParams.get('per_page') ?? '20'),
    sortBy:  (searchParams.get('sort_by') ?? 'created_at') as any,
    sortDir: (searchParams.get('sort_dir') ?? 'desc') as any,
  });
  return NextResponse.json(result);
}
*/

// ── FILE: src/app/api/admin/orders/[id]/status/route.ts ───
/*
import { NextRequest, NextResponse } from 'next/server';
import { adminUpdateOrderStatus } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status } = await req.json();
  await adminUpdateOrderStatus(params.id, status, admin.id);
  return NextResponse.json({ data: { updated: true } });
}
*/

// ── FILE: src/app/api/admin/payments/[id]/verify/route.ts ─
/*
import { NextRequest, NextResponse } from 'next/server';
import { adminVerifyPayment } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { Resend } from 'resend';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, notes } = await req.json();
  if (!['confirmed','failed','refunded'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await adminVerifyPayment(params.id, status, admin.id);

  // Notify customer (non-blocking)
  if (process.env.RESEND_API_KEY && notes?.customerEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject = status === 'confirmed' ? 'Payment Confirmed — Your order is processing!' : 'Payment Issue — Action Required';
    resend.emails.send({
      from:    process.env.FROM_EMAIL!,
      to:      notes.customerEmail,
      subject,
      html:    `<p>Your payment for order <strong>${notes.orderNumber}</strong> has been marked as <strong>${status}</strong>.</p>`,
    }).catch(() => null);
  }

  return NextResponse.json({ data: { verified: true } });
}
*/

// ── FILE: src/app/api/admin/analytics/route.ts ────────────
/*
import { NextRequest, NextResponse } from 'next/server';
import { adminGetAnalytics } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export const revalidate = 300; // cache 5 minutes

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '30');
  const data = await adminGetAnalytics(days);
  return NextResponse.json({ data });
}
*/

// ── FILE: src/app/api/admin/scraper/trigger/route.ts ──────
/*
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin','super_admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Forward trigger to scraper service
  const scraperUrl = process.env.SCRAPER_SERVICE_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${scraperUrl}/scrape/trigger`, {
      method:  'POST',
      headers: { 'x-api-key': process.env.SCRAPER_API_KEY! },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Scraper service unavailable' }, { status: 503 });
  }
}
*/

export const adminApiBoilerplate = true;
