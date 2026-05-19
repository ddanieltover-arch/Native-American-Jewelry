import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const LOGO_SRC = '/logo.png';
/** Wide wordmark — header only */
export const HEADER_LOGO_SRC = '/header-logo.png';
export const LOGO_ALT =
  'Native American Jewelry — Handcrafted Heritage Spirit';

type LogoProps = {
  className?: string;
  /** Max height in pixels */
  height?: number;
  href?: string | null;
  priority?: boolean;
  /** Header: knock out white PNG background on light/parchment nav */
  variant?: 'default' | 'header' | 'on-dark';
  /** @deprecated use variant="on-dark" */
  onDark?: boolean;
};

export default function Logo({
  className,
  height = 56,
  href = '/',
  priority = false,
  variant = 'default',
  onDark = false,
}: LogoProps) {
  const resolvedVariant = onDark ? 'on-dark' : variant;
  const isHeader = resolvedVariant === 'header';
  const src = isHeader ? HEADER_LOGO_SRC : LOGO_SRC;
  // Wide horizontal wordmark (~5.2:1) vs stacked emblem (~2.4:1)
  const width = Math.round(height * (isHeader ? 5.2 : 2.4));

  const image = (
    <Image
      src={src}
      alt={LOGO_ALT}
      width={width}
      height={height}
      priority={priority}
      className={cn(
        'w-auto object-contain bg-transparent',
        isHeader && 'mix-blend-multiply',
        resolvedVariant === 'on-dark' && 'rounded-sm bg-white/95 px-2 py-1',
        className
      )}
      style={{ height, width: 'auto', maxWidth: isHeader ? 'min(100vw - 8rem, 320px)' : width }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0" aria-label={LOGO_ALT}>
        {image}
      </Link>
    );
  }

  return image;
}
