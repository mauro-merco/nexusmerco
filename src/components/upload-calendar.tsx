'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { useWeeklyInputs, useCampaignMetrics, useGa4Traffic, useGcMetrics, useUploadedFiles } from '@/lib/hooks/use-data';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Trash2, CalendarDays, AlertCircle, FileText, Cloud, BarChart3, Activity, Download, Info } from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  google_ads_campaign: 'Google Ads - Campañas',
  google_ads_adgroup: 'Google Ads - Grupos',
  google_ads_ad: 'Google Ads - Anuncios',
  google_ads_keyword: 'Google Ads - Keywords',
  google_ads_resource: 'Google Ads - Recursos',
  meta_ads_campaign: 'Meta Ads - Campañas',
  meta_ads_adset: 'Meta Ads - Conjuntos',
  meta_ads_ad: 'Meta Ads - Anuncios',
  google_analytics: 'GA4 - Tráfico',
  gc_management: 'Gestión Comercial',
};

const SOURCE_COLORS: Record<string, string> = {
  google_ads_campaign: 'bg-blue-500',
  google_ads_adgroup: 'bg-blue-500',
  google_ads_ad: 'bg-blue-500',
  google_ads_keyword: 'bg-blue-500',
  google_ads_resource: 'bg-blue-500',
  meta_ads_campaign: 'bg-violet-500',
  meta_ads_adset: 'bg-violet-500',
  meta_ads_ad: 'bg-violet-500',
  google_analytics: 'bg-emerald-500',
  gc_management: 'bg-orange-500',
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  google_ads_campaign: BarChart3,
  google_ads_adgroup: BarChart3,
  google_ads_ad: BarChart3,
  google_ads_keyword: BarChart3,
  google_ads_resource: BarChart3,
  meta_ads_campaign: Cloud,
  meta_ads_adset: Cloud,
  meta_ads_ad: Cloud,
  google_analytics: Activity,
  gc_management: FileText,
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(n));
}

function safeNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

function sourceGroup(source: string): string {
  if (source.startsWith('google_ads')) return 'google_ads';
  if (source.startsWith('meta_ads')) return 'meta_ads';
  return source;
}

