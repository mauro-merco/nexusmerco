'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, XAxis, YAxis, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Globe, Users, Activity, DollarSign, Zap, Search, Calendar, Sparkles, Info, ArrowUpRight, ArrowDownRight, BarChart3, PieChartIcon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function engagementPill(rate: number): { label: string; color: string } {
  if (rate <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  if (rate >= 0.5) return { label: 'ALTA', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (rate >= 0.2) return { label: 'MEDIA', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { label: 'BAJA', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
}

function kePill(rate: number): { label: string; color: string } {
  if (rate <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  if (rate >= 0.1) return { label: 'ALTA', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (rate >= 0.05) return { label: 'MEDIA', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { label: 'BAJA', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
}

const COLOR_MAP: Record<string, string> = {
  'google / cpc': '#ea4335',
  'google / organic': '#34a853',
  'rrss / pauta': '#1877f2',
  '(direct) / (none)': '#6b7280',
  'tiktok / paid': '#00f2ea',
  'tiktokads / pauta': '#00f2ea',
  'metaads / pauta': '#1877f2',
  'connectif / email': '#f59e0b',
  '(not set)': '#9ca3af',
  'facebook / paid': '#1877f2',
  'cace / oferta': '#8b5cf6',
  'blue / cpc': '#06b6d4',
  'email': '#f59e0b',
};

function getColor(name: string, i: number): string {
  const key = Object.keys(COLOR_MAP).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? COLOR_MAP[key] : `hsl(${(i * 37) % 360}, 65%, 55%)`;
}

interface Props { clientId: string; clientName?: string }

type ViewMode = 'mensual' | 'semanal' | 'acumulado';

function CountUp({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  const startTime = useRef<number>(0);
  useEffect(() => {
    startTime.current = Date.now();
    const duration = 1500;
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
      setDisplay(value * ease);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

export function AnalyticsTab({ clientId }: Props) {
  const [month, setMonth] = useState<string>('');
  const [view, setView] = useState<ViewMode>('mensual');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const { data, loading } = useAnalytics(clientId, month || null, view);

  const months = [...new Set(data.map(d => d.month).filter(Boolean))].sort();

  const weeks = useMemo(() => {
    const ws = new Set<string>();
    data.forEach(d => { if (d.week_start) ws.add(d.week_start); });
    return [...ws].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (view === 'semanal' && selectedWeek) return data.filter(d => d.week_start === selectedWeek);
    return data;
  }, [data, view, selectedWeek]);

  const totals = useMemo(() => ({
    sessions: filtered.reduce((s, r) => s + r.sessions, 0),
    engagedSessions: filtered.reduce((s, r) => s + r.engaged_sessions, 0),
    totalEvents: filtered.reduce((s, r) => s + r.total_events, 0),
    keyEvents: filtered.reduce((s, r) => s + r.key_events, 0),
    revenue: filtered.reduce((s, r) => s + r.total_revenue, 0),
  }), [filtered]);

  const avgEngRate = totals.sessions > 0 ? totals.engagedSessions / totals.sessions : 0;
  const avgKeyEventRate = totals.sessions > 0 ? totals.keyEvents / totals.sessions : 0;

  const sessionChart = useMemo(() =>
    [...filtered].sort((a, b) => b.sessions - a.sessions).map((r, i) => ({
      name: r.source_medium, value: r.sessions, color: getColor(r.source_medium, i),
    })),
  [filtered]);

  const revenueChart = useMemo(() =>
    [...filtered].filter(r => r.total_revenue > 0).sort((a, b) => b.total_revenue - a.total_revenue).map((r, i) => ({
      name: r.source_medium, value: r.total_revenue, color: getColor(r.source_medium, i),
    })),
  [filtered]);

  const paid = useMemo(() => filtered.filter(r => /cpc|pauta|paid/i.test(r.source_medium)), [filtered]);
  const organic = useMemo(() => filtered.filter(r => /organic|organico|direct|email|(not set)/i.test(r.source_medium) && !/cpc|pauta|paid/i.test(r.source_medium)), [filtered]);

  const paidTotals = useMemo(() => ({
    sessions: paid.reduce((s, r) => s + r.sessions, 0),
    keyEvents: paid.reduce((s, r) => s + r.key_events, 0),
    revenue: paid.reduce((s, r) => s + r.total_revenue, 0),
  }), [paid]);

  const organicTotals = useMemo(() => ({
    sessions: organic.reduce((s, r) => s + r.sessions, 0),
    keyEvents: organic.reduce((s, r) => s + r.key_events, 0),
    revenue: organic.reduce((s, r) => s + r.total_revenue, 0),
  }), [organic]);

  const weekTrend = useMemo(() => {
    if (weeks.length < 2) return null;
    return weeks.map(w => {
      const d = data.filter(item => item.week_start === w);
      return {
        week: w?.slice(5) || w || '',
        sessions: d.reduce((s, item) => s + item.sessions, 0),
        engagedSessions: d.reduce((s, item) => s + item.engaged_sessions, 0),
        revenue: d.reduce((s, item) => s + item.total_revenue, 0),
      };
    });
  }, [data, weeks]);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-36 animate-pulse bg-muted/20 rounded-2xl" />)}
      </div>
      <div className="h-72 animate-pulse bg-muted/20 rounded-2xl" />
    </div>
  );

  function fmtRev(n: number): string {
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
    return '$' + fmt(n);
  }

  const KPI_DEFS = [
    { label: 'Sesiones', value: totals.sessions, icon: Globe, gradient: '#6366f1 #06b6d4', description: 'Visitas totales al sitio web' },
    { label: 'Tasa Interacción', value: avgEngRate, icon: Activity, gradient: '#10b981 #06b6d4', description: 'Porcentaje de sesiones con interacción', pill: engagementPill(avgEngRate) },
    { label: 'Eventos Clave', value: totals.keyEvents, icon: Zap, gradient: '#f59e0b #ef4444', description: 'Conversiones totales registradas', pill: kePill(avgKeyEventRate) },
    { label: 'Ingresos', value: totals.revenue, icon: DollarSign, gradient: '#a855f7 #d946ef', description: 'Ingresos totales generados' },
  ];

  return (
    <TooltipProvider delay={0}>
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-border/40 bg-card/50 backdrop-blur px-3 py-2 text-sm shadow-sm">
          <option value="">Todos los meses</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex rounded-xl border border-border/40 bg-card/50 backdrop-blur overflow-hidden shadow-sm">
          {(['mensual', 'semanal', 'acumulado'] as ViewMode[]).map(v => (
            <Tooltip key={v}>
              <TooltipTrigger>
                <button
                  onClick={() => { setView(v); if (v === 'semanal' && weeks.length > 0) setSelectedWeek(weeks[weeks.length - 1]); }}
                  className={cn('px-4 py-2 text-xs font-semibold transition-all',
                    view === v ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-inner' : 'text-muted-foreground hover:text-foreground')}>
                  {v === 'mensual' ? '📊 Mensual' : v === 'semanal' ? '📅 Semanal' : '📈 Acumulado'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {v === 'mensual' ? 'Agrupa datos por mes calendario' : v === 'semanal' ? 'Desglose detallado por semana' : 'Evolución acumulada semana a semana'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {view === 'semanal' && weeks.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/50 backdrop-blur rounded-xl border border-border/40 px-3 py-2 shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none">
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_DEFS.map((kpi, i) => {
          const val = typeof kpi.value === 'number' ? kpi.value : 0;
          return (
            <div key={kpi.label} className="relative group animate-in slide-in-from-bottom-4 fade-in"
              style={{ animationDuration: '0.6s', animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
              <div className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-all duration-500 blur-xl"
                style={{ background: `linear-gradient(135deg, ${kpi.gradient.split(' ')[0]}, ${kpi.gradient.split(' ')[1]})` }} />
              <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-lg">
                <div className="absolute inset-0 opacity-5"
                  style={{ background: `linear-gradient(135deg, ${kpi.gradient.split(' ')[0]}, ${kpi.gradient.split(' ')[1]})` }} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${kpi.gradient.split(' ')[0]}, ${kpi.gradient.split(' ')[1]})` }}>
                        <kpi.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{kpi.label}</span>
                    </div>
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-black tracking-tight tabular-nums">
                      {kpi.label === 'Ingresos' ? (
                        fmtRev(val)
                      ) : kpi.label === 'Tasa Interacción' ? (
                        pct(val)
                      ) : (
                        <CountUp value={val} decimals={0} />
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {kpi.pill && (
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', kpi.pill.color)}>{kpi.pill.label}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Info className="h-2.5 w-2.5" />
                      {kpi.description}
                    </span>
                  </div>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
                  style={{ background: `linear-gradient(90deg, ${kpi.gradient.split(' ')[0]}, ${kpi.gradient.split(' ')[1]})` }} />
              </Card>
            </div>
          );
        })}
      </div>

      {/* Engagement & Events mini card */}
      <div className="animate-in slide-in-from-bottom-4 fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.4s', animationFillMode: 'both' }}>
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Métricas de Interacción</p>
                <div className="flex items-center gap-4 mt-1">
                  <div>
                    <p className="text-2xl font-black">{fmt(totals.engagedSessions)}</p>
                    <span className="text-[10px] text-muted-foreground">sesiones con interacción</span>
                  </div>
                  <div className="h-6 w-px bg-border/30" />
                  <div>
                    <p className="text-2xl font-black">{fmt(totals.totalEvents)}</p>
                    <span className="text-[10px] text-muted-foreground">eventos totales</span>
                  </div>
                  <div className="h-6 w-px bg-border/30" />
                  <div>
                    <p className="text-2xl font-black">{pct(avgEngRate)}</p>
                    <span className="text-[10px] text-muted-foreground">tasa de interacción</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {weekTrend && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="animate-in slide-in-from-bottom-4 fade-in bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden"
            style={{ animationDuration: '0.6s', animationDelay: '0.5s', animationFillMode: 'both' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Evolución Semanal</CardTitle>
                  <CardDescription className="text-[10px]">Sesiones por semana</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="sessionsGradA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(v: unknown) => [fmt(Number(v)), 'Sesiones']} />
                    <Area type="monotone" dataKey="sessions" stroke="#6366f1" strokeWidth={2.5} fill="url(#sessionsGradA)" dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden"
            style={{ animationDuration: '0.6s', animationDelay: '0.6s', animationFillMode: 'both' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Ingresos Semanales</CardTitle>
                  <CardDescription className="text-[10px]">Revenue generado por semana</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revGradA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(v: unknown) => ['$' + fmt(Number(v)), 'Ingresos']} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGradA)" dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Channel Mix - Horizontal Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                <PieChartIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Sesiones por Canal</CardTitle>
                <CardDescription className="text-[10px]">Distribución de tráfico con porcentajes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sessionChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {sessionChart.map((ch, i) => {
                  const total = sessionChart.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? ((ch.value / total) * 100) : 0;
                  return (
                    <div key={ch.name} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">{ch.name}</span>
                          <span className="text-xs font-bold tabular-nums shrink-0 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%`, backgroundColor: ch.color }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">{fmt(ch.value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Ingresos por Canal</CardTitle>
                <CardDescription className="text-[10px]">Revenue por fuente de tráfico</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin datos de ingresos por canal</p>
            ) : (
              <div className="space-y-3">
                {revenueChart.map((ch, i) => {
                  const total = revenueChart.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? ((ch.value / total) * 100) : 0;
                  return (
                    <div key={ch.name} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">{ch.name}</span>
                          <span className="text-xs font-bold tabular-nums shrink-0 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%`, backgroundColor: ch.color }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">${fmt(ch.value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Paid vs Organic */}
      {(paidTotals.sessions > 0 || organicTotals.sessions > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger><p className="text-sm font-bold">PAID</p></TooltipTrigger>
                    <TooltipContent side="bottom">Tráfico proveniente de canales de pago (Google Ads, Meta Ads, etc.)</TooltipContent>
                  </Tooltip>
                  <p className="text-[10px] text-muted-foreground">Canales de pago</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Tooltip>
                  <TooltipTrigger><div>
                    <p className="text-2xl font-black tabular-nums">{fmt(paidTotals.sessions)}</p>
                    <p className="text-[10px] text-muted-foreground">Sesiones</p>
                  </div></TooltipTrigger>
                  <TooltipContent side="bottom">Sesiones totales de canales pagos</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger><div>
                    <p className="text-2xl font-black tabular-nums">{fmt(paidTotals.keyEvents)}</p>
                    <p className="text-[10px] text-muted-foreground">Conv.</p>
                  </div></TooltipTrigger>
                  <TooltipContent side="bottom">Eventos clave generados por tráfico pago</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger><div>
                    <p className="text-2xl font-black tabular-nums">{fmtRev(paidTotals.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">Ingresos</p>
                  </div></TooltipTrigger>
                  <TooltipContent side="bottom">Ingresos totales atribuidos a canales de pago</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger><p className="text-sm font-bold">ORGÁNICO</p></TooltipTrigger>
                    <TooltipContent side="bottom">Tráfico proveniente de resultados de búsqueda orgánica y acceso directo</TooltipContent>
                  </Tooltip>
                  <p className="text-[10px] text-muted-foreground">Canales orgánicos + directo</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Tooltip>
                  <TooltipTrigger><div>
                    <p className="text-2xl font-black tabular-nums">{fmt(organicTotals.sessions)}</p>
                    <p className="text-[10px] text-muted-foreground">Sesiones</p>
                  </div></TooltipTrigger>
                  <TooltipContent side="bottom">Sesiones totales de canales orgánicos y directo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger><div>
                    <p className="text-2xl font-black tabular-nums">{fmt(organicTotals.keyEvents)}</p>
                    <p className="text-[10px] text-muted-foreground">Conv.</p>
                  </div></TooltipTrigger>
                  <TooltipContent side="bottom">Eventos clave generados por tráfico orgánico</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger><div>
                    <p className="text-2xl font-black tabular-nums">{fmtRev(organicTotals.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">Ingresos</p>
                  </div></TooltipTrigger>
                  <TooltipContent side="bottom">Ingresos totales atribuidos a canales orgánicos y directo</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail table */}
      <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger>
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Desglose completo de todas las fuentes y medios de tráfico</TooltipContent>
            </Tooltip>
            <div>
              <CardTitle className="text-base font-bold">Detalle por Fuente / Medio</CardTitle>
              <CardDescription className="text-xs">Desglose completo de tráfico y conversiones</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 text-muted-foreground text-[11px] uppercase tracking-wider">
                  <Tooltip><TooltipTrigger><th className="text-left py-3 px-4 font-semibold">Fuente / Medio</th></TooltipTrigger><TooltipContent side="bottom">Origen y medio del tráfico (ej: google / cpc, google / organic)</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Sesiones</th></TooltipTrigger><TooltipContent side="bottom">Número total de visitas al sitio</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Ses. Interact.</th></TooltipTrigger><TooltipContent side="bottom">Sesiones que tuvieron al menos una interacción</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Tasa Interac.</th></TooltipTrigger><TooltipContent side="bottom">Porcentaje de sesiones con interacción sobre el total</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Eventos Clave</th></TooltipTrigger><TooltipContent side="bottom">Conversiones o eventos importantes registrados</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Tasa EC</th></TooltipTrigger><TooltipContent side="bottom">Tasa de eventos clave por sesión</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Ingresos</th></TooltipTrigger><TooltipContent side="bottom">Ingresos totales generados por esta fuente</TooltipContent></Tooltip>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.source_medium + i} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                    <td className="py-2.5 px-4 font-medium">{r.source_medium}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{fmt(r.sessions)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{fmt(r.engaged_sessions)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{pct(r.engagement_rate)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{fmt(r.key_events)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{pct(r.key_event_rate)}</td>
                    <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{r.total_revenue > 0 ? '$' + fmt(r.total_revenue) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
