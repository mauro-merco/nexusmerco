import { useState, useEffect, useCallback } from 'react';

const API_BASE = '';

export interface GaCampaign {
  id: string;
  client_id: string;
  month: string;
  week_start: string | null;
  campaign_name: string;
  campaign_type: string;
  campaign_status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conv_value: number;
  roas: number;
  cpc: number;
  ctr: number;
}

export interface GaKeyword {
  id: string;
  keyword: string;
  match_type: string;
  campaign_name: string;
  ad_group_name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conv_value: number;
  cpc: number;
}

export interface GaAssetGroup {
  id: string;
  asset_group_name: string;
  campaign_name: string;
  category: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conv_value: number;
}

export function useGoogleAds(clientId?: string | null, month?: string | null, view?: string | null) {
  const [campaigns, setCampaigns] = useState<GaCampaign[]>([]);
  const [keywords, setKeywords] = useState<GaKeyword[]>([]);
  const [assetGroups, setAssetGroups] = useState<GaAssetGroup[]>([]);
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
      const res = await globalThis.fetch(`${API_BASE}/api/google-ads?${params}`);
      if (!res.ok) throw new Error('Error fetching Google Ads data');
      const json = await res.json();
      setCampaigns(json.data.campaigns || []);
      setKeywords(json.data.keywords || []);
      setAssetGroups(json.data.assetGroups || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, month, view]);

  useEffect(() => { loadData(); }, [loadData]);

  return { campaigns, keywords, assetGroups, loading, error, refetch: loadData };
}
