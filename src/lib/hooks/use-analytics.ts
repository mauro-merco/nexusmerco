import { useState, useEffect, useCallback } from 'react';

const API_BASE = '';

export interface AnalyticsRow {
  id: string;
  client_id: string;
  month: string;
  week_start: string | null;
  source_medium: string;
  sessions: number;
  engaged_sessions: number;
  engagement_rate: number;
  avg_engagement_time: number;
  events_per_session: number;
  total_events: number;
  key_events: number;
  key_event_rate: number;
  total_revenue: number;
}

export function useAnalytics(clientId?: string | null, month?: string | null, view?: string | null) {
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ client_id: clientId });
      if (month) params.set('month', month);
      if (view) params.set('view', view);
      const res = await globalThis.fetch(`${API_BASE}/api/analytics?${params}`);
      if (!res.ok) throw new Error('Error fetching Analytics data');
      const json = await res.json();
      setData(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, month, view]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
