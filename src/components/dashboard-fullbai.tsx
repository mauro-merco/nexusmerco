'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyInputs, useCampaignMetrics, useGa4Traffic, useGcMetrics } from '@/lib/hooks/use-data';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, Target, ShoppingCart, Eye, MousePointerClick,
  Users, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Lightbulb,
  BarChart3, PieChart, Activity, AlertTriangle, AlertCircle, Upload,
} from 'lucide-react';
import Link from 'next/link';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(n));
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function getWoWDiff(current: number, previous: number): { value: number; isPositive: boolean } | null {
  if (!previous) return null;
  const diff = ((current - previous) / previous) * 100;
  return { value: Math.abs(diff), isPositive: diff >= 0 };
}

function WoWBadge({ current, previous }: { current: number; previous: number }) {
  const wow = getWoWDiff(current, previous);
  if (!wow || wow.value === 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', wow.isPositive ? 'text-emerald-500' : 'text-red-500')}>
      {wow.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {wow.value.toFixed(0)}%
    </span>
  );
}

function KpiCard({
  title, value, subtitle, icon: Icon, trend, loading, color,
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType;
  trend?: React.ReactNode; loading?: boolean; color?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 md:p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-xl md:text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              {trend && <div className="pt-1">{trend}</div>}
            </div>
            <div className={cn('rounded-lg p-2.5', color || 'bg-primary/10')}>
              <Icon className={cn('h-4 w-4 md:h-5 md:w-5', color ? 'text-white' : 'text-primary')} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getWeekDates(startDate: string): string[] {
  if (!startDate) return [];
  const start = new Date(startDate);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }));
  }
  return dates;
}

function safeNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

interface DashboardFullbaiProps {
  clientId: string;
  clientName?: string;
}

