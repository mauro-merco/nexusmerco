'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DatabaseZap, RefreshCw, CheckCircle2, AlertTriangle, BarChart3, BrainCircuit, GitBranch, Search, Save, Loader2, TrendingUp, TrendingDown, MousePointerClick, Target, DollarSign, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area } from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type ClientOption = { id: string; name: string; industry?: string; status?: string };
type IntegrationConfig = {
  google_ads_customer_id: string | null;
  meta_ad_account_id: string | null;
  ga4_property_id: string | null;
  last_google_ads_sync_at: string | null;
  last_meta_ads_sync_at: string | null;
  last_ga4_sync_at: string | null;
};
type GoogleCampaign = {
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
};
type DailyMetric = GoogleCampaign & { date: string };
type KeywordMetric = { keyword: string; campaign_name: string; match_type: string; cost: number; clicks: number; conversions: number; cpc: number };
type SegmentMetric = { segment_type: string; segment_value: string; campaign_name: string; cost: number; conversions: number };
type Ga4Daily = { date: string; source_medium: string; sessions: number; total_users: number; conversions: number; total_revenue: number; engagement_rate: number };
type MetaCampaign = { campaign_name: string; spend: number; impressions: number; reach: number; results: number; cost_per_result: number };
type SyncLog = { id: string; platform: string; status: 'success' | 'error'; rows_synced: number; message: string; created_at: string };
type MetaAccount = { id: string; name: string; account_id?: string; currency?: string; account_status?: number };

const sections = [
  { title: 'Resumen general', icon: BarChart3, text: 'Inversion, conversiones, ROAS, CPA, clics y comparativas por dia, semana y mes.' },
  { title: 'Google Ads', icon: DatabaseZap, text: 'Campanas, keywords, PMax, gasto, clics, conversiones y oportunidades.' },
  { title: 'Meta Ads', icon: RefreshCw, text: 'Campanas, conjuntos, anuncios, alcance, CPC, CTR, conversiones y creatividades.' },
  { title: 'Canales y GA4', icon: GitBranch, text: 'Organic, paid, direct, referral, social, sesiones, usuarios y calidad del trafico.' },
  { title: 'Embudo', icon: Search, text: 'Visita, producto/lead, carrito, compra y puntos de fuga.' },
  { title: 'Insights IA', icon: BrainCircuit, text: 'Diagnostico automatico y acciones recomendadas con datos reales.' },
];

