import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scraperUrl = process.env.SCRAPER_SERVICE_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${scraperUrl}/scrape/trigger`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.SCRAPER_API_KEY ?? '',
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Scraper service unavailable' }, { status: 503 });
  }
}
