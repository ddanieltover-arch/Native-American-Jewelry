// ═══════════════════════════════════════════════════════════
// Storefront data layer — Neon Postgres (server-only)
// ═══════════════════════════════════════════════════════════
import { qualifiesForFreeStandardShipping } from '@/lib/shipping-constants';
import { pickDailyRandomProducts } from '@/lib/utils';
import { getSql, isDatabaseConfigured } from '@/lib/neon';
import { uploadToR2, R2_PREFIX } from '@/lib/r2';

export { isDatabaseConfigured };

type ProductRow = Record<string, unknown> & { id: string; category_id?: string | null };
type CategoryMini = { id: string; name: string; slug: string } | null;
type ImageRow = { id?: string; url: string; alt?: string | null; is_primary?: boolean; position?: number };
type VariantRow = {
  id: string;
  name: string;
  value: string;
  price_modifier: number;
  stock_quantity: number;
  sku?: string | null;
};

async function attachProductRelations<T extends ProductRow>(
  products: T[],
  opts: { variants?: boolean } = {}
): Promise<
  (T & {
    category: CategoryMini;
    images: ImageRow[];
    variants?: VariantRow[];
  })[]
> {
  if (!products.length) return [];
  const sql = getSql();
  const ids = products.map((p) => p.id);

  const images = (await sql`
    SELECT id, product_id, url, alt, is_primary, position
    FROM product_images
    WHERE product_id = ANY(${ids}::uuid[])
    ORDER BY position ASC
  `) as (ImageRow & { product_id: string })[];

  const categories = (await sql`
    SELECT id, name, slug FROM categories
    WHERE id = ANY(${products.map((p) => p.category_id).filter(Boolean)}::uuid[])
  `) as { id: string; name: string; slug: string }[];

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const imgMap = new Map<string, ImageRow[]>();
  for (const img of images) {
    const list = imgMap.get(img.product_id) ?? [];
    list.push(img);
    imgMap.set(img.product_id, list);
  }

  let variantMap = new Map<string, VariantRow[]>();
  if (opts.variants) {
    const variants = (await sql`
      SELECT id, product_id, name, value, price_modifier, stock_quantity, sku
      FROM product_variants
      WHERE product_id = ANY(${ids}::uuid[])
    `) as (VariantRow & { product_id: string })[];
    for (const v of variants) {
      const list = variantMap.get(v.product_id) ?? [];
      list.push(v);
      variantMap.set(v.product_id, list);
    }
  }

  return products.map((p) => ({
    ...p,
    category: p.category_id ? catMap.get(p.category_id) ?? null : null,
    images: imgMap.get(p.id) ?? [],
    ...(opts.variants ? { variants: variantMap.get(p.id) ?? [] } : {}),
  }));
}

// ══════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  tags?: string[];
  page?: number;
  perPage?: number;
}

