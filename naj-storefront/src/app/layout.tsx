import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '@/styles/globals.css';
import { Toaster } from 'sonner';
import ScrollToTop from '@/components/layout/ScrollToTop';

export const metadata: Metadata = {
  title: {
    default: 'Native American Jewelry — Authentic Handcrafted Pieces',
    template: '%s | Native American Jewelry',
  },
  description:
    'Authentic Native American jewelry handcrafted by Navajo, Zuni, Hopi, and Pueblo artisans. Turquoise, sterling silver, and traditional designs. Free shipping on US orders over $400.',
  keywords: [
    'native american jewelry',
    'navajo jewelry',
    'zuni jewelry',
    'hopi jewelry',
    'turquoise jewelry',
    'sterling silver',
    'authentic handcrafted',
    'squash blossom necklace',
    'concho belt',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Native American Jewelry',
    title: 'Native American Jewelry — Authentic Handcrafted Pieces',
    description:
      'Authentic handcrafted jewelry by Navajo, Zuni, Hopi & Pueblo artisans.',
    images: [
      {
        url: '/images/hero-main.png',
        width: 1920,
        height: 1080,
        alt: 'Native American Jewelry — handcrafted heritage and turquoise collection',
      },
    ],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  ),
};

export const viewport: Viewport = {
  themeColor: '#0e0c0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1c1916',
              color: '#f0e8d8',
              border: '1px solid rgba(200,151,58,0.3)',
              fontFamily: 'Jost, sans-serif',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}
