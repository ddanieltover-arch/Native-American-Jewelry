import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scraperUrl = (process.env.SCRAPER_SERVICE_URL ?? '').replace(/\/$/, '');
  const hasApiKey = Boolean(process.env.SCRAPER_API_KEY?.trim());
  const isProduction = process.env.NODE_ENV === 'production';
  const pointsToLocalhost =
    !scraperUrl ||
    scraperUrl.includes('localhost') ||
    scraperUrl.includes('127.0.0.1');

  if (!scraperUrl || !hasApiKey) {
    return NextResponse.json({
      data: {
        ok: false,
        configured: false,
        reachable: false,
        error: 'Set SCRAPER_SERVICE_URL and SCRAPER_API_KEY on Vercel (admin project).',
      },
    });
  }

  if (isProduction && pointsToLocalhost) {
    return NextResponse.json({
      data: {
        ok: false,
        configured: true,
        reachable: false,
        error:
          'SCRAPER_SERVICE_URL points to localhost. Use your Render URL, e.g. https://naj-scraper-api.onrender.com',
      },
    });
  }

  try {
    const res = await fetch(`${scraperUrl}/health`, {
      signal: AbortSignal.timeout(15_000),
    });
    const health = await res.json().catch(() => null);
    const redisConfigured = health?.queues != null;
    return NextResponse.json({
      data: {
        ok: res.ok,
        configured: true,
        reachable: res.ok,
        scraperUrl,
        health,
        redisConfigured,
        error: res.ok
          ? redisConfigured
            ? null
            : 'API is up but Redis/queues are not connected — add REDIS_URL on Render or set SCRAPE_INLINE=true on the API service.'
          : `Scraper health returned ${res.status}`,
      },
    });
  } catch {
    return NextResponse.json({
      data: {
        ok: false,
        configured: true,
        reachable: false,
        scraperUrl,
        error: `Cannot reach scraper at ${scraperUrl}. Deploy naj-scraper-api on Render and update Vercel env.`,
      },
    });
  }
}
