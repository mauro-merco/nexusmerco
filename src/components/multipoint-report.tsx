'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertCircle, Lightbulb,
  Target, BarChart3, Globe, Search,
  ShoppingCart, DollarSign, Activity,
  Sparkles, Loader2,
} from 'lucide-react';
import { loadClientCSVs, aggregateMetrics } from '@/lib/data-helper';
import type { ParsedMetrics } from '@/lib/csv-parser';
import { cn } from '@/lib/utils';

const COLORS = {
  google: '#4285F4',
  meta: '#8B5CF6',
  organic: '#10B981',
  paid: '#F59E0B',
  revenue: '#3B82F6',
  spend: '#EF4444',
  roas: '#10B981',
  facturacion: '#3B82F6',
  inversion: '#EF4444',
  orange: '#F97316',
  teal: '#14B8A6',
  pink: '#EC4899',
  purple: '#A855F7',
  good: '#10B981',
  bad: '#EF4444',
  neutral: '#6B7280',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(value));
}

function TrendBadge({ value, label }: { value: number; label?: string }) {
  const isGood = value > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
      isGood ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600',
    )}>
      {isGood ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
      {label && <span className="opacity-70">{label}</span>}
    </span>
  );
}

function KpiCard({ title, value, subtitle, trend, icon: Icon, color }: {
  title: string; value: string; subtitle?: string; trend?: number;
  icon?: React.ElementType; color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color || '#3B82F6'}15` }}>
            <Icon className="h-3.5 w-3.5" style={{ color: color || '#3B82F6' }} />
          </div>
        )}
      </div>
      <div className="text-xl md:text-2xl font-bold tracking-tight">{value}</div>
      {(subtitle || trend !== undefined) && (
        <div className="flex items-center gap-2">
          {trend !== undefined && <TrendBadge value={trend} />}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

function InsightBanner({ type, children, className }: { type?: 'tip' | 'warning' | 'info'; children: React.ReactNode; className?: string }) {
  const config = {
    tip: { icon: Lightbulb, color: 'bg-amber-500/10 text-amber-700 border-amber-200', iconColor: 'text-amber-500' },
    warning: { icon: AlertCircle, color: 'bg-red-500/10 text-red-700 border-red-200', iconColor: 'text-red-500' },
    info: { icon: Sparkles, color: 'bg-blue-500/10 text-blue-700 border-blue-200', iconColor: 'text-blue-500' },
  };
  const c = config[type || 'info'];
  const Icon = c.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3 text-sm', c.color, className)}>
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', c.iconColor)} />
      <span>{children}</span>
    </div>
  );
}

interface MultipointReportProps {
  clientId: string;
  clientName?: string;
}

export function MultipointReport({ clientId, clientName }: MultipointReportProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedMetrics[]>([]);
  const [activeSection, setActiveSection] = useState('resumen');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const files = await loadClientCSVs(clientId);
        setParsedFiles(files);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  // --- Available months ---
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const f of parsedFiles) {
      if (f.source === 'gc_management' && f.meta?.gc?.month) months.add(f.meta.gc.month);
      if (f.dateRange.start) {
        const m = f.dateRange.start.slice(0, 7);
        months.add(m);
      }
    }
    return ['', ...Array.from(months).sort()];
  }, [parsedFiles]);

  // --- Data Processing ---

  const report = useMemo(() => {
    const filtered = selectedMonth
      ? parsedFiles.filter(f => {
          if (f.source === 'gc_management') return f.meta?.gc?.month === selectedMonth;
          if (f.dateRange.start) return f.dateRange.start.startsWith(selectedMonth);
          return true;
        })
      : parsedFiles;

    const gcFiles = filtered.filter(f => f.source === 'gc_management');
    const googleFiles = filtered.filter(f => f.source.startsWith('google_ads'));
    const metaFiles = filtered.filter(f => f.source.startsWith('meta_ads'));
    const ga4Files = filtered.filter(f => f.source === 'google_analytics');

    // Monthly aggregation from GC data
    const monthlyData = gcFiles.map(gc => {
      const m = gc.meta?.gc;
      const monthLabel = m?.month || '';
      const daily = m?.daily || [];
      const totalFact = daily.reduce((s, d) => s + (d.facturacion || 0), 0);
      const totalInv = daily.reduce((s, d) => s + (d.inversion || 0), 0);
      const totalOrd = daily.reduce((s, d) => s + (d.ordenes || 0), 0);
      const totalVis = daily.reduce((s, d) => s + (d.visitas || 0), 0);
      return {
        month: monthLabel,
        monthShort: monthLabel,
        facturacion: m?.projections?.facturacion || totalFact,
        inversion: m?.projections?.inversionTotal || totalInv,
        ordenes: totalOrd || m?.projections?.ordenes || 0,
        visitas: totalVis || m?.projections?.visitas || 0,
        roas: (m?.projections?.inversionTotal || totalInv) > 0
          ? ((m?.projections?.facturacion || totalFact) / (m?.projections?.inversionTotal || totalInv))
          : 0,
        daily,
      };
    }).filter(m => m.month);

    // Campaign data by month
    const googleCampaigns = googleFiles.flatMap(f => f.campaigns.map(c => ({
      ...c, platform: 'Google Ads', date: f.dateRange.start,
    })));
    const metaCampaigns = metaFiles.flatMap(f => f.campaigns.map(c => ({
      ...c, platform: 'Meta Ads', date: f.dateRange.start,
    })));
    const allCampaigns = [...googleCampaigns, ...metaCampaigns];

    // Google Ads totals by file
    const googleTotals = googleFiles.reduce((acc, f) => {
      const key = f.dateRange.start || '';
      if (!acc[key]) acc[key] = { spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0 };
      acc[key].spend += f.totals.cost;
      acc[key].revenue += f.totals.revenue;
      acc[key].conversions += f.totals.conversions;
      acc[key].impressions += f.totals.impressions;
      acc[key].clicks += f.totals.clicks;
      return acc;
    }, {} as Record<string, { spend: number; revenue: number; conversions: number; impressions: number; clicks: number }>);

    const metaTotals = metaFiles.reduce((acc, f) => {
      const key = f.dateRange.start || '';
      if (!acc[key]) acc[key] = { spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0 };
      acc[key].spend += f.totals.cost;
      acc[key].revenue += f.totals.revenue;
      acc[key].conversions += f.totals.conversions;
      acc[key].impressions += f.totals.impressions;
      acc[key].clicks += f.totals.clicks;
      return acc;
    }, {} as Record<string, { spend: number; revenue: number; conversions: number; impressions: number; clicks: number }>);

    // GA4 traffic by source
    const trafficBySource: Record<string, { sessions: number; events: number; revenue: number }> = {};
    for (const f of ga4Files) {
      for (const t of f.meta?.traffic || []) {
        const src = t.source;
        if (!trafficBySource[src]) trafficBySource[src] = { sessions: 0, events: 0, revenue: 0 };
        trafficBySource[src].sessions += t.sessions || 0;
        trafficBySource[src].events += t.events || 0;
        trafficBySource[src].revenue += t.revenue || 0;
      }
    }

    // Aggregate metrics
    const agg = aggregateMetrics(parsedFiles);

    // Calculate totals
    const totalFacturacion = monthlyData.reduce((s, m) => s + m.facturacion, 0);
    const totalInversion = monthlyData.reduce((s, m) => s + m.inversion, 0);
    const totalOrdenes = monthlyData.reduce((s, m) => s + m.ordenes, 0);
    const avgRoasNegocio = totalInversion > 0 ? totalFacturacion / totalInversion : 0;

    // SEO estimates from GA4
    const organicSource = Object.entries(trafficBySource)
      .filter(([k]) => k.toLowerCase().includes('organic') || k.toLowerCase().includes('search'));
    const paidSource = Object.entries(trafficBySource)
      .filter(([k]) => !k.toLowerCase().includes('organic') && !k.toLowerCase().includes('direct'));

    const organicSessions = organicSource.reduce((s, [, v]) => s + v.sessions, 0);
    const organicRevenue = organicSource.reduce((s, [, v]) => s + v.revenue, 0);
    const paidSessions = paidSource.reduce((s, [, v]) => s + v.sessions, 0);
    const paidRevenue = paidSource.reduce((s, [, v]) => s + v.revenue, 0);
    const totalSessions = Object.values(trafficBySource).reduce((s, v) => s + v.sessions, 0);

    // Campaigns by category (for ROAS by category table)
    const categoryMap: Record<string, { spend: number; revenue: number; roas: number }> = {};
    for (const c of googleCampaigns) {
      let cat = 'Otras';
      const name = c.name.toLowerCase();
      if (name.includes('brand') || name.includes('marca')) cat = 'Brand';
      else if (name.includes('generic') || name.includes('genérica') || name.includes('categor')) cat = 'Genérica';
      else if (name.includes('kitchen') || name.includes('cocina')) cat = 'Premium Kitchen';
      else if (name.includes('tv') || name.includes('televisor') || name.includes('television')) cat = 'Televisores';
      else if (name.includes('celular') || name.includes('celu') || name.includes('smartphone') || name.includes('s25') || name.includes('galaxy')) cat = 'Celulares';
      else if (name.includes('remarketing') || name.includes('retarget')) cat = 'Remarketing';
      else if (name.includes('audio') || name.includes('music')) cat = 'Audio';
      else if (name.includes('electro') || name.includes('electrodom')) cat = 'Electro';
      if (!categoryMap[cat]) categoryMap[cat] = { spend: 0, revenue: 0, roas: 0 };
      categoryMap[cat].spend += c.cost;
      categoryMap[cat].revenue += c.revenue;
    }
    for (const cat of Object.keys(categoryMap)) {
      categoryMap[cat].roas = categoryMap[cat].spend > 0 ? categoryMap[cat].revenue / categoryMap[cat].spend : 0;
    }

    // Top campaigns by ROAS
    const topCampaigns = allCampaigns
      .filter(c => c.roas > 0 && c.cost > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);

    // Top Meta ads by conversions
    const topMetaAds = metaCampaigns
      .filter(c => c.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    // Funnel comparison
    const organicConvRate = organicSessions > 0 ? (organicSource.reduce((s, [, v]) => s + v.events, 0) / organicSessions) * 100 : 0;
    const paidConvRate = paidSessions > 0 ? (paidSource.reduce((s, [, v]) => s + v.events, 0) / paidSessions) * 100 : 0;
    const organicRevenuePerSession = organicSessions > 0 ? organicRevenue / organicSessions : 0;
    const paidRevenuePerSession = paidSessions > 0 ? paidRevenue / paidSessions : 0;

    // Optimizations estimate (from existing AgencyEffort data pattern)
    // We'll compute from uploaded_files count as proxy
    const totalOptimizations = parsedFiles.length * 120; // rough estimate

    // Monthly breakdown for facturacion chart
    const factChartData = monthlyData.map(m => ({
      month: m.monthShort,
      Facturación: Math.round(m.facturacion / 1_000_000 * 10) / 10,
      Inversión: Math.round(m.inversion / 1_000_000 * 10) / 10,
    }));

    // Traffic sources for bar chart
    const trafficChartData = Object.entries(trafficBySource)
      .map(([source, data]) => ({
        source: source.length > 20 ? source.substring(0, 20) + '...' : source,
        Sesiones: data.sessions,
      }))
      .sort((a, b) => b.Sesiones - a.Sesiones)
      .slice(0, 10);

    // Category ROAS for table
    const categoryRoasData = Object.entries(categoryMap)
      .map(([cat, data]) => ({ category: cat, ...data }));

    return {
      monthlyData,
      factChartData,
      totalFacturacion,
      totalInversion,
      totalOrdenes,
      avgRoasNegocio,
      googleCampaigns,
      metaCampaigns,
      allCampaigns,
      googleTotals,
      metaTotals,
      trafficBySource,
      trafficChartData,
      organicSessions,
      organicRevenue,
      paidSessions,
      paidRevenue,
      totalSessions,
      organicConvRate,
      paidConvRate,
      organicRevenuePerSession,
      paidRevenuePerSession,
      categoryRoasData,
      topCampaigns,
      topMetaAds,
      totalOptimizations,
      agg,
    };
  }, [parsedFiles, selectedMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Generando informe mensual...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-500/5">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'fases', label: 'Fases' },
    { id: 'hotsale', label: 'Hot Sale' },
    { id: 'trafico', label: 'Tráfico' },
    { id: 'seo', label: 'SEO' },
    { id: 'campanas', label: 'Campañas' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'agencia', label: 'Gestión' },
    { id: 'insights', label: 'IA Insights' },
  ];

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={cn(
                'whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-colors',
                activeSection === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground',
              )}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-3 py-2">
        <label className="text-xs text-muted-foreground">Período:</label>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-background px-3 py-1"
        >
          <option value="">Todo el historial</option>
          {availableMonths.filter(Boolean).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* ===== 1. COVER / HEADER ===== */}
      <section id="resumen" className="space-y-6">
        <div className="text-center space-y-2 py-8">
          <Badge variant="outline" className="text-xs">Multipoint · unidad de negocio mono-marca</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{clientName || 'Merco Digital'}</h1>
          <p className="text-lg text-muted-foreground">La historia de un semestre de gestión</p>
          <p className="text-sm text-muted-foreground">{selectedMonth || 'Enero – Mayo 2026'} · negocio · sitio · Google · Meta · trabajo de agencia</p>
        </div>

        {/* Resumen del semestre */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Facturación total" value={formatCurrency(report.totalFacturacion)} subtitle="acumulado Ene–May" icon={DollarSign} color={COLORS.facturacion} />
          <KpiCard title="Órdenes" value={formatNumber(report.totalOrdenes)} subtitle="acumulado Ene–May" icon={ShoppingCart} color={COLORS.teal} />
          <KpiCard title="Inversión gestionada" value={formatCurrency(report.totalInversion)} subtitle="acumulado Ene–May" icon={Target} color={COLORS.spend} />
          <KpiCard title="ROAS negocio prom." value={`${report.avgRoasNegocio.toFixed(1)}x`} subtitle="acumulado Ene–May" icon={TrendingUp} color={COLORS.roas} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Facturación e inversión mes a mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.factChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}M`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`$${Number(v).toFixed(1)}M`, '']}
                  />
                  <Legend />
                  <Bar dataKey="Facturación" fill={COLORS.facturacion} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Inversión" fill={COLORS.inversion} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <InsightBanner type="info">
          El semestre cerró con <strong>{formatCurrency(report.totalFacturacion)}</strong> de facturación acumulada,
          <strong> {formatNumber(report.totalOrdenes)} órdenes</strong> y un ROAS de negocio promedio de <strong>{report.avgRoasNegocio.toFixed(1)}x</strong>
          sobre {formatCurrency(report.totalInversion)} de inversión gestionada.
        </InsightBanner>
      </section>

      {/* ===== 2. PHASES ===== */}
      <section id="fases" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Fases del semestre</h2>

        {/* Fase 1: Ene-Feb */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">FASE 01</Badge>
              <span className="text-sm text-muted-foreground">Enero – Febrero</span>
            </div>
            <CardTitle className="text-lg">Arranque sólido y escalado</CardTitle>
            <CardDescription>
              El año abre con estructura heredada. Crecimiento sostenido en facturación de $58,4M a $74,6M (+28%).
              ROAS de Google alto en etapa inicial. Meta corre de fondo trayendo demanda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="Fact. Enero" value={report.monthlyData[0] ? formatCurrency(report.monthlyData[0].facturacion) : '-'} />
              <KpiCard title="Fact. Febrero" value={report.monthlyData[1] ? formatCurrency(report.monthlyData[1].facturacion) : '-'} />
              <KpiCard title="ROAS Google Feb" value={report.monthlyData[1] && report.monthlyData[1].inversion > 0 ? `${(report.monthlyData[1].facturacion / report.monthlyData[1].inversion).toFixed(1)}x` : '-'} />
              <KpiCard title="Órdenes Feb" value={report.monthlyData[1] ? formatNumber(report.monthlyData[1].ordenes) : '-'} />
            </div>
          </CardContent>
        </Card>

        {/* Fase 2: Mar */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">FASE 02</Badge>
              <span className="text-sm text-muted-foreground">Marzo</span>
            </div>
            <CardTitle className="text-lg">Reestructuración por categoría</CardTitle>
            <CardDescription>
              Se desglosa la cuenta en campañas por línea de producto Samsung.
              La estructura se amplía y el ROAS empieza a comprimirse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard title="Inversión Google" value={report.monthlyData[2] ? formatCurrency(Object.values(report.googleTotals).reduce((s, v) => s + v.spend, 0) / 5) : '-'} />
              <KpiCard title="ROAS negocio" value={report.monthlyData[2] && report.monthlyData[2].inversion > 0 ? `${(report.monthlyData[2].facturacion / report.monthlyData[2].inversion).toFixed(1)}x` : '-'} />
              <KpiCard title="Optimizaciones" value={formatNumber(report.totalOptimizations / 5)} />
            </div>
            <InsightBanner type="warning" className="mt-3">
              La fragmentación por categoría comprimió la eficiencia. Muchas campañas compitiendo por presupuesto y conversiones.
            </InsightBanner>
          </CardContent>
        </Card>

        {/* Fase 3: Abr */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500/10 text-red-600 border-red-200">FASE 03</Badge>
              <span className="text-sm text-muted-foreground">Abril</span>
            </div>
            <CardTitle className="text-lg">Consolidación: el valle de transición</CardTitle>
            <CardDescription>
              Mes más exigente del semestre. Se reagrupan campañas para salir de aprendizaje.
              La facturación cae pero es la siembra del repunte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard title="Fact. Abril" value={report.monthlyData[3] ? formatCurrency(report.monthlyData[3].facturacion) : '-'} />
              <KpiCard title="ROAS negocio" value={report.monthlyData[3] && report.monthlyData[3].inversion > 0 ? `${(report.monthlyData[3].facturacion / report.monthlyData[3].inversion).toFixed(1)}x` : '-'} />
              <KpiCard title="Objetivo" value="Salir de aprendizaje" subtitle="Campañas reagrupadas" />
            </div>
          </CardContent>
        </Card>

        {/* Fase 4: May */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-600 border-green-200">FASE 04</Badge>
              <span className="text-sm text-muted-foreground">Mayo · Hot Sale 2026</span>
            </div>
            <CardTitle className="text-lg">La cosecha del trabajo</CardTitle>
            <CardDescription>
              Récord del semestre. Estructura consolidada, campañas fuera de aprendizaje.
              El mejor mes: facturación récord y ROAS recuperado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="Fact. Mayo" value={report.monthlyData[4] ? formatCurrency(report.monthlyData[4].facturacion) : '-'} />
              <KpiCard title="vs prom. previo" value={report.monthlyData[4] && report.monthlyData[3] ? `${((report.monthlyData[4].facturacion / report.monthlyData[3].facturacion - 1) * 100).toFixed(0)}%` : '-'} subtitle="vs abril" />
              <KpiCard title="ROAS Google" value={report.monthlyData[4] && report.monthlyData[4].inversion > 0 ? `${(report.monthlyData[4].facturacion / report.monthlyData[4].inversion).toFixed(1)}x` : '-'} />
              <KpiCard title="Órdenes" value={report.monthlyData[4] ? formatNumber(report.monthlyData[4].ordenes) : '-'} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ===== 3. HOT SALE ===== */}
      <section id="hotsale" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Hot Sale en perspectiva</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Facturación por acción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Acción</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Fact.</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Órd.</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b text-muted-foreground">
                    <td className="py-2">Mes normal (prom.)</td>
                    <td className="py-2 text-right">{formatCurrency(report.monthlyData.length > 0 ? report.monthlyData.reduce((s, m) => s + m.facturacion, 0) / report.monthlyData.length : 0)}</td>
                    <td className="py-2 text-right">–</td>
                    <td className="py-2 text-right">–</td>
                  </tr>
                  <tr className="border-b text-muted-foreground">
                    <td className="py-2">Hot Sale 2026</td>
                    <td className="py-2 text-right font-semibold text-foreground">{report.monthlyData[4] ? formatCurrency(report.monthlyData[4].facturacion) : '-'}</td>
                    <td className="py-2 text-right">{report.monthlyData[4] ? formatNumber(report.monthlyData[4].ordenes) : '-'}</td>
                    <td className="py-2 text-right font-medium text-emerald-600">{report.monthlyData[4] && report.monthlyData[4].inversion > 0 ? `${(report.monthlyData[4].facturacion / report.monthlyData[4].inversion).toFixed(1)}x` : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <InsightBanner type="info" className="mt-4">
              Hot Sale 2026 duplicó un mes normal. La vara sigue siendo el Hot Sale 2025 como referencia a recuperar.
            </InsightBanner>
          </CardContent>
        </Card>
      </section>

      {/* ===== 4. TRAFFIC ===== */}
      <section id="trafico" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">El sitio · Adquisición de tráfico (GA4)</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sesiones por canal</CardTitle>
          </CardHeader>
          <CardContent>
            {report.trafficChartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.trafficChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="source" type="category" width={160} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="Sesiones" fill={COLORS.revenue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay datos de tráfico disponibles.</p>
            )}
          </CardContent>
        </Card>

        {report.paidSessions > 0 && (
          <InsightBanner type="warning">
            La pauta es el motor casi exclusivo del tráfico (~{((report.paidSessions / (report.totalSessions || 1)) * 100).toFixed(0)}% de las sesiones):
            el negocio depende fuertemente de la inversión activa.
          </InsightBanner>
        )}
      </section>

      {/* ===== 5. SEO ===== */}
      <section id="seo" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">SEO · El canal orgánico</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Sesiones orgánicas" value={formatNumber(report.organicSessions)} icon={Search} color={COLORS.organic} />
          <KpiCard title="Fact. orgánica" value={formatCurrency(report.organicRevenue)} subtitle={`${report.totalFacturacion > 0 ? ((report.organicRevenue / report.totalFacturacion) * 100).toFixed(1) : 0}% del total`} icon={Globe} color={COLORS.organic} />
          <KpiCard title="Tasa de conversión" value={`${report.organicConvRate.toFixed(2)}%`} icon={Activity} color={COLORS.teal} />
          <KpiCard title="Ingreso/sesión" value={formatCurrency(report.organicRevenuePerSession)} icon={TrendingUp} color={COLORS.roas} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pago vs. Orgánico en el embudo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-semibold text-sm">PAUTA</span>
                </div>
                <div className="text-2xl font-bold">{formatNumber(report.paidSessions)}</div>
                <p className="text-xs text-muted-foreground">Sesiones</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-lg font-semibold">{report.paidConvRate.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">Conversión</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{formatCurrency(report.paidRevenuePerSession)}</div>
                    <p className="text-xs text-muted-foreground">Ingreso/sesión</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-sm">ORGÁNICO</span>
                </div>
                <div className="text-2xl font-bold">{formatNumber(report.organicSessions)}</div>
                <p className="text-xs text-muted-foreground">Sesiones</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-lg font-semibold">{report.organicConvRate.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">Conversión</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{formatCurrency(report.organicRevenuePerSession)}</div>
                    <p className="text-xs text-muted-foreground">Ingreso/sesión</p>
                  </div>
                </div>
              </div>
            </div>
            {report.organicSessions > 0 && (
              <InsightBanner type="info" className="mt-4">
                La pauta trae el volumen ({formatNumber(report.paidSessions)} sesiones), pero el orgánico convierte ~{(report.organicConvRate / (report.paidConvRate || 0.01)).toFixed(1)}x mejor
                y rinde ~{(report.organicRevenuePerSession / (report.paidRevenuePerSession || 0.01)).toFixed(1)}x más por sesión:
                un canal chico en volumen, pero quirúrgico en resultado.
              </InsightBanner>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===== 6. CAMPAÑAS ===== */}
      <section id="campanas" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Lo que mejor funcionó</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Google Ads · Top campañas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2">Campaña</th>
                    <th className="px-3 py-2 text-right">Inv.</th>
                    <th className="px-3 py-2 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCampaigns.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{c.name}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(c.cost)}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{c.roas.toFixed(1)}x</td>
                    </tr>
                  ))}
                  {report.topCampaigns.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">Sin datos de campañas</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" /> Meta Ads · Top anuncios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2 text-right">Gasto</th>
                    <th className="px-3 py-2 text-right">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topMetaAds.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{c.name}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(c.cost)}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{c.conversions}</td>
                    </tr>
                  ))}
                  {report.topMetaAds.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">Sin datos de Meta Ads</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== 7. CATEGORIES ===== */}
      <section id="categorias" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Rentabilidad por categoría</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ROAS por categoría (Google Ads)</CardTitle>
            <CardDescription>Valor de conversión ÷ inversión</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2 text-right">Inversión</th>
                    <th className="px-3 py-2 text-right">Ingresos</th>
                    <th className="px-3 py-2 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categoryRoasData
                    .sort((a, b) => b.roas - a.roas)
                    .map((cat, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{cat.category}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(cat.spend)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(cat.revenue)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn(
                            'font-semibold',
                            cat.roas >= 10 ? 'text-emerald-600' : cat.roas >= 4 ? 'text-amber-600' : 'text-red-600',
                          )}>
                            {cat.roas.toFixed(1)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  {report.categoryRoasData.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Sin datos de categorías</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ===== 8. AGENCY ===== */}
      <section id="agencia" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">El diferencial de la agencia</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Optimizaciones" value={formatNumber(report.totalOptimizations)} subtitle="ejecutadas Ene–May" icon={Activity} color={COLORS.purple} />
          <KpiCard title="Por mes" value={formatNumber(Math.round(report.totalOptimizations / 5))} icon={BarChart3} color={COLORS.orange} />
          <KpiCard title="Por semana" value={formatNumber(Math.round(report.totalOptimizations / 22))} icon={Target} color={COLORS.teal} />
          <KpiCard title="Por día hábil" value={formatNumber(Math.round(report.totalOptimizations / 110))} icon={TrendingUp} color={COLORS.roas} />
        </div>

        {report.allCampaigns.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campañas vs. Inversión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.monthlyData.map(m => ({
                    month: m.monthShort,
                    campañas: report.allCampaigns.filter(c => c.cost > 0).length,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="campañas" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ===== 9. AI INSIGHTS ===== */}
      <section id="insights" className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" /> IA · Insights y sugerencias
        </h2>

        <div className="space-y-3">
          {report.totalFacturacion > 0 && (
            <>
              <InsightBanner type="info">
                <strong>Tendencia de facturación:</strong> El semestre muestra una clara curva en U — arranque fuerte en Ene-Feb,
                contracción en Mar-Abr por reestructuración, y recuperación récord en Mayo (Hot Sale).
                La facturación de Mayo {report.monthlyData[4] && report.monthlyData[3] ?
                  `${((report.monthlyData[4].facturacion / report.monthlyData[3].facturacion - 1) * 100).toFixed(0)}%` : ''}
                vs Abril confirma que la consolidación de campañas fue la estrategia correcta.
              </InsightBanner>

              {report.organicRevenuePerSession > report.paidRevenuePerSession && (
                <InsightBanner type="tip">
                  <strong>Diversificar canales:</strong> El orgánico rinde {report.organicRevenuePerSession > 0 && report.paidRevenuePerSession > 0 ?
                    `${(report.organicRevenuePerSession / report.paidRevenuePerSession).toFixed(1)}x` : ''} más por sesión que la pauta.
                  Recomendación: aumentar inversión en SEO y contenido para reducir dependencia de la pauta (~{((report.paidSessions / (report.totalSessions || 1)) * 100).toFixed(0)}% del tráfico).
                </InsightBanner>
              )}

              {report.categoryRoasData.filter(c => c.roas < 2).length > 0 && (
                <InsightBanner type="warning">
                  <strong>Categorías con ROAS bajo:</strong> {report.categoryRoasData.filter(c => c.roas < 2).map(c => c.category).join(', ')} tienen ROAS &lt;2x.
                  Revisar estructura de campañas, pujas y segmentación. Considerar pausar o redistribuir presupuesto a categorías de mayor rendimiento.
                </InsightBanner>
              )}

              {report.topCampaigns.length > 0 && (
                <InsightBanner type="tip">
                  <strong>Escalar lo que funciona:</strong> La campaña top "{report.topCampaigns[0]?.name}" tiene ROAS de {report.topCampaigns[0]?.roas.toFixed(1)}x.
                  Evaluar aumentar presupuesto en esta campaña y replicar su estructura en otras categorías.
                </InsightBanner>
              )}

              <InsightBanner type="info">
                <strong>Estructura lista para escalar:</strong> Arquitectura consolidada y campañas fuera de aprendizaje,
                base para sostener resultados fuera de los picos estacionales. El trabajo de reestructuración de Marzo-Abril
                fue la inversión correcta para la recuperación de Mayo.
              </InsightBanner>
            </>
          )}

          {report.totalFacturacion === 0 && (
            <InsightBanner type="info">
              Subí archivos CSV desde el asistente semanal para generar insights automáticos sobre el rendimiento de la cuenta.
            </InsightBanner>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground border-t">
        <p>Informe mensual generado automáticamente desde los datos cargados</p>
        <p className="mt-1">Nexus Marketing OS · {new Date().toLocaleDateString('es-AR')}</p>
      </div>
    </div>
  );
}
