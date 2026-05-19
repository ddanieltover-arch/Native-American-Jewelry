import type { Metadata } from 'next';

export type ContentSection = {
  heading: string;
  id?: string;
  body: string[];
  list?: string[];
};

export type ContentSlug =
  | 'how-to-order'
  | 'payment-methods'
  | 'shipping'
  | 'jewelry-care'
  | 'faq'
  | 'authenticity'
  | 'artists'
  | 'privacy'
  | 'terms'
  | 'layaway'
  | 'promotions'
  | 'wholesale';

type PageContent = {
  title: string;
  description: string;
  subtitle?: string;
  sections: ContentSection[];
  relatedLinks?: { label: string; href: string }[];
};

export const SITE_CONTENT: Record<ContentSlug, PageContent> = {
  'how-to-order': {
    title: 'How to Order',
    description:
      'Step-by-step guide to shopping authentic Native American jewelry online — browse, checkout, pay, and receive your handcrafted pieces.',
    subtitle:
      'Shopping with us is simple. Browse our curated collection, complete checkout, and we will guide you through secure payment and shipping — the same thoughtful experience collectors expect from premier Southwest jewelers.',
    sections: [
      {
        heading: '1. Browse the collection',
        body: [
          'Explore necklaces, rings, bracelets, earrings, and concho belts organized by category. Each listing includes materials, dimensions, artist attribution when available, and high-resolution photos so you can shop with confidence.',
          'Use filters to sort by price, category, or newest arrivals. Create an account to save your wishlist and track orders.',
        ],
      },
      {
        heading: '2. Add to cart & review',
        body: [
          'Add pieces you love to your cart. Review quantities and totals before proceeding to checkout. Shipping is calculated at checkout; free standard shipping applies to qualifying US orders.',
        ],
      },
      {
        heading: '3. Checkout & payment',
        body: [
          'Enter your shipping address and choose your preferred payment method. We accept Chime, CashApp, Apple Cash, Zelle, and bank transfer. Your order is confirmed immediately when you place it.',
          'A member of our team will contact you as soon as possible with secure payment instructions. Please wait for our message before sending payment. Once we receive your payment, we prepare your piece for shipment.',
        ],
      },
      {
        heading: '4. Order confirmation & shipping',
        body: [
          'You will receive email updates when your payment is verified and when your order ships, including tracking when available. Pieces over $150 include a certificate of authenticity in premium branded packaging.',
        ],
      },
      {
        heading: 'Need help before you buy?',
        body: [
          'We are happy to answer questions about sizing, stone type, or a specific piece. Contact us before ordering and we will help you find the right treasure for your collection.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Payment Methods', href: '/payment-methods' },
      { label: 'Shipping & Returns', href: '/shipping' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },

  'payment-methods': {
    title: 'Payment Methods',
    description:
      'Pay securely with Chime, CashApp, Apple Cash, Zelle, or bank transfer. Our team contacts you with payment details after checkout.',
    subtitle:
      'We use trusted peer-to-peer and bank payment methods for a secure, personal checkout experience. Your order is confirmed immediately — our team reaches out as soon as possible with payment instructions.',
    sections: [
      {
        heading: 'Accepted methods',
        list: [
          'Chime',
          'Cash App',
          'Apple Cash',
          'Zelle',
          'Bank transfer / ACH',
        ],
        body: [],
      },
      {
        heading: 'How payment works',
        body: [
          'When you place your order, it is confirmed immediately. Select your preferred method at checkout.',
          'A member of our team will contact you as soon as possible with secure payment instructions for your order total. Please wait for our message before sending payment.',
          'Once we receive your payment, we prepare your order for shipment and send you updates by email.',
        ],
      },
      {
        heading: 'Important notes',
        body: [
          'Orders are prepared for shipment after we receive and confirm your payment.',
          'If you have questions before paying, contact us — we are happy to help.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'How to Order', href: '/how-to-order' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },

  shipping: {
    title: 'Shipping & Returns',
    description:
      'Shipping timelines, free shipping thresholds, return and exchange policy for Native American Jewelry orders.',
    subtitle:
      'We pack every piece with care — inspired by the same attention to detail collectors appreciate at leading Southwest jewelry destinations.',
    sections: [
      {
        heading: 'Shipping times',
        id: 'shipping',
        body: [
          'In-stock orders are processed and shipped within 3–5 business days after payment verification. Delivery typically adds 3–7 business days depending on your location and carrier service.',
          'You will receive a shipping confirmation email with tracking when your package leaves our facility. Most US customers receive orders within 5–10 business days of payment confirmation.',
        ],
      },
      {
        heading: 'Shipping rates',
        body: [
          'Shipping is calculated at checkout based on weight and destination. Free standard shipping applies to qualifying US orders — see your cart for the current threshold.',
          'We are not responsible for delays caused by carriers, weather, or incorrect addresses provided at checkout. Please double-check your shipping details before placing your order.',
        ],
      },
      {
        heading: 'Returns & exchanges',
        id: 'returns',
        body: [
          'We want you to love your purchase. Unused items in original condition may be exchanged or returned for store credit within 15 days of delivery, with prior approval. Contact us to initiate a return.',
          'Returns must be shipped in a sturdy box with adequate padding. Items damaged due to insufficient return packaging may not be eligible for exchange.',
          'We do not refund original shipping charges unless the item arrived damaged or we sent the wrong piece. Sale and final-clearance items are noted at purchase and are not eligible for return or exchange.',
        ],
      },
      {
        heading: 'Damaged or incorrect items',
        body: [
          'If your order arrives damaged, photograph the packaging and piece and contact us within 24 hours of delivery. We will work with you on replacement, repair, or store credit as appropriate.',
          'One-of-a-kind and vintage pieces are sold in as-is condition; damage claims must be reported promptly with photos.',
        ],
      },
      {
        heading: 'Order cancellations',
        body: [
          'Request to cancel an order within 30 minutes of placement by contacting us immediately. After payment verification or shipment, standard return policies apply.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'How to Order', href: '/how-to-order' },
      { label: 'Jewelry Care', href: '/jewelry-care' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },

  'jewelry-care': {
    title: 'Jewelry Care',
    description:
      'How to care for sterling silver, turquoise, and handcrafted Native American jewelry so it lasts for generations.',
    subtitle:
      'Handcrafted turquoise and sterling silver deserve gentle care. Follow these guidelines to keep your pieces looking their best for years to come.',
    sections: [
      {
        heading: 'Daily wear',
        body: [
          'Put jewelry on last — after lotion, perfume, and hairspray. Remove pieces before swimming, showering, exercising, or cleaning. Chemicals and chlorine can dull silver and affect porous stones like turquoise.',
        ],
      },
      {
        heading: 'Cleaning sterling silver',
        body: [
          'Gently polish with a soft, lint-free cloth. For heavier tarnish, use a silver polishing cloth designed for jewelry — avoid harsh dips on pieces with stones, inlay, or patina the artist intended to keep.',
          'Never use ultrasonic cleaners on turquoise, coral, shell, or soft stones unless a jeweler confirms it is safe for that specific piece.',
        ],
      },
      {
        heading: 'Turquoise & natural stones',
        body: [
          'Turquoise is porous. Keep it away from prolonged water exposure, oils, and household cleaners. Store separately from harder gemstones that might scratch it.',
          'Natural matrix and color variation are part of each stone\'s character — they are not defects.',
        ],
      },
      {
        heading: 'Storage',
        list: [
          'Store pieces in a cool, dry place — ideally in the pouch or box we provide.',
          'Fasten clasps and lay necklaces flat to prevent kinks and tangles.',
          'Keep silver away from rubber bands and certain foams that accelerate tarnish.',
        ],
        body: [],
      },
      {
        heading: 'Professional maintenance',
        body: [
          'For sizing, stone tightening, or significant repair, contact a jeweler experienced with Native American and Southwestern work. We can often recommend approaches for pieces purchased from us.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Authenticity', href: '/authenticity' },
      { label: 'FAQ', href: '/faq' },
    ],
  },

  faq: {
    title: 'Frequently Asked Questions',
    description:
      'Answers about ordering, payments, shipping, authenticity, and caring for Native American jewelry.',
    sections: [
      {
        heading: 'Ordering & payment',
        list: [
          'How do I place an order? — Browse the shop, add items to your cart, and complete checkout. See How to Order for details.',
          'When is my order confirmed? — Immediately when you place it. Our team then contacts you with payment instructions.',
          'Can I change or cancel my order? — Contact us within 30 minutes of placing it. After that, cancellation depends on fulfillment status.',
          'Do you offer layaway? — We do not currently offer traditional layaway. See our Layaway Policy for details.',
        ],
        body: [],
      },
      {
        heading: 'Products & authenticity',
        list: [
          'Is every piece authentic Native American jewelry? — We source from Navajo, Zuni, Hopi, and Pueblo artisans and trusted Southwest suppliers. See Authenticity for our standards.',
          'Do pieces include certificates? — Orders over $150 include a certificate of authenticity with premium packaging.',
          'Can I request more photos? — Yes. Contact us with the product name or SKU and we will gladly provide additional images.',
        ],
        body: [],
      },
      {
        heading: 'Shipping & returns',
        list: [
          'How long does shipping take? — Typically 5–10 business days in the US after payment verification. See Shipping & Returns.',
          'Do you ship internationally? — Contact us for international shipping options and rates.',
          'What is your return policy? — Exchanges and store credit within 15 days with approval; see Shipping & Returns for full terms.',
        ],
        body: [],
      },
      {
        heading: 'Still have questions?',
        body: [
          'We are here to help collectors find the right piece. Reach out via our Contact page and we will respond within one to two business days.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'How to Order', href: '/how-to-order' },
    ],
  },

  authenticity: {
    title: 'Authenticity',
    description:
      'Our commitment to authentic Native American jewelry, artisan partnerships, and certificates of authenticity.',
    subtitle:
      'Genuine turquoise, sterling silver, and traditional craftsmanship — the same standards respected by leading collectors and curators of Southwest jewelry.',
    sections: [
      {
        heading: 'Our promise',
        body: [
          'Native American Jewelry curates pieces that reflect authentic Southwest artistry. We partner directly with Navajo, Zuni, Hopi, and Pueblo jewelers — and with trusted sources who maintain the same standards of provenance and quality.',
          'We describe materials, construction, and artist attribution accurately in every listing. When a piece is Native American made, we say so clearly; when materials or origin differ, we disclose that as well.',
        ],
      },
      {
        heading: 'Sterling silver & turquoise',
        body: [
          'Sterling silver (.925) is the foundation of most traditional Southwest jewelry. Turquoise and other natural stones vary in color, matrix, and origin — Kingman, Royston, Sonoran, White Buffalo, and more each have distinct character.',
          'We celebrate natural variation. Enhanced or stabilized stones are disclosed when relevant, following practices common among reputable Southwest retailers.',
        ],
      },
      {
        heading: 'Certificate of authenticity',
        body: [
          'Orders over $150 include a certificate of authenticity and premium branded packaging — a keepsake for your collection and documentation for insurance or gifting.',
        ],
      },
      {
        heading: 'Questions about a piece?',
        body: [
          'If you need clarification on hallmarks, artist marks, or materials before you buy, contact us. We want you to collect with confidence.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'The Artists', href: '/artists' },
      { label: 'Our Story', href: '/about' },
    ],
  },

  artists: {
    title: 'The Artists',
    description:
      'Meet the Navajo, Zuni, Hopi, and Pueblo artisans behind our handcrafted Native American jewelry collection.',
    subtitle:
      'Every squash blossom, concho cuff, and needlepoint cluster carries the hand of a master jeweler — continuing traditions that define the American Southwest.',
    sections: [
      {
        heading: 'Direct from the Southwest',
        body: [
          'Our collection features work from Navajo, Zuni, Hopi, and Pueblo silversmiths — among the most respected traditions in Native American jewelry. Techniques include hand stamping, overlay, tufa casting, stone setting, and cluster and inlay work passed down through generations.',
        ],
      },
      {
        heading: 'What you will see on our pieces',
        list: [
          'Artist hallmarks and stamps where the maker signed their work.',
          'Sterling silver construction with hand-finished detail.',
          'Natural turquoise and gemstones selected for color and character.',
          'Traditional motifs — squash blossoms, conchos, feathers, kachina figures, and geometric Zuni needlepoint.',
        ],
        body: [],
      },
      {
        heading: 'Honoring the craft',
        body: [
          'We believe in fair representation: crediting makers when known, describing origin accurately, and never misrepresenting non-Native work as Native-made.',
          'When you wear a piece from our collection, you support living artisans and the continuation of a cultural art form — not mass-produced imitations.',
        ],
      },
      {
        heading: 'Featured traditions',
        body: [
          'Navajo silversmithing brought squash blossom necklaces and heavy stamp work to the world stage. Zuni artists are renowned for fine needlepoint and petit point turquoise settings. Hopi overlay creates striking contrast in silver. Pueblo jewelers contribute distinctive stone work and design sensibilities.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Authenticity', href: '/authenticity' },
      { label: 'Shop Collection', href: '/shop' },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    description: 'How Native American Jewelry collects, uses, and protects your personal information.',
    sections: [
      {
        heading: 'Overview',
        body: [
          'Native American Jewelry operates this website and provides online shopping services. This policy explains how we collect, use, and protect your information when you use our site or place an order.',
          'By using our service, you agree to the practices described here. We do not sell your personal information to third parties.',
        ],
      },
      {
        heading: 'Information we collect',
        list: [
          'Contact details — name, email, phone, and shipping address when you order or contact us.',
          'Account information — if you create an account for order history and wishlists.',
          'Payment references — we verify manual payments (Chime, CashApp, Zelle, etc.); we do not store full bank credentials on our servers.',
          'Communications — messages you send through our contact form or email.',
        ],
        body: [],
      },
      {
        heading: 'How we use your information',
        body: [
          'We use your data to process orders, verify payments, ship purchases, send transactional emails (confirmations, shipping updates), respond to inquiries, and improve our website and service.',
          'With your consent, we may send promotional emails about new arrivals and collections. You can unsubscribe at any time.',
        ],
      },
      {
        heading: 'Cookies & analytics',
        body: [
          'Our site may use cookies and similar technologies to remember preferences, keep your cart active, and understand how visitors use the site. You can control cookies through your browser settings.',
        ],
      },
      {
        heading: 'Service providers',
        body: [
          'We work with trusted providers for hosting, email delivery, payment processing support, and analytics. They access data only to perform services on our behalf and are obligated to protect it.',
        ],
      },
      {
        heading: 'Security & children',
        body: [
          'We use commercially reasonable measures to protect your information. No internet transmission is 100% secure; please use strong passwords for your account.',
          'Our services are not directed to children under 13. We do not knowingly collect information from children under 13.',
        ],
      },
      {
        heading: 'Changes & contact',
        body: [
          'We may update this policy periodically. Continued use of the site after changes constitutes acceptance. For questions, contact us through our Contact page.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },

  terms: {
    title: 'Terms of Service',
    description: 'Terms and conditions for using the Native American Jewelry website and purchasing products.',
    sections: [
      {
        heading: 'Agreement',
        body: [
          'By accessing nativeamericanjewelry.com and placing orders, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the site.',
        ],
      },
      {
        heading: 'Products & pricing',
        body: [
          'We strive for accurate descriptions, images, and pricing. In the event of an error, we reserve the right to correct it and cancel or refund affected orders.',
          'Prices are in US dollars unless otherwise stated. Availability is subject to change; one-of-a-kind pieces are sold to the first verified buyer.',
        ],
      },
      {
        heading: 'Orders & payment',
        body: [
          'An order is not complete until payment is verified. We reserve the right to refuse or cancel orders at our discretion, including suspected fraud or policy violations.',
          'See Payment Methods and How to Order for checkout details.',
        ],
      },
      {
        heading: 'Intellectual property',
        body: [
          'Site content, logos, photography, and text are owned by Native American Jewelry or used with permission. You may not reproduce or exploit our content without written consent.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the fullest extent permitted by law, Native American Jewelry is not liable for indirect, incidental, or consequential damages arising from use of the site or products. Our liability is limited to the amount you paid for the relevant order.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These terms are governed by the laws of the United States and the state in which we operate, without regard to conflict-of-law principles.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Promotion Policy', href: '/promotions' },
    ],
  },

  layaway: {
    title: 'Layaway Policy',
    description: 'Information about layaway and payment plans for Native American Jewelry.',
    sections: [
      {
        heading: 'Current policy',
        body: [
          'We do not currently offer traditional layaway plans. This allows us to keep inventory accurate for our online catalog and ensure each handcrafted piece goes to a ready buyer without extended holds.',
        ],
      },
      {
        heading: 'Flexible payment at checkout',
        body: [
          'You may pay using Chime, CashApp, Apple Cash, Zelle, or bank transfer — whichever is most convenient. Payment instructions are sent immediately after you place your order.',
          'For significant purchases, contact us to discuss timing or split payments before checkout; we will do our best to accommodate serious collectors when possible.',
        ],
      },
      {
        heading: 'Holding a piece',
        body: [
          'If you need a short hold while arranging payment, email us with the item name and we will note your interest. Holds are discretionary and typically limited to 24–48 hours for in-demand pieces.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Payment Methods', href: '/payment-methods' },
      { label: 'How to Order', href: '/how-to-order' },
    ],
  },

  promotions: {
    title: 'Promotion Policy',
    description: 'Terms for sales, discount codes, and promotional offers at Native American Jewelry.',
    sections: [
      {
        heading: 'General terms',
        body: [
          'Unless otherwise stated, promotional discounts apply to in-stock items only, cannot be combined with other offers unless explicitly allowed, and are not valid on prior purchases.',
          'Discount codes must be applied at checkout. We cannot add codes to orders after they are placed.',
        ],
      },
      {
        heading: 'Exclusions',
        list: [
          'One-of-a-kind, vintage, and final-sale items marked as such.',
          'Custom or special-order pieces unless the promotion specifically includes them.',
          'Shipping charges unless the promotion states otherwise.',
        ],
        body: [],
      },
      {
        heading: 'Sales & clearance',
        body: [
          'Items sold at a promotional or clearance price are final sale unless damaged in shipping. See Shipping & Returns for damage claims.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'We reserve the right to modify or end promotions at any time without prior notice. Promotional terms in effect at the time of your order apply to that order.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Shop Sale Items', href: '/shop' },
    ],
  },

  wholesale: {
    title: 'Wholesale Terms',
    description: 'Wholesale and trade inquiries for Native American Jewelry retailers and partners.',
    sections: [
      {
        heading: 'Trade inquiries',
        body: [
          'We work with select boutiques, galleries, and retailers who share our commitment to authentic Native American and Southwest jewelry. Wholesale availability varies by piece and artist agreements.',
        ],
      },
      {
        heading: 'How to apply',
        body: [
          'Contact us with your business name, location, resale certificate (if applicable), and the types of pieces you are interested in carrying. Include links to your store or website when possible.',
          'Approved partners receive trade pricing on eligible catalog items and access to curated lines suited for retail display.',
        ],
      },
      {
        heading: 'Terms for partners',
        list: [
          'Minimum opening orders may apply.',
          'Payment terms are agreed per account — typically prepay or net terms for established partners.',
          'Authenticity documentation must remain with pieces when resold where applicable.',
          'We do not authorize misrepresentation of artist work or origin.',
        ],
        body: [],
      },
      {
        heading: 'Get in touch',
        body: [
          'Email us through the Contact page with the subject line "Wholesale inquiry." We respond to trade applications within three to five business days.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'The Artists', href: '/artists' },
    ],
  },
};

export function contentMetadata(slug: ContentSlug): Metadata {
  const page = SITE_CONTENT[slug];
  return {
    title: `${page.title} | Native American Jewelry`,
    description: page.description,
  };
}
