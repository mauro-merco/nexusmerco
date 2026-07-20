'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useMetaAds } from '@/lib/hooks/use-meta-ads';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Megaphone, Eye, Users, MousePointerClick, TrendingUp, Calendar, Sparkles, Info, ArrowUpRight, ArrowDownRight, BarChart3, PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtArs(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function cpmPill(cpm: number): { label: string; color: string } {
  if (cpm <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  if (cpm <= 10000) return { label: 'EFICIENTE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (cpm <= 30000) return { label: 'NORMAL', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { label: 'ELEVADO', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
}

function cpcPillMeta(cpc: number): { label: string; color: string } {
  if (cpc <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  if (cpc <= 500) return { label: 'BAJO', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (cpc <= 2000) return { label: 'MODERADO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { label: 'ELEVADO', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
}

function qualityPill(q: string): { label: string; color: string } {
  const up = q.toUpperCase();
  if (up.includes('ABOVE') || up.includes('ALTA')) return { label: 'EXCELENTE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (up.includes('AVERAGE') || up.includes('MEDIA') || up === '-' || !q) return { label: 'MEDIO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  if (up.includes('BELOW') || up.includes('BAJA')) return { label: 'BAJO', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
  return { label: 'MEDIO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
}

const CAT_COLORS = ['#06b6d4', '#f59e0b', '#84cc16', '#a78bfa', '#fb7185', '#34d399', '#f97316', '#818cf8'];

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

export function MetaAdsTab({ clientId }: Props) {
  const [month, setMonth] = useState<string>('');
  const [view, setView] = useState<ViewMode>('mensual');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const { campaigns, adSets, ads, loading } = useMetaAds(clientId, month || null, view);

  const months = [...new Set(campaigns.map(c => c.month).filter(Boolean))].sort();

  const weeks = useMemo(() => {
    const ws = new Set<string>();
    campaigns.forEach(c => { if (c.week_start) ws.add(c.week_start); });
    return [...ws].sort();
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (view === 'semanal' && selectedWeek) return campaigns.filter(c => c.week_start === selectedWeek);
    return campaigns;
  }, [campaigns, view, selectedWeek]);

  const totals = useMemo(() => ({
    spend: filteredCampaigns.reduce((s, c) => s + c.spend, 0),
    impressions: filteredCampaigns.reduce((s, c) => s + c.impressions, 0),
    reach: filteredCampaigns.reduce((s, c) => s + c.reach, 0),
    results: filteredCampaigns.reduce((s, c) => s + c.results, 0),
  }), [filteredCampaigns]);

  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const avgCpc = totals.reach > 0 ? totals.spend / totals.reach : 0;
  const frequency = totals.impressions > 0 && totals.reach > 0 ? (totals.impressions / totals.reach).toFixed(1) : '-';

  const topCampaigns = useMemo(() =>
    [...filteredCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 10),
  [filteredCampaigns]);
  const maxSpend = topCampaigns.length > 0 ? topCampaigns[0].spend : 1;

  const categories = useMemo(() => {
    const acc: Record<string, { spend: number; impressions: number; results: number }> = {};
    adSets.forEach(s => {
      const cat = s.category || 'General';
      if (!acc[cat]) acc[cat] = { spend: 0, impressions: 0, results: 0 };
      acc[cat].spend += s.spend || 0;
      acc[cat].impressions += s.impressions || 0;
      acc[cat].results += s.results || 0;
    });
    return Object.entries(acc).map(([name, v]) => ({ name, spend: Math.round(v.spend), impressions: v.impressions, results: v.results })).sort((a, b) => b.spend - a.spend);
  }, [adSets]);

  const topAds = useMemo(() => [...ads].sort((a, b) => b.spend - a.spend).slice(0, 15), [ads]);

  const weekTrend = useMemo(() => {
    if (weeks.length < 2) return null;
    return weeks.map(w => {
      const c = campaigns.filter(camp => camp.week_start === w);
      return {
        week: w?.slice(5) || w || '',
        spend: c.reduce((s, camp) => s + camp.spend, 0),
        impressions: c.reduce((s, camp) => s + camp.impressions, 0),
        results: c.reduce((s, camp) => s + camp.results, 0),
      };
    });
  }, [campaigns, weeks]);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-36 animate-pulse bg-muted/20 rounded-2xl" />)}
      </div>
      <div className="h-72 animate-pulse bg-muted/20 rounded-2xl" />
    </div>
  );

  const KPI_DEFS = [
    { label: 'Gasto Total', value: totals.spend, icon: Megaphone, gradient: '#06b6d4 #0891b2', description: 'Inversión total en campañas Meta Ads', suffix: '', decimals: 0, formatter: fmtArs, prefix: '$' },
    { label: 'Impresiones', value: totals.impressions, icon: Eye, gradient: '#a855f7 #d946ef', description: 'Veces que se mostraron los anuncios', suffix: '', decimals: 0, formatter: fmt },
    { label: 'Alcance', value: totals.reach, icon: Users, gradient: '#f59e0b #ef4444', description: 'Usuarios únicos alcanzados', suffix: '', decimals: 0, formatter: fmt },
    { label: 'CPM', value: avgCpm, icon: TrendingUp, gradient: '#10b981 #06b6d4', description: 'Costo por cada 1,000 impresiones', pill: cpmPill(avgCpm), prefix: '$', decimals: 0, formatter: fmtArs },
    { label: 'CPC', value: avgCpc, icon: MousePointerClick, gradient: '#6366f1 #06b6d4', description: 'Costo promedio por clic recibido', pill: cpcPillMeta(avgCpc), prefix: '$', decimals: 0, formatter: fmtArs },
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
                    view === v ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-inner' : 'text-muted-foreground hover:text-foreground'
                  )}>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                      <CountUp value={val} decimals={kpi.decimals ?? 0} prefix={kpi.prefix ?? ''} suffix={kpi.suffix ?? ''} />
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

      {/* Frequency + Results mini card */}
      <div className="animate-in slide-in-from-bottom-4 fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.5s', animationFillMode: 'both' }}>
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frecuencia & Resultados</p>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black">{frequency}x</p>
                    <span className="text-[10px] text-muted-foreground">frecuencia promedio</span>
                  </div>
                  <div className="h-6 w-px bg-border/30" />
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black">{fmt(totals.results)}</p>
                    <span className="text-[10px] text-muted-foreground">resultados totales</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span>{fmt(totals.impressions)} impresiones</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{totals.results} resultados</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend Chart */}
      {weekTrend && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="animate-in slide-in-from-bottom-4 fade-in bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden"
            style={{ animationDuration: '0.6s', animationDelay: '0.6s', animationFillMode: 'both' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Evolución Semanal</CardTitle>
                    <CardDescription className="text-[10px]">Gasto e impresiones por semana</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="spendGradM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="impGradM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(v: unknown, name: unknown) => [name === 'spend' ? '$' + fmt(Number(v)) : fmt(Number(v)), name === 'spend' ? 'Gasto' : 'Impresiones']} />
                    <Bar yAxisId="left" dataKey="spend" fill="url(#spendGradM)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="right" dataKey="impressions" fill="url(#impGradM)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          {categories.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden"
              style={{ animationDuration: '0.6s', animationDelay: '0.7s', animationFillMode: 'both' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                    <PieChartIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Distribución por Categoría</CardTitle>
                    <CardDescription className="text-[10px]">Gasto por conjunto de anuncios</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} dataKey="spend" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                        {categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(v: unknown) => [fmtArs(Number(v)), 'Gasto']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {categories.map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="text-xs font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold">{fmtArs(cat.spend)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(cat.impressions)} imp.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Campaigns */}
      <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger>
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Campañas con mayor inversión publicitaria en Meta Ads</TooltipContent>
            </Tooltip>
            <div>
              <CardTitle className="text-base font-bold">Top Campañas</CardTitle>
              <CardDescription className="text-xs">Las 10 campañas con mayor inversión</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay datos de campañas</p>
          ) : (
            <div className="space-y-1">
              {topCampaigns.map((c, i) => {
                const pct = (c.spend / maxSpend) * 100;
                return (
                  <div key={c.campaign_name + i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/10 transition-all group/item">
                    <span className={cn('text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center',
                      i === 0 ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-amber-400' :
                      i <= 2 ? 'bg-muted/30 text-muted-foreground' : 'text-muted-foreground/50')}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.campaign_name}</p>
                      <div className="h-2 bg-muted/20 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #06b6d4, #0891b2)' }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Tooltip>
                        <TooltipTrigger><p className="text-sm font-bold tabular-nums">{fmtArs(c.spend)}</p></TooltipTrigger>
                        <TooltipContent side="left">Inversión total en esta campaña</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger><p className="text-[10px] text-muted-foreground">{fmt(c.results)} resultados · ${c.cost_per_result.toFixed(0)} c/res</p></TooltipTrigger>
                        <TooltipContent side="left">Resultados obtenidos y costo por resultado</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Ads */}
      {topAds.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                    <Megaphone className="h-4 w-4 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Anuncios individuales con mayor inversión en Meta Ads</TooltipContent>
              </Tooltip>
              <div>
                <CardTitle className="text-base font-bold">Top Anuncios</CardTitle>
                <CardDescription className="text-xs">Los 15 anuncios con mayor inversión</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 text-muted-foreground text-[11px] uppercase tracking-wider">
                    <Tooltip><TooltipTrigger><th className="text-left py-3 px-4 font-semibold">Anuncio</th></TooltipTrigger><TooltipContent side="bottom">Nombre del anuncio o creativo publicitario</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-left py-3 px-4 font-semibold">Conjunto</th></TooltipTrigger><TooltipContent side="bottom">Conjunto de anuncios al que pertenece</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Gasto</th></TooltipTrigger><TooltipContent side="bottom">Inversión total en este anuncio</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Impresiones</th></TooltipTrigger><TooltipContent side="bottom">Veces que se mostró este anuncio</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Resultados</th></TooltipTrigger><TooltipContent side="bottom">Resultados obtenidos según el objetivo de la campaña</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-center py-3 px-4 font-semibold">Calidad</th></TooltipTrigger><TooltipContent side="bottom">Ranking de calidad del anuncio según Meta</TooltipContent></Tooltip>
                  </tr>
                </thead>
                <tbody>
                  {topAds.map((ad, i) => (
                    <tr key={ad.ad_name + i} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                      <td className="py-2.5 px-4 font-medium truncate max-w-[200px]">{ad.ad_name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[150px]">{ad.ad_set_name}</td>
                      <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{fmtArs(ad.spend)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{fmt(ad.impressions)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{ad.results || '-'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border', qualityPill(ad.quality_ranking).color)}>
                          {qualityPill(ad.quality_ranking).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
