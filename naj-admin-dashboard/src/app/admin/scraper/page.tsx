'use client';

import { useState } from 'react';
import { RefreshCw, Play, Clock, CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Badge, Button, Table } from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import { formatDateTime, formatDuration, SCRAPE_STATUS_COLORS, cn } from '@/lib/utils';
import { MOCK_SCRAPE_LOGS } from '@/lib/mock-data';
import type { ScrapeLog } from '@/types';

export default function ScraperPage() {
  const [logs, setLogs]       = useState<ScrapeLog[]>(MOCK_SCRAPE_LOGS);
  const [running, setRunning] = useState(false);
  const [queueStats] = useState({
    scrape: { waiting: 0, active: 0, failed: 1 },
    image:  { waiting: 14, active: 3, failed: 0 },
    email:  { waiting: 0, active: 0 },
  });

  const triggerScrape = async () => {
    setRunning(true);
    toast.info('Scrape job dispatched — products will appear in the approval queue when done');

    // Simulate: add a running log entry
    const fakeLog: ScrapeLog = {
      id:                `log-live-${Date.now()}`,
      job_id:            `scrape-${Date.now().toString(36)}`,
      target_url:        'https://hippiecowgirlcouture.com',
      status:            'running',
      products_found:    0,
      products_filtered: 0,
      products_imported: 0,
      errors:            null,
      duration_ms:       null,
      started_at:        new Date().toISOString(),
      completed_at:      null,
    };
    setLogs((prev) => [fakeLog, ...prev]);

    // Simulate completion after 8s
    await new Promise((r) => setTimeout(r, 8000));
    setLogs((prev) =>
      prev.map((l) =>
        l.id === fakeLog.id
          ? { ...l, status: 'completed' as const, products_found: 43, products_filtered: 11, products_imported: 32, duration_ms: 198400, completed_at: new Date().toISOString() }
          : l
      )
    );
    toast.success('Scrape complete — 32 products imported to approval queue');
    setRunning(false);
  };

  const columns: Column<ScrapeLog>[] = [
    {
      key: 'started_at', label: 'Started', sortable: true,
      render: (l) => (
        <div>
          <p className="text-sm text-gray-800">{formatDateTime(l.started_at)}</p>
          <p className="text-xs text-gray-400 font-mono">{l.job_id}</p>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (l) => (
        <div className="flex items-center gap-2">
          {l.status === 'running' && <RefreshCw size={13} className="animate-spin text-blue-500" />}
          {l.status === 'completed' && <CheckCircle size={13} className="text-green-500" />}
          {l.status === 'failed' && <XCircle size={13} className="text-red-500" />}
          {l.status === 'partial' && <AlertCircle size={13} className="text-amber-500" />}
          <Badge className={SCRAPE_STATUS_COLORS[l.status]}>
            {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'products_found', label: 'Found',
      render: (l) => <span className="text-sm text-gray-700">{l.products_found}</span>,
    },
    {
      key: 'products_imported', label: 'Imported',
      render: (l) => <span className="text-sm font-semibold text-green-700">{l.products_imported}</span>,
    },
    {
      key: 'products_filtered', label: 'Filtered',
      render: (l) => <span className="text-sm text-gray-400">{l.products_filtered}</span>,
    },
    {
      key: 'errors', label: 'Errors',
      render: (l) => (
        <span className={cn('text-sm', l.errors?.length ? 'text-red-500 font-medium' : 'text-gray-300')}>
          {l.errors?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'duration_ms', label: 'Duration',
      render: (l) => (
        <span className="text-xs text-gray-500 font-mono">
          {l.duration_ms ? formatDuration(l.duration_ms) : l.status === 'running' ? '…' : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scraper Control"
        subtitle="Manage automated product scraping from the reference site"
      />

      {/* Control panel */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Manual trigger */}
        <Card title="Manual Scrape">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {[
                ['Target URL', 'hippiecowgirlcouture.com'],
                ['Min Price',  '$150.00 USD'],
                ['Discount',   '5% applied on import'],
                ['Schedule',   'Daily at 3:00 AM UTC'],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Triggering a scrape will crawl the target site, filter products by price, apply the 5% discount,
              and save new products to the approval queue with <strong>status: pending</strong>. Existing products are skipped.
            </p>

            <Button
              className="w-full"
              loading={running}
              onClick={triggerScrape}
              disabled={running}
            >
              {running ? (
                <><RefreshCw size={15} className="animate-spin" /> Scraping in progress…</>
              ) : (
                <><Play size={15} /> Trigger Scrape Now</>
              )}
            </Button>
          </div>
        </Card>

        {/* Queue health */}
        <Card title="Queue Health">
          <div className="space-y-3">
            {[
              { name: 'Scrape Queue',  key: 'scrape', color: 'blue'  },
              { name: 'Image Queue',   key: 'image',  color: 'teal'  },
              { name: 'Email Queue',   key: 'email',  color: 'purple'},
            ].map(({ name, key, color }) => {
              const stat = queueStats[key as keyof typeof queueStats] as any;
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <Activity size={14} className="text-gray-400" />
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{stat.waiting}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Waiting</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{stat.active}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Active</p>
                    </div>
                    {'failed' in stat && (
                      <div className="text-center">
                        <p className={cn('text-lg font-bold', stat.failed > 0 ? 'text-red-500' : 'text-gray-400')}>
                          {stat.failed}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Failed</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block"
          >
            <Button variant="secondary" size="sm" className="w-full">
              Open Bull Board Dashboard ↗
            </Button>
          </a>
        </Card>
      </div>

      {/* Active run progress */}
      {running && (
        <Card title="Current Scrape — Live">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <RefreshCw size={16} className="animate-spin text-blue-500" />
              <span className="text-sm font-medium text-gray-800">Crawling hippiecowgirlcouture.com…</span>
            </div>
            <div className="space-y-2">
              {['Discovering catalog pages', 'Collecting product links', 'Scraping product details', 'Processing images'].map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                    i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'
                  )}>
                    {i < 1 && <CheckCircle size={10} className="text-white" />}
                  </div>
                  <span className={cn(i <= 1 ? 'text-gray-800' : 'text-gray-400')}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Scrape history */}
      <Card title="Scrape History">
        <Table<ScrapeLog>
          columns={columns}
          data={logs}
          keyField="id"
          emptyMessage="No scrape history yet"
        />
      </Card>
    </div>
  );
}