export async function getProducts(filters: ProductFilters = {}) {
  const sql = getSql();
  const { page = 1, perPage = 24 } = filters;
  const offset = (page - 1) * perPage;

  let categoryId: string | null = null;
  if (filters.category) {
    const cats = (await sql`
      SELECT id FROM categories WHERE slug = ${filters.category} LIMIT 1
    `) as { id: string }[];
    categoryId = cats[0]?.id ?? null;
  }

  const search = filters.search?.trim() || null;
  const minPrice = filters.minPrice ?? null;
  const maxPrice = filters.maxPrice ?? null;
  const inStockOnly = filters.inStock ? true : null;
  const tags = filters.tags?.length ? filters.tags : null;
  const sortKey =
    filters.sortBy === 'price_asc' ? 1 : filters.sortBy === 'price_desc' ? 2 : 0;

  const rows = (await sql`
    SELECT p.*, COUNT(*) OVER()::int AS _total
    FROM products p
    WHERE p.status = 'active'
      AND (${categoryId}::uuid IS NULL OR p.category_id = ${categoryId}::uuid)
      AND (${search}::text IS NULL OR to_tsvector('english', p.name || ' ' || COALESCE(p.description, ''))
            @@ websearch_to_tsquery('english', ${search ?? ''}))
      AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice ?? 0})
      AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice ?? 0})
      AND (${inStockOnly}::boolean IS NULL OR p.in_stock = true)
      AND (${tags}::text[] IS NULL OR p.tags && ${tags ?? []}::text[])
    ORDER BY
      CASE WHEN ${sortKey} = 1 THEN p.price END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 2 THEN p.price END DESC NULLS LAST,
      p.created_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `) as (ProductRow & { _total: number })[];

  const total = rows[0]?._total ?? 0;
  const products = await attachProductRelations(
    rows.map(({ _total, ...p }) => p),
    { variants: true }
  );

  return {
    products,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function getProductBySlug(slug: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM products WHERE slug = ${slug} AND status = 'active' LIMIT 1
  `) as ProductRow[];
  if (!rows[0]) return null;
  const [product] = await attachProductRelations(rows, { variants: true });
  return product;
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM products
    WHERE status = 'active' AND category_id = ${categoryId} AND id <> ${productId}
    LIMIT ${limit}
  `) as ProductRow[];
  return attachProductRelations(rows);
}

export async function getFeaturedProducts(limit = 4) {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM products
    WHERE status = 'active' AND in_stock = true
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as ProductRow[];
  return attachProductRelations(rows);
}

export async function getNewArrivals(limit = 4, excludeIds: string[] = []) {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM products
    WHERE status = 'active' AND in_stock = true
    ORDER BY updated_at DESC
    LIMIT 80
  `) as ProductRow[];
  const withRels = await attachProductRelations(rows);
  return pickDailyRandomProducts(withRels, limit, excludeIds);
}

export async function searchProducts(query: string, limit = 8) {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM products
    WHERE status = 'active'
      AND to_tsvector('english', name || ' ' || COALESCE(description, ''))
          @@ websearch_to_tsquery('english', ${query})
    LIMIT ${limit}
  `) as ProductRow[];
  return attachProductRelations(rows);
}

// ══════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════

export async function getCategories() {
  const sql = getSql();
  return (await sql`SELECT * FROM categories ORDER BY sort_order ASC`) as Record<string, unknown>[];
}

export async function getFeaturedCategories() {
  const sql = getSql();
  return (await sql`
    SELECT * FROM categories WHERE featured = true ORDER BY sort_order ASC
  `) as { id: string; name: string; slug: string; banner_url?: string | null }[];
}

export type CollectionCategory = {
  id: string;
  name: string;
  slug: string;
  thumbnail_url: string | null;
};

export async function getCollectionCategories(limit = 10): Promise<CollectionCategory[]> {
  const sql = getSql();
  const [featured, allRaw, activeRaw] = await Promise.all([
    getFeaturedCategories(),
    sql`SELECT id, name, slug, banner_url, featured, sort_order FROM categories ORDER BY sort_order ASC`,
    sql`
      SELECT p.category_id, pi.url, pi.is_primary, pi.position
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.status = 'active' AND p.category_id IS NOT NULL
      ORDER BY p.created_at DESC
    `,
  ]);
  const all = allRaw as {
    id: string;
    name: string;
    slug: string;
    banner_url?: string | null;
  }[];
  const activeProducts = activeRaw as {
    category_id: string;
    url: string | null;
    is_primary: boolean | null;
    position: number | null;
  }[];

  const categoryIdsWithProducts = new Set<string>();
  const thumbByCategory = new Map<string, string>();
  const imagesByCat = new Map<string, { url: string; is_primary?: boolean; position?: number }[]>();

  for (const row of activeProducts) {
    if (!row.category_id) continue;
    categoryIdsWithProducts.add(row.category_id);
    if (!row.url) continue;
    const list = imagesByCat.get(row.category_id) ?? [];
    list.push({
      url: row.url,
      is_primary: row.is_primary ?? false,
      position: row.position ?? 0,
    });
    imagesByCat.set(row.category_id, list);
  }

  for (const [catId, images] of imagesByCat) {
    const sorted = [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const url = sorted.find((i) => i.is_primary)?.url ?? sorted[0]?.url;
    if (url) thumbByCategory.set(catId, url);
  }

  const merged: { id: string; name: string; slug: string; banner_url?: string | null }[] = [];
  for (const c of featured) {
    if (!merged.some((m) => m.id === c.id)) merged.push(c);
  }
  for (const c of all) {
    if (!merged.some((m) => m.id === c.id)) merged.push(c);
  }

  return merged
    .filter((c) => categoryIdsWithProducts.has(c.id))
    .slice(0, limit)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      thumbnail_url: thumbByCategory.get(cat.id) ?? cat.banner_url ?? null,
    }));
}

