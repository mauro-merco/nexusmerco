'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useGoogleAds } from '@/lib/hooks/use-google-ads';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, MousePointerClick, DollarSign, Target, Search, Calendar, ArrowUpRight, ArrowDownRight, Info, Sparkles, BarChart3, PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtCurr(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

function cpcPill(cpc: number): { label: string; color: string } {
  if (cpc <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400' };
  if (cpc <= 0.30) return { label: 'BAJO', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (cpc <= 0.60) return { label: 'MODERADO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { label: 'ELEVADO', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
}

function roasPill(roas: number): { label: string; color: string } {
  if (roas <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  if (roas >= 4) return { label: 'EXCELENTE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (roas >= 2) return { label: 'BUENO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { label: 'BAJO', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
}

const KPI_GRADIENTS = [
  { from: '#6366f1', to: '#06b6d4', text: 'Inversión Total', icon: DollarSign, suffix: 'USD', formatter: (v: number) => fmtCurr(v) },
  { from: '#a855f7', to: '#d946ef', text: 'Clics', icon: MousePointerClick, suffix: 'interacciones', formatter: (v: number) => fmt(v) },
  { from: '#f59e0b', to: '#ef4444', text: 'CPC Promedio', icon: TrendingUp, suffix: 'por clic', formatter: (v: number) => v > 0 ? '$' + v.toFixed(2) : '-' },
  { from: '#10b981', to: '#06b6d4', text: 'ROAS', icon: Target, suffix: 'retorno', formatter: (v: number) => v > 0 ? v.toFixed(1) + 'x' : '-' },
];

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
      const current = value * ease;
      setDisplay(current);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

export function GoogleAdsTab({ clientId }: Props) {
  const [month, setMonth] = useState<string>('');
  const [view, setView] = useState<ViewMode>('mensual');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const { campaigns, keywords, assetGroups, loading } = useGoogleAds(clientId, month || null, view);

  const months = [...new Set(campaigns.map(c => c.month).filter(Boolean))].sort();

  const weeks = useMemo(() => {
    const ws = new Set<string>();
    campaigns.forEach(c => { if (c.week_start) ws.add(c.week_start); });
    return [...ws].sort();
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (view === 'semanal' && selectedWeek) {
      return campaigns.filter(c => c.week_start === selectedWeek);
    }
    return campaigns;
  }, [campaigns, view, selectedWeek]);

  const effectiveMonth = month || (months.length > 0 ? months[months.length - 1] : '');

  const totals = useMemo(() => ({
    cost: filteredCampaigns.reduce((s, c) => s + c.cost, 0),
    clicks: filteredCampaigns.reduce((s, c) => s + c.clicks, 0),
    impressions: filteredCampaigns.reduce((s, c) => s + c.impressions, 0),
    conversions: filteredCampaigns.reduce((s, c) => s + c.conversions, 0),
    conv_value: filteredCampaigns.reduce((s, c) => s + c.conv_value, 0),
  }), [filteredCampaigns]);

  const avgCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgRoas = totals.cost > 0 ? totals.conv_value / totals.cost : 0;

  const ctrPillInfo = useMemo(() => {
    if (avgCtr <= 0) return { label: 'SIN DATOS', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    if (avgCtr >= 5) return { label: 'ALTO', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (avgCtr >= 2) return { label: 'MEDIO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { label: 'BAJO', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
  }, [avgCtr]);

  const topCampaigns = useMemo(() =>
    [...filteredCampaigns].sort((a, b) => b.cost - a.cost).slice(0, 10),
  [filteredCampaigns]);
  const maxCost = topCampaigns.length > 0 ? topCampaigns[0].cost : 1;

  const categories = useMemo(() => {
    const acc: Record<string, { cost: number; clicks: number; conversions: number }> = {};
    assetGroups.forEach(ag => {
      const cat = ag.category || 'General';
      if (!acc[cat]) acc[cat] = { cost: 0, clicks: 0, conversions: 0 };
      acc[cat].cost += ag.cost || 0;
      acc[cat].clicks += ag.clicks || 0;
      acc[cat].conversions += ag.conversions || 0;
    });
    return Object.entries(acc)
      .map(([name, v]) => ({ name, cost: Math.round(v.cost), clicks: v.clicks, conversions: v.conversions }))
      .sort((a, b) => b.cost - a.cost);
  }, [assetGroups]);

  const topKeywords = useMemo(() =>
    [...keywords].sort((a, b) => b.clicks - a.clicks).slice(0, 15),
  [keywords]);

  const cumulativeData = useMemo(() => {
    if (view !== 'acumulado' || weeks.length === 0) return null;
    return weeks.map(w => {
      const weekCampaigns = campaigns.filter(c => c.week_start === w);
      return {
        week: w?.slice(5) || w || '',
        cost: weekCampaigns.reduce((s, c) => s + c.cost, 0),
        clicks: weekCampaigns.reduce((s, c) => s + c.clicks, 0),
        conversions: weekCampaigns.reduce((s, c) => s + c.conversions, 0),
        conv_value: weekCampaigns.reduce((s, c) => s + c.conv_value, 0),
      };
    });
  }, [campaigns, view, weeks]);

  const campaignCompData = useMemo(() => {
    if (weeks.length < 2) return null;
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    const first = campaigns.filter(c => c.week_start === firstWeek);
    const last = campaigns.filter(c => c.week_start === lastWeek);
    const fCost = first.reduce((s, c) => s + c.cost, 0);
    const lCost = last.reduce((s, c) => s + c.cost, 0);
    const fClicks = first.reduce((s, c) => s + c.clicks, 0);
    const lClicks = last.reduce((s, c) => s + c.clicks, 0);
    const fRoas = fCost > 0 ? first.reduce((s, c) => s + c.conv_value, 0) / fCost : 0;
    const lRoas = lCost > 0 ? last.reduce((s, c) => s + c.conv_value, 0) / lCost : 0;
    return {
      weeks: weeks.map(w => {
        const c = campaigns.filter(camp => camp.week_start === w);
        return {
          week: w?.slice(5) || w || '',
          cost: c.reduce((s, camp) => s + camp.cost, 0),
          clicks: c.reduce((s, camp) => s + camp.clicks, 0),
          conv_value: c.reduce((s, camp) => s + camp.conv_value, 0),
          roas: c.reduce((s, camp) => s + camp.cost, 0) > 0
            ? c.reduce((s, camp) => s + camp.conv_value, 0) / c.reduce((s, camp) => s + camp.cost, 0)
            : 0,
        };
      }),
      costChange: first.length > 0 && last.length > 0 ? ((lCost - fCost) / fCost) * 100 : 0,
      clicksChange: first.length > 0 && last.length > 0 ? ((lClicks - fClicks) / fClicks) * 100 : 0,
      roasChange: first.length > 0 && last.length > 0 ? ((lRoas - fRoas) / fRoas) * 100 : 0,
    };
  }, [campaigns, weeks]);

  const prevPeriodCost = useMemo(() => {
    if (weeks.length < 2) return null;
    const first = campaigns.filter(c => c.week_start === weeks[0]);
    const last = campaigns.filter(c => c.week_start === weeks[weeks.length - 1]);
    const f = first.reduce((s, c) => s + c.cost, 0);
    const l = last.reduce((s, c) => s + c.cost, 0);
    return f > 0 ? ((l - f) / f) * 100 : null;
  }, [campaigns, weeks]);

  const kpiValues = [totals.cost, totals.clicks, avgCpc, avgRoas];

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-36 animate-pulse bg-muted/20 rounded-2xl" />
        ))}
      </div>
      <div className="h-72 animate-pulse bg-muted/20 rounded-2xl" />
    </div>
  );

  return (
    <TooltipProvider delay={0}>
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-border/40 bg-card/50 backdrop-blur px-3 py-2 text-sm shadow-sm"
        >
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
                    view === v
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-inner'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
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
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none"
            >
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Animated KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_GRADIENTS.map((kpi, i) => {
          const value = kpiValues[i];
          const pillInfo = i === 2 ? cpcPill(avgCpc) : i === 3 ? roasPill(avgRoas) : null;
          const trend = i === 0 && prevPeriodCost !== null
            ? { value: prevPeriodCost, up: prevPeriodCost > 0 }
            : null;
          const descriptions = [
            'Gasto total en campañas de Google Ads',
            'Veces que los usuarios hicieron clic',
            'Costo promedio por cada clic recibido',
            'Retorno de inversión publicitaria',
          ];
          const trendLabels = ['vs. semana anterior', 'vs. semana anterior', '', ''];

          return (
            <div
              key={kpi.text}
              className="relative group animate-in slide-in-from-bottom-4 fade-in"
              style={{ animationDuration: '0.6s', animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-all duration-500 blur-xl"
                style={{ background: `linear-gradient(135deg, ${kpi.from}, ${kpi.to})` }}
              />
              <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-lg">
                <div
                  className="absolute inset-0 opacity-5"
                  style={{ background: `linear-gradient(135deg, ${kpi.from}, ${kpi.to})` }}
                />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-2 rounded-xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${kpi.from}, ${kpi.to})` }}
                      >
                        <kpi.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{kpi.text}</span>
                    </div>
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-black tracking-tight tabular-nums">
                      <CountUp value={typeof value === 'string' ? 0 : value as number} decimals={i >= 2 ? 2 : 0}
                        prefix={i >= 2 && i !== 3 ? '$' : ''}
                        suffix={i === 3 ? 'x' : ''}
                      />
                    </p>
                    {trend && (
                      <div className={cn('flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        trend.up ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                      )}>
                        {trend.up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {Math.abs(trend.value).toFixed(0)}%
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {pillInfo && (
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', pillInfo.color)}>
                        {pillInfo.label}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Info className="h-2.5 w-2.5" />
                      {descriptions[i]}
                    </span>
                  </div>
                </CardContent>
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
                  style={{ background: `linear-gradient(90deg, ${kpi.from}, ${kpi.to})` }}
                />
              </Card>
            </div>
          );
        })}
      </div>

      {/* CTR Mini Card */}
      <div className="animate-in slide-in-from-bottom-4 fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.4s', animationFillMode: 'both' }}>
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CTR (Click-Through Rate)</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-2xl font-black">{avgCtr > 0 ? avgCtr.toFixed(2) + '%' : '-'}</p>
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', ctrPillInfo.color)}>
                    {ctrPillInfo.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                    <Info className="h-2.5 w-2.5" />
                    Porcentaje de impresiones que resultaron en clic
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span>{fmt(totals.impressions)} impresiones</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{totals.conversions} conversiones</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{totals.conv_value > 0 ? fmtCurr(totals.conv_value) : '$0'} valor conv.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Trend Chart */}
        {campaignCompData && (
          <Card className="animate-in slide-in-from-bottom-4 fade-in bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden" style={{ animationDuration: '0.6s', animationDelay: '0.5s', animationFillMode: 'both' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Evolución Semanal</CardTitle>
                    <CardDescription className="text-[10px]">Inversión y clics por semana</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#6366f1]" />
                    <span className="text-muted-foreground">Inversión</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#a855f7]" />
                    <span className="text-muted-foreground">Clics</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignCompData.weeks} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(v: unknown, name: unknown) => [name === 'cost' ? fmtCurr(Number(v)) : fmt(Number(v)), name === 'cost' ? 'Inversión' : 'Clics']}
                    />
                    <Bar yAxisId="left" dataKey="cost" fill="url(#costGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="right" dataKey="clicks" fill="url(#clicksGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ROAS Trend Chart */}
        {campaignCompData && (
          <Card className="animate-in slide-in-from-bottom-4 fade-in bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden" style={{ animationDuration: '0.6s', animationDelay: '0.6s', animationFillMode: 'both' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">ROAS Semanal</CardTitle>
                    <CardDescription className="text-[10px]">Retorno de inversión por semana</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full font-bold',
                    campaignCompData.roasChange >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  )}>
                    {campaignCompData.roasChange >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                    {Math.abs(campaignCompData.roasChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={campaignCompData.weeks} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="roasGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis tickFormatter={v => v.toFixed(1) + 'x'} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(v: unknown) => [(Number(v)).toFixed(2) + 'x', 'ROAS']}
                    />
                    <Area type="monotone" dataKey="roas" stroke="#10b981" strokeWidth={2.5} fill="url(#roasGrad)" dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Comparison Summary Pills */}
      {campaignCompData && (
        <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-bottom-4 fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.7s', animationFillMode: 'both' }}>
          {[
            { label: 'Inversión', value: campaignCompData.costChange, icon: DollarSign, format: (v: number) => v.toFixed(1) + '%', color: 'from-blue-500 to-cyan-500' },
            { label: 'Clics', value: campaignCompData.clicksChange, icon: MousePointerClick, format: (v: number) => v.toFixed(1) + '%', color: 'from-purple-500 to-pink-500' },
            { label: 'ROAS', value: campaignCompData.roasChange, icon: Target, format: (v: number) => v.toFixed(1) + '%', color: 'from-emerald-500 to-teal-500' },
          ].map(metric => (
            <div key={metric.label} className="relative group">
              <div className="absolute inset-0 rounded-xl opacity-20 group-hover:opacity-30 transition-all duration-500 blur-md"
                style={{ background: `linear-gradient(135deg, var(--${metric.color.includes('blue') ? 'blue' : metric.color.includes('purple') ? 'purple' : 'emerald'}), transparent)` }}
              />
              <Card className="relative bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{metric.label}</span>
                    <div className={cn('p-1.5 rounded-lg shadow-lg bg-gradient-to-br', metric.color)}>
                      <metric.icon className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-lg font-black', metric.value >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {metric.value >= 0 ? '+' : ''}{metric.format(metric.value)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">vs. inicio del período</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
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
              <TooltipContent side="bottom">Campañas con mayor inversión publicitaria del período</TooltipContent>
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
                const pct = (c.cost / maxCost) * 100;
                return (
                  <div key={c.campaign_name + i}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/10 transition-all group/item"
                  >
                    <span className={cn('text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center',
                      i === 0 ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-amber-400' :
                      i <= 2 ? 'bg-muted/30 text-muted-foreground' : 'text-muted-foreground/50'
                    )}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{c.campaign_name}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider border-border/40">{c.campaign_type || '—'}</Badge>
                      </div>
                      <div className="h-2 bg-muted/20 rounded-full mt-1.5 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.4))`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Tooltip>
                        <TooltipTrigger><p className="text-sm font-bold tabular-nums">{fmtCurr(c.cost)}</p></TooltipTrigger>
                        <TooltipContent side="left">Inversión total en esta campaña</TooltipContent>
                      </Tooltip>
                      <div className="flex items-center gap-1.5 justify-end text-[10px] text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger><span>{fmt(c.clicks)} clics</span></TooltipTrigger>
                          <TooltipContent side="left">Clics generados por esta campaña</TooltipContent>
                        </Tooltip>
                        <span className="text-muted-foreground/30">·</span>
                        <Tooltip>
                          <TooltipTrigger><span>{c.roas ? c.roas.toFixed(1) + 'x' : '-'}</span></TooltipTrigger>
                          <TooltipContent side="left">ROAS: retorno de inversión publicitaria</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Performance */}
      {categories.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                    <PieChartIcon className="h-4 w-4 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Desglose de inversión por categoría de grupo de recursos</TooltipContent>
              </Tooltip>
              <div>
                <CardTitle className="text-base font-bold">Rendimiento por Categoría</CardTitle>
                <CardDescription className="text-xs">Inversión por grupo de recursos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ left: 110, right: 20, top: 5, bottom: 5 }}>
                  <defs>
                    {categories.map((_, idx) => (
                      <linearGradient key={idx} id={`catGrad${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={['#6366f1','#a855f7','#f59e0b','#10b981','#ef4444','#06b6d4','#d946ef','#84cc16'][idx % 8]} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={['#6366f1','#a855f7','#f59e0b','#10b981','#ef4444','#06b6d4','#d946ef','#84cc16'][idx % 8]} stopOpacity={0.3} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v: unknown, name: unknown) => [name === 'cost' ? fmtCurr(Number(v)) : fmt(Number(v)), name === 'cost' ? 'Inversión' : name === 'clicks' ? 'Clics' : 'Conversiones']}
                  />
                  <Bar dataKey="cost" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {categories.map((_, idx) => (
                      <rect key={idx} />
                    ))}
                  </Bar>
                  <Bar dataKey="cost" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {categories.map((_, idx) => (
                      <rect key={idx} />
                    ))}
                  </Bar>
                  <Bar dataKey="cost" fill="url(#costGrad)" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {categories.map((_, idx) => (
                      <rect key={idx} fill={`url(#catGrad${idx})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {categories.slice(0, 8).map((cat, idx) => (
                <div key={cat.name} className="rounded-xl bg-muted/10 p-3 border border-border/20 hover:border-border/40 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ['#6366f1','#a855f7','#f59e0b','#10b981','#ef4444','#06b6d4','#d946ef','#84cc16'][idx % 8] }} />
                    <p className="text-xs font-semibold truncate">{cat.name}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums">{fmtCurr(cat.cost)}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(cat.clicks)} clics · {cat.conversions} conv.</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Keywords */}
      {topKeywords.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Palabras clave con mayor rendimiento en clics durante el período</TooltipContent>
              </Tooltip>
              <div>
                <CardTitle className="text-base font-bold">Top Palabras Clave</CardTitle>
                <CardDescription className="text-xs">Las 15 palabras clave con más clics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 text-muted-foreground text-[11px] uppercase tracking-wider">
                    <Tooltip><TooltipTrigger><th className="text-left py-3 px-4 font-semibold">Palabra clave</th></TooltipTrigger><TooltipContent side="bottom">Término de búsqueda que activó el anuncio</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-left py-3 px-4 font-semibold">Match</th></TooltipTrigger><TooltipContent side="bottom">Tipo de concordancia (amplia, frase, exacta)</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Clics</th></TooltipTrigger><TooltipContent side="bottom">Veces que se hizo clic en el anuncio</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">CPC</th></TooltipTrigger><TooltipContent side="bottom">Costo promedio por clic</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Costo</th></TooltipTrigger><TooltipContent side="bottom">Gasto total generado por esta palabra clave</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger><th className="text-right py-3 px-4 font-semibold">Conv.</th></TooltipTrigger><TooltipContent side="bottom">Conversiones atribuidas a esta palabra clave</TooltipContent></Tooltip>
                  </tr>
                </thead>
                <tbody>
                  {topKeywords.map((kw, i) => (
                    <tr key={kw.keyword + i} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                      <td className="py-2.5 px-4 font-medium truncate max-w-[220px]">{kw.keyword}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/30">
                          {kw.match_type === 'Concordancia amplia' ? 'Amplia' : kw.match_type || '—'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium tabular-nums">{fmt(kw.clicks)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{kw.cpc > 0 ? '$' + kw.cpc.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{kw.cost > 0 ? fmtCurr(kw.cost) : '-'}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{kw.conversions || '-'}</td>
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
