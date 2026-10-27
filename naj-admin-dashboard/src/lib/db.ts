// ═══════════════════════════════════════════════════════════
// Admin data layer — Neon Postgres (server-only)
// ═══════════════════════════════════════════════════════════
import { getSql } from '@/lib/neon';
import { deleteR2Keys, isR2Configured, listR2Prefix, R2_PREFIX } from '@/lib/r2';

function normalizeShippingAddress(addr: unknown) {
  if (!addr || typeof addr !== 'object') {
    return { line1: '', city: '', country: '' };
  }
  const a = addr as Record<string, unknown>;
  return {
    email: typeof a.email === 'string' ? a.email : undefined,
    first_name:
      typeof a.first_name === 'string'
        ? a.first_name
        : typeof a.firstName === 'string'
          ? a.firstName
          : undefined,
    last_name:
      typeof a.last_name === 'string'
        ? a.last_name
        : typeof a.lastName === 'string'
          ? a.lastName
          : undefined,
    phone: typeof a.phone === 'string' ? a.phone : a.phone === null ? null : undefined,
    line1: String(a.line1 ?? ''),
    line2: a.line2 ? String(a.line2) : null,
    city: String(a.city ?? ''),
    state: a.state ? String(a.state) : null,
    country: String(a.country ?? ''),
    zip: a.zip ? String(a.zip) : null,
  };
}

function normalizeOrder<T extends { payment?: unknown; items?: unknown; shipping_address?: unknown }>(
  order: T
): T {
  const normalized = { ...order } as T & {
    payment?: unknown;
    items?: unknown;
    shipping_address?: unknown;
  };
  if (Array.isArray(normalized.payment)) {
    normalized.payment = normalized.payment[0] ?? null;
  }
  if (!Array.isArray(normalized.items)) {
    normalized.items = [];
  }
  normalized.shipping_address = normalizeShippingAddress(normalized.shipping_address);
  return normalized as T;
}

function normalizeProduct<T extends {
  images?: unknown;
  category?: unknown;
  price?: unknown;
  source_price?: unknown;
  stock_quantity?: unknown;
}>(product: T): T {
  let images = product.images;
  if (!Array.isArray(images)) images = images ? [images] : [];

  let category = product.category;
  if (Array.isArray(category)) category = category[0] ?? null;

  return {
    ...product,
    images,
    category,
    price: Number(product.price ?? 0),
    source_price: Number(product.source_price ?? 0),
    stock_quantity: Number(product.stock_quantity ?? 0),
  } as T;
}

async function attachAdminProductRels<T extends { id: string; category_id?: string | null }>(
  products: T[]
) {
  if (!products.length) return [];
  const sql = getSql();
  const ids = products.map((p) => p.id);
  const images = (await sql`
    SELECT id, product_id, url, alt, is_primary, position
    FROM product_images WHERE product_id = ANY(${ids}::uuid[])
    ORDER BY position ASC
  `) as { product_id: string }[];
  const cats = (await sql`
    SELECT id, name, slug FROM categories
    WHERE id = ANY(${products.map((p) => p.category_id).filter(Boolean)}::uuid[])
  `) as { id: string; name: string; slug: string }[];
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const imgMap = new Map<string, unknown[]>();
  for (const img of images) {
    const list = imgMap.get(img.product_id) ?? [];
    list.push(img);
    imgMap.set(img.product_id, list);
  }
  return products.map((p) =>
    normalizeProduct({
      ...p,
      category: p.category_id ? catMap.get(p.category_id) ?? null : null,
      images: imgMap.get(p.id) ?? [],
    })
  );
}

// ══════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════

export interface ProductListFilters {
  status?: 'pending' | 'active' | 'archived';
  search?: string;
  category?: string;
  page?: number;
  perPage?: number;
  sortBy?: 'created_at' | 'price' | 'name';
  sortDir?: 'asc' | 'desc';
}

