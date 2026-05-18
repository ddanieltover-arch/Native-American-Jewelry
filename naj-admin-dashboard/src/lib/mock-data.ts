import type {
  AdminProduct, AdminOrder, AdminCustomer, AdminPayment,
  ScrapeLog, AnalyticsOverview, ShippingRate, Coupon, SalesNotificationConfig,
} from '@/types';

// ─── Products ─────────────────────────────────────────────
export const MOCK_PRODUCTS: AdminProduct[] = [
  {
    id: 'prod-001', name: 'Turquoise & Sterling Silver Squash Blossom Necklace',
    slug: 'turquoise-sterling-silver-squash-blossom-necklace',
    description: 'A museum-quality squash blossom necklace handcrafted by Navajo artisans.',
    category_id: 'cat-1', source_price: 895, price: 850.25,
    sku: 'NAJ-NK-001', tags: ['turquoise', 'navajo', 'squash blossom'], in_stock: true,
    stock_quantity: 3, status: 'active', source_url: 'https://hippiecowgirlcouture.com/products/squash-blossom',
    approved_by: 'admin-1', approved_at: '2024-03-01T10:00:00Z',
    created_at: '2024-03-01T09:00:00Z', updated_at: '2024-03-01T10:00:00Z',
    images: [{ id: 'img-001', product_id: 'prod-001', url: '', alt: 'Squash blossom', is_primary: true, position: 0 }],
    category: { id: 'cat-1', name: 'Necklaces' },
  },
  {
    id: 'prod-002', name: 'Zuni Inlay Thunderbird Ring', slug: 'zuni-inlay-thunderbird-ring',
    description: 'Exquisite channel inlay work by Zuni master jewelers.',
    category_id: 'cat-2', source_price: 425, price: 403.75,
    sku: 'NAJ-RG-002', tags: ['zuni', 'inlay', 'ring'], in_stock: true,
    stock_quantity: 6, status: 'pending', source_url: 'https://hippiecowgirlcouture.com/products/thunderbird-ring',
    approved_by: null, approved_at: null,
    created_at: '2024-04-10T09:00:00Z', updated_at: '2024-04-10T09:00:00Z',
    images: [{ id: 'img-002', product_id: 'prod-002', url: '', alt: 'Thunderbird ring', is_primary: true, position: 0 }],
    category: { id: 'cat-2', name: 'Rings' },
  },
  {
    id: 'prod-003', name: 'Navajo Wide Silver Cuff', slug: 'navajo-wide-silver-cuff',
    description: 'Heavy gauge sterling silver cuff hand-stamped.',
    category_id: 'cat-6', source_price: 310, price: 294.50,
    sku: 'NAJ-CF-003', tags: ['navajo', 'cuff', 'silver'], in_stock: true,
    stock_quantity: 8, status: 'pending', source_url: 'https://hippiecowgirlcouture.com/products/navajo-cuff',
    approved_by: null, approved_at: null,
    created_at: '2024-04-11T09:00:00Z', updated_at: '2024-04-11T09:00:00Z',
    images: [{ id: 'img-003', product_id: 'prod-003', url: '', alt: 'Navajo cuff', is_primary: true, position: 0 }],
    category: { id: 'cat-6', name: 'Cuffs' },
  },
  {
    id: 'prod-004', name: 'Royston Turquoise Drop Earrings', slug: 'royston-turquoise-drop-earrings',
    description: 'Rare Royston turquoise set in sterling silver.',
    category_id: 'cat-4', source_price: 285, price: 270.75,
    sku: 'NAJ-ER-004', tags: ['royston', 'earrings'], in_stock: true,
    stock_quantity: 5, status: 'active', source_url: null,
    approved_by: 'admin-1', approved_at: '2024-02-15T10:00:00Z',
    created_at: '2024-02-15T09:00:00Z', updated_at: '2024-02-15T10:00:00Z',
    images: [{ id: 'img-004', product_id: 'prod-004', url: '', alt: 'Royston earrings', is_primary: true, position: 0 }],
    category: { id: 'cat-4', name: 'Earrings' },
  },
  {
    id: 'prod-005', name: 'Bisbee Turquoise Cluster Ring', slug: 'bisbee-turquoise-cluster-ring',
    description: 'Bisbee turquoise in a stunning cluster setting.',
    category_id: 'cat-2', source_price: 725, price: 688.75,
    sku: 'NAJ-RG-007', tags: ['bisbee', 'turquoise', 'ring'], in_stock: true,
    stock_quantity: 1, status: 'pending', source_url: 'https://hippiecowgirlcouture.com/products/bisbee-ring',
    approved_by: null, approved_at: null,
    created_at: '2024-04-12T09:00:00Z', updated_at: '2024-04-12T09:00:00Z',
    images: [{ id: 'img-005', product_id: 'prod-005', url: '', alt: 'Bisbee ring', is_primary: true, position: 0 }],
    category: { id: 'cat-2', name: 'Rings' },
  },
];

