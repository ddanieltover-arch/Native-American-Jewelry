import Link from 'next/link';
import { Instagram, Facebook, Youtube } from 'lucide-react';

const FOOTER_LINKS = {
  Shop: [
    { label: 'All Jewelry',   href: '/shop' },
    { label: 'Necklaces',     href: '/shop?category=necklaces' },
    { label: 'Rings',         href: '/shop?category=rings' },
    { label: 'Bracelets',     href: '/shop?category=bracelets' },
    { label: 'Earrings',      href: '/shop?category=earrings' },
    { label: 'Concho Belts',  href: '/shop?category=concho-belts' },
  ],
  'Customer Care': [
    { label: 'How to Order',      href: '/how-to-order' },
    { label: 'Payment Methods',   href: '/payment-methods' },
    { label: 'Shipping & Returns',href: '/shipping' },
    { label: 'Jewelry Care',      href: '/jewelry-care' },
    { label: 'Contact Us',        href: '/contact' },
    { label: 'FAQ',               href: '/faq' },
  ],
  About: [
    { label: 'Our Story',           href: '/about' },
    { label: 'Authenticity',        href: '/authenticity' },
    { label: 'The Artists',         href: '/artists' },
    { label: 'Blog',                href: '/blog' },
    { label: 'Privacy Policy',      href: '/privacy' },
    { label: 'Terms of Service',    href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-brand-obsidian text-brand-bone pb-20 md:pb-0">
      {/* Top band */}
      <div className="border-b border-white/10 py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p
              className="text-2xl font-light tracking-wide text-brand-bone"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Native American Jewelry
            </p>
            <p className="text-xs tracking-[0.2em] text-brand-sand mt-1 uppercase">
              Authentic · Handcrafted · Traditional
            </p>
          </div>

          {/* Newsletter */}
          <form className="flex w-full max-w-md gap-0">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-white/10 border border-white/20 px-4 py-3 text-sm text-brand-bone placeholder:text-brand-sand/60 focus:outline-none focus:border-brand-turquoise transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <button
              type="submit"
              className="bg-brand-turquoise text-white px-5 py-3 text-xs font-medium tracking-widest uppercase hover:bg-brand-teal transition-colors whitespace-nowrap"
              style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.12em' }}
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main footer links */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1">
          <p className="text-brand-sand text-xs leading-relaxed mb-6">
            We partner directly with Navajo, Zuni, Hopi, and Pueblo artisans to bring authentic,
            handcrafted jewelry to collectors worldwide. Every piece comes with a certificate
            of authenticity.
          </p>
          <div className="flex gap-4">
            {[Instagram, Facebook, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-8 h-8 border border-white/20 flex items-center justify-center text-brand-sand hover:border-brand-turquoise hover:text-brand-turquoise transition-colors"
              >
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <h4
              className="text-[10px] font-medium tracking-[0.18em] uppercase text-brand-sand mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {heading}
            </h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-brand-bone/70 hover:text-brand-turquoise transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-4 md:px-8 py-4 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-brand-bone/40" style={{ fontFamily: 'var(--font-body)' }}>
          © {new Date().getFullYear()} Native American Jewelry. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          {['Chime', 'CashApp', 'Zelle', 'Apple Pay', 'Bank Transfer'].map((method) => (
            <span
              key={method}
              className="text-[10px] text-brand-bone/40 border border-white/10 px-2 py-0.5 rounded"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {method}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
