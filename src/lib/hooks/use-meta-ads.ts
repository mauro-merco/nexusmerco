import { useState, useEffect, useCallback } from 'react';

const API_BASE = '';

export interface MetaCampaign {
  id: string;
  client_id: string;
  month: string;
  week_start: string | null;
  campaign_name: string;
  delivery_status: string;
  budget_type: string;
  budget_amount: number;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  cost_per_result: number;
}

export interface MetaAdSet {
  id: string;
  ad_set_name: string;
  campaign_name: string;
  category: string;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  cost_per_result: number;
  budget: number;
  bid_strategy: string;
}

export interface MetaAd {
  id: string;
  ad_name: string;
  ad_set_name: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  cost_per_result: number;
  quality_ranking: string;
  engagement_ranking: string;
  conversion_ranking: string;
}

export function useMetaAds(clientId?: string | null, month?: string | null, view?: string | null) {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [adSets, setAdSets] = useState<MetaAdSet[]>([]);
  const [ads, setAds] = useState<MetaAd[]>([]);
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
      const res = await globalThis.fetch(`${API_BASE}/api/meta-ads?${params}`);
      if (!res.ok) throw new Error('Error fetching Meta Ads data');
      const json = await res.json();
      setCampaigns(json.data.campaigns || []);
      setAdSets(json.data.adSets || []);
      setAds(json.data.ads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, month, view]);

  useEffect(() => { loadData(); }, [loadData]);

  return { campaigns, adSets, ads, loading, error, refetch: loadData };
}