// ─── Customers ────────────────────────────────────────────
export const MOCK_CUSTOMERS: AdminCustomer[] = [
  { id: 'cust-1', email: 'margaret.t@example.com', first_name: 'Margaret', last_name: 'Thompson', phone: '+1 505-555-0101', blacklisted: false, notes: 'Repeat collector, prefers turquoise', wishlist: [], created_at: '2024-01-15T10:00:00Z', order_count: 4, total_spent: 2340.50 },
  { id: 'cust-2', email: 'james.r@example.com',    first_name: 'James',    last_name: 'Rivera',   phone: '+1 602-555-0142', blacklisted: false, notes: null, wishlist: [], created_at: '2024-02-20T10:00:00Z', order_count: 2, total_spent: 1103.00 },
  { id: 'cust-3', email: 'linda.k@example.com',    first_name: 'Linda',    last_name: 'Kowalski', phone: null, blacklisted: false, notes: 'VIP — gift wrapping requested', wishlist: [], created_at: '2024-03-05T10:00:00Z', order_count: 3, total_spent: 1850.25 },
  { id: 'cust-4', email: 'david.m@example.com',    first_name: 'David',    last_name: 'Miller',   phone: '+1 303-555-0189', blacklisted: false, notes: null, wishlist: [], created_at: '2024-04-01T10:00:00Z', order_count: 1, total_spent: 403.75 },
];

