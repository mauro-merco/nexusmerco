'use client';

import { useState, useCallback, useRef } from 'react';
import { parseCSV, type ParsedMetrics } from '@/lib/csv-parser';
import { Upload, FileText, AlertCircle, CheckCircle2, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CSVUploadProps {
  onParsed: (data: ParsedMetrics) => void;
  onClear?: () => void;
}

export function CSVUpload({ onParsed, onClear }: CSVUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos CSV');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      const result = parseCSV(text);
      setParsed(result);
      onParsed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer el archivo');
      setParsed(null);
    } finally {
      setLoading(false);
    }
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setParsed(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  };

  return (
    <div className="space-y-3">
      {!parsed ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleInputChange}
          />
          {loading ? (
            <>
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analizando CSV...</p>
            </>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Arrastra tu CSV aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Informe de Google Ads o Google Analytics
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">CSV analizado correctamente</p>
                <p className="text-xs text-muted-foreground">
                  {parsed.source.startsWith('google_ads') ? 'Google Ads' : parsed.source.startsWith('meta_ads') ? 'Meta Ads' : parsed.source === 'google_analytics' ? 'Google Analytics' : parsed.source === 'gc_management' ? 'Gestión Comercial' : 'CSV'} — {parsed.campaigns.length} campañas
                  {parsed.dateRange.start ? ` — ${parsed.dateRange.start}` : ''}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs">
              Cambiar archivo
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBadge label="Inversión" value={`$${parsed.totals.cost.toFixed(2)}`} />
            <MetricBadge label="Impresiones" value={parsed.totals.impressions.toLocaleString()} />
            <MetricBadge label="Clics" value={parsed.totals.clicks.toLocaleString()} />
            <MetricBadge label="Conversiones" value={parsed.totals.conversions.toLocaleString()} />
            <MetricBadge label="Ingresos" value={`$${parsed.totals.revenue.toFixed(2)}`} />
            <MetricBadge label="CTR" value={`${parsed.totals.ctr.toFixed(2)}%`} />
            <MetricBadge label="CPC" value={`$${parsed.totals.cpc.toFixed(2)}`} />
            <MetricBadge label="ROAS" value={`${parsed.totals.roas.toFixed(2)}x`} />
          </div>

          {parsed.campaigns.length > 1 && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Ver campañas ({parsed.campaigns.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {parsed.campaigns.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span className="truncate flex-1">{c.name}</span>
                    <span className="text-muted-foreground ml-2">${c.cost.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
