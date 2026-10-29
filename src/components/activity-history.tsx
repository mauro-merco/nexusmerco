'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  ACTIVITY_AREAS,
  ACTIVITY_AREA_CONFIG,
  activityActionLabel,
  type ActivityArea,
  type ActivityEvent,
} from '@/lib/activity-config';
import { STATUS_CONFIG } from '@/lib/social-config';
import { TASK_STATUS_CONFIG, TASK_ROLE_CONFIG } from '@/lib/task-config';
import {
  History, RefreshCw, Download, ClipboardList, Sparkles, Megaphone,
  CircleDot, ChevronDown, ChevronRight, Inbox, User2,
} from 'lucide-react';

const AREA_ICON: Record<ActivityArea, React.ComponentType<{ className?: string }>> = {
  task: ClipboardList,
  social: Sparkles,
  ads: Megaphone,
  general: CircleDot,
};

const ENTITY_LABEL: Record<string, string> = {
  task: 'Tarea',
  social_idea: 'Idea de Redes',
  ads_idea: 'Idea de ADS',
  calendar: 'Calendario',
};

const STATUS_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])),
  ...Object.fromEntries(Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => [k, v.label])),
};

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(TASK_ROLE_CONFIG).map(([k, v]) => [k, v.label]),
);

function prettyValue(v: string | null) {
  if (!v) return '—';
  return STATUS_LABELS[v] || v.replace(/_/g, ' ');
}

function roleLabel(v: string | null) {
  if (!v) return '';
  return ROLE_LABELS[v] || v;
}

function eventSummary(e: ActivityEvent) {
  switch (e.action) {
    case 'status_changed':
      return `${prettyValue(e.from_value)} → ${prettyValue(e.to_value)}`;
    case 'assignee_added':
    case 'assignee_removed': {
      const role = roleLabel(e.to_value || e.from_value);
      return `${e.detail || 'Usuario'}${role ? ` · ${role}` : ''}`;
    }
    case 'created':
    case 'deleted':
      return e.detail && !e.detail.startsWith('Creó') && !e.detail.startsWith('Eliminó')
        ? e.detail
        : '';
    case 'updated':
      return e.from_value || e.to_value
        ? `${prettyValue(e.from_value)} → ${prettyValue(e.to_value)}`
        : (e.detail || '');
    case 'commented':
    case 'problem_reported':
    case 'material_requested':
    case 'material_added':
    case 'material_removed':
      return e.detail || '';
    default:
      return e.detail || '';
  }
}

