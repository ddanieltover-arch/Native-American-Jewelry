// ═══════════════════════════════════════════════════════════
// Realtime Supabase hooks
// Drop into: naj-admin/src/hooks/useRealtime.ts
//         &  naj-storefront/src/hooks/useRealtime.ts
// ═══════════════════════════════════════════════════════════
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Generic realtime row state ───────────────────────────
export function useRealtimeTable<T extends { id: string }>(
  table:        string,
  initialData:  T[],
  filter?:      { column: string; value: string }
) {
  const [rows, setRows] = useState<T[]>(initialData);

  useEffect(() => {
    const supabase = getClient();
    const filterStr = filter ? `${filter.column}=eq.${filter.value}` : undefined;

    const channel = supabase
      .channel(`realtime:${table}${filter ? `:${filter.value}` : ''}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table,
          ...(filterStr ? { filter: filterStr } : {}),
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRows((prev) => [payload.new as T, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRows((prev) =>
              prev.map((r) => r.id === (payload.new as T).id ? payload.new as T : r)
            );
          } else if (payload.eventType === 'DELETE') {
            setRows((prev) => prev.filter((r) => r.id !== (payload.old as T).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, filter?.column, filter?.value]);

  return rows;
}

// ─── Live scrape logs (admin scraper page) ────────────────
export function useLiveScrapeLogs(initialLogs: any[]) {
  return useRealtimeTable('scrape_logs', initialLogs);
}

// ─── Live orders list (admin orders page) ────────────────
export function useLiveOrders(initialOrders: any[]) {
  return useRealtimeTable('orders', initialOrders);
}

// ─── Live payment notifications (admin) ───────────────────
export function usePaymentUploads(onUpload: (orderId: string) => void) {
  useEffect(() => {
    const supabase = getClient();

    const channel = supabase
      .channel('payment_uploads')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: 'status=eq.uploaded' },
        (payload: any) => {
          onUpload(payload.new.order_id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [onUpload]);
}

// ─── Live single order (order detail page) ────────────────
export function useLiveOrder(orderId: string, initialOrder: any) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    const supabase = getClient();

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => setOrder((prev: any) => ({ ...prev, ...payload.new }))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `order_id=eq.${orderId}` },
        (payload) => setOrder((prev: any) => ({ ...prev, payment: { ...prev.payment, ...payload.new } }))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  return order;
}

// ─── Live product pending count (sidebar badge) ───────────
export function usePendingProductCount(initial: number) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const supabase = getClient();

    const channel = supabase
      .channel('pending_products_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          // Re-fetch count on any product change
          const { count: newCount } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');
          setCount(newCount ?? 0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}

// ─── Customer: live order status updates ──────────────────
export function useLiveOrderStatus(orderId: string, initialStatus: string) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const supabase = getClient();

    const channel = supabase
      .channel(`order_status:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          if (payload.new.status !== status) {
            setStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  return status;
}
