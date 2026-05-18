-- ═══════════════════════════════════════════════════════════
-- Native American Jewelry — Seed Data
-- Run AFTER 001_schema.sql
-- ═══════════════════════════════════════════════════════════

-- ─── Categories ───────────────────────────────────────────
INSERT INTO categories (id, name, slug, parent_id, featured, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Necklaces',    'necklaces',    NULL, true,  1),
  ('11111111-0000-0000-0000-000000000002', 'Rings',        'rings',        NULL, true,  2),
  ('11111111-0000-0000-0000-000000000003', 'Bracelets',    'bracelets',    NULL, true,  3),
  ('11111111-0000-0000-0000-000000000004', 'Earrings',     'earrings',     NULL, true,  4),
  ('11111111-0000-0000-0000-000000000005', 'Concho Belts', 'concho-belts', NULL, false, 5),
  ('11111111-0000-0000-0000-000000000006', 'Cuffs',        'cuffs',        NULL, false, 6)
ON CONFLICT (slug) DO NOTHING;

-- ─── Shipping Rates ───────────────────────────────────────
INSERT INTO shipping_rates (zone, method, label, rate, free_threshold, est_days_min, est_days_max, active) VALUES
  ('usa',           'standard', 'Standard Shipping (USA)',   9.99,  75.00,  5,  8,  true),
  ('usa',           'express',  'Express Shipping (USA)',   19.99, 150.00,  2,  4,  true),
  ('international', 'standard', 'Standard International',  24.99,   NULL, 10, 21,  true),
  ('international', 'express',  'Express International',   49.99,   NULL,  5, 10,  true)
ON CONFLICT DO NOTHING;

-- ─── Notification popup ───────────────────────────────────
INSERT INTO notifications (text_template, active, interval_min_sec, interval_max_sec)
VALUES ('Someone in {state} just purchased {product}', true, 30, 90)
ON CONFLICT DO NOTHING;

-- ─── Default coupons ──────────────────────────────────────
INSERT INTO coupons (code, type, value, min_order, max_uses, active) VALUES
  ('WELCOME10', 'percent', 10.00, 0,   100, true),
  ('SUMMER50',  'flat',    50.00, 300, 50,  false)
ON CONFLICT (code) DO NOTHING;

-- ─── Homepage sections ────────────────────────────────────
INSERT INTO homepage_sections (type, title, content_json, position, active) VALUES
  ('hero', 'Jewelry of the Southwest', '{"subtitle":"Authentic handcrafted pieces by Navajo, Zuni, Hopi & Pueblo artisans","cta_label":"Shop All Jewelry","cta_href":"/shop"}', 0, true),
  ('featured_collection', 'Bestsellers', '{"collection":"bestsellers","limit":4}', 1, true),
  ('testimonials', 'What Collectors Say', NULL, 2, true),
  ('featured_collection', 'New Arrivals', '{"collection":"newest","limit":4}', 3, true)
ON CONFLICT DO NOTHING;

-- ─── Sample admin user (update email/role as needed) ──────
-- NOTE: This creates an admin_users row; Supabase Auth user must be
--       created separately via dashboard or Auth API.
-- INSERT INTO admin_users (email, role)
-- VALUES ('admin@nativeamericanjewelry.com', 'super_admin')
-- ON CONFLICT (email) DO NOTHING;
