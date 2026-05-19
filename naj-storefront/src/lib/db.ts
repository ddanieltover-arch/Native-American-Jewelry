// ═══════════════════════════════════════════════════════════
// Storefront data layer — replaces mock-data.ts
// Drop these into naj-storefront/src/lib/db.ts
// ═══════════════════════════════════════════════════════════
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Untyped client — Database generic requires generated Relationships; use explicit casts at call sites
function getClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ══════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════

export interface ProductFilters {
  category?: string;       // category slug
  search?:   string;
  minPrice?: number;
  maxPrice?: number;
  inStock?:  boolean;
  sortBy?:   'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  tags?:     string[];
  page?:     number;
  perPage?:  number;
}

export async function getProducts(filters: ProductFilters = {}) {
  const supabase = getClient();
  const { page = 1, perPage = 24 } = filters;

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, url, alt, is_primary, position),
      variants:product_variants(id, name, value, price_modifier, stock_quantity)
    `, { count: 'exact' })
    .eq('status', 'active');

  // Category filter (join via category slug)
  if (filters.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.category)
      .single();
    if (cat) query = query.eq('category_id', (cat as { id: string }).id);
  }

  // Full-text search
  if (filters.search) {
    query = query.textSearch('name', filters.search, { type: 'websearch' });
  }

  // Price range
  if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);

  // Stock
  if (filters.inStock) query = query.eq('in_stock', true);

  // Tags filter (any match)
  if (filters.tags?.length) query = query.overlaps('tags', filters.tags);

  // Sorting
  switch (filters.sortBy) {
    case 'newest':     query = query.order('created_at', { ascending: false }); break;
    case 'price_asc':  query = query.order('price',      { ascending: true  }); break;
    case 'price_desc': query = query.order('price',      { ascending: false }); break;
    default:           query = query.order('created_at', { ascending: false }); break;
  }

  // Pagination
  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`getProducts: ${error.message}`);

  return {
    products:    data ?? [],
    total:       count ?? 0,
    page,
    perPage,
    totalPages:  Math.ceil((count ?? 0) / perPage),
  };
}

export async function getProductBySlug(slug: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, url, alt, is_primary, position),
      variants:product_variants(id, name, value, price_modifier, stock_quantity, sku)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error) return null;
  return data;
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  const supabase = getClient();
  const { data } = await supabase
    .from('products')
    .select('*, images:product_images(url, is_primary), category:categories(name, slug)')
    .eq('status', 'active')
    .eq('category_id', categoryId)
    .neq('id', productId)
    .limit(limit);
  return data ?? [];
}

export async function getFeaturedProducts(limit = 4) {
  const supabase = getClient();
  const { data } = await supabase
    .from('products')
    .select('*, images:product_images(url, is_primary, position), category:categories(name, slug)')
    .eq('status', 'active')
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getNewArrivals(limit = 4) {
  return getFeaturedProducts(limit);
}

export async function searchProducts(query: string, limit = 8) {
  const supabase = getClient();
  const { data } = await supabase
    .from('products')
    .select('id, name, slug, price, images:product_images(url, is_primary), category:categories(name, slug)')
    .eq('status', 'active')
    .textSearch('name', query, { type: 'websearch' })
    .limit(limit);
  return data ?? [];
}

// ══════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════

export async function getCategories() {
  const supabase = getClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getFeaturedCategories() {
  const supabase = getClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('featured', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

// ══════════════════════════════════════════════════════════
// SHIPPING
// ══════════════════════════════════════════════════════════

export async function getShippingRates(zone?: 'usa' | 'international') {
  const supabase = getClient();
  let query = supabase
    .from('shipping_rates')
    .select('*')
    .eq('active', true)
    .order('rate', { ascending: true });

  if (zone) query = query.eq('zone', zone);

  const { data } = await query;
  return data ?? [];
}

export async function getShippingRateById(id: string) {
  const supabase = getClient();
  const { data } = await supabase
    .from('shipping_rates')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

// ══════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════

export async function validateCoupon(code: string, subtotal: number) {
  const supabase = getAdminClient();
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .single();

  if (!coupon) return { valid: false, error: 'Coupon not found' };

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'Coupon has expired' };
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }

  if (subtotal < coupon.min_order) {
    return { valid: false, error: `Minimum order of $${coupon.min_order} required` };
  }

  const discount = coupon.type === 'percent'
    ? (subtotal * coupon.value) / 100
    : Math.min(coupon.value, subtotal);

  return { valid: true, coupon, discount };
}

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════

export interface CreateOrderPayload {
  email:         string;
  firstName:     string;
  lastName:      string;
  phone?:        string;
  address: {
    line1:   string;
    line2?:  string;
    city:    string;
    state?:  string;
    country: string;
    zip?:    string;
  };
  shippingRateId: string;
  paymentMethod:  'chime' | 'cashapp' | 'apple_cash' | 'zelle' | 'bank_transfer';
  items: Array<{
    productId:   string;
    productName: string;
    variantId?:  string;
    quantity:    number;
    unitPrice:   number;
  }>;
  couponCode?:   string;
  notes?:        string;
  customerId?:   string;
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NAJ-${year}-${rand}`;
}

