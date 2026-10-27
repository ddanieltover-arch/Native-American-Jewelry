-- Run in Supabase SQL editor AFTER apps are cut over to Neon + R2.
-- Frees database disk. Does NOT delete Auth users.

-- Truncate heavy public tables (order matters for FKs)
TRUNCATE TABLE
  order_items,
  payments,
  orders,
  product_images,
  product_variants,
  inventory_logs,
  scrape_logs,
  abandoned_carts,
  testimonials,
  products,
  contact_submissions,
  newsletter_subscribers
RESTART IDENTITY CASCADE;

-- Optional: keep categories / shipping_rates / admin_users as stubs, or truncate those too:
-- TRUNCATE TABLE categories, shipping_rates, coupons, notifications, homepage_sections, discount_rules, customers, customer_addresses, admin_users RESTART IDENTITY CASCADE;

-- Empty Storage via Dashboard → Storage → delete objects in product-images and payment-proofs
-- (or use Supabase Storage API / CLI). SQL alone does not free file storage bytes.