export function DashboardFullbai({ clientId, clientName }: DashboardFullbaiProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const { data: allWeeks, loading: weeksLoading, error: weeksError, refetch: refetchWeeks } = useWeeklyInputs(clientId);
  const { data: campaigns, loading: campaignsLoading } = useCampaignMetrics(clientId, selectedWeek);
  const { data: traffic, loading: trafficLoading } = useGa4Traffic(clientId, selectedWeek);
  const { data: gcData, loading: gcLoading } = useGcMetrics(clientId);

  console.log('[Dashboard] weeks:', allWeeks, 'weeksError:', weeksError, 'selectedWeek:', selectedWeek, 'clientId:', clientId);
  if (weeksError) console.error('[Dashboard] Error fetching weekly inputs:', weeksError);

  const weeks = useMemo(() => {
    if (!allWeeks) return [];
    return allWeeks.sort((a, b) => String(b.week_start_date).localeCompare(String(a.week_start_date)));
  }, [allWeeks]);

  const currentWeek = useMemo(() => {
    if (!weeks.length) return null;
    if (selectedWeek) return weeks.find(w => w.week_start_date === selectedWeek) || null;
    return weeks[0] || null;
  }, [weeks, selectedWeek]);

  const previousWeek = useMemo(() => {
    if (!currentWeek || weeks.length < 2) return null;
    const idx = weeks.findIndex(w => w.week_start_date === currentWeek.week_start_date);
    return idx < weeks.length - 1 ? weeks[idx + 1] : null;
  }, [currentWeek, weeks]);

  const weekIndex = useMemo(() => {
    if (!selectedWeek || !weeks.length) return weeks.length > 0 ? 0 : -1;
    return weeks.findIndex(w => w.week_start_date === selectedWeek);
  }, [selectedWeek, weeks]);

  const navPrev = useCallback(() => {
    if (weekIndex < weeks.length - 1) setSelectedWeek(String(weeks[weekIndex + 1].week_start_date));
  }, [weekIndex, weeks]);

  const navNext = useCallback(() => {
    if (weekIndex > 0) setSelectedWeek(String(weeks[weekIndex - 1].week_start_date));
  }, [weekIndex, weeks]);

  // Initialize selectedWeek on load
  const [init, setInit] = useState(false);
  if (!init && !selectedWeek && weeks.length > 0) {
    setSelectedWeek(String(weeks[0].week_start_date));
    setInit(true);
  }

  const trendChartData = useMemo(() => {
    return weeks.slice().reverse().map(w => {
      const spend = safeNum(w.google_ads_spend) + safeNum(w.meta_ads_spend);
      const revenue = safeNum(w.total_revenue) || safeNum(w.google_ads_revenue) + safeNum(w.meta_ads_revenue);
      return {
        week: String(w.week_start_date).slice(5),
        spend,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        conversions: safeNum(w.google_ads_conversions) + safeNum(w.meta_ads_conversions),
        impressions: safeNum(w.google_ads_impressions) + safeNum(w.meta_ads_impressions),
      };
    });
  }, [weeks]);

  const currentWeekCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.map(c => ({
      name: String(c.campaign_name || ''),
      type: String(c.campaign_type || ''),
      platform: String(c.platform || ''),
      impressions: safeNum(c.impressions),
      clicks: safeNum(c.clicks),
      cost: safeNum(c.cost),
      conversions: safeNum(c.conversions),
      revenue: safeNum(c.revenue),
      ctr: safeNum(c.ctr),
      cpc: safeNum(c.cpc),
      roas: safeNum(c.roas),
    }));
  }, [campaigns]);

  if (weeksError) {
    return (
      <Card className="border-red-300 bg-red-500/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-red-600 gap-3">
          <AlertCircle className="h-12 w-12 opacity-50" />
          <p className="text-lg font-medium">Error al cargar datos</p>
          <p className="text-sm text-red-500">{weeksError}</p>
          <Button variant="outline" size="sm" onClick={() => refetchWeeks()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  if (weeksLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-7 w-28" /></div></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!weeks.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Upload className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No hay datos todavía</p>
          <p className="text-sm">Cargá un CSV con métricas semanales usando el asistente para ver el dashboard.</p>
          <Link href="/wizard">
            <Button variant="default" className="gap-2 mt-2">
              <Upload className="h-4 w-4" /> Ir al Asistente de Carga
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const cw = currentWeek as Record<string, unknown> | null;
  const pw = previousWeek as Record<string, unknown> | null;

  const cwGoogleSpend = safeNum(cw?.google_ads_spend);
  const cwMetaSpend = safeNum(cw?.meta_ads_spend);
  const cwTotalSpend = cwGoogleSpend + cwMetaSpend;
  const cwRevenue = safeNum(cw?.total_revenue) || (safeNum(cw?.google_ads_revenue) + safeNum(cw?.meta_ads_revenue));
  const cwConversions = safeNum(cw?.google_ads_conversions) + safeNum(cw?.meta_ads_conversions);
  const cwImpressions = safeNum(cw?.google_ads_impressions) + safeNum(cw?.meta_ads_impressions);
  const cwClicks = safeNum(cw?.google_ads_clicks) + safeNum(cw?.meta_ads_clicks);
  const cwVisits = safeNum(cw?.total_visits);
  const cwOrders = safeNum(cw?.total_orders) || cwConversions;
  const cwCR = cwVisits > 0 ? cwOrders / cwVisits : 0;
  const cwCPA = cwConversions > 0 ? cwTotalSpend / cwConversions : 0;
  const cwROAS = cwTotalSpend > 0 ? cwRevenue / cwTotalSpend : 0;
  const cwAOV = cwOrders > 0 ? cwRevenue / cwOrders : 0;

  const pwTotalSpend = pw ? safeNum(pw.google_ads_spend) + safeNum(pw.meta_ads_spend) : 0;
  const pwRevenue = pw ? safeNum(pw.total_revenue) || (safeNum(pw.google_ads_revenue) + safeNum(pw.meta_ads_revenue)) : 0;
  const pwConversions = pw ? safeNum(pw.google_ads_conversions) + safeNum(pw.meta_ads_conversions) : 0;

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold">
            {clientName || 'Dashboard'}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {currentWeek?.week_start_date as string || ''}
            {currentWeek && ` — ${(currentWeek?.week_start_date as string || '').slice(0, 7) === '2026-05' ? 'Semana ' + Math.ceil(parseInt((currentWeek?.week_start_date as string || '').slice(-2)) / 7) : ''}`}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navPrev} disabled={weekIndex >= weeks.length - 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {currentWeek ? new Date(currentWeek.week_start_date as string + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </span>
          <Button variant="outline" size="icon" onClick={navNext} disabled={weekIndex <= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Facturación"
          value={formatCurrency(cwRevenue)}
          subtitle={cwTotalSpend > 0 ? `Inversión: ${formatCurrency(cwTotalSpend)}` : undefined}
          icon={DollarSign}
          color="bg-emerald-500/10"
          trend={pw ? <WoWBadge current={cwRevenue} previous={pwRevenue} /> : undefined}
        />
        <KpiCard
          title="ROAS"
          value={cwROAS.toFixed(2) + 'x'}
          subtitle="Retorno sobre inversión"
          icon={TrendingUp}
          color="bg-blue-500/10"
          trend={pw ? <WoWBadge current={cwROAS} previous={pwTotalSpend > 0 ? pwRevenue / pwTotalSpend : 0} /> : undefined}
        />
        <KpiCard
          title="CPA"
          value={formatCurrency(cwCPA)}
          subtitle="Costo por conversión"
          icon={Target}
          color="bg-violet-500/10"
          trend={pw ? <WoWBadge current={cwCPA} previous={pwConversions > 0 ? pwTotalSpend / pwConversions : 0} /> : undefined}
        />
        <KpiCard
          title="Ticket Prom."
          value={formatCurrency(cwAOV)}
          subtitle="Valor por orden"
          icon={ShoppingCart}
          color="bg-orange-500/10"
        />
        <KpiCard
          title="Conversiones"
          value={formatNumber(cwConversions)}
          subtitle={`${formatNumber(cwClicks)} clics`}
          icon={MousePointerClick}
          color="bg-cyan-500/10"
          trend={pw ? <WoWBadge current={cwConversions} previous={pwConversions} /> : undefined}
        />
        <KpiCard
          title="CR"
          value={formatPercent(cwCR)}
          subtitle={`${formatNumber(cwVisits || cwClicks)} visitas`}
          icon={Users}
          color="bg-rose-500/10"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue/Spend Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Tendencia Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" style={{ position: 'relative', minHeight: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value, name) => [formatCurrency(Number(value) || 0), name === 'spend' ? 'Inversión' : 'Facturación']}
                  />
                  <Bar dataKey="revenue" name="Facturación" fill="var(--color-emerald-500, #10b981)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spend" name="Inversión" fill="var(--color-blue-500, #3b82f6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ROAS Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> ROAS Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" style={{ position: 'relative', minHeight: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value, name) => [name === 'roas' ? (Number(value) || 0).toFixed(2) + 'x' : formatCurrency(Number(value) || 0)]} />
                  <Area
                    type="monotone" dataKey="roas" name="ROAS (Ingreso/Inversión)"
                    fill="var(--color-emerald-500, #10b981)" fillOpacity={0.15}
                    stroke="var(--color-emerald-500, #10b981)" strokeWidth={2}
                    dot={{ r: 4, fill: 'var(--color-emerald-500, #10b981)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Campañas {currentWeek ? `(${new Date(currentWeek.week_start_date as string + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaignsLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : currentWeekCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <AlertTriangle className="h-8 w-8 opacity-30" />
              <p className="text-sm">No hay campañas para esta semana</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Campaña</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">Impr.</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">Clics</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">CTR</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">Gasto</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">CPC</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">Conv.</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">CPA</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">Ingresos</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-3">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWeekCampaigns.map((c, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[200px]">{c.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                            {c.platform === 'google_ads' ? 'Google' : 'Meta'}
                          </Badge>
                        </div>
                      </td>
                      <td className="text-right px-3 py-2.5 text-muted-foreground">{formatNumber(c.impressions)}</td>
                      <td className="text-right px-3 py-2.5 text-muted-foreground">{formatNumber(c.clicks)}</td>
                      <td className="text-right px-3 py-2.5">{(c.ctr * 100).toFixed(1)}%</td>
                      <td className="text-right px-3 py-2.5 font-medium">{formatCurrency(c.cost)}</td>
                      <td className="text-right px-3 py-2.5 text-muted-foreground">{formatCurrency(c.cpc)}</td>
                      <td className="text-right px-3 py-2.5">{c.conversions}</td>
                      <td className="text-right px-3 py-2.5 text-muted-foreground">{c.conversions > 0 ? formatCurrency(c.cost / c.conversions) : '-'}</td>
                      <td className="text-right px-3 py-2.5 font-medium">{c.revenue > 0 ? formatCurrency(c.revenue) : '-'}</td>
                      <td className="text-right px-3 py-2.5">
                        <span className={cn('font-semibold', c.roas >= 1 ? 'text-emerald-500' : 'text-red-500')}>
                          {c.roas > 0 ? c.roas.toFixed(1) + 'x' : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two column bottom: Traffic + GC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" /> Tráfico por Fuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trafficLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : !traffic || traffic.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin datos de tráfico</p>
            ) : (
              <div className="space-y-2">
                {traffic.slice(0, 8).map((t, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between py-2 px-3 rounded-lg',
                    'hover:bg-muted/30 transition-colors'
                  )}>
                    <span className="text-sm truncate max-w-[200px]">{String(t.source || '')}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{formatNumber(safeNum(t.sessions))} sesiones</span>
                      <span className="font-medium">{safeNum(t.events) > 0 ? formatNumber(safeNum(t.events)) + ' conv' : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GC: Gestión Comercial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Gestión Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gcLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : !gcData || gcData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin datos de gestión comercial</p>
            ) : (
              <div className="space-y-4">
                {(gcData as Array<Record<string, unknown>>).map((gc, i) => {
                  const daily = (gc.gc_daily as Array<Record<string, unknown>>) || [];
                  const accumulatedSpend = daily.reduce((sum, d) => sum + safeNum(d.inversion), 0);
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge>{String(gc.month || '')}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Proy. Fact: {formatCurrency(safeNum(gc.proy_facturacion))}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">Proy. CPA</p>
                          <p className="text-sm font-semibold">{formatCurrency(safeNum(gc.proy_cpa))}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">Proy. ROAS</p>
                          <p className="text-sm font-semibold">{safeNum(gc.proy_roas_tiendas).toFixed(2)}x</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">Inversión Acum.</p>
                          <p className="text-sm font-semibold">{formatCurrency(accumulatedSpend)}</p>
                        </div>
                      </div>
                      {daily.length > 0 && (
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={daily.map(d => ({ ...d, dia: `D${d.dia}` }))}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                              <XAxis dataKey="dia" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => formatCurrency(v)} />
                              <Tooltip contentStyle={{ fontSize: 11 }} />
                              <Line type="monotone" dataKey="facturacion" name="Fact. Diaria" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Smart Suggestions */}
      {currentWeekCampaigns.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-50/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Sugerencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const suggestions: Array<{ text: string; type: 'positive' | 'negative' | 'info' }> = [];

                const totalConv = currentWeekCampaigns.reduce((s, c) => s + c.conversions, 0);
                const totalCost = currentWeekCampaigns.reduce((s, c) => s + c.cost, 0);
                const zeroConv = currentWeekCampaigns.filter(c => c.conversions === 0 && c.cost > 0);
                const highSpend = currentWeekCampaigns.filter(c => c.cost > totalCost / currentWeekCampaigns.length && c.roas < 1);

                if (zeroConv.length > 0) {
                  suggestions.push({
                    text: `${zeroConv.length} campañas sin conversiones ($${formatCurrency(zeroConv.reduce((s, c) => s + c.cost, 0))} gastados). Revisar segmentación.`,
                    type: 'negative',
                  });
                }
                if (highSpend.length > 0) {
                  highSpend.slice(0, 2).forEach(c => {
                    suggestions.push({
                      text: `"${c.name}" tiene ROAS de ${c.roas.toFixed(1)}x con ${formatCurrency(c.cost)} gastados. Considerar pausar.`,
                      type: 'negative',
                    });
                  });
                }
                const bestCampaign = [...currentWeekCampaigns].sort((a, b) => b.roas - a.roas)[0];
                if (bestCampaign && bestCampaign.roas > 2) {
                  suggestions.push({
                    text: `"${bestCampaign.name}" tiene el mejor ROAS (${bestCampaign.roas.toFixed(1)}x). Escalar presupuesto.`,
                    type: 'positive',
                  });
                }
                if (cwROAS < 1) {
                  suggestions.push({
                    text: 'ROAS general menor a 1x. Revisar estrategia de pujas y segmentación.',
                    type: 'negative',
                  });
                } else if (cwROAS > 4) {
                  suggestions.push({
                    text: `ROAS general de ${cwROAS.toFixed(1)}x. Excelente rendimiento. Considerar aumentar inversión.`,
                    type: 'positive',
                  });
                }

                if (suggestions.length === 0) {
                  suggestions.push({
                    text: 'Sin sugerencias específicas para esta semana.',
                    type: 'info',
                  });
                }

                return suggestions.map((s, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-2 p-3 rounded-lg text-sm',
                    s.type === 'positive' ? 'bg-emerald-500/10 text-emerald-600' :
                    s.type === 'negative' ? 'bg-red-500/10 text-red-600' :
                    'bg-muted/30 text-muted-foreground'
                  )}>
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{s.text}</span>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
