import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'super_admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scraperUrl = (process.env.SCRAPER_SERVICE_URL ?? '').replace(/\/$/, '');
  const apiKey = process.env.SCRAPER_API_KEY?.trim();

  if (!scraperUrl || !apiKey) {
    return NextResponse.json(
      {
        error:
          'Admin is missing SCRAPER_SERVICE_URL or SCRAPER_API_KEY. Add them in Vercel → Settings → Environment Variables.',
      },
      { status: 503 }
    );
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (scraperUrl.includes('localhost') || scraperUrl.includes('127.0.0.1'))
  ) {
    return NextResponse.json(
      {
        error:
          'SCRAPER_SERVICE_URL cannot be localhost in production. Use your public scraper URL (e.g. https://naj-scraper-api.onrender.com).',
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${scraperUrl}/scrape/trigger`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(90_000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : res.status === 401
            ? 'Scraper rejected API key — SCRAPER_API_KEY must match on admin and scraper service'
            : `Scraper returned ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status >= 500 ? 503 : res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: `Scraper service unreachable at ${scraperUrl}. ${message}. Is naj-scraper-api running?`,
      },
      { status: 503 }
    );
  }
}