export async function adminGetProducts(filters: ProductListFilters = {}) {
  const sql = getSql();
  const { page = 1, perPage = 20, sortBy = 'created_at', sortDir = 'desc' } = filters;
  const offset = (page - 1) * perPage;
  const status = filters.status ?? null;
  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;
  const sortKey = sortBy === 'price' ? 1 : sortBy === 'name' ? 2 : 0;
  const asc = sortDir === 'asc';

  const rows = (await sql`
    SELECT p.*, COUNT(*) OVER()::int AS _total
    FROM products p
    WHERE (${status}::text IS NULL OR p.status = ${status})
      AND (${search}::text IS NULL OR p.name ILIKE ${search})
    ORDER BY
      CASE WHEN ${sortKey} = 1 AND ${asc} THEN p.price END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 1 AND NOT ${asc} THEN p.price END DESC NULLS LAST,
      CASE WHEN ${sortKey} = 2 AND ${asc} THEN p.name END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 2 AND NOT ${asc} THEN p.name END DESC NULLS LAST,
      CASE WHEN ${sortKey} = 0 AND ${asc} THEN p.created_at END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 0 AND NOT ${asc} THEN p.created_at END DESC NULLS LAST
    LIMIT ${perPage} OFFSET ${offset}
  `) as ({ id: string; category_id?: string | null; _total: number } & Record<string, unknown>)[];

  const total = rows[0]?._total ?? 0;
  const products = await attachAdminProductRels(rows.map(({ _total, ...p }) => p));

  return { products, total, page, perPage };
}

export async function adminApproveProduct(productId: string, adminId: string) {
  const sql = getSql();
  await sql`
    UPDATE products SET
      status = 'active',
      approved_by = ${adminId},
      approved_at = NOW()
    WHERE id = ${productId}
  `;
}

export async function adminRejectProduct(productId: string) {
  const sql = getSql();
  await sql`UPDATE products SET status = 'archived' WHERE id = ${productId}`;
}

export async function adminBulkApproveProducts(productIds: string[], adminId: string) {
  const sql = getSql();
  await sql`
    UPDATE products SET
      status = 'active',
      approved_by = ${adminId},
      approved_at = NOW()
    WHERE id = ANY(${productIds}::uuid[])
  `;
}

export async function adminBulkRejectProducts(productIds: string[]) {
  const sql = getSql();
  await sql`
    UPDATE products SET status = 'archived' WHERE id = ANY(${productIds}::uuid[])
  `;
}

