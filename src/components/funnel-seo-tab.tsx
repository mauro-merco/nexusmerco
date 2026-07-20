'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { cn } from '@/lib/utils';
import {
  Globe, Activity, Zap, DollarSign, Search, TrendingUp, ArrowDown,
  Timer, MousePointerClick, Target, Users, BarChart3, PieChartIcon, Eye,
  HelpCircle, Sparkles, Hash, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.round(n).toFixed(0);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtTime(s: number): string {
  if (s >= 60) return `${(s / 60).toFixed(1)}m`;
  return `${Math.round(s)}s`;
}

function CountUp({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useState(() => {
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  });
  return <>{prefix}{display.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

const CHANNEL_COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};
function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${MONTH_NAMES[mo] || mo} ${y}`;
}

interface Props { clientId: string; clientName?: string }

export function FunnelSeoTab({ clientId }: Props) {
  const [month, setMonth] = useState<string>('');
  const { data, loading } = useAnalytics(clientId, month || null);

  const months = [...new Set(data.map(d => d.month).filter(Boolean))].sort();

  // Aggregate calculations
  const funnel = useMemo(() => {
    const sessions = data.reduce((s, r) => s + r.sessions, 0);
    const engaged = data.reduce((s, r) => s + r.engaged_sessions, 0);
    const keyEvents = data.reduce((s, r) => s + r.key_events, 0);
    const revenue = data.reduce((s, r) => s + r.total_revenue, 0);
    return { sessions, engaged, keyEvents, revenue };
  }, [data]);

  const engRate = funnel.sessions > 0 ? funnel.engaged / funnel.sessions : 0;
  const keRate = funnel.sessions > 0 ? funnel.keyEvents / funnel.sessions : 0;
  const sessionToRevenueRate = funnel.sessions > 0 ? funnel.revenue / funnel.sessions : 0;

  // Organic-specific metrics
  const organicData = useMemo(() => data.filter(r =>
    r.source_medium?.toLowerCase().includes('organic')
  ), [data]);

  const organicTotals = useMemo(() => ({
    sessions: organicData.reduce((s, r) => s + r.sessions, 0),
    engaged: organicData.reduce((s, r) => s + r.engaged_sessions, 0),
    revenue: organicData.reduce((s, r) => s + r.total_revenue, 0),
    keyEvents: organicData.reduce((s, r) => s + r.key_events, 0),
    engagementRate: organicData.length > 0 ? organicData.reduce((s, r) => s + r.engagement_rate, 0) / organicData.length : 0,
    avgTime: organicData.length > 0 ? organicData.reduce((s, r) => s + r.avg_engagement_time, 0) / organicData.length : 0,
  }), [organicData]);

  // Engagement metrics
  const avgEngagementRate = data.length > 0 ? data.reduce((s, r) => s + r.engagement_rate, 0) / data.length : 0;
  const avgEngagementTime = data.length > 0 ? data.reduce((s, r) => s + r.avg_engagement_time, 0) / data.length : 0;
  const avgEventsPerSession = data.length > 0 ? data.reduce((s, r) => s + r.events_per_session, 0) / data.length : 0;

  // Monthly trend
  const monthlyAgg = useMemo(() => {
    const map = new Map<string, { sessions: number; engaged: number; keyEvents: number; revenue: number }>();
    data.forEach(r => {
      const m = r.month || 'unknown';
      const prev = map.get(m) || { sessions: 0, engaged: 0, keyEvents: 0, revenue: 0 };
      map.set(m, {
        sessions: prev.sessions + r.sessions,
        engaged: prev.engaged + r.engaged_sessions,
        keyEvents: prev.keyEvents + r.key_events,
        revenue: prev.revenue + r.total_revenue,
      });
    });
    return Array.from(map.entries()).sort().map(([m, v]) => ({
      month: m.length === 7 ? fmtMonth(m) : m,
      ...v,
    }));
  }, [data]);

  // Channel breakdown
  const channels = useMemo(() => data
    .filter(r => r.sessions > 0)
    .map((r, i) => ({
      source: r.source_medium,
      sessions: r.sessions,
      engaged: r.engaged_sessions,
      revenue: r.total_revenue,
      keyEvents: r.key_events,
      engagementRate: r.engagement_rate,
      avgTime: r.avg_engagement_time,
      eventsPerSession: r.events_per_session,
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
    }))
    .sort((a, b) => b.sessions - a.sessions), [data]);

  const channelSessionsTotal = channels.reduce((s, c) => s + c.sessions, 0);

  // Paid vs Organic grouping
  const paidSources = data.filter(r =>
    !r.source_medium?.toLowerCase().includes('organic') &&
    !r.source_medium?.toLowerCase().includes('direct') &&
    !r.source_medium?.toLowerCase().includes('referral') &&
    !r.source_medium?.toLowerCase().includes('email') &&
    !r.source_medium?.toLowerCase().includes('social') &&
    !r.source_medium?.toLowerCase().includes('newsletter')
  );
  const organicSources = data.filter(r =>
    r.source_medium?.toLowerCase().includes('organic')
  );
  const paidSessions = paidSources.reduce((s, r) => s + r.sessions, 0);
  const organicSessions = organicSources.reduce((s, r) => s + r.sessions, 0);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-muted/30 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse bg-muted/30 rounded-xl" />)}
      </div>
      <div className="h-64 animate-pulse bg-muted/30 rounded-xl" />
    </div>
  );

  return (
    <TooltipProvider delay={0}>
    <div className="space-y-6">

      {/* Header + Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">Embudo de Conversión & SEO</p>
            <p className="text-xs text-muted-foreground">Análisis detallado del flujo de usuarios y rendimiento orgánico</p>
          </div>
        </div>

        {months.length > 1 && (
          <div className="inline-flex items-center gap-1.5 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl p-1.5 shadow-sm">
            <button onClick={() => setMonth('')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${!month ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20 text-emerald-500 shadow-inner' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
              Todos
            </button>
            {months.map(m => (
              <button key={m} onClick={() => setMonth(m)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${month === m ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20 text-emerald-500 shadow-inner' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                {fmtMonth(m)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tooltip>
          <TooltipTrigger><KPICard icon={Globe} value={fmt(funnel.sessions)} label="Sesiones" gradient="#6366f1 #06b6d4" /></TooltipTrigger>
          <TooltipContent side="bottom">Total de sesiones en el sitio web durante el período seleccionado</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger><KPICard icon={Activity} value={`${(engRate * 100).toFixed(1)}%`} label="Tasa Engagement" gradient="#10b981 #06b6d4" /></TooltipTrigger>
          <TooltipContent side="bottom">Porcentaje de sesiones que tuvieron interacción (engagement rate)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger><KPICard icon={Timer} value={fmtTime(avgEngagementTime)} label="Tiempo Promedio" gradient="#a855f7 #d946ef" /></TooltipTrigger>
          <TooltipContent side="bottom">Duración promedio de las sesiones con interacción</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger><KPICard icon={Target} value={`${(keRate * 100).toFixed(1)}%`} label="Tasa Conversión" gradient="#f59e0b #ef4444" /></TooltipTrigger>
          <TooltipContent side="bottom">Porcentaje de sesiones que generaron un evento clave (conversión)</TooltipContent>
        </Tooltip>
      </div>

      {/* Funnel + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Detailed Funnel */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Embudo</CardTitle>
                <CardDescription className="text-[10px]">De visita a conversión — drop-off por etapa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 px-5 pb-6">
            {funnel.sessions === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin datos</p>
            ) : (
              <>
                {/* Stage 1 */}
                <FunnelStage
                  value={funnel.sessions} label="Sesiones" pct={100}
                  barColor="bg-gradient-to-r from-blue-500 to-cyan-400"
                  icon={<Globe className="h-3.5 w-3.5 text-blue-400" />}
                />
                <div className="flex items-center gap-2 pl-1 py-0.5">
                  <div className="h-4 w-px bg-gradient-to-b from-blue-500/30 to-emerald-500/30" />
                  <span className="text-[10px] text-muted-foreground/60">{(engRate * 100).toFixed(1)}% de retención</span>
                </div>

                {/* Stage 2 */}
                <FunnelStage
                  value={funnel.engaged} label="Con Interacción" pct={engRate * 100}
                  barColor="bg-gradient-to-r from-emerald-500 to-teal-400"
                  icon={<Activity className="h-3.5 w-3.5 text-emerald-400" />}
                />
                <div className="flex items-center gap-2 pl-1 py-0.5">
                  <div className="h-4 w-px bg-gradient-to-b from-emerald-500/30 to-amber-500/30" />
                  <span className="text-[10px] text-muted-foreground/60">{funnel.engaged > 0 ? ((funnel.keyEvents / funnel.engaged) * 100).toFixed(1) : 0}% conv. a evento</span>
                </div>

                {/* Stage 3 */}
                <FunnelStage
                  value={funnel.keyEvents} label="Eventos Clave" pct={keRate * 100}
                  barColor="bg-gradient-to-r from-amber-500 to-orange-400"
                  icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
                />
                <div className="flex items-center gap-2 pl-1 py-0.5">
                  <div className="h-4 w-px bg-gradient-to-b from-amber-500/30 to-rose-500/30" />
                  <span className="text-[10px] text-muted-foreground/60">{funnel.keyEvents > 0 ? `$${fmtCurrency(funnel.revenue / funnel.keyEvents)}` : '$0'} por evento</span>
                </div>

                {/* Stage 4 */}
                <FunnelStage
                  value={funnel.revenue} label="Ingresos" pct={funnel.sessions > 0 ? (funnel.revenue / funnel.sessions / 100) : 0}
                  barColor="bg-gradient-to-r from-rose-500 to-pink-400"
                  icon={<DollarSign className="h-3.5 w-3.5 text-rose-400" />}
                  isCurrency
                />

                {/* Summary */}
                <div className="mt-4 pt-3 border-t border-border/20 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Valor por sesión</span>
                    <span className="font-semibold">{fmtCurrency(sessionToRevenueRate)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Drop-off total</span>
                    <span className="font-semibold text-rose-400">{funnel.sessions > 0 ? ((1 - funnel.keyEvents / funnel.sessions) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Tendencia Mensual</CardTitle>
                <CardDescription className="text-[10px]">Evolución de sesiones, interacciones y conversiones</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyAgg.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
            ) : (
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyAgg}>
                    <defs>
                      <linearGradient id="trendSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendEngaged" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#trendSessions)" strokeWidth={2} name="Sesiones" />
                    <Area type="monotone" dataKey="engaged" stroke="#10b981" fill="url(#trendEngaged)" strokeWidth={2} name="Con Interacción" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEO Section with Real Data */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-green-500 shadow-lg">
            <Search className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">Rendimiento SEO</p>
            <p className="text-xs text-muted-foreground">Métricas de tráfico orgánico calculadas desde Google Analytics</p>
          </div>
        </div>

        {organicTotals.sessions === 0 ? (
          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground gap-3">
              <Search className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No hay datos de tráfico orgánico</p>
              <p className="text-xs text-center max-w-md">Los datos SEO se calculan automáticamente desde las fuentes de tráfico orgánico en Analytics. Cargá datos de GA4 para ver métricas SEO.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* SEO KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Tooltip>
                <TooltipTrigger><KPICard icon={Globe} value={fmt(organicTotals.sessions)} label="Sesiones Orgánicas" gradient="#10b981 #06b6d4" /></TooltipTrigger>
                <TooltipContent side="bottom">Sesiones provenientes de resultados de búsqueda orgánica (no paga)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger><KPICard icon={Target} value={fmt(organicTotals.keyEvents)} label="Conversiones Org." gradient="#6366f1 #4f46e5" /></TooltipTrigger>
                <TooltipContent side="bottom">Eventos clave generados por tráfico orgánico</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger><KPICard icon={DollarSign} value={fmtCurrency(organicTotals.revenue)} label="Revenue Orgánico" gradient="#f59e0b #ef4444" /></TooltipTrigger>
                <TooltipContent side="bottom">Ingresos totales atribuidos a tráfico orgánico</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger><KPICard icon={Activity} value={`${(organicTotals.engagementRate * 100).toFixed(1)}%`} label="Engagement SEO" gradient="#a855f7 #d946ef" /></TooltipTrigger>
                <TooltipContent side="bottom">Tasa de engagement promedio del tráfico orgánico</TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Organic trend */}
              <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">Tráfico Orgánico</CardTitle>
                      <CardDescription className="text-[10px]">Sesiones orgánicas por mes</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {monthlyAgg.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Sin datos</p>
                  ) : (
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyAgg}>
                          <defs>
                            <linearGradient id="organicFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.15} />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                          <Area type="monotone" dataKey="sessions" stroke="#10b981" fill="url(#organicFill)" strokeWidth={2} name="Orgánico" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Organic metrics detail */}
              <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                      <Hash className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">Métricas de Engagement SEO</CardTitle>
                      <CardDescription className="text-[10px]">Calidad del tráfico orgánico</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Tasa Engagement', value: `${(organicTotals.engagementRate * 100).toFixed(1)}%`, icon: Activity, gradient: '#10b981 #06b6d4', tooltip: 'Porcentaje de sesiones orgánicas con interacción' },
                      { label: 'Tiempo Promedio', value: fmtTime(organicTotals.avgTime), icon: Timer, gradient: '#6366f1 #4f46e5', tooltip: 'Duración promedio de engagement del tráfico orgánico' },
                      { label: 'Sesiones c/ Interacción', value: fmt(organicTotals.engaged), icon: Users, gradient: '#a855f7 #d946ef', tooltip: 'Sesiones orgánicas que tuvieron interacción' },
                      { label: 'Valor por Sesión', value: fmtCurrency(organicTotals.sessions > 0 ? organicTotals.revenue / organicTotals.sessions : 0), icon: DollarSign, gradient: '#f59e0b #ef4444', tooltip: 'Ingreso promedio por sesión orgánica' },
                    ].map((s, i) => {
                      const Icon = s.icon;
                      const [c1, c2] = s.gradient.split(' ');
                      return (
                        <Tooltip key={s.label}>
                          <TooltipTrigger>
                            <div className="bg-card/30 backdrop-blur-sm border border-border/20 rounded-xl p-3 text-left">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="p-1 rounded-lg shadow-sm" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                                  <Icon className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">{s.label}</span>
                              </div>
                              <p className="text-sm font-bold tabular-nums">{s.value}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{s.tooltip}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Channel Breakdown */}
      {channels.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Channel sessions bars */}
          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Sesiones por Canal</CardTitle>
                  <CardDescription className="text-[10px]">Distribución de tráfico con porcentajes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {channels.map((ch, i) => {
                  const pct = channelSessionsTotal > 0 ? (ch.sessions / channelSessionsTotal * 100) : 0;
                  return (
                    <div key={ch.source} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{ch.source}</span>
                          <span className="text-xs font-bold tabular-nums shrink-0 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%`, backgroundColor: ch.color }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-14 text-right">{fmt(ch.sessions)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Channel engagement table */}
          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Métricas por Canal</CardTitle>
                  <CardDescription className="text-[10px]">Engagement, tiempo y eventos por fuente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-2.5 px-4 font-semibold">Canal</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Eng. %</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Tiempo</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Eventos</th>
                      <th className="text-right py-2.5 px-4 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((ch, i) => (
                      <tr key={ch.source} className="border-b border-border/10 hover:bg-muted/5">
                        <td className="py-2.5 px-4 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                          <span className="truncate max-w-[140px]">{ch.source}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{(ch.engagementRate * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{fmtTime(ch.avgTime)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{fmt(ch.eventsPerSession)}/ses</td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-medium">{fmtCurrency(ch.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Paid vs Organic Comparison */}
      {(paidSessions > 0 || organicSessions > 0) && (
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <PieChartIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Tráfico Pago vs Orgánico</CardTitle>
                <CardDescription className="text-[10px]">Comparativa de rendimiento entre canales pagos y orgánicos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: 'Pago', sessions: paidSessions, gradient: '#6366f1 #4f46e5', channels: paidSources, icon: Zap },
                { label: 'Orgánico', sessions: organicSessions, gradient: '#10b981 #06b6d4', channels: organicSources, icon: Search },
              ].map(side => {
                const Icon = side.icon;
                const revenue = side.channels.reduce((s, r) => s + r.total_revenue, 0);
                const engaged = side.channels.reduce((s, r) => s + r.engaged_sessions, 0);
                const ke = side.channels.reduce((s, r) => s + r.key_events, 0);
                const total = paidSessions + organicSessions;
                const pct = total > 0 ? (side.sessions / total * 100) : 0;
                return (
                  <div key={side.label} className="relative group">
                    <div className="absolute inset-0 rounded-2xl opacity-15 blur-lg"
                      style={{ background: `linear-gradient(135deg, ${side.gradient.split(' ')[0]}, ${side.gradient.split(' ')[1]})` }} />
                    <div className="relative bg-card/30 backdrop-blur-sm border border-border/20 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${side.gradient.split(' ')[0]}, ${side.gradient.split(' ')[1]})` }}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{side.label}</p>
                          <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% del tráfico total</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Sesiones</span>
                          <span className="font-semibold">{fmt(side.sessions)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Con interacción</span>
                          <span className="font-semibold">{fmt(engaged)} ({side.sessions > 0 ? (engaged / side.sessions * 100).toFixed(1) : 0}%)</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Conversiones</span>
                          <span className="font-semibold">{fmt(ke)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="font-semibold">{fmtCurrency(revenue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Metrics Card */}
      <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
              <Eye className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Métricas de Calidad</CardTitle>
              <CardDescription className="text-[10px]">Indicadores de engagement y rendimiento general</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Engagement Rate', value: `${(avgEngagementRate * 100).toFixed(1)}%`, icon: Activity, gradient: '#10b981 #06b6d4', tooltip: 'Porcentaje de sesiones con interacción respecto al total' },
              { label: 'Tiempo Promedio', value: fmtTime(avgEngagementTime), icon: Timer, gradient: '#6366f1 #4f46e5', tooltip: 'Duración promedio de engagement en segundos' },
              { label: 'Eventos por Sesión', value: avgEventsPerSession.toFixed(2), icon: MousePointerClick, gradient: '#a855f7 #d946ef', tooltip: 'Promedio de eventos por sesión' },
              { label: 'Valor por Sesión', value: fmtCurrency(sessionToRevenueRate), icon: DollarSign, gradient: '#f59e0b #ef4444', tooltip: 'Ingreso promedio generado por cada sesión' },
            ].map((s, i) => {
              const Icon = s.icon;
              const [c1, c2] = s.gradient.split(' ');
              return (
                <Tooltip key={s.label}>
                  <TooltipTrigger>
                    <div className="bg-card/30 backdrop-blur-sm border border-border/20 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg shadow-sm" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{s.label}</span>
                      </div>
                      <p className="text-sm sm:text-base font-bold tabular-nums">{s.value}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{s.tooltip}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
    </TooltipProvider>
  );
}

// Sub-components

function KPICard({ icon: Icon, value, label, gradient }: { icon: any; value: string; label: string; gradient: string }) {
  const [c1, c2] = gradient.split(' ');
  return (
    <div className="relative group animate-in slide-in-from-bottom-4 fade-in" style={{ animationDuration: '0.6s', animationFillMode: 'both' }}>
      <div className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-all duration-500 blur-xl"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
      <Card className="relative overflow-hidden border-0 bg-card/60 backdrop-blur-xl shadow-lg cursor-default">
        <div className="absolute inset-0 opacity-5"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-50"
          style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
        <CardContent className="p-3 sm:p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg shadow-sm"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase truncate">{label}</span>
          </div>
          <p className="text-lg sm:text-xl font-bold tabular-nums tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStage({ value, label, pct, barColor, icon, isCurrency }: {
  value: number; label: string; pct: number; barColor: string; icon: React.ReactNode; isCurrency?: boolean;
}) {
  const width = Math.max(5, Math.min(100, pct));
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[11px] font-medium">{label}</span>
        </div>
        <span className="text-xs font-bold tabular-nums">
          {isCurrency ? fmtCurrency(value) : fmt(value)}
        </span>
      </div>
      <div className="h-4 bg-muted/20 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
