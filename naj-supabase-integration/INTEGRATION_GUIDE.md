# Supabase Integration Guide
## Native American Jewelry — All Three Services

---

## 1. Supabase Project Setup

### Create project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `native-american-jewelry`
3. Choose a region close to your users (US East recommended)
4. Set a strong database password — save it

### Run migrations (in order)
In **Supabase → SQL Editor**, run each file:

```sql
-- 1. Schema (all 17 tables, RLS, indexes, triggers)
-- Paste contents of: migrations/001_schema.sql

-- 2. Seed data (categories, shipping rates, defaults)
-- Paste contents of: migrations/002_seed.sql

-- 3. Helper functions & RPCs (search, analytics, storage)
-- Paste contents of: migrations/003_functions.sql
```

### Get your keys
Go to **Settings → API**:
- `SUPABASE_URL` = Project URL (https://xxx.supabase.co)
- `SUPABASE_ANON_KEY` = `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` = `service_role` key (**never expose client-side**)

---

## 2. Storage Setup

### Create buckets (already in 003_functions.sql, but verify in dashboard)
Go to **Storage** → check these buckets exist:
- `product-images` — public, 20MB limit
- `payment-proofs` — private, 10MB limit

---

## 3. Storefront (naj-storefront) Integration

### Step 1 — Install deps
```bash
cd naj-storefront
npm install @supabase/supabase-js @supabase/ssr
```

### Step 2 — Environment variables
Create `naj-storefront/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=product-images
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_xxxx
FROM_EMAIL=orders@nativeamericanjewelry.com
```

### Step 3 — Replace mock-data imports
Copy `naj-supabase/lib/storefront/db.ts` → `naj-storefront/src/lib/db.ts`
Copy `naj-supabase/types/database.types.ts` → `naj-storefront/src/lib/database.types.ts`

Then update each page/component that currently imports from `@/lib/mock-data`:

#### Homepage (`src/app/(store)/page.tsx`)
```tsx
// BEFORE
import { PRODUCTS, CATEGORIES, getFeaturedProducts, getNewArrivals } from '@/lib/mock-data';

// AFTER
import { getFeaturedProducts, getNewArrivals, getCategories } from '@/lib/db';
// Make the page async:
export default async function HomePage() {
  const [featured, newArrivals, categories] = await Promise.all([
    getFeaturedProducts(4),
    getNewArrivals(4),
    getCategories(),
  ]);
  // ...rest of JSX using these values
}
```

#### Shop page (`src/app/(store)/shop/page.tsx`)
```tsx
// The shop page is client-side — call the API route instead:
const res = await fetch(`/api/products?${new URLSearchParams(params)}`);
const { products, total } = await res.json();
```

#### Product page (`src/app/(store)/product/[slug]/page.tsx`)
```tsx
// BEFORE
import { getProductBySlug } from '@/lib/mock-data';

// AFTER
import { getProductBySlug, getRelatedProducts } from '@/lib/db';
export default async function ProductPage({ params }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.id, product.category_id!);
  // ...
}
```

#### SalesNotification (`src/components/store/SalesNotification.tsx`)
```tsx
// BEFORE: uses PRODUCTS array from mock-data
// AFTER: fetch from API on mount
useEffect(() => {
  fetch('/api/products?per_page=50')
    .then(r => r.json())
    .then(({ products }) => setProducts(products));
}, []);
```

### Step 4 — Add API route files
Uncomment and place each route from `naj-supabase/lib/storefront/api-routes.ts`:
```
src/app/api/products/route.ts
src/app/api/products/[slug]/route.ts
src/app/api/orders/route.ts
src/app/api/orders/[id]/proof/route.ts
src/app/api/coupons/validate/route.ts
src/app/api/shipping/route.ts
```

### Step 5 — Supabase Auth for customer accounts
```tsx
// src/lib/supabase.ts — already created, update if needed
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

For the account page, replace mock order data:
```tsx
import { getCustomerOrders } from '@/lib/db';
const { data: { user } } = await supabase.auth.getUser();
const orders = user ? await getCustomerOrders(user.id) : [];
```

---

## 4. Admin Dashboard (naj-admin) Integration

### Step 1 — Environment variables
Create `naj-admin/.env.local`:
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SCRAPER_SERVICE_URL=http://localhost:4000
SCRAPER_API_KEY=your_scraper_api_key
RESEND_API_KEY=re_xxxx
FROM_EMAIL=orders@nativeamericanjewelry.com
ADMIN_EMAIL=admin@nativeamericanjewelry.com
```

### Step 2 — Copy data layer files
```bash
cp naj-supabase/lib/admin/db.ts    naj-admin/src/lib/db.ts
cp naj-supabase/lib/admin/auth.ts  naj-admin/src/lib/auth.ts
cp naj-supabase/types/database.types.ts naj-admin/src/lib/database.types.ts
```

### Step 3 — Replace mock data in each page

#### Dashboard (`src/app/admin/page.tsx`)
```tsx
// BEFORE
const analytics = MOCK_ANALYTICS;
const pendingProducts = MOCK_PRODUCTS.filter(p => p.status === 'pending');

// AFTER — make page async
export default async function AdminDashboard() {
  const [analytics, scrapeLogs] = await Promise.all([
    adminGetAnalytics(30),
    adminGetScrapeLogs(5),
  ]);
  // ...
}
```

#### Products Approval (`src/app/admin/products/approval/page.tsx`)
```tsx
// Initialize state from DB instead of mock
const [products, setProducts] = useState<AdminProduct[]>([]);
useEffect(() => {
  fetch('/api/admin/products?status=pending')
    .then(r => r.json())
    .then(({ products }) => setProducts(products));
}, []);
```

#### Orders (`src/app/admin/orders/page.tsx`)
```tsx
// Replace MOCK_ORDERS with API call
const [orders, setOrders] = useState([]);
useEffect(() => {
  fetch(`/api/admin/orders?status=${status}&page=${page}`)
    .then(r => r.json())
    .then(data => setOrders(data.orders));
}, [status, page]);
```

#### Payments (`src/app/admin/payments/page.tsx`)
```tsx
// Load payments with uploaded proofs first
useEffect(() => {
  fetch('/api/admin/payments?status=uploaded')
    .then(r => r.json())
    .then(data => setOrders(data.orders));
}, []);
```

#### Customers (`src/app/admin/customers/page.tsx`)
```tsx
useEffect(() => {
  fetch(`/api/admin/customers?search=${search}&page=${page}`)
    .then(r => r.json())
    .then(data => setCustomers(data.customers));
}, [search, page]);
```

#### Analytics (`src/app/admin/analytics/page.tsx`)
```tsx
// Server component — fetch directly
export default async function AnalyticsPage() {
  const analytics = await adminGetAnalytics(30);
  // ...
}
```

#### Scraper (`src/app/admin/scraper/page.tsx`)
```tsx
// Load scrape logs from DB
useEffect(() => {
  fetch('/api/admin/scraper/logs')
    .then(r => r.json())
    .then(data => setLogs(data.logs));
}, []);

// Trigger button calls real API
const triggerScrape = async () => {
  const res = await fetch('/api/admin/scraper/trigger', { method: 'POST' });
  const data = await res.json();
  toast.info(`Scrape job queued: ${data.jobId}`);
};
```

### Step 4 — Add API route files
Uncomment and place each route from `naj-supabase/lib/admin/api-routes.ts`:
```
src/app/api/admin/products/approve/route.ts
src/app/api/admin/products/[id]/route.ts
src/app/api/admin/orders/route.ts
src/app/api/admin/orders/[id]/status/route.ts
src/app/api/admin/payments/[id]/verify/route.ts
src/app/api/admin/analytics/route.ts
src/app/api/admin/scraper/trigger/route.ts
```

### Step 5 — Create admin user
```sql
-- In Supabase SQL Editor:
INSERT INTO admin_users (email, role)
VALUES ('admin@nativeamericanjewelry.com', 'super_admin');
```

Then create the corresponding Supabase Auth user:
```bash
# Via Supabase CLI or dashboard
supabase auth admin create-user \
  --email admin@nativeamericanjewelry.com \
  --password YourSecurePassword123!
```

---

## 5. Scraper Service (naj-scraper) Integration

### Step 1 — Update .env
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=product-images
REDIS_URL=redis://localhost:6379
TARGET_URL=https://hippiecowgirlcouture.com
MIN_PRICE_FILTER=150
DISCOUNT_RATE=0.05
RESEND_API_KEY=re_xxxx
ADMIN_EMAIL=admin@nativeamericanjewelry.com
SCRAPER_API_KEY=generate_a_random_key_here
```

### Step 2 — Replace db/supabase.ts
```bash
cp naj-supabase/lib/scraper/db.ts  naj-scraper/src/db/supabase.ts
cp naj-supabase/types/database.types.ts naj-scraper/src/db/database.types.ts
```

### Step 3 — Verify connection on boot
The worker's `boot()` function already calls `redisConnection.ping()`.
Add Supabase check too:

```typescript
// In src/worker.ts — inside boot()
const { checkSupabaseConnection } = await import('./db/supabase');
const supabaseOk = await checkSupabaseConnection();
if (!supabaseOk) {
  logger.error('✗ Supabase connection failed');
  process.exit(1);
}
logger.info('✓ Supabase connected');
```

---

## 6. Realtime (optional but powerful)

Enable realtime updates in Supabase dashboard → **Database → Replication**:
Add tables: `orders`, `payments`, `products`, `scrape_logs`

### Storefront: Live scrape log in admin
```typescript
// In naj-admin scraper page
useEffect(() => {
  const channel = supabase
    .channel('scrape_logs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scrape_logs' },
      (payload) => {
        setLogs(prev => {
          const exists = prev.find(l => l.id === payload.new.id);
          return exists
            ? prev.map(l => l.id === payload.new.id ? payload.new : l)
            : [payload.new, ...prev];
        });
      })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

### Admin: Live payment notifications
```typescript
useEffect(() => {
  const channel = supabase
    .channel('new_payments')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'payments', filter: 'status=eq.uploaded' },
      (payload) => {
        toast.info('New payment proof uploaded — review needed');
      })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

---

## 7. Deployment Checklist

### Vercel (storefront + admin)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy storefront
cd naj-storefront && vercel --prod

# Deploy admin (separate project)
cd naj-admin && vercel --prod
```

Set all env vars in **Vercel → Project Settings → Environment Variables**.

Key Vercel settings:
- **Build Command**: `next build`
- **Framework**: Next.js
- **Node Version**: 20.x

### Scraper service (Railway / Render / Fly.io)
```bash
# Railway
railway init
railway up

# Or Render — set start command:
# node dist/worker.js
```

### Environment variables per service

| Variable | Storefront | Admin | Scraper |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ❌ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ❌ |
| `SUPABASE_URL` | ✅ | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ |
| `RESEND_API_KEY` | ✅ | ✅ | ✅ |
| `REDIS_URL` | ❌ | ❌ | ✅ |
| `SCRAPER_API_KEY` | ❌ | ✅ | ✅ |
| `SCRAPER_SERVICE_URL` | ❌ | ✅ | ❌ |

---

## 8. Quick Verification

After deployment, verify each service:

```bash
# Storefront products loading
curl https://yourdomain.com/api/products | jq '.total'

# Admin health (with auth)
curl https://admin.yourdomain.com/api/admin/analytics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Scraper health
curl http://scraper:4000/health | jq '.status'

# Test full flow
# 1. Trigger scrape → products appear in admin approval queue
# 2. Approve product → visible on storefront
# 3. Place test order → payment record created in DB
# 4. Upload proof → admin payment page shows badge
# 5. Confirm payment → order status updates to 'processing'
```
