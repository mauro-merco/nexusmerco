'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { inferFileMetadata, normalizeSource, type InferredFile } from '@/lib/folder-inference';
import { parseCSV } from '@/lib/csv-parser';
import { cn } from '@/lib/utils';
import {
  Upload, Loader2, AlertCircle, FolderOpen, Check, FileText,
  BarChart3, Cloud, Activity, X, Trash2,
} from 'lucide-react';

const SOURCE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  google_ads: { label: 'Google Ads', icon: BarChart3, color: 'text-blue-500' },
  meta_ads: { label: 'Meta Ads', icon: Cloud, color: 'text-violet-500' },
  google_analytics: { label: 'GA4', icon: Activity, color: 'text-emerald-500' },
  gc_management: { label: 'Gestión Comercial', icon: FileText, color: 'text-orange-500' },
};

export function FolderUpload() {
  const [step, setStep] = useState<'select' | 'review' | 'uploading' | 'done'>('select');
  const [inferredFiles, setInferredFiles] = useState<(InferredFile & { rawText: string })[]>([]);
  const [clientOverride, setClientOverride] = useState<string>('');
  const [results, setResults] = useState<{ filename: string; status: 'ok' | 'error'; error?: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const user = useAuthStore((s) => s.user);
  const { clients } = useClients();

  function readFileAsUTF8(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arr = new Uint8Array(reader.result as ArrayBuffer);
          resolve(new TextDecoder('utf-8').decode(arr));
        } catch { reject(new Error('Error de codificación')); }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStep('review');
    const csvFiles = Array.from(files).filter(f => f.name.endsWith('.csv'));
    const parsed: (InferredFile & { rawText: string })[] = [];

    for (const file of csvFiles) {
      const text = await readFileAsUTF8(file);
      const inferred = inferFileMetadata({
        relativePath: file.webkitRelativePath,
        filename: file.name,
      });
      parsed.push({ ...inferred, rawText: text });
    }

    setInferredFiles(parsed);
    setClientOverride(parsed[0]?.clientName || '');
    e.target.value = '';
  }

  function resolveClientId(): string | null {
    const name = clientOverride.trim().toLowerCase();
    if (!name) return null;
    const found = clients.find(c => c.name.toLowerCase() === name);
    return found?.id || null;
  }

  async function handleUpload() {
    const clientId = resolveClientId();
    if (!clientId) {
      setUploadError('No se encontró un cliente con ese nombre. Creá el cliente primero o seleccioná otro nombre.');
      return;
    }

    setStep('uploading');
    setUploadProgress({ done: 0, total: inferredFiles.length });
    setUploadError(null);
    const res: typeof results = [];

    for (const f of inferredFiles) {
      try {
        const parsed = parseCSV(f.rawText);
        const source = normalizeSource(f.sourceType);

        const body: Record<string, unknown> = {
          client_id: clientId,
          week_start_date: f.dateFrom || '',
          date_from: f.dateFrom || '',
          date_to: f.dateTo || f.dateFrom || '',
          source_type: source,
          csv_data_raw: f.rawText,
          filename: f.filename,
          created_by: user?.id,
        };

        const resp = await fetch('/api/upload-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Error');
        res.push({ filename: f.filename, status: 'ok' });
      } catch (e) {
        res.push({ filename: f.filename, status: 'error', error: e instanceof Error ? e.message : 'Error' });
      }
      setUploadProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setResults(res);
    setStep('done');
  }

  function clearAll() {
    setStep('select');
    setInferredFiles([]);
    setClientOverride('');
    setResults([]);
    setUploadError(null);
    setUploadProgress({ done: 0, total: 0 });
  }

  // --- Select step ---
  if (step === 'select') {
    return (
      <Card className="border-2 border-dashed border-border">
        <CardHeader className="pb-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-2">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Subir carpeta completa</CardTitle>
          <CardDescription>
            Seleccioná la carpeta raíz del cliente. El sistema detectará automáticamente la fuente, fechas y tipo de cada archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-6">
          <p className="text-xs text-muted-foreground text-center max-w-md">
            Estructura esperada: <code className="bg-muted px-1 py-0.5 rounded">cliente/fuente/mensual|semanal/...csv</code>
          </p>
          <input
            type="file"
            id="folder-input"
            className="hidden"
            // @ts-expect-error - webkitdirectory is not in TS types
            webkitdirectory=""
            accept=".csv"
            onChange={handleFolderSelect}
          />
          <Button
            type="button" variant="default" className="gap-2 cursor-pointer"
            onClick={() => document.getElementById('folder-input')?.click()}
          >
            <FolderOpen className="h-4 w-4" /> Seleccionar carpeta
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Review step ---
  if (step === 'review') {
    const bySource = groupBy(inferredFiles.map(f => normalizeSource(f.sourceType)));
    const clientId = resolveClientId();

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Archivos detectados</CardTitle>
              <CardDescription>
                {inferredFiles.length} archivos encontrados ·{' '}
                {Object.entries(bySource).map(([s, n]) => {
                  const cfg = SOURCE_LABELS[s] || { label: s, icon: FileText, color: 'text-gray-500' };
                  const Icon = cfg.icon;
                  return <span key={s} className="mr-3"><Icon className={cn('h-3 w-3 inline mr-0.5', cfg.color)} />{cfg.label} ({n})</span>;
                })}
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs text-red-500">
              <X className="h-3.5 w-3.5 mr-1" /> Cambiar carpeta
            </Button>
          </CardHeader>
          <CardContent className="pt-0 max-h-96 overflow-y-auto space-y-1">
            {inferredFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/50">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                <span className="text-muted-foreground truncate max-w-[200px] shrink-0" title={f.relativePath}>
                  {f.relativePath.replace(/\\/g, '/').split('/').slice(1).join('/')}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                  {SOURCE_LABELS[normalizeSource(f.sourceType)]?.label || f.sourceType}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                  {f.periodicity}
                </Badge>
                {f.dateFrom && (
                  <span className="text-muted-foreground shrink-0">{f.dateFrom}</span>
                )}
                {f.month && (
                  <span className="text-muted-foreground shrink-0">({f.month})</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Client name override */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cliente destino</CardTitle>
            <CardDescription>
              Nombre inferido de la carpeta: <strong>{inferredFiles[0]?.clientName || '—'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={clientOverride || null}
              onValueChange={(v) => { if (v) setClientOverride(v); }}
            >
              <SelectTrigger className="w-full justify-between">
                <span className="flex-1 text-left truncate">
                  {clientOverride
                    ? clients.find(c => c.name.toLowerCase() === clientOverride.toLowerCase())?.name || `${clientOverride} (crear)` : 'Seleccionar cliente'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!clientId && clientOverride && (
              <p className="text-xs text-amber-500 mt-2">
                Cliente &ldquo;{clientOverride}&rdquo; no encontrado. Creá el cliente primero en la sección Clientes.
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={clearAll}>Cancelar</Button>
            <Button onClick={handleUpload} variant="cta" disabled={!clientId}>
              <Upload className="h-4 w-4 mr-2" />
              Subir {inferredFiles.length} archivos
            </Button>
          </CardFooter>
        </Card>

        {uploadError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    );
  }

  // --- Uploading step ---
  if (step === 'uploading') {
    const pct = uploadProgress.total > 0 ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0;
    return (
      <Card>
        <CardHeader className="text-center pb-3">
          <CardTitle>Subiendo archivos...</CardTitle>
          <CardDescription>{uploadProgress.done} / {uploadProgress.total} archivos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="w-full max-w-sm bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">{pct}% completado</p>
        </CardContent>
      </Card>
    );
  }

  // --- Done step ---
  if (step === 'done') {
    const ok = results.filter(r => r.status === 'ok').length;
    const errs = results.filter(r => r.status === 'error');
    return (
      <Card>
        <CardHeader className="text-center">
          <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4',
            errs.length === 0 ? 'bg-emerald-500/20' : 'bg-amber-500/20')}>
            {errs.length === 0
              ? <Check className="h-6 w-6 text-emerald-500" />
              : <AlertCircle className="h-6 w-6 text-amber-500" />}
          </div>
          <CardTitle>{errs.length === 0 ? 'Todo listo' : `${ok} subidos, ${errs.length} errores`}</CardTitle>
          <CardDescription>
            {results.length} archivos procesados
          </CardDescription>
        </CardHeader>
        {errs.length > 0 && (
          <CardContent className="max-h-48 overflow-y-auto space-y-1">
            {errs.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-600 py-1">
                <X className="h-3 w-3 shrink-0" />
                <span className="truncate">{r.filename}</span>
                <span className="text-muted-foreground">{r.error}</span>
              </div>
            ))}
          </CardContent>
        )}
        <CardFooter className="justify-center gap-3">
          <Button onClick={clearAll} variant="cta">Subir otra carpeta</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Ir al dashboard</Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}

function groupBy<T>(arr: T[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const key = String(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}