// ══════════════════════════════════════════════════════════
// SHIPPING
// ══════════════════════════════════════════════════════════

export async function getShippingRates(zone?: 'usa' | 'international') {
  const sql = getSql();
  if (zone) {
    return (await sql`
      SELECT * FROM shipping_rates WHERE active = true AND zone = ${zone} ORDER BY rate ASC
    `) as Record<string, unknown>[];
  }
  return (await sql`
    SELECT * FROM shipping_rates WHERE active = true ORDER BY rate ASC
  `) as Record<string, unknown>[];
}

export async function getShippingRateById(id: string) {
  const sql = getSql();
  const rows = (await sql`SELECT * FROM shipping_rates WHERE id = ${id} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  return rows[0] ?? null;
}

// ══════════════════════════════════════════════════════════
// NEWSLETTER & CONTACT
// ══════════════════════════════════════════════════════════

/** @deprecated use isDatabaseConfigured */
export function isSupabaseAdminConfigured(): boolean {
  return isDatabaseConfigured();
}

export async function subscribeNewsletter(
  email: string,
  source = 'footer'
): Promise<{ ok: true; duplicate?: boolean }> {
  const sql = getSql();
  const normalized = email.trim().toLowerCase();
  try {
    await sql`
      INSERT INTO newsletter_subscribers (email, source)
      VALUES (${normalized}, ${source})
    `;
    return { ok: true };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') return { ok: true, duplicate: true };
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function saveContactSubmission(payload: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<{ ok: true }> {
  const sql = getSql();
  await sql`
    INSERT INTO contact_submissions (name, email, subject, message)
    VALUES (
      ${payload.name.trim()},
      ${payload.email.trim().toLowerCase()},
      ${payload.subject?.trim() || null},
      ${payload.message.trim()}
    )
  `;
  return { ok: true };
}

// ══════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════

export async function validateCoupon(code: string, subtotal: number) {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM coupons
    WHERE code = ${code.toUpperCase()} AND active = true
    LIMIT 1
  `) as {
    id: string;
    expires_at: string | null;
    max_uses: number | null;
    used_count: number;
    min_order: number;
    type: string;
    value: number;
  }[];

  const coupon = rows[0];
  if (!coupon) return { valid: false, error: 'Coupon not found' };

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'Coupon has expired' };
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }
  if (subtotal < Number(coupon.min_order)) {
    return { valid: false, error: `Minimum order of $${coupon.min_order} required` };
  }

  const discount =
    coupon.type === 'percent'
      ? (subtotal * Number(coupon.value)) / 100
      : Math.min(Number(coupon.value), subtotal);

  return { valid: true, coupon, discount };
}

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════

