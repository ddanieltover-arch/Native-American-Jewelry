import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1
        className="text-heading-lg text-brand-obsidian mb-2 text-center"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm text-brand-sienna mb-6">{subtitle}</p>
      ) : (
        <div className="mb-6" />
      )}
      {children}
      {footer ?? (
        <p className="text-sm text-brand-sienna mt-6 text-center">
          <Link href="/shop" className="hover:text-brand-turquoise">
            Continue shopping
          </Link>
        </p>
      )}
    </div>
  );
}
