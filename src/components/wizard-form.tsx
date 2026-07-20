'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/lib/hooks/use-clients';
import { useT } from '@/lib/use-t';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { ParsedMetrics } from '@/lib/csv-parser';
import { parseCSV } from '@/lib/csv-parser';
import {
  Check, Upload, Loader2, AlertCircle, FileText, BarChart3,
  Cloud, Activity, Trash2, Sparkles,
} from 'lucide-react';

const wizardSchema = z.object({
  client_id: z.string().min(1, 'Seleccioná un cliente'),
  context_notes: z.string().optional(),
  google_spend: z.number().min(0).catch(0),
  google_impressions: z.number().min(0).catch(0),
  google_clicks: z.number().min(0).catch(0),
  google_conversions: z.number().min(0).catch(0),
  google_revenue: z.number().min(0).catch(0),
  meta_spend: z.number().min(0).catch(0),
  meta_impressions: z.number().min(0).catch(0),
  meta_clicks: z.number().min(0).catch(0),
  meta_conversions: z.number().min(0).catch(0),
  meta_revenue: z.number().min(0).catch(0),
  total_visits: z.number().min(0).catch(0),
  total_orders: z.number().min(0).catch(0),
  total_revenue: z.number().min(0).catch(0),
});

type WizardData = z.infer<typeof wizardSchema>;

const defaultValues: WizardData = {
  client_id: '', context_notes: '',
  google_spend: 0, google_impressions: 0, google_clicks: 0, google_conversions: 0, google_revenue: 0,
  meta_spend: 0, meta_impressions: 0, meta_clicks: 0, meta_conversions: 0, meta_revenue: 0,
  total_visits: 0, total_orders: 0, total_revenue: 0,
};

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    google_ads_campaign: { label: 'Google Ads - Campañas', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: BarChart3 },
    google_ads_adgroup: { label: 'Google Ads - Grupos', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: BarChart3 },
    google_ads_ad: { label: 'Google Ads - Anuncios', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: BarChart3 },
    google_ads_keyword: { label: 'Google Ads - Keywords', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: BarChart3 },
    google_ads_resource: { label: 'Google Ads - Recursos', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: BarChart3 },
    meta_ads_campaign: { label: 'Meta Ads - Campañas', color: 'bg-violet-500/10 text-violet-600 border-violet-200', icon: Cloud },
    meta_ads_adset: { label: 'Meta Ads - Conjuntos', color: 'bg-violet-500/10 text-violet-600 border-violet-200', icon: Cloud },
    meta_ads_ad: { label: 'Meta Ads - Anuncios', color: 'bg-violet-500/10 text-violet-600 border-violet-200', icon: Cloud },
    google_analytics: { label: 'GA4 - Tráfico', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: Activity },
    gc_management: { label: 'Gestión Comercial', color: 'bg-orange-500/10 text-orange-600 border-orange-200', icon: FileText },
  };
  const cfg = config[source] || { label: source, color: 'bg-gray-500/10 text-gray-600 border-gray-200', icon: FileText };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('gap-1', cfg.color)}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

function normalizeSource(source: string): string {
  if (source.startsWith('google_ads')) return 'google_ads';
  if (source.startsWith('meta_ads')) return 'meta_ads';
  if (source === 'google_analytics') return 'google_analytics';
  if (source === 'gc_management') return 'gc_management';
  return source;
}