export default function DataCenterPage() {
  const { user, token } = useAuthStore();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncingGa4, setSyncingGa4] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [message, setMessage] = useState('');
  const [campaigns, setCampaigns] = useState<GoogleCampaign[]>([]);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [keywords, setKeywords] = useState<KeywordMetric[]>([]);
  const [segments, setSegments] = useState<SegmentMetric[]>([]);
  const [ga4Daily, setGa4Daily] = useState<Ga4Daily[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [range, setRange] = useState<'month' | '30d' | '90d'>('month');
  const selected = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  useEffect(() => {
    fetch('/api/clients', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(json => {
        const data = json.data || [];
        setClients(data);
        setClientId(current => current || data[0]?.id || '');
      })
      .catch(() => setClients([]));
  }, [token]);

  useEffect(() => {
    if (!clientId) return;
    setLoadingConfig(true);
    setMessage('');
    fetch(`/api/clients/${clientId}/integrations`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(json => setConfig(json.data || null))
      .catch(() => setMessage('No se pudo cargar la configuracion'))
      .finally(() => setLoadingConfig(false));
  }, [clientId, token]);

  useEffect(() => {
    if (!clientId) return;
    const month = range === 'month' ? `&month=${new Date().toISOString().slice(0, 7)}` : '';
    fetch(`/api/google-ads?client_id=${clientId}&view=mensual${month}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(json => { setCampaigns(json.data?.campaigns || []); setDaily(json.data?.daily || []); setKeywords(json.data?.keywords || []); setSegments(json.data?.segments || []); })
      .catch(() => { setCampaigns([]); setDaily([]); setKeywords([]); setSegments([]); });
  }, [clientId, range, token]);

  const fetchSyncLogs = useCallback(() => {
    if (!clientId) return;
    fetch(`/api/integrations/sync-logs?client_id=${clientId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(json => setSyncLogs(json.data || []))
      .catch(() => setSyncLogs([]));
  }, [clientId, token]);

  useEffect(() => { fetchSyncLogs(); }, [fetchSyncLogs]);

  useEffect(() => {
    if (!token || user?.role === 'client') return;
    fetch('/api/integrations/meta-ads/accounts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => setMetaAccounts(json.data || []))
      .catch(() => setMetaAccounts([]));
  }, [token, user?.role]);

  useEffect(() => {
    if (!clientId) return;
    const month = range === 'month' ? `&month=${new Date().toISOString().slice(0, 7)}` : '';
    fetch(`/api/meta-ads?client_id=${clientId}&view=mensual${month}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(json => setMetaCampaigns(json.data?.campaigns || []))
      .catch(() => setMetaCampaigns([]));
  }, [clientId, range, token]);

  useEffect(() => {
    if (!clientId) return;
    const month = range === 'month' ? `&month=${new Date().toISOString().slice(0, 7)}` : '';
    fetch(`/api/analytics?client_id=${clientId}${month}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(json => setGa4Daily(json.daily || []))
      .catch(() => setGa4Daily([]));
  }, [clientId, range, token]);

  const totals = campaigns.reduce((acc, c) => ({
    cost: acc.cost + Number(c.cost || 0),
    clicks: acc.clicks + Number(c.clicks || 0),
    impressions: acc.impressions + Number(c.impressions || 0),
    conversions: acc.conversions + Number(c.conversions || 0),
    value: acc.value + Number(c.conv_value || 0),
  }), { cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0 });
  const bestRoas = [...campaigns].filter(c => Number(c.cost) > 0).sort((a, b) => Number(b.roas) - Number(a.roas))[0];
  const worstWaste = [...campaigns].filter(c => Number(c.cost) > 0 && Number(c.conversions) === 0).sort((a, b) => Number(b.cost) - Number(a.cost))[0];
  const topSpend = [...campaigns].sort((a, b) => Number(b.cost) - Number(a.cost))[0];
  const topCtr = [...campaigns].sort((a, b) => Number(b.ctr) - Number(a.ctr))[0];
  const chartData = campaigns.map(c => ({ name: shortName(c.campaign_name), cost: Number(c.cost || 0), conversions: Number(c.conversions || 0), roas: Number(c.roas || 0) }));
  const dailyChart = Object.values(daily.reduce((acc: Record<string, any>, d) => {
    if (!inSelectedRange(d.date, range)) return acc;
    const key = d.date;
    acc[key] ||= { date: key.slice(5), cost: 0, conversions: 0 };
    acc[key].cost += Number(d.cost || 0);
    acc[key].conversions += Number(d.conversions || 0);
    return acc;
  }, {}));
  const deviceChart = Object.values(segments.filter(s => s.segment_type === 'device').reduce((acc: Record<string, any>, s) => {
    acc[s.segment_value] ||= { name: s.segment_value, cost: 0, conversions: 0 };
    acc[s.segment_value].cost += Number(s.cost || 0);
    acc[s.segment_value].conversions += Number(s.conversions || 0);
    return acc;
  }, {}));
  const topKeywords = [...keywords].sort((a, b) => Number(b.cost) - Number(a.cost)).slice(0, 8);
  const channels = Object.values(ga4Daily.reduce((acc: Record<string, any>, r) => {
    const key = r.source_medium || '(not set)';
    acc[key] ||= { name: key, sessions: 0, conversions: 0, revenue: 0 };
    acc[key].sessions += Number(r.sessions || 0);
    acc[key].conversions += Number(r.conversions || 0);
    acc[key].revenue += Number(r.total_revenue || 0);
    return acc;
  }, {})).sort((a: any, b: any) => b.sessions - a.sessions).slice(0, 8);
  const ga4Totals = ga4Daily.reduce((acc, r) => ({ sessions: acc.sessions + Number(r.sessions || 0), users: acc.users + Number(r.total_users || 0), conversions: acc.conversions + Number(r.conversions || 0), revenue: acc.revenue + Number(r.total_revenue || 0) }), { sessions: 0, users: 0, conversions: 0, revenue: 0 });
  const metaTotals = metaCampaigns.reduce((acc, c) => ({ spend: acc.spend + Number(c.spend || 0), impressions: acc.impressions + Number(c.impressions || 0), reach: acc.reach + Number(c.reach || 0), results: acc.results + Number(c.results || 0) }), { spend: 0, impressions: 0, reach: 0, results: 0 });
  const metaChart = metaCampaigns.map(c => ({ name: shortName(c.campaign_name), spend: Number(c.spend || 0), results: Number(c.results || 0) }));
  const now = new Date();
  const last7Start = new Date(now); last7Start.setDate(now.getDate() - 6);
  const prev7Start = new Date(now); prev7Start.setDate(now.getDate() - 13);
  const prev7End = new Date(now); prev7End.setDate(now.getDate() - 7);
  const last7 = sumDaily(daily, last7Start, now);
  const prev7 = sumDaily(daily, prev7Start, prev7End);
  const weekDeltas = {
    cost: delta(last7.cost, prev7.cost),
    conversions: delta(last7.conversions, prev7.conversions),
    roas: delta(last7.cost > 0 ? last7.value / last7.cost : 0, prev7.cost > 0 ? prev7.value / prev7.cost : 0),
  };
  const suggestions = [
    bestRoas ? `Escalar o proteger presupuesto en ${bestRoas.campaign_name}: ROAS ${Number(bestRoas.roas).toFixed(2)}.` : '',
    worstWaste ? `Revisar ${worstWaste.campaign_name}: invirtio ${money(worstWaste.cost)} y no genero conversiones.` : '',
    topCtr && Number(topCtr.ctr) > 0.05 ? `${topCtr.campaign_name} tiene CTR alto (${(Number(topCtr.ctr) * 100).toFixed(2)}%): revisar si la landing convierte.` : '',
    totals.cost > 0 && totals.conversions > 0 ? `CPA promedio estimado: ${money(totals.cost / totals.conversions)}.` : '',
  ].filter(Boolean);
  const healthScore = Math.max(0, Math.min(100,
    (totals.cost > 0 && totals.value / totals.cost >= 4 ? 35 : totals.cost > 0 && totals.value / totals.cost >= 2 ? 22 : 8) +
    (totals.conversions >= 5 ? 30 : totals.conversions > 0 ? 18 : 0) +
    (totals.impressions > 0 && totals.clicks / totals.impressions >= 0.02 ? 20 : 10) +
    (worstWaste ? 5 : 15)
  ));

  const saveConfig = async () => {
    if (!clientId || !config) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/clients/${clientId}/integrations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setConfig(json.data);
      setMessage('Configuracion guardada');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const syncGoogleAds = async () => {
    if (!clientId) return;
    setSyncingGoogle(true);
    setMessage('');
    try {
      const res = await fetch('/api/integrations/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ client_id: clientId }),
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* show raw response below */ }
      if (!res.ok || !json) {
        const detail = json?.error || text.slice(0, 180) || res.statusText;
        throw new Error(`Sync falló (${res.status}): ${detail}`);
      }
      setMessage(`Google Ads sincronizado: ${json.data.inserted} campañas`);
      const cfg = await fetch(`/api/clients/${clientId}/integrations`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setConfig(cfg.data || null);
      fetchSyncLogs();
      const ads = await fetch(`/api/google-ads?client_id=${clientId}&view=mensual`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setCampaigns(ads.data?.campaigns || []);
      setDaily(ads.data?.daily || []);
      setKeywords(ads.data?.keywords || []);
      setSegments(ads.data?.segments || []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo sincronizar Google Ads');
    } finally {
      setSyncingGoogle(false);
    }
  };

  const syncGa4 = async () => {
    if (!clientId) return;
    setSyncingGa4(true);
    setMessage('');
    try {
      const res = await fetch('/api/integrations/ga4/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ client_id: clientId }),
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      if (!res.ok || !json) throw new Error(json?.error || text.slice(0, 180) || 'Error');
      setMessage(`GA4 sincronizado: ${json.data.inserted} filas`);
      const cfg = await fetch(`/api/clients/${clientId}/integrations`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setConfig(cfg.data || null);
      fetchSyncLogs();
      const analytics = await fetch(`/api/analytics?client_id=${clientId}&month=${new Date().toISOString().slice(0, 7)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setGa4Daily(analytics.daily || []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo sincronizar GA4');
    } finally {
      setSyncingGa4(false);
    }
  };

  const syncMeta = async () => {
    if (!clientId) return;
    setSyncingMeta(true);
    setMessage('');
    try {
      const res = await fetch('/api/integrations/meta-ads/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ client_id: clientId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(`Meta Ads sincronizado: ${json.data.inserted} campañas`);
      const meta = await fetch(`/api/meta-ads?client_id=${clientId}&view=mensual&month=${new Date().toISOString().slice(0, 7)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setMetaCampaigns(meta.data?.campaigns || []);
      const cfg = await fetch(`/api/clients/${clientId}/integrations`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
      setConfig(cfg.data || null);
      fetchSyncLogs();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo sincronizar Meta'); }
    finally { setSyncingMeta(false); }
  };

  if (!hasModuleAccess(user, 'datos')) {
    return <NoAccess message="No tienes permiso para acceder al Centro de Datos." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <DatabaseZap className="h-6 w-6 text-gradient-tech" /> Centro de Datos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Datos reales por cliente desde Google Ads, Meta Ads y GA4.</p>
        </div>
        <select value={clientId} onChange={e => setClientId(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm md:min-w-72">
          {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {([{ id: 'month', label: 'Mes actual' }, { id: '30d', label: '30 dias' }, { id: '90d', label: '90 dias' }] as const).map(opt => (
          <button key={opt.id} onClick={() => setRange(opt.id)} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', range === opt.id ? 'bg-gradient-tech text-white' : 'text-muted-foreground')}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente seleccionado</p>
            <h2 className="text-xl font-bold">{selected?.name || 'Sin cliente'}</h2>
            <p className="text-sm text-muted-foreground">Primero configuramos IDs por cliente. Luego activamos sincronizacion real y cron diario.</p>
          </div>
          <button onClick={saveConfig} disabled={saving || loadingConfig || !config || user?.role === 'client'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-tech px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configuracion
          </button>
        </div>
        {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Google Ads Customer ID" value={config?.google_ads_customer_id || ''} disabled={user?.role === 'client'} onChange={value => setConfig(c => c ? { ...c, google_ads_customer_id: value } : c)} placeholder="515-516-8736" />
        <Field label="Meta Ad Account ID" value={config?.meta_ad_account_id || ''} disabled={user?.role === 'client'} onChange={value => setConfig(c => c ? { ...c, meta_ad_account_id: value } : c)} placeholder="act_123456789" />
        <Field label="GA4 Property ID" value={config?.ga4_property_id || ''} disabled={user?.role === 'client'} onChange={value => setConfig(c => c ? { ...c, ga4_property_id: value } : c)} placeholder="4021710339" />
      </div>

      {user?.role !== 'client' && metaAccounts.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cuentas Meta disponibles</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {metaAccounts.map(acc => (
              <button key={acc.id} onClick={() => setConfig(c => c ? { ...c, meta_ad_account_id: acc.id } : c)} className="rounded-xl border bg-background/60 p-3 text-left transition-colors hover:border-primary/50">
                <p className="font-semibold truncate">{acc.name}</p>
                <p className="text-xs text-muted-foreground">{acc.id} · {acc.currency || ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <ConnectionCard title="Google Ads" ready={!!config?.google_ads_customer_id} missing="Customer ID por cliente" lastSync={config?.last_google_ads_sync_at} />
        <ConnectionCard title="Meta Ads" ready={!!config?.meta_ad_account_id} missing="Ad Account ID por cliente" lastSync={config?.last_meta_ads_sync_at} />
        <ConnectionCard title="GA4" ready={!!config?.ga4_property_id} missing="Property ID por cliente" lastSync={config?.last_ga4_sync_at} />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold">Sincronizacion manual</h3>
            <p className="text-sm text-muted-foreground">Primer paso real: traer campañas mensuales de Google Ads.</p>
          </div>
          <button onClick={syncGoogleAds} disabled={!config?.google_ads_customer_id || syncingGoogle || user?.role === 'client'} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {syncingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar Google Ads
          </button>
          <button onClick={syncGa4} disabled={!config?.ga4_property_id || syncingGa4 || user?.role === 'client'} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {syncingGa4 ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar GA4
          </button>
          <button onClick={syncMeta} disabled={!config?.meta_ad_account_id || syncingMeta || user?.role === 'client'} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {syncingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar Meta
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Historial de sincronizaciones</h3>
          <button onClick={fetchSyncLogs} className="text-xs text-primary hover:underline">Actualizar</button>
        </div>
        {syncLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin sincronizaciones registradas.</p>
        ) : (
          <div className="space-y-2">
            {syncLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3 text-sm">
                <span className={cn('h-2.5 w-2.5 rounded-full', log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500')} />
                <span className="font-semibold uppercase">{log.platform}</span>
                <span className="text-muted-foreground">{log.status === 'success' ? `${log.rows_synced} filas` : log.message}</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="Inversion" value={money(totals.cost)} icon={<DollarSign className="h-4 w-4" />} tone="cyan" />
        <Metric label="Conversiones" value={num(totals.conversions)} icon={<Target className="h-4 w-4" />} tone="violet" />
        <Metric label="ROAS" value={totals.cost > 0 ? (totals.value / totals.cost).toFixed(2) : '0.00'} icon={<TrendingUp className="h-4 w-4" />} tone="emerald" />
        <Metric label="Clics" value={num(totals.clicks)} icon={<MousePointerClick className="h-4 w-4" />} tone="blue" />
        <Metric label="CTR" value={totals.impressions > 0 ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%` : '0%'} icon={<Zap className="h-4 w-4" />} tone="amber" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <InsightCard title="Mejor ROAS" value={bestRoas ? Number(bestRoas.roas).toFixed(2) : '-'} subtitle={bestRoas?.campaign_name || 'Sin datos'} good />
        <InsightCard title="A revisar" value={worstWaste ? money(worstWaste.cost) : '-'} subtitle={worstWaste?.campaign_name || 'Sin gasto sin conversion'} danger={!!worstWaste} />
        <InsightCard title="Mayor inversion" value={topSpend ? money(topSpend.cost) : '-'} subtitle={topSpend?.campaign_name || 'Sin datos'} />
        <InsightCard title="Mejor CTR" value={topCtr ? `${(Number(topCtr.ctr) * 100).toFixed(2)}%` : '-'} subtitle={topCtr?.campaign_name || 'Sin datos'} />
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score de salud Google Ads</p>
            <p className="mt-1 text-4xl font-black text-gradient-tech">{healthScore}/100</p>
          </div>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted md:max-w-xl">
            <div className="h-full rounded-full bg-gradient-tech" style={{ width: `${healthScore}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DeltaCard label="Inversion vs semana anterior" value={weekDeltas.cost} />
        <DeltaCard label="Conversiones vs semana anterior" value={weekDeltas.conversions} />
        <DeltaCard label="ROAS vs semana anterior" value={weekDeltas.roas} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartCard title="Inversion por campaña" data={chartData} dataKey="cost" color="#22d3ee" />
        <ChartCard title="ROAS por campaña" data={chartData} dataKey="roas" color="#8b5cf6" />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AreaCard title="Evolucion diaria: inversion" data={dailyChart} />
        <ChartCard title="Dispositivos: inversion" data={deviceChart} dataKey="cost" color="#f59e0b" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Sesiones GA4" value={num(ga4Totals.sessions)} icon={<BarChart3 className="h-4 w-4" />} tone="cyan" />
        <Metric label="Usuarios GA4" value={num(ga4Totals.users)} icon={<Target className="h-4 w-4" />} tone="blue" />
        <Metric label="Conversiones GA4" value={num(ga4Totals.conversions)} icon={<Zap className="h-4 w-4" />} tone="violet" />
        <Metric label="Revenue GA4" value={money(ga4Totals.revenue)} icon={<DollarSign className="h-4 w-4" />} tone="emerald" />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h3 className="mb-4 font-bold">Canales GA4</h3>
        {channels.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos GA4 sincronizados todavía.</p> : <ChartCard title="Sesiones por canal" data={channels} dataKey="sessions" color="#10b981" />}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Inversion Meta" value={money(metaTotals.spend)} icon={<DollarSign className="h-4 w-4" />} tone="blue" />
        <Metric label="Resultados Meta" value={num(metaTotals.results)} icon={<Target className="h-4 w-4" />} tone="violet" />
        <Metric label="Alcance Meta" value={num(metaTotals.reach)} icon={<Zap className="h-4 w-4" />} tone="cyan" />
        <Metric label="CPR Meta" value={metaTotals.results > 0 ? money(metaTotals.spend / metaTotals.results) : '$0'} icon={<TrendingDown className="h-4 w-4" />} tone="amber" />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartCard title="Meta: inversion por campaña" data={metaChart} dataKey="spend" color="#3b82f6" />
        <ChartCard title="Meta: resultados por campaña" data={metaChart} dataKey="results" color="#a855f7" />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 font-bold">Keywords con mayor inversion</h3>
        {topKeywords.length === 0 ? <p className="text-sm text-muted-foreground">Sin keywords sincronizadas todavía.</p> : (
          <div className="grid gap-2 md:grid-cols-2">
            {topKeywords.map(k => (
              <div key={`${k.keyword}-${k.campaign_name}`} className="rounded-xl border bg-background/60 p-3">
                <p className="truncate font-semibold">{k.keyword}</p>
                <p className="truncate text-xs text-muted-foreground">{k.campaign_name} · {k.match_type}</p>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{money(k.cost)}</span><span>{num(k.conversions)} conv.</span><span>CPC {money(k.cpc)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-violet-500" />
          <h3 className="font-bold">Sugerencias automaticas</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {(suggestions.length ? suggestions : ['Sin suficientes datos para sugerencias.']).map((s, i) => (
            <div key={i} className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">{s}</div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Google Ads: campañas sincronizadas</h3>
            <p className="text-sm text-muted-foreground">Datos reales guardados en Supabase desde la API.</p>
          </div>
        </div>
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin campañas sincronizadas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Campaña</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3 text-right">Costo</th>
                  <th className="py-2 pr-3 text-right">Conv.</th>
                  <th className="py-2 pr-3 text-right">ROAS</th>
                  <th className="py-2 pr-3 text-right">Clics</th>
                  <th className="py-2 pr-3 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.campaign_name} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{c.campaign_name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.campaign_status}</td>
                    <td className="py-2 pr-3 text-right">{money(c.cost)}</td>
                    <td className="py-2 pr-3 text-right">{num(c.conversions)}</td>
                    <td className="py-2 pr-3 text-right"><RoasBadge value={Number(c.roas || 0)} /></td>
                    <td className="py-2 pr-3 text-right">{num(c.clicks)}</td>
                    <td className="py-2 pr-3 text-right">{`${(Number(c.ctr || 0) * 100).toFixed(2)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean }) {
  return (
    <label className="space-y-1.5 rounded-2xl border bg-card p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="h-10 w-full rounded-xl border bg-background px-3 text-sm disabled:opacity-60" />
    </label>
  );
}

function ConnectionCard({ title, ready, missing, lastSync }: { title: string; ready: boolean; missing: string; lastSync?: string | null }) {
  return (
    <div className={cn('rounded-2xl border bg-card p-4', ready ? 'border-emerald-500/40' : 'border-amber-500/30')}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        {ready ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{ready ? 'Configurado' : `Falta: ${missing}`}</p>
      <p className="mt-1 text-xs text-muted-foreground">Ultimo sync: {lastSync ? new Date(lastSync).toLocaleString('es-AR') : 'pendiente'}</p>
    </div>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  const tones: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-500',
    violet: 'bg-violet-500/10 text-violet-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function InsightCard({ title, value, subtitle, good, danger }: { title: string; value: string; subtitle: string; good?: boolean; danger?: boolean }) {
  return <div className={cn('rounded-2xl border bg-card p-4', good && 'border-emerald-500/40 bg-emerald-500/5', danger && 'border-red-500/40 bg-red-500/5')}><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p></div>;
}

function DeltaCard({ label, value }: { label: string; value: number | null }) {
  const positive = (value || 0) >= 0;
  return <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={cn('mt-1 flex items-center gap-2 text-2xl font-bold', positive ? 'text-emerald-500' : 'text-red-500')}>{positive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}{value === null ? '-' : `${positive ? '+' : ''}${value.toFixed(1)}%`}</p></div>;
}

function ChartCard({ title, data, dataKey, color }: { title: string; data: any[]; dataKey: string; color: string }) {
  return <div className="rounded-2xl border bg-card p-4"><h3 className="mb-4 font-bold">{title}</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.15} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey={dataKey} radius={[8, 8, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={color} />)}</Bar></BarChart></ResponsiveContainer></div></div>;
}

function AreaCard({ title, data }: { title: string; data: any[] }) {
  return <div className="rounded-2xl border bg-card p-4"><h3 className="mb-4 font-bold">{title}</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.15} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Area type="monotone" dataKey="cost" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div></div>;
}

function RoasBadge({ value }: { value: number }) {
  const cls = value >= 4 ? 'bg-emerald-500/10 text-emerald-500' : value >= 2 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500';
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', cls)}>{value.toFixed(2)}</span>;
}

function shortName(name: string) { return name.replace(/\s*\|\s*/g, ' / ').slice(0, 22); }

function sumDaily(rows: DailyMetric[], from: Date, to: Date) {
  return rows.reduce((acc, r) => {
    const d = new Date(r.date);
    if (d >= startOfDay(from) && d <= endOfDay(to)) {
      acc.cost += Number(r.cost || 0);
      acc.conversions += Number(r.conversions || 0);
      acc.value += Number(r.conv_value || 0);
    }
    return acc;
  }, { cost: 0, conversions: 0, value: 0 });
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function inSelectedRange(date: string, range: 'month' | '30d' | '90d') {
  const d = new Date(date);
  const now = new Date();
  if (range === 'month') return date.startsWith(now.toISOString().slice(0, 7));
  const start = new Date(now);
  start.setDate(now.getDate() - (range === '30d' ? 29 : 89));
  return d >= startOfDay(start) && d <= endOfDay(now);
}

function money(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function num(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(value || 0));
}
