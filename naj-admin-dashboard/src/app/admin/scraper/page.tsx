'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Play, CheckCircle, XCircle, AlertCircle, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, Badge, Button, Table } from '@/components/admin/ui';
import type { Column } from '@/components/admin/ui';
import { formatDateTime, formatDuration, SCRAPE_STATUS_COLORS } from '@/lib/utils';
import { adminPost, useAdminApi } from '@/lib/use-admin-api';
import type { AdminUser, ScrapeLog } from '@/types';

const BULL_BOARD_URL =
  process.env.NEXT_PUBLIC_BULL_BOARD_URL ?? 'http://localhost:3001';

const POLL_MS = 12_000;

function ErrorDetails({ log }: { log: ScrapeLog }) {
  const [open, setOpen] = useState(false);
  if (!log.errors?.length) {
    return <span className="text-sm text-gray-300">0</span>;
  }
  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-red-600 font-medium hover:underline"
      >
        {log.errors.length}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <ul className="mt-2 max-w-md space-y-1 text-xs text-gray-600 bg-red-50 rounded p-2 border border-red-100">
          {log.errors.slice(0, 10).map((e, i) => (
            <li key={i}>
              <span className="font-mono text-red-700">[{e.stage}]</span>{' '}
              {e.message}
              <span className="block truncate text-gray-400">{e.url}</span>
            </li>
          ))}
          {log.errors.length > 10 && (
            <li className="text-gray-400">+{log.errors.length - 10} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

type ScraperStatus = {
  ok: boolean;
  configured: boolean;
  reachable: boolean;
  inlineMode?: boolean;
  redisConfigured?: boolean;
  scraperUrl?: string;
  error?: string | null;
};

export default function ScraperPage() {
  const { data: me } = useAdminApi<AdminUser>('/api/admin/me');
  const { data: logs, loading: logsLoading, error: logsError, refetch: refetchLogs } =
    useAdminApi<ScrapeLog[]>('/api/admin/scraper/logs');
  const { data: scraperStatus, refetch: refetchStatus } =
    useAdminApi<ScraperStatus>('/api/admin/scraper/status');

  const [running, setRunning] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [sawRunningLog, setSawRunningLog] = useState(false);

  const canTrigger = me && ['admin', 'super_admin'].includes(me.role);
  const logList = logs ?? [];
  const hasRunningLog = logList.some((l) => l.status === 'running');
  const pendingLog = pendingJobId
    ? logList.find((l) => l.job_id === pendingJobId)
    : undefined;

  useEffect(() => {
    if (hasRunningLog) setSawRunningLog(true);
  }, [hasRunningLog]);

  useEffect(() => {
    if (!running && !hasRunningLog) return;
    const id = setInterval(() => refetchLogs(), POLL_MS);
    return () => clearInterval(id);
  }, [running, hasRunningLog, refetchLogs]);

  useEffect(() => {
    if (!running) return;

    if (sawRunningLog && !hasRunningLog) {
      setRunning(false);
      setPendingJobId(null);
      setSawRunningLog(false);
      const last = pendingLog ?? logList[0];
      if (last?.status === 'failed') {
        toast.error('Scrape failed — see errors in history');
      } else {
        toast.success('Scrape finished — check approval queue for new products');
      }
      return;
    }

    if (pendingJobId && pendingLog && pendingLog.status !== 'running') {
      setRunning(false);
      setPendingJobId(null);
      setSawRunningLog(false);
      if (pendingLog.status === 'failed') {
        toast.error('Scrape failed — see errors in history');
      } else {
        toast.success('Scrape finished — check approval queue for new products');
      }
    }
  }, [running, sawRunningLog, hasRunningLog, pendingJobId, pendingLog, logList]);

  useEffect(() => {
    if (logsError) toast.error(logsError);
  }, [logsError]);

  const triggerScrape = async () => {
    if (!canTrigger) {
      toast.error('You do not have permission to trigger scrapes');
      return;
    }
    if (scraperStatus && !scraperStatus.ok) {
      toast.error(scraperStatus.error ?? 'Scraper service is not configured');
      return;
    }
    setRunning(true);
    try {
      const res = await adminPost('/api/admin/scraper/trigger');
      const jobId = res.jobId as string | undefined;
      const mode = res.mode as string | undefined;
      const message = res.message as string | undefined;
      if (jobId) setPendingJobId(jobId);
      toast.success(
        message ??
          (jobId
            ? `Scrape started (${mode ?? 'queued'}) — job ${jobId}`
            : 'Scrape started — check history below')
      );
      refetchLogs();
      refetchStatus();
    } catch (e) {
      setRunning(false);
      toast.error(e instanceof Error ? e.message : 'Failed to trigger scrape');
    }
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
      render: (l) => <ErrorDetails log={l} />,
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
        subtitle="Manage automated product scraping from hippiecowgirlcouture.com"
      />

      {scraperStatus && !scraperStatus.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Scraper service not reachable</p>
          <p className="mt-1 text-red-700">{scraperStatus.error}</p>
          {scraperStatus.scraperUrl && (
            <p className="mt-2 text-xs text-red-600 font-mono">URL: {scraperStatus.scraperUrl}</p>
          )}
        </div>
      )}

      {scraperStatus?.ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          Scraper API connected{scraperStatus.scraperUrl ? ` — ${scraperStatus.scraperUrl}` : ''}
          {scraperStatus.inlineMode && (
            <span className="ml-2 text-green-700">· Manual inline mode (Redis not required)</span>
          )}
        </div>
      )}

      {scraperStatus?.ok && scraperStatus.inlineMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">Inline scrape mode</p>
          <p className="mt-1 text-blue-800">
            Manual scrapes run on the API server. Redis and a background worker are not needed.
          </p>
        </div>
      )}

      {scraperStatus?.ok && !scraperStatus.inlineMode && scraperStatus.redisConfigured === false && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Redis not connected</p>
          <p className="mt-1 text-amber-800">
            Add <code className="text-xs bg-amber-100 px-1 rounded">REDIS_URL</code> (Upstash) on Render, or set{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">SCRAPE_INLINE=true</code> on the API service.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <Card title="Manual Scrape">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {[
                ['Target URL', 'hippiecowgirlcouture.com'],
                ['Min Price', '$150.00 USD'],
                ['Discount', '5% applied on import'],
                ['Schedule', 'Daily at 3:00 AM UTC'],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Triggering a scrape crawls the target site, filters products below $150, applies a 5%
              discount, and saves new products as <strong>pending</strong> for approval. Existing
              source URLs are skipped.
            </p>

            {!canTrigger && me && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
                Your role ({me.role}) cannot trigger scrapes. Contact an admin.
              </p>
            )}

            <Button
              className="w-full"
              loading={running || hasRunningLog}
              onClick={triggerScrape}
              disabled={!canTrigger || running || hasRunningLog || (scraperStatus != null && !scraperStatus.ok)}
            >
              {running || hasRunningLog ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Scraping in progress…
                </>
              ) : (
                <>
                  <Play size={15} /> Trigger Scrape Now
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card title="Worker queues">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Queue depth is visible in Bull Board when running the scraper stack locally
              (<code className="text-xs bg-gray-100 px-1 rounded">docker-compose up</code>).
            </p>
            <p className="text-xs text-gray-400">
              Production queue stats are not exposed via the admin API.
            </p>
            {BULL_BOARD_URL ? (
              <a href={BULL_BOARD_URL} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  <Activity size={14} className="mr-1" />
                  Open Bull Board ↗
                </Button>
              </a>
            ) : (
              <p className="text-xs text-gray-400">Set NEXT_PUBLIC_BULL_BOARD_URL for dashboard link.</p>
            )}
          </div>
        </Card>
      </div>

      {(running || hasRunningLog) && (
        <Card title="Scrape in progress">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <RefreshCw size={16} className="animate-spin text-blue-500" />
            Crawling hippiecowgirlcouture.com — logs refresh every {POLL_MS / 1000}s
          </div>
        </Card>
      )}

      <Card title="Scrape History">
        {logsLoading && logList.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading scrape logs…</p>
        ) : (
          <Table<ScrapeLog>
            columns={columns}
            data={logList}
            keyField="id"
            emptyMessage="No scrape history yet — trigger a scrape to begin"
          />
        )}
      </Card>
    </div>
  );
}
