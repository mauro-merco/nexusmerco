'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyInputs, useUploadedFiles } from '@/lib/hooks/use-data';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, TrendingUp, Target, ShoppingCart, MousePointerClick,
  Users, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  BarChart3, CalendarDays, FileText, Cloud, Activity, AlertTriangle,
} from 'lucide-react';

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

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

interface MonthlySummaryProps {
  clientId: string;
}

export function MonthlySummary({ clientId }: MonthlySummaryProps) {
  const { data: allWeeks, loading } = useWeeklyInputs(clientId);
  const { data: uploadedFiles } = useUploadedFiles(clientId);

  const months = useMemo(() => {
    if (!allWeeks) return [];
    const grouped = new Map<string, Array<Record<string, unknown>>>();
    for (const w of allWeeks) {
      const ws = String(w.week_start_date || '');
      const month = ws.slice(0, 7);
      if (!grouped.has(month)) grouped.set(month, []);
      grouped.get(month)!.push(w);
    }
    return Array.from(grouped.entries())
      .map(([month, weeks]) => ({
        month,
        weeks,
        totals: {
          spend: weeks.reduce((s, w) => s + safeNum(w.google_ads_spend) + safeNum(w.meta_ads_spend), 0),
          revenue: weeks.reduce((s, w) => s + (safeNum(w.total_revenue) || safeNum(w.google_ads_revenue) + safeNum(w.meta_ads_revenue)), 0),
          impressions: weeks.reduce((s, w) => s + safeNum(w.google_ads_impressions) + safeNum(w.meta_ads_impressions), 0),
          clicks: weeks.reduce((s, w) => s + safeNum(w.google_ads_clicks) + safeNum(w.meta_ads_clicks), 0),
          conversions: weeks.reduce((s, w) => s + safeNum(w.google_ads_conversions) + safeNum(w.meta_ads_conversions), 0),
          visits: weeks.reduce((s, w) => s + safeNum(w.total_visits), 0),
          orders: weeks.reduce((s, w) => s + safeNum(w.total_orders), 0),
        },
        fileCount: uploadedFiles?.filter(f => String(f.week_start_date || '').startsWith(month)).length || 0,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [allWeeks, uploadedFiles]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(months.length > 0 ? months[0].month : null);
  const currentMonth = useMemo(() => months.find(m => m.month === selectedMonth), [months, selectedMonth]);
  const monthIdx = useMemo(() => months.findIndex(m => m.month === selectedMonth), [months, selectedMonth]);

  const monthFiles = useMemo(() => {
    if (!selectedMonth || !uploadedFiles) return [];
    return uploadedFiles.filter(f => String(f.week_start_date || '').startsWith(selectedMonth));
  }, [selectedMonth, uploadedFiles]);

  const monthNames: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
  };
  function fmtMonth(m: string) {
    const [y, mo] = m.split('-');
    return `${monthNames[mo] || mo} ${y}`;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Resumen Mensual</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  if (months.length === 0) return null;

  const m = currentMonth;
  if (!m) return null;

  const t = m.totals;
  const roas = t.spend > 0 ? t.revenue / t.spend : 0;
  const cpa = t.conversions > 0 ? t.spend / t.conversions : 0;
  const cr = t.visits > 0 ? t.orders / t.visits : 0;
  const aov = t.orders > 0 ? t.revenue / t.orders : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Vista Mensual
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={() => { const idx = months.findIndex(mo => mo.month === selectedMonth); if (idx < months.length - 1) setSelectedMonth(months[idx + 1].month); }}
            disabled={monthIdx >= months.length - 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{fmtMonth(m.month)}</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={() => { const idx = months.findIndex(mo => mo.month === selectedMonth); if (idx > 0) setSelectedMonth(months[idx - 1].month); }}
            disabled={monthIdx <= 0}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Facturación</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(t.revenue)}</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Inversión</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(t.spend)}</p>
          </div>
          <div className="rounded-lg bg-violet-500/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">ROAS</p>
            <p className="text-lg font-bold text-violet-600">{roas.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg bg-orange-500/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Conversiones</p>
            <p className="text-lg font-bold text-orange-600">{formatNumber(t.conversions)}</p>
          </div>
          <div className="rounded-lg bg-cyan-500/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">CPA</p>
            <p className="text-lg font-bold text-cyan-600">{formatCurrency(cpa)}</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">CR</p>
            <p className="text-lg font-bold text-rose-600">{(cr * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Weekly breakdown chart */}
        {m.weeks.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.weeks.map(w => ({
                week: String(w.week_start_date || '').slice(5),
                spend: safeNum(w.google_ads_spend) + safeNum(w.meta_ads_spend),
                revenue: safeNum(w.total_revenue) || safeNum(w.google_ads_revenue) + safeNum(w.meta_ads_revenue),
              })).sort((a, b) => a.week.localeCompare(b.week))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(value) => [formatCurrency(Number(value) || 0)]} />
                <Bar dataKey="revenue" name="Facturación" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spend" name="Inversión" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* File list for the month */}
        {monthFiles.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Archivos del mes ({monthFiles.length})
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {monthFiles.map((f) => {
                const st = String(f.source_type || '');
                const summary = (f.summary as Record<string, unknown>) || {};
                return (
                  <div key={String(f.id)} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary/50" />
                      <span className="truncate font-medium">{String(f.filename || '')}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                        {st.replace(/_/g, ' ')}
                      </Badge>
                      {!!f.week_start_date && <span className="text-muted-foreground shrink-0">{String(f.week_start_date)}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                      {safeNum(summary.spend) > 0 && <span>{formatCurrency(safeNum(summary.spend))}</span>}
                      {Number(f.row_count) > 0 && <span>{Number(f.row_count)} filas</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
