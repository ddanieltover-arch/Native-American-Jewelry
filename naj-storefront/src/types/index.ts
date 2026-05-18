// ─── Product ─────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description?: string;
  banner_url?: string;
  featured: boolean;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt?: string;
  is_primary: boolean;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;   // e.g. "Size"
  value: string;  // e.g. "Medium"
  price_modifier: number;
  stock_quantity: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  category?: Category;
  source_price: number;
  price: number;
  sku?: string;
  tags: string[];
  in_stock: boolean;
  stock_quantity: number;
  status: 'pending' | 'active' | 'archived';
  images: ProductImage[];
  variants: ProductVariant[];
  rating?: number;
  review_count?: number;
  badge?: 'Bestseller' | 'New' | 'Low Stock' | 'Sale';
  seo_title?: string;
  seo_description?: string;
  created_at: string;
}

// ─── Cart ────────────────────────────────────────────────
export interface CartItem {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
  variantLabel?: string;
  slug: string;
}

// ─── Customer ────────────────────────────────────────────
export interface Customer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  wishlist: string[];
  created_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  zip?: string;
  is_default: boolean;
}

// ─── Order ───────────────────────────────────────────────
export type PaymentMethod = 'chime' | 'cashapp' | 'apple_cash' | 'zelle' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'uploaded' | 'confirmed' | 'failed' | 'refunded';
export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_uploaded'
  | 'payment_confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  shipping_method?: string;
  shipping_address: Address;
  coupon_code?: string;
  notes?: string;
  payment?: Payment;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  proof_url?: string;
  transaction_note?: string;
  transaction_ref?: string;
  verified_at?: string;
}

// ─── Shipping ────────────────────────────────────────────
export interface ShippingRate {
  id: string;
  zone: 'usa' | 'international';
  method: 'standard' | 'express';
  label: string;
  rate: number;
  free_threshold?: number;
  est_days_min?: number;
  est_days_max?: number;
}

// ─── Checkout form ───────────────────────────────────────
export interface CheckoutFormData {
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
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
}

// ─── Filters ─────────────────────────────────────────────
export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  tags?: string[];
}

// ─── Notifications ───────────────────────────────────────
export interface SalesNotification {
  id: string;
  text_template: string;
  active: boolean;
  interval_min_sec: number;
  interval_max_sec: number;
}

// ─── Coupon ──────────────────────────────────────────────
export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  min_order: number;
  expires_at?: string;
}

// ─── API responses ───────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
