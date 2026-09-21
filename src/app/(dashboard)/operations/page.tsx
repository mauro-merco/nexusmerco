'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { KanbanBoard } from '@/components/kanban-board';
import { NewTaskDialog } from '@/components/new-task-dialog';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TaskRow } from '@/components/client-tasks-tab';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { KanbanSquare, Plus, Loader2, Layers, CheckCircle2 } from 'lucide-react';

export default function OperationsPage() {
  const { user } = useAuthStore();
  const { clients, loading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string; }[]>([]);
  const [view, setView] = useState<'all' | 'kanban'>('all');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allLoading, setAllLoading] = useState(true);

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask, patchTask } = useTasks(selectedClientId);

  const loadAllTasks = useCallback(async () => {
    setAllLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const json = await res.json();
      if (res.ok) setAllTasks(json.data || []);
    } catch {
      // ignore
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => { loadAllTasks(); }, [loadAllTasks]);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(json => setUsers(json.data || []))
      .catch(() => {});
  }, []);

  // Deep link: open a specific task (?task=<id>)
  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get('task');
    if (!taskId) return;
    let cancelled = false;
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json.data) return;
        setSelectedClientId(json.data.client_id || selectedClientId);
        setSelectedTask(json.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeAll = allTasks.filter(t => t.status !== 'cerrada');
  const closedAll = allTasks.filter(t => t.status === 'cerrada');

  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }, [updateTask]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleTaskUpdated = useCallback((updated: Task) => {
    setSelectedTask(updated);
    patchTask(updated);
    setAllTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  }, [patchTask]);

  const handleTaskDeleted = useCallback((id: string) => {
    deleteTask(id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  }, [deleteTask]);

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tareas</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <KanbanSquare className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">Creá un cliente primero</p>
            <p className="text-sm text-center max-w-md">
              Necesitás al menos un cliente para poder crear tareas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Todas las tareas activas y tablero Kanban por cliente</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowNewTask(true)} variant="cta" size="cta" className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Tarea
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex rounded-xl border bg-card/50 p-0.5 w-full sm:w-auto sm:inline-flex">
        <button
          type="button"
          onClick={() => setView('all')}
          className={cn('flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            view === 'all' ? 'bg-gradient-tech text-white' : 'text-muted-foreground hover:text-foreground')}
        >
          <Layers className="h-4 w-4" /> Todas las activas ({activeAll.length})
        </button>
        <button
          type="button"
          onClick={() => setView('kanban')}
          className={cn('flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            view === 'kanban' ? 'bg-gradient-tech text-white' : 'text-muted-foreground hover:text-foreground')}
        >
          <KanbanSquare className="h-4 w-4" /> Kanban por cliente
        </button>
      </div>

      {view === 'all' ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Tareas activas de todos los clientes ({activeAll.length})
              </p>
              {closedAll.length > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {closedAll.length} finalizadas
                </span>
              )}
            </div>
            {allLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeAll.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <KanbanSquare className="h-12 w-12 opacity-20" />
                  <p className="text-sm">No hay tareas activas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {activeAll.map(t => (
                  <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} showClient />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Client selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedClientId || ''}
              onChange={e => setSelectedClientId(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Kanban Board */}
          {tasksLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} />
          )}
        </>
      )}

      {/* New Task Dialog */}
      <NewTaskDialog
        open={showNewTask}
        onOpenChange={setShowNewTask}
        clientId={selectedClientId || clients[0].id}
        users={users}
        onCreateTask={async (data) => {
          const created = await createTask({ ...data, author_id: user?.id });
          setAllTasks(prev => [created, ...prev]);
        }}
      />

      {/* Task Detail Modal */}
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