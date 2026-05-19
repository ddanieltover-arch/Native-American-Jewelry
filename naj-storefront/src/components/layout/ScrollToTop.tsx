'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Scroll to top on route or query changes (client navigations keep scroll without this). */
export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  return null;
}
