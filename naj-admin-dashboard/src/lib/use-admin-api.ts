'use client';

import { useCallback, useEffect, useState } from 'react';

function getAuthHeaders(): HeadersInit {
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  const token = match?.[1];
  return token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {};
}

const fetchOpts: RequestInit = { credentials: 'include' };

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
    fetch(url, { ...fetchOpts, headers: getAuthHeaders() })
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

async function parseJson(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export async function adminPost(url: string, body?: unknown) {
  const json = await parseJson(
    await fetch(url, {
      method: 'POST',
      ...fetchOpts,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
  return json;
}

export async function adminPatch(url: string, body: unknown) {
  const json = await parseJson(
    await fetch(url, {
      method: 'PATCH',
      ...fetchOpts,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    })
  );
  return json;
}
