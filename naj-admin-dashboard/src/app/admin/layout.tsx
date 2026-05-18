import AdminShell from '@/components/admin/layout/AdminShell';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