export async function createOrder(payload: CreateOrderPayload) {
  const supabase = getAdminClient();

  // Validate shipping rate
  const shippingRate = await getShippingRateById(payload.shippingRateId);
  if (!shippingRate) throw new Error('Invalid shipping rate');

  // Calculate totals
  const subtotal = payload.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const freeShipping = shippingRate.free_threshold && subtotal >= shippingRate.free_threshold;
  const shippingCost = freeShipping ? 0 : shippingRate.rate;

  // Apply coupon
  let discountAmount = 0;
  if (payload.couponCode) {
    const couponResult = await validateCoupon(payload.couponCode, subtotal);
    if (couponResult.valid) {
      discountAmount = couponResult.discount ?? 0;
      // Increment used_count
      await supabase
        .from('coupons')
        .update({ used_count: (couponResult.coupon!.used_count + 1) })
        .eq('id', couponResult.coupon!.id);
    }
  }

  const total = subtotal + shippingCost - discountAmount;

  let customerId: string | null = payload.customerId ?? null;
  if (!customerId) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', payload.email)
      .maybeSingle();
    if (existingCustomer) customerId = existingCustomer.id;
  }

  if (customerId) {
    await supabase
      .from('customers')
      .update({
        first_name: payload.firstName,
        last_name:  payload.lastName,
        phone:      payload.phone ?? null,
      })
      .eq('id', customerId);
  }

  // Create order
  const orderNumber = generateOrderNumber();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number:     orderNumber,
      customer_id:      customerId,
      status:           'awaiting_payment',
      subtotal,
      shipping_cost:    shippingCost,
      discount_amount:  discountAmount,
      total,
      shipping_method:  shippingRate.label,
      shipping_address: {
        email:      payload.email,
        first_name: payload.firstName,
        last_name:  payload.lastName,
        phone:      payload.phone ?? null,
        line1:      payload.address.line1,
        line2:      payload.address.line2 ?? null,
        city:       payload.address.city,
        state:      payload.address.state ?? null,
        country:    payload.address.country,
        zip:        payload.address.zip ?? null,
      },
      coupon_code: payload.couponCode ?? null,
      notes:       payload.notes ?? null,
    })
    .select('id')
    .single();

  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

  // Insert order items
  await supabase.from('order_items').insert(
    payload.items.map((item) => ({
      order_id:     order.id,
      product_id:   item.productId,
      product_name: item.productName,
      variant_id:   item.variantId ?? null,
      quantity:     item.quantity,
      unit_price:   item.unitPrice,
      subtotal:     item.unitPrice * item.quantity,
    }))
  );

  // Create payment record
  await supabase.from('payments').insert({
    order_id: order.id,
    method:   payload.paymentMethod,
    status:   'pending',
    amount:   total,
  });

  // Decrement stock for each item
  for (const item of payload.items) {
    try {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
      });
    } catch {
      // non-fatal if RPC not yet created
    }
  }

  return {
    orderNumber,
    orderId: order.id,
    total,
    subtotal,
    shippingCost,
    discountAmount,
    shippingMethod: shippingRate.label,
  };
}

export async function getCustomerOrders(customerId: string) {
  const supabase = getClient();
  const { data } = await supabase
    .from('orders')
    .select(`*, items:order_items(*), payment:payments(*)`)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function uploadPaymentProof(
  orderId:  string,
  file:     File,
  authToken:string
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  );

  const filePath = `${orderId}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(filePath);

  // Update payment record
  await supabase
    .from('payments')
    .update({ status: 'uploaded', proof_url: publicUrl })
    .eq('order_id', orderId);

  // Update order status
  await supabase
    .from('orders')
    .update({ status: 'payment_uploaded' })
    .eq('id', orderId);

  return publicUrl;
}

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════

export async function getNotificationConfig() {
  const supabase = getClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('active', true)
    .single();
  return data;
}

// ══════════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════════

export async function getApprovedTestimonials(limit = 6) {
  const supabase = getClient();
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ══════════════════════════════════════════════════════════
// WISHLIST  (customer-side, no auth required to read)
// ══════════════════════════════════════════════════════════

export async function syncWishlist(customerId: string, productIds: string[]) {
  const supabase = getClient();
  await supabase
    .from('customers')
    .update({ wishlist: productIds })
    .eq('id', customerId);
}

export async function getWishlistProducts(productIds: string[]) {
  if (!productIds.length) return [];
  const supabase = getClient();
  const { data } = await supabase
    .from('products')
    .select('*, images:product_images(url, is_primary), category:categories(name, slug)')
    .in('id', productIds)
    .eq('status', 'active');
  return data ?? [];
}
