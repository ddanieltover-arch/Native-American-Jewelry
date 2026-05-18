'use client';

import { PageHeader, Card } from '@/components/admin/ui';
import { useAdminApi } from '@/lib/use-admin-api';
import type { AdminUser } from '@/types';

export default function SettingsPage() {
  const { data: me, loading } = useAdminApi<AdminUser>('/api/admin/me');

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Settings" subtitle="Account and environment" />

      <Card title="Your account">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : me ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{me.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Role</dt>
              <dd className="font-medium text-gray-900 capitalize">{me.role.replace('_', ' ')}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-red-600">Could not load profile</p>
        )}
      </Card>

      <Card title="Production checklist">
        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
          <li>Vercel env: <code className="text-xs bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
          <li>Vercel env: <code className="text-xs bg-gray-100 px-1 rounded">SCRAPER_SERVICE_URL</code> + <code className="text-xs bg-gray-100 px-1 rounded">SCRAPER_API_KEY</code></li>
          <li>Render: scraper API + worker + Redis</li>
        </ul>
      </Card>
    </div>
  );
}
