-- Sample active products for storefront testing (run after 001-003)
-- Uses placeholder images; replace URLs after scraper uploads to Storage

INSERT INTO products (id, name, slug, description, category_id, source_price, price, tags, in_stock, stock_quantity, status, seo_title, seo_description) VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    'Navajo Turquoise Squash Blossom Necklace',
    'navajo-turquoise-squash-blossom-necklace',
    'Handcrafted sterling silver squash blossom necklace featuring natural Kingman turquoise. A timeless Southwest statement piece.',
    '11111111-0000-0000-0000-000000000001',
    420.00, 399.00,
    ARRAY['turquoise', 'navajo', 'necklace', 'sterling-silver'],
    true, 5, 'active',
    'Navajo Turquoise Squash Blossom Necklace | Native American Jewelry',
    'Authentic Navajo squash blossom necklace with natural turquoise.'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'Zuni Petit Point Turquoise Ring',
    'zuni-petit-point-turquoise-ring',
    'Delicate Zuni petit point inlay ring set in sterling silver. Each stone hand-cut and set by a master artisan.',
    '11111111-0000-0000-0000-000000000002',
    285.00, 270.75,
    ARRAY['turquoise', 'zuni', 'ring', 'inlay'],
    true, 8, 'active',
    'Zuni Petit Point Turquoise Ring',
    'Handcrafted Zuni petit point turquoise ring.'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'Hopi Overlay Silver Cuff Bracelet',
    'hopi-overlay-silver-cuff-bracelet',
    'Traditional Hopi overlay technique cuff in heavy-gauge sterling silver with oxidized geometric patterns.',
    '11111111-0000-0000-0000-000000000003',
    350.00, 332.50,
    ARRAY['hopi', 'bracelet', 'silver', 'overlay'],
    true, 3, 'active',
    'Hopi Overlay Silver Cuff Bracelet',
    'Authentic Hopi overlay sterling silver cuff.'
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    'Sleeping Beauty Turquoise Drop Earrings',
    'sleeping-beauty-turquoise-drop-earrings',
    'Elegant drop earrings featuring Sleeping Beauty turquoise cabochons in hand-stamped silver bezels.',
    '11111111-0000-0000-0000-000000000004',
    195.00, 185.25,
    ARRAY['turquoise', 'earrings', 'sleeping-beauty'],
    true, 12, 'active',
    'Sleeping Beauty Turquoise Drop Earrings',
    'Sterling silver drop earrings with Sleeping Beauty turquoise.'
  ),
  (
    '22222222-0000-0000-0000-000000000005',
    'Navajo Concho Belt — 12 Piece',
    'navajo-concho-belt-12-piece',
    'Full 12-concho belt in sterling silver with hand-stamped designs. A collector-grade Southwest classic.',
    '11111111-0000-0000-0000-000000000005',
    890.00, 845.50,
    ARRAY['concho', 'belt', 'navajo', 'collectible'],
    true, 2, 'active',
    'Navajo Concho Belt 12 Piece',
    'Handcrafted Navajo sterling silver concho belt.'
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, url, alt, is_primary, position) VALUES
  ('22222222-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1515566662555-4e8f83fa4b44?w=800&q=80', 'Navajo Turquoise Squash Blossom Necklace', true, 0),
  ('22222222-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1605100804763-247f67b35585?w=800&q=80', 'Zuni Petit Point Turquoise Ring', true, 0),
  ('22222222-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1611591437281-460bfacacb3c?w=800&q=80', 'Hopi Overlay Silver Cuff Bracelet', true, 0),
  ('22222222-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', 'Sleeping Beauty Turquoise Drop Earrings', true, 0),
  ('22222222-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80', 'Navajo Concho Belt', true, 0)
ON CONFLICT DO NOTHING;
