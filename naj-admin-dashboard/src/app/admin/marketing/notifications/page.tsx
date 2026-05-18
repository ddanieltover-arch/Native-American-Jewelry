'use client';

import { useState } from 'react';
import { Bell, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Button, Input, Textarea } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import type { SalesNotificationConfig } from '@/types';

export default function NotificationsPage() {
  const [config, setConfig] = useState<SalesNotificationConfig>(MOCK_NOTIFICATIONS[0]);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Notification settings saved');
    setLoading(false);
  };

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
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Show purchase notifications to visitors</p>
            </div>
            <button
              onClick={() => setConfig((p) => ({ ...p, active: !p.active }))}
              className={cn(
                'relative inline-flex h-6 w-11 rounded-full transition-colors',
                config.active ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                config.active ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* Template */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Message Template</label>
            <Textarea
              rows={2}
              value={config.text_template}
              onChange={(e) => setConfig((p) => ({ ...p, text_template: e.target.value }))}
              placeholder="Someone in {state} just purchased {product}"
            />
            <p className="text-xs text-gray-400 mt-1">
              Available variables: <code className="bg-gray-100 px-1 rounded">{'{state}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{product}'}</code>
            </p>
          </div>

          {/* Interval */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Interval (seconds)"
              type="number"
              value={config.interval_min_sec}
              onChange={(e) => setConfig((p) => ({ ...p, interval_min_sec: parseInt(e.target.value) || 30 }))}
            />
            <Input
              label="Max Interval (seconds)"
              type="number"
              value={config.interval_max_sec}
              onChange={(e) => setConfig((p) => ({ ...p, interval_max_sec: parseInt(e.target.value) || 90 }))}
            />
          </div>
          <p className="text-xs text-gray-400 -mt-3">
            Popups will appear randomly between these intervals. Recommended: 30–90 seconds.
          </p>

          {/* Preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
            <div className="inline-flex items-start gap-3 bg-gray-900 text-white rounded-xl shadow-lg p-3 max-w-xs">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">💍</span>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Someone in <span className="text-gray-300 font-medium">Texas</span></p>
                <p className="text-[12px] text-white font-medium leading-tight mt-0.5">
                  just purchased <span className="text-teal-400">Turquoise Squash Blossom Necklace</span>
                </p>
              </div>
            </div>
          </div>

          <Button loading={loading} onClick={save}>
            <Save size={14} /> Save Settings
          </Button>
        </div>
      </Card>

      <Card title="How it works">
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>Notifications appear on desktop (bottom-left) and mobile (bottom-center)</li>
          <li>Product names are randomly pulled from your active product catalog</li>
          <li>US states are randomly selected from all 50 states</li>
          <li>Each popup auto-dismisses after 5 seconds with a progress bar</li>
          <li>Visitors can dismiss popups manually with the × button</li>
        </ul>
      </Card>
    </div>
  );
}