function formatAt(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

interface ActivityGroup {
  key: string;
  area: ActivityArea;
  entityType: string;
  title: string;
  events: ActivityEvent[];
}

interface ActivityHistoryProps {
  clientId?: string;
  userId?: string;
  title?: string;
  scrollHeight?: number;
  onOpenSource?: (event: ActivityEvent) => void;
}

export function ActivityHistory({ clientId, userId, title, scrollHeight, onOpenSource }: ActivityHistoryProps) {
  const { token } = useAuthStore();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<ActivityArea | 'all'>('all');
  const [days, setDays] = useState(30);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (userId) params.set('user_id', userId);
      if (days > 0) {
        const from = new Date();
        from.setDate(from.getDate() - days);
        params.set('from', from.toISOString());
      }
      params.set('limit', '500');
      const res = await fetch(`/api/activity-events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setEvents(json.data || []);
      setTotal(json.count || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, userId, days, token]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityGroup>();
    for (const e of events) {
      if (areaFilter !== 'all' && e.area !== areaFilter) continue;
      const key = `${e.entity_type}:${e.entity_id || e.entity_title || ''}`;
      const g = map.get(key);
      if (g) g.events.push(e);
      else map.set(key, {
        key,
        area: e.area,
        entityType: e.entity_type,
        title: e.entity_title || ENTITY_LABEL[e.entity_type] || e.entity_type,
        events: [e],
      });
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.events[0].created_at).getTime() - new Date(a.events[0].created_at).getTime(),
    );
  }, [events, areaFilter]);

  const exportCsv = () => {
    const rows = [
      ['Fecha', 'Área', 'Acción', 'Entidad', 'Detalle', 'De', 'A', 'Autor', 'Cliente'],
      ...events
        .filter((e) => areaFilter === 'all' || e.area === areaFilter)
        .map((e) => [
          csvEscape(new Date(e.created_at).toLocaleString('es-ES')),
          csvEscape(ACTIVITY_AREA_CONFIG[e.area]?.label || e.area),
          csvEscape(activityActionLabel(e.action)),
          csvEscape(e.entity_title || ENTITY_LABEL[e.entity_type] || e.entity_type),
          csvEscape(e.detail || ''),
          csvValue(e, 'from'),
          csvValue(e, 'to'),
          csvEscape(e.actor?.full_name || e.actor?.email || ''),
          csvEscape(e.client?.name || ''),
        ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${userId ? 'usuario' : 'cliente'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleGroup = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const shownCount = groups.filter((g) => areaFilter === 'all' || g.area === areaFilter).length;
  const label = title || (clientId ? 'Historial completo del cliente' : 'Historial completo del usuario');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">{label}</p>
          <span className="text-xs text-muted-foreground">
            {shownCount} registro{shownCount === 1 ? '' : 's'}
            {total > events.length ? ` de ${total}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={0}>Todo</option>
          </select>
          <button
            type="button"
            onClick={fetchHistory}
            aria-label="Actualizar"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setAreaFilter('all')}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
            areaFilter === 'all'
              ? 'bg-gradient-tech text-white border-transparent'
              : 'border-input text-muted-foreground hover:text-foreground',
          )}
        >
          Todas
        </button>
        {ACTIVITY_AREAS.map((area) => {
          const cfg = ACTIVITY_AREA_CONFIG[area];
          const Icon = AREA_ICON[area];
          return (
            <button
              key={area}
              type="button"
              onClick={() => setAreaFilter((prev) => (prev === area ? 'all' : area))}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                areaFilter === area
                  ? cfg.colorClass
                  : 'border-input text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="mr-1 inline h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {loading && events.length === 0 ? (
        <ContentSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-muted-foreground">
          <Inbox className="h-8 w-8 opacity-30" />
          <p className="text-sm">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-muted-foreground">
          <Inbox className="h-8 w-8 opacity-30" />
          <p className="text-sm">Todavía no hay actividad registrada en este período.</p>
        </div>
      ) : (
        <div
          className="space-y-2"
          style={scrollHeight ? { maxHeight: scrollHeight, overflowY: 'auto', paddingRight: 4 } : undefined}
        >
          {groups.map((g) => (
            <GroupCard
              key={g.key}
              group={g}
              open={open.has(g.key)}
              onToggle={() => toggleGroup(g.key)}
              onOpenSource={onOpenSource}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function csvValue(e: ActivityEvent, field: 'from' | 'to') {
  if (e.action === 'status_changed' || e.action === 'updated') return csvEscape(prettyValue(field === 'from' ? e.from_value : e.to_value));
  if (e.action === 'assignee_added' || e.action === 'assignee_removed') return csvEscape(roleLabel(field === 'from' ? e.from_value : e.to_value));
  return csvEscape(field === 'from' ? e.from_value : e.to_value);
}

function GroupCard({
  group,
  open,
  onToggle,
  onOpenSource,
}: {
  group: ActivityGroup;
  open: boolean;
  onToggle: () => void;
  onOpenSource?: (event: ActivityEvent) => void;
}) {
  const Icon = AREA_ICON[group.area] || CircleDot;
  const cfg = ACTIVITY_AREA_CONFIG[group.area] || ACTIVITY_AREA_CONFIG.general;
  const preview = open ? group.events : group.events.slice(0, 2);
  const hidden = group.events.length - preview.length;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          {open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', cfg.colorClass)}>
            <Icon className="mr-1 inline h-3 w-3" />
            {cfg.label}
          </span>
          <span className="truncate text-xs font-semibold">{group.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span>{group.events.length} evento{group.events.length === 1 ? '' : 's'}</span>
          <span>{formatAt(group.events[0].created_at)}</span>
        </div>
      </button>

      {onOpenSource && ['task', 'social_idea', 'ads_idea', 'calendar'].includes(group.entityType) && (group.events[0].entity_id || group.entityType === 'calendar') && !group.events.some(e => e.action === 'deleted') && (
        <button type="button" onClick={() => onOpenSource(group.events[0])} className="mx-3 mb-2 text-xs font-medium text-primary hover:underline">Abrir origen</button>
      )}

      <div className="space-y-0.5 px-3 pb-2.5">
        {preview.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
        {hidden > 0 && (
          <p className="pl-6 text-[11px] text-muted-foreground">… y {hidden} evento{hidden === 1 ? '' : 's'} más</p>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const summary = eventSummary(event);
  return (
    <div className="flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/40 transition-colors">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
      <div className="min-w-0 flex-1">
        <p className="text-xs">
          <span className="font-semibold">{activityActionLabel(event.action)}</span>
          {summary && <span className="text-muted-foreground"> · {summary}</span>}
          {event.client && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {event.client.name}
            </span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="flex items-center justify-end gap-1 text-[11px] font-medium">
          <User2 className="h-3 w-3 text-muted-foreground" />
          {event.actor?.full_name || event.actor?.email || '—'}
        </p>
        <p className="text-[10px] text-muted-foreground">{dayLabel(event.created_at)}</p>
      </div>
    </div>
  );
}
