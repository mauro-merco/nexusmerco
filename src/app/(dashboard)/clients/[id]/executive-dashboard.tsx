'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGcMetrics } from '@/lib/hooks/use-data';
import { cn } from '@/lib/utils';
import {
  DollarSign, ShoppingCart, TrendingUp, Target,
  Loader2, AlertCircle, BarChart3, LineChart as LineChartIcon, TrendingDown,
  Users, Ticket, CreditCard, Percent,
  PieChart, Search, Lightbulb, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(n));
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

interface MonthAgg {
  month: string;
  facturacion: number;
  ordenes: number;
  inversion: number;
  roas: number;
  visitas: number;
  ticketPromedio: number;
  cpa: number;
  cr: number;
  invGoogle: number;
  invMeta: number;
  invTikTok: number;
  roasTiendas: number;
  roasFullbai: number;
  cpv: number;
  relacion: number;
  fullbaiRevenue: number;
}

function aggregateDaily(daily: Array<Record<string, unknown>>) {
  let facturacion = 0, ordenes = 0, inversion = 0, visitas = 0, ticketPromedio = 0;
  let cpa = 0, cr = 0, roas = 0, cpv = 0, relacion = 0, fullbaiRevenue = 0;
  let count = 0;
  for (const d of daily) {
    facturacion += Number(d.facturacion) || 0;
    ordenes += Number(d.ordenes) || 0;
    inversion += Number(d.inversion) || 0;
    visitas += Number(d.visitas) || 0;
    ticketPromedio += Number(d.ticket_promedio) || 0;
    cpa += Number(d.cpa) || 0;
    cr += Number(d.cr) || 0;
    roas += Number(d.roas) || 0;
    cpv += Number(d.cpv) || 0;
    relacion += Number(d.relacion) || 0;
    count++;
  }
  return {
    facturacion, ordenes, inversion, visitas,
    ticketPromedio: count > 0 ? ticketPromedio / count : 0,
    cpa: count > 0 ? cpa / count : 0,
    cr: count > 0 ? cr / count : 0,
    roas: count > 0 ? roas / count : 0,
    cpv: count > 0 ? cpv / count : 0,
    relacion: count > 0 ? relacion / count : 0,
  };
}

interface ExecutiveDashboardProps {
  clientId: string;
  clientName?: string;
}

