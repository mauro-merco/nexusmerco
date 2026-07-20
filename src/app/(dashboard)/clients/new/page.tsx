'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/hooks/use-clients';
import { ArrowLeft, Loader2, AlertCircle, Check } from 'lucide-react';

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

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [plan, setPlan] = useState('basic');
  const [campaignTypes, setCampaignTypes] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const client = await createClient({
        name: name.trim(),
        description,
        industry,
        plan,
        campaign_types: campaignTypes,
        logo_url: logoUrl,
      });
      router.push(`/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  }

  function toggleCampaign(id: string) {
    setCampaignTypes((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-muted-foreground text-sm">Crear un perfil de cliente para empezar a cargar datos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
            <CardDescription>Datos básicos para identificar al cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del cliente *</Label>
              <Input
                id="name"
                placeholder="Ej: Fullbai B2C"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industria</Label>
              <Input
                id="industry"
                placeholder="Ej: E-commerce, Wellness, Tecnología"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Breve descripción del negocio, objetivos, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">URL del logo</Label>
              <Input
                id="logo"
                placeholder="https://ejemplo.com/logo.png"
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
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
              ) : (
                <><Check className="h-4 w-4" /> Crear Cliente</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
