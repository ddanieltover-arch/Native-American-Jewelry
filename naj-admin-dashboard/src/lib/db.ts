// ═══════════════════════════════════════════════════════════
// Admin data layer — replaces mock-data in naj-admin
// Drop into naj-admin/src/lib/db.ts
// ═══════════════════════════════════════════════════════════
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function normalizeOrder<T extends { payment?: unknown; items?: unknown }>(order: T): T {
  const normalized = { ...order } as T & { payment?: unknown; items?: unknown };
  if (Array.isArray(normalized.payment)) {
    normalized.payment = normalized.payment[0] ?? null;
  }
  if (!Array.isArray(normalized.items)) {
    normalized.items = [];
  }
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

// ══════════════════════════════════════════════════════════
// PRODUCTS — APPROVAL QUEUE
// ══════════════════════════════════════════════════════════

export interface ProductListFilters {
  status?:  'pending' | 'active' | 'archived';
  search?:  string;
  category?:string;
  page?:    number;
  perPage?: number;
  sortBy?:  'created_at' | 'price' | 'name';
  sortDir?: 'asc' | 'desc';
}

export async function adminGetProducts(filters: ProductListFilters = {}) {
  const supabase = getAdminClient();
  const { page = 1, perPage = 20, sortBy = 'created_at', sortDir = 'desc' } = filters;

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, url, alt, is_primary, position)
    `, { count: 'exact' });

  if (filters.status) query = query.eq('status', filters.status);

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  query = query
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    products: (data ?? []).map((p) => normalizeProduct(p)),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function adminApproveProduct(productId: string, adminId: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('products')
    .update({
      status:      'active',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', productId);
  if (error) throw error;
}

export async function adminRejectProduct(productId: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('products')
    .update({ status: 'archived' })
    .eq('id', productId);
  if (error) throw error;
}

export async function adminBulkApproveProducts(productIds: string[], adminId: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('products')
    .update({
      status:      'active',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    })
    .in('id', productIds);
  if (error) throw error;
}

export async function adminGetProduct(productId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, url, alt, is_primary, position)
    `)
    .eq('id', productId)
    .single();
  if (error) throw error;
  return normalizeProduct(data);
}

export async function adminUpdateProduct(
  productId: string,
  updates: Partial<{
    name:            string;
    description:     string;
    price:           number;
    stock_quantity:  number;
    in_stock:        boolean;
    tags:            string[];
    seo_title:       string;
    seo_description: string;
    status:          'active' | 'archived' | 'pending';
  }>
) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════

export interface OrderListFilters {
  status?:  string;
  search?:  string;
  page?:    number;
  perPage?: number;
  sortBy?:  'created_at' | 'total' | 'order_number';
  sortDir?: 'asc' | 'desc';
}

export async function adminGetOrders(filters: OrderListFilters = {}) {
  const supabase = getAdminClient();
  const { page = 1, perPage = 20, sortBy = 'created_at', sortDir = 'desc' } = filters;

  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, email, first_name, last_name, phone),
      payment:payments(*),
      items:order_items(*)
    `, { count: 'exact' });

  if (filters.status) query = query.eq('status', filters.status);

  if (filters.search) {
    // Search by order number or customer email (requires separate query for email)
    query = query.ilike('order_number', `%${filters.search}%`);
  }

  query = query
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    orders: (data ?? []).map((o) => normalizeOrder(o)),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function adminGetOrder(orderId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, email, first_name, last_name, phone),
      payment:payments(*),
      items:order_items(*, product:products(name, slug))
    `)
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

export async function adminUpdateOrder(
  orderId: string,
  updates: Partial<{
    status:           string;
    notes:            string | null;
    shipping_method:  string | null;
  }>,
  adminId?: string
) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);
  if (error) throw error;

  if (updates.status && adminId) {
    try {
      await supabase.from('inventory_logs').insert({
        product_id: null,
        change:     0,
        reason:     `Order ${orderId} status → ${updates.status}`,
        admin_id:   adminId,
      });
    } catch {
      /* optional log table */
    }
  }
}

/** @deprecated use adminUpdateOrder */
export async function adminUpdateOrderStatus(
  orderId: string,
  status: string,
  adminId: string
) {
  return adminUpdateOrder(orderId, { status }, adminId);
}

// ══════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════

