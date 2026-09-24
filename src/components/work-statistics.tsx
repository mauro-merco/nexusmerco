'use client';

import { useEffect, useState } from 'react';
import { TASK_ROLE_CONFIG } from '@/lib/task-config';
import type { WorkRole, WorkStatsItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Activity, CheckCircle2, History, Layers, Loader2 } from 'lucide-react';

type Range = 'day' | 'week' | 'month';

interface StatsResponse {
  summary: {
    total: number;
    active: number;
    closed: number;
    pieces: number;
    by_source: Record<'task' | 'social' | 'ads', number>;
    by_role: Record<WorkRole, number>;
  };
  series: Record<Range, { period: string; completed: number; pieces: number }[]>;
  items: WorkStatsItem[];
}

export function WorkStatistics({ clientId, userId, compact }: { clientId?: string; userId?: string; compact?: boolean }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [range, setRange] = useState<Range>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (clientId) params.set('client_id', clientId);
    if (userId) params.set('user_id', userId);
    fetch(`/api/work-stats?${params}`)
      .then(response => response.json())
      .then(json => setData(json.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clientId, userId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'Piezas cerradas', value: data.summary.pieces },
          { label: 'Tareas cerradas', value: data.summary.closed },
          { label: 'Activos', value: data.summary.active },
          { label: 'Historial total', value: data.summary.total },
        ].map(item => (
          <div key={item.label}>
            <p className="text-lg font-bold leading-none">{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    );
  }

  const series = data.series[range] || [];
  const max = Math.max(1, ...series.map(item => item.completed));
  const active = data.items.filter(item => item.state === 'active');
  const history = data.items.filter(item => item.state === 'closed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Estadísticas de trabajo
        </p>
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {(['day', 'week', 'month'] as Range[]).map(value => (
            <button key={value} type="button" onClick={() => setRange(value)} className={cn('rounded-md px-2.5 py-1 text-xs', range === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {value === 'day' ? 'Días' : value === 'week' ? 'Semanas' : 'Meses'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Activos', value: data.summary.active, icon: Activity, color: 'text-cyan-500' },
          { label: 'Cerrados', value: data.summary.closed, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Piezas cerradas', value: data.summary.pieces, icon: Layers, color: 'text-violet-500' },
          { label: 'Historial total', value: data.summary.total, icon: History, color: 'text-amber-500' },
        ].map(item => (
          <div key={item.label} className="rounded-xl bg-muted/40 p-3">
            <item.icon className={cn('h-4 w-4 mb-1', item.color)} />
            <p className="text-xl font-bold">{item.value}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(data.summary.by_role) as WorkRole[]).map(role => {
          const cfg = TASK_ROLE_CONFIG[role];
          return <div key={role} className={cn('rounded-lg border p-2 text-center', cfg.borderClass)}><p className={cn('text-lg font-bold', cfg.colorClass)}>{data.summary.by_role[role]}</p><p className="text-[10px] text-muted-foreground">{cfg.shortLabel}</p></div>;
        })}
      </div>

      <div className="rounded-xl bg-muted/40 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cierres por {range === 'day' ? 'día' : range === 'week' ? 'semana' : 'mes'}</p>
        {series.length === 0 ? <p className="text-xs text-muted-foreground italic">Sin cierres registrados.</p> : series.slice(-12).map(item => (
          <div key={item.period} className="grid grid-cols-[90px_1fr_auto] items-center gap-2 text-xs">
            <span className="text-muted-foreground">{item.period}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(item.completed / max) * 100}%` }} /></div>
            <span className="font-semibold">{item.completed}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[{ title: 'En curso', items: active }, { title: 'Historial', items: history }].map(section => (
          <div key={section.title} className="rounded-xl bg-muted/40 p-3">
            <p className="text-xs font-semibold mb-2">{section.title} ({section.items.length})</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {section.items.slice(0, 20).map(item => {
                const ownRoles = userId ? item.assignees.filter(assignee => assignee.id === userId).map(assignee => assignee.work_role) : [];
                return (
                  <div key={`${item.source}-${item.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-2">
                    <div className="min-w-0"><p className="truncate text-xs font-medium">{item.title}</p><p className="text-[9px] uppercase text-muted-foreground">{item.source === 'task' ? 'Tarea' : item.source === 'social' ? 'Redes' : 'ADS'}</p></div>
                    {ownRoles.length > 0 && <div className="flex flex-wrap justify-end gap-1">{ownRoles.map(role => <span key={role} className={cn('text-[9px] font-semibold', TASK_ROLE_CONFIG[role].colorClass)}>{TASK_ROLE_CONFIG[role].shortLabel}</span>)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
