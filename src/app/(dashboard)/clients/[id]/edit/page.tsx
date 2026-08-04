'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useClient, updateClient } from '@/lib/hooks/use-clients';
import { ArrowLeft, Loader2, AlertCircle, Check, BarChart3, Calendar } from 'lucide-react';

const CAMPAIGN_TYPES = [
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'tiktok_ads', label: 'TikTok Ads' },
  { id: 'shopify', label: 'Shopify' },
];

const PLANS = [
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

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
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-sm">Cargando cliente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Cliente</h1>
          <p className="text-muted-foreground text-sm">Modificá la configuración y los módulos del cliente.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
            <CardDescription>Datos básicos y configuración de módulos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
                <Check className="h-4 w-4 shrink-0" />
                <span>Guardado correctamente</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del cliente *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industria</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">URL del logo</Label>
              <Input
                id="logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Tipos de campaña activos</Label>
              <div className="grid grid-cols-2 gap-2">
                {CAMPAIGN_TYPES.map((ct) => (
                  <label
                    key={ct.id}
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent text-sm"
                  >
                    <Checkbox
                      checked={campaignTypes.includes(ct.id)}
                      onCheckedChange={() => toggleCampaign(ct.id)}
                    />
                    {ct.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={plan} onValueChange={(v) => v && setPlan(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Módulos activos</Label>
              <p className="text-xs text-muted-foreground">Activá o desactivá las vistas disponibles para este cliente.</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                  <Checkbox checked={analysisEnabled} onCheckedChange={(v) => setAnalysisEnabled(v === true)} />
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Centro de Análisis</p>
                    <p className="text-[10px] text-muted-foreground">Métricas, campañas, tráfico, embudo y SEO</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                  <Checkbox checked={socialCalendarEnabled} onCheckedChange={(v) => setSocialCalendarEnabled(v === true)} />
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Calendario de Redes</p>
                    <p className="text-[10px] text-muted-foreground">Planificá publicaciones, historias, reels y carruseles</p>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="cta" disabled={saving} className="gap-2">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                <><Check className="h-4 w-4" /> Guardar Cambios</>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
