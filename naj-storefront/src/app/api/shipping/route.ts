import { NextRequest, NextResponse } from 'next/server';
import { getShippingRates } from '@/lib/db';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const zone = new URL(req.url).searchParams.get('zone') as
    | 'usa'
    | 'international'
    | null;
  const rates = await getShippingRates(zone ?? undefined);
  return NextResponse.json({ data: rates });
}
