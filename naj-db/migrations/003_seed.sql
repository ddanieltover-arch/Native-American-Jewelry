-- Optional seed for empty Neon DBs (skip if migrating live data)

INSERT INTO categories (id, name, slug, parent_id, featured, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Necklaces',    'necklaces',    NULL, true,  1),
  ('11111111-0000-0000-0000-000000000002', 'Rings',        'rings',        NULL, true,  2),
  ('11111111-0000-0000-0000-000000000003', 'Bracelets',    'bracelets',    NULL, true,  3),
  ('11111111-0000-0000-0000-000000000004', 'Earrings',     'earrings',     NULL, true,  4),
  ('11111111-0000-0000-0000-000000000005', 'Concho Belts', 'concho-belts', NULL, false, 5),
  ('11111111-0000-0000-0000-000000000006', 'Cuffs',        'cuffs',        NULL, false, 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO shipping_rates (zone, method, label, rate, free_threshold, est_days_min, est_days_max, active)
SELECT * FROM (VALUES
  ('usa'::text,           'standard'::text, 'Standard Shipping (USA)',           15.00::numeric, 400.00::numeric, 5,  8,  true),
  ('usa',           'express',  'Express Shipping (USA)',            25.00,   NULL, 2,  4,  true),
  ('international', 'standard', 'Standard Shipping (International)', 35.00,   NULL, 10, 21,  true),
  ('international', 'express',  'Express Shipping (International)',  55.00,   NULL,  5, 10,  true)
) AS v(zone, method, label, rate, free_threshold, est_days_min, est_days_max, active)
WHERE NOT EXISTS (SELECT 1 FROM shipping_rates LIMIT 1);

INSERT INTO notifications (text_template, active, interval_min_sec, interval_max_sec)
SELECT 'Someone in {state} just purchased {product}', true, 30, 90
WHERE NOT EXISTS (SELECT 1 FROM notifications LIMIT 1);

INSERT INTO coupons (code, type, value, min_order, max_uses, active) VALUES
  ('WELCOME10', 'percent', 10.00, 0,   100, true),
  ('SUMMER50',  'flat',    50.00, 300, 50,  false)
ON CONFLICT (code) DO NOTHING;