export interface CreateOrderPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    zip?: string;
  };
  shippingRateId: string;
  paymentMethod: 'chime' | 'cashapp' | 'apple_cash' | 'zelle' | 'bank_transfer';
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>;
  couponCode?: string;
  notes?: string;
  customerId?: string;
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NAJ-${year}-${rand}`;
}

export async function createOrder(payload: CreateOrderPayload) {
  const sql = getSql();

  const shippingRate = await getShippingRateById(payload.shippingRateId);
  if (!shippingRate) throw new Error('Invalid shipping rate');

  const subtotal = payload.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shippingCost = qualifiesForFreeStandardShipping(
    {
      method: String(shippingRate.method ?? 'standard'),
      free_threshold:
        shippingRate.free_threshold === null || shippingRate.free_threshold === undefined
          ? null
          : Number(shippingRate.free_threshold),
    },
    subtotal
  )
    ? 0
    : Number(shippingRate.rate);

  let discountAmount = 0;
  if (payload.couponCode) {
    const couponResult = await validateCoupon(payload.couponCode, subtotal);
    if (couponResult.valid && couponResult.coupon) {
      discountAmount = couponResult.discount ?? 0;
      await sql`
        UPDATE coupons SET used_count = used_count + 1 WHERE id = ${couponResult.coupon.id}
      `;
    }
  }

  const total = subtotal + shippingCost - discountAmount;

  let customerId: string | null = payload.customerId ?? null;
  if (!customerId) {
    const existing = (await sql`
      SELECT id FROM customers WHERE email = ${payload.email} LIMIT 1
    `) as { id: string }[];
    if (existing[0]) customerId = existing[0].id;
  }

  if (customerId) {
    await sql`
      UPDATE customers SET
        first_name = ${payload.firstName},
        last_name = ${payload.lastName},
        phone = ${payload.phone ?? null}
      WHERE id = ${customerId}
    `;
  }

  const orderNumber = generateOrderNumber();
  const shippingAddress = {
    email: payload.email,
    first_name: payload.firstName,
    last_name: payload.lastName,
    phone: payload.phone ?? null,
    line1: payload.address.line1,
    line2: payload.address.line2 ?? null,
    city: payload.address.city,
    state: payload.address.state ?? null,
    country: payload.address.country,
    zip: payload.address.zip ?? null,
  };

  const orderRows = (await sql`
    INSERT INTO orders (
      order_number, customer_id, status, subtotal, shipping_cost, discount_amount, total,
      shipping_method, shipping_address, coupon_code, notes
    ) VALUES (
      ${orderNumber},
      ${customerId},
      'awaiting_payment',
      ${subtotal},
      ${shippingCost},
      ${discountAmount},
      ${total},
      ${String(shippingRate.label)},
      ${JSON.stringify(shippingAddress)}::jsonb,
      ${payload.couponCode ?? null},
      ${payload.notes ?? null}
    )
    RETURNING id
  `) as { id: string }[];

  const orderId = orderRows[0].id;

  for (const item of payload.items) {
    await sql`
      INSERT INTO order_items (
        order_id, product_id, product_name, variant_id, quantity, unit_price, subtotal
      ) VALUES (
        ${orderId},
        ${item.productId},
        ${item.productName},
        ${item.variantId ?? null},
        ${item.quantity},
        ${item.unitPrice},
        ${item.unitPrice * item.quantity}
      )
    `;
  }

  await sql`
    INSERT INTO payments (order_id, method, status, amount)
    VALUES (${orderId}, ${payload.paymentMethod}, 'pending', ${total})
  `;

  for (const item of payload.items) {
    try {
      await sql`SELECT decrement_stock(${item.productId}::uuid, ${item.quantity}::int)`;
    } catch {
      /* non-fatal */
    }
  }

  return {
    orderNumber,
    orderId,
    total,
    subtotal,
    shippingCost,
    discountAmount,
    shippingMethod: String(shippingRate.label),
  };
}

export async function getCustomerOrders(customerId: string) {
  const sql = getSql();
  const orders = (await sql`
    SELECT * FROM orders WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `) as { id: string }[];

  if (!orders.length) return [];

  const ids = orders.map((o) => o.id);
  const items = (await sql`
    SELECT * FROM order_items WHERE order_id = ANY(${ids}::uuid[])
  `) as { order_id: string }[];
  const payments = (await sql`
    SELECT * FROM payments WHERE order_id = ANY(${ids}::uuid[])
  `) as { order_id: string }[];

  return orders.map((o) => ({
    ...o,
    items: items.filter((i) => i.order_id === o.id),
    payment: payments.filter((p) => p.order_id === o.id),
  }));
}

export async function getOrderByIdForCustomer(orderId: string, customerId: string) {
  const sql = getSql();
  const orders = (await sql`
    SELECT * FROM orders WHERE id = ${orderId} AND customer_id = ${customerId} LIMIT 1
  `) as { id: string }[];
  if (!orders[0]) return null;

  const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  const payments = await sql`SELECT * FROM payments WHERE order_id = ${orderId}`;
  return { ...orders[0], items, payment: payments };
}

export async function uploadPaymentProof(
  orderId: string,
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  _authToken?: string
) {
  const sql = getSql();
  const filePath = `${R2_PREFIX.paymentProofs}/${orderId}/${Date.now()}_${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadToR2(filePath, buffer, file.type || 'application/octet-stream');

  await sql`
    UPDATE payments SET status = 'uploaded', proof_url = ${publicUrl}
    WHERE order_id = ${orderId}
  `;
  await sql`
    UPDATE orders SET status = 'payment_uploaded' WHERE id = ${orderId}
  `;

  return publicUrl;
}

