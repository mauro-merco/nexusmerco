'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { KanbanBoard } from '@/components/kanban-board';
import { NewTaskDialog } from '@/components/new-task-dialog';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { ProblemNotePrompt } from '@/components/problem-note-prompt';
import '@/components/task-motion.css';
import { TaskRow } from '@/components/client-tasks-tab';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { TASK_PRIORITY_CONFIG, TASK_PRIORITIES } from '@/lib/task-config';
import { KanbanSquare, Plus, Layers, CheckCircle2, AlertTriangle, Clock, LayoutGrid, List as ListIcon, ChevronDown, Check, X, Building2, Flag } from 'lucide-react';

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

function FilterMenu({ icon: Icon, label, count, children }: { icon: typeof Flag; label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn('tm-press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium', count ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60')}>
        <Icon className="h-4 w-4" /> {label}
        {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="tm-pop absolute left-0 top-full z-50 mt-1.5 max-h-[340px] w-60 overflow-auto rounded-2xl bg-popover p-1.5 shadow-xl [scrollbar-width:thin]">{children}</div>
        </>
      )}
    </div>
  );
}

function Opt({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60', on && 'bg-muted/50 font-semibold')}>
      <span className="flex flex-1 items-center gap-2 truncate">{children}</span>
      {count !== undefined && <span className="text-[10px] text-muted-foreground">{count}</span>}
      {on && <Check className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

export default function OperationsPage() {
  const { user } = useAuthStore();
  const { clients, loading: clientsLoading } = useClients();
  const { createTask, updateTask, deleteTask } = useTasks(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string; role?: string; }[]>([]);
  const [view, setView] = useState<ViewMode>('kanban');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(new Set());
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [problemMove, setProblemMove] = useState<{ taskId: string } | null>(null);
  const [savingProblemMove, setSavingProblemMove] = useState(false);

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
    fetch('/api/users').then(r => r.json()).then(json => setUsers((json.data || []).filter((u: { role?: string }) => u.role === 'admin' || u.role === 'operador'))).catch(() => {});
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

  const filteredTasks = useMemo(() => allTasks.filter(t => {
    if (clientFilter.size > 0 && !clientFilter.has(t.client_id)) return false;
    if (priorityFilter.size > 0 && !priorityFilter.has(t.priority)) return false;
    if (onlyOverdue && !isOverdue(t)) return false;
    return true;
  }), [allTasks, clientFilter, priorityFilter, onlyOverdue]);

  const listGroups = useMemo(() => {
    const active = filteredTasks.filter(t => t.status !== 'cerrada');
    return {
      vencidas: active.filter(isOverdue),
      estaSemana: active.filter(t => !isOverdue(t) && isDueSoon(t)),
      proximas: active.filter(t => !isOverdue(t) && !isDueSoon(t) && t.due_date),
      sinFecha: active.filter(t => !t.due_date),
      finalizadas: filteredTasks.filter(t => t.status === 'cerrada'),
    };
  }, [filteredTasks]);

  const toggleClient = (id: string) => setClientFilter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePriority = (p: TaskPriority) => setPriorityFilter(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const hasFilters = clientFilter.size > 0 || priorityFilter.size > 0 || onlyOverdue;
  const clearFilters = () => { setClientFilter(new Set()); setPriorityFilter(new Set()); setOnlyOverdue(false); };

  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'problemas') { setProblemMove({ taskId }); return; }
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const confirmProblemMove = useCallback(async (note: string) => {
    if (!problemMove) return;
    setSavingProblemMove(true);
    try {
      setAllTasks(prev => prev.map(t => t.id === problemMove.taskId ? { ...t, status: 'problemas', problem_note: note } : t));
      await updateTask(problemMove.taskId, { status: 'problemas', problem_note: note });
      setProblemMove(null);
    } catch { await loadAllTasks(); } finally { setSavingProblemMove(false); }
  }, [problemMove, updateTask, loadAllTasks]);

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

  if (clientsLoading) return <ContentSkeleton variant="cards" />;

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tareas</h1>
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-muted/25 py-20 text-muted-foreground">
          <KanbanSquare className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Creá un cliente primero</p>
          <p className="max-w-md text-center text-sm">Necesitás al menos un cliente para poder crear tareas.</p>
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

  const stats = [
    { label: 'Activas', value: activeAll.length, icon: Layers, iconClass: 'text-blue-600', bgClass: 'bg-blue-500/10' },
    { label: 'Vencidas', value: overdueAll.length, icon: AlertTriangle, iconClass: 'text-red-600', bgClass: 'bg-red-500/10' },
    { label: 'Por vencer', value: dueSoonAll.length, icon: Clock, iconClass: 'text-amber-600', bgClass: 'bg-amber-500/10' },
    { label: 'Finalizadas', value: closedAll.length, icon: CheckCircle2, iconClass: 'text-emerald-600', bgClass: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-4">
      {/* Header + stats inline */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tareas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Todos los clientes, un solo tablero</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.map(s => (
            <div key={s.label} className="tm-rise tm-lift flex items-center gap-2.5 rounded-2xl bg-card px-3 py-2">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', s.bgClass)}><s.icon className={cn('h-4 w-4', s.iconClass)} /></span>
              <div className="leading-none">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => setShowNewTask(true)} className="tm-press gap-2 rounded-xl"><Plus className="h-4 w-4" /> Nueva tarea</Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-muted/40 p-1">
          {([['kanban', LayoutGrid, 'Kanban'], ['list', ListIcon, 'Lista']] as const).map(([k, I, l]) => (
            <button key={k} type="button" onClick={() => setView(k)}
              className={cn('tm-press flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium', view === k ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <I className="h-4 w-4" /> {l}
            </button>
          ))}
        </div>
        <span className="mx-1 h-6 w-px bg-border/60" />
        <FilterMenu icon={Building2} label="Cliente" count={clientFilter.size}>
          {clients.map(c => (
            <Opt key={c.id} on={clientFilter.has(c.id)} onClick={() => toggleClient(c.id)} count={allTasks.filter(t => t.client_id === c.id && t.status !== 'cerrada').length}>{c.name}</Opt>
          ))}
        </FilterMenu>
        <FilterMenu icon={Flag} label="Prioridad" count={priorityFilter.size}>
          {TASK_PRIORITIES.map(k => {
            const p = TASK_PRIORITY_CONFIG[k];
            return <Opt key={k} on={priorityFilter.has(k)} onClick={() => togglePriority(k)}><span className={cn('h-2 w-2 rounded-full', p.dotColor)} />{p.label}</Opt>;
          })}
        </FilterMenu>
        <button type="button" onClick={() => setOnlyOverdue(v => !v)}
          className={cn('tm-press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium', onlyOverdue ? 'bg-red-500/10 text-red-600' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60')}>
          <AlertTriangle className="h-4 w-4" /> Solo vencidas
        </button>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="flex items-center gap-1 rounded-xl px-2 py-2 text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /> Limpiar</button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filteredTasks.length} tarea{filteredTasks.length !== 1 ? 's' : ''}</span>
      </div>

      {allLoading ? (
        <ContentSkeleton variant={view === 'kanban' ? 'board' : 'list'} />
      ) : view === 'kanban' ? (
        <KanbanBoard tasks={filteredTasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} showClient />
      ) : (
        <div className="tm-fade space-y-6">
          {sectionMeta.map(sec => {
            const items = listGroups[sec.key];
            if (items.length === 0) return null;
            return (
              <div key={sec.key} className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <sec.icon className={cn('h-3.5 w-3.5', sec.iconClass)} /> {sec.label} ({items.length})
                </p>
                <div className="tm-stagger space-y-2">{items.map(t => <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} showClient />)}</div>
              </div>
            );
          })}
          {listGroups.finalizadas.length > 0 && (
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Finalizadas ({listGroups.finalizadas.length})
              </summary>
              <div className="mt-2 space-y-2 opacity-80">{listGroups.finalizadas.map(t => <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} showClient />)}</div>
            </details>
          )}
          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-muted/25 py-16 text-muted-foreground">
              <KanbanSquare className="h-12 w-12 opacity-20" />
              <p className="text-sm">No hay tareas para estos filtros.</p>
            </div>
          )}
        </div>
      )}

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} clients={clients} users={users}
        onCreateTask={async (data) => { const created = await createTask({ ...data, author_id: user?.id }); setAllTasks(prev => [created, ...prev]); }} />

      {selectedTask && (
        <TaskDetailModal task={selectedTask} open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onTaskUpdated={handleTaskUpdated} onTaskDeleted={() => handleTaskDeleted(selectedTask.id)} users={users} />
      )}

      <ProblemNotePrompt open={!!problemMove} saving={savingProblemMove} onCancel={() => setProblemMove(null)} onSave={confirmProblemMove} />
    </div>
  );
}
