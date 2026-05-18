'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Button, Input, Textarea, Select, Badge } from '@/components/admin/ui';
import { adminPatch, useAdminApi } from '@/lib/use-admin-api';
import { formatPrice, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS } from '@/lib/utils';
import type { AdminProduct, ProductStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export default function ProductEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data: product, loading, error } = useAdminApi<AdminProduct>(`/api/admin/products/${id}`);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState<ProductStatus>('pending');
  const [inStock, setInStock] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? '');
    setPrice(String(product.price));
    setStock(String(product.stock_quantity));
    setStatus(product.status);
    setInStock(product.in_stock);
  }, [product]);

  const save = async () => {
    setSaving(true);
    try {
      await adminPatch(`/api/admin/products/${id}`, {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        stock_quantity: parseInt(stock, 10),
        in_stock: inStock,
        status,
      });
      toast.success('Product saved');
      router.push('/admin/products');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 p-8">Loading product…</p>;
  }

  if (error || !product) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-red-600">{error ?? 'Product not found'}</p>
        <Link href="/admin/products"><Button variant="secondary">Back to Products</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={14} /> Products
        </Link>
        <Badge className={PRODUCT_STATUS_COLORS[product.status]}>
          {PRODUCT_STATUS_LABELS[product.status]}
        </Badge>
      </div>

      <PageHeader title="Edit Product" subtitle={product.sku ?? product.slug} />

      <Card>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            label="Description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Price (USD)"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label="Stock quantity"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            options={STATUS_OPTIONS}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded border-gray-300"
            />
            In stock
          </label>
          <p className="text-xs text-gray-500">
            Source price: {formatPrice(product.source_price)}
            {product.source_url && (
              <>
                {' '}
                ·{' '}
                <a
                  href={product.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View source
                </a>
              </>
            )}
          </p>
          <div className="flex gap-3 pt-2">
            <Button loading={saving} onClick={save}>
              <Save size={14} /> Save changes
            </Button>
            <Link
              href="/admin/products"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