export async function adminGetProduct(productId: string) {
  const sql = getSql();
  const rows = (await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1`) as {
    id: string;
    category_id?: string | null;
  }[];
  if (!rows[0]) throw new Error('Product not found');
  const [product] = await attachAdminProductRels(rows);
  return product;
}

export async function adminUpdateProduct(
  productId: string,
  updates: Partial<{
    name: string;
    description: string;
    price: number;
    stock_quantity: number;
    in_stock: boolean;
    tags: string[];
    seo_title: string;
    seo_description: string;
    status: 'active' | 'archived' | 'pending';
  }>
) {
  const sql = getSql();
  const current = (await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  if (!current[0]) throw new Error('Product not found');
  const c = current[0];
  await sql`
    UPDATE products SET
      name = ${updates.name ?? (c.name as string)},
      description = ${updates.description !== undefined ? updates.description : (c.description as string | null)},
      price = ${updates.price ?? Number(c.price)},
      stock_quantity = ${updates.stock_quantity ?? Number(c.stock_quantity)},
      in_stock = ${updates.in_stock ?? Boolean(c.in_stock)},
      tags = ${updates.tags ?? (c.tags as string[])}::text[],
      seo_title = ${updates.seo_title !== undefined ? updates.seo_title : (c.seo_title as string | null)},
      seo_description = ${
        updates.seo_description !== undefined ? updates.seo_description : (c.seo_description as string | null)
      },
      status = ${updates.status ?? (c.status as string)}
    WHERE id = ${productId}
  `;
}

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════

export interface OrderListFilters {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: 'created_at' | 'total' | 'order_number';
  sortDir?: 'asc' | 'desc';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attachOrderRels(orders: any[]): Promise<any[]> {
  if (!orders.length) return [];
  const sql = getSql();
  const ids = orders.map((o) => o.id);
  const customerIds = orders.map((o) => o.customer_id).filter(Boolean) as string[];

  const customers = customerIds.length
    ? ((await sql`
        SELECT id, email, first_name, last_name, phone FROM customers
        WHERE id = ANY(${customerIds}::uuid[])
      `) as Record<string, unknown>[])
    : [];
  const payments = (await sql`
    SELECT * FROM payments WHERE order_id = ANY(${ids}::uuid[])
  `) as (Record<string, unknown> & { order_id: string })[];
  const items = (await sql`
    SELECT * FROM order_items WHERE order_id = ANY(${ids}::uuid[])
  `) as (Record<string, unknown> & { order_id: string })[];

  const custMap = new Map(customers.map((c) => [c.id as string, c]));
  return orders.map((o: { id: string; customer_id?: string | null }) =>
    normalizeOrder({
      ...o,
      customer: o.customer_id ? custMap.get(o.customer_id) ?? null : null,
      payment: payments.filter((p) => p.order_id === o.id),
      items: items.filter((i) => i.order_id === o.id),
    })
  );
}

export async function adminGetOrders(filters: OrderListFilters = {}) {
  const sql = getSql();
  const { page = 1, perPage = 20, sortBy = 'created_at', sortDir = 'desc' } = filters;
  const offset = (page - 1) * perPage;
  const status = filters.status ?? null;
  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;
  const sortKey = sortBy === 'total' ? 1 : sortBy === 'order_number' ? 2 : 0;
  const asc = sortDir === 'asc';

  const rows = (await sql`
    SELECT o.*, COUNT(*) OVER()::int AS _total
    FROM orders o
    WHERE (${status}::text IS NULL OR o.status = ${status})
      AND (${search}::text IS NULL OR o.order_number ILIKE ${search})
    ORDER BY
      CASE WHEN ${sortKey} = 1 AND ${asc} THEN o.total END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 1 AND NOT ${asc} THEN o.total END DESC NULLS LAST,
      CASE WHEN ${sortKey} = 2 AND ${asc} THEN o.order_number END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 2 AND NOT ${asc} THEN o.order_number END DESC NULLS LAST,
      CASE WHEN ${sortKey} = 0 AND ${asc} THEN o.created_at END ASC NULLS LAST,
      CASE WHEN ${sortKey} = 0 AND NOT ${asc} THEN o.created_at END DESC NULLS LAST
    LIMIT ${perPage} OFFSET ${offset}
  `) as ({ id: string; customer_id?: string | null; _total: number } & Record<string, unknown>)[];

  const total = rows[0]?._total ?? 0;
  const orders = await attachOrderRels(rows.map(({ _total, ...o }) => o));
  return { orders, total, page, perPage };
}

export async function adminGetOrder(orderId: string) {
  const sql = getSql();
  const rows = (await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`) as {
    id: string;
    customer_id?: string | null;
  }[];
  if (!rows[0]) throw new Error('Order not found');
  const [order] = await attachOrderRels(rows);

  const items = (await sql`
    SELECT oi.*, json_build_object('name', p.name, 'slug', p.slug) AS product
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${orderId}
  `) as Record<string, unknown>[];

  return normalizeOrder({ ...order, items });
}

