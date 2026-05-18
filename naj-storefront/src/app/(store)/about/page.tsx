import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Our Story | Native American Jewelry',
  description:
    'Learn about our commitment to authentic Southwest jewelry handcrafted by Navajo, Zuni, Hopi, and Pueblo artisans.',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <span className="text-label text-brand-turquoise">Our Story</span>
      <h1
        className="text-heading-xl text-brand-obsidian mt-2 mb-8"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Jewelry of the Southwest
      </h1>
      <div className="prose prose-stone max-w-none space-y-6 text-brand-obsidian/85" style={{ fontFamily: 'var(--font-body)' }}>
        <p>
          Native American Jewelry curates authentic pieces handcrafted by master artisans from Navajo,
          Zuni, Hopi, and Pueblo nations. Every item in our collection is selected for quality,
          traditional technique, and lasting beauty.
        </p>
        <p>
          We work directly with artists and trusted sources across the Southwest. Each piece over $150
          includes documentation of authenticity and careful packaging for collectors worldwide.
        </p>
        <p>
          Our checkout uses secure manual payment methods — Chime, CashApp, Apple Cash, Zelle, and bank
          transfer — with personal verification before your order ships.
        </p>
      </div>
      <Link href="/shop" className="btn-turquoise inline-flex items-center gap-2 mt-10 text-sm">
        Shop the Collection <ArrowRight size={16} />
      </Link>
    </div>
  );
}
