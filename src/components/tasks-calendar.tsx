'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Zap, ChevronRight as Chevron, CalendarX2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { departmentInfo } from '@/lib/department-config';
import { taskStatusConfig } from '@/lib/task-config';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { useIsMobile } from '@/components/calendar-agenda';
import '@/components/task-motion.css';

interface TasksCalendarProps { clientId: string; clientName: string; initialMonth?: string | null; }

type Ranged = { task: Task; start: string; end: string };
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function rangeOf(t: Task): Ranged | null {
  const a = (t.start_date || t.due_date || '').slice(0, 10);
  const b = (t.due_date || t.start_date || '').slice(0, 10);
  if (!a || !b) return null;
  return a <= b ? { task: t, start: a, end: b } : { task: t, start: b, end: a };
}

function StatusPill({ task }: { task: Task }) {
  const s = taskStatusConfig(task.status); const Icon = s.icon;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', s.bgColorClass, s.colorClass)}><Icon className="h-3 w-3" />{s.label}</span>;
}

export function TasksCalendar({ clientId, initialMonth }: TasksCalendarProps) {
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialMonth) { try { return startOfMonth(parseISO(initialMonth + '-01')); } catch { /* */ } }
    return startOfMonth(new Date());
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string }[]>([]);

  useEffect(() => {
    let off = false;
    setLoading(true);
    fetch(`/api/tasks?client_id=${clientId}`).then(r => r.json()).then(j => { if (!off) setTasks(j.data || []); }).catch(() => {}).finally(() => { if (!off) { setLoading(false); setRefreshing(false); } });
    fetch('/api/users').then(r => r.json()).then(j => { if (!off) setUsers(j.data || []); }).catch(() => {});
    return () => { off = true; };
  }, [clientId, refreshKey]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) });
  const weeks = useMemo(() => Array.from({ length: gridDays.length / 7 }, (_, i) => gridDays.slice(i * 7, i * 7 + 7)), [gridDays.length, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranged = useMemo(() => tasks.map(rangeOf).filter(Boolean) as Ranged[], [tasks]);
  const inMonth = useMemo(() => ranged.filter(r => r.start <= ymd(monthEnd) && r.end >= ymd(monthStart)).sort((a, b) => a.end.localeCompare(b.end)), [ranged, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayStr = ymd(new Date());

  const onUpdated = (u: Task) => { setTasks(p => p.map(t => t.id === u.id ? u : t)); setSelectedTask(u); };
  const onDeleted = () => { if (!selectedTask) return; setTasks(p => p.filter(t => t.id !== selectedTask.id)); setSelectedTask(null); };

  if (loading && !refreshing) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="tm-press h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <button type="button" onClick={() => setCurrentMonth(startOfMonth(new Date()))} className="min-w-[160px] text-center text-lg font-bold capitalize transition-colors hover:text-primary">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </button>
        <Button variant="ghost" size="icon" className="tm-press h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <span className="ml-auto rounded-full bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">{inMonth.length} tarea{inMonth.length !== 1 ? 's' : ''}</span>
        <Button variant="secondary" size="sm" className="tm-press gap-1.5 rounded-lg" onClick={() => { setRefreshing(true); setRefreshKey(key => key + 1); }} disabled={refreshing} aria-label={refreshing ? 'Actualizando calendario' : 'Actualizar calendario'} aria-busy={refreshing}>
          <RefreshCw aria-hidden="true" className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Actualizar
        </Button>
      </div>

      {isMobile ? (
        inMonth.length === 0 ? (
          <div className="tm-fade flex flex-col items-center gap-2 rounded-3xl bg-muted/25 py-14 text-muted-foreground"><CalendarX2 className="h-8 w-8 opacity-40" /><p className="text-sm">No hay tareas este mes.</p></div>
        ) : (
          <ul className="tm-stagger space-y-2">
            {inMonth.map(({ task, start, end }) => {
              const dept = departmentInfo(task.department); const DIcon = dept?.icon;
              const overdue = end < todayStr && task.status !== 'cerrada';
              return (
                <li key={task.id}>
                  <div role="button" tabIndex={0} onClick={() => setSelectedTask(task)} onKeyDown={e => { if (e.key === 'Enter') setSelectedTask(task); }}
                    className="tm-lift tm-press group flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-3.5 shadow-[0_1px_2px_rgba(20,20,43,.06)]">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', dept?.bgColorClass || 'bg-muted', dept?.textColorClass)}>{DIcon ? <DIcon className="h-[18px] w-[18px]" /> : null}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-snug">{task.is_urgent && <Zap className="h-3.5 w-3.5 shrink-0 text-red-500" />}<span className="line-clamp-2">{task.title}</span></p>
                      <p className={cn('text-xs', overdue ? 'font-semibold text-red-500' : 'text-muted-foreground')}>
                        {format(parseISO(start), 'd MMM', { locale: es })}{start !== end && ` → ${format(parseISO(end), 'd MMM', { locale: es })}`}{overdue && ' · vencida'}{dept ? ` · ${dept.shortLabel}` : ''}
                      </p>
                      <StatusPill task={task} />
                    </div>
                    <Chevron className="mt-3 h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="tm-fade space-y-1.5">
          <div className="grid grid-cols-7 gap-1.5">
            {dayNames.map(n => <div key={n} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{n}</div>)}
          </div>
          {weeks.map((week, wi) => {
            const wStart = ymd(week[0]); const wEnd = ymd(week[6]);
            const segs = ranged
              .filter(r => r.start <= wEnd && r.end >= wStart)
              .map(r => ({ ...r, s: Math.max(0, week.findIndex(d => ymd(d) >= r.start)), e: (() => { let idx = 6; for (let i = 6; i >= 0; i--) { if (ymd(week[i]) <= r.end) { idx = i; break; } } return idx; })() }))
              .map(r => ({ ...r, s: r.start <= wStart ? 0 : week.findIndex(d => ymd(d) === r.start), e: r.end >= wEnd ? 6 : week.findIndex(d => ymd(d) === r.end) }))
              .sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
            const lanes: number[] = [];
            const placed = segs.map(sg => {
              let lane = lanes.findIndex(endCol => endCol < sg.s);
              if (lane === -1) { lane = lanes.length; lanes.push(sg.e); } else lanes[lane] = sg.e;
              return { ...sg, lane };
            });
            return (
              <div key={wi} className="relative">
                <div className="absolute inset-0 grid grid-cols-7 gap-1.5">
                  {week.map(d => <div key={ymd(d)} className={cn('rounded-2xl transition-colors', ymd(d) === todayStr ? 'bg-primary/10' : 'bg-muted/25', !isSameMonth(d, currentMonth) && 'opacity-50')} />)}
                </div>
                <div className="relative grid grid-cols-7 gap-x-1.5 gap-y-1 p-2" style={{ minHeight: 96 }}>
                  {week.map((d, i) => (
                    <div key={ymd(d)} style={{ gridColumn: i + 1, gridRow: 1 }} className="flex items-center">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', ymd(d) === todayStr ? 'bg-primary text-primary-foreground' : isSameMonth(d, currentMonth) ? 'text-foreground/80' : 'text-muted-foreground/50')}>{format(d, 'd')}</span>
                    </div>
                  ))}
                  {placed.map(({ task, start, end, s, e, lane }) => {
                    const dept = departmentInfo(task.department);
                    return (
                      <button key={task.id} type="button" onClick={() => setSelectedTask(task)} title={task.title}
                        style={{ gridColumn: `${s + 1} / ${e + 2}`, gridRow: lane + 2 }}
                        className={cn('tm-press tm-rise flex h-6 min-w-0 items-center gap-1 px-2 text-left text-[11px] font-semibold transition-[filter,transform] hover:brightness-95',
                          dept?.bgColorClass || 'bg-muted', dept?.textColorClass || 'text-foreground',
                          start < wStart ? 'rounded-l-none' : 'rounded-l-lg', end > wEnd ? 'rounded-r-none' : 'rounded-r-lg',
                          task.is_urgent && 'ring-1 ring-red-500/70')}>
                        {task.is_urgent && <Zap className="h-3 w-3 shrink-0 text-red-500" />}
                        <span className="truncate">{task.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal task={selectedTask} open={!!selectedTask} onOpenChange={o => !o && setSelectedTask(null)}
          onTaskUpdated={onUpdated} onTaskDeleted={onDeleted} users={users} />
      )}
    </div>
  );
}
