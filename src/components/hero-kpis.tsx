'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, BarChart3, Activity, Sparkles, Info } from 'lucide-react';
import { Line, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { AggregatedMetrics } from '@/lib/data-helper';
import { cn } from '@/lib/utils';

interface HeroKPIsProps {
  metrics: AggregatedMetrics;
  comparison?: {
    revenueChange: number;
    spendChange: number;
    roasChange: number;
    ordersChange: number;
  };
  chartData?: Array<{
    period: string;
    revenue: number;
    spend: number;
  }>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
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
  return <>{prefix}{display > 1000 ? formatNumber(Math.round(display)) : display.toFixed(display % 1 === 0 ? 0 : 2)}{suffix}</>;
}

function TrendBadge({ value, label }: { value: number; label?: React.ReactNode }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <div className={cn('flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
      isPositive ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
    )}>
      {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
      {label && <span className="text-muted-foreground font-normal ml-0.5">{label}</span>}
    </div>
  );
}

const KPI_GRADIENTS = [
  { gradient: '#6366f1 #06b6d4' },
  { gradient: '#a855f7 #d946ef' },
  { gradient: '#10b981 #06b6d4' },
  { gradient: '#f59e0b #ef4444' },
];

export function HeroKPIs({ metrics, comparison, chartData }: HeroKPIsProps) {
  const totalSpend = metrics.platforms.google.spend + metrics.platforms.meta.spend;
  const totalConversions = metrics.platforms.google.conversions + metrics.platforms.meta.conversions;
  const totalRevenue = metrics.totalRevenue || metrics.platforms.google.revenue + metrics.platforms.meta.revenue;

  const kpis = [
    {
      title: 'Facturación Total',
      value: totalRevenue,
      subtitle: metrics.totalOrders > 0 ? `${formatNumber(metrics.totalOrders)} órdenes` : undefined,
      icon: DollarSign,
      trend: comparison?.revenueChange,
      trendLabel: 'vs período anterior',
      formatter: formatCurrency,
    },
    {
      title: 'Inversión Gestionada',
      value: totalSpend,
      subtitle: `${metrics.platforms.google.spend > 0 ? 'Google Ads' : ''}${metrics.platforms.google.spend > 0 && metrics.platforms.meta.spend > 0 ? ' / ' : ''}${metrics.platforms.meta.spend > 0 ? 'Meta Ads' : ''}`,
      icon: Target,
      trend: comparison?.spendChange,
      trendLabel: 'vs período anterior',
      formatter: formatCurrency,
    },
    {
      title: 'ROAS Promedio',
      value: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      subtitle: totalSpend > 0 ? `${formatCurrency(totalRevenue)} / ${formatCurrency(totalSpend)}` : undefined,
      icon: Activity,
      trend: comparison?.roasChange,
      trendLabel: 'vs período anterior',
      formatter: (v: number) => v.toFixed(2) + 'x',
      noCountUp: true,
    },
    {
      title: 'Órdenes Totales',
      value: metrics.totalOrders || totalConversions,
      subtitle: totalConversions > 0 ? `${formatNumber(totalConversions)} conversiones` : undefined,
      icon: ShoppingCart,
      trend: comparison?.ordersChange,
      trendLabel: 'vs período anterior',
      formatter: formatNumber,
    },
  ];

  const descriptions = [
    'Ingresos totales generados por todas las campañas',
    'Suma de inversión en Google Ads y Meta Ads',
    'Retorno de inversión publicitaria combinado',
    'Total de órdenes y conversiones registradas',
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const grad = KPI_GRADIENTS[i];
          return (
            <div key={kpi.title} className="relative group animate-in slide-in-from-bottom-4 fade-in"
              style={{ animationDuration: '0.6s', animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
              <div className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-all duration-500 blur-xl"
                style={{ background: `linear-gradient(135deg, ${grad.gradient.split(' ')[0]}, ${grad.gradient.split(' ')[1]})` }} />
              <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-lg">
                <div className="absolute inset-0 opacity-5"
                  style={{ background: `linear-gradient(135deg, ${grad.gradient.split(' ')[0]}, ${grad.gradient.split(' ')[1]})` }} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${grad.gradient.split(' ')[0]}, ${grad.gradient.split(' ')[1]})` }}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{kpi.title}</span>
                    </div>
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-black tracking-tight tabular-nums">
                      {kpi.noCountUp ? (
                        kpi.formatter(kpi.value)
                      ) : (
                        <CountUp value={kpi.value} />
                      )}
                    </p>
                    {kpi.trend !== undefined && <TrendBadge value={kpi.trend} />}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Info className="h-2.5 w-2.5" />
                      {descriptions[i]}
                    </span>
                  </div>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
                  style={{ background: `linear-gradient(90deg, ${grad.gradient.split(' ')[0]}, ${grad.gradient.split(' ')[1]})` }} />
              </Card>
            </div>
          );
        })}
      </div>

      {/* Subtitle row */}
      <div className="animate-in slide-in-from-bottom-4 fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.4s', animationFillMode: 'both' }}>
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumen General</p>
                <div className="flex items-center gap-4 mt-1">
                  <div>
                    <p className="text-xl font-black">{formatCurrency(totalRevenue)}</p>
                    <span className="text-[10px] text-muted-foreground">facturación total</span>
                  </div>
                  <div className="h-6 w-px bg-border/30" />
                  <div>
                    <p className="text-xl font-black">{totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) + 'x' : '-'}</p>
                    <span className="text-[10px] text-muted-foreground">ROAS combinado</span>
                  </div>
                  <div className="h-6 w-px bg-border/30" />
                  <div>
                    <p className="text-xl font-black">{formatNumber(totalConversions)}</p>
                    <span className="text-[10px] text-muted-foreground">conversiones totales</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground">
              {comparison && (
                <>
                  <TrendBadge value={comparison.revenueChange} label="fact." />
                  <TrendBadge value={comparison.spendChange} label="inv." />
                  <TrendBadge value={comparison.roasChange} label="roas" />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Facturación vs Inversión</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Evolución temporal de ingresos e inversión publicitaria</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" opacity={0.3} />
                <XAxis dataKey="period" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(value: unknown) => [formatCurrency(Number(value) || 0)]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Facturación" fill="url(#revBarGrad)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                <Line type="monotone" dataKey="spend" name="Inversión" stroke="#6366f1" strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