export async function adminGetPendingPayments() {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('payments')
    .select(`*, order:orders(*, customer:customers(email, first_name, last_name))`)
    .in('status', ['pending', 'uploaded'])
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function adminVerifyPayment(
  paymentId: string,
  status:    'confirmed' | 'failed' | 'refunded',
  adminId:   string
) {
  const supabase = getAdminClient();

  // Update payment
  const { data: payment, error } = await supabase
    .from('payments')
    .update({
      status,
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select('order_id')
    .single();

  if (error) throw error;

  // Update order status based on payment outcome
  const orderStatus =
    status === 'confirmed' ? 'processing' :
    status === 'failed'    ? 'cancelled'  : 'refunded';

  await supabase
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', payment.order_id);
}

// ══════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════

export interface CustomerListFilters {
  search?:      string;
  blacklisted?: boolean;
  page?:        number;
  perPage?:     number;
}

export async function adminGetCustomers(filters: CustomerListFilters = {}) {
  const supabase = getAdminClient();
  const { page = 1, perPage = 20 } = filters;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' });

  if (filters.search) {
    query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
  }

  if (filters.blacklisted !== undefined) {
    query = query.eq('blacklisted', filters.blacklisted);
  }

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Enrich with order stats
  const enriched = await Promise.all(
    (data ?? []).map(async (customer) => {
      const { data: orderStats } = await supabase
        .from('orders')
        .select('total')
        .eq('customer_id', customer.id)
        .not('status', 'in', '(cancelled,refunded)');

      return {
        ...customer,
        order_count:  orderStats?.length ?? 0,
        total_spent:  orderStats?.reduce((s, o) => s + o.total, 0) ?? 0,
      };
    })
  );

  return { customers: enriched, total: count ?? 0, page, perPage };
}

export async function adminUpdateCustomer(
  customerId: string,
  updates: { notes?: string; blacklisted?: boolean }
) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════
// SHIPPING RATES
// ══════════════════════════════════════════════════════════

export async function adminGetShippingRates() {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('shipping_rates')
    .select('*')
    .order('zone')
    .order('rate');
  return data ?? [];
}

export async function adminUpdateShippingRate(
  rateId:  string,
  updates: Partial<{
    label:          string;
    rate:           number;
    free_threshold: number | null;
    est_days_min:   number;
    est_days_max:   number;
    active:         boolean;
  }>
) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('shipping_rates')
    .update(updates)
    .eq('id', rateId);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════

export async function adminGetCoupons() {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function adminCreateCoupon(coupon: {
  code:       string;
  type:       'percent' | 'flat';
  value:      number;
  min_order?: number;
  max_uses?:  number;
  expires_at?:string;
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code:          coupon.code.toUpperCase(),
      type:          coupon.type,
      value:         coupon.value,
      min_order:     coupon.min_order ?? 0,
      max_uses:      coupon.max_uses ?? null,
      expires_at:    coupon.expires_at ?? null,
      applicable_to: 'all',
      active:        true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminToggleCoupon(couponId: string, active: boolean) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('coupons')
    .update({ active })
    .eq('id', couponId);
  if (error) throw error;
}

export async function adminDeleteCoupon(couponId: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.from('coupons').delete().eq('id', couponId);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════
// SCRAPE LOGS
// ══════════════════════════════════════════════════════════

export async function adminGetScrapeLogs(limit = 20) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('scrape_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ══════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════

export async function adminGetAnalytics(days = 30) {
  const supabase   = getAdminClient();
  const since      = new Date(Date.now() - days * 86400_000).toISOString();
  const prevSince  = new Date(Date.now() - days * 2 * 86400_000).toISOString();

  // Current period
  const { data: currentOrders } = await supabase
    .from('orders')
    .select('total, created_at, status')
    .gte('created_at', since)
    .not('status', 'in', '(cancelled,refunded)');

  // Previous period (for % change)
  const { data: prevOrders } = await supabase
    .from('orders')
    .select('total')
    .gte('created_at', prevSince)
    .lt('created_at', since)
    .not('status', 'in', '(cancelled,refunded)');

  const { count: customerCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true });

  const { count: prevCustomerCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', since);

  const { count: pendingProducts } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: pendingPayments } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'uploaded');

  const currentRevenue = currentOrders?.reduce((s, o) => s + o.total, 0) ?? 0;
  const prevRevenue    = prevOrders?.reduce((s, o) => s + o.total, 0) ?? 0;
  const revenueChange  = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const currentCount   = currentOrders?.length ?? 0;
  const prevCount      = prevOrders?.length ?? 0;
  const orderChange    = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

  // Revenue by day
  const revenueByDay = new Map<string, number>();
  currentOrders?.forEach((o) => {
    const day = o.created_at.split('T')[0];
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + o.total);
  });

  const revenueChart = Array.from({ length: days }, (_, i) => {
    const d   = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = d.toISOString().split('T')[0];
    return {
      date:    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: revenueByDay.get(key) ?? 0,
    };
  });

  // Top products by revenue
  const { data: topItemRows } = await supabase
    .from('order_items')
    .select('product_name, quantity, subtotal')
    .gte('created_at', since)
    .order('subtotal', { ascending: false })
    .limit(50);

  const productRevMap = new Map<string, { sales: number; revenue: number }>();
  topItemRows?.forEach((item) => {
    const existing = productRevMap.get(item.product_name) ?? { sales: 0, revenue: 0 };
    productRevMap.set(item.product_name, {
      sales:   existing.sales + item.quantity,
      revenue: existing.revenue + item.subtotal,
    });
  });

  const topProducts = Array.from(productRevMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Order status breakdown
  const statusMap = new Map<string, number>();
  currentOrders?.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1));
  const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  return {
    revenue:         { total: currentRevenue,   change: Math.round(revenueChange * 10) / 10 },
    orders:          { total: currentCount,      change: Math.round(orderChange * 10) / 10   },
    customers:       { total: customerCount ?? 0, change: 0 },
    pendingProducts: { total: pendingProducts ?? 0 },
    pendingPayments: { total: pendingPayments ?? 0 },
    revenueChart,
    topProducts,
    ordersByStatus,
  };
}

// ══════════════════════════════════════════════════════════
// NOTIFICATION CONFIG
// ══════════════════════════════════════════════════════════

export async function adminGetNotificationConfig() {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function adminUpdateNotificationConfig(
  id:      string,
  updates: { text_template?: string; active?: boolean; interval_min_sec?: number; interval_max_sec?: number }
) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('notifications')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}