export async function ensureCustomerRow(input: {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}) {
  const sql = getSql();
  const existing = (await sql`
    SELECT id, email, first_name, last_name, phone, wishlist, blacklisted
    FROM customers WHERE id = ${input.id} LIMIT 1
  `) as Record<string, unknown>[];

  if (existing[0]) return existing[0];

  const inserted = (await sql`
    INSERT INTO customers (id, email, first_name, last_name, phone)
    VALUES (
      ${input.id},
      ${input.email},
      ${input.first_name ?? null},
      ${input.last_name ?? null},
      ${input.phone ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
      last_name = COALESCE(EXCLUDED.last_name, customers.last_name),
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      updated_at = NOW()
    RETURNING id, email, first_name, last_name, phone, wishlist, blacklisted
  `) as Record<string, unknown>[];

  return inserted[0] ?? null;
}

export async function updateCustomerProfile(
  customerId: string,
  updates: { first_name?: string | null; last_name?: string | null; phone?: string | null; wishlist?: string[] }
) {
  const sql = getSql();
  if (updates.wishlist) {
    await sql`
      UPDATE customers SET wishlist = ${updates.wishlist}::uuid[] WHERE id = ${customerId}
    `;
  }
  if (
    updates.first_name !== undefined ||
    updates.last_name !== undefined ||
    updates.phone !== undefined
  ) {
    const current = (await sql`
      SELECT first_name, last_name, phone FROM customers WHERE id = ${customerId} LIMIT 1
    `) as { first_name: string | null; last_name: string | null; phone: string | null }[];
    const c = current[0];
    if (!c) return;
    await sql`
      UPDATE customers SET
        first_name = ${updates.first_name !== undefined ? updates.first_name : c.first_name},
        last_name = ${updates.last_name !== undefined ? updates.last_name : c.last_name},
        phone = ${updates.phone !== undefined ? updates.phone : c.phone}
      WHERE id = ${customerId}
    `;
  }
}

export async function getCustomerAddresses(customerId: string) {
  const sql = getSql();
  return await sql`
    SELECT * FROM customer_addresses
    WHERE customer_id = ${customerId}
    ORDER BY is_default DESC
  `;
}

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS / TESTIMONIALS / WISHLIST
// ══════════════════════════════════════════════════════════

export async function getNotificationConfig() {
  const sql = getSql();
  const rows = await sql`SELECT * FROM notifications WHERE active = true LIMIT 1`;
  return rows[0] ?? null;
}

export async function getApprovedTestimonials(limit = 6) {
  const sql = getSql();
  return await sql`
    SELECT * FROM testimonials
    WHERE approved = true
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function syncWishlist(customerId: string, productIds: string[]) {
  await updateCustomerProfile(customerId, { wishlist: productIds });
}

export async function getWishlistProducts(productIds: string[]) {
  if (!productIds.length) return [];
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM products
    WHERE id = ANY(${productIds}::uuid[]) AND status = 'active'
  `) as ProductRow[];
  return attachProductRelations(rows);
}

export async function getActiveProductsForFeed(limit = 5000) {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, slug, description, price, sku, in_stock, seo_title, category_id
    FROM products WHERE status = 'active' LIMIT ${limit}
  `) as ProductRow[];
  return attachProductRelations(rows);
}

export async function getActiveProductSlugs() {
  const sql = getSql();
  return (await sql`
    SELECT slug, updated_at FROM products WHERE status = 'active'
  `) as { slug: string; updated_at: string }[];
}
