'use client';

import { useEffect, useState } from 'react';
import { Bell, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Button, Input, Textarea } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { adminPatch, useAdminApi } from '@/lib/use-admin-api';
import type { SalesNotificationConfig } from '@/types';

export default function NotificationsPage() {
  const { data: loaded, loading, refetch } = useAdminApi<SalesNotificationConfig | null>(
    '/api/admin/notifications'
  );
  const [config, setConfig] = useState<SalesNotificationConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) setConfig(loaded);
  }, [loaded]);

  const save = async () => {
    if (!config?.id) return;
    setSaving(true);
    try {
      await adminPatch('/api/admin/notifications', {
        id: config.id,
        text_template: config.text_template,
        active: config.active,
        interval_min_sec: config.interval_min_sec,
        interval_max_sec: config.interval_max_sec,
      });
      toast.success('Notification settings saved');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <p className="text-sm text-gray-500 p-8">Loading notification settings…</p>;
  }

  const preview = config.text_template
    .replace('{state}', 'Texas')
    .replace('{product}', 'Turquoise Squash Blossom Necklace');

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Sales Notifications"
        subtitle="Configure the social proof popup shown to visitors"
      />

      <Card title="Popup Settings">
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Show purchase notifications to visitors</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig((p) => p ? { ...p, active: !p.active } : p)}
              className={cn(
                'relative inline-flex h-6 w-11 rounded-full transition-colors',
                config.active ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  config.active ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Message Template</label>
            <Textarea
              rows={2}
              value={config.text_template}
              onChange={(e) => setConfig((p) => p ? { ...p, text_template: e.target.value } : p)}
              placeholder="Someone in {state} just purchased {product}"
            />
            <p className="text-xs text-gray-400 mt-1">Use {'{state}'} and {'{product}'} placeholders</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min interval (sec)"
              type="number"
              min={10}
              value={config.interval_min_sec}
              onChange={(e) =>
                setConfig((p) => p ? { ...p, interval_min_sec: parseInt(e.target.value, 10) } : p)
              }
            />
            <Input
              label="Max interval (sec)"
              type="number"
              min={10}
              value={config.interval_max_sec}
              onChange={(e) =>
                setConfig((p) => p ? { ...p, interval_max_sec: parseInt(e.target.value, 10) } : p)
              }
            />
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
              <Bell size={12} /> Preview
            </p>
            <p className="text-sm text-amber-900">{preview}</p>
          </div>

          <Button loading={saving} onClick={save}>
            <Save size={14} /> Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
