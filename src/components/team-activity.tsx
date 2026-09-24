'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { PIECE_TYPES, taskPieceTotal } from '@/lib/task-config';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { History, CalendarDays, CalendarRange, Calendar, Layers, Users2, CheckCircle2 } from 'lucide-react';

type RangeKey = 'day' | 'week' | 'month';

const RANGE_OPTIONS: { key: RangeKey; label: string; icon: typeof CalendarDays }[] = [
  { key: 'day', label: 'Día', icon: CalendarDays },
  { key: 'week', label: 'Semana', icon: CalendarRange },
  { key: 'month', label: 'Mes', icon: Calendar },
];

interface PeriodBucket {
  key: string;
  fullLabel: string;
  date: Date;
  stories: number;
  feed: number;
  reels: number;
  total: number;
  tasks: Task[];
  members: string[];
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

function bucketKey(date: Date, range: RangeKey): string {
  if (range === 'day') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  if (range === 'week') {
    const monday = startOfWeek(date);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function bucketFullLabel(bucketDate: Date, range: RangeKey): string {
  if (range === 'day') {
    return capitalize(bucketDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  }
  if (range === 'week') {
    const monday = startOfWeek(bucketDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `Semana del ${monday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} al ${sunday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
  }
  return capitalize(bucketDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }));
}

const MAX_BUCKETS = 12;

const PIECE_BAR_COLOR: Record<string, string> = {
  pieces_stories: 'bg-cyan-400',
  pieces_feed: 'bg-orange-400',
  pieces_reels: 'bg-pink-400',
};

function pieceCount(bucket: PeriodBucket, field: 'pieces_stories' | 'pieces_feed' | 'pieces_reels'): number {
  return field === 'pieces_stories' ? bucket.stories : field === 'pieces_feed' ? bucket.feed : bucket.reels;
}

export function TeamActivity({ tasks }: { tasks: Task[] }) {
  const [range, setRange] = useState<RangeKey>('month');

  const closed = useMemo(() => tasks.filter(t => t.status === 'cerrada'), [tasks]);

  const buckets = useMemo<PeriodBucket[]>(() => {
    const map = new Map<string, PeriodBucket>();
    for (const t of closed) {
      const date = new Date(t.completed_at || t.due_date || t.created_at);
      if (isNaN(date.getTime())) continue;
      const key = bucketKey(date, range);
      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          key,
          fullLabel: bucketFullLabel(date, range),
          date,
          stories: 0,
          feed: 0,
          reels: 0,
          total: 0,
          tasks: [],
          members: [],
        };
        map.set(key, bucket);
      }
      bucket.total += taskPieceTotal(t);
      bucket.stories += t.pieces_stories || 0;
      bucket.feed += t.pieces_feed || 0;
      bucket.reels += t.pieces_reels || 0;
      bucket.tasks.push(t);
      for (const a of t.assignees) {
        if (!bucket.members.includes(a.id)) bucket.members.push(a.id);
      }
    }
    const sorted = [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
    return sorted.slice(0, MAX_BUCKETS).reverse();
  }, [closed, range]);

  const summary = useMemo(() => {
    let stories = 0, feed = 0, reels = 0, total = 0;
    const byMember = new Map<string, { name: string; avatar: string; pieces: number }>();
    const memberById = new Map<string, { name: string; avatar: string }>();
    for (const t of closed) {
      const totalTask = taskPieceTotal(t);
      total += totalTask;
      stories += t.pieces_stories || 0;
      feed += t.pieces_feed || 0;
      reels += t.pieces_reels || 0;
      for (const a of t.assignees) {
        if (!memberById.has(a.id)) memberById.set(a.id, { name: a.full_name || 'Sin nombre', avatar: a.avatar_url || '' });
        if (totalTask > 0) {
          const entry = byMember.get(a.id) || { name: a.full_name || 'Sin nombre', avatar: a.avatar_url || '', pieces: 0 };
          entry.pieces += totalTask;
          byMember.set(a.id, entry);
        }
      }
    }
    const members = [...byMember.entries()]
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => b.pieces - a.pieces);
    return { stories, feed, reels, total, members, memberById };
  }, [closed]);

  const maxTotal = Math.max(1, ...buckets.map(b => b.total));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Historial del equipo
        </p>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
          {RANGE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  range === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" /> {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {closed.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 italic py-4">Todavía no hay tareas cerradas. Al cerrar una tarea, su producción de piezas suma al historial del cliente.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-muted/40 p-3.5">
              <p className="text-2xl font-bold leading-none">{summary.total}</p>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3 text-violet-500" /> Piezas diseñadas
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3.5">
              <p className="text-2xl font-bold leading-none">{closed.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tareas cerradas
              </p>
            </div>
            {PIECE_TYPES.map(pt => {
              const count = pt.field === 'pieces_stories' ? summary.stories : pt.field === 'pieces_feed' ? summary.feed : summary.reels;
              const Icon = pt.icon;
              return (
                <div key={pt.field} className="rounded-xl bg-muted/40 p-3.5">
                  <p className="text-2xl font-bold leading-none">{count}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Icon className={cn('h-3 w-3', pt.colorClass)} /> {pt.label}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {PIECE_TYPES.map(pt => (
                <span key={pt.field} className={cn('flex items-center gap-1.5 text-[10px] font-medium', pt.colorClass)}>
                  <span className={cn('w-2 h-2 rounded-full', pt.dotColor)} /> {pt.label}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-muted-foreground">Los últimos {Math.min(buckets.length, MAX_BUCKETS)} {range === 'day' ? 'días' : range === 'week' ? 'semanas' : 'meses'}</span>
            </div>

            {buckets.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic py-2">Sin actividad en este rango.</p>
            ) : (
              <div className="space-y-2.5">
                {buckets.map(b => (
                  <div key={b.key} className="rounded-lg bg-background/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground/80">{b.fullLabel}</span>
                      <div className="flex items-center gap-2.5">
                        <div className="flex -space-x-1.5">
                          {b.members.slice(0, 4).map(id => {
                            const u = summary.memberById.get(id);
                            return u ? (
                              <Avatar key={id} className="h-5 w-5 border border-background" title={u.name}>
                                <AvatarImage src={u.avatar} />
                                <AvatarFallback className="text-[8px]">{u.name.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                            ) : null;
                          })}
                          {b.members.length > 4 && (
                            <span className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-semibold">
                              +{b.members.length - 4}
                            </span>
                          )}
                        </div>
                        {b.total > 0 && (
                          <span className="flex items-center gap-1 text-xs font-bold text-violet-500">
                            <Layers className="h-3 w-3" /> {b.total}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{b.tasks.length} tarea{b.tasks.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {(() => {
                      const hasBb = b.stories + b.feed + b.reels > 0;
                      if (!hasBb) return null;
                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                            {PIECE_TYPES.map(pt => {
                              const count = pieceCount(b, pt.field);
                              if (count <= 0) return null;
                              return <div key={pt.field} className={cn('h-full', PIECE_BAR_COLOR[pt.field])} style={{ width: `${(count / maxTotal) * 100}%` }} />;
                            })}
                          </div>
                          {PIECE_TYPES.filter(pt => pieceCount(b, pt.field) > 0).map(pt => (
                            <span key={pt.field} className={cn('flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap', pt.colorClass)}>
                              <pt.icon className="h-3 w-3" /> {pieceCount(b, pt.field)}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap gap-1.5">
                      {b.tasks.map(t => (
                        <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {t.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {summary.members.length > 0 && (
            <div className="rounded-xl bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" /> Producción por miembro
                </p>
                <span className="text-[10px] text-muted-foreground">En tareas cerradas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.members.map(m => {
                  const totalMemberPieces = summary.total || 1;
                  const pct = Math.round((m.pieces / totalMemberPieces) * 100);
                  return (
                    <div key={m.id} className="flex items-center gap-2 rounded-full bg-background/60 pl-1 pr-3 py-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.avatar} />
                        <AvatarFallback className="text-[10px] font-semibold">{m.name.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium leading-tight">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{m.pieces} pieza{m.pieces !== 1 ? 's' : ''} · {pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