const MONTH_ORDER = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function generateInsights(aggs: MonthAgg[], totals: Record<string, number>) {
  const parts: string[] = [];
  const tips: string[] = [];

  if (aggs.length === 0) return { paragraphs: ['Sin datos para analizar.'], tips: [] };

  const sorted = [...aggs].sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const roas = totals.inversion > 0 ? totals.facturacion / totals.inversion : 0;
  const cr = totals.visitas > 0 ? totals.ordenes / totals.visitas : 0;
  const cpa = totals.ordenes > 0 ? totals.inversion / totals.ordenes : 0;
  const ticket = totals.ordenes > 0 ? totals.facturacion / totals.ordenes : 0;

  // Trend analysis
  let factTrend = 'estable';
  let invTrend = 'estable';
  if (sorted.length > 1) {
    const midIdx = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midIdx);
    const secondHalf = sorted.slice(midIdx);
    const f1 = firstHalf.reduce((s, m) => s + m.facturacion, 0) / firstHalf.length;
    const f2 = secondHalf.reduce((s, m) => s + m.facturacion, 0) / secondHalf.length;
    factTrend = f2 > f1 * 1.1 ? 'creciente' : f2 < f1 * 0.9 ? 'decreciente' : 'estable';

    const i1 = firstHalf.reduce((s, m) => s + m.inversion, 0) / firstHalf.length;
    const i2 = secondHalf.reduce((s, m) => s + m.inversion, 0) / secondHalf.length;
    invTrend = i2 > i1 * 1.1 ? 'creciente' : i2 < i1 * 0.9 ? 'decreciente' : 'estable';
  }

  // ROAS analysis
  if (roas >= 3) {
    parts.push(`El ROAS general es de ${roas.toFixed(2)}x, lo que indica que por cada peso invertido se generaron $${roas.toFixed(2)} en facturación. Es un rendimiento sólido que refleja una gestión eficiente de las campañas.`);
    tips.push('Considerá aumentar la inversión en los canales con mejor ROAS para escalar resultados.');
  } else if (roas >= 1.5) {
    parts.push(`El ROAS general es de ${roas.toFixed(2)}x, un rendimiento aceptable. La facturación supera a la inversión, pero hay margen para optimizar.`);
    tips.push('Revisá las campañas de menor rendimiento y ajustá segmentación y pujas para mejorar el ROAS.');
  } else {
    parts.push(`El ROAS general es de ${roas.toFixed(2)}x, por debajo de lo ideal. La inversión no está generando el retorno esperado y requiere una revisión profunda.`);
    tips.push('Evaluá reducir inversión en canales de bajo rendimiento y redirigir presupuesto a los que mejor conversión tienen.');
  }

  // CPA analysis
  if (cpa > 0) {
    if (cpa < ticket * 0.2) {
      parts.push(`El CPA promedio es de ${formatCurrency(cpa)}, representando menos del 20% del ticket promedio (${formatCurrency(ticket)}). La estructura de costos de adquisición es saludable.`);
    } else if (cpa < ticket * 0.5) {
      parts.push(`El CPA de ${formatCurrency(cpa)} equivale al ${(cpa / ticket * 100).toFixed(0)}% del ticket promedio. Hay espacio para optimizar, pero la ecuación unitaria cierra positivamente.`);
    } else {
      parts.push(`El CPA de ${formatCurrency(cpa)} es elevado en relación al ticket promedio de ${formatCurrency(ticket)}. Se recomienda trabajar en estrategias de reducción de costos de adquisición.`);
      tips.push('Implementar campañas de retargeting y fidelización para reducir la dependencia de adquisición paga costosa.');
    }
  }

  // Conversion rate
  if (cr > 0) {
    const crPct = cr * 100;
    if (crPct >= 3) {
      parts.push(`La tasa de conversión es del ${crPct.toFixed(1)}%, un valor excelente que indica que el sitio y las campañas están bien alineados con la intención de compra.`);
    } else if (crPct >= 1) {
      parts.push(`La tasa de conversión es del ${crPct.toFixed(1)}%, dentro de parámetros normales para el sector. Siempre hay oportunidades de mejora en la experiencia de usuario.`);
      tips.push('Optimizá las landing pages y simplificá el checkout para mejorar la tasa de conversión.');
    } else {
      parts.push(`La tasa de conversión es del ${crPct.toFixed(1)}%, por debajo del promedio del mercado. Es prioritario trabajar en la optimización de la experiencia de conversión.`);
      tips.push('Realizá tests A/B en páginas clave y revisá la velocidad de carga del sitio.');
    }
  }

  // Visit volume
  if (totals.visitas > 0) {
    const ordenesPorVisita = totals.ordenes > 0 ? (totals.ordenes / totals.visitas * 100).toFixed(1) : '0.0';
    parts.push(`Se registraron ${formatNumber(totals.visitas)} visitas totales, con una tasa de conversión a orden del ${ordenesPorVisita}%. ${factTrend === 'creciente' ? 'La tendencia de facturación es positiva mes a mes.' : factTrend === 'decreciente' ? 'La tendencia de facturación requiere atención, ya que viene descendiendo.' : 'La facturación se mantiene estable a lo largo de los meses.'}`);
  }

  // Ticket promedio
  if (totals.ticketPromedio > 0) {
    if (totals.ordenes > 0) {
      const realTicket = totals.facturacion / totals.ordenes;
      parts.push(`El ticket promedio ponderado es de ${formatCurrency(realTicket)}. ${realTicket >= 500000 ? 'Es un ticket alto que sugiere ventas de valor significativo.' : 'Es un ticket moderado que permite trabajar en upselling y cross-selling.'}`);
      tips.push('Implementá estrategias de cross-selling y bundles para incrementar el ticket promedio.');
    }
  }

  // Investment distribution
  const totalInv = totals.invGoogle + totals.invMeta + totals.invTikTok;
  if (totalInv > 0) {
    const googlePct = (totals.invGoogle / totalInv * 100).toFixed(0);
    const metaPct = (totals.invMeta / totalInv * 100).toFixed(0);
    parts.push(`La distribución de inversión es: Google Ads ${googlePct}%, Meta Ads ${metaPct}%${totals.invTikTok > 0 ? `, TikTok ${(totals.invTikTok / totalInv * 100).toFixed(0)}%` : ''}. ${Number(googlePct) > 70 ? 'Hay una fuerte concentración en Google que podría diversificarse.' : 'La distribución entre plataformas está relativamente balanceada.'}`);
  }

  // Fullbai revenue
  if (totals.fullbaiRevenue > 0) {
    const fbPct = (totals.fullbaiRevenue / totals.facturacion * 100).toFixed(1);
    if (Number(fbPct) > 0) {
      parts.push(`Fullbai representa el ${fbPct}% de la facturación total.`);
    }
  }

  // CPV
  if (totals.cpv > 0 && totals.visitas > 0) {
    parts.push(`El costo por visita es de ${formatCurrency(totals.cpv)}. ${totals.cpv < 500 ? 'Es un CPV eficiente que permite generar volumen de tráfico a bajo costo.' : 'El CPV está en un rango medio, se puede optimizar mejorando la segmentación.'}`);
  }

  return { paragraphs: parts, tips };
}

