'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { KanbanBoard } from '@/components/kanban-board';
import { NewTaskDialog } from '@/components/new-task-dialog';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TaskRow } from '@/components/client-tasks-tab';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { TASK_PRIORITY_CONFIG, TASK_PRIORITIES } from '@/lib/task-config';
import { KanbanSquare, Plus, Loader2, Layers, CheckCircle2, AlertTriangle, Clock, LayoutGrid, List as ListIcon } from 'lucide-react';

type ViewMode = 'kanban' | 'list';

function isOverdue(t: Task) {
  if (!t.due_date || t.status === 'cerrada') return false;
  return t.due_date < new Date().toISOString().split('T')[0];
}
function isDueSoon(t: Task) {
  if (!t.due_date || t.status === 'cerrada') return false;
  const diff = Math.ceil((new Date(t.due_date + 'T12:00:00').getTime() - Date.now()) / 86400000);
  return diff >= 0 && diff <= 3;
}

export default function OperationsPage() {
  const { user } = useAuthStore();
  const { clients, loading: clientsLoading } = useClients();
  const { createTask, updateTask, deleteTask } = useTasks(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string; }[]>([]);
  const [view, setView] = useState<ViewMode>('kanban');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(new Set());
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const loadAllTasks = useCallback(async () => {
    setAllLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const json = await res.json();
      if (res.ok) setAllTasks(json.data || []);
    } catch { /* ignore */ } finally { setAllLoading(false); }
  }, []);

  useEffect(() => { loadAllTasks(); }, [loadAllTasks]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(json => setUsers(json.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get('task');
    if (!taskId) return;
    let cancelled = false;
    fetch(`/api/tasks/${taskId}`).then(r => r.json()).then(json => { if (!cancelled && json.data) setSelectedTask(json.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const activeAll = allTasks.filter(t => t.status !== 'cerrada');
  const closedAll = allTasks.filter(t => t.status === 'cerrada');
  const overdueAll = activeAll.filter(isOverdue);
  const dueSoonAll = activeAll.filter(isDueSoon);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (clientFilter.size > 0 && !clientFilter.has(t.client_id)) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(t.priority)) return false;
      if (onlyOverdue && !isOverdue(t)) return false;
      return true;
    });
  }, [allTasks, clientFilter, priorityFilter, onlyOverdue]);

  const listGroups = useMemo(() => {
    const active = filteredTasks.filter(t => t.status !== 'cerrada');
    const closed = filteredTasks.filter(t => t.status === 'cerrada');
    return {
      vencidas: active.filter(isOverdue),
      estaSemana: active.filter(t => !isOverdue(t) && isDueSoon(t)),
      proximas: active.filter(t => !isOverdue(t) && !isDueSoon(t) && t.due_date),
      sinFecha: active.filter(t => !t.due_date),
      finalizadas: closed,
    };
  }, [filteredTasks]);

  const toggleClientFilter = (id: string) => setClientFilter(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const togglePriorityFilter = (p: TaskPriority) => setPriorityFilter(prev => { const next = new Set(prev); next.has(p) ? next.delete(p) : next.add(p); return next; });

  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const handleTaskClick = useCallback((task: Task) => setSelectedTask(task), []);

  const handleTaskUpdated = useCallback((updated: Task) => {
    setSelectedTask(updated);
    setAllTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  }, []);

  const handleTaskDeleted = useCallback((id: string) => {
    deleteTask(id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  }, [deleteTask]);

  if (clientsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tareas</h1>
        <div className="rounded-3xl bg-muted/25 flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <KanbanSquare className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Creá un cliente primero</p>
          <p className="text-sm text-center max-w-md">Necesitás al menos un cliente para poder crear tareas.</p>
        </div>
      </div>
    );
  }

  const sectionMeta = [
    { key: 'vencidas', label: 'Vencidas', icon: AlertTriangle, iconClass: 'text-red-500' },
    { key: 'estaSemana', label: 'Esta semana', icon: Clock, iconClass: 'text-amber-500' },
    { key: 'proximas', label: 'Próximas', icon: Layers, iconClass: 'text-blue-500' },
    { key: 'sinFecha', label: 'Sin fecha', icon: KanbanSquare, iconClass: 'text-muted-foreground' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Todas las tareas de todos los clientes, en un solo lugar</p>
        </div>
        <Button onClick={() => setShowNewTask(true)} variant="default" className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Stats bento row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Activas', value: activeAll.length, icon: Layers, iconClass: 'text-blue-600', bgClass: 'bg-blue-500/10' },
          { label: 'Vencidas', value: overdueAll.length, icon: AlertTriangle, iconClass: 'text-red-600', bgClass: 'bg-red-500/10' },
          { label: 'Por vencer (≤3d)', value: dueSoonAll.length, icon: Clock, iconClass: 'text-amber-600', bgClass: 'bg-amber-500/10' },
          { label: 'Finalizadas', value: closedAll.length, icon: CheckCircle2, iconClass: 'text-emerald-600', bgClass: 'bg-emerald-500/10' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-card p-4">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', s.bgClass)}><s.icon className={cn('h-4 w-4', s.iconClass)} /></div>
            <p className="text-xl font-bold leading-none">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-5">
        <div className="space-y-4 min-w-0">
          {/* View toggle */}
          <div className="flex rounded-xl bg-muted/40 p-1 w-fit">
            <button type="button" onClick={() => setView('kanban')}
              className={cn('flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                view === 'kanban' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <LayoutGrid className="h-4 w-4" /> Kanban
            </button>
            <button type="button" onClick={() => setView('list')}
              className={cn('flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                view === 'list' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <ListIcon className="h-4 w-4" /> Lista
            </button>
          </div>

          {allLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : view === 'kanban' ? (
            <KanbanBoard tasks={filteredTasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} showClient />
          ) : (
            <div className="space-y-6">
              {sectionMeta.map(sec => {
                const items = listGroups[sec.key];
                if (items.length === 0) return null;
                return (
                  <div key={sec.key} className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <sec.icon className={cn('h-3.5 w-3.5', sec.iconClass)} /> {sec.label} ({items.length})
                    </p>
                    <div className="space-y-2">{items.map(t => <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} showClient />)}</div>
                  </div>
                );
              })}

              {listGroups.finalizadas.length > 0 && (
                <details className="group">
                  <summary className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-muted-foreground transition-colors list-none flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Finalizadas ({listGroups.finalizadas.length})
                  </summary>
                  <div className="space-y-2 mt-2 opacity-80">{listGroups.finalizadas.map(t => <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} showClient />)}</div>
                </details>
              )}

              {filteredTasks.length === 0 && (
                <div className="rounded-3xl bg-muted/25 flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <KanbanSquare className="h-12 w-12 opacity-20" />
                  <p className="text-sm">No hay tareas para estos filtros.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar — filters */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-muted/25 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
            {clients.map(c => {
              const count = allTasks.filter(t => t.client_id === c.id && t.status !== 'cerrada').length;
              const on = clientFilter.has(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggleClientFilter(c.id)}
                  className={cn('w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors', on ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground/70 hover:bg-muted/40')}>
                  <span className="flex-1 text-left truncate">{c.name}</span>
                  <span className="text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-muted/25 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</p>
            {TASK_PRIORITIES.map(key => {
              const p = TASK_PRIORITY_CONFIG[key];
              const on = priorityFilter.has(key);
              return (
                <button key={key} type="button" onClick={() => togglePriorityFilter(key)}
                  className={cn('w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors', on ? cn('bg-current/10 font-semibold', p.colorClass) : 'text-muted-foreground/70 hover:bg-muted/40')}>
                  <span className={cn('w-2 h-2 rounded-full shrink-0', p.dotColor)} />
                  <span className="flex-1 text-left">{p.label}</span>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setOnlyOverdue(v => !v)}
            className={cn('w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold transition-colors', onlyOverdue ? 'bg-red-500/10 text-red-600' : 'bg-muted/25 text-muted-foreground hover:bg-muted/40')}>
            <AlertTriangle className="h-3.5 w-3.5" /> Solo vencidas
          </button>
        </div>
      </div>

      <NewTaskDialog
        open={showNewTask}
        onOpenChange={setShowNewTask}
        clients={clients}
        users={users}
        onCreateTask={async (data) => {
          const created = await createTask({ ...data, author_id: user?.id });
          setAllTasks(prev => [created, ...prev]);
        }}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={() => handleTaskDeleted(selectedTask.id)}
          users={users}
        />
      )}
    </div>
  );
}