export function WizardForm() {
  const _ = useT();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsingFiles, setParsingFiles] = useState(false);
  const [saveResults, setSaveResults] = useState<{ filename: string; status: 'ok' | 'error'; error?: string }[] | null>(null);

  const user = useAuthStore((s) => s.user);
  const { clients } = useClients();

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues,
    mode: 'onSubmit',
  });

  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isValid } } = form;
  const clientId = watch('client_id');

  const [pendingFiles, setPendingFiles] = useState<Array<{
    id: string; filename: string; rawText: string; parsed: ParsedMetrics;
  }>>([]);

  const [fileDates, setFileDates] = useState<Record<string, { from: string; to: string }>>({});
  const [fileSources, setFileSources] = useState<Record<string, string>>({});

  const sourceOptions = [
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'meta_ads', label: 'Meta Ads' },
    { value: 'google_analytics', label: 'Google Analytics' },
    { value: 'gc_management', label: 'Gestión Comercial' },
  ];

  useEffect(() => { setExistingData(false); setConfirmOverwrite(null); confirmRef.current = null; }, [pendingFiles]);

  const aggregatedMetrics = (() => {
    const result = { google_ads_spend: 0, google_ads_impressions: 0, google_ads_clicks: 0, google_ads_conversions: 0, google_ads_revenue: 0,
      meta_ads_spend: 0, meta_ads_impressions: 0, meta_ads_clicks: 0, meta_ads_conversions: 0, meta_ads_revenue: 0,
      total_visits: 0, total_orders: 0, total_revenue: 0, total_campaigns: 0 };
    for (const f of pendingFiles) {
      const t = f.parsed.totals;
      if (f.parsed.source.startsWith('google_ads')) {
        result.google_ads_spend += t.cost;
        result.google_ads_impressions += t.impressions;
        result.google_ads_clicks += t.clicks;
        result.google_ads_conversions += t.conversions;
        result.google_ads_revenue += t.revenue;
      }
      if (f.parsed.source.startsWith('meta_ads')) {
        result.meta_ads_spend += t.cost;
        result.meta_ads_impressions += t.impressions;
        result.meta_ads_clicks += t.clicks;
        result.meta_ads_conversions += t.conversions;
        result.meta_ads_revenue += t.revenue;
      }
      if (f.parsed.source === 'google_analytics') {
        result.total_visits += t.clicks;
        result.total_orders += t.conversions;
        result.total_revenue += t.revenue;
      }
      result.total_campaigns += f.parsed.campaigns.length;
    }
    return result;
  })();

  function readFileAsUTF8(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arr = new Uint8Array(reader.result as ArrayBuffer);
          const decoder = new TextDecoder('utf-8', { fatal: false });
          let text = decoder.decode(arr);
          if (text.includes('\uFFFD')) {
            const latin = new TextDecoder('iso-8859-1');
            text = latin.decode(arr);
          }
          resolve(text);
        } catch { reject(new Error('Error de codificación')); }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleFiles(files: FileList) {
    setParseError(null);
    setParsingFiles(true);
    const newFiles: typeof pendingFiles = [];
    for (const file of Array.from(files)) {
      try {
        const text = await readFileAsUTF8(file);
        const parsed = parseCSV(text);
        if (parsed.source === 'unknown') {
          setParseError(`Formato no reconocido: "${file.name}". Formatos aceptados: Google Ads, Meta Ads, Google Analytics, Gestión Comercial`);
          setParsingFiles(false);
          return;
        }
        newFiles.push({ id: crypto.randomUUID(), filename: file.name, rawText: text, parsed });
      } catch (err) {
        setParseError(err instanceof Error ? err.message : `Error con "${file.name}"`);
        setParsingFiles(false);
        return;
      }
    }
    setPendingFiles(newFiles);
    setFileDates(Object.fromEntries(newFiles.map(f => [f.id, { from: f.parsed.dateRange.start || '', to: f.parsed.dateRange.end || '' }])));
    setFileSources(Object.fromEntries(newFiles.map(f => [f.id, normalizeSource(f.parsed.source)])));
    setParsingFiles(false);
    if (newFiles.length > 0) setStep(2);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = '';
  }

  function clearAll() {
    setPendingFiles([]);
    setFileDates({});
    setFileSources({});
    setParseError(null);
    reset(defaultValues);
    setStep(1);
    setSaveResults(null);
    setSubmitted(false);
  }

  const [confirmOverwrite, setConfirmOverwrite] = useState<boolean | null>(null);
  const [existingData, setExistingData] = useState<boolean>(false);

  const allDatesFilled = pendingFiles.every(f => fileDates[f.id]?.from?.trim());

  async function checkExistingData(client_id: string): Promise<boolean> {
    try {
      const uniqueDates = [...new Set(Object.values(fileDates).map(d => d.from).filter(Boolean))];
      for (const date of uniqueDates) {
        const res = await fetch(`/api/weekly-inputs?client_id=${client_id}&week_start=${date}`);
        const json = await res.json();
        if (json.data?.length > 0) return true;
      }
      return false;
    } catch { return false; }
  }

  const confirmRef = useRef<boolean | null>(null);

  function uploadEndpoint(source: string): string {
    if (source === 'google_ads') return '/api/upload-google-ads';
    if (source === 'meta_ads') return '/api/upload-meta-ads';
    if (source === 'google_analytics') return '/api/upload-analytics';
    return '/api/upload-csv';
  }

  function buildPayload(source: string, clientId: string, csvRaw: string, dr: { from: string; to: string }, filename: string): Record<string, unknown> {
    const month = dr.from.slice(0, 7);
    if (source === 'google_ads' || source === 'meta_ads' || source === 'google_analytics') {
      return {
        client_id: clientId,
        csv_data_raw: csvRaw,
        month,
        week_start: dr.from,
      };
    }
    return {
      client_id: clientId,
      week_start_date: dr.from,
      date_from: dr.from,
      date_to: dr.to || dr.from,
      source_type: source,
      csv_data_raw: csvRaw,
      filename,
      created_by: user?.id,
    };
  }

  async function onSubmit(formData: WizardData, overwrite = false) {
    const shouldCheck = !overwrite && confirmRef.current === null;
    confirmRef.current = overwrite ? true : confirmRef.current;
    if (shouldCheck) {
      const exists = await checkExistingData(formData.client_id);
      if (exists) { setExistingData(exists); return; }
    }
    setSaveError(null);
    setSaving(true);
    setSaveResults(null);
    const results: typeof saveResults = [];

    try {
      for (const pf of pendingFiles) {
        const dr = fileDates[pf.id];
        if (!dr?.from?.trim()) {
          results.push({ filename: pf.filename, status: 'error', error: 'Fecha desde requerida' });
          continue;
        }
        try {
          const source = fileSources[pf.id] || normalizeSource(pf.parsed.source);
          const endpoint = uploadEndpoint(source);
          const payload = buildPayload(source, formData.client_id, pf.rawText, dr, pf.filename);
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Error');
          results.push({ filename: pf.filename, status: 'ok' });
        } catch (e) {
          results.push({ filename: pf.filename, status: 'error', error: e instanceof Error ? e.message : 'Error' });
        }
      }
      setSaveResults(results);
      if (results.every(r => r.status === 'ok')) {
        setSubmitted(true);
      } else {
        setSaveError('Algunos archivos no se pudieron guardar. Revisá los resultados.');
      }
    } catch (e) {
      setSaveError('Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmitClick(e: React.FormEvent) {
    confirmRef.current = null;
    handleSubmit((data) => onSubmit(data))(e);
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
            <Check className="h-6 w-6 text-emerald-500" />
          </div>
          <CardTitle>Datos guardados</CardTitle>
          <CardDescription>
            {pendingFiles.length} archivo(s) procesados correctamente
            {aggregatedMetrics.total_campaigns > 0 && ` — ${aggregatedMetrics.total_campaigns} campañas analizadas`}
          </CardDescription>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            <div className="rounded-md bg-muted px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Inversión Total</p>
              <p className="text-sm font-semibold">${(aggregatedMetrics.google_ads_spend + aggregatedMetrics.meta_ads_spend).toFixed(2)}</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Impresiones</p>
              <p className="text-sm font-semibold">{(aggregatedMetrics.google_ads_impressions + aggregatedMetrics.meta_ads_impressions).toLocaleString()}</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Conversiones</p>
              <p className="text-sm font-semibold">{(aggregatedMetrics.google_ads_conversions + aggregatedMetrics.meta_ads_conversions)}</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">ROAS</p>
              <p className="text-sm font-semibold">
                {(() => {
                  const spend = aggregatedMetrics.google_ads_spend + aggregatedMetrics.meta_ads_spend;
                  const rev = aggregatedMetrics.google_ads_revenue + aggregatedMetrics.meta_ads_revenue;
                  return spend > 0 ? (rev / spend).toFixed(2) + 'x' : '-';
                })()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="justify-center gap-3">
          <Button onClick={clearAll}>Subir más archivos</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Ir al dashboard</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmitClick} noValidate>
        {/* Client selector (always visible) */}
        <Card className={step === 1 ? '' : 'opacity-60'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={clientId || null} onValueChange={(v) => { if (v) setValue('client_id', v); }}>
              <SelectTrigger className="w-full justify-between">
                <span className="flex-1 text-left truncate">
                  {clientId ? clients.find(c => c.id === clientId)?.name || clientId : 'Seleccionar cliente'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <CardHeader className="pb-3 text-center">
              <CardTitle className="text-base">Subir archivo CSV</CardTitle>
              <CardDescription>
                Arrastrá uno o más archivos o hacé click para seleccionarlos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-6">
              <div className="rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Formatos aceptados: Google Ads (campañas, grupos, anuncios, keywords),
                Meta Ads (campañas, conjuntos, anuncios),
                GA4 (tráfico), Gestión Comercial
              </p>
              <input
                type="file" accept=".csv"
                id="csv-file-input"
                className="hidden"
                multiple
                onChange={handleFileSelect}
              />
              <Button
                type="button" variant="outline" className="gap-2 cursor-pointer"
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <Upload className="h-4 w-4" /> Seleccionar archivo
              </Button>
              {parseError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive w-full">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review + Edit */}
        {step === 2 && pendingFiles.length > 0 && (
          <>
            {/* Parsed files summary */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Archivos analizados</CardTitle>
                  <CardDescription className="flex items-center gap-2 flex-wrap">
                    {pendingFiles.map(f => (
                      <SourceBadge key={f.id} source={f.parsed.source} />
                    ))}
                    <span className="text-xs">{aggregatedMetrics.total_campaigns} campañas totales</span>
                  </CardDescription>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs text-red-500 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Cambiar archivos
                </Button>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {pendingFiles.map(f => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                      <span className="font-medium text-xs truncate">{f.filename}</span>
                      {f.parsed.campaigns.length > 0 && <span className="text-xs text-muted-foreground">({f.parsed.campaigns.length} campañas)</span>}
                    </div>
                    <select
                      value={fileSources[f.id] || 'google_ads'}
                      onChange={e => setFileSources(p => ({ ...p, [f.id]: e.target.value }))}
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 py-1"
                    >
                      {sourceOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <label className="text-xs text-muted-foreground shrink-0">Semana del</label>
                    <Input
                      type="date"
                      value={fileDates[f.id]?.from || ''}
                      onChange={e => setFileDates(p => ({ ...p, [f.id]: { ...p[f.id], from: e.target.value } }))}
                      className="w-[135px] h-8 text-xs"
                      required
                    />
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input
                      type="date"
                      value={fileDates[f.id]?.to || ''}
                      onChange={e => setFileDates(p => ({ ...p, [f.id]: { ...p[f.id], to: e.target.value } }))}
                      className="w-[135px] h-8 text-xs"
                      placeholder="fin"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Debug: show first rows of GC files */}
            {pendingFiles.some(f => f.parsed.source === 'gc_management') && (
              <Card className="border-dashed border-yellow-500/40 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono">🔍 Debug — Filas 0-2 del CSV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-64 overflow-auto">
                  {pendingFiles.filter(f => f.parsed.source === 'gc_management').map(f => {
                    const lines = f.rawText.split('\n').slice(0, 3);
                    return (
                      <div key={f.id} className="text-[10px] font-mono leading-relaxed">
                        <p className="text-muted-foreground mb-1">{f.filename}</p>
                        {lines.map((l, i) => (
                          <div key={i} className="truncate text-foreground/80 hover:text-foreground whitespace-pre-wrap break-all">
                            <span className="text-muted-foreground mr-1">L{i}:</span>{l}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Google Ads metrics (if any) */}
            {aggregatedMetrics.google_ads_spend > 0 || aggregatedMetrics.google_ads_impressions > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" /> Google Ads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Gasto ($)</Label>
                      <Input type="number" step="0.01" defaultValue={aggregatedMetrics.google_ads_spend} {...register('google_spend', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Impresiones</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.google_ads_impressions} {...register('google_impressions', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clics</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.google_ads_clicks} {...register('google_clicks', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Conversiones</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.google_ads_conversions} {...register('google_conversions', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ingresos ($)</Label>
                      <Input type="number" step="0.01" defaultValue={aggregatedMetrics.google_ads_revenue} {...register('google_revenue', { valueAsNumber: true })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Meta Ads metrics (if any) */}
            {aggregatedMetrics.meta_ads_spend > 0 || aggregatedMetrics.meta_ads_impressions > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-violet-500" /> Meta Ads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Gasto ($)</Label>
                      <Input type="number" step="0.01" defaultValue={aggregatedMetrics.meta_ads_spend} {...register('meta_spend', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Impresiones</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.meta_ads_impressions} {...register('meta_impressions', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alcance</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.meta_ads_clicks} {...register('meta_clicks', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Conversiones</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.meta_ads_conversions} {...register('meta_conversions', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ingresos ($)</Label>
                      <Input type="number" step="0.01" defaultValue={aggregatedMetrics.meta_ads_revenue} {...register('meta_revenue', { valueAsNumber: true })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Totals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Métricas del sitio
                </CardTitle>
                <CardDescription>Completá manualmente si tenés los datos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Visitas totales</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.total_visits} {...register('total_visits', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Órdenes</Label>
                      <Input type="number" defaultValue={aggregatedMetrics.total_orders} {...register('total_orders', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Facturación ($)</Label>
                      <Input type="number" step="0.01" defaultValue={aggregatedMetrics.total_revenue} {...register('total_revenue', { valueAsNumber: true })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={3} {...register('context_notes')} placeholder="Notas sobre esta semana..." />
              </CardContent>
            </Card>

            {/* Campaign preview */}
            {(() => {
              const allCampaigns = pendingFiles.flatMap(f => f.parsed.campaigns.map(c => ({ ...c, _file: f.filename })));
              if (allCampaigns.length === 0) return null;
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Campañas detectadas ({allCampaigns.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-medium text-muted-foreground px-3 py-2">Nombre</th>
                          <th className="text-right font-medium text-muted-foreground px-3 py-2">Gasto</th>
                          <th className="text-right font-medium text-muted-foreground px-3 py-2">Impr.</th>
                          <th className="text-right font-medium text-muted-foreground px-3 py-2">Conv.</th>
                          <th className="text-right font-medium text-muted-foreground px-3 py-2">ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCampaigns.map((c, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-1.5 truncate max-w-[200px]" title={c.name}>{c.name}</td>
                            <td className="px-3 py-1.5 text-right">${c.cost.toFixed(0)}</td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground">{c.impressions.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right">{c.conversions}</td>
                            <td className="px-3 py-1.5 text-right font-medium">{c.roas.toFixed(1)}x</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Upload results */}
            {saveResults && (
              <Card>
                <CardContent className="py-3 px-4 space-y-1">
                  {saveResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.status === 'ok'
                        ? <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                        : <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                      }
                      <span className={r.status === 'ok' ? 'text-muted-foreground' : 'text-red-600'}>{r.filename}</span>
                      {r.error && <span className="text-red-500">— {r.error}</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {saveError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Overwrite confirmation */}
            {confirmOverwrite === null && existingData && (
              <Card className="border-amber-300 bg-amber-500/5">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Ya existen datos para esta semana</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Esta semana ya tiene datos cargados. ¿Qué querés hacer?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => { confirmRef.current = false; setConfirmOverwrite(false); setExistingData(false); }}>
                      Cancelar
                    </Button>
                    <Button type="button" variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600"
                      onClick={async () => { confirmRef.current = true; setConfirmOverwrite(true); await onSubmit(getValues() as WizardData, true); }}>
                      Sobrescribir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <CardFooter className="flex-col gap-3 px-0">
              <Button type="submit" className="w-full gap-2" disabled={saving || !clientId || !allDatesFilled || (existingData && confirmOverwrite === null)}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Guardando {pendingFiles.length} archivo(s)...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Guardar {pendingFiles.length} archivo(s) en Supabase</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Los datos se guardarán vinculados al cliente seleccionado y aparecerán en el dashboard y calendario.
              </p>
            </CardFooter>
          </>
        )}

        {/* Step 1 navigation hint */}
        {step === 1 && (
          <div className="flex justify-between mt-4">
            <div />
            {parsingFiles ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Analizando archivos...
              </span>
            ) : pendingFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center flex-1">
                Subí uno o más archivos CSV para continuar
              </p>
            ) : null}
          </div>
        )}
      </form>
    </div>
  );
}
