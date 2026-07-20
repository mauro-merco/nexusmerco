'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { AggregatedMetrics } from '@/lib/data-helper';
import { TrendingUp, Users, Target, BarChart3, Info, Sparkles, Search, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelAcquisitionProps {
  metrics: AggregatedMetrics;
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
  return <>{prefix}{display.toFixed(0)}{suffix}</>;
}

const KPI_GRADIENTS = [
  { label: 'Total Sesiones', icon: Users, gradient: '#6366f1 #06b6d4', description: 'Tráfico total del período' },
  { label: 'Conversiones', icon: Target, gradient: '#10b981 #06b6d4', description: 'Eventos clave totales' },
  { label: 'Tasa de Conversión', icon: BarChart3, gradient: '#f59e0b #ef4444', description: 'Promedio general de conversión' },
];

const channelColors: Record<string, string> = {
  'Pauta (Google)': '#4285F4',
  'Pauta (Meta)': '#a855f7',
  'Orgánico': '#10b981',
  'Email': '#f59e0b',
  'Directo': '#6b7280',
  'Referral': '#8b5cf6',
  'Social Orgánico': '#ec4899',
};

function channelGradient(name: string): string {
  return channelColors[name] || '#6b7280';
}

export function FunnelAcquisition({ metrics }: FunnelAcquisitionProps) {
  const trafficByType = metrics.trafficSources.reduce((acc, source) => {
    let type = 'Directo';
    const s = source.source.toLowerCase();
    if (s.includes('google') && (s.includes('cpc') || s.includes('paid'))) type = 'Pauta (Google)';
    else if (s.includes('facebook') || s.includes('instagram') || s.includes('meta')) type = 'Pauta (Meta)';
    else if (s.includes('organic') || s === 'google / organic') type = 'Orgánico';
    else if (s.includes('email') || s.includes('mail')) type = 'Email';
    else if (s.includes('direct')) type = 'Directo';
    else if (s.includes('referral')) type = 'Referral';
    else if (s.includes('social')) type = 'Social Orgánico';
    if (!acc[type]) acc[type] = { sessions: 0, conversions: 0 };
    acc[type].sessions += source.sessions;
    acc[type].conversions += source.conversions;
    return acc;
  }, {} as Record<string, { sessions: number; conversions: number }>);

  const chartData = Object.entries(trafficByType).map(([channel, data]) => ({
    channel,
    sessions: data.sessions,
    conversions: data.conversions,
    conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0,
  })).sort((a, b) => b.sessions - a.sessions);

  const totalSessions = chartData.reduce((sum, item) => sum + item.sessions, 0);
  const totalConversions = chartData.reduce((sum, item) => sum + item.conversions, 0);
  const avgConversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

  const pautaSessions = chartData.filter(d => d.channel.includes('Pauta')).reduce((s, d) => s + d.sessions, 0);
  const organicoSessions = chartData.filter(d => d.channel === 'Orgánico').reduce((s, d) => s + d.sessions, 0);
  const pautaConversions = chartData.filter(d => d.channel.includes('Pauta')).reduce((s, d) => s + d.conversions, 0);
  const organicoConversions = chartData.filter(d => d.channel === 'Orgánico').reduce((s, d) => s + d.conversions, 0);
  const pautaCR = pautaSessions > 0 ? (pautaConversions / pautaSessions) * 100 : 0;
  const organicoCR = organicoSessions > 0 ? (organicoConversions / organicoSessions) * 100 : 0;

  const pctOfTotal = totalSessions > 0 ? ((pautaSessions / totalSessions) * 100).toFixed(1) : '0';

  if (chartData.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Sesiones', value: totalSessions, icon: Users, gradient: '#6366f1 #06b6d4', description: 'Tráfico total del período' },
          { label: 'Conversiones', value: totalConversions, icon: Target, gradient: '#10b981 #06b6d4', description: 'Eventos clave totales' },
          { label: 'Tasa de Conversión', value: avgConversionRate, icon: BarChart3, gradient: '#f59e0b #ef4444', description: 'Promedio general de conversión', suffix: '%', decimals: 2 },
        ].map((kpi, i) => {
          const isPct = kpi.label === 'Tasa de Conversión';
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
                      {isPct ? (
                        <CountUp value={kpi.value} suffix="%" />
                      ) : (
                        formatNumber(kpi.value)
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* Traffic by Channel */}
      <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Análisis de Tráfico por Canal</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Distribución de sesiones por fuente de adquisición</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 110, right: 20, top: 5, bottom: 5 }}>
              <defs>
                {chartData.map((entry, idx) => (
                  <linearGradient key={idx} id={`funnelGrad${idx}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={channelGradient(entry.channel)} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={channelGradient(entry.channel)} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" horizontal={false} />
              <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
              <YAxis type="category" dataKey="channel" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={130} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value: unknown, name: unknown) => {
                  const num = Number(value) || 0;
                  if (name === 'conversionRate') return [`${num.toFixed(2)}%`, 'Tasa Conv.'];
                  return [formatNumber(num), name === 'sessions' ? 'Sesiones' : 'Conversiones'];
                }}
              />
              <Legend />
              <Bar dataKey="sessions" name="Sesiones" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#funnelGrad${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Paid vs Organic */}
      {(pautaSessions > 0 || organicoSessions > 0) && (
        <>
          <Card className="bg-card/50 backdrop-blur-xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Pauta vs Orgánico</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Análisis comparativo de rendimiento</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-600/5 p-5 border border-blue-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-foreground">Tráfico de Pauta</h4>
                    <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[9px] font-bold">{pctOfTotal}% del total</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Sesiones', value: formatNumber(pautaSessions) },
                      { label: '% del Total', value: pctOfTotal + '%' },
                      { label: 'Conversiones', value: formatNumber(pautaConversions) },
                      { label: 'Tasa de Conversión', value: pautaCR.toFixed(2) + '%', highlight: true },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={cn('font-semibold tabular-nums', item.highlight ? 'text-blue-400' : 'text-foreground')}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-600/5 p-5 border border-emerald-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-foreground">Tráfico Orgánico</h4>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[9px] font-bold">Mejor CR</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Sesiones', value: formatNumber(organicoSessions) },
                      { label: '% del Total', value: totalSessions > 0 ? ((organicoSessions / totalSessions) * 100).toFixed(1) + '%' : '0%' },
                      { label: 'Conversiones', value: formatNumber(organicoConversions) },
                      { label: 'Tasa de Conversión', value: organicoCR.toFixed(2) + '%', highlight: true },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={cn('font-semibold tabular-nums', item.highlight ? 'text-emerald-400' : 'text-foreground')}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {organicoCR > pautaCR && pautaCR > 0 && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm text-emerald-400 font-medium">
                    <strong>Insight:</strong> El tráfico orgánico tiene una tasa de conversión{' '}
                    {((organicoCR / pautaCR - 1) * 100).toFixed(0)}% superior a la pauta,
                    aunque la pauta genera {pautaSessions > 0 && organicoSessions > 0
                      ? ((pautaSessions / organicoSessions - 1) * 100).toFixed(0)
                      : 0}% más volumen de sesiones.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
