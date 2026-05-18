-- ═══════════════════════════════════════════════════════════
-- Native American Jewelry — Supabase Schema
-- Run in Supabase SQL Editor or via CLI:
--   supabase db push
-- ═══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for full-text product search

-- ─── updated_at trigger function ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════
-- CATEGORIES
-- ══════════════════════════════════════════════════════════
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  banner_url  TEXT,
  featured    BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_all"   ON categories FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- PRODUCTS
-- ══════════════════════════════════════════════════════════
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  description    TEXT,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  source_price   NUMERIC(10,2) NOT NULL CHECK (source_price > 0),
  price          NUMERIC(10,2) NOT NULL CHECK (price > 0),
  sku            TEXT,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  in_stock       BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','active','archived')),
  source_url     TEXT,
  approved_by    UUID,  -- references admin_users(id), set after creation
  approved_at    TIMESTAMPTZ,
  seo_title      TEXT,
  seo_description TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX products_search_idx ON products
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX products_status_idx   ON products(status);
CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_price_idx    ON products(price);
CREATE INDEX products_created_idx  ON products(created_at DESC);

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read_active" ON products
  FOR SELECT USING (status = 'active');
CREATE POLICY "products_admin_all" ON products FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- PRODUCT VARIANTS
-- ══════════════════════════════════════════════════════════
CREATE TABLE product_variants (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  value          TEXT NOT NULL,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  sku            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX variants_product_idx ON product_variants(product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_public_read" ON product_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.status = 'active')
);
CREATE POLICY "variants_admin_all" ON product_variants FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- PRODUCT IMAGES
-- ══════════════════════════════════════════════════════════
CREATE TABLE product_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX images_product_idx  ON product_images(product_id);
CREATE INDEX images_primary_idx  ON product_images(product_id, is_primary);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_public_read" ON product_images FOR SELECT USING (true);
CREATE POLICY "images_admin_all"   ON product_images FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- ADMIN USERS
-- ══════════════════════════════════════════════════════════
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL DEFAULT 'editor'
                  CHECK (role IN ('super_admin','admin','editor','support','analyst')),
  totp_secret   TEXT,
  totp_enabled  BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_self_read" ON admin_users FOR SELECT
  USING (auth.uid()::text = id::text);
CREATE POLICY "admin_users_super_all" ON admin_users FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

-- ══════════════════════════════════════════════════════════
-- CUSTOMERS  (linked to Supabase Auth)
-- ══════════════════════════════════════════════════════════
CREATE TABLE customers (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  phone       TEXT,
  wishlist    UUID[] NOT NULL DEFAULT '{}',
  blacklisted BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_own_read"  ON customers FOR SELECT USING (id = auth.uid());
CREATE POLICY "customers_own_write" ON customers FOR UPDATE USING (id = auth.uid());
CREATE POLICY "customers_admin_all" ON customers FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'support'));

-- ══════════════════════════════════════════════════════════
-- CUSTOMER ADDRESSES
-- ══════════════════════════════════════════════════════════
CREATE TABLE customer_addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT,
  country     TEXT NOT NULL DEFAULT 'US',
  zip         TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX addresses_customer_idx ON customer_addresses(customer_id);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_own" ON customer_addresses FOR ALL USING (
  customer_id = auth.uid()
);
CREATE POLICY "addresses_admin" ON customer_addresses FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'support'));

-- ══════════════════════════════════════════════════════════
-- ORDERS
-- ══════════════════════════════════════════════════════════
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     TEXT UNIQUE NOT NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'awaiting_payment'
                     CHECK (status IN (
                       'awaiting_payment','payment_uploaded','payment_confirmed',
                       'processing','shipped','delivered','cancelled','refunded'
                     )),
  subtotal         NUMERIC(10,2) NOT NULL,
  shipping_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL,
  shipping_method  TEXT,
  shipping_address JSONB NOT NULL,
  coupon_code      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX orders_customer_idx ON orders(customer_id);
CREATE INDEX orders_status_idx   ON orders(status);
CREATE INDEX orders_number_idx   ON orders(order_number);
CREATE INDEX orders_created_idx  ON orders(created_at DESC);

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_own_read"  ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "orders_admin_all" ON orders FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'support'));

-- ══════════════════════════════════════════════════════════
-- ORDER ITEMS
-- ══════════════════════════════════════════════════════════
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX order_items_order_idx ON order_items(order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_own_read"  ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'support'));

-- ══════════════════════════════════════════════════════════
-- PAYMENTS
-- ══════════════════════════════════════════════════════════
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method           TEXT NOT NULL
                     CHECK (method IN ('chime','cashapp','apple_cash','zelle','bank_transfer')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','uploaded','confirmed','failed','refunded')),
  amount           NUMERIC(10,2) NOT NULL,
  proof_url        TEXT,
  transaction_note TEXT,
  transaction_ref  TEXT,
  verified_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX payments_order_idx  ON payments(order_id);
CREATE INDEX payments_status_idx ON payments(status);

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_own_read"  ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "payments_own_upload" ON payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.customer_id = auth.uid()))
  WITH CHECK (status IN ('pending','uploaded'));
CREATE POLICY "payments_admin_all" ON payments FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'support'));

