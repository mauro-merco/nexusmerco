import { useState, useEffect, useCallback } from 'react';

const API_BASE = '';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error fetching data');
  }
  const json = await res.json();
  return json.data as T;
}

export function useWeeklyInputs(clientId?: string | null, weekStart?: string | null) {
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (weekStart) params.set('week_start', weekStart);
      const result = await fetchJson<Array<Record<string, unknown>>>(`${API_BASE}/api/weekly-inputs?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useCampaignMetrics(clientId?: string | null, weekStart?: string | null) {
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (weekStart) params.set('week_start', weekStart);
      const result = await fetchJson<Array<Record<string, unknown>>>(`${API_BASE}/api/campaign-metrics?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useGa4Traffic(clientId?: string | null, weekStart?: string | null) {
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (weekStart) params.set('week_start', weekStart);
      const result = await fetchJson<Array<Record<string, unknown>>>(`${API_BASE}/api/ga4-traffic?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useGcMetrics(clientId?: string | null) {
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      const result = await fetchJson<Array<Record<string, unknown>>>(`${API_BASE}/api/gc-metrics?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useUploadedFiles(clientId?: string | null, weekStart?: string | null, month?: string | null) {
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (weekStart) params.set('week_start', weekStart);
      if (month) params.set('month', month);
      const result = await fetchJson<Array<Record<string, unknown>>>(`${API_BASE}/api/uploaded-files?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useUploadCsv() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (clientId: string, weekStart: string, csvRaw: string) => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, week_start_date: weekStart, csv_data_raw: csvRaw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al subir');
      return json.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      throw e;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}
