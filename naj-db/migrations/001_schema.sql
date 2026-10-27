-- ═══════════════════════════════════════════════════════════
-- Native American Jewelry — Neon schema (no Supabase auth/RLS)
-- Apply: psql "$DATABASE_URL" -f migrations/001_schema.sql
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── CATEGORIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
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
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PRODUCTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  source_price    NUMERIC(10,2) NOT NULL CHECK (source_price > 0),
  price           NUMERIC(10,2) NOT NULL CHECK (price > 0),
  sku             TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  in_stock        BOOLEAN NOT NULL DEFAULT true,
  stock_quantity  INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','archived')),
  source_url      TEXT,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  seo_title       TEXT,
  seo_description TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_search_idx ON products
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS products_status_idx   ON products(status);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_price_idx    ON products(price);
CREATE INDEX IF NOT EXISTS products_created_idx  ON products(created_at DESC);

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PRODUCT VARIANTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  value          TEXT NOT NULL,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  sku            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS variants_product_idx ON product_variants(product_id);

-- ─── PRODUCT IMAGES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS images_product_idx  ON product_images(product_id);
CREATE INDEX IF NOT EXISTS images_primary_idx  ON product_images(product_id, is_primary);

-- ─── ADMIN USERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
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
DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── CUSTOMERS (id matches Supabase Auth user id; no FK) ──
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY,
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
DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── CUSTOMER ADDRESSES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_addresses (
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
CREATE INDEX IF NOT EXISTS addresses_customer_idx ON customer_addresses(customer_id);

-- ─── ORDERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
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
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders(status);
CREATE INDEX IF NOT EXISTS orders_number_idx   ON orders(order_number);
CREATE INDEX IF NOT EXISTS orders_created_idx  ON orders(created_at DESC);

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ORDER ITEMS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
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
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- ─── PAYMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
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
CREATE INDEX IF NOT EXISTS payments_order_idx  ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SHIPPING RATES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_rates (
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
DROP TRIGGER IF EXISTS shipping_rates_updated_at ON shipping_rates;
CREATE TRIGGER shipping_rates_updated_at BEFORE UPDATE ON shipping_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── COUPONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
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
DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ABANDONED CARTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         UUID REFERENCES customers(id) ON DELETE CASCADE,
  email               TEXT,
  items_json          JSONB NOT NULL,
  recovery_email_sent BOOLEAN NOT NULL DEFAULT false,
  recovered           BOOLEAN NOT NULL DEFAULT false,
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS abandoned_carts_customer_idx ON abandoned_carts(customer_id);
CREATE INDEX IF NOT EXISTS abandoned_carts_active_idx   ON abandoned_carts(last_active_at DESC);

-- ─── SCRAPE LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_logs (
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
CREATE INDEX IF NOT EXISTS scrape_logs_started_idx ON scrape_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS scrape_logs_status_idx  ON scrape_logs(status);

-- ─── INVENTORY LOGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  change     INT NOT NULL,
  reason     TEXT,
  admin_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS inventory_logs_product_idx ON inventory_logs(product_id);

-- ─── HOMEPAGE SECTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS homepage_sections (
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
DROP TRIGGER IF EXISTS homepage_sections_updated_at ON homepage_sections;
CREATE TRIGGER homepage_sections_updated_at BEFORE UPDATE ON homepage_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TESTIMONIALS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  content       TEXT NOT NULL,
  rating        INT CHECK (rating BETWEEN 1 AND 5),
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  photo_url     TEXT,
  approved      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_template    TEXT NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT true,
  interval_min_sec INT NOT NULL DEFAULT 30,
  interval_max_sec INT NOT NULL DEFAULT 90,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DISCOUNT RULES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_rules (
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
DROP TRIGGER IF EXISTS discount_rules_updated_at ON discount_rules;
CREATE TRIGGER discount_rules_updated_at BEFORE UPDATE ON discount_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── NEWSLETTER & CONTACT ─────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'footer',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (lower(email));

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx ON contact_submissions (created_at DESC);