-- ══════════════════════════════════════════════════════════
-- SHIPPING RATES
-- ══════════════════════════════════════════════════════════
CREATE TABLE shipping_rates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone           TEXT NOT NULL CHECK (zone IN ('usa','international')),
  method         TEXT NOT NULL CHECK (method IN ('standard','express')),
  label          TEXT NOT NULL,
  rate           NUMERIC(10,2) NOT NULL,
  free_threshold NUMERIC(10,2),
  est_days_min   INT,
  est_days_max   INT,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER shipping_rates_updated_at BEFORE UPDATE ON shipping_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipping_public_read_active" ON shipping_rates FOR SELECT USING (active = true);
CREATE POLICY "shipping_admin_all" ON shipping_rates FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin'));

-- ══════════════════════════════════════════════════════════
-- COUPONS
-- ══════════════════════════════════════════════════════════
CREATE TABLE coupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT UNIQUE NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value          NUMERIC(10,2) NOT NULL CHECK (value > 0),
  min_order      NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses       INT,
  used_count     INT NOT NULL DEFAULT 0,
  applicable_to  TEXT NOT NULL DEFAULT 'all' CHECK (applicable_to IN ('all','category','product')),
  applicable_id  UUID,
  expires_at     TIMESTAMPTZ,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_admin_all" ON coupons FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- ABANDONED CARTS
-- ══════════════════════════════════════════════════════════
CREATE TABLE abandoned_carts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         UUID REFERENCES customers(id) ON DELETE CASCADE,
  email               TEXT,
  items_json          JSONB NOT NULL,
  recovery_email_sent BOOLEAN NOT NULL DEFAULT false,
  recovered           BOOLEAN NOT NULL DEFAULT false,
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX abandoned_carts_customer_idx ON abandoned_carts(customer_id);
CREATE INDEX abandoned_carts_active_idx   ON abandoned_carts(last_active_at DESC);

ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abandoned_carts_admin_all" ON abandoned_carts FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'support'));

-- ══════════════════════════════════════════════════════════
-- SCRAPE LOGS
-- ══════════════════════════════════════════════════════════
CREATE TABLE scrape_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            TEXT NOT NULL,
  target_url        TEXT,
  status            TEXT NOT NULL CHECK (status IN ('running','completed','failed','partial')),
  products_found    INT NOT NULL DEFAULT 0,
  products_filtered INT NOT NULL DEFAULT 0,
  products_imported INT NOT NULL DEFAULT 0,
  errors            JSONB,
  duration_ms       INT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);
CREATE INDEX scrape_logs_started_idx ON scrape_logs(started_at DESC);
CREATE INDEX scrape_logs_status_idx  ON scrape_logs(status);

ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scrape_logs_admin_all" ON scrape_logs FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin'));

-- ══════════════════════════════════════════════════════════
-- INVENTORY LOGS
-- ══════════════════════════════════════════════════════════
CREATE TABLE inventory_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  change     INT NOT NULL,
  reason     TEXT,
  admin_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX inventory_logs_product_idx ON inventory_logs(product_id);

ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_logs_admin_all" ON inventory_logs FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- HOMEPAGE SECTIONS (CMS)
-- ══════════════════════════════════════════════════════════
CREATE TABLE homepage_sections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         TEXT NOT NULL
                 CHECK (type IN ('hero','banner','featured_collection','testimonials','announcement')),
  title        TEXT,
  content_json JSONB,
  position     INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER homepage_sections_updated_at BEFORE UPDATE ON homepage_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homepage_public_read" ON homepage_sections FOR SELECT USING (active = true);
CREATE POLICY "homepage_admin_all"   ON homepage_sections FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- TESTIMONIALS
-- ══════════════════════════════════════════════════════════
CREATE TABLE testimonials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  content       TEXT NOT NULL,
  rating        INT CHECK (rating BETWEEN 1 AND 5),
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  photo_url     TEXT,
  approved      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_public_approved" ON testimonials FOR SELECT USING (approved = true);
CREATE POLICY "testimonials_admin_all"       ON testimonials FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'editor'));

-- ══════════════════════════════════════════════════════════
-- NOTIFICATIONS (social proof popup config)
-- ══════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_template    TEXT NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT true,
  interval_min_sec INT NOT NULL DEFAULT 30,
  interval_max_sec INT NOT NULL DEFAULT 90,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_public_active" ON notifications FOR SELECT USING (active = true);
CREATE POLICY "notifications_admin_all"     ON notifications FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin'));

-- ══════════════════════════════════════════════════════════
-- DISCOUNT RULES
-- ══════════════════════════════════════════════════════════
CREATE TABLE discount_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('percent','flat','free_shipping')),
  value       NUMERIC(10,2),
  applies_to  TEXT NOT NULL DEFAULT 'all',
  conditions  JSONB,
  priority    INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER discount_rules_updated_at BEFORE UPDATE ON discount_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discount_rules_admin_all" ON discount_rules FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('admin', 'super_admin'));

-- ══════════════════════════════════════════════════════════
-- STORAGE BUCKETS  (run via Supabase dashboard or CLI)
-- ══════════════════════════════════════════════════════════
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true);
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage RLS for product-images (public read, service-role write)
-- CREATE POLICY "product_images_public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'product-images');
-- CREATE POLICY "product_images_service_write" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- Storage RLS for payment-proofs (customer upload only, admin read)
-- CREATE POLICY "payment_proofs_customer_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "payment_proofs_admin_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'payment-proofs' AND (auth.jwt() ->> 'role') IN ('admin','super_admin','support'));
