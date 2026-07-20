'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export interface DataPoint {
  label: string;
  value: number;
}

interface KpiChartProps {
  title: string;
  value: string;
  change: string;
  data: DataPoint[];
  gradientId: string;
  color: string;
  prefix?: string;
}

export function KpiChart({ title, value, change, data, gradientId, color, prefix = '' }: KpiChartProps) {
  const isPositive = !change.startsWith('-');

  return (
    <Card className="overflow-hidden border-0 shadow-lg relative">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background: `linear-gradient(135deg, ${color}, transparent)`,
        }}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-0 pt-3 md:pt-4 px-3 md:px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
            isPositive ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10' : 'text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-400/10'
          )}
        >
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-4 pb-3 pt-2">
        <div className="text-xl md:text-2xl font-bold tracking-tight mb-2">
          {prefix}{value}
        </div>
        <div className="h-14 md:h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(val) => [`${prefix}${Number(val).toLocaleString()}`, title]}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
