// ─── Admin user / auth ───────────────────────────────────
export type AdminRole = 'super_admin' | 'admin' | 'editor' | 'support' | 'analyst';

export interface AdminUser {
  id:            string;
  email:         string;
  role:          AdminRole;
  totp_enabled:  boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at:    string;
}

export interface AdminSession {
  admin:     AdminUser;
  token:     string;
  expiresAt: string;
}

// ─── Product ─────────────────────────────────────────────
export type ProductStatus = 'pending' | 'active' | 'archived';

export interface AdminProduct {
  id:           string;
  name:         string;
  slug:         string;
  description:  string | null;
  category_id:  string | null;
  source_price: number;
  price:        number;
  sku:          string | null;
  tags:         string[];
  in_stock:     boolean;
  stock_quantity: number;
  status:       ProductStatus;
  source_url:   string | null;
  approved_by:  string | null;
  approved_at:  string | null;
  created_at:   string;
  updated_at:   string;
  images:       ProductImage[];
  category:     { id: string; name: string } | null;
}

export interface ProductImage {
  id:         string;
  product_id: string;
  url:        string;
  alt:        string | null;
  is_primary: boolean;
  position:   number;
}

// ─── Order ───────────────────────────────────────────────
export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_uploaded'
  | 'payment_confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 'chime' | 'cashapp' | 'apple_cash' | 'zelle' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'uploaded' | 'confirmed' | 'failed' | 'refunded';

export interface AdminOrder {
  id:               string;
  order_number:     string;
  customer_id:      string | null;
  status:           OrderStatus;
  subtotal:         number;
  shipping_cost:    number;
  discount_amount:  number;
  total:            number;
  shipping_method:  string | null;
  shipping_address: ShippingAddress;
  coupon_code:      string | null;
  notes:            string | null;
  customer:         AdminCustomer | null;
  payment:          AdminPayment | null;
  items:            OrderItem[];
  created_at:       string;
  updated_at:       string;
}

export interface ShippingAddress {
  email?:      string;
  first_name?: string;
  last_name?:  string;
  phone?:      string | null;
  line1:       string;
  line2?:      string | null;
  city:        string;
  state?:      string | null;
  country:     string;
  zip?:        string | null;
}

export interface OrderItem {
  id:           string;
  product_id:   string;
  product_name: string;
  variant_id:   string | null;
  quantity:     number;
  unit_price:   number;
  subtotal:     number;
}

// ─── Payment ─────────────────────────────────────────────
export interface AdminPayment {
  id:               string;
  order_id:         string;
  method:           PaymentMethod;
  status:           PaymentStatus;
  amount:           number;
  proof_url:        string | null;
  transaction_note: string | null;
  transaction_ref:  string | null;
  verified_by:      string | null;
  verified_at:      string | null;
  created_at:       string;
  updated_at:       string;
}

// ─── Customer ────────────────────────────────────────────
export interface AdminCustomer {
  id:          string;
  email:       string;
  first_name:  string | null;
  last_name:   string | null;
  phone:       string | null;
  blacklisted: boolean;
  notes:       string | null;
  wishlist:    string[];
  created_at:  string;
  order_count?: number;
  total_spent?: number;
}

// ─── Scrape log ──────────────────────────────────────────
export interface ScrapeLog {
  id:                string;
  job_id:            string;
  target_url:        string;
  status:            'running' | 'completed' | 'failed' | 'partial';
  products_found:    number;
  products_filtered: number;
  products_imported: number;
  errors:            Array<{ url: string; message: string; stage: string }> | null;
  duration_ms:       number | null;
  started_at:        string;
  completed_at:      string | null;
}

// ─── Analytics ───────────────────────────────────────────
export interface AnalyticsOverview {
  revenue:         { total: number; change: number };
  orders:          { total: number; change: number };
  customers:       { total: number; change: number };
  pendingProducts: { total: number };
  pendingPayments: { total: number };
  revenueChart:    { date: string; revenue: number }[];
  topProducts:     { name: string; sales: number; revenue: number }[];
  ordersByStatus:  { status: OrderStatus; count: number }[];
}

// ─── Shipping rate ────────────────────────────────────────
export interface ShippingRate {
  id:            string;
  zone:          'usa' | 'international';
  method:        'standard' | 'express';
  label:         string;
  rate:          number;
  free_threshold: number | null;
  est_days_min:  number | null;
  est_days_max:  number | null;
  active:        boolean;
}

// ─── Coupon ──────────────────────────────────────────────
export interface Coupon {
  id:            string;
  code:          string;
  type:          'percent' | 'flat';
  value:         number;
  min_order:     number;
  max_uses:      number | null;
  used_count:    number;
  applicable_to: 'all' | 'category' | 'product';
  expires_at:    string | null;
  active:        boolean;
  created_at:    string;
}

// ─── Notification popup ──────────────────────────────────
export interface SalesNotificationConfig {
  id:               string;
  text_template:    string;
  active:           boolean;
  interval_min_sec: number;
  interval_max_sec: number;
}

// ─── Pagination ──────────────────────────────────────────
export interface PaginatedResponse<T> {
  data:        T[];
  total:       number;
  page:        number;
  per_page:    number;
  total_pages: number;
}

export interface TableFilters {
  search?:   string;
  status?:   string;
  page?:     number;
  per_page?: number;
  sort_by?:  string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}
