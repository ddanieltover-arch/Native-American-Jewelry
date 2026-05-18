import type { Metadata } from 'next';
import AdminShell from '@/components/admin/layout/AdminShell';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: 'Admin — Native American Jewelry', template: '%s | NAJ Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
