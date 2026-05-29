import type { Product, Category, ShippingRate } from '@/types';
import { pickDailyRandomProducts } from '@/lib/utils';

export const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Necklaces',  slug: 'necklaces',  parent_id: null, featured: true,  sort_order: 1 },
  { id: 'cat-2', name: 'Rings',      slug: 'rings',      parent_id: null, featured: true,  sort_order: 2 },
  { id: 'cat-3', name: 'Bracelets',  slug: 'bracelets',  parent_id: null, featured: true,  sort_order: 3 },
  { id: 'cat-4', name: 'Earrings',   slug: 'earrings',   parent_id: null, featured: true,  sort_order: 4 },
  { id: 'cat-5', name: 'Concho Belts',slug:'concho-belts',parent_id: null, featured: false, sort_order: 5 },
  { id: 'cat-6', name: 'Cuffs',      slug: 'cuffs',      parent_id: null, featured: false, sort_order: 6 },
];

export const PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Turquoise & Sterling Silver Squash Blossom Necklace',
    slug: 'turquoise-sterling-silver-squash-blossom-necklace',
    description: 'A museum-quality squash blossom necklace handcrafted by Navajo artisans. Features 18 genuine Sleeping Beauty turquoise stones set in sterling silver bezels. The naja pendant measures 4" and the necklace spans 26". Each stone selected for its rich sky-blue color and natural matrix.',
    category_id: 'cat-1',
    category: CATEGORIES[0],
    source_price: 895,
    price: 850.25,
    sku: 'NAJ-NK-001',
    tags: ['turquoise', 'navajo', 'squash blossom', 'sterling silver', 'sleeping beauty'],
    in_stock: true,
    stock_quantity: 3,
    status: 'active',
    images: [
      { id: 'img-001-1', product_id: 'prod-001', url: '', alt: 'Squash blossom necklace front', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-001-1', product_id: 'prod-001', name: 'Chain Length', value: '24"', price_modifier: 0, stock_quantity: 2, sku: 'NAJ-NK-001-24' },
      { id: 'var-001-2', product_id: 'prod-001', name: 'Chain Length', value: '26"', price_modifier: 15, stock_quantity: 1, sku: 'NAJ-NK-001-26' },
    ],
    rating: 4.9,
    review_count: 34,
    badge: 'Bestseller',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'prod-002',
    name: 'Zuni Inlay Thunderbird Ring',
    slug: 'zuni-inlay-thunderbird-ring',
    description: 'Exquisite channel inlay work by Zuni master jewelers. The thunderbird design features turquoise, coral, onyx, and mother of pearl inlaid into sterling silver. A striking statement piece that honors centuries of Zuni artistry.',
    category_id: 'cat-2',
    category: CATEGORIES[1],
    source_price: 425,
    price: 403.75,
    sku: 'NAJ-RG-002',
    tags: ['zuni', 'inlay', 'thunderbird', 'ring', 'turquoise', 'coral'],
    in_stock: true,
    stock_quantity: 6,
    status: 'active',
    images: [
      { id: 'img-002-1', product_id: 'prod-002', url: '', alt: 'Thunderbird ring top view', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-002-1', product_id: 'prod-002', name: 'Ring Size', value: '6', price_modifier: 0, stock_quantity: 1 },
      { id: 'var-002-2', product_id: 'prod-002', name: 'Ring Size', value: '7', price_modifier: 0, stock_quantity: 2 },
      { id: 'var-002-3', product_id: 'prod-002', name: 'Ring Size', value: '8', price_modifier: 0, stock_quantity: 2 },
      { id: 'var-002-4', product_id: 'prod-002', name: 'Ring Size', value: '9', price_modifier: 0, stock_quantity: 1 },
    ],
    rating: 4.8,
    review_count: 21,
    badge: 'New',
    created_at: '2024-02-20T10:00:00Z',
  },
  {
    id: 'prod-003',
    name: 'Navajo Wide Silver Cuff with Stamped Designs',
    slug: 'navajo-wide-silver-cuff-stamped-designs',
    description: 'Heavy gauge sterling silver cuff hand-stamped by a third-generation Navajo silversmith. The geometric thunderbird and lightning bolt patterns are stamped into the silver using traditional iron stamps, then oxidized to bring out the deep shadows. Width 1.5", opening 1.25".',
    category_id: 'cat-6',
    category: CATEGORIES[5],
    source_price: 310,
    price: 294.50,
    sku: 'NAJ-CF-003',
    tags: ['navajo', 'cuff', 'stamped', 'sterling silver', 'wide'],
    in_stock: true,
    stock_quantity: 8,
    status: 'active',
    images: [
      { id: 'img-003-1', product_id: 'prod-003', url: '', alt: 'Stamped silver cuff', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-003-1', product_id: 'prod-003', name: 'Wrist Size', value: 'Small (5.5"-6")', price_modifier: 0, stock_quantity: 3 },
      { id: 'var-003-2', product_id: 'prod-003', name: 'Wrist Size', value: 'Medium (6"-6.5")', price_modifier: 0, stock_quantity: 3 },
      { id: 'var-003-3', product_id: 'prod-003', name: 'Wrist Size', value: 'Large (6.5"-7")', price_modifier: 0, stock_quantity: 2 },
    ],
    rating: 4.7,
    review_count: 18,
    created_at: '2024-01-28T10:00:00Z',
  },
  {
    id: 'prod-004',
    name: 'Royston Turquoise Drop Earrings',
    slug: 'royston-turquoise-drop-earrings',
    description: 'Stunning drop earrings featuring rare Royston turquoise — prized for its unique green-blue matrix. Set in solid sterling silver with handmade French hooks. Each pair is one-of-a-kind due to the natural variation in Royston stones. Drop length 2.5".',
    category_id: 'cat-4',
    category: CATEGORIES[3],
    source_price: 285,
    price: 270.75,
    sku: 'NAJ-ER-004',
    tags: ['royston', 'turquoise', 'earrings', 'drop', 'sterling silver'],
    in_stock: true,
    stock_quantity: 5,
    status: 'active',
    images: [
      { id: 'img-004-1', product_id: 'prod-004', url: '', alt: 'Royston turquoise drop earrings', is_primary: true, position: 0 },
    ],
    variants: [],
    rating: 4.9,
    review_count: 29,
    badge: 'Bestseller',
    created_at: '2024-03-01T10:00:00Z',
  },
  {
    id: 'prod-005',
    name: 'Santo Domingo Heishi Shell Necklace with Turquoise',
    slug: 'santo-domingo-heishi-shell-necklace',
    description: 'Traditional heishi shell necklace crafted by Santo Domingo Pueblo artisans. Hundreds of hand-ground shell discs strung with genuine turquoise nuggets in the classic style. A sacred form of jewelry-making passed down through generations. Length 30".',
    category_id: 'cat-1',
    category: CATEGORIES[0],
    source_price: 495,
    price: 470.25,
    sku: 'NAJ-NK-005',
    tags: ['santo domingo', 'heishi', 'shell', 'necklace', 'turquoise', 'pueblo'],
    in_stock: true,
    stock_quantity: 2,
    status: 'active',
    images: [
      { id: 'img-005-1', product_id: 'prod-005', url: '', alt: 'Heishi shell necklace', is_primary: true, position: 0 },
    ],
    variants: [],
    rating: 5.0,
    review_count: 12,
    badge: 'Low Stock',
    created_at: '2024-02-05T10:00:00Z',
  },
  {
    id: 'prod-006',
    name: 'Hopi Overlay Silver Bracelet',
    slug: 'hopi-overlay-silver-bracelet',
    description: 'Classic Hopi overlay technique: two layers of sterling silver with the top layer cut with traditional Hopi clan symbols — the eagle, bear, and sun. The cut-away areas reveal oxidized silver beneath, creating striking contrast. A wearable piece of Hopi cosmology.',
    category_id: 'cat-3',
    category: CATEGORIES[2],
    source_price: 375,
    price: 356.25,
    sku: 'NAJ-BR-006',
    tags: ['hopi', 'overlay', 'bracelet', 'sterling silver', 'clan symbols'],
    in_stock: true,
    stock_quantity: 4,
    status: 'active',
    images: [
      { id: 'img-006-1', product_id: 'prod-006', url: '', alt: 'Hopi overlay bracelet', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-006-1', product_id: 'prod-006', name: 'Width', value: '3/4"', price_modifier: 0, stock_quantity: 2 },
      { id: 'var-006-2', product_id: 'prod-006', name: 'Width', value: '1"', price_modifier: 25, stock_quantity: 2 },
    ],
    rating: 4.8,
    review_count: 15,
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 'prod-007',
    name: 'Bisbee Turquoise Cluster Ring',
    slug: 'bisbee-turquoise-cluster-ring',
    description: 'Bisbee turquoise — the most collectible of all American turquoise — in a stunning cluster setting. Deep cobalt blue with distinctive chocolatey-brown matrix. The silver setting features hand-applied rope and bead work around each stone. Substantial weight at 32g.',
    category_id: 'cat-2',
    category: CATEGORIES[1],
    source_price: 725,
    price: 688.75,
    sku: 'NAJ-RG-007',
    tags: ['bisbee', 'turquoise', 'cluster', 'ring', 'collectible'],
    in_stock: true,
    stock_quantity: 1,
    status: 'active',
    images: [
      { id: 'img-007-1', product_id: 'prod-007', url: '', alt: 'Bisbee turquoise cluster ring', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-007-1', product_id: 'prod-007', name: 'Ring Size', value: '7', price_modifier: 0, stock_quantity: 1 },
    ],
    rating: 4.9,
    review_count: 8,
    badge: 'Low Stock',
    created_at: '2024-03-10T10:00:00Z',
  },
  {
    id: 'prod-008',
    name: 'Navajo Concho Belt — Full Set 9 Conchos',
    slug: 'navajo-concho-belt-full-set',
    description: 'A magnificent full concho belt with nine hand-stamped sterling silver conchos, each 3" in diameter. The belt features a traditional butterfly center concho and sunburst end caps. Fits 30"–40" waist on genuine leather strap. A statement heirloom piece.',
    category_id: 'cat-5',
    category: CATEGORIES[4],
    source_price: 1250,
    price: 1187.50,
    sku: 'NAJ-CB-008',
    tags: ['navajo', 'concho belt', 'sterling silver', 'stamped', 'belt'],
    in_stock: true,
    stock_quantity: 2,
    status: 'active',
    images: [
      { id: 'img-008-1', product_id: 'prod-008', url: '', alt: 'Navajo concho belt full view', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-008-1', product_id: 'prod-008', name: 'Strap Color', value: 'Tan Leather', price_modifier: 0, stock_quantity: 1 },
      { id: 'var-008-2', product_id: 'prod-008', name: 'Strap Color', value: 'Dark Brown Leather', price_modifier: 0, stock_quantity: 1 },
    ],
    rating: 5.0,
    review_count: 6,
    badge: 'Bestseller',
    created_at: '2024-02-14T10:00:00Z',
  },
  {
    id: 'prod-009',
    name: 'Carico Lake Turquoise Pendant Necklace',
    slug: 'carico-lake-turquoise-pendant-necklace',
    description: 'Rare Carico Lake turquoise from the legendary Nevada mine — known for its vivid apple-green color unique among turquoise varieties. Set in a hand-fabricated sterling bezel with a 20" box chain. The stone measures 30 x 22mm.',
    category_id: 'cat-1',
    category: CATEGORIES[0],
    source_price: 385,
    price: 365.75,
    sku: 'NAJ-NK-009',
    tags: ['carico lake', 'turquoise', 'pendant', 'necklace', 'green turquoise'],
    in_stock: true,
    stock_quantity: 3,
    status: 'active',
    images: [
      { id: 'img-009-1', product_id: 'prod-009', url: '', alt: 'Carico lake turquoise pendant', is_primary: true, position: 0 },
    ],
    variants: [],
    rating: 4.7,
    review_count: 19,
    badge: 'New',
    created_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 'prod-010',
    name: 'Navajo Pearl Bench Bead Necklace',
    slug: 'navajo-pearl-bench-bead-necklace',
    description: 'Hand-fabricated Navajo pearl necklace — each silver bead individually formed, domed, and polished by hand before stringing. The graduated center bead design is a Navajo classic. Sterling silver toggle clasp. 24" length with 116 hand-made beads.',
    category_id: 'cat-1',
    category: CATEGORIES[0],
    source_price: 520,
    price: 494.00,
    sku: 'NAJ-NK-010',
    tags: ['navajo', 'pearls', 'bench beads', 'sterling silver', 'necklace'],
    in_stock: true,
    stock_quantity: 4,
    status: 'active',
    images: [
      { id: 'img-010-1', product_id: 'prod-010', url: '', alt: 'Navajo bench bead pearl necklace', is_primary: true, position: 0 },
    ],
    variants: [],
    rating: 4.8,
    review_count: 22,
    created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 'prod-011',
    name: 'Apache Tears Obsidian & Silver Bracelet',
    slug: 'apache-tears-obsidian-silver-bracelet',
    description: 'Natural Apache Tears obsidian — smooth, translucent nodules formed by volcanic activity — set in sterling silver links. These stones hold deep cultural significance in Apache tradition. Each stone glows with a beautiful smoke-grey translucence when held to light.',
    category_id: 'cat-3',
    category: CATEGORIES[2],
    source_price: 228,
    price: 216.60,
    sku: 'NAJ-BR-011',
    tags: ['apache tears', 'obsidian', 'bracelet', 'sterling silver'],
    in_stock: true,
    stock_quantity: 7,
    status: 'active',
    images: [
      { id: 'img-011-1', product_id: 'prod-011', url: '', alt: 'Apache tears obsidian bracelet', is_primary: true, position: 0 },
    ],
    variants: [
      { id: 'var-011-1', product_id: 'prod-011', name: 'Length', value: '7"', price_modifier: 0, stock_quantity: 3 },
      { id: 'var-011-2', product_id: 'prod-011', name: 'Length', value: '7.5"', price_modifier: 0, stock_quantity: 4 },
    ],
    rating: 4.6,
    review_count: 31,
    created_at: '2024-02-28T10:00:00Z',
  },
  {
    id: 'prod-012',
    name: 'Acoma Pueblo Fine-Line Pottery Earrings',
    slug: 'acoma-pueblo-fine-line-pottery-earrings',
    description: 'Tiny discs of hand-painted Acoma pottery set in sterling silver ear wires. The fine-line geometric designs — painted with a single yucca-leaf brush — are a hallmark of Acoma style. Diameter 12mm. Lightweight at just 2g per pair.',
    category_id: 'cat-4',
    category: CATEGORIES[3],
    source_price: 195,
    price: 185.25,
    sku: 'NAJ-ER-012',
    tags: ['acoma', 'pueblo', 'pottery', 'earrings', 'fine-line'],
    in_stock: true,
    stock_quantity: 9,
    status: 'active',
    images: [
      { id: 'img-012-1', product_id: 'prod-012', url: '', alt: 'Acoma pottery disc earrings', is_primary: true, position: 0 },
    ],
    variants: [],
    rating: 4.5,
    review_count: 44,
    badge: 'New',
    created_at: '2024-03-20T10:00:00Z',
  },
];

export const SHIPPING_RATES: ShippingRate[] = [
  { id: 'ship-1', zone: 'usa',           method: 'standard', label: 'Standard Shipping (USA)',           rate: 15, free_threshold: 400, est_days_min: 5, est_days_max: 8 },
  { id: 'ship-2', zone: 'usa',           method: 'express',  label: 'Express Shipping (USA)',            rate: 25, free_threshold: undefined, est_days_min: 2, est_days_max: 4 },
  { id: 'ship-3', zone: 'international', method: 'standard', label: 'Standard Shipping (International)', rate: 35, free_threshold: undefined, est_days_min: 10, est_days_max: 21 },
  { id: 'ship-4', zone: 'international', method: 'express',  label: 'Express Shipping (International)',  rate: 55, free_threshold: undefined, est_days_min: 5, est_days_max: 10 },
];

// ─── Product query helpers ────────────────────────────────
export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  const cat = CATEGORIES.find((c) => c.slug === categorySlug);
  if (!cat) return [];
  return PRODUCTS.filter((p) => p.category_id === cat.id && p.status === 'active');
}

export function getFeaturedProducts(limit = 4): Product[] {
  return PRODUCTS
    .filter((p) => p.status === 'active' && (p.badge === 'Bestseller' || (p.review_count ?? 0) > 15))
    .sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0))
    .slice(0, limit);
}

export function getNewArrivals(limit = 4, excludeIds: string[] = []): Product[] {
  const pool = PRODUCTS.filter((p) => p.status === 'active');
  return pickDailyRandomProducts(pool, limit, excludeIds);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return PRODUCTS.filter(
    (p) =>
      p.status === 'active' &&
      (p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)))
  );
}