function MonthGrid({
  year, month,
  weeks,
  onDayClick,
  selectedDate,
  uploadedFiles,
}: {
  year: number; month: number;
  weeks: Array<Record<string, unknown>>;
  onDayClick: (date: string) => void;
  selectedDate: string | null;
  uploadedFiles: Array<Record<string, unknown>>;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const dayMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const f of uploadedFiles) {
      const ws = String(f.week_start_date || '');
      if (!ws.startsWith(monthStr)) continue;
      if (!map.has(ws)) map.set(ws, new Set());
      const sg = sourceGroup(String(f.source_type || ''));
      map.get(ws)!.add(sg);
    }
    return map;
  }, [uploadedFiles, monthStr]);

  const days: Array<{ day: number; date: string; types: Set<string>; isToday: boolean }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const types = dayMap.get(dateStr) || new Set();
    const today = new Date();
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    days.push({ day: d, date: dateStr, types, isToday });
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {dayNames.map((n) => (
          <div key={n} className="text-center text-[10px] font-medium text-muted-foreground py-1">{n}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => d.types.size > 0 && onDayClick(d.date)}
            disabled={d.types.size === 0}
            className={cn(
              'relative flex flex-col items-center justify-center py-1.5 rounded-md text-xs transition-colors',
              d.types.size > 0
                ? 'hover:bg-accent cursor-pointer'
                : 'text-muted-foreground/40',
              d.date === selectedDate && 'ring-2 ring-primary bg-accent',
              d.isToday && 'font-bold',
            )}
          >
            <span className={cn('text-sm', d.types.size > 0 ? 'font-medium' : '')}>
              {d.day}
            </span>
            {d.types.size > 0 && (
              <div className="flex gap-0.5 mt-0.5">
                {Array.from(d.types).map((t) => {
                  const dotColor = t === 'google_ads' ? 'bg-blue-500' : t === 'meta_ads' ? 'bg-violet-500' : t === 'ga4' ? 'bg-emerald-500' : 'bg-orange-500';
                  return <span key={t} className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />;
                })}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface UploadCalendarProps {
  clientId: string;
}

export function UploadCalendar({ clientId }: UploadCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const { data: uploadedFiles, loading: filesLoading, refetch: refetchFiles } = useUploadedFiles(clientId);

  const monthFiles = useMemo(() => {
    if (!uploadedFiles) return [];
    return uploadedFiles.filter((f) => {
      const ws = String(f.week_start_date || '');
      const m = String(f.month || '');
      return ws.startsWith(monthStr) || m.includes(monthStr);
    });
  }, [uploadedFiles, monthStr]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
    setDeleteMsg(null);
  }, []);

  const dayFiles = useMemo(() => {
    if (!selectedDate || !uploadedFiles) return [];
    return uploadedFiles.filter((f) => String(f.week_start_date) === selectedDate);
  }, [selectedDate, uploadedFiles]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    setDeleting(fileId);
    setDeleteMsg(null);
    try {
      const res = await fetch(`/api/uploaded-files/${fileId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDeleteMsg('Archivo eliminado');
      refetchFiles();
    } catch (e) {
      setDeleteMsg('Error: ' + (e instanceof Error ? e.message : 'Error'));
    } finally {
      setDeleting(null);
    }
  }, [refetchFiles]);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Archivos Subidos
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <MonthGrid
                year={viewYear} month={viewMonth}
                weeks={[]}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
                uploadedFiles={uploadedFiles || []}
              />

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Google Ads</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Meta Ads</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> GA4</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> GC</div>
              </div>

              {/* File list for the month */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Archivos de {monthNames[viewMonth].toLowerCase()}
                    <span className="text-muted-foreground font-normal">({monthFiles.length})</span>
                  </h3>
                  {selectedDate && dayFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">Mostrando filtrado por día</span>
                  )}
                </div>
                {monthFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No hay archivos subidos este mes</p>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {monthFiles.map((f) => {
                      const st = String(f.source_type || '');
                      const label = SOURCE_LABELS[st] || st;
                      const Icon = SOURCE_ICONS[st] || FileText;
                      const summary = (f.summary as Record<string, unknown>) || {};
                      return (
                        <div key={String(f.id)} className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors hover:bg-muted/30',
                          selectedDate === String(f.week_start_date) && 'ring-1 ring-primary bg-accent/20'
                        )}>
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={cn('rounded-md p-1.5 shrink-0', SOURCE_COLORS[st] + '/10')}>
                              <Icon className={cn('h-3.5 w-3.5', st.startsWith('google') ? 'text-blue-600' : st.startsWith('meta') ? 'text-violet-600' : st === 'google_analytics' ? 'text-emerald-600' : 'text-orange-600')} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{String(f.filename || '')}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {label}
                                {!!f.week_start_date && <span className="ml-2">&middot; {String(f.week_start_date)}</span>}
                                {!!f.row_count && Number(f.row_count) > 0 && <span className="ml-2">&middot; {Number(f.row_count)} filas</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {safeNum(summary.spend) > 0 && (
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">{formatCurrency(safeNum(summary.spend))}</span>
                            )}
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => handleDeleteFile(String(f.id))}
                              disabled={deleting === String(f.id)}
                            >
                              {deleting === String(f.id) ? <span className="text-[10px]">...</span> : <Trash2 className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => { if (!open) { setSelectedDate(null); setDeleteMsg(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </DialogTitle>
          <DialogDescription>
            Archivos subidos para esta fecha
          </DialogDescription>

          {deleteMsg && (
            <div className={cn(
              'text-sm p-3 rounded-lg flex items-center gap-2',
              deleteMsg.startsWith('Error') ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
            )}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              {deleteMsg}
            </div>
          )}

          <div className="space-y-2 py-2">
            {dayFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin archivos para esta fecha</p>
            ) : (
              dayFiles.map((f) => {
                const st = String(f.source_type || '');
                const label = SOURCE_LABELS[st] || st;
                const Icon = SOURCE_ICONS[st] || FileText;
                const summary = (f.summary as Record<string, unknown>) || {};
                return (
                  <div key={String(f.id)} className="flex items-start justify-between rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-lg p-2 shrink-0', SOURCE_COLORS[st] + '/10')}>
                        <Icon className={cn('h-4 w-4', st.startsWith('google') ? 'text-blue-600' : st.startsWith('meta') ? 'text-violet-600' : st === 'google_analytics' ? 'text-emerald-600' : 'text-orange-600')} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{String(f.filename || '')}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        {safeNum(summary.spend) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Gasto: {formatCurrency(safeNum(summary.spend))}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
                      onClick={() => handleDeleteFile(String(f.id))}
                      disabled={deleting === String(f.id)}
                    >
                      {deleting === String(f.id) ? '...' : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cerrar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
