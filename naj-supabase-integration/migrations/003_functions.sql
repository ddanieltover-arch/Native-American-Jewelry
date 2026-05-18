-- ═══════════════════════════════════════════════════════════
-- Supabase Helper Functions & RPCs
-- Run in Supabase SQL Editor after 001_schema.sql
-- ═══════════════════════════════════════════════════════════

-- ─── Decrement stock safely ───────────────────────────────
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id UUID,
  p_quantity   INT
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET
    stock_quantity = GREATEST(0, stock_quantity - p_quantity),
    in_stock       = CASE WHEN (stock_quantity - p_quantity) <= 0 THEN false ELSE true END
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Generate unique order number ─────────────────────────
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_year   TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_num    INT;
  v_result TEXT;
BEGIN
  -- Get next sequence value (auto-incrementing per year)
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(order_number, '-', 3) AS INT)
  ), 0) + 1
  INTO v_num
  FROM orders
  WHERE order_number LIKE 'NAJ-' || v_year || '-%';

  v_result := 'NAJ-' || v_year || '-' || LPAD(v_num::TEXT, 4, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Full-text product search function ────────────────────
CREATE OR REPLACE FUNCTION search_products(
  p_query    TEXT,
  p_limit    INT DEFAULT 10,
  p_offset   INT DEFAULT 0
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  slug        TEXT,
  price       NUMERIC,
  category_id UUID,
  rank        FLOAT4
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.price,
    p.category_id,
    ts_rank(
      to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')),
      websearch_to_tsquery('english', p_query)
    ) AS rank
  FROM products p
  WHERE
    p.status = 'active'
    AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, ''))
        @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── Get products with primary image only ─────────────────
-- (optimised view used by catalog page)
CREATE OR REPLACE VIEW products_with_primary_image AS
SELECT
  p.*,
  pi.url        AS primary_image_url,
  pi.alt        AS primary_image_alt,
  c.name        AS category_name,
  c.slug        AS category_slug
FROM products p
LEFT JOIN LATERAL (
  SELECT url, alt
  FROM product_images
  WHERE product_id = p.id AND is_primary = true
  LIMIT 1
) pi ON true
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active';

-- ─── Analytics: revenue by day ────────────────────────────
CREATE OR REPLACE FUNCTION revenue_by_day(
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  day     DATE,
  revenue NUMERIC,
  orders  BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at)                      AS day,
    SUM(total)                            AS revenue,
    COUNT(*)                              AS orders
  FROM orders
  WHERE
    created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND status NOT IN ('cancelled','refunded')
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── Analytics: top products by revenue ──────────────────
CREATE OR REPLACE FUNCTION top_products_by_revenue(
  p_days  INT DEFAULT 30,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  product_name TEXT,
  units_sold   BIGINT,
  revenue      NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_name,
    SUM(oi.quantity)  AS units_sold,
    SUM(oi.subtotal)  AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE
    o.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND o.status NOT IN ('cancelled','refunded')
  GROUP BY oi.product_name
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── Realtime: enable for key tables ─────────────────────
-- Run in Supabase dashboard → Database → Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE payments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE scrape_logs;

-- ─── Storage: create buckets ──────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true,  20971520, ARRAY['image/webp','image/jpeg','image/png']),
  ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: product-images (public read)
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_service_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'role' IN ('service_role','admin','super_admin'))
  );

-- Storage policies: payment-proofs (customer upload, admin read)
CREATE POLICY "payment_proofs_customer_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "payment_proofs_admin_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND (auth.jwt() ->> 'role' IN ('admin','super_admin','support','service_role'))
  );
