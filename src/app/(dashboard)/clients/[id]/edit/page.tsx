'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useClient, updateClient } from '@/lib/hooks/use-clients';
import { ArrowLeft, Loader2, AlertCircle, Check, BarChart3, Calendar, ShoppingBag, ArrowUpRight, Building2, Megaphone, LayoutGrid, Crown } from 'lucide-react';

const CAMPAIGN_TYPES = [
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'tiktok_ads', label: 'TikTok Ads' },
  { id: 'shopify', label: 'Shopify' },
];

const PLANS = [
  { value: 'basic', label: 'Basic', hint: 'Lo esencial' },
  { value: 'pro', label: 'Pro', hint: 'Más módulos' },
  { value: 'enterprise', label: 'Enterprise', hint: 'Todo incluido' },
];

// Estilos compartidos de la vista (solo presentación)
const fieldClass = 'h-11 rounded-xl border-border bg-surface-inset px-3.5 text-[14px] shadow-none focus-visible:bg-card';
const sectionClass = 'relative rounded-[1.6rem] border border-border bg-card p-5 md:p-6';
const sectionTitle = 'flex items-center gap-2.5 text-[15px] font-medium';
const sectionIcon = 'flex h-8 w-8 items-center justify-center rounded-full bg-tint-blue text-tint-blue-foreground';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const { client, loading: loadingClient } = useClient(clientId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [plan, setPlan] = useState('basic');
  const [campaignTypes, setCampaignTypes] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [analysisEnabled, setAnalysisEnabled] = useState(true);
  const [socialCalendarEnabled, setSocialCalendarEnabled] = useState(false);
  const [adsCalendarEnabled, setAdsCalendarEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setDescription(client.description || '');
      setIndustry(client.industry || '');
      setPlan(client.plan || 'basic');
      setCampaignTypes(client.campaign_types || []);
      setLogoUrl(client.logo_url || '');
      setAnalysisEnabled(client.analysis_enabled ?? true);
      setSocialCalendarEnabled(client.social_calendar_enabled ?? false);
      setAdsCalendarEnabled(client.ads_calendar_enabled ?? false);
    }
  }, [client]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateClient(clientId, {
        name: name.trim(),
        description,
        industry,
        plan,
        campaign_types: campaignTypes,
        logo_url: logoUrl,
        analysis_enabled: analysisEnabled,
        social_calendar_enabled: socialCalendarEnabled,
        ads_calendar_enabled: adsCalendarEnabled,
      });
      setSaved(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function toggleCampaign(id: string) {
    setCampaignTypes((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  if (loadingClient) {
    return (
      <ContentSkeleton variant="form" />
    );
  }

  const initials = (name.trim() || client?.name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const modules = [
    { key: 'analysis', label: 'Centro de Análisis', desc: 'Métricas, campañas, tráfico, embudo y SEO', icon: BarChart3, on: analysisEnabled, set: setAnalysisEnabled, tint: 'bg-tint-blue text-tint-blue-foreground' },
    { key: 'social', label: 'Calendario de Redes', desc: 'Publicaciones, historias, reels y carruseles', icon: Calendar, on: socialCalendarEnabled, set: setSocialCalendarEnabled, tint: 'bg-tint-sky text-tint-sky-foreground' },
    { key: 'ads', label: 'Piezas para ADS', desc: 'Piezas publicitarias con fechas ecommerce', icon: ShoppingBag, on: adsCalendarEnabled, set: setAdsCalendarEnabled, tint: 'bg-tint-red text-tint-red-foreground' },
  ];
  const activeModules = modules.filter((m) => m.on).length;

  const actions = (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-[13px] font-medium transition-colors hover:bg-muted"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="bg-brand-gradient shadow-brand inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-semibold transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
        ) : (
          <><Check className="h-4 w-4" /> Guardar cambios</>
        )}
      </button>
    </>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="mb-2 truncate text-xs text-muted-foreground">
              Centro de Control <span className="mx-1.5">→</span> {client?.name || 'Cliente'} <span className="mx-1.5">→</span> Editar
            </p>
            <h1 className="text-[2.1rem] font-normal leading-tight tracking-tight md:text-[2.4rem]">Editar cliente</h1>
            <p className="mt-1 text-sm text-muted-foreground">Modificá la configuración y los módulos del cliente.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-tint-red px-4 py-3 text-sm text-tint-red-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-tint-teal px-4 py-3 text-sm text-tint-teal-foreground">
          <Check className="h-4 w-4 shrink-0" />
          <span>Guardado correctamente</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* COLUMNA PRINCIPAL */}
        <div className="space-y-3.5">
          {/* Identidad */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}><span className={sectionIcon}><Building2 className="h-4 w-4" /></span>Información del cliente</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nombre del cliente *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-xs font-medium text-muted-foreground">Industria</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Ej: Ecommerce, Retail…" className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo" className="text-xs font-medium text-muted-foreground">URL del logo</Label>
                <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className={fieldClass} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Contá en pocas líneas qué hace el cliente y qué buscamos con sus campañas."
                  className="min-h-28 rounded-xl border-border bg-surface-inset px-3.5 py-3 text-[14px] shadow-none focus-visible:bg-card"
                />
              </div>
            </div>
          </section>

          {/* Campañas */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}><span className={sectionIcon}><Megaphone className="h-4 w-4" /></span>Tipos de campaña activos</h2>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{campaignTypes.length} de {CAMPAIGN_TYPES.length}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {CAMPAIGN_TYPES.map((ct) => {
                const on = campaignTypes.includes(ct.id);
                return (
                  <label
                    key={ct.id}
                    className={cn(
                      'flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-sm transition-colors',
                      on ? 'border-primary/50 bg-tint-blue text-tint-blue-foreground' : 'border-border bg-card hover:bg-muted'
                    )}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggleCampaign(ct.id)} className="size-[18px] rounded-full" />
                    <span className="font-medium">{ct.label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Módulos */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}><span className={sectionIcon}><LayoutGrid className="h-4 w-4" /></span>Módulos activos</h2>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{activeModules} de {modules.length}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Activá o desactivá las vistas disponibles para este cliente.</p>
            <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {modules.map((m) => {
                const Icon = m.icon;
                return (
                  <label
                    key={m.key}
                    className={cn(
                      'relative flex cursor-pointer flex-col gap-4 rounded-2xl border p-4 transition-colors',
                      m.on ? 'border-primary/50 bg-surface-inset' : 'border-border bg-card hover:bg-muted'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', m.tint)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <Checkbox checked={m.on} onCheckedChange={(v) => m.set(v === true)} className="size-[18px] rounded-full" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
                    </div>
                    <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold', m.on ? 'bg-tint-blue text-tint-blue-foreground' : 'bg-muted text-muted-foreground')}>
                      {m.on ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* COLUMNA LATERAL */}
        <div className="space-y-3.5">
          {/* Vista previa */}
          <section className="relative overflow-hidden rounded-[1.6rem] border border-border bg-card p-5 md:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-14 -top-12 h-52 w-52 rounded-full opacity-70 blur-[6px]" style={{ background: 'radial-gradient(circle at 35% 35%, #AECBFA 0%, #4285F4 38%, #1A73E8 62%, transparent 72%)' }} />
            <p className="relative text-[15px] font-medium">Vista previa</p>
            <p className="relative text-xs text-muted-foreground">Así se ve en el Centro de Control</p>
            <div className="relative mt-5 rounded-[1.4rem] border border-border bg-card p-4">
              <div className="card-notch bg-card">
                <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-full">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-3 pr-12">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tint-blue text-sm font-bold text-tint-blue-foreground">{initials}</div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{name || 'Nombre del cliente'}</p>
                  <p className="truncate text-xs text-muted-foreground">{industry || 'Industria'}</p>
                </div>
              </div>
              {description && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-tint-blue px-2.5 py-0.5 text-[11px] font-semibold text-tint-blue-foreground">{client?.status === 'onboarding' ? 'Onboarding' : client?.status === 'paused' ? 'Pausado' : 'Activo'}</span>
                {campaignTypes.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium">{CAMPAIGN_TYPES.find((c) => c.id === t)?.label || t}</span>
                ))}
              </div>
            </div>
          </section>

          {/* Plan */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}><span className={sectionIcon}><Crown className="h-4 w-4" /></span>Plan</h2>
            <div role="radiogroup" aria-label="Plan" className="mt-5 grid grid-cols-3 gap-2">
              {PLANS.map((p) => {
                const on = plan === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPlan(p.value)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-3 text-left transition-colors',
                      on ? 'border-transparent bg-foreground text-background' : 'border-border bg-card hover:bg-muted'
                    )}
                  >
                    <span className="text-sm font-semibold">{p.label}</span>
                    <span className={cn('text-[11px]', on ? 'opacity-70' : 'text-muted-foreground')}>{p.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Resumen + acciones */}
          <section className="bg-brand-sky-gradient rounded-[1.6rem] p-5 md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.07em]">Resumen</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div><p className="text-3xl font-light leading-none">{campaignTypes.length}</p><p className="mt-1 text-xs">campañas</p></div>
              <div><p className="text-3xl font-light leading-none">{activeModules}</p><p className="mt-1 text-xs">módulos</p></div>
              <div><p className="pt-1.5 text-xl font-normal leading-none">{PLANS.find((p) => p.value === plan)?.label || plan}</p><p className="mt-1 text-xs">plan</p></div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#0B1B33] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : <><Check className="h-4 w-4" /> Guardar cambios</>}
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
