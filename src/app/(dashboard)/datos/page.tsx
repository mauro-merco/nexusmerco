'use client';

import { useEffect, useMemo, useState } from 'react';
import { DatabaseZap, RefreshCw, CheckCircle2, AlertTriangle, BarChart3, BrainCircuit, GitBranch, Search, Save, Loader2 } from 'lucide-react';
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
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [message, setMessage] = useState('');
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
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo sincronizar Google Ads');
    } finally {
      setSyncingGoogle(false);
    }
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
        </div>
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
