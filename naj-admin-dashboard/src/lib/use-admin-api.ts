'use client';

import { useCallback, useEffect, useState } from 'react';

function getAuthHeaders(): HeadersInit {
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  const token = match?.[1];
  return token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {};
}

export function useAdminApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    fetch(url, { headers: getAuthHeaders() })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? 'Request failed');
        return (json.data ?? json) as T;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url, refreshKey]);

  return { data, loading, error, refetch };
}

export async function adminPost(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}
