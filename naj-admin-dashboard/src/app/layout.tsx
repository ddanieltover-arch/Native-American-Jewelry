import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Admin — Native American Jewelry', template: '%s | NAJ Admin' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
