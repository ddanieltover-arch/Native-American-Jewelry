import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/db';
import { mapDbProduct } from '@/lib/product-mapper';

export const revalidate = 300;

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: mapDbProduct(product as Record<string, unknown>) });
}
