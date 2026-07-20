'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  TrendingUp, DollarSign, Eye, MousePointer, ShoppingCart, Globe, Search, Megaphone,
  PieChart, Loader2, AlertCircle, Sparkles, Target, Activity, Lightbulb, ArrowUpRight,
  Users, BarChart3, MousePointerClick, Hash, CalendarDays,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area,
} from 'recharts';

function CountUp({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const KPI_GRADIENTS = [
  { gradient: '#6366f1 #06b6d4', icon: DollarSign, label: 'Inversión Total', key: 'totalCost', formatter: (v: number) => fmtCurrency(v) },
  { gradient: '#a855f7 #d946ef', icon: Eye, label: 'Impresiones', key: 'totalImpressions', formatter: (v: number) => fmt(v) },
  { gradient: '#10b981 #06b6d4', icon: MousePointer, label: 'Clicks', key: 'totalClicks', formatter: (v: number) => fmt(v) },
  { gradient: '#f59e0b #ef4444', icon: ShoppingCart, label: 'Conversiones', key: 'totalConversions', formatter: (v: number) => fmt(v) },
  { gradient: '#3b82f6 #8b5cf6', icon: TrendingUp, label: 'ROAS', key: 'roas', formatter: (v: number) => v.toFixed(2) + 'x' },
  { gradient: '#14b8a6 #10b981', icon: Globe, label: 'Sesiones', key: 'totalSessions', formatter: (v: number) => fmt(v) },
];

const CHANNEL_COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

interface PublicData {
  client: { name: string; logo_url: string; description: string; public_description: string; industry: string };
  summary: {
    gaTotals: { cost: number; impressions: number; clicks: number; conversions: number; convValue: number };
    metaTotals: { spend: number; impressions: number; reach: number; results: number };
    analyticsSummary: { sessions: number; engagedSessions: number; totalRevenue: number; keyEvents: number };
    channelMix: { source: string; sessions: number; revenue: number }[];
    months: string[];
  };
  googleAds: { campaigns: any[]; keywords: any[]; assetGroups: any[] };
  metaAds: { campaigns: any[]; adSets: any[]; ads: any[] };
  analytics: { rows: any[] };
}

function generateInsights(data: PublicData) {
  const parts: string[] = [];
  const tips: string[] = [];
  const { gaTotals, metaTotals, analyticsSummary, channelMix } = data.summary;

  const totalCost = gaTotals.cost + metaTotals.spend;
  const totalImpressions = gaTotals.impressions + metaTotals.impressions;
  const totalConversions = gaTotals.conversions + metaTotals.results;
  const totalRevenue = gaTotals.convValue + analyticsSummary.totalRevenue;
  const roas = totalCost > 0 ? totalRevenue / totalCost : 0;

  if (totalCost > 0) {
    if (roas >= 3) {
      parts.push(`El ROAS general es de ${roas.toFixed(2)}x, lo que indica un rendimiento sólido: por cada peso invertido se generaron $${roas.toFixed(2)} en retorno. Las campañas están bien optimizadas y generan valor de manera eficiente.`);
      tips.push('Considerá aumentar la inversión en los canales con mejor ROAS para escalar resultados positivos.');
    } else if (roas >= 1.5) {
      parts.push(`El ROAS general es de ${roas.toFixed(2)}x, un rendimiento aceptable. La facturación supera a la inversión, pero hay margen para seguir optimizando campañas y segmentaciones.`);
      tips.push('Revisá las campañas de menor rendimiento y ajustá la segmentación y las pujas para mejorar el ROAS.');
    } else {
      parts.push(`El ROAS general es de ${roas.toFixed(2)}x, por debajo de lo ideal. Se recomienda una revisión profunda de la estrategia de inversión publicitaria.`);
      tips.push('Evaluá reducir inversión en canales de bajo rendimiento y redirigir presupuesto a los que mejor conversión tienen.');
    }
  }

  if (totalImpressions > 0) {
    parts.push(`Se generaron ${fmt(totalImpressions)} impresiones totales combinando Google Ads y Meta Ads, con ${fmt(totalConversions)} conversiones. ${totalCost > 0 ? `La inversión total fue de ${fmtCurrency(totalCost)}.` : ''}`);
  }

  if (gaTotals.impressions > 0 && metaTotals.impressions > 0) {
    const gaPct = (gaTotals.impressions / totalImpressions * 100).toFixed(0);
    const metaPct = (metaTotals.impressions / totalImpressions * 100).toFixed(0);
    parts.push(`La distribución de impresiones muestra un ${gaPct}% en Google Ads y un ${metaPct}% en Meta Ads, reflejando el alcance combinado de ambas plataformas.`);
  }

  if (analyticsSummary.sessions > 0) {
    parts.push(`Se registraron ${fmt(analyticsSummary.sessions)} sesiones en el sitio web, con ${fmt(analyticsSummary.engagedSessions)} sesiones comprometidas (tasa de engagement del ${analyticsSummary.sessions > 0 ? (analyticsSummary.engagedSessions / analyticsSummary.sessions * 100).toFixed(1) : 0}%).`);
    if (analyticsSummary.totalRevenue > 0) {
      parts.push(`El sitio generó ${fmtCurrency(analyticsSummary.totalRevenue)} en revenue directamente atribuible a tráfico digital.`);
    }
  }

  if (channelMix.length > 0) {
    const topChannel = channelMix.sort((a, b) => b.sessions - a.sessions)[0];
    parts.push(`La principal fuente de tráfico es "${topChannel.source}" con ${fmt(topChannel.sessions)} sesiones, representando la mayor parte del tráfico total del sitio.`);

    if (channelMix.length >= 2) {
      tips.push('Diversificar las fuentes de tráfico puede reducir la dependencia de un solo canal y mejorar la resiliencia de la estrategia digital.');
    }
  }

  if (gaTotals.clicks > 0 && gaTotals.impressions > 0) {
    const ctr = (gaTotals.clicks / gaTotals.impressions * 100).toFixed(2);
    tips.push(`El CTR de Google Ads es del ${ctr}%. ${Number(ctr) < 1 ? 'Trabajar en los copy y llamados a la acción puede mejorar este indicador.' : 'Se mantiene en niveles saludables.'}`);
  }

  if (tips.length === 0) {
    tips.push('No hay datos suficientes para generar recomendaciones. Cargá datos de campañas y tráfico para obtener análisis personalizados.');
  }
  if (parts.length === 0) {
    parts.push('No hay datos suficientes para generar un análisis. Consultá con el equipo de marketing para más información.');
  }

  return { paragraphs: parts, tips };
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${MONTH_NAMES[mo] || mo} ${y}`;
}

export default function PublicClientPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    fetch(`/api/public/${id}${params.toString() ? '?' + params : ''}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, month]);

  const insights = useMemo(() => data ? generateInsights(data) : { paragraphs: [], tips: [] }, [data]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando reporte...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md border-destructive/30">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-semibold">Reporte no disponible</p>
          <p className="text-sm text-muted-foreground text-center">{error === 'Reporte no disponible' ? 'Este reporte no está habilitado para vista pública o el cliente no existe.' : 'Ocurrió un error al cargar el reporte.'}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (!data) return null;

  const { client, summary, googleAds, metaAds } = data;

  const totalCost = summary.gaTotals.cost + summary.metaTotals.spend;
  const totalImpressions = summary.gaTotals.impressions + summary.metaTotals.impressions;
  const totalClicks = summary.gaTotals.clicks;
  const totalConversions = summary.gaTotals.conversions + summary.metaTotals.results;
  const totalRevenue = summary.gaTotals.convValue + summary.analyticsSummary.totalRevenue;
  const roas = totalCost > 0 ? totalRevenue / totalCost : 0;

  const hasGoogle = (googleAds.campaigns?.length ?? 0) > 0;
  const hasMeta = (metaAds.campaigns?.length ?? 0) > 0;
  const hasAnalytics = (data.analytics.rows?.length ?? 0) > 0;

  const topGaCampaigns = (googleAds.campaigns || []).slice(0, 8);
  const topMetaCampaigns = (metaAds.campaigns || []).slice(0, 8);

  const gaChartData = topGaCampaigns.map(c => ({
    name: c.campaign_name?.length > 20 ? c.campaign_name.slice(0, 20) + '…' : c.campaign_name || 'Sin nombre',
    cost: Number(c.cost || 0),
    impressions: Number(c.impressions || 0),
    clicks: Number(c.clicks || 0),
    conversions: Number(c.conversions || 0),
  }));

  const metaChartData = topMetaCampaigns.map(c => ({
    name: c.campaign_name?.length > 20 ? c.campaign_name.slice(0, 20) + '…' : c.campaign_name || 'Sin nombre',
    spend: Number(c.spend || 0),
    impressions: Number(c.impressions || 0),
    reach: Number(c.reach || 0),
    results: Number(c.results || 0),
  }));

  const channelData = summary.channelMix
    .sort((a, b) => b.sessions - a.sessions)
    .map((c, i) => ({ ...c, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }));

  const totalChannelSessions = channelData.reduce((s, c) => s + c.sessions, 0);

  // GA monthly aggregated trend
  const gaMonthlyAgg = (googleAds.campaigns || []).reduce<Record<string, { cost: number; impressions: number; clicks: number; conversions: number }>>((acc, c) => {
    if (!c.month) return acc;
    if (!acc[c.month]) acc[c.month] = { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
    acc[c.month].cost += Number(c.cost || 0);
    acc[c.month].impressions += Number(c.impressions || 0);
    acc[c.month].clicks += Number(c.clicks || 0);
    acc[c.month].conversions += Number(c.conversions || 0);
    return acc;
  }, {});

  const gaTrendData = Object.entries(gaMonthlyAgg)
    .sort()
    .map(([month, vals]) => {
      const [, m] = month.split('-');
      return { month: MONTH_NAMES[m] || month, ...vals };
    });

  // Meta monthly aggregated trend
  const metaMonthlyAgg = (metaAds.campaigns || []).reduce<Record<string, { spend: number; impressions: number; results: number }>>((acc, c) => {
    if (!c.month) return acc;
    if (!acc[c.month]) acc[c.month] = { spend: 0, impressions: 0, results: 0 };
    acc[c.month].spend += Number(c.spend || 0);
    acc[c.month].impressions += Number(c.impressions || 0);
    acc[c.month].results += Number(c.results || 0);
    return acc;
  }, {});

  const metaTrendData = Object.entries(metaMonthlyAgg)
    .sort()
    .map(([month, vals]) => {
      const [, m] = month.split('-');
      return { month: MONTH_NAMES[m] || month, ...vals };
    });

  const overallKpis = [
    { value: totalCost, label: 'Inversión Total', gradient: '#6366f1 #06b6d4', icon: DollarSign, formatter: (v: number) => fmtCurrency(v) },
    { value: roas, label: 'ROAS General', gradient: '#a855f7 #d946ef', icon: TrendingUp, formatter: (v: number) => v.toFixed(2) + 'x' },
    { value: totalImpressions, label: 'Impresiones', gradient: '#10b981 #06b6d4', icon: Eye, formatter: (v: number) => fmt(v) },
    { value: totalConversions, label: 'Conversiones', gradient: '#f59e0b #ef4444', icon: ShoppingCart, formatter: (v: number) => fmt(v) },
    { value: summary.analyticsSummary.sessions, label: 'Sesiones Web', gradient: '#3b82f6 #8b5cf6', icon: Globe, formatter: (v: number) => fmt(v) },
    { value: totalCost > 0 ? totalRevenue / totalCost : 0, label: 'Retorno (ROAS)', gradient: '#14b8a6 #10b981', icon: Activity, formatter: (v: number) => (v * 100).toFixed(0) + '%' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative px-6 sm:px-10 py-12 sm:py-20">
          <div className="flex flex-col items-center text-center gap-6">
            {client.logo_url && (
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl ring-2 ring-border/50 bg-card/50 backdrop-blur-xl">
                <img src={client.logo_url} alt={client.name} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {client.name}
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl">
              {client.public_description || client.description || 'Reporte de Marketing Digital'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
              <Sparkles className="h-4 w-4" />
              <span>Reporte generado por Nexus Marketing Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-10 pb-16 space-y-12 relative">
        {/* Month Filter - Floating pills */}
        {summary.months.length > 1 && (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-1.5 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl p-1.5 shadow-lg">
              <button
                onClick={() => setMonth('')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  !month
                    ? 'bg-gradient-to-r from-primary/30 to-primary/20 text-primary shadow-inner scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                Todos
              </button>
              {summary.months.map(m => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    month === m
                      ? 'bg-gradient-to-r from-primary/30 to-primary/20 text-primary shadow-inner scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {fmtMonth(m)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards - Bigger */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {overallKpis.map((kpi, i) => {
            const Icon = kpi.icon;
            const [c1, c2] = kpi.gradient.split(' ');
            return (
              <div key={kpi.label} className="relative group animate-in slide-in-from-bottom-4 fade-in"
                style={{ animationDuration: '0.6s', animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}>
                <div className="absolute inset-0 rounded-2xl opacity-25 group-hover:opacity-40 transition-all duration-500 blur-xl"
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
                <Card className="relative overflow-hidden border-0 bg-card/60 backdrop-blur-xl shadow-lg">
                  <div className="absolute inset-0 opacity-5"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
                    style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide uppercase">{kpi.label}</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
                      <CountUp value={kpi.value} decimals={kpi.label === 'ROAS General' || kpi.label === 'Retorno (ROAS)' ? (kpi.label === 'ROAS General' ? 2 : 0) : 0} />
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Google Ads Section */}
        {hasGoogle && (
          <SectionCard
            icon={Search}
            gradient="#6366f1 #06b6d4"
            title="Google Ads"
            subtitle="Rendimiento de campañas de búsqueda, display y performance"
          >
            {/* Trend chart */}
            {gaTrendData.length > 0 && (
              <div className="h-52 sm:h-60 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gaTrendData}>
                    <defs>
                      <linearGradient id="gaCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gaConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="url(#gaCost)" strokeWidth={2} name="Inversión" />
                    <Area type="monotone" dataKey="conversions" stroke="#10b981" fill="url(#gaConv)" strokeWidth={2} name="Conversiones" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Inversión', value: fmtCurrency(summary.gaTotals.cost), gradient: '#6366f1 #4f46e5' },
                { label: 'Impresiones', value: fmt(summary.gaTotals.impressions), gradient: '#a855f7 #d946ef' },
                { label: 'Clicks', value: fmt(summary.gaTotals.clicks), gradient: '#10b981 #06b6d4' },
                { label: 'Conversiones', value: fmt(summary.gaTotals.conversions), gradient: '#f59e0b #ef4444' },
              ].map((s, i) => (
                <div key={s.label} className="relative group">
                  <div className="absolute inset-0 rounded-xl opacity-10 blur-md"
                    style={{ background: `linear-gradient(135deg, ${s.gradient.split(' ')[0]}, ${s.gradient.split(' ')[1]})` }} />
                  <div className="relative bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-4 sm:p-5 text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                    <p className="text-lg sm:text-xl font-bold tabular-nums mt-1">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Top campaigns bar chart */}
            {gaChartData.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Principales Campañas por Inversión</p>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gaChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                        {gaChartData.map((_, i) => (
                          <Cell key={i} fill={`hsl(${230 + i * 15}, 70%, ${55 - i * 3}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top keywords */}
            {googleAds.keywords && googleAds.keywords.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Principales Palabras Clave</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {googleAds.keywords.slice(0, 6).map((kw, i) => (
                    <div key={kw.id || i} className="flex items-center justify-between bg-card/30 backdrop-blur-sm border border-border/20 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Hash className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">{kw.keyword || '—'}</span>
                        <span className="text-xs text-muted-foreground uppercase shrink-0">{kw.match_type || ''}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-2">
                        <span className="text-sm tabular-nums text-muted-foreground">{fmt(kw.clicks || 0)} clicks</span>
                        <span className="text-sm font-bold tabular-nums">{fmtCurrency(kw.cost || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* Meta Ads Section */}
        {hasMeta && (
          <SectionCard
            icon={Megaphone}
            gradient="#a855f7 #d946ef"
            title="Meta Ads"
            subtitle="Rendimiento de campañas en Facebook e Instagram"
          >
            {/* Trend chart */}
            {metaTrendData.length > 0 && (
              <div className="h-52 sm:h-60 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metaTrendData}>
                    <defs>
                      <linearGradient id="metaSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="metaResults" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="spend" stroke="#a855f7" fill="url(#metaSpend)" strokeWidth={2} name="Inversión" />
                    <Area type="monotone" dataKey="results" stroke="#10b981" fill="url(#metaResults)" strokeWidth={2} name="Resultados" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Inversión', value: fmtCurrency(summary.metaTotals.spend), gradient: '#a855f7 #9333ea' },
                { label: 'Impresiones', value: fmt(summary.metaTotals.impressions), gradient: '#6366f1 #06b6d4' },
                { label: 'Alcance', value: fmt(summary.metaTotals.reach), gradient: '#10b981 #06b6d4' },
                { label: 'Resultados', value: fmt(summary.metaTotals.results), gradient: '#f59e0b #ef4444' },
              ].map((s, i) => (
                <div key={s.label} className="relative group">
                  <div className="absolute inset-0 rounded-xl opacity-10 blur-md"
                    style={{ background: `linear-gradient(135deg, ${s.gradient.split(' ')[0]}, ${s.gradient.split(' ')[1]})` }} />
                  <div className="relative bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-4 sm:p-5 text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                    <p className="text-lg sm:text-xl font-bold tabular-nums mt-1">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Top campaigns bar chart */}
            {metaChartData.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Principales Campañas por Inversión</p>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metaChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                        {metaChartData.map((_, i) => (
                          <Cell key={i} fill={`hsl(${280 + i * 12}, 65%, ${55 - i * 3}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top ad sets */}
            {metaAds.adSets && metaAds.adSets.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Principales Conjuntos de Anuncios</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {metaAds.adSets.slice(0, 6).map((as, i) => (
                    <div key={as.id || i} className="flex items-center justify-between bg-card/30 backdrop-blur-sm border border-border/20 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Target className="h-4 w-4 text-purple-500 shrink-0" />
                        <span className="text-sm font-medium truncate">{as.ad_set_name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-2">
                        <span className="text-sm tabular-nums text-muted-foreground">{fmt(as.impressions || 0)} imp.</span>
                        <span className="text-sm font-bold tabular-nums">{fmtCurrency(as.spend || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* Analytics - Canales Section */}
        {hasAnalytics && (
          <SectionCard
            icon={Globe}
            gradient="#06b6d4 #10b981"
            title="Canales de Tráfico"
            subtitle="Distribución de sesiones e ingresos por fuente"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Channel Mix Bars */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Sesiones por Canal</p>
                <div className="space-y-4">
                  {channelData.map((ch, i) => {
                    const pct = totalChannelSessions > 0 ? (ch.sessions / totalChannelSessions * 100) : 0;
                    return (
                      <div key={ch.source} className="animate-in slide-in-from-left-2 fade-in"
                        style={{ animationDuration: '0.4s', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{ch.source}</span>
                              <span className="text-sm font-bold tabular-nums shrink-0 ml-2">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 bg-muted/20 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: ch.color }} />
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground tabular-nums shrink-0 w-16 text-right">{fmt(ch.sessions)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary stats */}
              <div className="space-y-6">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resumen de Tráfico</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Sesiones', value: fmt(summary.analyticsSummary.sessions), icon: Globe, gradient: '#06b6d4 #10b981' },
                    { label: 'Engagement', value: fmt(summary.analyticsSummary.engagedSessions), icon: Users, gradient: '#6366f1 #4f46e5' },
                    { label: 'Eventos Clave', value: fmt(summary.analyticsSummary.keyEvents), icon: Target, gradient: '#f59e0b #ef4444' },
                    { label: 'Revenue Web', value: fmtCurrency(summary.analyticsSummary.totalRevenue), icon: DollarSign, gradient: '#10b981 #06b6d4' },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-card/30 backdrop-blur-sm border border-border/20 rounded-xl p-4 sm:p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${s.gradient.split(' ')[0]}, ${s.gradient.split(' ')[1]})` }}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase">{s.label}</span>
                        </div>
                        <p className="text-lg sm:text-xl font-bold tabular-nums">{s.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Insights Section */}
        {(insights.paragraphs.length > 0 || insights.tips.length > 0) && (
          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-4 px-5 sm:px-7 pt-5 sm:pt-7">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Análisis Inteligente</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground/70">Interpretación de datos y recomendaciones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 sm:px-7 pb-6 sm:pb-8 space-y-6">
              {insights.paragraphs.length > 0 && (
                <div className="space-y-4">
                  {insights.paragraphs.map((p, i) => (
                    <p key={i} className="text-base sm:text-lg leading-relaxed text-muted-foreground">{p}</p>
                  ))}
                </div>
              )}
              {insights.tips.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4" /> Recomendaciones
                  </p>
                  <ul className="space-y-3">
                    {insights.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-base sm:text-lg">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shrink-0" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/20 bg-card/30 backdrop-blur-sm">
        <div className="px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground/60">
            Generado por <span className="font-semibold text-primary/80">Nexus Marketing Dashboard</span>
          </p>
          <p className="text-sm text-muted-foreground/40">
            © {new Date().getFullYear()} — Datos actualizados al momento de la generación
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionCard({
  icon: Icon, gradient, title, subtitle, children,
}: {
  icon: any; gradient: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  const [c1, c2] = gradient.split(' ');
  return (
    <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 opacity-5 pointer-events-none rounded-full blur-3xl"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold">{title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground/70">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 sm:px-7">
        {children}
      </CardContent>
    </Card>
  );
}