export function ExecutiveDashboard({ clientId }: ExecutiveDashboardProps) {
  const { data: gcRecords, loading, error } = useGcMetrics(clientId);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'facturacion' | 'inversion'>('facturacion');

  const monthAggs: MonthAgg[] = useMemo(() => {
    if (!gcRecords) return [];
    return gcRecords.map((rec: Record<string, unknown>) => {
      const daily = (rec.gc_daily as Array<Record<string, unknown>>) || [];
      const agg = aggregateDaily(daily);
      const hasDaily = daily.length > 0;
      const getVal = (field: string, proyField: string) =>
        hasDaily ? Number(agg[field as keyof typeof agg]) || 0 : Number(rec[proyField]) || 0;
      return {
        month: rec.month as string,
        facturacion: getVal('facturacion', 'proy_facturacion'),
        ordenes: getVal('ordenes', 'proy_ordenes'),
        inversion: getVal('inversion', 'proy_inversion_total'),
        visitas: getVal('visitas', 'proy_visitas'),
        ticketPromedio: getVal('ticketPromedio', 'proy_ticket_promedio'),
        cpa: getVal('cpa', 'proy_cpa'),
        cr: getVal('cr', 'proy_cr'),
        invGoogle: getVal('invGoogle', 'proy_inv_google'),
        invMeta: getVal('invMeta', 'proy_inv_meta'),
        invTikTok: getVal('invTikTok', 'proy_inv_tiktok'),
        roasTiendas: Number(rec.proy_roas_tiendas) || 0,
        roasFullbai: Number(rec.proy_roas_fullbai) || 0,
        cpv: getVal('cpv', 'proy_cpv'),
        relacion: getVal('relacion', 'proy_relacion'),
        fullbaiRevenue: Number(rec.proy_fullbai_revenue) || 0,
        roas: 0,
      };
    }).map((m) => ({
      ...m,
      roas: m.inversion > 0 ? m.facturacion / m.inversion : 0,
    })).sort((a, b) => {
      return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month);
    });
  }, [gcRecords]);

  const months = useMemo(() => monthAggs.map(m => m.month), [monthAggs]);

  const selectedAggs = useMemo(() => {
    if (!selectedMonth) return monthAggs;
    const agg = monthAggs.find(m => m.month === selectedMonth);
    return agg ? [agg] : [];
  }, [monthAggs, selectedMonth]);

  const totals = useMemo(() => {
    const sum = (field: keyof MonthAgg) => selectedAggs.reduce((s, m) => s + (Number(m[field]) || 0), 0);
    const avg = (field: keyof MonthAgg) => selectedAggs.length > 0 ? sum(field) / selectedAggs.length : 0;
    const facturacion = sum('facturacion');
    const ordenes = sum('ordenes');
    const inversion = sum('inversion');
    const visitas = sum('visitas');
    return {
      facturacion, ordenes, inversion, visitas,
      roas: inversion > 0 ? facturacion / inversion : 0,
      ticketPromedio: ordenes > 0 ? facturacion / ordenes : avg('ticketPromedio'),
      cpa: ordenes > 0 ? inversion / ordenes : avg('cpa'),
      cr: visitas > 0 ? ordenes / visitas : avg('cr'),
      invGoogle: sum('invGoogle'),
      invMeta: sum('invMeta'),
      invTikTok: sum('invTikTok'),
      roasTiendas: avg('roasTiendas'),
      roasFullbai: avg('roasFullbai'),
      cpv: visitas > 0 ? inversion / visitas : avg('cpv'),
      relacion: facturacion > 0 ? inversion / facturacion : 0,
      fullbaiRevenue: sum('fullbaiRevenue'),
    };
  }, [selectedAggs]);

  const insights = useMemo(() => generateInsights(monthAggs, totals), [monthAggs, totals]);

  // --- LOADING ---
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Cargando datos del semestre...</p>
        </CardContent>
      </Card>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="h-10 w-10 text-destructive/60" />
          <p className="text-destructive text-sm">{error}</p>
          <p className="text-xs text-muted-foreground">Verificá que los archivos CSV estén cargados correctamente.</p>
        </CardContent>
      </Card>
    );
  }

  // --- NO DATA ---
  if (monthAggs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <BarChart3 className="h-10 w-10 opacity-30" />
          <p className="text-base font-medium">Sin datos de Gestión Comercial</p>
          <p className="text-sm text-center max-w-md">Cargá archivos CSV con datos de Gestión Comercial para ver el resumen del semestre.</p>
        </CardContent>
      </Card>
    );
  }

  const invDistribution = [
    { name: 'Google Ads', value: totals.invGoogle, color: '#4285F4' },
    { name: 'Meta Ads', value: totals.invMeta, color: '#8B5CF6' },
    { name: 'TikTok', value: totals.invTikTok, color: '#06B6D4' },
  ].filter(d => d.value > 0);

  const totalInvDist = invDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* STICKY HEADER + MONTH FILTER */}
      <div className="sticky top-0 z-10 bg-background pb-4 -mx-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Resumen del Semestre
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              De dónde partimos y a dónde llegamos
            </p>
          </div>

          {/* MONTH FILTER */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={selectedMonth === null ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedMonth(null)}
            >
              Todos los meses
            </Button>
            {months.map((m) => (
              <Button
                key={m}
                variant={selectedMonth === m ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedMonth(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 1: 4 MAIN KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Facturación Total',
            value: formatCurrency(totals.facturacion),
            icon: DollarSign,
            color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
            iconBg: 'bg-emerald-500/15 text-emerald-400',
            detail: selectedMonth ? `Facturación de ${selectedMonth}` : `${months.length} meses cargados`,
          },
          {
            label: 'Órdenes',
            value: formatNumber(totals.ordenes),
            icon: ShoppingCart,
            color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
            iconBg: 'bg-blue-500/15 text-blue-400',
            detail: selectedMonth ? `Órdenes de ${selectedMonth}` : `${months.length} meses cargados`,
          },
          {
            label: 'Inversión Gestionada',
            value: formatCurrency(totals.inversion),
            icon: TrendingUp,
            color: 'from-violet-500/20 to-violet-600/5 border-violet-500/20',
            iconBg: 'bg-violet-500/15 text-violet-400',
            detail: selectedMonth ? `Inversión de ${selectedMonth}` : `${months.length} meses cargados`,
          },
          {
            label: 'ROAS Negocio Promedio',
            value: `${totals.roas.toFixed(2)}x`,
            icon: Target,
            color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
            iconBg: 'bg-amber-500/15 text-amber-400',
            detail: selectedMonth ? `ROAS de ${selectedMonth}` : `${months.length} meses cargados`,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn('relative overflow-hidden border bg-gradient-to-br', kpi.color)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('rounded-xl p-2.5', kpi.iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {selectedMonth === null && monthAggs.length > 1 && (
                    <div className="flex gap-0.5">
                      {monthAggs.map((m) => (
                        <div key={m.month} className={cn('h-1.5 rounded-full transition-all', 'w-1.5', 'bg-foreground/10')} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold tracking-tight text-foreground mb-1">{kpi.value}</p>
                <p className="text-sm font-medium text-foreground/70">{kpi.label}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{kpi.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ROW 2: SECONDARY KPI CARDS (Visitas, Ticket, CPA, CR) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Visitas', value: formatNumber(totals.visitas), icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/15' },
          { label: 'Ticket Promedio', value: formatCurrency(totals.ticketPromedio), icon: Ticket, color: 'text-orange-400', bg: 'bg-orange-500/15' },
          { label: 'CPA Promedio', value: formatCurrency(totals.cpa), icon: CreditCard, color: 'text-rose-400', bg: 'bg-rose-500/15' },
          { label: 'Tasa de Conversión', value: formatPercent(totals.cr), icon: Percent, color: 'text-teal-400', bg: 'bg-teal-500/15' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('rounded-lg p-2 shrink-0', kpi.bg)}>
                  <Icon className={cn('h-4 w-4', kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-lg font-bold tracking-tight text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FACTURACIÓN / INVERSIÓN MES A MES CHART */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              {chartMetric === 'facturacion' ? 'Facturación' : 'Inversión'} mes a mes
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant={chartMetric === 'facturacion' ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1.5" onClick={() => setChartMetric('facturacion')}>
              <TrendingUp className="h-3.5 w-3.5" /> Facturación
            </Button>
            <Button variant={chartMetric === 'inversion' ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1.5" onClick={() => setChartMetric('inversion')}>
              <TrendingDown className="h-3.5 w-3.5" /> Inversión
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthAggs} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFacturacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradInversion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} formatter={(value) => [formatCurrency(Number(value) || 0), chartMetric === 'facturacion' ? 'Facturación' : 'Inversión']} labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }} />
                <Area type="monotone" dataKey={chartMetric} stroke={chartMetric === 'facturacion' ? '#10b981' : '#8b5cf6'} strokeWidth={2.5} fill={`url(#${chartMetric === 'facturacion' ? 'gradFacturacion' : 'gradInversion'})`} dot={{ fill: chartMetric === 'facturacion' ? '#10b981' : '#8b5cf6', strokeWidth: 0, r: 4 }} activeDot={{ fill: chartMetric === 'facturacion' ? '#10b981' : '#8b5cf6', stroke: 'hsl(var(--background))', strokeWidth: 2, r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* RENTABILIDAD Y EFICIENCIA */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold">Rentabilidad y Eficiencia</CardTitle>
          </div>
          <CardDescription>
            Indicadores clave de retorno y eficiencia de la inversión publicitaria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthAggs.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">Sin datos para el período seleccionado</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* ROAS GENERAL */}
              <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ROAS General</p>
                  <div className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
                    totals.roas >= 3 ? 'bg-emerald-500/20 text-emerald-400' :
                    totals.roas >= 1.5 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {totals.roas >= 3 ? 'EXCELENTE' : totals.roas >= 1.5 ? 'ACEPTABLE' : 'CUIDADO'}
                  </div>
                </div>
                <p className="text-4xl font-bold text-emerald-400 tracking-tight">{totals.roas.toFixed(2)}x</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Facturación</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totals.facturacion)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inversión</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totals.inversion)}</span>
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-muted-foreground leading-relaxed">
                  Por cada <strong className="text-foreground">$1</strong> invertido se generaron <strong className="text-emerald-400">${totals.roas.toFixed(2)}</strong> en facturación.
                  {totals.roas >= 3
                    ? ' Un rendimiento sólido que refleja una gestión eficiente.'
                    : totals.roas >= 1.5
                    ? ' La ecuación cierra positivamente, aunque hay margen de mejora.'
                    : ' Es prioritario revisar la estrategia para mejorar el retorno.'}
                </p>
              </div>

              {/* CPV */}
              <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Costo por Visita</p>
                  <div className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
                    totals.cpv < 400 ? 'bg-emerald-500/20 text-emerald-400' :
                    totals.cpv < 1000 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {totals.cpv < 400 ? 'EFICIENTE' : totals.cpv < 1000 ? 'MODERADO' : 'ELEVADO'}
                  </div>
                </div>
                <p className="text-4xl font-bold text-cyan-400 tracking-tight">{formatCurrency(totals.cpv)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inversión total</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totals.inversion)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Visitas generadas</span>
                    <span className="font-semibold text-foreground">{formatNumber(totals.visitas)}</span>
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-muted-foreground leading-relaxed">
                  {totals.cpv < 400
                    ? 'Costo eficiente por visita. El tráfico se genera a bajo costo, permitiendo escalar sin disparar la inversión.'
                    : totals.cpv < 1000
                    ? 'Costo moderado. Revisar segmentación y fuentes de tráfico para optimizar el rendimiento.'
                    : 'Costo elevado. Se recomienda revisar creatividades, segmentación y canales para reducir el CPV.'}
                </p>
              </div>

              {/* RELACIÓN INV/FACT */}
              <div className="rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-violet-600/5 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Inversión / Facturación</p>
                  <div className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
                    totals.relacion <= 0.15 ? 'bg-emerald-500/20 text-emerald-400' :
                    totals.relacion <= 0.30 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {totals.relacion <= 0.15 ? 'SALUDABLE' : totals.relacion <= 0.30 ? 'ADVERTENCIA' : 'CUIDADO'}
                  </div>
                </div>
                <p className="text-4xl font-bold text-violet-400 tracking-tight">{formatPercent(totals.relacion)}</p>
                <div className="mt-4">
                  <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500',
                        totals.relacion <= 0.15 ? 'bg-emerald-500' :
                        totals.relacion <= 0.30 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(totals.relacion * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span className="font-medium">15%</span>
                    <span className="font-medium text-red-400">30%+</span>
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-muted-foreground leading-relaxed">
                  {totals.relacion <= 0.15
                    ? `Solo el ${formatPercent(totals.relacion)} de la facturación se reinvierte en publicidad. Estructura de costos saludable.`
                    : totals.relacion <= 0.30
                    ? `El ${formatPercent(totals.relacion)} de la facturación se destina a inversión publicitaria. Dentro de parámetros razonables.`
                    : `El ${formatPercent(totals.relacion)} de la facturación se va en publicidad. Evaluar eficiencia de canales para reducir la carga.`}
                </p>
              </div>

              {/* CPA */}
              <div className="rounded-xl border border-rose-500/15 bg-gradient-to-br from-rose-500/10 to-rose-600/5 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Costo por Adquisición</p>
                  <div className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
                    totals.cpa > 0 && totals.ticketPromedio > 0 && totals.cpa / totals.ticketPromedio <= 0.2 ? 'bg-emerald-500/20 text-emerald-400' :
                    totals.cpa > 0 && totals.ticketPromedio > 0 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-muted/30 text-muted-foreground'
                  )}>
                    {totals.cpa > 0 && totals.ticketPromedio > 0 && totals.cpa / totals.ticketPromedio <= 0.2
                      ? 'EFICIENTE'
                      : totals.cpa > 0 && totals.ticketPromedio > 0
                      ? 'ADVERTENCIA'
                      : 'SIN DATOS'}
                  </div>
                </div>
                <p className="text-4xl font-bold text-rose-400 tracking-tight">{formatCurrency(totals.cpa)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ticket promedio</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totals.ticketPromedio)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPA / Ticket</span>
                    <span className={cn('font-semibold', totals.cpa > 0 && totals.ticketPromedio > 0 && totals.cpa / totals.ticketPromedio <= 0.2 ? 'text-emerald-400' : totals.cpa > 0 && totals.ticketPromedio > 0 ? 'text-amber-400' : 'text-muted-foreground')}>
                      {totals.cpa > 0 && totals.ticketPromedio > 0 ? formatPercent(totals.cpa / totals.ticketPromedio) : '-'}
                    </span>
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-muted-foreground leading-relaxed">
                  {totals.cpa > 0 && totals.ticketPromedio > 0 && totals.cpa / totals.ticketPromedio <= 0.2
                    ? 'El CPA representa menos del 20% del ticket promedio. La ecuación unitaria es sólida y el negocio escala saludablemente.'
                    : totals.cpa > 0 && totals.ticketPromedio > 0
                    ? `El CPA equivale al ${formatPercent(totals.cpa / totals.ticketPromedio)} del ticket. Hay espacio para optimizar la eficiencia en adquisición.`
                    : 'No hay datos suficientes de órdenes para calcular el CPA.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DISTRIBUCIÓN DE INVERSIÓN */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Distribución de Inversión</CardTitle>
          </div>
          <CardDescription>
            {totalInvDist > 0
              ? 'Distribución del presupuesto por plataforma publicitaria'
              : 'No hay desglose por plataforma disponible en los datos cargados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalInvDist > 0 ? (
            <div className="space-y-5">
              {/* Big stacked bar */}
              <div className="h-6 rounded-full bg-muted/50 overflow-hidden flex shadow-inner">
                {invDistribution.map((d) => (
                  <div
                    key={d.name}
                    style={{ width: `${(d.value / totalInvDist) * 100}%`, backgroundColor: d.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 hover:opacity-80 cursor-pointer"
                    title={`${d.name}: ${formatCurrency(d.value)} (${((d.value / totalInvDist) * 100).toFixed(1)}%)`}
                  />
                ))}
              </div>

              {/* Platform details */}
              <div className="grid grid-cols-3 gap-4">
                {invDistribution.map((d) => {
                  const pct = (d.value / totalInvDist) * 100;
                  return (
                    <div key={d.name} className="rounded-lg bg-muted/20 p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                      </div>
                      <p className="text-2xl font-bold tracking-tight">{pct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(d.value)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-border/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Inversión total gestionada</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(totalInvDist)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedMonth
                        ? `Corresponde a ${selectedMonth}`
                        : `${months.length} mes(es) con datos de inversión por plataforma`
                      }
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {monthAggs.map(m => {
                    const hasInv = (m.invGoogle + m.invMeta + m.invTikTok) > 0;
                    return (
                      <span key={m.month} className={cn('text-[10px] px-1.5 py-0.5 rounded', hasInv ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted/30 text-muted-foreground')}>
                        {m.month}{hasInv ? ' ✓' : ' —'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="rounded-full bg-muted/30 p-3">
                <PieChart className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Desglose no disponible</p>
              <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
                {selectedMonth
                  ? `Los datos de ${selectedMonth} no incluyen desglose de inversión por plataforma. Seleccioná "Todos los meses" o un mes que sí lo tenga.`
                  : 'Ninguno de los meses cargados incluye desglose de inversión por plataforma publicitaria.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MONTH-BY-MONTH BREAKDOWN TABLE */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left font-medium text-muted-foreground px-3 py-3">Mes</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">Facturación</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">Órdenes</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">Inversión</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">ROAS</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">Visitas</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">CPA</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-3">CR%</th>
                </tr>
              </thead>
              <tbody>
                {monthAggs.map((m) => (
                  <tr key={m.month} className={cn('border-b border-border/20 hover:bg-muted/30 transition-colors', selectedMonth === m.month && 'bg-accent/40')}>
                    <td className="px-3 py-3 font-medium">{m.month}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatCurrency(m.facturacion)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatNumber(m.ordenes)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatCurrency(m.inversion)}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold">
                      <span className={m.roas >= 1 ? 'text-emerald-400' : 'text-red-400'}>{m.roas.toFixed(2)}x</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatNumber(m.visitas)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatCurrency(m.cpa)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatPercent(m.cr)}</td>
                  </tr>
                ))}
                {selectedMonth === null && monthAggs.length > 1 && (
                  <tr className="bg-muted/20 font-semibold">
                    <td className="px-3 py-3 text-foreground">Total / Promedio</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatCurrency(totals.facturacion)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatNumber(totals.ordenes)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatCurrency(totals.inversion)}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold">
                      <span className={totals.roas >= 1 ? 'text-emerald-400' : 'text-red-400'}>{totals.roas.toFixed(2)}x</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatNumber(totals.visitas)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatCurrency(totals.cpa)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatPercent(totals.cr)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SMART ANALYSIS */}
      {insights.paragraphs.length > 0 && (
        <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-sm font-medium">Análisis Inteligente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {insights.paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-foreground/80 leading-relaxed">{p}</p>
              ))}
            </div>
            {insights.tips.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                  <Lightbulb className="h-4 w-4" />
                  Tips para mejorar
                </div>
                <ul className="space-y-1.5">
                  {insights.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