export async function adminUpdateOrder(
  orderId: string,
  updates: Partial<{
    status: string;
    notes: string | null;
    shipping_method: string | null;
  }>,
  adminId?: string
) {
  const sql = getSql();
  const current = (await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  if (!current[0]) throw new Error('Order not found');
  const c = current[0];
  await sql`
    UPDATE orders SET
      status = ${updates.status ?? (c.status as string)},
      notes = ${updates.notes !== undefined ? updates.notes : (c.notes as string | null)},
      shipping_method = ${
        updates.shipping_method !== undefined
          ? updates.shipping_method
          : (c.shipping_method as string | null)
      }
    WHERE id = ${orderId}
  `;

  if (updates.status && adminId) {
    try {
      await sql`
        INSERT INTO inventory_logs (product_id, change, reason, admin_id)
        VALUES (NULL, 0, ${`Order ${orderId} status → ${updates.status}`}, ${adminId})
      `;
    } catch {
      /* optional */
    }
  }
}

export async function adminUpdateOrderStatus(orderId: string, status: string, adminId: string) {
  return adminUpdateOrder(orderId, { status }, adminId);
}

export async function adminDeleteOrder(orderId: string) {
  const sql = getSql();
  if (isR2Configured()) {
    try {
      const keys = await listR2Prefix(`${R2_PREFIX.paymentProofs}/${orderId}/`);
      await deleteR2Keys(keys);
    } catch {
      /* best-effort */
    }
  }
  await sql`DELETE FROM orders WHERE id = ${orderId}`;
}

// ══════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════

export async function adminGetPendingPayments() {
  const sql = getSql();
  const payments = (await sql`
    SELECT * FROM payments
    WHERE status IN ('pending', 'uploaded')
    ORDER BY created_at DESC
  `) as (Record<string, unknown> & { order_id: string })[];

  if (!payments.length) return [];
  const orderIds = payments.map((p) => p.order_id);
  const orders = (await sql`
    SELECT * FROM orders WHERE id = ANY(${orderIds}::uuid[])
  `) as (Record<string, unknown> & { id: string; customer_id?: string | null })[];
  const customerIds = orders.map((o) => o.customer_id).filter(Boolean) as string[];
  const customers = customerIds.length
    ? ((await sql`
        SELECT id, email, first_name, last_name FROM customers
        WHERE id = ANY(${customerIds}::uuid[])
      `) as Record<string, unknown>[])
    : [];
  const custMap = new Map(customers.map((c) => [c.id as string, c]));
  const orderMap = new Map(
    orders.map((o) => [
      o.id,
      {
        ...o,
        customer: o.customer_id ? custMap.get(o.customer_id) ?? null : null,
      },
    ])
  );

  return payments.map((p) => ({ ...p, order: orderMap.get(p.order_id) ?? null }));
}

export async function adminVerifyPayment(
  paymentId: string,
  status: 'confirmed' | 'failed' | 'refunded',
  adminId: string
) {
  const sql = getSql();
  const rows = (await sql`
    UPDATE payments SET
      status = ${status},
      verified_by = ${adminId},
      verified_at = NOW()
    WHERE id = ${paymentId}
    RETURNING order_id
  `) as { order_id: string }[];

  if (!rows[0]) throw new Error('Payment not found');

  const orderStatus =
    status === 'confirmed' ? 'processing' : status === 'failed' ? 'cancelled' : 'refunded';

  await sql`UPDATE orders SET status = ${orderStatus} WHERE id = ${rows[0].order_id}`;
  return rows[0].order_id;
}

// ══════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════

export interface CustomerListFilters {
  search?: string;
  blacklisted?: boolean;
  page?: number;
  perPage?: number;
}

export async function adminGetCustomers(filters: CustomerListFilters = {}) {
  const sql = getSql();
  const { page = 1, perPage = 20 } = filters;
  const offset = (page - 1) * perPage;
  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;
  const blacklisted = filters.blacklisted;

  const rows = (await sql`
    SELECT c.*, COUNT(*) OVER()::int AS _total
    FROM customers c
    WHERE (${search}::text IS NULL OR c.email ILIKE ${search}
           OR c.first_name ILIKE ${search} OR c.last_name ILIKE ${search})
      AND (${blacklisted === undefined ? null : blacklisted}::boolean IS NULL
           OR c.blacklisted = ${blacklisted ?? false})
    ORDER BY c.created_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `) as (Record<string, unknown> & { id: string; _total: number })[];

  const total = rows[0]?._total ?? 0;
  const enriched = await Promise.all(
    rows.map(async ({ _total, ...customer }) => {
      const orderStats = (await sql`
        SELECT total FROM orders
        WHERE customer_id = ${customer.id}
          AND status NOT IN ('cancelled', 'refunded')
      `) as { total: number }[];
      return {
        ...customer,
        order_count: orderStats.length,
        total_spent: orderStats.reduce((s, o) => s + Number(o.total), 0),
      };
    })
  );

  return { customers: enriched, total, page, perPage };
}

export async function adminUpdateCustomer(
  customerId: string,
  updates: { notes?: string; blacklisted?: boolean }
) {
  const sql = getSql();
  const current = (await sql`SELECT * FROM customers WHERE id = ${customerId} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  if (!current[0]) throw new Error('Customer not found');
  await sql`
    UPDATE customers SET
      notes = ${updates.notes !== undefined ? updates.notes : (current[0].notes as string | null)},
      blacklisted = ${
        updates.blacklisted !== undefined ? updates.blacklisted : Boolean(current[0].blacklisted)
      }
    WHERE id = ${customerId}
  `;
}

export async function adminFindByEmail(email: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, role, totp_enabled FROM admin_users
    WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function adminTouchLogin(adminId: string, ip: string) {
  const sql = getSql();
  await sql`
    UPDATE admin_users SET last_login_at = NOW(), last_login_ip = ${ip}
    WHERE id = ${adminId}
  `;
}

export async function adminExistsByEmail(email: string): Promise<boolean> {
  const row = await adminFindByEmail(email);
  return !!row;
}

// ══════════════════════════════════════════════════════════
// SHIPPING / COUPONS / SCRAPE / ANALYTICS / NOTIFICATIONS
// ══════════════════════════════════════════════════════════

export async function adminGetShippingRates() {
  const sql = getSql();
  return await sql`SELECT * FROM shipping_rates ORDER BY zone, rate`;
}

export async function adminUpdateShippingRate(
  rateId: string,
  updates: Partial<{
    label: string;
    rate: number;
    free_threshold: number | null;
    est_days_min: number;
    est_days_max: number;
    active: boolean;
  }>
) {
  const sql = getSql();
  const current = (await sql`SELECT * FROM shipping_rates WHERE id = ${rateId} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  if (!current[0]) throw new Error('Rate not found');
  const c = current[0];
  await sql`
    UPDATE shipping_rates SET
      label = ${updates.label ?? (c.label as string)},
      rate = ${updates.rate ?? Number(c.rate)},
      free_threshold = ${
        updates.free_threshold !== undefined ? updates.free_threshold : (c.free_threshold as number | null)
      },
      est_days_min = ${updates.est_days_min ?? (c.est_days_min as number | null)},
      est_days_max = ${updates.est_days_max ?? (c.est_days_max as number | null)},
      active = ${updates.active ?? Boolean(c.active)}
    WHERE id = ${rateId}
  `;
}

export async function adminGetCoupons() {
  const sql = getSql();
  return await sql`SELECT * FROM coupons ORDER BY created_at DESC`;
}

export async function adminCreateCoupon(coupon: {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  min_order?: number;
  max_uses?: number;
  expires_at?: string;
}) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at, applicable_to, active)
    VALUES (
      ${coupon.code.toUpperCase()},
      ${coupon.type},
      ${coupon.value},
      ${coupon.min_order ?? 0},
      ${coupon.max_uses ?? null},
      ${coupon.expires_at ?? null},
      'all',
      true
    )
    RETURNING *
  `;
  return rows[0];
}

export async function adminToggleCoupon(couponId: string, active: boolean) {
  const sql = getSql();
  await sql`UPDATE coupons SET active = ${active} WHERE id = ${couponId}`;
}

export async function adminDeleteCoupon(couponId: string) {
  const sql = getSql();
  await sql`DELETE FROM coupons WHERE id = ${couponId}`;
}

export async function adminGetScrapeLogs(limit = 20) {
  const sql = getSql();
  const staleBefore = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  await sql`
    UPDATE scrape_logs SET
      status = 'failed',
      completed_at = NOW(),
      errors = ${JSON.stringify([{ url: '', message: 'Timed out (stale running job)', stage: 'system' }])}::jsonb
    WHERE status = 'running' AND started_at < ${staleBefore}::timestamptz
  `;
  return await sql`
    SELECT * FROM scrape_logs ORDER BY started_at DESC LIMIT ${limit}
  `;
}

export async function adminGetAnalytics(days = 30) {
  const sql = getSql();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400_000).toISOString();

  const currentOrders = (await sql`
    SELECT total, created_at, status FROM orders
    WHERE created_at >= ${since}::timestamptz
      AND status NOT IN ('cancelled', 'refunded')
  `) as { total: number; created_at: string; status: string }[];

  const prevOrders = (await sql`
    SELECT total FROM orders
    WHERE created_at >= ${prevSince}::timestamptz AND created_at < ${since}::timestamptz
      AND status NOT IN ('cancelled', 'refunded')
  `) as { total: number }[];

  const customerCountRows = (await sql`SELECT COUNT(*)::int AS c FROM customers`) as { c: number }[];
  const pendingProducts = (await sql`
    SELECT COUNT(*)::int AS c FROM products WHERE status = 'pending'
  `) as { c: number }[];
  const pendingPayments = (await sql`
    SELECT COUNT(*)::int AS c FROM payments WHERE status = 'uploaded'
  `) as { c: number }[];

  const currentRevenue = currentOrders.reduce((s, o) => s + Number(o.total), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);
  const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const currentCount = currentOrders.length;
  const prevCount = prevOrders.length;
  const orderChange = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

  const revenueByDay = new Map<string, number>();
  currentOrders.forEach((o) => {
    const day = o.created_at.split('T')[0];
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + Number(o.total));
  });

  const revenueChart = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = d.toISOString().split('T')[0];
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: revenueByDay.get(key) ?? 0,
    };
  });

  const topItemRows = (await sql`
    SELECT product_name, quantity, subtotal FROM order_items
    WHERE created_at >= ${since}::timestamptz
    ORDER BY subtotal DESC LIMIT 50
  `) as { product_name: string; quantity: number; subtotal: number }[];

  const productRevMap = new Map<string, { sales: number; revenue: number }>();
  topItemRows.forEach((item) => {
    const existing = productRevMap.get(item.product_name) ?? { sales: 0, revenue: 0 };
    productRevMap.set(item.product_name, {
      sales: existing.sales + Number(item.quantity),
      revenue: existing.revenue + Number(item.subtotal),
    });
  });

  const topProducts = Array.from(productRevMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const statusMap = new Map<string, number>();
  currentOrders.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1));
  const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  return {
    revenue: { total: currentRevenue, change: Math.round(revenueChange * 10) / 10 },
    orders: { total: currentCount, change: Math.round(orderChange * 10) / 10 },
    customers: { total: customerCountRows[0]?.c ?? 0, change: 0 },
    pendingProducts: { total: pendingProducts[0]?.c ?? 0 },
    pendingPayments: { total: pendingPayments[0]?.c ?? 0 },
    revenueChart,
    topProducts,
    ordersByStatus,
  };
}

export async function adminGetNotificationConfig() {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM notifications ORDER BY created_at ASC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function adminUpdateNotificationConfig(
  id: string,
  updates: {
    text_template?: string;
    active?: boolean;
    interval_min_sec?: number;
    interval_max_sec?: number;
  }
) {
  const sql = getSql();
  const current = (await sql`SELECT * FROM notifications WHERE id = ${id} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  if (!current[0]) throw new Error('Notification not found');
  const c = current[0];
  await sql`
    UPDATE notifications SET
      text_template = ${updates.text_template ?? (c.text_template as string)},
      active = ${updates.active ?? Boolean(c.active)},
      interval_min_sec = ${updates.interval_min_sec ?? Number(c.interval_min_sec)},
      interval_max_sec = ${updates.interval_max_sec ?? Number(c.interval_max_sec)}
    WHERE id = ${id}
  `;
}