// ─── Payments ─────────────────────────────────────────────
export const MOCK_PAYMENTS: AdminPayment[] = [
  { id: 'pay-1', order_id: 'ord-1', method: 'cashapp', status: 'uploaded', amount: 850.25, proof_url: 'https://placeholder.com/proof1.jpg', transaction_note: 'Sent $850.25 to $NAJewelry', transaction_ref: 'CA-20240401-001', verified_by: null, verified_at: null, created_at: '2024-04-01T11:00:00Z', updated_at: '2024-04-01T14:00:00Z' },
  { id: 'pay-2', order_id: 'ord-2', method: 'zelle',   status: 'confirmed', amount: 1103.00, proof_url: 'https://placeholder.com/proof2.jpg', transaction_note: null, transaction_ref: 'ZL-2024-8842', verified_by: 'admin-1', verified_at: '2024-03-16T09:00:00Z', created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-16T09:00:00Z' },
  { id: 'pay-3', order_id: 'ord-3', method: 'chime',   status: 'pending',  amount: 403.75, proof_url: null, transaction_note: null, transaction_ref: null, verified_by: null, verified_at: null, created_at: '2024-04-12T09:00:00Z', updated_at: '2024-04-12T09:00:00Z' },
  { id: 'pay-4', order_id: 'ord-4', method: 'bank_transfer', status: 'confirmed', amount: 1850.25, proof_url: 'https://placeholder.com/proof4.jpg', transaction_note: 'Wire reference: WIRE-20240310', transaction_ref: 'WIRE-20240310', verified_by: 'admin-1', verified_at: '2024-03-12T10:00:00Z', created_at: '2024-03-10T14:00:00Z', updated_at: '2024-03-12T10:00:00Z' },
];

// ─── Orders ───────────────────────────────────────────────
export const MOCK_ORDERS: AdminOrder[] = [
  {
    id: 'ord-1', order_number: 'NAJ-2024-0051', customer_id: 'cust-1', status: 'payment_uploaded',
    subtotal: 850.25, shipping_cost: 0, discount_amount: 0, total: 850.25,
    shipping_method: 'Standard Shipping (USA)',
    shipping_address: { line1: '123 Canyon Rd', city: 'Santa Fe', state: 'NM', country: 'US', zip: '87501' },
    coupon_code: null, notes: 'Please gift wrap',
    customer: MOCK_CUSTOMERS[0], payment: MOCK_PAYMENTS[0],
    items: [{ id: 'item-1', product_id: 'prod-001', product_name: 'Turquoise Squash Blossom Necklace', variant_id: null, quantity: 1, unit_price: 850.25, subtotal: 850.25 }],
    created_at: '2024-04-01T10:00:00Z', updated_at: '2024-04-01T14:00:00Z',
  },
  {
    id: 'ord-2', order_number: 'NAJ-2024-0042', customer_id: 'cust-2', status: 'shipped',
    subtotal: 1103.00, shipping_cost: 19.99, discount_amount: 0, total: 1122.99,
    shipping_method: 'Express Shipping (USA)',
    shipping_address: { line1: '456 Desert View Dr', city: 'Scottsdale', state: 'AZ', country: 'US', zip: '85251' },
    coupon_code: null, notes: null,
    customer: MOCK_CUSTOMERS[1], payment: MOCK_PAYMENTS[1],
    items: [
      { id: 'item-2', product_id: 'prod-001', product_name: 'Squash Blossom Necklace', variant_id: null, quantity: 1, unit_price: 850.25, subtotal: 850.25 },
      { id: 'item-3', product_id: 'prod-002', product_name: 'Zuni Thunderbird Ring', variant_id: null, quantity: 1, unit_price: 252.75, subtotal: 252.75 },
    ],
    created_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-17T14:00:00Z',
  },
  {
    id: 'ord-3', order_number: 'NAJ-2024-0058', customer_id: 'cust-4', status: 'awaiting_payment',
    subtotal: 403.75, shipping_cost: 9.99, discount_amount: 0, total: 413.74,
    shipping_method: 'Standard Shipping (USA)',
    shipping_address: { line1: '789 Mile High Ave', city: 'Denver', state: 'CO', country: 'US', zip: '80202' },
    coupon_code: null, notes: null,
    customer: MOCK_CUSTOMERS[3], payment: MOCK_PAYMENTS[2],
    items: [{ id: 'item-4', product_id: 'prod-002', product_name: 'Zuni Inlay Ring', variant_id: null, quantity: 1, unit_price: 403.75, subtotal: 403.75 }],
    created_at: '2024-04-12T09:00:00Z', updated_at: '2024-04-12T09:00:00Z',
  },
  {
    id: 'ord-4', order_number: 'NAJ-2024-0033', customer_id: 'cust-3', status: 'delivered',
    subtotal: 1850.25, shipping_cost: 0, discount_amount: 185.00, total: 1665.25,
    shipping_method: 'Express Shipping (USA)',
    shipping_address: { line1: '321 Rocky Mountain Blvd', city: 'Denver', state: 'CO', country: 'US', zip: '80203' },
    coupon_code: 'WELCOME10', notes: 'Gift for anniversary',
    customer: MOCK_CUSTOMERS[2], payment: MOCK_PAYMENTS[3],
    items: [{ id: 'item-5', product_id: 'prod-001', product_name: 'Navajo Concho Belt', variant_id: null, quantity: 1, unit_price: 1850.25, subtotal: 1850.25 }],
    created_at: '2024-03-10T14:00:00Z', updated_at: '2024-03-18T10:00:00Z',
  },
];

// ─── Scrape logs ──────────────────────────────────────────
export const MOCK_SCRAPE_LOGS: ScrapeLog[] = [
  { id: 'log-1', job_id: 'scrape-m9x2q-a1b2', target_url: 'https://hippiecowgirlcouture.com', status: 'completed', products_found: 47, products_filtered: 12, products_imported: 35, errors: null, duration_ms: 184200, started_at: '2024-04-12T03:00:00Z', completed_at: '2024-04-12T03:03:04Z' },
  { id: 'log-2', job_id: 'scrape-m8x1q-b3c4', target_url: 'https://hippiecowgirlcouture.com', status: 'partial',   products_found: 51, products_filtered: 14, products_imported: 33, errors: [{ url: 'https://hippiecowgirlcouture.com/products/xyz', message: 'Navigation timeout', stage: 'crawl' }], duration_ms: 210500, started_at: '2024-04-11T03:00:00Z', completed_at: '2024-04-11T03:03:30Z' },
  { id: 'log-3', job_id: 'scrape-m7x0q-c5d6', target_url: 'https://hippiecowgirlcouture.com', status: 'completed', products_found: 44, products_filtered: 9,  products_imported: 35, errors: null, duration_ms: 176800, started_at: '2024-04-10T03:00:00Z', completed_at: '2024-04-10T03:02:56Z' },
  { id: 'log-4', job_id: 'scrape-m6x9q-d7e8', target_url: 'https://hippiecowgirlcouture.com', status: 'failed',    products_found: 0,  products_filtered: 0,  products_imported: 0,  errors: [{ url: 'https://hippiecowgirlcouture.com', message: 'Connection refused', stage: 'crawl' }], duration_ms: 30100,  started_at: '2024-04-09T03:00:00Z', completed_at: '2024-04-09T03:00:30Z' },
];

// ─── Analytics ────────────────────────────────────────────
export const MOCK_ANALYTICS: AnalyticsOverview = {
  revenue:         { total: 24680.50, change: 18.4 },
  orders:          { total: 38,       change: 12.1 },
  customers:       { total: 124,      change: 8.7  },
  pendingProducts: { total: 3 },
  pendingPayments: { total: 2 },
  revenueChart: [
    { date: 'Mar 18', revenue: 650  }, { date: 'Mar 19', revenue: 920  },
    { date: 'Mar 20', revenue: 480  }, { date: 'Mar 21', revenue: 1240 },
    { date: 'Mar 22', revenue: 880  }, { date: 'Mar 23', revenue: 320  },
    { date: 'Mar 24', revenue: 1100 }, { date: 'Mar 25', revenue: 750  },
    { date: 'Mar 26', revenue: 1380 }, { date: 'Mar 27', revenue: 960  },
    { date: 'Mar 28', revenue: 420  }, { date: 'Mar 29', revenue: 1650 },
    { date: 'Mar 30', revenue: 890  }, { date: 'Mar 31', revenue: 1120 },
    { date: 'Apr 1',  revenue: 2100 }, { date: 'Apr 2',  revenue: 780  },
    { date: 'Apr 3',  revenue: 1430 }, { date: 'Apr 4',  revenue: 640  },
    { date: 'Apr 5',  revenue: 1870 }, { date: 'Apr 6',  revenue: 950  },
    { date: 'Apr 7',  revenue: 1200 }, { date: 'Apr 8',  revenue: 730  },
    { date: 'Apr 9',  revenue: 0    }, { date: 'Apr 10', revenue: 1540 },
    { date: 'Apr 11', revenue: 860  }, { date: 'Apr 12', revenue: 1790 },
  ],
  topProducts: [
    { name: 'Squash Blossom Necklace', sales: 8,  revenue: 6802 },
    { name: 'Concho Belt',             sales: 4,  revenue: 4750 },
    { name: 'Bisbee Cluster Ring',     sales: 6,  revenue: 4133 },
    { name: 'Navajo Pearl Necklace',   sales: 7,  revenue: 3458 },
    { name: 'Royston Drop Earrings',   sales: 11, revenue: 2978 },
  ],
  ordersByStatus: [
    { status: 'delivered',         count: 18 },
    { status: 'shipped',           count: 7  },
    { status: 'processing',        count: 4  },
    { status: 'payment_confirmed', count: 3  },
    { status: 'payment_uploaded',  count: 2  },
    { status: 'awaiting_payment',  count: 3  },
    { status: 'cancelled',         count: 1  },
  ],
};

// ─── Shipping rates ───────────────────────────────────────
export const MOCK_SHIPPING_RATES: ShippingRate[] = [
  { id: 'ship-1', zone: 'usa',           method: 'standard', label: 'Standard Shipping (USA)',   rate: 9.99,  free_threshold: 75,   est_days_min: 5,  est_days_max: 8,  active: true },
  { id: 'ship-2', zone: 'usa',           method: 'express',  label: 'Express Shipping (USA)',    rate: 19.99, free_threshold: 150,  est_days_min: 2,  est_days_max: 4,  active: true },
  { id: 'ship-3', zone: 'international', method: 'standard', label: 'Standard International',    rate: 24.99, free_threshold: null, est_days_min: 10, est_days_max: 21, active: true },
  { id: 'ship-4', zone: 'international', method: 'express',  label: 'Express International',     rate: 49.99, free_threshold: null, est_days_min: 5,  est_days_max: 10, active: true },
];

// ─── Coupons ──────────────────────────────────────────────
export const MOCK_COUPONS: Coupon[] = [
  { id: 'coup-1', code: 'WELCOME10', type: 'percent', value: 10, min_order: 0,   max_uses: 100, used_count: 23, applicable_to: 'all', expires_at: '2024-12-31T23:59:59Z', active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'coup-2', code: 'SUMMER50',  type: 'flat',    value: 50, min_order: 300, max_uses: 50,  used_count: 8,  applicable_to: 'all', expires_at: '2024-08-31T23:59:59Z', active: true,  created_at: '2024-06-01T00:00:00Z' },
  { id: 'coup-3', code: 'VIP20',     type: 'percent', value: 20, min_order: 500, max_uses: null,used_count: 4,  applicable_to: 'all', expires_at: null,                   active: false, created_at: '2024-02-01T00:00:00Z' },
];

// ─── Notification config ──────────────────────────────────
export const MOCK_NOTIFICATIONS: SalesNotificationConfig[] = [
  { id: 'notif-1', text_template: 'Someone in {state} just purchased {product}', active: true, interval_min_sec: 30, interval_max_sec: 90 },
];
