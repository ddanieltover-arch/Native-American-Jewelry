import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/db';
import { mapDbProduct, mapDbProducts } from '@/lib/product-mapper';
import ProductDetail from '@/components/store/ProductDetail';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const raw = await getProductBySlug(slug);
  if (!raw) notFound();

  const row = raw as Record<string, unknown>;
  const product = mapDbProduct(row);
  const relatedRaw =
    row.category_id != null
      ? await getRelatedProducts(row.id as string, row.category_id as string)
      : [];
  const related = mapDbProducts(relatedRaw as Record<string, unknown>[]);

  return <ProductDetail product={product} related={related} />;
}
