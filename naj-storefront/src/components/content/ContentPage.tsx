import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ContentSection } from '@/lib/site-content';

type ContentPageProps = {
  title: string;
  subtitle?: string;
  sections: ContentSection[];
  relatedLinks?: { label: string; href: string }[];
};

export default function ContentPage({
  title,
  subtitle,
  sections,
  relatedLinks,
}: ContentPageProps) {
  return (
    <div className="bg-brand-parchment min-h-screen">
      <div className="bg-brand-obsidian text-brand-bone py-14 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-brand-sand/70 hover:text-brand-turquoise transition-colors mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
          <span className="text-label text-brand-turquoise block mb-2">Native American Jewelry</span>
          <h1
            className="text-heading-xl text-brand-bone"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-brand-sand/80 mt-3 text-sm leading-relaxed max-w-2xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 md:px-8 py-14">
        <div className="space-y-10" style={{ fontFamily: 'var(--font-body)' }}>
          {sections.map((section) => (
            <section key={section.heading} id={section.id}>
              <h2
                className="text-lg font-medium text-brand-obsidian mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {section.heading}
              </h2>
              {section.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-brand-obsidian/80 text-sm leading-relaxed mb-3 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item) => (
                    <li
                      key={item}
                      className="text-sm text-brand-obsidian/80 leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-brand-turquoise"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {relatedLinks && relatedLinks.length > 0 && (
          <div className="mt-14 pt-8 border-t border-brand-sand/40">
            <p className="text-label text-brand-turquoise mb-4">Related</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-sienna hover:text-brand-turquoise transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}
